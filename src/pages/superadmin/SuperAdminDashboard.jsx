import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, LogOut, ArrowRight, Activity } from 'lucide-react';
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
    <div className="pb-10 page-transition">


      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 pointer-events-none">
        <div className="glass-navbar rounded-full px-8 py-3 flex items-center justify-between shadow-2xl backdrop-blur-2xl border-purple-500/20 shadow-purple-500/10 pointer-events-auto">
          <div className="flex items-center gap-3">
            <PMISLogo variant="navbar" />
            <span className="font-outfit font-bold text-xl tracking-tight hidden sm:block">SUPER ADMIN</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl hover:scale-[1.03] transition-all">
              Admin Portal
            </button>
            <button onClick={logout} className="bg-slate-900 text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl hover:scale-[1.03] transition-all">
              Logout Force
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-32 px-6 max-w-5xl mx-auto">


        <header className="mb-8">

           <h1 className="text-4xl font-outfit font-black text-slate-900 mb-2">Master Override <span className="animate-pulse text-purple-600">●</span></h1>
           <p className="text-slate-500 font-medium">Real-time Administrative Monitor</p>
        </header>

        <section className="glass-card-saas p-10 relative overflow-hidden border-2 border-purple-500/20">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-purple-600/10 text-purple-600 flex items-center justify-center rounded-2xl"><Users className="w-6 h-6" /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Regional Admins</h2>
              <p className="text-sm font-medium text-slate-500">Managing {admins.length} active administrative tokens.</p>
            </div>
          </div>

          <div className="space-y-4">
            {admins.map(admin => {
              const isNew = new Date(admin.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
              return (
                <motion.div key={admin.id} layout initial={{ opacity: 0}} animate={{ opacity: 1}} className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                       {admin.full_name} 
                       {isNew && <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] uppercase font-black tracking-widest animate-pulse">New</span>}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">{admin.email} • ID: {admin.id.split('-')[0]}</p>
                  </div>
                  <div className="px-4 py-2 bg-purple-600/10 text-purple-600 rounded-xl text-xs font-black uppercase tracking-widest border border-purple-600/20">
                    Active Admin
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
export default SuperAdminDashboard;
