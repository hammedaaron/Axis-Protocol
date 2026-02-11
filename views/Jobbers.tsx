
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Rank, Jobber, Role } from '../types';
import { LayoutGrid, List, Filter, Trash2, AlertTriangle, Loader2, ShieldCheck, User as UserIcon, ChevronRight } from 'lucide-react';
import { RANK_COLORS } from '../constants';

interface JobbersProps {
  onSelect: (jobber: Jobber) => void;
}

const Jobbers: React.FC<JobbersProps> = ({ onSelect }) => {
  const { jobbers, deleteJobber } = useData();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterRank, setFilterRank] = useState<Rank | 'ALL'>('ALL');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const isAdmin = user?.role === Role.SUPER_ADMIN || user?.role === Role.ADMIN;
  
  // Logic: Removed j.id !== user?.id filter so the ledger isn't empty when only one user exists.
  const filtered = jobbers
    .filter(j => filterRank === 'ALL' || j.rank === filterRank);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Permanent node purge will erase all contributions and credentials. Confirm execution?')) return;
    setIsDeleting(id);
    try {
      await deleteJobber(id);
    } finally {
      setIsDeleting(null);
    }
  };

  const formatHandle = (handle: string) => handle?.startsWith('@') ? handle : `@${handle || 'unknown'}`;

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1 tracking-tight flex items-center gap-3">
            Talent Ledger
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 font-mono tracking-widest uppercase">Node Sync: Active</span>
          </h1>
          <p className="text-zinc-500 text-[10px] md:text-xs font-mono uppercase tracking-widest">{filtered.length} verified operator nodes in cluster</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 shadow-inner">
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30 shadow-lg shadow-violet-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30 shadow-lg shadow-violet-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <select 
              className="bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-8 py-2.5 text-[10px] font-bold text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer uppercase tracking-[0.2em] shadow-sm transition-all"
              value={filterRank}
              onChange={(e) => setFilterRank(e.target.value as any)}
            >
              <option value="ALL">ALL RANKS</option>
              {Object.values(Rank).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        {viewMode === 'list' ? (
          <div className="bg-zinc-950/20 border border-zinc-800/50 rounded-2xl overflow-hidden relative backdrop-blur-sm shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-900/40">
                <tr className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] border-b border-zinc-800">
                  <th className="px-8 py-6">Node Identity (Name / Handle)</th>
                  <th className="px-8 py-6">Operational Rank</th>
                  <th className="px-8 py-6">ATIS Standing</th>
                  <th className="px-8 py-6 text-right">Protocol Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map((jobber) => (
                  <tr key={jobber.id} onClick={() => onSelect(jobber)} className="hover:bg-violet-600/[0.04] cursor-pointer transition-all group relative">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4 w-full">
                        <div className="relative shrink-0">
                          <img 
                            src={jobber.avatar_url || `https://ui-avatars.com/api/?name=${jobber.name}&background=random`} 
                            className="w-11 h-11 rounded-xl border border-zinc-800 group-hover:border-violet-500/50 transition-all object-cover shadow-lg" 
                          />
                          {(jobber.role === Role.SUPER_ADMIN || jobber.role === Role.ADMIN) && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-violet-600 rounded-full border-2 border-zinc-900 flex items-center justify-center shadow-lg">
                              <ShieldCheck className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors truncate">{jobber.name}</div>
                            {jobber.id === user?.id && <span className="text-[8px] font-black text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20 tracking-widest uppercase">YOU</span>}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono tracking-wider group-hover:text-zinc-300 transition-colors truncate">{formatHandle(jobber.handle)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm transition-all group-hover:border-current ${RANK_COLORS[jobber.rank]}`}>
                        {jobber.rank}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-bold text-violet-500 font-mono tabular-nums tracking-tighter group-hover:scale-110 transition-transform">{jobber.atis_score}</div>
                        <div className="flex-1 max-w-[100px] h-1 bg-zinc-900 rounded-full overflow-hidden hidden sm:block">
                           <div className="h-full bg-violet-600 transition-all duration-1000" style={{ width: `${Math.min((jobber.atis_score / 1000) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                         {isAdmin && jobber.id !== user?.id && (
                          <button 
                            onClick={(e) => handleDelete(e, jobber.id)} 
                            className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-600 hover:text-rose-500 hover:border-rose-500/30 transition-all opacity-0 group-hover:opacity-100"
                            title="Purge Personnel Node"
                          >
                            {isDeleting === jobber.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        )}
                        <div className="p-2 text-zinc-700">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((jobber) => (
              <div 
                key={jobber.id} 
                onClick={() => onSelect(jobber)}
                className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-6 hover:border-violet-500/40 transition-all cursor-pointer group relative overflow-hidden backdrop-blur-sm shadow-xl"
              >
                {isDeleting === jobber.id && (
                  <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                  </div>
                )}
                
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <img 
                      src={jobber.avatar_url || `https://ui-avatars.com/api/?name=${jobber.name}&background=random`} 
                      className="w-20 h-20 rounded-[2.5rem] border-2 border-zinc-800 shadow-2xl group-hover:scale-105 group-hover:border-violet-500/50 transition-all object-cover" 
                    />
                    {(jobber.role === Role.SUPER_ADMIN || jobber.role === Role.ADMIN) && (
                      <div className="absolute top-0 right-0 p-1.5 bg-violet-600 rounded-xl border-4 border-zinc-900 shadow-lg">
                        <ShieldCheck className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-6 space-y-1 w-full px-4">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-lg font-black tracking-tight text-white group-hover:text-violet-400 transition-colors truncate">
                        {jobber.name}
                      </h3>
                      {jobber.id === user?.id && <span className="text-[8px] font-black text-violet-500 bg-violet-500/10 px-1 py-0.5 rounded border border-violet-500/20 tracking-widest">YOU</span>}
                    </div>
                    <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.2em] group-hover:text-zinc-300 transition-colors truncate">
                      {formatHandle(jobber.handle)}
                    </p>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 text-center shadow-inner">
                      <div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mb-1">ATIS</div>
                      <div className="text-lg font-bold text-violet-500 font-mono tracking-tighter">{jobber.atis_score}</div>
                    </div>
                    <div className="p-3 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center shadow-inner">
                      <div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mb-1">Status</div>
                      <div className={`text-[9px] font-black uppercase tracking-tight truncate w-full ${RANK_COLORS[jobber.rank].split(' ')[0]}`}>
                        {jobber.rank}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   {isAdmin && jobber.id !== user?.id && (
                     <button onClick={(e) => handleDelete(e, jobber.id)} className="p-2 text-zinc-600 hover:text-rose-500 transition-colors">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="py-40 text-center border-2 border-dashed border-zinc-900 rounded-[3rem] bg-zinc-950/10 animate-pulse">
          <AlertTriangle className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
          <p className="text-zinc-700 font-mono uppercase tracking-[0.4em] text-xs">No records detected in ledger vector.</p>
        </div>
      )}
    </div>
  );
};

export default Jobbers;
