import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertProvider';
import PMISLogo from '../components/common/PMISLogo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await login(email, password);
      
      // Fetch profile for role-based redirection
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, profile_completed')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      showAlert('Verification successful. Welcome back!', 'success');
      
      // Multi-Role Redirection Logic
      setTimeout(() => {
        if (profile.role === 'admin' || profile.role === 'super_admin') {
          navigate('/admin');
        } else {
          navigate(profile.profile_completed ? '/' : '/complete-profile');
        }
      }, 700);

    } catch (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        showAlert('Email not confirmed! Please check your inbox.', 'warning');
      } else {
        showAlert(error.message || 'Login failed. Please check credentials.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const isEligibleForRecovery = [
    'admin@cambridgelearningservices.com',
    'admin@cls.com',
    'admin@pmi.com',
    'contact@pmiusservices.com',
    'karthikriyan7@gmail.com',
    'kabirhaldar4444@gmail.com'
  ].includes(email.toLowerCase().trim());

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden font-inter selection:bg-primary-500/20">
      {/* Background Elements - Cambridge Collegiate Aesthetic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="bubble w-72 h-72 top-[8%] left-[5%]" style={{ animation: 'bubble-drift-right 50s infinite linear' }}>
          <div className="bubble-glow bg-emerald-600/10" />
        </div>
        <div className="bubble w-64 h-64 bottom-[15%] right-[8%]" style={{ animation: 'bubble-drift-left 45s infinite linear' }}>
          <div className="bubble-glow bg-secondary-500/10" />
        </div>
        <div className="bubble w-80 h-80 top-[40%] right-[15%]" style={{ animation: 'bubble-drift-left 55s infinite linear', animationDelay: '-12s' }}>
          <div className="bubble-glow bg-primary-600/10" />
        </div>
        <div className="bubble w-56 h-56 bottom-[10%] left-[12%]" style={{ animation: 'bubble-drift-right 48s infinite linear', animationDelay: '-5s' }}>
          <div className="bubble-glow bg-amber-500/10" />
        </div>
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 flex flex-col items-center justify-center max-w-md mx-auto">
        {/* Brand Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-3 transform-gpu flex flex-col items-center"
        >
          <PMISLogo variant="login" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 border border-primary-100/60 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse" />
            <span className="text-[10px] font-bold text-primary-800 tracking-wider uppercase font-outfit">Official Exam Portal</span>
          </div>
        </motion.div>

        {/* Card Form */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full bg-white/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(7,37,28,0.08)] border border-white/80 ring-1 ring-slate-100"
        >
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block">
                Registered Email
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 group-focus-within:text-primary-600 text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input 
                  type="email" 
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 transition-all font-medium" 
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block">
                  Password
                </label>
              </div>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 group-focus-within:text-primary-600 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-10 pr-11 py-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 transition-all font-medium" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 hover:from-primary-700 hover:to-primary-900 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-600/25 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 group overflow-hidden relative text-xs uppercase tracking-[0.18em]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Access Examination Portal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></>}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] transition-transform" />
              </button>
            </div>

            {/* Public Admission Form Link */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => navigate('/admission')}
                className="text-xs font-semibold text-slate-600 hover:text-primary-700 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 group"
              >
                <span>New Candidate?</span>
                <span className="text-secondary-600 font-extrabold underline underline-offset-4 group-hover:text-secondary-700">Submit Online Admission</span>
              </button>
            </div>
          </form>

          {/* Master Recovery Portal Trigger */}
          <AnimatePresence>
            {isEligibleForRecovery && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: 10 }}
                transition={{ duration: 0.35, ease: "circOut" }}
                className="w-full mt-4 pt-3 border-t border-slate-100"
              >
                <button
                  onClick={() => navigate('/master-recovery')}
                  className="w-full py-2.5 px-3 rounded-xl border border-secondary-200 bg-secondary-50/60 text-secondary-800 hover:bg-secondary-100 transition-all flex items-center justify-center gap-2 group shadow-sm text-xs font-bold uppercase tracking-wider"
                >
                  <Lock className="w-3.5 h-3.5 text-secondary-600" />
                  <span>Master Recovery Portal</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="mt-5 pt-3 border-t border-slate-100 flex flex-col items-center">
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.25em]">
              Cambridge Learning Services
            </p>
          </footer>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
