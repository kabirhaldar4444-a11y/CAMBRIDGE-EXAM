import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertProvider';
import PMISLogo from '../common/PMISLogo';

const CandidateNavbar = ({ activeTab }) => {
  const { logout } = useAuth();
  const { confirm, showAlert } = useAlert();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current active tab from prop or pathname
  const currentTab = activeTab || (location.pathname.includes('profile') ? 'profile' : 'exams');

  const handleLogout = () => {
    confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to end your candidate session?',
      confirmText: 'Sign Out',
      type: 'danger',
      onConfirm: async () => {
        await logout();
        showAlert('Logged out successfully', 'success');
        navigate('/login');
      }
    });
  };

  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-[100] transition-all duration-300 pointer-events-none">
      <div className="bg-white/85 backdrop-blur-2xl rounded-2xl sm:rounded-full px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between shadow-[0_10px_35px_rgba(7,37,28,0.07)] border border-white/80 ring-1 ring-slate-100 pointer-events-auto">
        {/* Left: Brand Logo */}
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center pl-1 sm:pl-2 cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <PMISLogo variant="navbar" />
        </div>

        {/* Center / Right: Nav Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* My Exams */}
          <button
            onClick={() => navigate('/')}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
              currentTab === 'exams'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30 scale-[1.02]'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            My Exams
          </button>

          {/* Profile */}
          <button
            onClick={() => navigate('/profile')}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
              currentTab === 'profile'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30 scale-[1.02]'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            Profile
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="bg-slate-900 text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase shadow-md shadow-slate-900/15 hover:bg-slate-800 hover:-translate-y-0.5 transition-all active:scale-95 group flex items-center gap-1.5"
          >
            <span className="hidden xs:inline">Sign Out</span>
            <LogOut className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default CandidateNavbar;
