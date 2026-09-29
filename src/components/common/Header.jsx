import React from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PMISLogo from './PMISLogo';

const Header = () => {
  const { profile } = useAuth();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else toast.success('Logged out successfully');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <PMISLogo variant="navbar" />

        <div className="flex items-center gap-5">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-800">{profile?.full_name || 'User'}</span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
              {profile?.role === 'admin' || profile?.role === 'super_admin' ? (
                <><ShieldCheck className="w-3 h-3 text-primary-600" /> Cambridge Admin Hub</>
              ) : (
                <><User className="w-3 h-3 text-secondary-600" /> Candidate Portal</>
              )}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-rose-600"
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
