import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Star, TrendingUp, Loader2, ChevronLeft, Shield, ExternalLink } from 'lucide-react';
import { Jobber, Role } from '../types';
import { useData } from '../context/DataContext';
import { useSchema } from '../context/SchemaContext';
import { useAuth } from '../context/AuthContext';
import { RANK_COLORS } from '../constants';
import Heatmap from './Heatmap';

interface ProfileDrawerProps {
  jobber: Jobber | null;
  onClose: () => void;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ jobber, onClose }) => {
  const { updateJobber, scoreProof, refreshJobberData } = useData();
  const { attributes, sections } = useSchema();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'proof' | 'contributions' | 'grading'>('profile');
  const [scoringId, setScoringId] = useState<string | null>(null); // Track which proof is being scored
  const [isFetchingData, setIsFetchingData] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (jobber && jobber.proofs.length === 0) {
      setIsFetchingData(true);
      refreshJobberData(jobber.id).finally(() => setIsFetchingData(false));
    }
  }, [jobber?.id]);

  useEffect(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [activeTab]);

  const isAdmin = user?.role === Role.SUPER_ADMIN || user?.role === Role.ADMIN;

  const handleManualScore = async (proofId: string, score: number) => {
    if (!isAdmin || !jobber) return;
    setScoringId(proofId);
    try {
      await scoreProof(jobber.id, proofId, score);
    } finally {
      setScoringId(null);
    }
  };

  // ... (Keep availableRoles and canEditRole logic same as before)
  const availableRoles = useMemo(() => {
    if (!jobber || !user) return [];
    if (user.role === Role.SUPER_ADMIN) return [Role.JOBBER, Role.ADMIN, Role.SUPER_ADMIN];
    if (user.role === Role.ADMIN) return jobber.role === Role.JOBBER || jobber.role === Role.ADMIN ? [Role.JOBBER, Role.ADMIN] : [];
    return [];
  }, [user?.role, jobber?.role]);

  const canEditRole = useMemo(() => {
    if (!jobber || !user) return false;
    if (jobber.id === user.id) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    if (user.role === Role.ADMIN) return jobber.role === Role.JOBBER;
    return false;
  }, [user?.role, jobber?.role, jobber?.id]);

  if (!jobber) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div ref={scrollContainerRef} className="relative w-full md:max-w-2xl bg-[#09090b] border-l border-zinc-800 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        {/* ... (Keep Header Section same as before) ... */}
         <div className="p-4 md:p-8 border-b border-zinc-800 flex items-center justify-between md:block shrink-0 sticky top-0 bg-[#09090b] z-30">
          <button onClick={onClose} className="md:absolute md:top-6 md:right-6 text-zinc-500 hover:text-white flex items-center gap-1 md:block">
            <ChevronLeft className="w-5 h-5 md:hidden" />
            <X className="hidden md:block" />
          </button>
          <div className="flex items-center md:items-start gap-4 md:gap-6 mt-0 md:mt-4">
            <img src={jobber.avatar_url || 'https://picsum.photos/200'} className="w-12 h-12 md:w-24 md:h-24 rounded-xl border border-zinc-800 object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                <h2 className="text-lg md:text-2xl font-bold text-white truncate">{jobber.name}</h2>
                <span className={`px-2 py-0.5 rounded text-[8px] md:text-[10px] font-bold uppercase tracking-widest border ${RANK_COLORS[jobber.rank]}`}>{jobber.rank}</span>
              </div>
              <p className="text-zinc-500 font-mono text-[10px] md:text-sm">{jobber.handle}</p>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 border-b border-zinc-800 sticky top-[73px] md:top-[161px] bg-[#09090b] z-20 flex gap-4 md:gap-8 overflow-x-auto no-scrollbar shrink-0">
          {['profile', 'proof', 'contributions', 'grading'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} disabled={(tab === 'grading' && !isAdmin)} className={`py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-widest relative whitespace-nowrap ${activeTab === tab ? 'text-violet-500' : 'text-zinc-500 hover:text-zinc-300 disabled:opacity-30'}`}>
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500"></div>}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8 flex-1">
          {isFetchingData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Hydrating Personnel Data...</span>
            </div>
          ) : (
            <>
              {activeTab === 'profile' && (
                <div className="space-y-8 md:space-y-12">
                   {/* ... (Keep Profile Tab Content) ... */}
                   {sections.map(section => (
                    <div key={section.id} className="space-y-4 md:space-y-6">
                      <h3 className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] border-b border-zinc-800 pb-2">{section.section_name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {section.contained_attribute_keys.map(key => {
                          const attr = attributes.find(a => a.key === key);
                          if (!attr || !attr.is_public) return null;
                          return (
                            <div key={key} className="space-y-2">
                              <label className="text-[8px] md:text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{attr.label}</label>
                              <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-lg text-xs md:text-sm text-zinc-300">{jobber.dynamicData?.[key] || `N/A`}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'proof' && (
                <div className="space-y-4">
                  {jobber.proofs.length === 0 ? <p className="text-center py-10 text-zinc-600 text-[10px] uppercase font-mono">No proofs archived</p> : jobber.proofs.map(proof => (
                    <div key={proof.id} className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="font-medium text-sm text-zinc-100">{proof.title}</div>
                        <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${proof.status === 'scored' ? 'bg-violet-500/10 text-violet-500' : 'bg-zinc-800 text-zinc-500'}`}>{proof.status}</div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] text-zinc-600 font-mono uppercase">Manual Grading</span>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <button 
                                        key={i} 
                                        disabled={!isAdmin || scoringId === proof.id}
                                        onClick={() => handleManualScore(proof.id, i + 1)}
                                        className={`focus:outline-none transition-transform ${isAdmin ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <Star className={`w-4 h-4 ${i < (proof.admin_score || 0) ? 'fill-amber-500 text-amber-500' : 'text-zinc-700'}`} />
                                    </button>
                                ))}
                                {scoringId === proof.id && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin ml-2" />}
                            </div>
                        </div>

                        <a 
                            href={proof.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] font-bold uppercase px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md flex items-center gap-2 transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" /> Check it out
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'contributions' && <Heatmap contributions={jobber.contributions || []} proofs={jobber.proofs || []} />}
              {activeTab === 'grading' && isAdmin && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* ... (Keep Grading Tab Content) ... */}
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest flex items-center gap-2">
                        <Shield className="w-3 h-3" /> System Role Authorization
                      </label>
                      {!canEditRole && (
                        <span className="text-[8px] text-zinc-600 uppercase tracking-wider">Locked</span>
                      )}
                    </div>
                    
                    <select
                      value={jobber.role}
                      disabled={!canEditRole}
                      onChange={(e) => updateJobber(jobber.id, { role: e.target.value as Role })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:border-violet-500 outline-none uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {availableRoles.length > 0 ? (
                        availableRoles.map(r => (
                          <option key={r} value={r}>{r.replace('_', ' ')}</option>
                        ))
                      ) : (
                        <option value={jobber.role}>{jobber.role}</option>
                      )}
                    </select>
                  </div>

                  <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
                    <h3 className="font-bold uppercase text-[10px] text-violet-500 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Judicial Override</h3>
                    <textarea className="w-full bg-transparent border-none text-zinc-300 text-xs focus:ring-0 p-0 mb-4 h-32 italic leading-relaxed" placeholder="Enter manual justification..." defaultValue={jobber.justification || ''} onBlur={(e) => updateJobber(jobber.id, { justification: e.target.value })} />
                  </div>
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-3">
                    <label className="text-[9px] text-zinc-500 font-mono uppercase">Reputation Modifier ({jobber.trust_modifier})</label>
                    <input type="range" min="-20" max="20" step="1" defaultValue={jobber.trust_modifier} onChange={(e) => updateJobber(jobber.id, { trust_modifier: parseInt(e.target.value) })} className="w-full accent-violet-500" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileDrawer;