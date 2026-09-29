import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  BookOpen, 
  Plus, 
  Search, 
  LogOut, 
  LayoutDashboard,
  Bell,
  Settings,
  MoreVertical,
  Activity,
  ArrowRight,
  Loader2,
  FileText,
  Truck
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertProvider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PMISLogo from '../../components/common/PMISLogo';

// Import sub-components
import UsersManagement from './Users';
import ExamsManagement from './ManageQuestions';
import AdmissionsManagement from './Admissions';
import ServiceDeliveryManagement from './ServiceDeliveryManagement';

const VALID_TABS = ['exams', 'students', 'admissions', 'service_delivery'];

const normalizeTab = (tab) => {
  if (!tab) return null;
  const lower = tab.toLowerCase();
  if (lower === 'candidates' || lower === 'users') return 'students';
  if (lower === 'servicedelivery' || lower === 'service-delivery') return 'service_delivery';
  return VALID_TABS.includes(lower) ? lower : null;
};

const AdminDashboard = () => {
  const { user, profile, logout } = useAuth();
  const { showAlert, confirm } = useAlert();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = () => {
    const fromUrl = normalizeTab(searchParams.get('tab'));
    if (fromUrl) return fromUrl;
    const fromStorage = normalizeTab(sessionStorage.getItem('admin_active_tab'));
    if (fromStorage) return fromStorage;
    return 'exams';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [stats, setStats] = useState({ users: 0, exams: 0, admins: 0 });
  const [loading, setLoading] = useState(true);
  const [isSubView, setIsSubView] = useState(false);

  const handleTabChange = (tabName) => {
    const valid = normalizeTab(tabName) || 'exams';
    setActiveTab(valid);
    setSearchParams({ tab: valid }, { replace: true });
    sessionStorage.setItem('admin_active_tab', valid);
  };

  // Keep state in sync with URL searchParams (e.g. on direct navigation or browser back/forward)
  useEffect(() => {
    const fromUrl = normalizeTab(searchParams.get('tab'));
    if (fromUrl && fromUrl !== activeTab) {
      setActiveTab(fromUrl);
      sessionStorage.setItem('admin_active_tab', fromUrl);
    } else if (!fromUrl) {
      setSearchParams({ tab: activeTab }, { replace: true });
      sessionStorage.setItem('admin_active_tab', activeTab);
    }
  }, [searchParams]);

  const isSuperAdmin = profile?.role === 'super_admin' || 
    profile?.email === 'kabirhaldar4444@gmail.com' || 
    profile?.email === 'admin@cambridgelearningservices.com' || 
    profile?.email === 'admin@cls.com' || 
    profile?.email === 'admin@pmi.com';

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    try {
      const [uCount, eCount, aCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'candidate'),
        supabase.from('exams').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      ]);
      setStats({ users: uCount.count || 0, exams: eCount.count || 0, admins: aCount.count || 0 });
    } catch (error) {
      console.error('Stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to sign out of the administrator portal?',
      confirmText: 'Sign Out',
      type: 'danger',
      onConfirm: () => {
        sessionStorage.removeItem('admin_active_tab');
        logout();
        showAlert('Logged out successfully', 'success');
      }
    });
  };

  return (
    <div className="pb-10 bg-slate-50/50 min-h-screen">
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50 pointer-events-none">
        <div className="bg-white/85 backdrop-blur-2xl rounded-2xl sm:rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-[0_10px_35px_rgba(7,37,28,0.07)] border border-white/80 ring-1 ring-slate-100 pointer-events-auto">
          <div className="flex items-center">
            <PMISLogo variant="navbar" />
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => handleTabChange('exams')} 
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${activeTab === 'exams' ? 'bg-gradient-to-r from-primary-600 to-primary-800 text-white shadow-md shadow-primary-600/30' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Exams</span>
              <span className="sm:hidden">Exams</span>
            </button>
            
            <button 
              onClick={() => handleTabChange('students')} 
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${activeTab === 'students' ? 'bg-gradient-to-r from-primary-600 to-primary-800 text-white shadow-md shadow-primary-600/30' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Candidates</span>
              <span className="sm:hidden">Users</span>
            </button>

            <button 
              onClick={() => handleTabChange('admissions')} 
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${activeTab === 'admissions' ? 'bg-gradient-to-r from-primary-600 to-primary-800 text-white shadow-md shadow-primary-600/30' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Admissions</span>
              <span className="sm:hidden">Admissions</span>
            </button>

            <button 
              onClick={() => handleTabChange('service_delivery')} 
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${activeTab === 'service_delivery' ? 'bg-gradient-to-r from-primary-600 to-primary-800 text-white shadow-md shadow-primary-600/30' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}`}
            >
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Service Delivery</span>
              <span className="sm:hidden">Delivery</span>
            </button>

            <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden md:block"></div>
            
            {isSuperAdmin && (
              <button 
                onClick={() => navigate('/super-admin')} 
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold bg-secondary-50 hover:bg-secondary-100 text-secondary-800 border border-secondary-200/60 transition-all duration-300"
              >
                <Activity className="w-3.5 h-3.5 text-secondary-600 animate-pulse" />
                <span className="hidden sm:inline">Super Admin</span>
              </button>
            )}

            <button 
              onClick={handleLogout} 
              className="group bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 px-5 py-2.5 rounded-full text-xs sm:text-sm font-black transition-all flex items-center gap-2 ml-2"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              <span className="hidden lg:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className={`px-6 max-w-7xl mx-auto page-transition ${isSubView ? 'pt-36' : 'pt-32'}`}>





        <div className="w-full">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
              {activeTab === 'exams' && <ExamsManagement onSubViewChange={setIsSubView} />}
              {activeTab === 'students' && <UsersManagement />}
              {activeTab === 'admissions' && <AdmissionsManagement />}
              {activeTab === 'service_delivery' && <ServiceDeliveryManagement />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${active ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'}`}>
    <Icon className={`w-4 h-4 ${active ? 'text-primary-500' : ''}`} />
    {label}
  </button>
);

export default AdminDashboard;
