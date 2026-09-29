import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import Login from './pages/Login';
import CompleteProfile from './pages/candidate/CompleteProfile';
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import ExamPortal from './pages/candidate/ExamPortal';
import AdminDashboard from './pages/admin/AdminDashboard';
import Users from './pages/admin/Users';
import ManageQuestions from './pages/admin/ManageQuestions';
import UserSubmissions from './pages/admin/UserSubmissions';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import Profile from './pages/candidate/Profile';
import MasterRecovery from './pages/MasterRecovery';
import ResetPassword from './pages/ResetPassword';
import AdmissionForm from './pages/candidate/AdmissionForm';
import ServiceDelivery from './pages/candidate/ServiceDelivery';

function App() {
  const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-10 max-w-md text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-200">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Configuration Required</h1>
          <p className="text-slate-600 text-sm mb-8">
            The application is missing Supabase credentials. Please add your <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b> to the <code>.env</code> file in the project root.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="font-inter selection:bg-primary-500/30 relative">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/master-recovery" element={<MasterRecovery />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admission" element={<AdmissionForm />} />
          
          {/* Candidate Routes */}
          <Route path="/" element={
            <ProtectedRoute roleRequired="candidate">
              <CandidateDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/complete-profile" element={
            <ProtectedRoute roleRequired="candidate" allowIncomplete={true}>
              <CompleteProfile />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute roleRequired="candidate">
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/exam/:id" element={
            <ProtectedRoute roleRequired="candidate">
              <ExamPortal />
            </ProtectedRoute>
          } />

          <Route path="/service-delivery" element={
            <ProtectedRoute roleRequired="candidate">
              <ServiceDelivery />
            </ProtectedRoute>
          } />

          <Route path="/servicedelivery" element={<Navigate to="/service-delivery" replace />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute roleRequired="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Super Admin Routes */}
          <Route path="/super-admin" element={
            <ProtectedRoute roleRequired="super_admin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
