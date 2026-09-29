import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Eye, Edit2, Save, X, ArrowLeft, Loader2, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const getSubmissionScoreDetails = (sub) => {
  const marksPerQ = sub.marks_per_question || sub.exams?.marks_per_question || 5;
  let score = sub.calculated_score;
  let total = sub.calculated_total;
  if (score === null || score === undefined) {
    score = sub.score * marksPerQ;
  }
  if (total === null || total === undefined) {
    total = sub.total_questions * marksPerQ;
  }
  
  let finalScore = score;
  let isOverridden = false;
  if (sub.final_score_override !== null && sub.final_score_override !== undefined) {
    finalScore = sub.final_score_override;
    isOverridden = true;
  } else if (sub.admin_score_override !== null && sub.admin_score_override !== undefined) {
    finalScore = sub.admin_score_override * marksPerQ;
    isOverridden = true;
  }
  
  return {
    marksPerQ,
    score,
    total,
    finalScore,
    isOverridden
  };
};

const UserSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [overrideValue, setOverrideValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          profiles:user_id (full_name, email),
          exams:exam_id (title, marks_per_question)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmission = async (id, updates) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Submission updated');
      setSubmissions(submissions.map(s => s.id === id ? { ...s, ...updates } : s));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission({ ...selectedSubmission, ...updates });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOverride = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    await handleUpdateSubmission(selectedSubmission.id, { 
      final_score_override: parseInt(overrideValue),
      is_released: true // Auto-release on override usually
    });
    setSelectedSubmission(null);
    setOverrideValue('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-10">
        <Link to="/admin" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Submissions</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Examination</th>
                <th className="px-6 py-4">Raw Score</th>
                <th className="px-6 py-4">Final Score</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((sub, idx) => {
                const details = getSubmissionScoreDetails(sub);
                return (
                  <motion.tr 
                    key={sub.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg overflow-hidden font-bold">
                          {sub.profiles?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-800">{sub.profiles?.full_name || 'Incomplete Profile'}</div>
                          <div className="text-[10px] font-bold text-slate-400 truncate max-w-[120px] uppercase tracking-tighter">{sub.profiles?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-600">{sub.exams?.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800">{details.score} <span className="text-slate-400">/ {details.total}</span></span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Raw Data</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        {details.isOverridden ? (
                          <span className="text-sm font-black text-emerald-600 flex items-center gap-1.5">
                            {details.finalScore} <span className="text-emerald-300">/ {details.total}</span>
                            <CheckCircle className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-slate-400 italic">None</span>
                        )}
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Verified</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {sub.is_released ? (
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Published</span>
                      ) : (
                        <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-slate-200">Processing</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedSubmission(sub);
                          const subDetails = getSubmissionScoreDetails(sub);
                          setOverrideValue(subDetails.finalScore);
                        }}
                        className="p-2.5 bg-white border border-slate-100 rounded-xl text-primary-500 hover:bg-primary-500 hover:text-white hover:border-primary-500 shadow-sm transition-all group/btn"
                      >
                        <Edit2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    {/* Submission Detail Modal */}
      <AnimatePresence>
        {selectedSubmission && (() => {
          const modalDetails = getSubmissionScoreDetails(selectedSubmission);
          return (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xl">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white/90 backdrop-blur-3xl border border-white max-w-lg w-full rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                      <Edit2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 leading-tight">Modify Score</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Administrative override</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-10 space-y-8">
                  {/* Candidate Info HUD */}
                  <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">CANDIDATE</span>
                      <span className="text-sm font-bold text-slate-800">{selectedSubmission.profiles?.full_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">EXAMINATION</span>
                      <span className="text-sm font-bold text-slate-800">{selectedSubmission.exams?.title}</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Adjust Verified Marks</h4>
                      <span className="text-[10px] font-bold text-primary-500 bg-primary-50 px-2 py-1 rounded-lg">Max {modalDetails.total} Marks</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setOverrideValue(prev => Math.max(0, parseInt(prev || 0) - 1))}
                        className="w-16 h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-400 hover:border-primary-500 hover:text-primary-500 transition-all shadow-sm"
                      >
                        -
                      </button>
                      <input 
                        type="number"
                        max={modalDetails.total}
                        className="flex-1 h-16 bg-white border-2 border-slate-100 rounded-2xl text-center text-3xl font-black text-slate-900 focus:border-primary-500 focus:outline-none transition-all shadow-inner"
                        value={overrideValue}
                        onChange={(e) => setOverrideValue(e.target.value)}
                      />
                      <button 
                        onClick={() => setOverrideValue(prev => Math.min(modalDetails.total, parseInt(prev || 0) + 1))}
                        className="w-16 h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-400 hover:border-primary-500 hover:text-primary-500 transition-all shadow-sm"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="p-4 bg-primary-50/50 border border-primary-100/50 rounded-2xl flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-primary-500" />
                      <p className="text-[10px] font-bold text-primary-700 uppercase tracking-tight leading-relaxed">
                        Saving this will automatically publish the result and make it visible to the student's dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button 
                      onClick={() => setSelectedSubmission(null)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                     >
                       Discard
                     </button>
                     <button 
                      onClick={handleOverride}
                      disabled={saving}
                      className="flex-2 py-4 px-10 bg-primary-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                     >
                       {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Save & Release</>}
                     </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default UserSubmissions;
