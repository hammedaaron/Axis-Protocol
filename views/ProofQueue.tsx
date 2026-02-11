import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { Filter, Calendar, Tag, ExternalLink, CheckCircle2, Clock, Trash2, Loader2, Star } from 'lucide-react';

const ProofQueue: React.FC = () => {
  const { jobbers, deleteProof, scoreProof } = useData();
  const { user } = useAuth();
  const [nicheFilter, setNicheFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);

  const isAdmin = user?.role === Role.SUPER_ADMIN || user?.role === Role.ADMIN;

  const filteredProofs = useMemo(() => {
    const all = jobbers.flatMap(j => 
      (j.proofs || []).map(p => ({ ...p, jobberName: j.name, jobberHandle: j.handle }))
    );

    return all
      .filter(p => nicheFilter === 'ALL' || p.niche === nicheFilter)
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return dateFilter === 'NEWEST' ? timeB - timeA : timeA - timeB;
      });
  }, [jobbers, nicheFilter, dateFilter]);

  const niches = useMemo(() => {
    const allNiches = jobbers.flatMap(j => (j.proofs || []).map(p => p.niche).filter(Boolean));
    return Array.from(new Set(allNiches));
  }, [jobbers]);

  const handleDelete = async (id: string) => {
    if (!confirm('Permanent removal of this proof record from the ledger. Continue?')) return;
    setIsDeleting(id);
    try {
      await deleteProof(id);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleQuickApprove = async (jobberId: string, proofId: string) => {
    if (!isAdmin) return;
    setGradingId(proofId);
    try {
      // Default approval score is 5 stars
      await scoreProof(jobberId, proofId, 5);
    } finally {
      setGradingId(null);
    }
  };

  return (
    <div className="p-8 space-y-8 pb-24">
      {/* Header logic remains same */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Proof Aggregator</h1>
          <p className="text-zinc-500 text-sm font-mono uppercase tracking-wider">{filteredProofs.length} Active Records</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
             <div className="relative px-3 flex items-center gap-2 border-r border-zinc-800">
                <Tag className="w-3.5 h-3.5 text-zinc-500" />
                <select className="bg-transparent text-xs font-bold text-zinc-300 focus:outline-none appearance-none pr-4" value={nicheFilter} onChange={(e) => setNicheFilter(e.target.value)}>
                  <option value="ALL">All Niches</option>
                  {niches.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
             </div>
             <div className="relative px-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <select className="bg-transparent text-xs font-bold text-zinc-300 focus:outline-none appearance-none pr-4" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)}>
                  <option value="NEWEST">Newest First</option>
                  <option value="OLDEST">Oldest First</option>
                </select>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredProofs.length === 0 ? (
          <div className="py-20 text-center border border-zinc-800 rounded-xl text-zinc-600 uppercase font-mono text-[10px]">No proofs match criteria</div>
        ) : filteredProofs.map((proof, idx) => (
          <div key={`${proof.id}-${idx}`} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-6 group hover:border-zinc-700 transition-all relative overflow-hidden">
             {/* Loading State Overlay */}
             {(isDeleting === proof.id || gradingId === proof.id) && (
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                 <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
               </div>
             )}
             
             <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                   <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded">{proof.niche || 'General'}</span>
                   <span className="text-[10px] text-zinc-600 font-mono">{new Date(proof.created_at).toLocaleDateString()}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{proof.title}</h3>
                <div className="flex items-center gap-2">
                   <span className="text-xs text-zinc-500 font-mono">By {proof.jobberName} ({proof.jobberHandle})</span>
                </div>
             </div>

             <div className="flex items-center gap-3">
                <div className="text-right mr-4 flex flex-col items-end">
                   <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-1">Status</div>
                   <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                      {proof.status === 'scored' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
                          <span className="text-violet-500">{proof.admin_score}/5 Score</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-amber-500">Pending</span>
                        </>
                      )}
                   </div>
                </div>
                
                {/* Approve Button for Admins */}
                {isAdmin && proof.status !== 'scored' && (
                  <button 
                    onClick={() => handleQuickApprove(proof.jobber_id, proof.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600/10 text-emerald-500 border border-emerald-600/20 rounded-lg hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest"
                  >
                    <Star className="w-3.5 h-3.5" /> Approve
                  </button>
                )}

                <a href={proof.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all" title="View Proof Source">
                  <ExternalLink className="w-5 h-5" />
                </a>
                
                {isAdmin && (
                  <button onClick={() => handleDelete(proof.id)} className="p-3 bg-rose-500/10 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all" title="Delete">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProofQueue;