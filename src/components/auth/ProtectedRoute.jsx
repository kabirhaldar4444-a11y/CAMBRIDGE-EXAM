import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

const ProtectedRoute = ({ children, roleRequired, allowIncomplete = false }) => {
  const { user, profile } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If profile is not yet loaded, show a professional loader instead of a blank screen
  if (!profile && user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#f8fafc] to-[#eff6ff]">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin shadow-lg shadow-primary-500/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary-500" />
          </div>
        </div>
        <div className="mt-8 text-center space-y-2">
            <h3 className="text-xl font-outfit font-black text-slate-900 tracking-tight">Securing Connection</h3>
            <p className="text-slate-400 text-sm font-medium animate-pulse italic">Synchronizing your examination session...</p>
        </div>
      </div>
    );
  }

  // 1. Role Authorization
  const isSuperAdmin = profile?.role === 'super_admin' || 
    profile?.email === 'kabirhaldar4444@gmail.com' || 
    profile?.email === 'admin@cambridgelearningservices.com' || 
    profile?.email === 'admin@cls.com' || 
    profile?.email === 'admin@pmi.com';

  if (roleRequired) {
    const hasRequiredRole = profile?.role === roleRequired;
    const isSuperAdminAccessingAdmin = roleRequired === 'admin' && isSuperAdmin;
    
    if (!hasRequiredRole && !isSuperAdminAccessingAdmin) {
      if (profile?.role === 'admin' || isSuperAdmin) return <Navigate to="/admin" replace />;
      return <Navigate to="/" replace />;
    }
  }

  // 2. Profile Completion Logic (Candidate Only)
  if (profile?.role === 'candidate') {
    if (!profile.profile_completed && !allowIncomplete) {
      return <Navigate to="/complete-profile" replace />;
    }
    if (profile.profile_completed && allowIncomplete) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
