import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, User, Mail, Phone, MapPin, Calendar, Network,
  CheckCircle, Loader2, RefreshCw, X, Download, ShieldAlert, Eye, Copy, Check, ChevronDown, BookOpen
} from 'lucide-react';
import { useAlert } from '../../context/AlertProvider';

const AdmissionsManagement = () => {
  const { showAlert } = useAlert();
  const [admissions, setAdmissions] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals and overlay views
  const [globalViewingDoc, setGlobalViewingDoc] = useState(null);
  const [approvingAdmission, setApprovingAdmission] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [allottedExamIds, setAllottedExamIds] = useState([]);
  const [examDropdownOpen, setExamDropdownOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalSuccessDetails, setApprovalSuccessDetails] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [admissionsRes, examsRes] = await Promise.all([
        supabase.from('admissions').select('*').order('created_at', { ascending: false }),
        supabase.from('exams').select('*').order('title')
      ]);

      if (admissionsRes.error) throw admissionsRes.error;
      if (examsRes.error) throw examsRes.error;

      setAdmissions(admissionsRes.data || []);
      setExams(examsRes.data || []);
    } catch (err) {
      console.error(err);
      showAlert('Failed to fetch admissions data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
    setCopied(false);
  };

  const handleOpenApproveModal = (admission) => {
    setApprovingAdmission(admission);
    setApprovalSuccessDetails(null);
    setAllottedExamIds([]);
    setExamDropdownOpen(false);
    generatePassword();
  };

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      showAlert('Password copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmApproval = async () => {
    if (!approvingAdmission || !generatedPassword) {
      showAlert('Please enter or generate a password.', 'warning');
      return;
    }
    setApproving(true);

    try {
      const primaryExamId = allottedExamIds.length > 0 ? allottedExamIds[0] : null;

      // Call create_user_from_admission RPC on Supabase
      const { data: newUserId, error } = await supabase.rpc('create_user_from_admission', {
        p_admission_id: approvingAdmission.id,
        p_password: generatedPassword,
        p_exam_id: primaryExamId
      });

      if (error) {
        if (error.code === 'P0001') {
          throw new Error(error.message); // custom exception message from PG
        }
        throw error;
      }

      // Sync profile updates (allotted exams, video_url, ip_address)
      if (newUserId) {
        const profileUpdates = {};
        if (allottedExamIds.length > 0) profileUpdates.allotted_exam_ids = allottedExamIds;
        if (approvingAdmission.video_url) profileUpdates.video_url = approvingAdmission.video_url;
        if (approvingAdmission.ip_address) profileUpdates.ip_address = approvingAdmission.ip_address;

        if (Object.keys(profileUpdates).length > 0) {
          try {
            await supabase.from('profiles').update(profileUpdates).eq('id', newUserId);
          } catch (e) {
            if (allottedExamIds.length > 0) {
              await supabase.from('profiles').update({ allotted_exam_ids: allottedExamIds }).eq('id', newUserId);
            }
          }
        }
      }

      setApprovalSuccessDetails({
        fullName: approvingAdmission.full_name,
        email: approvingAdmission.email,
        password: generatedPassword,
        allottedCount: allottedExamIds.length
      });

      showAlert('Admission approved & Candidate created successfully!', 'success');
      
      // Update local state list
      setAdmissions(prev => prev.map(a => a.id === approvingAdmission.id ? { ...a, status: 'approved' } : a));

    } catch (err) {
      console.error(err);
      showAlert(err.message || 'Error approving admission.', 'error');
    } finally {
      setApproving(false);
    }
  };

  const filteredAdmissions = admissions.filter(a => {
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch = (a.full_name || '').toLowerCase().includes(searchLower) ||
      (a.email || '').toLowerCase().includes(searchLower) ||
      (a.course_name || '').toLowerCase().includes(searchLower);
    
    // Show pending by default
    return matchesSearch && a.status === 'pending';
  });

  const stats = {
    pendingCount: admissions.filter(a => a.status === 'pending').length,
    approvedCount: admissions.filter(a => a.status === 'approved').length
  };

  return (
    <div className="space-y-8 animate-fade-in relative font-outfit">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">Admin Dashboard</h1>
          <p className="text-slate-500 font-medium">Orchestrating examination protocols and user directories</p>
        </div>
        
        {/* Search & Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search by name, email, course..."
              className="input-premium w-full sm:w-72 !py-3 !pl-12 bg-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-3 bg-white hover:bg-slate-50 text-slate-600 rounded-full border border-slate-200/60 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Admissions List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* New Admissions sub-header */}
      <div className="bg-white/60 border border-white/60 backdrop-blur-xl px-8 py-6 rounded-3xl flex justify-between items-center shadow-sm">
        <div>
          <h3 className="text-lg font-black text-slate-800">New Admissions</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Review and accept pending candidate admission forms.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-5 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
            <span className="block text-2xl font-black text-indigo-600 leading-none">{stats.pendingCount}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600/60 mt-1 block">Pending Review</span>
          </div>
          <div className="px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-center">
            <span className="block text-2xl font-black text-slate-600 leading-none">{stats.approvedCount}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1 block">Approved Users</span>
          </div>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white/40 border border-white/40 rounded-3xl backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="font-bold text-xs uppercase tracking-wider">Loading pending admissions...</span>
        </div>
      ) : filteredAdmissions.length === 0 ? (
        <div className="text-center py-16 bg-white/40 border border-white/40 rounded-3xl backdrop-blur-sm shadow-sm flex flex-col items-center">
          <FileText className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No Pending Admissions</h3>
          <p className="text-slate-400 text-xs font-medium mt-1">There are currently no admission applications awaiting review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAdmissions.map((adm) => (
            <motion.div
              layout
              key={adm.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/60 backdrop-blur-xl border border-white/60 p-6 md:p-8 rounded-[2rem] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:shadow-md transition-all duration-300 shadow-sm"
            >
              {/* Left Column: Avatar & Personal Info */}
              <div className="flex items-start md:items-center gap-5 flex-1 min-w-0">
                {/* Profile Avatar */}
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-xl overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
                  {adm.profile_photo_url ? (
                    <img src={adm.profile_photo_url} alt="Profile photo" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-300" />
                  )}
                </div>

                {/* Candidate Info Grid */}
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-outfit font-black text-xl text-slate-800 truncate">{adm.full_name}</h4>
                    <div className="space-y-1.5 mt-2 text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{adm.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>+91 {adm.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-slate-500 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider leading-none">Course</span>
                        <span className="text-slate-800 font-black mt-1 block">{adm.course_name || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider leading-none">Location & Address</span>
                        <span className="text-slate-700 block font-bold leading-tight mt-0.5 truncate max-w-[280px]">
                          {adm.city ? `${adm.city}, ${adm.state || ''}` : 'Location undetected'}
                        </span>
                        <span className="text-slate-400 block text-[10px] truncate max-w-[280px]">{adm.address}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Row: Meta details, Docs review row */}
              <div className="flex flex-col gap-4 w-full lg:w-auto lg:items-end justify-between self-stretch shrink-0">
                
                {/* Date and IP Metadata */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold text-slate-400 justify-start lg:justify-end">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-300" />
                    <span>SUBMITTED: {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Network className="w-3 h-3 text-slate-300" />
                    <span>IP: {adm.ip_address || 'N/A'}</span>
                  </div>
                </div>

                {/* Media assets list */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGlobalViewingDoc({ url: adm.video_url, label: 'Video Verification Statement', type: 'video' })}
                    disabled={!adm.video_url}
                    className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-500 transition-colors border border-rose-100 disabled:opacity-40"
                  >
                    Video
                  </button>
                  <button
                    onClick={() => setGlobalViewingDoc({ url: adm.aadhaar_front_url, label: 'Aadhaar Card Front', type: 'image' })}
                    disabled={!adm.aadhaar_front_url}
                    className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-500 transition-colors border border-blue-100 disabled:opacity-40"
                  >
                    Aadhaar (F)
                  </button>
                  <button
                    onClick={() => setGlobalViewingDoc({ url: adm.aadhaar_back_url, label: 'Aadhaar Card Back', type: 'image' })}
                    disabled={!adm.aadhaar_back_url}
                    className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-500 transition-colors border border-blue-100 disabled:opacity-40"
                  >
                    Aadhaar (B)
                  </button>
                  <button
                    onClick={() => setGlobalViewingDoc({ url: adm.pan_url, label: 'PAN Card', type: 'image' })}
                    disabled={!adm.pan_url}
                    className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-500 transition-colors border border-blue-100 disabled:opacity-40"
                  >
                    PAN Card
                  </button>
                  <button
                    onClick={() => setGlobalViewingDoc({ url: adm.signature_url, label: 'Digital Signature', type: 'image' })}
                    disabled={!adm.signature_url}
                    className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-500 transition-colors border border-blue-100 disabled:opacity-40"
                  >
                    Signature
                  </button>
                </div>

                {/* Create user buttons */}
                <div className="flex gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => handleOpenApproveModal(adm)}
                    className="w-full lg:w-auto px-5 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    Accept & Create User ✓
                  </button>
                </div>

              </div>

            </motion.div>
          ))}
        </div>
      )}

      {/* Dynamic media document viewer overlay modal */}
      <AnimatePresence>
        {globalViewingDoc && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
              onClick={() => setGlobalViewingDoc(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 p-2 rounded-3xl shadow-2xl relative z-10 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-white/10"
            >
              <div className="flex justify-between items-center p-5 border-b border-white/10 shrink-0">
                <h4 className="text-white font-bold">{globalViewingDoc.label}</h4>
                <button onClick={() => setGlobalViewingDoc(null)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto rounded-2xl bg-black/50 m-2 flex justify-center items-center">
                {globalViewingDoc.type === 'video' ? (
                  <video src={globalViewingDoc.url} controls autoPlay className="max-w-full max-h-[70vh] object-contain p-2" />
                ) : (
                  <img src={globalViewingDoc.url} alt={globalViewingDoc.label} className="max-w-full max-h-[70vh] object-contain p-2" />
                )}
              </div>

              <div className="p-4 flex justify-end border-t border-white/10 shrink-0">
                <a href={globalViewingDoc.url} download target="_blank" rel="noreferrer" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" /> Open Original
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Accept & Create User confirmation modal */}
      <AnimatePresence>
        {approvingAdmission && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !approving && setApprovingAdmission(null)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white max-w-[450px] w-full rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden border border-slate-100"
            >
              
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-start shrink-0">
                <div className="flex gap-3 items-center">
                  <div className="bg-white/10 p-2.5 rounded-[12px] backdrop-blur-md">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg leading-tight">Approve Application</h3>
                    <p className="text-slate-300 text-[11px] font-medium mt-0.5">Register user and finalize enrollment</p>
                  </div>
                </div>
                {!approving && (
                  <button onClick={() => setApprovingAdmission(null)} className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex shrink-0 mt-1">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="bg-slate-50/50 p-6 flex-1 overflow-y-auto max-h-[70vh]">
                
                {!approvalSuccessDetails ? (
                  // Flow: Input settings before create
                  <div className="space-y-6">
                    
                    {/* User summaries */}
                    <div className="bg-white border border-slate-200/60 p-4 rounded-2xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Candidate Account Details</span>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">{approvingAdmission.full_name}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{approvingAdmission.email}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">Course Applied: <span className="font-bold text-slate-700">{approvingAdmission.course_name}</span></p>
                    </div>

                    {/* Allot Exam Dropdown - Multi Select */}
                    <div className="space-y-2 relative">
                      <div className="flex justify-between items-center ml-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Allot Exam Assignment (Optional)
                        </label>
                        {allottedExamIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setAllottedExamIds([])}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline"
                          >
                            Clear All ({allottedExamIds.length})
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <div
                          onClick={() => setExamDropdownOpen(!examDropdownOpen)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 rounded-[14px] focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 text-sm font-medium cursor-pointer min-h-[50px] flex items-center justify-between gap-2 flex-wrap"
                        >
                          {allottedExamIds.length === 0 ? (
                            <span className="text-slate-400 text-sm font-medium">Select exam(s)...</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 py-0.5">
                              {allottedExamIds.map(id => {
                                const ex = exams.find(e => e.id === id);
                                return (
                                  <span
                                    key={id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs border border-indigo-100/80"
                                  >
                                    <span>{ex?.title || 'Exam'}</span>
                                    <X
                                      className="w-3 h-3 hover:text-indigo-900 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAllottedExamIds(prev => prev.filter(item => item !== id));
                                      }}
                                    />
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${examDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Multi Select Menu */}
                        {examDropdownOpen && (
                          <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-2 space-y-1">
                            {exams.length === 0 ? (
                              <p className="p-3 text-xs text-slate-400 text-center font-medium">No exams available</p>
                            ) : (
                              exams.map(ex => {
                                const isSelected = allottedExamIds.includes(ex.id);
                                return (
                                  <div
                                    key={ex.id}
                                    onClick={() => {
                                      setAllottedExamIds(prev =>
                                        isSelected ? prev.filter(id => id !== ex.id) : [...prev, ex.id]
                                      );
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-xs font-bold transition-colors ${
                                      isSelected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                      isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                                    }`}>
                                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <span className="flex-1 truncate">{ex.title}</span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Temporary Login Password Box - Editable + Regen */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-2">Temporary Login Password</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Enter password manually or click Regen..."
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 text-slate-800 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm font-bold placeholder:text-slate-400"
                            value={generatedPassword}
                            onChange={e => {
                              setGeneratedPassword(e.target.value);
                              setCopied(false);
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          className="px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600 active:scale-95 transition-all flex items-center justify-center shrink-0"
                          title="Copy Password"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600 active:scale-95 transition-all flex items-center justify-center shrink-0 text-xs font-bold"
                        >
                          Regen
                        </button>
                      </div>
                      <p className="text-[9px] text-amber-600 font-bold ml-2">⚠️ Make sure to copy this password. It will not be shown again.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <button
                        onClick={handleConfirmApproval}
                        disabled={approving}
                        className="w-full py-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {approving ? (
                          <>
                            <Loader2 className="animate-spin w-4 h-4" />
                            Registering Account...
                          </>
                        ) : (
                          'Confirm & Create Account ✓'
                        )}
                      </button>
                    </div>

                  </div>
                ) : (
                  // Flow: Account creation success details
                  <div className="space-y-6">
                    <div className="text-center py-4 flex flex-col items-center">
                      <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-100 mb-3 shadow-inner">
                        <CheckCircle className="w-6 h-6 animate-pulse" />
                      </div>
                      <h4 className="font-outfit font-black text-lg text-slate-900">Account Ready!</h4>
                      <p className="text-slate-400 text-xs mt-1">Provide these credentials to the candidate.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Candidate Name</span>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{approvalSuccessDetails.fullName}</p>
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Login Email</span>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-sm font-bold text-slate-800 truncate select-all">{approvalSuccessDetails.email}</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(approvalSuccessDetails.email);
                              showAlert('Email copied!', 'success');
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Generated Password</span>
                        <div className="flex justify-between items-center mt-1 bg-amber-50/50 border border-amber-100/50 p-2.5 rounded-xl">
                          <p className="text-sm font-black text-amber-900 select-all">{approvalSuccessDetails.password}</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(approvalSuccessDetails.password);
                              showAlert('Password copied!', 'success');
                            }}
                            className="p-1.5 bg-white/80 hover:bg-white text-slate-700 rounded-lg transition-colors border border-amber-200/50 shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setApprovingAdmission(null);
                        setApprovalSuccessDetails(null);
                        fetchData();
                      }}
                      className="w-full py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wider transition-colors"
                    >
                      Done & Close
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AdmissionsManagement;
