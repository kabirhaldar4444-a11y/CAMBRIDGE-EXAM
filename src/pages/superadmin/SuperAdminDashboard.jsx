import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, LogOut, ArrowRight, ArrowLeft, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import PMISLogo from '../../components/common/PMISLogo';

const SuperAdminDashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmins();
    // Realtime Subscriptions for Admins
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if(payload.new?.role === 'admin') {
          fetchAdmins(); // Re-fetch to catch new admins live
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel) };
  }, []);

  const fetchAdmins = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'admin').order('created_at', { ascending: false });
    setAdmins(data || []);
    setLoading(false);
  };

  return (
    <div className="pb-10 page-transition bg-slate-50/50 min-h-screen">
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50 pointer-events-none">
        <div className="glass-navbar rounded-full px-5 sm:px-8 py-3 flex items-center justify-between shadow-2xl backdrop-blur-2xl border-primary-600/15 shadow-[0_10px_35px_rgba(7,37,28,0.08)] pointer-events-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-primary-700 hover:bg-primary-50 transition-all border border-slate-200/80 mr-1"
              title="Return to Admin Portal"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <PMISLogo variant="navbar" />
            <span className="font-outfit font-black text-xs sm:text-sm tracking-widest text-primary-800 bg-primary-50 px-3 py-1 rounded-full border border-primary-200/60 hidden md:block uppercase">SUPER ADMIN</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-700 hover:to-primary-900 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-primary-900/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <button
              onClick={logout}
              className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 border border-slate-200/80"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-32 px-6 max-w-5xl mx-auto">
        {/* Navigation Breadcrumb / Quick Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-primary-50 border border-slate-200/80 text-slate-700 hover:text-primary-800 text-xs sm:text-sm font-bold shadow-sm transition-all group active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-primary-600" />
            <span>← Back to Admin Portal</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span>Admin</span>
            <span>/</span>
            <span className="text-primary-700">Super Admin Override</span>
          </div>
        </div>

        <header className="mb-8">
           <h1 className="text-3xl sm:text-4xl font-outfit font-black text-slate-900 mb-2">Master Override <span className="animate-pulse text-secondary-500">●</span></h1>
           <p className="text-slate-500 font-medium text-sm">Real-time Administrative Monitor & Access Control</p>
        </header>

        <section className="glass-card-saas p-6 sm:p-10 relative overflow-hidden border border-primary-600/15 shadow-[0_12px_36px_rgba(7,37,28,0.06)] bg-white/90">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-primary-50 text-primary-700 flex items-center justify-center rounded-2xl border border-primary-100/70 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Regional Admins</h2>
              <p className="text-sm font-medium text-slate-500">Managing {admins.length} active administrative tokens.</p>
            </div>
          </div>

          <div className="space-y-4">
            {admins.map(admin => {
              const isNew = new Date(admin.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
              return (
                <motion.div key={admin.id} layout initial={{ opacity: 0}} animate={{ opacity: 1}} className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between hover:bg-white hover:shadow-md transition-all">
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                       {admin.full_name} 
                       {isNew && <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] uppercase font-black tracking-widest animate-pulse">New</span>}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{admin.email} • ID: {admin.id.split('-')[0]}</p>
                  </div>
                  <div className="px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-xs font-black uppercase tracking-widest border border-primary-200/60 shadow-sm">
                    Active Admin
                  </div>
                </motion.div>
              )
            })}
            {admins.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-400 text-sm font-medium">
                No regional admins found.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
export default SuperAdminDashboard;
