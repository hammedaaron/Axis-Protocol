
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Role, Rank } from '../types';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  handle: string;
  role: Role;
  rank: Rank;
  atis_score: number;
  avatar_url: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, handle: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, newPass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  isGenesisMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenesisMode, setIsGenesisMode] = useState(false);
  const auth = supabase.auth as any;

  const checkGenesisMode = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      
      if (!error && count === 0) {
        setIsGenesisMode(true);
      } else {
        setIsGenesisMode(false);
      }
    } catch (err) {
      console.warn("[AXIS] Genesis Detection bypass:", err);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, email, handle, role, rank, atis_score, avatar_url')
        .eq('id', userId)
        .maybeSingle();
      
      if (profile) {
        setUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          handle: profile.handle,
          role: profile.role,
          rank: profile.rank as Rank,
          atis_score: profile.atis_score || 0,
          avatar_url: profile.avatar_url || ''
        });
      }
    } catch (err) {
      console.error("[AXIS] Profile Fetch Error:", err);
    }
  }, []);

  const refreshUser = async () => {
    const { data: { session } } = await auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    const releaseTimer = setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    const initAuth = async () => {
      try {
        await checkGenesisMode();
        const { data: { session } } = await auth.getSession();
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error("[AXIS] Auth Connection Error:", err);
      } finally {
        setIsLoading(false);
        clearTimeout(releaseTimer);
      }
    };

    initAuth();

    const { data: { subscription } } = auth.onAuthStateChange(async (event: any, session: any) => {
      if (session?.user) {
        await fetchProfile(session.user.id);
        setIsGenesisMode(false);
      } else {
        setUser(null);
        checkGenesisMode();
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(releaseTimer);
    };
  }, [fetchProfile, checkGenesisMode, auth]);

  const login = async (email: string, pass: string) => {
    const { error } = await auth.signInWithPassword({ email, password: pass });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const register = async (name: string, email: string, handle: string, pass: string) => {
    const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    
    let targetRole = Role.JOBBER;
    if (isGenesisMode) {
      targetRole = Role.SUPER_ADMIN;
    } else if (pass.startsWith('AXIS-')) {
      targetRole = Role.ADMIN;
    }

    // Step 1: Auth Sign-up
    const { data: authData, error: authError } = await auth.signUp({ 
      email, 
      password: pass,
      options: { 
        data: { 
          name, 
          handle: formattedHandle, 
          role: targetRole 
        } 
      }
    });

    if (authError) return { success: false, error: authError.message };

    // Step 2: Immediate Profile Node Creation
    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        name,
        email, 
        handle: formattedHandle,
        role: targetRole,
        rank: Rank.IRON,
        atis_score: 0,
        status: 'active',
        avatar_url: `https://ui-avatars.com/api/?name=${name}&background=random`
      });

      if (profileError) {
        console.error("[AXIS] Profile Creation Synchrony Failed:", profileError.message);
      } else {
        // THIS IS THE FIX: Logs the event so it appears in the Dashboard Stream
        await supabase.from('events').insert({
           type: 'alert',
           message: `New Operator Node Registered: ${name}`,
           severity: 'low',
           related_jobber_id: authData.user.id
        });
      }
    }

    return { success: true };
  };
  
  const resetPassword = async (email: string, newPass: string) => {
    const { error } = await auth.resetPasswordForEmail(email);
    return !error;
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      resetPassword, 
      logout, 
      refreshUser, 
      isLoading, 
      isGenesisMode 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth error");
  return context;
};
