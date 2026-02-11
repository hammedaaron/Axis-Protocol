import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseUrl } from '../lib/supabase';
import { Jobber, SystemEvent, Severity, Project, Broadcast, InAppNotification, Rank } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  jobbers: Jobber[];
  events: SystemEvent[];
  projects: Project[];
  broadcasts: Broadcast[];
  notifications: InAppNotification[];
  isLoading: boolean;
  isLive: boolean;
  addEvent: (type: SystemEvent['type'], message: string, severity: Severity, targetId?: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  updateJobber: (id: string, updates: Partial<Jobber>) => Promise<void>;
  deleteJobber: (id: string) => Promise<void>;
  scoreProof: (jobberId: string, proofId: string, score: number) => Promise<void>;
  deleteProof: (id: string) => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'created_at'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  submitProof: (jobberId: string, proofData: any) => Promise<void>;
  addBroadcast: (message: string, priority?: 'normal' | 'urgent', authorId?: string) => Promise<void>;
  deleteBroadcast: (id: string) => Promise<void>;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  refreshJobberData: (id: string) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const [jobbers, setJobbers] = useState<Jobber[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  // Helper to add logs automatically - NON-BLOCKING
  const logSystemEvent = async (type: 'submission' | 'alert' | 'grade_change', message: string, severity: Severity, relatedId?: string) => {
    try {
      // Fire and forget - don't hold up the main thread
      supabase.from('events').insert({ 
        type, 
        message, 
        severity, 
        related_jobber_id: relatedId 
      }).select().single().then(({ data }) => {
        if (data) setEvents(prev => [data, ...prev]);
      });
    } catch (e) { console.error("Event Log Error", e); }
  };

  useEffect(() => {
    const init = async () => {
      const safetyTimer = setTimeout(() => setIsLoading(false), 5000);
      const live = !supabaseUrl.includes('placeholder-project-id');
      setIsLive(live);
      
      if (live) {
        try {
          await fetchLiveData();
        } catch (err) {
          console.error("[AXIS] Sync Error during init:", err);
        } finally {
          setIsLoading(false);
          clearTimeout(safetyTimer);
        }
      } else {
        setIsLoading(false);
        clearTimeout(safetyTimer);
      }
    };
    init();
  }, [user?.id]);

  // Real-time subscriptions
  useEffect(() => {
    if (!isLive) return;
    const channel = supabase.channel('axis-sync-node')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchLiveData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts' }, () => fetchLiveData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchLiveData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchLiveData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLive, user?.id]);

  const fetchLiveData = async () => {
    try {
      const [profilesRes, projectsRes, eventsRes, broadcastsRes, notificationsRes] = await Promise.all([
        supabase.from('profiles').select('*, proofs!proofs_jobber_id_fkey(*)'),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('broadcasts').select('*').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', user?.id || '').order('timestamp', { ascending: false })
      ]);

      if (profilesRes?.data) setJobbers(profilesRes.data.map((p: any) => ({ ...p, dynamicData: p.dynamic_data || {}, proofs: p.proofs || [], contributions: [] })));
      if (projectsRes?.data) setProjects(projectsRes.data);
      if (eventsRes?.data) setEvents(eventsRes.data);
      if (broadcastsRes?.data) setBroadcasts(broadcastsRes.data);
      if (notificationsRes?.data) setNotifications(notificationsRes.data);
    } catch (err) {
      console.error("[AXIS] fetchLiveData Critical Error:", err);
    }
  };

  const addEvent = async (t: any, m: any, s: any, tid: any) => {
    await logSystemEvent(t, m, s, tid);
  };

  const deleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const updateJobber = async (id: string, updates: any) => {
    const dbUpdates = { ...updates };
    if (updates.dynamicData) { dbUpdates.dynamic_data = updates.dynamicData; delete dbUpdates.dynamicData; }
    
    // Add .select() to ensure promise resolves
    await supabase.from('profiles').update(dbUpdates).eq('id', id).select();
    
    if (id === user?.id) refreshUser();
    // Optimistic update
    setJobbers(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const deleteJobber = async (id: string) => {
    // Add .select() to ensure promise resolves
    const { error } = await supabase.from('profiles').delete().eq('id', id).select();
    if (!error) setJobbers(prev => prev.filter(j => j.id !== id));
  };

  // --- FIXED CAMPAIGN PERSISTENCE & LOGGING ---
  const addProject = async (p: any) => {
    const { data, error } = await supabase.from('projects').insert(p).select().single();
    if (!error && data) {
      setProjects(prev => [data, ...prev]); // Immediate Local Update
      logSystemEvent('alert', `New Campaign Initialized: ${p.title}`, Severity.MEDIUM);
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id).select();
    if (!error) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p)); // Immediate Local Update
      logSystemEvent('alert', `Campaign Modified: ${updates.title || id}`, Severity.LOW);
    }
  };

  const deleteProject = async (id: string) => {
    const projectTitle = projects.find(p => p.id === id)?.title || 'Unknown';
    // Add .select() to prevent hanging on 204 No Content
    const { error } = await supabase.from('projects').delete().eq('id', id).select();
    
    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id)); // Immediate Local Update
      logSystemEvent('alert', `Campaign Purged: ${projectTitle}`, Severity.HIGH);
    } else {
      console.error("Delete failed", error);
      throw error; // Re-throw to inform UI
    }
  };
  // ---------------------------------------------

  const deleteProof = async (id: string) => {
    // Add .select() to prevent hanging
    const { error } = await supabase.from('proofs').delete().eq('id', id).select();
    
    if (!error) {
      // Refresh jobbers to update proof lists inside them
      setJobbers(prev => prev.map(j => ({
        ...j,
        proofs: j.proofs.filter(p => p.id !== id)
      })));
      logSystemEvent('alert', 'Proof Record Expunged', Severity.HIGH);
    } else {
      console.error("Delete proof failed", error);
    }
  };

  // --- FIXED BROADCAST LOGGING ---
  const addBroadcast = async (message: string, priority: 'normal' | 'urgent' = 'normal', authorId?: string) => {
    const { data, error } = await supabase.from('broadcasts').insert({ message, priority, author_id: authorId || user?.id }).select().single();
    if (data && !error) {
      setBroadcasts(prev => [data, ...prev]);
      logSystemEvent('alert', `Global Directive Issued: ${message.substring(0, 20)}...`, Severity.HIGH);
    }
  };

  const deleteBroadcast = async (id: string) => {
    await supabase.from('broadcasts').delete().eq('id', id).select();
    setBroadcasts(prev => prev.filter(b => b.id !== id));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id).select();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotifications = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id).select();
    setNotifications([]);
  };

  // --- FIXED MANUAL SCORING & LOGGING ---
  const scoreProof = async (jid: string, pid: string, score: number) => {
    // 1. Update the proof status - Add .select() to prevent hanging
    const { error: updateError } = await supabase.from('proofs').update({ admin_score: score, status: 'scored' }).eq('id', pid).select();
    
    if (updateError) {
      console.error("Score update failed:", updateError);
      return; // Stop if update fails
    }

    // 2. Fetch current jobber score
    const { data: jobber } = await supabase.from('profiles').select('atis_score').eq('id', jid).single();
    
    if (jobber) {
      const newScore = (jobber.atis_score || 0) + (score * 10);
      let newRank = Rank.IRON;
      if (newScore >= 500) newRank = Rank.GOLD;
      else if (newScore >= 300) newRank = Rank.SILVER;
      else if (newScore >= 100) newRank = Rank.BRONZE;
      
      // 3. Update jobber stats
      await supabase.from('profiles').update({ atis_score: newScore, rank: newRank }).eq('id', jid).select();
      
      // 4. Log event non-blocking
      logSystemEvent('grade_change', `Manual Grade: ${score}/5 applied to node`, Severity.MEDIUM, jid);
      
      // 5. Update local state immediately
      await refreshJobberData(jid);
    }
  };

  const refreshJobberData = async (id: string) => {
    const { data } = await supabase.from('profiles').select('*, proofs!proofs_jobber_id_fkey(*)').eq('id', id).single();
    if (data) {
      setJobbers(prev => prev.map(j => j.id === id ? { ...data, dynamicData: data.dynamic_data || {}, proofs: data.proofs || [] } : j));
    }
  };

  const submitProof = async (jobberId: string, proofData: any) => {
    const { data, error } = await supabase.from('proofs').insert({ ...proofData, jobber_id: jobberId }).select().single();
    if (!error) {
       logSystemEvent('submission', `Proof Submitted: ${proofData.title}`, Severity.LOW, jobberId);
       // Refresh local data to show new proof immediately
       refreshJobberData(jobberId);
    }
  };

  const refreshAllData = async () => {
    setIsLoading(true);
    await fetchLiveData();
    setIsLoading(false);
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).select();
    setNotifications(prev => prev.map(n => ({...n, is_read: true})));
  };

  return (
    <DataContext.Provider value={{ 
      jobbers, events, projects, broadcasts, notifications, isLoading, isLive, 
      addEvent, deleteEvent, updateJobber, deleteJobber, scoreProof, deleteProof, submitProof, addProject, updateProject, deleteProject,
      addBroadcast, deleteBroadcast, markAllNotificationsRead, deleteNotification,
      clearNotifications, refreshJobberData, refreshAllData 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData context not found.");
  return context;
};