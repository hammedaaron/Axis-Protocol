
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, AtSign, User as UserIcon, ArrowLeft, AlertCircle, Loader2, FlaskConical, Users, X, Mail, Sparkles, CheckCircle, Terminal, Zap } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'reset';

interface AuthScreenProps {
  onLaunchSandbox: (type: 'john' | 'jane') => void;
}

const GenesisSetupGuide: React.FC = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl flex items-start gap-4">
      <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-tight">Genesis Protocol Active</h3>
        <p className="text-[10px] text-zinc-400 font-mono leading-relaxed mt-1">
          No operational nodes detected in the ledger. You are initializing the platform's core authority.
        </p>
      </div>
    </div>
    
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <CheckCircle className="w-4 h-4 text-emerald-500" />
        <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">Database Linked</span>
      </div>
      <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <Zap className="w-4 h-4 text-violet-500 animate-pulse" />
        <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">Awaiting First Admin Node</span>
      </div>
      <div className="flex items-center gap-3 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl opacity-50">
        <Terminal className="w-4 h-4 text-zinc-600" />
        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Setup Schema Governance</span>
      </div>
    </div>

    <p className="text-[9px] text-zinc-500 font-mono italic text-center px-4 leading-relaxed">
      Register below to become the platform's <span className="text-violet-400 font-bold">SUPER_ADMIN</span>. You will have full governance over personnel, projects, and system schema.
    </p>
  </div>
);

