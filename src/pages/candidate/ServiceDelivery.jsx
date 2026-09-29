import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  User as UserIcon, 
  ShieldCheck, 
  Search, 
  ArrowLeft, 
  Check, 
  Clock, 
  ChevronRight, 
  FileCheck, 
  Award, 
  Filter, 
  Sparkles, 
  Users, 
  X, 
  ExternalLink,
  ChevronLeft,
  BookOpen,
  Calendar,
  Mail,
  Phone,
  RefreshCw
} from 'lucide-react';
import CandidateNavbar from '../../components/layout/CandidateNavbar';
import DisclaimerOverlay from '../../components/DisclaimerOverlay';

// 9 Exact Service Delivery Milestones from Screenshot
export const SERVICE_DELIVERY_STEPS = [
  {
    id: 1,
    title: 'Admission confirmation',
    shortDesc: 'Admission Confirmed',
    detail: 'Candidate enrollment verified, application processed and admission officially confirmed.'
  },
  {
    id: 2,
    title: 'Document KYC verification',
    shortDesc: 'KYC Verified',
    detail: 'Candidate government identification and educational credentials verified.'
  },
  {
    id: 3,
    title: 'Video KYC authentication',
    shortDesc: 'Video KYC Done',
    detail: 'Biometric and live video identity verification successfully authenticated.'
  },
  {
    id: 4,
    title: 'GST Invoice delivered',
    shortDesc: 'GST Invoice Sent',
    detail: 'Official GST tax invoice and fee receipt generated and delivered.'
  },
  {
    id: 5,
    title: 'PDF study material shared',
    shortDesc: 'Study Material Sent',
    detail: 'Comprehensive course curriculum, reference guides and PDF materials dispatched.'
  },
  {
    id: 6,
    title: 'Enrollment certificate issued',
    shortDesc: 'Certificate Issued',
    detail: 'Formal enrollment certificate and candidate registration number issued.'
  },
  {
    id: 7,
    title: 'Video lectures delivered',
    shortDesc: 'Lectures Delivered',
    detail: 'Access to comprehensive video training sessions and module recordings provided.'
  },
  {
    id: 8,
    title: 'Final exam login shared',
    shortDesc: 'Exam Login Shared',
    detail: 'Secure examination portal credentials and examination schedule delivered.'
  },
  {
    id: 9,
    title: 'Result & PC delivered',
    shortDesc: 'Result & PC Delivered',
    detail: 'Final examination scores evaluated, result published and Provisional Certificate delivered.'
  }
];

// Rich sample candidates list (matching screenshot persona BALAMURUGAN S and diverse users)
const DEFAULT_CANDIDATES = [
  {
    id: 'demo-balamurugan',
    full_name: 'BALAMURUGAN S',
    email: 'balayes1987@gmail.com',
    phone: '9876543210',
    course_name: 'Cambridge Professional Master Certification',
    profile_photo_url: null, // Renders "BS" avatar exactly matching screenshot
    service_delivery_step: 9,
    enrolled_date: '12 Jan 2026',
    status: 'completed'
  },
  {
    id: 'demo-1',
    full_name: 'Karunanithy Posanguraja',
    email: 'karunsun@gmail.com',
    phone: '9876543211',
    course_name: 'Cambridge Professional Master Certification',
    profile_photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    service_delivery_step: 9,
    enrolled_date: '15 Jan 2026',
    status: 'completed'
  },
  {
    id: 'demo-2',
    full_name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '9811223344',
    course_name: 'Executive Project Management',
    profile_photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    service_delivery_step: 9,
    enrolled_date: '05 Feb 2026',
    status: 'completed'
  },
  {
    id: 'demo-3',
    full_name: 'Priya Mukherjee',
    email: 'priya.m@techcorp.in',
    phone: '9822334455',
    course_name: 'Agile Leadership & Delivery',
    profile_photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
    service_delivery_step: 6,
    enrolled_date: '18 Feb 2026',
    status: 'in_progress'
  },
  {
    id: 'demo-4',
    full_name: 'Rajesh Venkataraman',
    email: 'rajesh.v@consulting.org',
    phone: '9833445566',
    course_name: 'Risk & Strategy Management',
    profile_photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    service_delivery_step: 4,
    enrolled_date: '22 Feb 2026',
    status: 'in_progress'
  },
  {
    id: 'demo-5',
    full_name: 'Sneha Patel',
    email: 'sneha.patel@globaledu.com',
    phone: '9844556677',
    course_name: 'Cambridge Learning Services Certified Specialist',
    profile_photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    service_delivery_step: 9,
    enrolled_date: '28 Jan 2026',
    status: 'completed'
  },
  {
    id: 'demo-6',
    full_name: 'Vikramaditya Roy',
    email: 'vikram.roy@domain.net',
    phone: '9855667788',
    course_name: 'Enterprise Quality Assurance',
    profile_photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
    service_delivery_step: 2,
    enrolled_date: '24 Feb 2026',
    status: 'in_progress'
  }
];

