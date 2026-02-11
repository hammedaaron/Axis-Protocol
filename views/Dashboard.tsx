
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Severity, Role } from '../types';
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, Clock, Server, ShieldCheck, Lock, Globe, Star, Trophy, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { RANK_COLORS } from '../constants';

const Dashboard: React.FC = () => {
  const { events, jobbers } = useData();
  const { user } = useAuth();
  
  const [isEventsOpen, setIsEventsOpen] = useState(true);
  const [logPeriod, setLogPeriod] = useState<'week' | 'month'>('week');

  const getSeverityColor = (sev: Severity) => {
    switch(sev) {
      case Severity.HIGH: return 'text-rose-500';
      case Severity.MEDIUM: return 'text-amber-500';
      case Severity.LOW: return 'text-violet-500';
      default: return 'text-zinc-500';
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'alert': return <AlertTriangle className="w-4 h-4" />;
      case 'submission': return <CheckCircle2 className="w-4 h-4" />;
      case 'grade_change': return <TrendingUp className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const stats = [
    { label: 'Active Jobbers', val: jobbers.length, change: '+0', trend: 'neutral' },
    { label: 'Avg ATIS', val: jobbers.length > 0 ? Math.round(jobbers.reduce((a,b)=>a+b.atis_score, 0)/jobbers.length) : 0, change: '0', trend: 'neutral' },
    { label: 'Pending Proofs', val: jobbers.reduce((a,b)=>a+(b.proofs?.filter(p=>p.status==='pending').length || 0),0), change: '0', trend: 'neutral' },
    { label: 'System Health', val: '99.9%', change: 'stable', trend: 'neutral' },
  ];

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const threshold = logPeriod === 'week' 
      ? new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)) 
      : new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    return events.filter(event => new Date(event.created_at) >= threshold);
  }, [events, logPeriod]);

  const isJobber = user?.role === Role.JOBBER;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1 tracking-tight">Situation Room</h1>
          <p className="text-zinc-500 text-[10px] md:text-sm font-mono uppercase tracking-wider">Real-time Telemetry Control</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Encrypted Uplink</span>
           </div>
           <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
             <Server className="w-5 h-5 text-violet-500" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-zinc-900/30 border border-zinc-800 p-4 md:p-6 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-violet-500/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="text-[8px] md:text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2 truncate">{s.label}</div>
            <div className="flex items-end justify-between gap-1">
              <div className="text-xl md:text-3xl font-bold text-white">{s.val}</div>
              <div className={`text-[8px] md:text-[10px] font-mono hidden sm:block ${s.trend === 'up' ? 'text-violet-500' : s.trend === 'down' ? 'text-rose-500' : 'text-zinc-500'}`}>
                {s.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
           {isJobber && user && (
             <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Trophy className="w-32 h-32 text-violet-500" />
                </div>
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-violet-600/10 rounded-xl flex items-center justify-center border border-violet-500/20">
                      <Star className="w-6 h-6 text-violet-500" />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-tight">Operator Standing</h3>
                      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Node ID: {user.handle}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div>
                         <div className="flex justify-between items-baseline mb-2">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Current ATIS</span>
                            <span className="text-xl font-bold text-violet-500 font-mono">{user.atis_score}</span>
                         </div>
                         <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                            <div className="h-full bg-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.5)]" style={{ width: `${Math.min((user.atis_score / 500) * 100, 100)}%` }} />
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-[0.2em] border ${RANK_COLORS[user.rank]}`}>
                            {user.rank}
                         </span>
                         <span className="text-[9px] text-zinc-600 font-mono uppercase">Validated Security Tier</span>
                      </div>
                   </div>
                   <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50 flex flex-col justify-center">
                      <p className="text-[10px] text-zinc-500 font-mono uppercase mb-2">Next Milestone</p>
                      <p className="text-xs text-zinc-400 leading-relaxed font-light">
                        Reach <span className="text-white font-bold">500 ATIS</span> to unlock <span className="text-violet-400 font-bold">SILVER</span> tier governance tools.
                      </p>
                   </div>
                </div>
             </div>
           )}

           <div className="bg-zinc-900/10 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300">
             <div 
               className="flex items-center justify-between bg-zinc-900/40 px-6 py-4 cursor-pointer hover:bg-zinc-900/60 transition-colors"
               onClick={() => setIsEventsOpen(!isEventsOpen)}
             >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center border border-violet-500/20">
                    <Activity className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white uppercase tracking-wider text-xs md:text-sm">Global Event Stream</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Live Telemetry Feed</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {!isEventsOpen && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg">
                      <span className="text-[9px] font-bold text-zinc-400 font-mono uppercase tracking-widest">{filteredEvents.length} Recent Logs</span>
                    </div>
                  )}
                  {isEventsOpen ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
                </div>
             </div>

             {isEventsOpen && (
               <div className="p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/50">
                    <div className="flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                       <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Timeframe Select</span>
                    </div>
                    <div className="flex p-0.5 bg-zinc-950 border border-zinc-800 rounded-lg">
                       <button 
                        onClick={(e) => { e.stopPropagation(); setLogPeriod('week'); }}
                        className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${logPeriod === 'week' ? 'bg-violet-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                       >
                         7D Cycle
                       </button>
                       <button 
                        onClick={(e) => { e.stopPropagation(); setLogPeriod('month'); }}
                        className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${logPeriod === 'month' ? 'bg-violet-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                       >
                         30D Epoch
                       </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {filteredEvents.length === 0 ? (
                      <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-600 font-mono uppercase tracking-widest text-[10px]">
                        Null Set: No events detected in the current window
                      </div>
                    ) : (
                      filteredEvents.map(event => (
                        <div key={event.id} className="group p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl flex gap-4 transition-all hover:bg-zinc-800/40 hover:border-violet-500/20 animate-in fade-in slide-in-from-left-2 duration-500">
                          <div className={`mt-1 shrink-0 p-2 rounded-lg bg-zinc-950 border border-zinc-800 ${getSeverityColor(event.severity)}`}>
                            {getIcon(event.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 mb-1.5">
                              <span className="text-xs md:text-[13px] font-bold text-zinc-100 leading-snug group-hover:text-white transition-colors">
                                {event.message}
                              </span>
                              <span className="text-[9px] text-zinc-600 font-mono font-bold whitespace-nowrap bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
                                {new Date(event.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="flex items-center gap-1.5">
                                 <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                 <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">
                                   {event.type.replace('_', ' ')}
                                 </span>
                               </div>
                               <div className="flex items-center gap-1.5">
                                 <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                 <span className="text-[9px] text-violet-500/70 font-mono uppercase tracking-widest truncate max-w-[150px]">
                                   Node: {event.related_jobber_id || 'System_Core'}
                                 </span>
                               </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
               </div>
             )}
           </div>
        </div>

        <div className="space-y-4 md:space-y-6 lg:border-l lg:border-zinc-800 lg:pl-8">
           <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 md:w-5 md:h-5 text-violet-500" />
              <h2 className="font-bold text-white uppercase tracking-wider text-xs md:text-sm">Network Integrity</h2>
           </div>

           <div className="space-y-4">
              <div className="p-5 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Secure AI Gateway</span>
                    <span className="text-[10px] font-mono text-emerald-500">ACTIVE</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">E2E Messaging</span>
                    <span className="text-[10px] font-mono text-emerald-500">VERIFIED</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">30D Rolling Purge</span>
                    <span className="text-[10px] font-mono text-violet-500">STANDBY</span>
                 </div>
                 <div className="pt-2">
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                       <div className="h-full bg-violet-600 w-full shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                    </div>
                 </div>
              </div>

              <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-lg">
                 <div className="text-[8px] font-bold uppercase tracking-widest text-violet-500 mb-2 flex items-center gap-2"><Globe className="w-3 h-3" /> Security Protocol</div>
                 <div className="text-[11px] text-zinc-400 font-light italic leading-relaxed">
                   Neural Keys are proxied via secure Edge Functions. Your private API credentials never leave the core server environment.
                 </div>
              </div>

              {jobbers.filter(j => j.status !== 'active').length > 0 && (
                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-lg animate-pulse">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-rose-500 mb-2">Protocol Flags</div>
                  <div className="text-[11px] text-zinc-300 font-medium">Multiple nodes reporting irregular trust modifiers. Review recommended.</div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