const AuthScreen: React.FC<AuthScreenProps> = ({ onLaunchSandbox }) => {
  const { login, register, resetPassword, isGenesisMode } = useAuth();
  const [mode, setMode] = useState<AuthMode>(isGenesisMode ? 'register' : 'login');
  const [formData, setFormData] = useState({ name: '', email: '', handle: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await login(formData.email || formData.handle, formData.password);
        if (!result.success) {
          setError(result.error || 'Identity not recognized. Please check your details.');
        }
      } else if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match.');
          setIsSubmitting(false);
          return;
        }
        const result = await register(formData.name, formData.email, formData.handle, formData.password);
        if (!result.success) {
          setError(result.error || 'Failed to create account.');
        } else {
          setSuccess('Account created successfully. Welcome to AXIS.');
        }
      } else if (mode === 'reset') {
        const result = await resetPassword(formData.email, formData.password);
        if (!result) {
          setError('Email not found.');
        } else {
          setSuccess('Reset link sent to your email.');
        }
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] grid-bg relative overflow-hidden px-4">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Sandbox Slide-in Panel */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-[#0c0c0e] border-l border-zinc-800 z-[100] transform transition-transform duration-500 ease-in-out shadow-2xl ${isSandboxOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <FlaskConical className="w-6 h-6 text-zinc-500" />
              <h2 className="text-xl font-bold text-white tracking-tighter uppercase">Mirror Sandbox</h2>
            </div>
            <button onClick={() => setIsSandboxOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
             <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] leading-relaxed">
               Select an environment node to enter the local mirror. No registration or cloud sign-in required.
             </p>

             <button 
               onClick={() => onLaunchSandbox('john')}
               className="w-full p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl group hover:border-violet-500/50 transition-all text-left"
             >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center border border-violet-500/20 text-violet-500 group-hover:bg-violet-600 group-hover:text-white transition-all">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-violet-400 transition-colors">John Doe</h3>
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">Node Administrator (SB)</p>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-600 font-light italic">View Admin Control, Schema Governance, and Member Validation.</p>
             </button>

             <button 
               onClick={() => onLaunchSandbox('jane')}
               className="w-full p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl group hover:border-white/50 transition-all text-left"
             >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700 text-zinc-400 group-hover:bg-white group-hover:text-black transition-all">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-zinc-200 transition-colors">Jane Doe</h3>
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">Talent Member (SB)</p>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-600 font-light italic">View Member Profile, Proof Submission, and dynamic schema sync.</p>
             </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col md:flex-row bg-zinc-900/40 border border-zinc-800/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="flex-1 p-8 md:p-12 border-b md:border-b-0 md:border-r border-zinc-800/50 flex flex-col justify-between bg-black/20">
          <div>
            <div className="w-10 h-10 bg-violet-600 rounded flex items-center justify-center font-bold text-white text-2xl mb-8 shadow-[0_0_20px_rgba(139,92,246,0.3)]">A</div>
            <h1 className="text-3xl font-bold tracking-tighter text-white mb-4">AXIS</h1>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-xs font-light">
              {isGenesisMode 
                ? "The professional talent operations gateway. Initialize the core node." 
                : "The professional talent operations gateway. Connect, execute, and scale."}
            </p>
          </div>
          
          <div className="space-y-4">
            {isGenesisMode ? (
              <GenesisSetupGuide />
            ) : (
              <>
                <button 
                  onClick={() => setIsSandboxOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400 hover:text-violet-400 hover:border-violet-500/50 transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                  <FlaskConical className="w-3.5 h-3.5" /> Open Mirror Panel
                </button>
                <div className="flex gap-4 border-t border-zinc-800/50 pt-6">
                   <div className="flex flex-col">
                      <span className="text-zinc-500 text-[10px] font-mono uppercase">Network</span>
                      <span className="text-violet-500 text-xs font-mono">STABLE</span>
                   </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 p-8 md:p-12 flex flex-col justify-center min-h-[500px]">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2">
              {isGenesisMode ? 'Platform Setup' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Sign Up' : 'Recover Access'}
            </h2>
            <p className="text-xs text-zinc-500 font-mono flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isSubmitting ? 'bg-amber-500' : 'bg-violet-500'} animate-pulse`}></span>
              {isSubmitting ? 'Processing request...' : isGenesisMode ? 'Establish the primary admin node' : 'Enter your credentials'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(mode === 'register' || isGenesisMode) && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pl-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input 
                    name="name"
                    required
                    disabled={isSubmitting}
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pl-1">
                {mode === 'login' && !isGenesisMode ? 'Email or Username' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input 
                  name="email"
                  type={mode === 'register' || isGenesisMode ? 'email' : 'text'}
                  required
                  disabled={isSubmitting}
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={mode === 'register' || isGenesisMode ? "you@domain.com" : "Email or @username"}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {(mode === 'register' || isGenesisMode) && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pl-1">Username (@handle)</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input 
                    name="handle"
                    required
                    disabled={isSubmitting}
                    value={formData.handle}
                    onChange={handleInputChange}
                    placeholder="@username"
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pl-1">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input 
                  name="password"
                  type="password"
                  required
                  disabled={isSubmitting}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono disabled:opacity-50"
                />
              </div>
            </div>

            {(mode === 'register' || isGenesisMode) && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pl-1">Confirm Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input 
                    name="confirmPassword"
                    type="password"
                    required
                    disabled={isSubmitting}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Repeat password"
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-[10px] text-rose-500 font-bold uppercase tracking-wider bg-rose-500/10 p-3 rounded border border-rose-500/20 flex items-start gap-2">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="text-[10px] text-violet-500 font-bold uppercase tracking-wider bg-violet-500/10 p-3 rounded border border-violet-500/20">
                {success}
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 mt-4 bg-violet-600 text-white font-bold uppercase tracking-[0.2em] text-xs rounded-xl hover:bg-violet-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isGenesisMode ? 'Initialize Platform' : mode === 'login' ? 'Continue' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>

          {!isGenesisMode && (
            <div className="mt-8 flex flex-col gap-4 text-center">
              {mode === 'login' ? (
                <>
                  <div className="h-[1px] bg-zinc-800/50 w-full" />
                  <button 
                    disabled={isSubmitting}
                    onClick={() => { setMode('register'); setError(null); }} 
                    className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest font-bold transition-colors disabled:opacity-50"
                  >
                    New to AXIS? Sign Up
                  </button>
                </>
              ) : (
                <button 
                  disabled={isSubmitting}
                  onClick={() => { setMode('login'); setError(null); }} 
                  className="text-[10px] text-violet-500 hover:text-violet-400 uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Login
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
