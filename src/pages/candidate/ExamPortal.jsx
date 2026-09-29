import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  Layout, 
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Bookmark,
  Check
} from 'lucide-react';
import { useAlert } from '../../context/AlertProvider';
import PMISLogo from '../../components/common/PMISLogo';

const ExamPortal = () => {
  const { id: examId } = useParams();
  const { user } = useAuth();
  const { showAlert, confirm } = useAlert();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [hasAcceptedDeclaration, setHasAcceptedDeclaration] = useState(false);
  const [acceptedCheckbox, setAcceptedCheckbox] = useState(false);
  const [reviewed, setReviewed] = useState({});

  // Refs for persistence to avoid dependency loops in interval
  const answersRef = useRef({});
  const indexRef = useRef(0);
  const timeRef = useRef(null);
  const reviewedRef = useRef({});

  // 1. Initial Load
  useEffect(() => {
    const initExam = async () => {
      try {
        const { data: examData } = await supabase.from('exams').select('*').eq('id', examId).single();
        const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', examId);
        
        if (!examData) throw new Error('Exam not found');
        setExam(examData);
        setQuestions(qData || []);
        
        // Load local progress
        const saved = localStorage.getItem(`exam_sync_${examId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAnswers(parsed.answers || {});
          setCurrentIdx(parsed.index || 0);
          setTimeLeft(parsed.timeLeft !== undefined ? parsed.timeLeft : examData.duration * 60);
          setReviewed(parsed.reviewed || {});
          
          answersRef.current = parsed.answers || {};
          indexRef.current = parsed.index || 0;
          timeRef.current = parsed.timeLeft !== undefined ? parsed.timeLeft : examData.duration * 60;
          reviewedRef.current = parsed.reviewed || {};
        } else {
          const initialTime = examData.duration * 60;
          setTimeLeft(initialTime);
          timeRef.current = initialTime;
        }
      } catch (err) {
        showAlert(err.message, 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    initExam();
  }, [examId]);

  // 2. Strict 1-Second Persistence Interval
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (timeLeft !== null && timeLeft > 0 && !submitting && hasAcceptedDeclaration) {
        // Decrease timer
        setTimeLeft(prev => {
          const next = prev - 1;
          timeRef.current = next;
          return next;
        });

        // Sync to LocalStorage
        const stateToSave = {
          answers: answersRef.current,
          index: indexRef.current,
          timeLeft: timeRef.current,
          reviewed: reviewedRef.current
        };
        localStorage.setItem(`exam_sync_${examId}`, JSON.stringify(stateToSave));
      }

      if (timeLeft === 0 && !submitting && hasAcceptedDeclaration) {
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [examId, timeLeft, submitting, hasAcceptedDeclaration]);

  // Sync state to refs whenever state changes (for the interval to use)
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { indexRef.current = currentIdx; }, [currentIdx]);
  useEffect(() => { reviewedRef.current = reviewed; }, [reviewed]);

  const handleAnswer = (optionIdx) => {
    setAnswers(prev => ({ ...prev, [currentIdx]: optionIdx }));
  };

  const toggleReview = () => {
    setReviewed(prev => ({ ...prev, [currentIdx]: !prev[currentIdx] }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correct_option) score++;
    });
    return score;
  };

  const handleSubmit = async (isAuto = false) => {
    if (!isAuto) {
      return confirm({
        title: 'Submit Examination?',
        message: 'Are you sure you want to finish the exam? This action cannot be undone.',
        confirmText: 'Submit Now',
        type: 'info',
        onConfirm: processSubmit
      });
    }
    processSubmit();
  };

  const processSubmit = async () => {
    setSubmitting(true);
    try {
      const finalScore = calculateScore();
      const marksPerQ = exam?.marks_per_question ?? 5;
      const { error } = await supabase.from('submissions').insert({
        user_id: user.id,
        exam_id: examId,
        score: finalScore,
        total_questions: questions.length,
        answers: answersRef.current,
        is_released: false,
        submitted_at: new Date().toISOString(),
        marks_per_question: marksPerQ,
        calculated_score: finalScore * marksPerQ,
        calculated_total: questions.length * marksPerQ,
        question_marks: {}
      });

      if (error) throw error;

      showAlert('Exam submitted successfully!', 'success');
      localStorage.removeItem(`exam_sync_${examId}`);
      navigate('/');
    } catch (err) {
      showAlert(err.message, 'error');
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = useCallback(() => {
    showAlert('Time is up! Submitting automatically...', 'warning');
    processSubmit();
  }, []);

  const formatTime = (seconds) => {
    if (seconds === null) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="flex items-center justify-center bg-slate-50 py-20">

      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Synchronizing Exam Data...</p>
      </div>
    </div>
  );

  const currentQuestion = questions[currentIdx];
  const progressPercent = questions.length > 0 ? ((Object.keys(answers).length) / questions.length) * 100 : 0;

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center bg-slate-50 py-20">

        <div className="glass-panel p-10 text-center max-w-md space-y-6">

          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">No Questions Found</h2>
          <p className="text-slate-500 text-sm">This examination does not have any questions assigned to it yet. Please contact your administrator.</p>
          <button onClick={() => navigate('/')} className="btn-premium w-full">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!hasAcceptedDeclaration) {
    return (
      <div className="bg-[#f8fafc] flex items-center justify-center p-6 selection:bg-primary-500/10">

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-3xl border border-white w-full max-w-3xl rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col relative"
        >
          {/* Header Strip */}
          <div className="bg-gradient-to-r from-primary-600 to-indigo-600 px-12 py-10 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-outfit font-black tracking-tight">{exam?.title}</h2>
                <p className="text-white/70 text-sm font-bold uppercase tracking-widest mt-1">Examination Declaration</p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-10 space-y-8">

            {/* Exam Format Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <SummaryItem icon={<Layout className="w-4 h-4" />} label="Questions" value={`${questions.length} Total`} />
               <SummaryItem icon={<CheckCircle className="w-4 h-4" />} label="Marks" value={`${questions.length * (exam?.marks_per_question ?? 5)} (${exam?.marks_per_question ?? 5}/ea)`} />
               <SummaryItem icon={<Clock className="w-4 h-4" />} label="Duration" value={`${exam?.duration} Mins`} />
               <SummaryItem icon={<AlertTriangle className="w-4 h-4" />} label="Negative" value="None" />
            </div>

            {/* Declaration Text Container */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8 space-y-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500">Conduct & behavior rules</h4>
                <p className="text-slate-600 font-medium leading-relaxed text-[15px]">
                  <span className="text-slate-900 font-bold block mb-2">Zero Tolerance Policy</span>
                  Use of unfair means, including external aids, mobile phones, or unauthorized browser switching, is strictly prohibited. Your session is being monitored through advanced automated proctoring logic.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-8 pt-4 border-t border-slate-200/50">
                <div className="space-y-2">
                   <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Integrity Policy</h5>
                   <p className="text-sm font-bold text-slate-800">Any suspicious activity will result in immediate disqualification.</p>
                </div>
                <div className="space-y-2 text-right">
                   <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Behavioral Integrity</h5>
                   <p className="text-sm font-bold text-slate-800">Avoid lip-syncing or leaving camera view.</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-4">
               <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={acceptedCheckbox}
                      onChange={() => setAcceptedCheckbox(!acceptedCheckbox)}
                    />
                    <div className="w-7 h-7 border-2 border-slate-200 rounded-xl group-hover:border-primary-500 transition-all peer-checked:bg-primary-500 peer-checked:border-primary-500" />
                    <CheckCircle className="absolute inset-0 w-7 h-7 text-white scale-0 peer-checked:scale-75 transition-transform" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">I have read and agree to follow all instructions & rules.</span>
               </label>

               <AnimatePresence>
                 {acceptedCheckbox && (
                    <motion.button 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      onClick={() => setHasAcceptedDeclaration(true)}
                      className="w-full btn-premium !py-5 !rounded-2xl !text-base shadow-2xl shadow-primary-500/20"
                    >
                      Start Examination <ArrowRight className="w-5 h-5" />
                    </motion.button>
                 )}
               </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden select-none page-transition font-outfit relative">
      {/* Cambridge Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-secondary-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[15%] w-[20%] h-[20%] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Top Header */}
      <header className="absolute top-0 left-0 right-0 h-20 bg-white/70 backdrop-blur-2xl border-b border-white/80 px-6 lg:px-10 flex items-center justify-between z-50 shadow-[0_4px_30px_rgba(7,37,28,0.03)]">
        <div className="flex items-center gap-6">
          <div className="border border-white/80 rounded-xl px-3 py-1 bg-white/60 backdrop-blur-md shadow-sm">
            <PMISLogo variant="navbar" />
          </div>
          <div className="w-[1px] h-8 bg-slate-200/60 hidden md:block"></div>
          <div>
            <div className="text-[9px] font-black text-slate-400 tracking-[0.2em] uppercase">Live Assessment</div>
            <div className="text-base font-black text-slate-900 uppercase tracking-tight">{exam?.title || 'EXAM TITLE'}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-full text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-600/25 border border-primary-500/30 disabled:opacity-50"
          >
            {submitting ? 'Syncing...' : 'Submit Exam'} <Check className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md border border-white/80 px-4 py-2 rounded-full shadow-sm">
            <span className="text-[9px] font-black text-slate-400 tracking-[0.2em] uppercase mr-1">Time Left</span>
            <Clock className="w-4 h-4 text-slate-900" />
            <span className="text-lg font-black text-slate-900">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      <div className="flex w-full h-full pt-20">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col p-6 lg:p-8 overflow-hidden">
          <div className="max-w-4xl w-full mx-auto flex flex-col h-full">
            
            {/* Question Header & Progress */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question</span>
                <div className="bg-primary-900 text-white w-9 h-9 rounded-xl flex items-center justify-center font-black shadow-lg shadow-primary-900/20">
                  {currentIdx + 1}
                </div>
                <span className="text-xs font-bold text-slate-400">/ {questions.length}</span>
              </div>
              
              <div className="w-48 h-1.5 bg-slate-200 rounded-full flex items-center px-0.5">
                <div 
                  className="h-full bg-primary-600 rounded-full shadow-sm transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Scrollable Questions & Options Area */}
            <div className="flex-1 overflow-y-auto pr-4 pb-4 -mr-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {/* Question Text Area */}
              <div className="relative mb-8 pl-8 group">
                {/* Modern Accent Line */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary-700 via-primary-600 to-secondary-500 rounded-full shadow-sm"></div>
                
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-[1.3] tracking-tight">
                  {currentQuestion?.question_text}
                </h3>
              </div>

            {/* Options */}
            <div className="space-y-3 max-w-3xl ml-6">
              {currentQuestion?.options.map((option, idx) => {
                const isSelected = answers[currentIdx] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={`
                      w-full text-left p-3 md:p-4 rounded-2xl border transition-all duration-500 flex items-center gap-5 group relative overflow-hidden
                      ${isSelected 
                        ? 'border-primary-500/50 bg-primary-50/70 backdrop-blur-xl shadow-[0_15px_35px_rgba(13,74,56,0.1)] scale-[1.01]' 
                        : 'border-white/60 bg-white/40 backdrop-blur-sm hover:bg-white/70 hover:border-white/90 hover:shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:scale-[1.005] active:scale-[0.99]'}
                    `}
                  >
                    {/* Background Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <div className={`
                      w-10 h-10 rounded border flex items-center justify-center text-sm font-black transition-all duration-300 flex-shrink-0
                      ${isSelected ? 'bg-primary-900 border-primary-950 text-white shadow-md shadow-primary-900/20' : 'border-white/80 text-slate-400 bg-white/80 group-hover:border-slate-300'}
                    `}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={`text-base font-medium transition-colors duration-300 ${isSelected ? 'text-primary-950 font-semibold' : 'text-slate-600'}`}>
                      {option}
                    </span>
                  </button>
                );
              })}
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-between ml-6 pt-6 mt-4 flex-shrink-0 border-t border-slate-100/80">
              <div className="flex items-center gap-4">
                <button 
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx(prev => prev - 1)}
                  className="h-12 px-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest disabled:opacity-20 transition-all hover:bg-slate-50 rounded-full border border-transparent hover:border-slate-200 active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                
                <button 
                  onClick={toggleReview}
                  className={`
                    h-12 px-6 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all rounded-full border
                    ${reviewed[currentIdx] 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-[0_10px_20px_rgba(99,102,241,0.1)]' 
                      : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300'}
                    active:scale-95
                  `}
                >
                  <Bookmark className={`w-4 h-4 ${reviewed[currentIdx] ? 'fill-current' : ''}`} /> 
                  {reviewed[currentIdx] ? 'Marked for Review' : 'Mark for Review'}
                </button>
              </div>

              <button 
                onClick={() => {
                  if (currentIdx < questions.length - 1) setCurrentIdx(prev => prev + 1);
                  else showAlert('All questions attempted. Review your answers or submit.', 'info');
                }}
                className="h-12 px-10 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-slate-800 transition-all shadow-[0_15px_30px_rgba(15,23,42,0.2)] active:scale-95 group"
              >
                Next <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Map */}
        <aside className="w-[340px] bg-white/40 backdrop-blur-3xl border-l border-white/60 flex flex-col p-6 lg:p-8 shadow-[-10px_0_30px_rgba(0,0,0,0.03)] flex-shrink-0 z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex flex-col gap-1 items-center justify-center w-5 h-5 cursor-pointer">
              <span className="w-4 h-[2px] bg-slate-400 rounded-full"></span>
              <span className="w-4 h-[2px] bg-slate-400 rounded-full"></span>
              <span className="w-4 h-[2px] bg-slate-400 rounded-full"></span>
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Map</h3>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-auto overflow-y-auto pr-2 pb-4">
            {questions.map((_, idx) => {
              const isCurrent = currentIdx === idx;
              const isAnswered = answers[idx] !== undefined;
              const isReviewed = reviewed[idx];
              
              let shapeClass = "transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center font-bold text-xs";
              let style = {};
              
              if (isCurrent) {
                shapeClass += " bg-slate-900 text-white shadow-md shadow-slate-900/20 z-10";
                style = { 
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                };
              } else if (isReviewed) {
                shapeClass += " bg-indigo-500 text-white rounded-full shadow-sm";
              } else if (isAnswered) {
                shapeClass += " bg-emerald-500 text-white shadow-sm";
                style = { 
                  clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                };
              } else if (idx < currentIdx) {
                shapeClass += " bg-amber-500 text-white shadow-sm"; // Skipped
                style = { 
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                };
              } else {
                shapeClass += " bg-slate-50 border border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-white";
                style = { 
                  borderRadius: '6px',
                };
              }

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`aspect-square ${shapeClass}`}
                  style={style}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="space-y-4 pt-6 border-t border-slate-100 mt-4">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded border border-slate-200 bg-slate-50"></div>
                <span>Not Visited</span>
              </div>
              <span className="text-slate-900 font-bold">{questions.length - currentIdx - 1 > 0 ? questions.length - currentIdx - 1 : 0}</span>
            </div>
            
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-amber-500" style={{ 
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                }}></div>
                <span>Not Answered</span>
              </div>
              <span className="text-slate-900 font-bold">
                {questions.filter((_, i) => i < currentIdx && answers[i] === undefined).length}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-emerald-500" style={{ 
                  clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)'
                }}></div>
                <span>Answered</span>
              </div>
              <span className="text-slate-900 font-bold">{Object.keys(answers).length}</span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-indigo-500"></div>
                <span>Reviewed</span>
              </div>
              <span className="text-slate-900 font-bold">{Object.keys(reviewed).filter(k => reviewed[k]).length}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const SummaryItem = ({ icon, label, value }) => (
  <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary-500 shadow-sm border border-slate-100">
      {icon}
    </div>
    <div>
      <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-[11px] font-black text-slate-900">{value}</span>
    </div>
  </div>
);

const ArrowRight = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

export default ExamPortal;
