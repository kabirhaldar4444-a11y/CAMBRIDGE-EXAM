import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Loader2, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../context/AlertProvider';
import PMISLogo from '../components/common/PMISLogo';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showAlert('Passwords do not match.', 'error');
      return;
    }
    if (password.length < 6) {
      showAlert('Password must be at least 6 characters long.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      showAlert('Credentials securely updated.', 'success');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      showAlert(error.message || 'Reset failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden font-inter selection:bg-primary-500/20">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="bubble w-56 h-56 top-[10%] right-[10%]" style={{ animation: 'bubble-drift-left 50s infinite linear' }}>
          <div className="bubble-glow bg-emerald-600/10" />
        </div>
        <div className="bubble w-64 h-64 top-[30%] left-[8%]" style={{ animation: 'bubble-drift-right 55s infinite linear', animationDelay: '-8s' }}>
          <div className="bubble-glow bg-secondary-500/10" />
        </div>
      </div>

      <div className="relative z-10 w-full px-6 flex flex-col items-center justify-center max-w-sm mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4 transform-gpu"
        >
          <PMISLogo variant="login" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full bg-white/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(7,37,28,0.08)] border border-white/80 ring-1 ring-slate-100 text-center"
        >
          <AnimatePresence mode="wait">
            {!success ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mb-6">
                  <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-800 mb-1">Secure Password Reset</h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.1em]">Cambridge Authentication Layer</p>
                </div>

                <form onSubmit={handleReset} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block">
                      New Password
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block">
                      Confirm New Password
                    </label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-700 hover:to-primary-900 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-600/25 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.15em]"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-4"
              >
                <div className="flex justify-center mb-4">
                  <CheckCircle2 className="w-12 h-12 text-primary-600" />
                </div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 mb-2">Reset Successful</h2>
                <p className="text-slate-500 text-xs font-medium mb-6">
                  Returning to Cambridge secure portal...
                </p>
                <div className="flex items-center justify-center gap-2 text-primary-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Redirecting...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="mt-8 pt-4 border-t border-slate-100 flex flex-col items-center">
            <p className="text-slate-400 text-[8px] font-bold uppercase tracking-[0.25em]">
              Cambridge Learning Services
            </p>
          </footer>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
