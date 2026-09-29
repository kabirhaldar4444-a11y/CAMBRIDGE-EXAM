import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  BookOpen, 
  ArrowLeft,
  ShieldCheck,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  BarChart3
} from 'lucide-react';
import CandidateNavbar from '../../components/layout/CandidateNavbar';

const Profile = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchProfileExamData();

      const subChannel = supabase
        .channel(`profile_submissions_${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'submissions', 
          filter: `user_id=eq.${user.id}` 
        }, () => fetchProfileExamData())
        .subscribe();

      const profileChannel = supabase
        .channel(`profile_updates_${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, () => fetchProfileExamData())
        .subscribe();

      return () => {
        supabase.removeChannel(subChannel);
        supabase.removeChannel(profileChannel);
      };
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchProfileExamData = async () => {
    try {
      const [examsRes, submissionsRes] = await Promise.all([
        supabase.from('exams').select('*'),
        supabase.from('submissions').select('*').eq('user_id', user.id).order('submitted_at', { ascending: false })
      ]);
      setExams(examsRes.data || []);
      setSubmissions(submissionsRes.data || []);
    } catch (err) {
      console.error('Error loading profile exam data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreDetails = (sub, exam) => {
    const marksPerQ = sub.marks_per_question || exam?.marks_per_question || 5;
    
    let displayScore = sub.calculated_score;
    let displayTotal = sub.calculated_total;

    if (displayScore === null || displayScore === undefined) {
      displayScore = (sub.score || 0) * marksPerQ;
    }
    if (displayTotal === null || displayTotal === undefined) {
      displayTotal = (sub.total_questions || 0) * marksPerQ;
    }

    if (sub.final_score_override !== null && sub.final_score_override !== undefined) {
      displayScore = sub.final_score_override;
    } else if (sub.admin_score_override !== null && sub.admin_score_override !== undefined) {
      displayScore = sub.admin_score_override * marksPerQ;
    }

    const percentage = displayTotal > 0 ? Math.round((displayScore / displayTotal) * 100) : 0;

    return {
      displayScore,
      displayTotal,
      percentage,
      marksPerQ,
      totalQuestions: sub.total_questions || 0,
      isReleased: sub.is_released
    };
  };

  const allottedExamIds = Array.isArray(profile?.allotted_exam_ids) ? profile.allotted_exam_ids : [];
  const allottedExams = exams.filter(e => allottedExamIds.includes(e.id));

  const completedSubmissions = submissions.map(sub => ({
    ...sub,
    exam: exams.find(e => e.id === sub.exam_id)
  }));

  const pendingExams = allottedExams.filter(e => !submissions.some(s => s.exam_id === e.id));

  // Determine primary exam name to display in overview card
  const primaryExamTitle = allottedExams.length > 0 
    ? allottedExams.map(e => e.title).join(', ')
    : completedSubmissions.length > 0 
      ? completedSubmissions[0]?.exam?.title || 'Standard Assessment'
      : 'Cambridge Certification Exam';

  return (
    <div className="min-h-screen bg-slate-50/50 pb-8 pt-24 sm:pt-28 px-4 sm:px-6 font-inter">
      <CandidateNavbar activeTab="profile" />
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-[0_15px_45px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden"
        >
          {/* Header Section - Compact */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-5 sm:px-8 sm:py-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl translate-y-1/2" />
            
            <div className="flex items-center gap-4 sm:gap-6 relative z-10">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg relative shrink-0">
                {profile?.profile_photo_url ? (
                  <img src={profile.profile_photo_url} className="w-full h-full object-cover rounded-2xl" alt="Profile" />
                ) : (
                  <User className="w-7 h-7 text-white" />
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <div className="space-y-1 min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-outfit font-black tracking-tight truncate">{profile?.full_name || 'Candidate Profile'}</h1>
                <div className="flex items-center gap-1 text-white/70 text-[10px] font-medium mb-0.5">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{profile?.email || user?.email || 'Not provided'}</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-md border border-white/10">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/90">Verified Candidate</span>
                  </div>
                  {completedSubmissions.length > 0 && (
                    <div className="flex items-center gap-1 bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-400/30 text-blue-200">
                      <Sparkles className="w-2.5 h-2.5 text-blue-300" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{completedSubmissions.length} Exam Completed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details & Examinations Grid - Compact */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Academic Examination & Marks Record Section - Compact */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center border border-primary-100">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-outfit font-black text-slate-900 tracking-tight leading-none">Examinations & Marks</h2>
                    <span className="text-[9px] text-slate-400 font-medium">Official academic scores and test performance</span>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-slate-200">
                  {completedSubmissions.length} Assessed • {pendingExams.length} Pending
                </span>
              </div>

              {loading ? (
                <div className="p-6 bg-slate-50/70 border border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading records...</span>
                </div>
              ) : completedSubmissions.length === 0 && pendingExams.length === 0 ? (
                <div className="p-6 bg-slate-50/70 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-1.5">
                  <BookOpen className="w-6 h-6 text-slate-300 mx-auto" />
                  <h3 className="text-xs font-bold text-slate-700 font-outfit">No examinations assigned yet</h3>
                  <p className="text-[10px] text-slate-400 max-w-sm mx-auto">Assessments will appear once allotted by administrator.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Completed Exam Submissions - Compact single-row cards */}
                  {completedSubmissions.map((sub, index) => {
                    const score = getScoreDetails(sub, sub.exam);

                    return (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white border border-slate-100 rounded-xl px-3.5 py-3 shadow-xs flex items-center gap-3 group hover:border-slate-200 hover:shadow-sm transition-all"
                      >
                        {/* Left: Icon */}
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                          <Award className="w-3.5 h-3.5" />
                        </div>

                        {/* Center: Exam Name */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-outfit font-black text-slate-900 uppercase tracking-tight truncate leading-tight">
                            {sub.exam?.title || 'Examination Module'}
                          </h3>
                          <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {sub.exam?.duration || 60} Min
                          </span>
                        </div>

                        {/* Score progress bar - inline thin bar */}
                        {score.isReleased && (
                          <div className="hidden sm:flex flex-col gap-1 w-20 shrink-0">
                            <div className="w-full bg-slate-200/80 rounded-full h-1 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, Math.max(0, score.percentage))}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                  score.percentage >= 75 ? 'bg-emerald-500' :
                                  score.percentage >= 50 ? 'bg-primary-500' :
                                  'bg-amber-500'
                                }`}
                              />
                            </div>
                            <span className="text-[8px] font-bold text-slate-400 text-right">{score.displayScore}/{score.displayTotal}</span>
                          </div>
                        )}

                        {/* Right: Score % or status */}
                        <div className="shrink-0">
                          {score.isReleased ? (
                            <div className="text-right">
                              <span className={`block text-base font-outfit font-black leading-none ${
                                score.percentage >= 75 ? 'text-emerald-600' :
                                score.percentage >= 50 ? 'text-primary-600' :
                                'text-amber-600'
                              }`}>{score.percentage}%</span>
                              <div className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider border border-emerald-100 mt-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border border-amber-100">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Pending
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Pending Allotted Exams */}
                  {pendingExams.map(exam => (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase tracking-wider border border-blue-100">
                              Allotted
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">• {exam.duration} Min</span>
                          </div>
                          <h3 className="text-xs font-outfit font-black text-slate-900 uppercase tracking-tight">
                            {exam.title}
                          </h3>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/exam/${exam.id}`)}
                        className="btn-premium !py-2 !px-4 !rounded-lg !text-[9px] tracking-wider uppercase flex items-center gap-1.5 shrink-0"
                      >
                        Start <ArrowRight className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;