const ServiceDelivery = () => {
  const { user, profile } = useAuth();
  
  // State
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'in_progress'
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewMode, setViewMode] = useState('directory'); // 'directory' | 'detail'
  const [selectedStepDetail, setSelectedStepDetail] = useState(null);

  // Fetch users from Supabase and merge with default personas
  useEffect(() => {
    fetchUsers();
  }, [user?.id]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch profiles
      const { data: dbProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'candidate');

      // 2. Fetch admissions
      const { data: dbAdmissions } = await supabase
        .from('admissions')
        .select('*');

      let combined = [...DEFAULT_CANDIDATES];

      // Insert logged in user at top if available
      if (profile && profile.role === 'candidate') {
        const currentUserObj = {
          id: profile.id,
          full_name: profile.full_name || 'My Profile',
          email: profile.email || user?.email || '',
          phone: profile.phone || '',
          course_name: profile.course_name || 'Cambridge Candidate Program',
          profile_photo_url: profile.profile_photo_url || null,
          service_delivery_step: profile.service_delivery_step !== undefined && profile.service_delivery_step !== null ? Number(profile.service_delivery_step) : 9,
          enrolled_date: 'Current Session',
          is_current_user: true
        };
        combined = [currentUserObj, ...combined.filter(c => c.email !== currentUserObj.email)];
      }

      // Merge real database profiles
      if (dbProfiles && dbProfiles.length > 0) {
        dbProfiles.forEach(p => {
          if (!combined.some(c => c.id === p.id || c.email === p.email)) {
            combined.push({
              id: p.id,
              full_name: p.full_name || 'Candidate',
              email: p.email,
              phone: p.phone,
              course_name: p.course_name || 'Enrolled Candidate',
              profile_photo_url: p.profile_photo_url,
              service_delivery_step: p.service_delivery_step !== undefined && p.service_delivery_step !== null ? Number(p.service_delivery_step) : 9,
              enrolled_date: p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Verified'
            });
          }
        });
      }

      // Merge admissions
      if (dbAdmissions && dbAdmissions.length > 0) {
        dbAdmissions.forEach(a => {
          if (!combined.some(c => c.email === a.email)) {
            combined.push({
              id: a.id,
              full_name: a.full_name,
              email: a.email,
              phone: a.phone,
              course_name: a.course_name || 'Admission Enrolled',
              profile_photo_url: a.profile_photo_url,
              service_delivery_step: 9,
              enrolled_date: a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'
            });
          }
        });
      }

      setUsersList(combined);
    } catch (err) {
      console.error('Error loading users:', err);
      setUsersList(DEFAULT_CANDIDATES);
    } finally {
      setLoading(false);
    }
  };

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return 'BS';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        (u.full_name || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.phone || '').includes(term) ||
        (u.course_name || '').toLowerCase().includes(term);

      const step = u.service_delivery_step ?? 9;
      const isCompleted = step >= 9;

      if (statusFilter === 'completed') return matchesSearch && isCompleted;
      if (statusFilter === 'in_progress') return matchesSearch && !isCompleted;
      return matchesSearch;
    });
  }, [usersList, searchTerm, statusFilter]);

  // Open User Detail View
  const handleSelectUser = (candidate) => {
    setSelectedUser(candidate);
    setViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quick switch between users in detail view
  const handlePreviousUser = () => {
    if (!selectedUser) return;
    const currentIndex = filteredUsers.findIndex(u => u.id === selectedUser.id);
    if (currentIndex > 0) {
      setSelectedUser(filteredUsers[currentIndex - 1]);
    } else {
      setSelectedUser(filteredUsers[filteredUsers.length - 1]);
    }
  };

  const handleNextUser = () => {
    if (!selectedUser) return;
    const currentIndex = filteredUsers.findIndex(u => u.id === selectedUser.id);
    if (currentIndex < filteredUsers.length - 1) {
      setSelectedUser(filteredUsers[currentIndex + 1]);
    } else {
      setSelectedUser(filteredUsers[0]);
    }
  };

  // Step updater for the active candidate (Clickable tracking!)
  const handleUpdateCurrentStep = async (newStep) => {
    if (!selectedUser) return;
    const clampedStep = Math.max(1, Math.min(9, newStep));
    const updated = { ...selectedUser, service_delivery_step: clampedStep };
    setSelectedUser(updated);
    setUsersList(prev => prev.map(u => u.id === selectedUser.id ? updated : u));

    // Persist to Supabase if valid UUID
    try {
      if (selectedUser.id && !selectedUser.id.startsWith('demo-')) {
        await supabase
          .from('profiles')
          .update({ service_delivery_step: clampedStep })
          .eq('id', selectedUser.id);
      }
    } catch (e) {
      console.warn('Database sync skipped for mock user');
    }
  };

  const activeStep = selectedUser?.service_delivery_step ?? 9;
  const isSelectedCompleted = activeStep >= 9;

  return (
    <div className="min-h-screen pb-24 bg-slate-50 relative overflow-hidden font-inter selection:bg-primary-500/30">
      {/* Background Lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bubble w-[34rem] h-[34rem] top-[-10%] left-[-5%]" style={{ animation: 'bubble-drift-right 60s infinite linear' }}>
          <div className="bubble-glow bg-blue-400/10" />
        </div>
        <div className="bubble w-[30rem] h-[30rem] bottom-[-10%] right-[-5%]" style={{ animation: 'bubble-drift-left 50s infinite linear' }}>
          <div className="bubble-glow bg-emerald-400/10" />
        </div>
      </div>

      <div className="relative z-10">
        <DisclaimerOverlay user={user} profile={profile} />

        {/* Top Floating Glass Navbar */}
        <CandidateNavbar activeTab="service_delivery" />

        <main className="pt-36 sm:pt-40 px-4 sm:px-8 max-w-7xl mx-auto">
          
          <AnimatePresence mode="wait">
            
            {/* ========================================================================= */}
            {/* 1. DIRECTORY VIEW: USER CARDS GRID & SEARCH CONTROLS                      */}
            {/* ========================================================================= */}
            {viewMode === 'directory' && (
              <motion.div
                key="directory"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                {/* Header Title & Summary */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-black uppercase tracking-wider mb-1">
                      <Users className="w-3.5 h-3.5" /> Candidate Directory
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-outfit font-black text-slate-900 tracking-tight">
                      Service Delivery Portal
                    </h1>
                    <p className="text-sm font-medium text-slate-500">
                      Select any candidate card below to view their live 9-stage service delivery timeline.
                    </p>
                  </div>

                  {/* Quick Stat Badges */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</span>
                      <span className="text-xl font-black text-slate-900 font-outfit">{usersList.length}</span>
                    </div>
                    <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center gap-3">
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
                      <span className="text-xl font-black text-emerald-700 font-outfit">
                        {usersList.filter(u => (u.service_delivery_step ?? 9) >= 9).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-[2rem] border border-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                  
                  {/* Search Input Box */}
                  <div className="relative w-full md:w-[420px]">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search candidates by name, email, or phone..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        statusFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-md scale-[1.02]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({usersList.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('completed')}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        statusFilter === 'completed'
                          ? 'bg-emerald-600 text-white shadow-md scale-[1.02]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Completed ({usersList.filter(u => (u.service_delivery_step ?? 9) >= 9).length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('in_progress')}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        statusFilter === 'in_progress'
                          ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      In Progress ({usersList.filter(u => (u.service_delivery_step ?? 9) < 9).length})
                    </button>
                  </div>
                </div>

                {/* Candidate Cards Grid */}
                {filteredUsers.length === 0 ? (
                  <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-16 text-center border border-slate-200/60 shadow-inner">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-slate-800">No Candidates Found</h3>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or filter tags.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((candidate, idx) => {
                      const step = candidate.service_delivery_step ?? 9;
                      const isComplete = step >= 9;
                      const stepObj = SERVICE_DELIVERY_STEPS.find(s => s.id === step) || SERVICE_DELIVERY_STEPS[8];

                      return (
                        <motion.div
                          key={candidate.id || idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          onClick={() => handleSelectUser(candidate)}
                          className="glass-card-saas p-6 sm:p-7 rounded-[2.5rem] bg-white/70 hover:bg-white border border-white/90 hover:border-blue-200 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.12)] transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Top: Photo, Verification & Status */}
                            <div className="flex items-start justify-between gap-4 mb-5">
                              <div className="relative">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                  {candidate.profile_photo_url ? (
                                    <img 
                                      src={candidate.profile_photo_url} 
                                      alt={candidate.full_name} 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-slate-200/90 flex items-center justify-center text-slate-600 font-black text-xl">
                                      {getInitials(candidate.full_name)}
                                    </div>
                                  )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                                  <Check className="w-3 h-3 text-white stroke-[3]" />
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                                isComplete 
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                  : 'bg-blue-50 text-blue-600 border border-blue-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
                                {isComplete ? 'Completed' : `Step ${step}/9`}
                              </div>
                            </div>

                            {/* Candidate Info */}
                            <div className="space-y-1 mb-6">
                              <h3 className="text-lg font-outfit font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors line-clamp-1">
                                {candidate.full_name}
                              </h3>
                              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 truncate">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {candidate.email}
                              </p>
                              {candidate.course_name && (
                                <p className="text-[11px] font-bold text-slate-600 pt-1 flex items-center gap-1.5 line-clamp-1">
                                  <BookOpen className="w-3 h-3 text-primary-500 shrink-0" /> {candidate.course_name}
                                </p>
                              )}
                            </div>

                            {/* Milestone Tracker Bar on Card */}
                            <div className="space-y-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-100 mb-6">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-500 truncate max-w-[170px]">
                                  {stepObj.shortDesc}
                                </span>
                                <span className="font-black text-slate-900 font-outfit">
                                  {Math.round((step / 9) * 100)}%
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isComplete ? 'bg-emerald-500' : 'bg-blue-600'
                                  }`} 
                                  style={{ width: `${(step / 9) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => handleSelectUser(candidate)}
                            className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white hover:bg-blue-600 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md group-hover:shadow-blue-500/20"
                          >
                            <span>View Service Delivery</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* 2. DETAIL VIEW: EXACT SCREENSHOT REPLICATION (9 CLICKABLE STEPS)          */}
            {/* ========================================================================= */}
            {viewMode === 'detail' && selectedUser && (
              <motion.div
                key="detail"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                {/* Back Button & User Switcher Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <button
                    onClick={() => setViewMode('directory')}
                    className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 font-black uppercase text-xs tracking-wider shadow-sm border border-slate-200/80 transition-all group"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    BACK TO CANDIDATE CARDS
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePreviousUser}
                      className="px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-sm border border-slate-200 transition-all flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev Candidate
                    </button>
                    <button
                      onClick={handleNextUser}
                      className="px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-sm border border-slate-200 transition-all flex items-center gap-1"
                    >
                      Next Candidate <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* EXACT SCREENSHOT VIEW CONTAINER */}
                <div className="relative bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)] space-y-10 overflow-hidden">
                  
                  {/* Top Candidate & Header Row */}
                  <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    
                    {/* Left: User Avatar & Info */}
                    <div className="flex items-center gap-4 sm:gap-5">
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-slate-200/70 border border-slate-300/40 ring-4 ring-purple-100/60 shadow-sm flex items-center justify-center">
                          {selectedUser.profile_photo_url ? (
                            <img 
                              src={selectedUser.profile_photo_url} 
                              alt={selectedUser.full_name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-2xl tracking-wide">
                              {getInitials(selectedUser.full_name)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                          {selectedUser.full_name}
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-slate-400 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedUser.email}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Service Delivery Title */}
                    <div className="text-center lg:px-4">
                      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                        Service Delivery
                      </h1>
                    </div>

                    {/* Right: Status Pill Badge */}
                    <div className="flex items-center">
                      <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm transition-all duration-300 ${
                        isSelectedCompleted 
                          ? 'bg-emerald-50/50 border-emerald-300/70' 
                          : 'bg-blue-50/50 border-blue-300/70'
                      }`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">STATUS</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            isSelectedCompleted 
                              ? 'bg-emerald-500' 
                              : 'bg-blue-500 animate-pulse'
                          }`} />
                          <span className={`text-xs font-bold tracking-wide whitespace-nowrap ${
                            isSelectedCompleted ? 'text-emerald-700' : 'text-blue-700'
                          }`}>
                            {isSelectedCompleted ? 'Service Delivery Completed' : `In Progress • Step ${activeStep} of 9`}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* 9-STEP HORIZONTAL PROGRESS STEPPER (EXACT SCREENSHOT FIDELITY & CLICKABLE) */}
                  <div className="relative z-10 pt-4">
                    <div className="relative pb-4 overflow-x-auto no-scrollbar">
                      
                      {/* Stepper Container */}
                      <div className="min-w-[860px] relative py-4 px-2">
                        
                        {/* Continuous Horizontal Gradient Track Line */}
                        <div className="absolute top-[51px] left-[5.55%] right-[5.55%] h-[3px] bg-slate-200/90 rounded-full -z-0">
                          {/* Active Completed Gradient Bar: Purple/Indigo -> Cyan/Teal/Emerald */}
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${Math.max(0, Math.min(100, ((activeStep - 1) / 8) * 100))}%` }}
                          />
                        </div>

                        {/* 9 Milestones Grid */}
                        <div className="grid grid-cols-9 relative z-10">
                          {SERVICE_DELIVERY_STEPS.map((step) => {
                            const isCompleted = step.id <= activeStep;
                            const isCurrent = step.id === activeStep;

                            return (
                              <div 
                                key={step.id} 
                                onClick={() => handleUpdateCurrentStep(step.id)}
                                className="flex flex-col items-center group cursor-pointer relative z-10 transition-transform duration-200 hover:-translate-y-1"
                                title={`Click to set completed up to Step ${step.id}: ${step.title}`}
                              >
                                {/* Top Number Badge Circle */}
                                <div className={`w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center text-xs font-black transition-all duration-300 shadow-sm ${
                                  isCompleted 
                                    ? 'bg-white border-emerald-500 text-emerald-600 group-hover:scale-110 group-hover:border-emerald-600' 
                                    : 'bg-white border-slate-300 text-slate-400 group-hover:border-slate-400'
                                }`}>
                                  {step.id}
                                </div>

                                {/* Vertical Stem Connector */}
                                <div className={`w-[2px] h-3 transition-colors duration-300 ${
                                  isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                                }`} />

                                {/* Checkmark / State Orb Node on Track */}
                                <div className="relative my-0">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    isCompleted 
                                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 group-hover:scale-115' 
                                      : 'bg-white border-2 border-slate-300 text-slate-300 group-hover:border-slate-400'
                                  } ${isCurrent && !isSelectedCompleted ? 'ring-4 ring-blue-400/20' : ''}`}>
                                    {isCompleted ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3] text-white drop-shadow-sm" />
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    )}
                                  </div>
                                </div>

                                {/* Step Label Text Underneath Node */}
                                <div className="mt-2.5 text-center px-1">
                                  <p className={`text-[11px] font-bold leading-tight max-w-[96px] mx-auto transition-colors duration-200 ${
                                    isCompleted ? 'text-slate-800 group-hover:text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'
                                  }`}>
                                    {step.title}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

            </motion.div>
          )}

          </AnimatePresence>

        </main>
      </div>
    </div>
  );
};

export default ServiceDelivery;

