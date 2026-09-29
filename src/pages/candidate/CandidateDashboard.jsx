import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  Search, 
  History, 
  ArrowRight,
  LogOut,
  User,
  Lock,
  Edit2,
  FileText,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { useAlert } from '../../context/AlertProvider';
import DisclaimerOverlay from '../../components/DisclaimerOverlay';
import PMISLogo from '../../components/common/PMISLogo';
import CandidateNavbar from '../../components/layout/CandidateNavbar';

const CandidateDashboard = () => {
  const { user, profile, logout } = useAuth();
  const { showAlert, confirm } = useAlert();
  const navigate = useNavigate();
  
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.id) fetchDashboardData();

    const profileChannel = supabase
      .channel(`profile_sync_${user?.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user?.id}` }, () => fetchDashboardData())
      .subscribe();

    const submissionChannel = supabase
      .channel(`submission_sync_${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions', filter: `user_id=eq.${user?.id}` }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(submissionChannel);
    };
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      const { data: profileData } = await supabase.from('profiles').select('allotted_exam_ids').eq('id', user.id).single();
      
      const [examsRes, submissionsRes] = await Promise.all([
        supabase.from('exams').select('*'),
        supabase.from('submissions').select('*').eq('user_id', user.id).order('submitted_at', { ascending: false })
      ]);
      
      setExams(examsRes.data || []);
      setSubmissions(submissionsRes.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to end your session?',
      confirmText: 'Sign Out',
      type: 'danger',
      onConfirm: async () => {
        await logout();
        showAlert('Logged out successfully', 'success');
        navigate('/login');
      }
    });
  };

  const allottedExams = exams.filter(e => {
    const allottedIds = Array.isArray(profile?.allotted_exam_ids) ? profile.allotted_exam_ids : [];
    const isAllotted = allottedIds.includes(e.id);
    const isNotSubmitted = !submissions.find(s => s.exam_id === e.id);
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
    return isAllotted && isNotSubmitted && matchesSearch;
  });

  const archivedSubmissions = submissions.map(sub => ({
    ...sub,
    exam: exams.find(e => e.id === sub.exam_id)
  }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Initialising Cambridge Portal...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 bg-slate-50 relative overflow-hidden font-inter selection:bg-primary-500/20">
      {/* Dynamic Cambridge Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bubble w-[30rem] h-[30rem] top-[-10%] left-[-10%]" style={{ animation: 'bubble-drift-right 60s infinite linear' }}>
          <div className="bubble-glow bg-emerald-600/10" />
        </div>
        <div className="bubble w-[25rem] h-[25rem] bottom-[-10%] right-[-10%]" style={{ animation: 'bubble-drift-left 50s infinite linear' }}>
          <div className="bubble-glow bg-secondary-500/10" />
        </div>
        <div className="bubble w-[20rem] h-[20rem] top-[20%] right-[10%]" style={{ animation: 'bubble-drift-left 55s infinite linear', animationDelay: '-12s' }}>
          <div className="bubble-glow bg-primary-600/10" />
        </div>
      </div>

      <div className="relative z-10">
        <DisclaimerOverlay user={user} profile={profile} />

        {/* Premium Floating Glass Navbar */}
        <CandidateNavbar activeTab="exams" />

        <main className="pt-40 px-6 max-w-6xl mx-auto space-y-16">
          {/* Hero Header Section */}
          <header className="flex flex-col md:flex-row items-center justify-between gap-8 relative">
            <div className="space-y-3 z-10 flex-1">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 bg-white/60 backdrop-blur-md border border-white/80 px-4 py-2 rounded-full shadow-sm w-fit">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Verified Profile</span>
                </div>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-outfit font-black text-slate-900 tracking-tighter leading-none whitespace-nowrap">
                My Assessments
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-slate-500 font-medium text-base flex items-center gap-2">
                Welcome back, <span className="text-primary-600 font-bold bg-primary-50 px-3 py-1 rounded-lg border border-primary-100/50">{profile?.full_name?.split(' ')[0] || 'Candidate'}</span>
              </motion.p>
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="relative w-full md:w-[340px] z-10 group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-secondary-400 rounded-2xl blur opacity-20 group-hover:opacity-35 transition-opacity duration-500" />
              <div className="relative bg-white/85 backdrop-blur-xl border border-white rounded-2xl shadow-lg p-2 flex items-center ring-1 ring-slate-100">
                <div className="pl-4 pr-3 text-slate-400 group-focus-within:text-primary-600 transition-colors">
                  <Search className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search exams by name..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full bg-transparent py-3 pr-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:outline-none" 
                />
              </div>
            </motion.div>
          </header>

          {/* Available Exams Section */}
          <section className="space-y-8 z-10 relative">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-600/30">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-outfit font-black text-slate-900 tracking-tight">Available Exams</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allottedExams.length > 0 ? allottedExams.map((exam, index) => (
                <motion.div 
                  key={exam.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.1 * index }}
                  className="glass-card-saas p-8 flex flex-col justify-between group h-full bg-white/60 hover:bg-white"
                >
                  <div>
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary-600 shadow-md border border-slate-100 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                        <Edit2 className="w-6 h-6" />
                      </div>
                      <div className="bg-secondary-50 border border-secondary-200/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-secondary-600" />
                        <span className="text-[10px] font-black text-secondary-700 uppercase tracking-widest">{exam.duration} Min</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-outfit font-black text-slate-900 mb-4 leading-tight tracking-tight group-hover:text-primary-700 transition-colors uppercase line-clamp-2">{exam.title}</h3>
                    <p className="text-slate-500 text-sm font-medium mb-8 line-clamp-2">{exam.description || 'Standard examination module. Ensure stable connection before starting.'}</p>
                  </div>

                  <button 
                    onClick={() => navigate(`/exam/${exam.id}`)}
                    className="w-full btn-premium !py-4 !rounded-xl !text-sm tracking-[0.2em] uppercase"
                  >
                    Start Exam <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )) : (
                <div className="col-span-full py-24 bg-white/40 backdrop-blur-sm border-2 border-dashed border-slate-200/60 rounded-[3rem] text-center shadow-inner">
                  <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-100">
                    <ShieldAlert className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2 font-outfit">No pending exams</h3>
                  <p className="text-slate-500 font-semibold text-sm uppercase tracking-[0.1em]">Check back later or contact your instructor.</p>
                </div>
              )}
            </div>
          </section>

          {/* Assessment History Section */}
          {archivedSubmissions.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-8 pt-8 z-10 relative">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                  <History className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-outfit font-black text-slate-900 tracking-tight">Assessment History</h2>
              </div>
              
              <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Examination</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Action Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                      {archivedSubmissions.map(sub => {
                        const marksPerQ = sub.marks_per_question || sub.exam?.marks_per_question || 5;
                        
                        let displayScore = sub.calculated_score;
                        let displayTotal = sub.calculated_total;
                        
                        if (displayScore === null || displayScore === undefined) {
                          displayScore = sub.score * marksPerQ;
                        }
                        if (displayTotal === null || displayTotal === undefined) {
                          displayTotal = sub.total_questions * marksPerQ;
                        }

                        if (sub.final_score_override !== null && sub.final_score_override !== undefined) {
                          displayScore = sub.final_score_override;
                        } else if (sub.admin_score_override !== null && sub.admin_score_override !== undefined) {
                          displayScore = sub.admin_score_override * marksPerQ;
                        }

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="font-black text-slate-800 text-base uppercase group-hover:text-primary-600 transition-colors tracking-tight">{sub.exam?.title || 'Unknown Exam'}</div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                {sub.is_released ? (
                                  <div className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg shadow-slate-900/10">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</span>
                                    <span className="text-xl font-outfit font-black leading-none">
                                      {displayScore} <span className="text-slate-500 font-medium text-sm mx-0.5">/</span> <span className="text-sm">{displayTotal}</span>
                                    </span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Awaiting Review
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.section>
          )}
        </main>
      </div>
    </div>
  );
};

export default CandidateDashboard;
