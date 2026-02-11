
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Jobber, Role } from '../types';
import { 
  Send, Plus, MoreVertical, Volume2, X, CheckCheck,
  ChevronLeft, Loader2, Signal, ShieldAlert, RefreshCcw, Users, Check, MessageSquare
} from 'lucide-react';
import { chatClient, getAdminUserChannelId } from '../lib/stream';
import type { Channel } from 'stream-chat';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

// Audio Utilities for Huddle
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface MessagesProps {
  onSelectJobber?: (jobber: any) => void;
  userOverride?: any;
}

const Messages: React.FC<MessagesProps> = ({ onSelectJobber, userOverride }) => {
  const { jobbers = [] } = useData();
  const { user: authUser } = useAuth();
  
  const user = userOverride || authUser;

  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isHuddleActive, setIsHuddleActive] = useState(false);
  const [huddleStatus, setHuddleStatus] = useState<'idle' | 'connecting' | 'active'>('idle');

  // Group creation state
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false);

  const isAdmin = user?.role === Role.SUPER_ADMIN || user?.role === Role.ADMIN;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const huddleSessionRef = useRef<any>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const visibleJobbers = jobbers.filter(j => {
    if (j.id === user?.id) return false;
    if (isAdmin) return true; 
    return j.role === Role.SUPER_ADMIN || j.role === Role.ADMIN; 
  });

  const initStream = async () => {
    if (!user) {
      setConnectionError("No operational user identity found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setConnectionError(null);
    
    try {
      if (chatClient.userID && chatClient.userID !== user.id) {
        await chatClient.disconnectUser();
      }

      if (chatClient.userID !== user.id) {
        const userToken = chatClient.devToken(user.id);
        await chatClient.connectUser(
          { 
            id: user.id, 
            name: user.name, 
            image: jobbers.find(j => j.id === user.id)?.avatar_url || `https://ui-avatars.com/api/?name=${user.name}` 
          },
          userToken
        );
      }

      const filter = { 
        members: { $in: [user.id] },
        type: { $in: ['direct_admin', 'group_admin', 'messaging'] } 
      };

      const sort = [{ last_message_at: -1 }];
      const result = await chatClient.queryChannels(filter as any, sort as any, { watch: true, presence: true });
      
      setChannels(result);
      if (result.length > 0 && !activeChannel) setActiveChannel(result[0]);
    } catch (err: any) {
      console.error("Stream Connection Error:", err);
      setConnectionError(err.message || "Uplink failed. Check Stream Dashboard settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initStream();
  }, [user?.id, isAdmin, jobbers.length]);

  useEffect(() => {
    const handleNewMessage = (event: any) => {
      if (event.type === 'message.new' || event.type === 'notification.message_new') {
        const filter = { 
          members: { $in: [user?.id || ''] },
          type: { $in: ['direct_admin', 'group_admin', 'messaging'] } 
        };
        chatClient.queryChannels(filter as any, [{ last_message_at: -1 }]).then(setChannels);
      }
    };
    chatClient.on(handleNewMessage);
    return () => chatClient.off(handleNewMessage);
  }, [user?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChannel?.state.messages]);

  const startDirectLink = async (targetJobber: Jobber) => {
    if (!user || isLinking) return;
    setIsLinking(targetJobber.id);
    try {
      await chatClient.upsertUsers([{
        id: targetJobber.id,
        name: targetJobber.name,
        image: targetJobber.avatar_url || `https://ui-avatars.com/api/?name=${targetJobber.name}`
      }]);

      const channelId = getAdminUserChannelId(user.id, targetJobber.id);
      const channelType = 'messaging'; 
      
      const channel = chatClient.channel(channelType, channelId, {
        members: [user.id, targetJobber.id],
        name: `${targetJobber.name}`,
      } as any);
      
      await channel.watch();
      setActiveChannel(channel);
      
      const filter = { 
        members: { $in: [user.id] },
        type: { $in: ['direct_admin', 'group_admin', 'messaging'] } 
      };
      chatClient.queryChannels(filter as any, [{ last_message_at: -1 }]).then(setChannels);
    } catch (err: any) {
      console.error("Signal Path Creation Failed:", err);
      alert(`Signal Link Error: ${err.message}. Connection attempt timed out or rejected.`);
    } finally {
      setIsLinking(null);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin || !groupName.trim() || selectedMembers.length < 1) return;
    
    setIsGroupSubmitting(true);
    try {
      const usersToUpsert = jobbers
        .filter(j => selectedMembers.includes(j.id))
        .map(j => ({
          id: j.id,
          name: j.name,
          image: j.avatar_url || `https://ui-avatars.com/api/?name=${j.name}`
        }));
      
      await chatClient.upsertUsers(usersToUpsert);

      const groupId = `tg-${Math.random().toString(36).substring(2, 10)}`;
      const channelType = 'messaging';

      const channel = chatClient.channel(channelType, groupId, {
        members: [user.id, ...selectedMembers],
        name: groupName,
        created_by_id: user.id
      } as any);
      
      await channel.create();
      await channel.watch();
      
      setActiveChannel(channel);
      setIsCreatingGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      
      const filter = { 
        members: { $in: [user.id] },
        type: { $in: ['direct_admin', 'group_admin', 'messaging'] } 
      };
      chatClient.queryChannels(filter as any, [{ last_message_at: -1 }]).then(setChannels);
    } catch (err: any) {
      console.error("Tactical Group Creation Error:", err);
      alert(`Failed to establish group: ${err.message}`);
    } finally {
      setIsGroupSubmitting(false);
    }
  };

  const toggleMemberSelection = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChannel) return;
    const text = inputText;
    setInputText('');
    await activeChannel.sendMessage({ text });
  };

  const toggleHuddle = async () => {
    if (isHuddleActive) {
      if (huddleSessionRef.current) huddleSessionRef.current.close();
      setIsHuddleActive(false);
      setHuddleStatus('idle');
      return;
    }
    setIsHuddleActive(true);
    setHuddleStatus('connecting');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outCtx;
      
      let nextStartTime = 0;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => setHuddleStatus('active'),
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContextRef.current.destination);
              nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
              source.start(nextStartTime);
              nextStartTime += audioBuffer.duration;
              audioSourcesRef.current.add(source);
              source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
            }
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              audioSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              audioSourcesRef.current.clear();
              nextStartTime = 0;
            }
          },
          onclose: () => setIsHuddleActive(false),
          onerror: (e) => console.error("[AXIS] Huddle Uplink Failure:", e)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: "You are the AXIS operational voice relay."
        }
      });
      huddleSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("[AXIS] Huddle Node Error:", err);
      setIsHuddleActive(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#09090b]">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
        <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em]">Synchronizing Secure Signal...</p>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#09090b] p-8 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-6 opacity-50" />
        <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Encryption Link Failure</h2>
        <p className="text-zinc-500 text-xs font-mono mb-8 max-w-sm leading-relaxed">
          Error: {connectionError}
        </p>
        <button 
          onClick={initStream}
          className="px-6 py-3 bg-zinc-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-700 transition-all shadow-lg"
        >
          <RefreshCcw className="w-4 h-4" /> Re-establish Link
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#09090b] text-zinc-100 overflow-hidden relative selection:bg-violet-600/30">
      {/* Group Creation Overlay */}
      {isCreatingGroup && isAdmin && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsCreatingGroup(false)} />
          <form onSubmit={handleCreateGroup} className="relative w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 rounded-t-3xl">
                <div className="flex items-center gap-3">
                   <Users className="w-5 h-5 text-violet-500" />
                   <h2 className="text-sm font-black uppercase tracking-widest text-white">Tactical Group</h2>
                </div>
                <button type="button" onClick={() => setIsCreatingGroup(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
             </div>
             
             <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest pl-1">Identifier</label>
                  <input 
                    required 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:border-violet-500 outline-none transition-all" 
                    value={groupName} 
                    onChange={e => setGroupName(e.target.value)} 
                    placeholder="e.g. ALPHA UNIT" 
                  />
                </div>

                <div className="space-y-3">
                   <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest pl-1">Node Selection ({selectedMembers.length})</label>
                   <div className="space-y-2">
                      {jobbers.filter(j => j.id !== user?.id).map(j => (
                        <button 
                          type="button"
                          key={j.id} 
                          onClick={() => toggleMemberSelection(j.id)}
                          className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all ${selectedMembers.includes(j.id) ? 'bg-violet-600/10 border-violet-500/50' : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'}`}
                        >
                          <img src={j.avatar_url || `https://ui-avatars.com/api/?name=${j.name}`} className="w-9 h-9 rounded-lg object-cover" />
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-xs font-bold text-white truncate">{j.name}</div>
                            <div className="text-[9px] text-zinc-500 font-mono truncate">{(j.handle || '').startsWith('@') ? j.handle : `@${j.handle}`}</div>
                          </div>
                          {selectedMembers.includes(j.id) && <Check className="w-4 h-4 text-violet-500" />}
                        </button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="p-6 bg-zinc-900/50 border-t border-zinc-800 rounded-b-3xl">
                <button 
                  type="submit" 
                  disabled={isGroupSubmitting || !groupName.trim() || selectedMembers.length < 1}
                  className="w-full py-4 bg-violet-600 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-violet-500 transition-all flex items-center justify-center gap-2 disabled:opacity-30 shadow-lg shadow-violet-600/20"
                >
                  {isGroupSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Deploy Group Node
                </button>
             </div>
          </form>
        </div>
      )}

      {/* Sidebar */}
      <div className={`flex flex-col border-r border-zinc-800 bg-[#0c0c0e] transition-all duration-300 ${activeChannel ? 'hidden md:flex w-80' : 'w-full md:w-80'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Signal className="w-4 h-4 text-violet-500" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Tactical Signal</h2>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsCreatingGroup(true)}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white transition-all hover:bg-zinc-800 shadow-sm"
              title="Initialize Tactical Group"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dynamic Node Quick-Link Sidebar - Syncs with Jobbers State */}
        <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/10">
          <p className="text-[9px] font-bold text-zinc-600 uppercase mb-3 tracking-widest px-2">
            {isAdmin ? 'Operational Nodes (Sync)' : 'Command Uplinks'}
          </p>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 px-1">
            {visibleJobbers.length === 0 ? (
              <p className="text-[8px] text-zinc-700 italic px-2">Searching for node identifiers...</p>
            ) : (
              visibleJobbers.map(j => (
                <button 
                  key={j.id} 
                  disabled={isLinking !== null}
                  onClick={() => startDirectLink(j)}
                  className={`flex flex-col items-center gap-2 shrink-0 group relative w-20 transition-opacity ${isLinking && isLinking !== j.id ? 'opacity-30' : 'opacity-100'}`}
                  title={`Initiate link with ${j.name} (${j.handle})`}
                >
                  <div className="relative">
                    <img 
                      src={j.avatar_url || `https://ui-avatars.com/api/?name=${j.name}&background=random`} 
                      className={`w-12 h-12 rounded-xl border border-zinc-800 group-hover:border-violet-500/50 transition-all object-cover shadow-md ${isLinking === j.id ? 'animate-pulse border-violet-500' : ''}`} 
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-violet-600 rounded-full border-2 border-[#0c0c0e] flex items-center justify-center scale-0 group-hover:scale-100 transition-transform shadow-lg">
                      {isLinking === j.id ? <Loader2 className="w-2.5 h-2.5 text-white animate-spin" /> : <MessageSquare className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  <span className="text-[9px] text-zinc-400 font-bold font-mono truncate w-full text-center group-hover:text-violet-400 transition-colors uppercase tracking-tighter">
                    {j.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {channels.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <ShieldAlert className="w-8 h-8 mx-auto text-zinc-800" />
              <p className="text-[10px] text-zinc-600 uppercase font-mono tracking-widest">No Active Channels</p>
              {!isAdmin && <p className="text-[9px] text-zinc-700 italic leading-relaxed">Establish initial link with Command via the nodes above.</p>}
            </div>
          ) : (
            channels.map(chan => {
              const otherMembers = (Object.values(chan.state.members) as any[]).filter(m => m.user?.id !== user?.id);
              const otherMember = otherMembers[0]?.user;
              const lastMsg = chan.state.messages[chan.state.messages.length - 1];
              const isActive = activeChannel?.id === chan.id;
              const isGroup = chan.type === 'group_admin' || (chan.data as any)?.member_count > 2;

              return (
                <button 
                  key={chan.id}
                  onClick={() => setActiveChannel(chan)}
                  className={`w-full flex items-center gap-4 px-6 py-5 transition-all border-b border-zinc-800/30 ${isActive ? 'bg-violet-600/10 border-r-2 border-r-violet-500 shadow-inner' : 'hover:bg-zinc-800/20'}`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-zinc-800 bg-zinc-950 overflow-hidden ${isActive ? 'border-violet-500/50 shadow-lg shadow-violet-500/10' : ''}`}>
                       {isGroup ? (
                         <Users className={`w-5 h-5 ${isActive ? 'text-violet-500' : 'text-zinc-600'}`} />
                       ) : (
                         <img src={otherMember?.image || `https://ui-avatars.com/api/?name=${otherMember?.name}`} className={`w-full h-full object-cover grayscale ${isActive ? 'grayscale-0' : ''}`} />
                       )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                        {(chan.data as any)?.name || otherMember?.name || 'Secure Link'}
                      </h3>
                      <span className="text-[9px] text-zinc-600 font-mono">
                        {lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate font-light">
                      {lastMsg?.text || 'Establishing secure path...'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Signal Area */}
      <div className={`flex-1 flex flex-col min-w-0 bg-[#09090b] ${!activeChannel ? 'hidden md:flex' : 'flex'}`}>
        {activeChannel ? (
          <>
            <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#09090b]/80 backdrop-blur-xl shrink-0 z-30 shadow-sm">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChannel(null)} className="md:hidden p-2 -ml-2 text-zinc-400"><ChevronLeft className="w-5 h-5" /></button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shadow-lg">
                    {(activeChannel.data as any)?.member_count > 2 ? (
                       <Users className="w-4 h-4 text-violet-500" />
                    ) : (
                       <img 
                        src={(Object.values(activeChannel.state.members) as any[]).find(m => m.user?.id !== user?.id)?.user?.image || 'https://picsum.photos/40'} 
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-white tracking-tight truncate">
                    {(activeChannel.data as any)?.name || (Object.values(activeChannel.state.members) as any[]).find(m => m.user?.id !== user?.id)?.user?.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-emerald-500 font-mono uppercase tracking-[0.2em] animate-pulse">Signal Live</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleHuddle}
                  className={`p-2 rounded-lg border transition-all ${isHuddleActive ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10' : 'text-zinc-500 border-zinc-800 hover:text-white'}`}
                  title="Operational Voice Relay"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-zinc-500 hover:text-white transition-colors"><MoreVertical className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-grid-zinc-900/[0.02]">
              <div className="max-w-4xl mx-auto space-y-8">
                {activeChannel.state.messages.map((msg, idx) => {
                  const isMe = msg.user?.id === user?.id;
                  const prevMsg = activeChannel.state.messages[idx - 1];
                  const showHeader = !prevMsg || prevMsg.user?.id !== msg.user?.id;

                  return (
                    <div key={msg.id} className={`flex items-start gap-4 ${isMe ? 'flex-row-reverse' : ''} group animate-in slide-in-from-bottom-2 duration-300`}>
                      <img src={msg.user?.image || `https://ui-avatars.com/api/?name=${msg.user?.name}`} className={`w-8 h-8 rounded-lg border border-zinc-800 shrink-0 mt-1 grayscale group-hover:grayscale-0 transition-all ${showHeader ? 'opacity-100' : 'opacity-0'}`} />
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        {showHeader && (
                          <div className={`flex items-baseline gap-2 mb-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[11px] font-bold text-zinc-100">{msg.user?.name}</span>
                            <span className="text-[8px] text-zinc-600 font-mono">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                        )}
                        <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed break-words transition-all shadow-sm ${
                          isMe ? 'bg-violet-600 text-white rounded-tr-none shadow-violet-600/10' : 'bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-tl-none'
                        }`}>
                          {msg.text}
                          {isMe && <div className="flex justify-end mt-1"><CheckCheck className="w-3 h-3 text-white/50" /></div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="p-6 bg-[#09090b] border-t border-zinc-800 shadow-2xl">
              <form onSubmit={handleSend} className="max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl flex items-end p-2 px-4 focus-within:border-violet-500/50 transition-all shadow-inner">
                <textarea 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
                  placeholder="Transmit operational data packet..."
                  className="flex-1 bg-transparent border-none text-zinc-200 text-sm focus:ring-0 outline-none resize-none py-3 px-2 max-h-40 font-light placeholder-zinc-700"
                  rows={1}
                />
                <button type="submit" disabled={!inputText.trim()} className={`p-2.5 transition-all ${inputText.trim() ? 'text-violet-500 hover:scale-110 active:scale-95' : 'text-zinc-800'}`}>
                  <Send className="w-6 h-6" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-grid-zinc-900/[0.03]">
            <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center mb-8 border border-zinc-800 shadow-2xl animate-pulse">
               <Signal className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Secure Link Terminal</h3>
            <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-[0.2em] max-w-xs leading-relaxed">Establish signal path via ledger node or command link to begin communication</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
