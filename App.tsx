
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchemaProvider } from './context/SchemaContext';
import { DataProvider, useData } from './context/DataContext';
import { Role, Jobber, Rank } from './types';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import AuthScreen from './components/AuthScreen';
import ProfileDrawer from './components/ProfileDrawer';
import Dashboard from './views/Dashboard';
import Jobbers from './views/Jobbers';
import Settings from './views/Settings';
import Messages from './views/Messages';
import Campaigns from './views/Campaigns';
import ProofQueue from './views/ProofQueue';
import MemberSettings from './views/MemberSettings';
import { NAV_ITEMS } from './constants';

const SANDBOX_PROFILES = {
  JOHN: { id: 'sb-john-admin', name: 'John Doe', handle: '@johndoe', role: Role.SUPER_ADMIN, rank: Rank.GOLD, avatar_url: '' },
  JANE: { id: 'sb-jane-member', name: 'Jane Doe', handle: '@janedoe', role: Role.JOBBER, rank: Rank.BRONZE, avatar_url: '' }
};

const MobileNav: React.FC<{ currentView: string; onNavigate: (p: string) => void; role?: Role }> = ({ currentView, onNavigate, role }) => {
  const filteredNav = NAV_ITEMS.filter(item => role && item.roles.includes(role));
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#09090b] border-t border-zinc-800 z-[60] flex items-center justify-around px-2 pb-safe">
      {filteredNav.map(item => (
        <button 
          key={item.path} 
          onClick={() => onNavigate(item.path)}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${currentView === item.path ? 'text-violet-500 bg-violet-500/10' : 'text-zinc-600'}`}
        >
          {React.cloneElement(item.icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
          <span className="text-[8px] font-bold uppercase tracking-tighter mt-1">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

const MainLayout: React.FC<{ sandboxUser?: any; onExitSandbox?: () => void }> = ({ sandboxUser, onExitSandbox }) => {
  const { user: authUser, logout: authLogout } = useAuth();
  const [currentView, setCurrentView] = useState('overview');
  const [selectedJobber, setSelectedJobber] = useState<Jobber | null>(null);

  const user = sandboxUser || authUser;

  useEffect(() => {
    if (user?.role === Role.JOBBER) setCurrentView('dashboard');
    else setCurrentView('overview');
  }, [user]);

  const handleLogout = async () => {
    if (onExitSandbox) onExitSandbox();
    else await authLogout();
  };

  const renderView = () => {
    try {
      switch (currentView) {
        case 'overview':
        case 'dashboard': return <Dashboard />;
        case 'jobbers': return <Jobbers onSelect={setSelectedJobber} />;
        case 'proof-queue': return <ProofQueue />;
        case 'campaigns': return <Campaigns />;
        case 'settings': return <Settings />;
        case 'member-settings': return <MemberSettings />;
        case 'messages': return <Messages onSelectJobber={setSelectedJobber} userOverride={user} />;
        default: return <Dashboard />;
      }
    } catch (err) {
      console.error("[AXIS] View Rendering Error:", err);
      return <div className="p-10 text-center text-zinc-500 font-mono text-xs">Error loading view. Please reload.</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-300 selection:bg-violet-600/30 selection:text-violet-400">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} userRoleOverride={user?.role} />
      <div className="flex-1 flex flex-col relative overflow-hidden pb-16 md:pb-0">
        <TopBar onNavigate={setCurrentView} onLogout={handleLogout} isSandbox={!!sandboxUser} userOverride={user} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {renderView()}
        </main>
        <MobileNav currentView={currentView} onNavigate={setCurrentView} role={user?.role} />
      </div>
      <ProfileDrawer jobber={selectedJobber} onClose={() => setSelectedJobber(null)} />
    </div>
  );
};

const AppContent: React.FC = () => {
  // Safe context usage
  let authContext;
  let dataContext;
  
  try {
    authContext = useAuth();
    dataContext = useData();
  } catch (err) {
    console.error("[AXIS] Critical Context Load Error:", err);
  }

  const authLoading = authContext?.isLoading;
  const dataLoading = dataContext?.isLoading;
  const user = authContext?.user;

  const [isSplashing, setIsSplashing] = useState(true);
  const [sandboxUser, setSandboxUser] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashing(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isSplashing) {
    return (
      <div className="h-screen bg-[#09090b] flex flex-col items-center justify-center grid-bg">
        <div className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center font-bold text-white text-3xl shadow-[0_0_40px_rgba(139,92,246,0.4)] animate-bounce">A</div>
        <div className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.5em] mt-8 animate-pulse">Initializing Neural Link...</div>
      </div>
    );
  }

  if (authLoading || dataLoading) {
    return (
      <div className="h-screen bg-[#09090b] flex flex-col items-center justify-center">
        <div className="w-10 h-1 bg-zinc-900 rounded-full overflow-hidden">
           <div className="h-full bg-violet-600 animate-[loading_1.5s_infinite]" />
        </div>
        <span className="text-[8px] text-zinc-700 font-mono uppercase mt-4 tracking-widest">Verifying Identity Packet</span>
      </div>
    );
  }

  if (sandboxUser) return <MainLayout sandboxUser={sandboxUser} onExitSandbox={() => setSandboxUser(null)} />;
  if (!user) return <AuthScreen onLaunchSandbox={(type) => setSandboxUser(type === 'john' ? SANDBOX_PROFILES.JOHN : SANDBOX_PROFILES.JANE)} />;
  return <MainLayout />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SchemaProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </SchemaProvider>
    </AuthProvider>
  );
};

export default App;
