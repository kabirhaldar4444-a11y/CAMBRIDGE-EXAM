import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Shield, Eye, Edit2, Trash2, Lock, Unlock, X,
  Loader2, Mail, User, Key, CheckCircle, FileText, Download, UploadCloud, MapPin, Phone,
  RotateCw, ArrowLeft, Send, ShieldAlert, Video
} from 'lucide-react';
import { useAlert } from '../../context/AlertProvider';
import { useAuth } from '../../context/AuthContext';

// Helper to calculate submission scores, total marks, percentage, overrides, and question marks
const getSubmissionMarksDetails = (sub, pendingChanges) => {
  const marksPerQ = sub.marks_per_question || sub.exams?.marks_per_question || 5;
  
  const qMarks = pendingChanges?.question_marks ?? sub.question_marks ?? {};
  const finalScoreOverride = pendingChanges?.final_score_override !== undefined 
    ? pendingChanges.final_score_override 
    : (sub.final_score_override !== null ? sub.final_score_override : null);
    
  const legacyScoreOverride = pendingChanges?.admin_score_override !== undefined
    ? pendingChanges.admin_score_override
    : (sub.admin_score_override !== null ? sub.admin_score_override : null);

  let calculatedScore = pendingChanges?.calculated_score ?? sub.calculated_score;
  let calculatedTotal = pendingChanges?.calculated_total ?? sub.calculated_total;

  if (calculatedScore === null || calculatedScore === undefined) {
    calculatedScore = sub.score * marksPerQ;
  }
  if (calculatedTotal === null || calculatedTotal === undefined) {
    calculatedTotal = sub.total_questions * marksPerQ;
  }

  let displayScore = calculatedScore;
  let displayTotal = calculatedTotal;
  let isOverridden = false;
  let overrideSource = ''; // 'final', 'question', or 'legacy'

  if (finalScoreOverride !== null) {
    displayScore = finalScoreOverride;
    isOverridden = true;
    overrideSource = 'final';
  } else if (Object.keys(qMarks).length > 0) {
    displayScore = calculatedScore;
    displayTotal = calculatedTotal;
    const hasQOverride = Object.values(qMarks).some(q => q.obtained !== undefined || q.assigned !== undefined);
    if (hasQOverride) {
      isOverridden = true;
      overrideSource = 'question';
    }
  } else if (legacyScoreOverride !== null) {
    displayScore = legacyScoreOverride * marksPerQ;
    isOverridden = true;
    overrideSource = 'legacy';
  }

  const percentage = displayTotal > 0 ? Math.round((displayScore / displayTotal) * 100) : 0;

  return {
    marksPerQ,
    totalQuestions: sub.total_questions,
    correctAnswers: sub.score,
    calculatedScore,
    calculatedTotal,
    displayScore,
    displayTotal,
    isOverridden,
    overrideSource,
    percentage,
    qMarks,
    finalScoreOverride,
    legacyScoreOverride,
    isReleased: pendingChanges?.is_released !== undefined ? pendingChanges.is_released : sub.is_released
  };
};

const Users = () => {
  const { showAlert } = useAlert();
  const { profile } = useAuth();

  // Super Admin Check (strictly super_admin role, kabirhaldar4444@gmail.com, or Cambridge admin)
  const isSuperAdmin = profile?.role === 'super_admin' || 
    profile?.email === 'kabirhaldar4444@gmail.com' || 
    profile?.email === 'admin@cambridgelearningservices.com' || 
    profile?.email === 'admin@cls.com' || 
    profile?.email === 'admin@pmi.com';
  // Allow any user with admin role to manage candidates
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;
  const [activeTab, setActiveTab] = useState('candidates'); // 'candidates', 'admins'
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  // Global View Document overlay state
  const [globalViewingDoc, setGlobalViewingDoc] = useState(null);

  // Question Breakdown states
  const [viewingBreakdown, setViewingBreakdown] = useState(null);
  const [breakdownQuestions, setBreakdownQuestions] = useState([]);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [breakdownOnSave, setBreakdownOnSave] = useState(null);

  const fetchBreakdownQuestions = async (examId) => {
    setLoadingBreakdown(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId);
      if (error) throw error;
      setBreakdownQuestions(data || []);
    } catch (err) {
      showAlert('Failed to load question breakdown.', 'error');
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const handleOpenBreakdown = (sub, onSaveSuccess) => {
    setViewingBreakdown(sub);
    setBreakdownOnSave(() => onSaveSuccess);
    fetchBreakdownQuestions(sub.exam_id);
  };

  // Form State
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', allottedExamId: '' });
  const [creating, setCreating] = useState(false);
  const [createModalRole, setCreateModalRole] = useState('candidate'); // 'candidate' or 'admin'

  useEffect(() => {
    fetchData();
    // Safety check: If a non-admin somehow gets to 'admins' tab, force back to 'candidates'
    if (!isAdmin && activeTab === 'admins') {
      setActiveTab('candidates');
    }
  }, [isAdmin, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: profilesData }, { data: examsData }, { data: admissionsData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('exams').select('*').order('title'),
        supabase.from('admissions').select('*').order('created_at', { ascending: false })
      ]);

      const admissionsMap = new Map();
      (admissionsData || []).forEach(adm => {
        if (adm.email) {
          const emailKey = adm.email.toLowerCase().trim();
          if (!admissionsMap.has(emailKey)) admissionsMap.set(emailKey, adm);
        }
        if (adm.phone) {
          const phoneKey = adm.phone.trim();
          if (!admissionsMap.has(phoneKey)) admissionsMap.set(phoneKey, adm);
        }
      });

      const mergedUsers = (profilesData || []).map(p => {
        const matchingAdm = (p.email && admissionsMap.get(p.email.toLowerCase().trim())) ||
                            (p.phone && admissionsMap.get(p.phone?.trim()));
        if (!matchingAdm) return p;
        return {
          ...p,
          video_url: p.video_url || matchingAdm.video_url,
          aadhaar_front_url: p.aadhaar_front_url || matchingAdm.aadhaar_front_url,
          aadhaar_back_url: p.aadhaar_back_url || matchingAdm.aadhaar_back_url,
          pan_card_url: p.pan_card_url || matchingAdm.pan_url,
          signature_url: p.signature_url || matchingAdm.signature_url,
          profile_photo_url: p.profile_photo_url || matchingAdm.profile_photo_url,
          ip_address: p.ip_address || matchingAdm.ip_address,
          address: p.address || matchingAdm.address,
        };
      });

      setUsers(mergedUsers);
      setExams(examsData || []);
    } catch (error) {
      console.error(error);
      showAlert('Failed to fetch platform data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      if (createModalRole === 'admin' && !isSuperAdmin) {
        throw new Error('Access Denied: Only Super Admins can create administrative accounts.');
      }
      const { data: newUserId, error } = await supabase.rpc('create_candidate', {
        p_email: newUser.email,
        p_password: newUser.password,
        p_full_name: newUser.fullName,
        p_exam_id: newUser.allottedExamId || null
      });

      if (error) {
        if (error.code === 'P0001' || error.message.includes('does not exist')) {
          throw new Error('Database Function Missing.');
        }
        throw error;
      };

      if (createModalRole === 'admin') {
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', newUserId);

        if (roleError) throw roleError;
      }

      await fetchData();
      showAlert(`${createModalRole === 'admin' ? 'Admin' : 'Candidate'} account created successfully!`, 'success');
      setIsCreateModalOpen(false);
      setNewUser({ email: '', password: '', fullName: '', allottedExamId: '' });
      setCreating(false);
    } catch (error) {
      showAlert(error.message, 'error');
      setCreating(false);
    }
  };

  const handleUpdateProfile = async (updatedData) => {
    try {
      const { password, ...profileFields } = updatedData;

      // ROBUST CLEANUP: Explicitly only send columns that exist in the profiles table
      const allowedProfileColumns = [
        'full_name', 'phone', 'address', 'state', 'city',
        'role', 'profile_completed', 'disclaimer_accepted',
        'allotted_exam_ids', 'is_exam_locked', 'can_register',
        'profile_photo_url', 'live_photo_url', 'aadhaar_front_url',
        'aadhaar_back_url', 'pan_card_url', 'signature_url', 'video_url'
      ];

      const cleanProfileData = {};
      allowedProfileColumns.forEach(col => {
        if (profileFields[col] !== undefined) {
          cleanProfileData[col] = profileFields[col];
        }
      });

      // Ensure allotted_exam_ids is a valid array (Supabase UUID[] requirements)
      if (cleanProfileData.allotted_exam_ids && !Array.isArray(cleanProfileData.allotted_exam_ids)) {
        cleanProfileData.allotted_exam_ids = [];
      }

      let { data, error, status } = await supabase
        .from('profiles')
        .update(cleanProfileData)
        .eq('id', editingUser.id)
        .select();

      if (error && error.message && error.message.includes('video_url')) {
        const { video_url, ...withoutVideo } = cleanProfileData;
        const retry = await supabase
          .from('profiles')
          .update(withoutVideo)
          .eq('id', editingUser.id)
          .select();
        if (retry.error) throw retry.error;
      } else if (error) {
        throw error;
      }

       // Handle Submission Overrides if any
       if (updatedData.submissionChanges && Object.keys(updatedData.submissionChanges).length > 0) {
         const changes = updatedData.submissionChanges;
         for (const subId in changes) {
           // Only send specific allowed columns for submissions
           const subUpdate = {};
           if (changes[subId].admin_score_override !== undefined) subUpdate.admin_score_override = changes[subId].admin_score_override;
           if (changes[subId].final_score_override !== undefined) subUpdate.final_score_override = changes[subId].final_score_override;
           if (changes[subId].question_marks !== undefined) subUpdate.question_marks = changes[subId].question_marks;
           if (changes[subId].calculated_score !== undefined) subUpdate.calculated_score = changes[subId].calculated_score;
           if (changes[subId].calculated_total !== undefined) subUpdate.calculated_total = changes[subId].calculated_total;
           if (changes[subId].is_released !== undefined) subUpdate.is_released = changes[subId].is_released;
 
           const { error: subError } = await supabase
             .from('submissions')
             .update(subUpdate)
             .eq('id', subId);

          if (subError) {
            console.error('Submission update error:', subError);
            throw new Error(`Failed to update results: ${subError.message}. You may need to update your database security policies.`);
          }
        }
      }

      if (status === 200 && (!data || data.length === 0)) {
        throw new Error('Update failed: You may not have permission to modify this profile.');
      }

      showAlert('Profile updated successfully', 'success');
      setEditingUser(null);
      fetchData();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Authorization Check to be doubly sure
    if (userToDelete.role === 'admin' && !isSuperAdmin) {
      showAlert('Access Denied: Only Super Admins can delete administrative accounts.', 'error');
      setUserToDelete(null);
      return;
    }

    try {
      // Invoke RPC user deletion function
      const { error } = await supabase.rpc('delete_user_by_id', {
        p_user_id: userToDelete.id
      });

      if (error) throw error;

      // Remove from UI state to instantly reflect success
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      showAlert('User account deleted successfully.', 'success');
    } catch (e) {
      console.error('Deletion error:', e);
      showAlert(e.message || 'Error processing deletion.', 'error');
    } finally {
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch = (u.full_name || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower);
    const matchesTab = activeTab === 'candidates' ? u.role === 'candidate' : u.role === 'admin';
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.role === 'candidate').length,
    admins: users.filter(u => u.role === 'admin').length
  };

  return (
    <div className="space-y-10 animate-fade-in relative">
      {/* Header & Search */}


      {/* Super Admin Dashboard Notice */}
      {!isSuperAdmin && activeTab === 'admins' && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex items-center gap-4 animate-fade-in shadow-sm">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-amber-900 text-sm">Restricted Control</h4>
            <p className="text-amber-700/80 text-[11px] font-bold uppercase tracking-wider mt-0.5">Contact the Super Admin (admin@cambridgelearningservices.com) for administrative account creation.</p>
          </div>
        </div>
      )}

      {/* Consolidated Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex bg-slate-100/50 p-1 rounded-full w-max backdrop-blur-md border border-white/40 shadow-inner">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === 'candidates' ? 'bg-white text-primary-600 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <User className="w-4 h-4" /> Candidates
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admins')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === 'admins' ? 'bg-secondary-50 text-secondary-600 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.2)] ring-1 ring-secondary-200/50' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Shield className="w-4 h-4" /> Admin Roles
            </button>
          )}
        </div>

        <div className="flex gap-3 items-center w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search by name or email..."
              className="input-premium w-full lg:w-72 !py-3 !pl-12 !bg-white/60 backdrop-blur-md"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && activeTab === 'candidates' ? (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCreateModalRole('candidate');
                  setIsCreateModalOpen(true);
                }}
                className="btn-premium !py-3 !px-6 h-[48px] shadow-lg shadow-primary-500/20"
              >
                <Plus className="w-5 h-5" /> New Candidate
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => {
                    setCreateModalRole('admin');
                    setIsCreateModalOpen(true);
                  }}
                  className="btn-premium !py-3 !px-6 h-[48px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-full shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Create Admin User
                </button>
              )}
            </div>
          ) : (
            isSuperAdmin && (
              <button
                onClick={() => {
                  setCreateModalRole('admin');
                  setIsCreateModalOpen(true);
                }}
                className="btn-premium !py-3 !px-6 h-[48px] shadow-lg shadow-primary-500/20"
              >
                <Plus className="w-5 h-5" /> New Admin
              </button>
            )
          )}
        </div>
      </div>

      {activeTab === 'candidates' ? (
        <>
          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <StatBox label="TOTAL USERS" value={stats.total} onClick={() => setActiveTab('candidates')} />
            <StatBox label="ACTIVE ACCESS" value={stats.active} onClick={() => setActiveTab('candidates')} />
            <StatBox label="STAFF ADMINS" value={stats.admins} onClick={() => setActiveTab('admins')} />
          </div>

          {/* Candidates Grid */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredUsers.map((u) => (
                <CandidateCard
                  key={u.id}
                  user={u}
                  canManage={isSuperAdmin || u.role === 'candidate'}
                  onView={() => setViewingUser(u)}
                  onEdit={() => setEditingUser(u)}
                  onDelete={() => setUserToDelete(u)}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <AdminAccessControl
          users={users}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddAdmin={() => {
            setCreateModalRole('admin');
            setIsCreateModalOpen(true);
          }}
          onView={(u) => setViewingUser(u)}
          onEdit={(u) => setEditingUser(u)}
          onDelete={(u) => setUserToDelete(u)}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Modals & Drawers */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        newUser={newUser}
        setNewUser={setNewUser}
        handleCreateUser={handleCreateUser}
        creating={creating}
        exams={exams}
        isAdmin={createModalRole === 'admin'}
      />

      <EditCandidateModal
        user={editingUser}
        exams={exams}
        onClose={() => setEditingUser(null)}
        onSave={handleUpdateProfile}
        onViewBreakdown={(sub) => {
          handleOpenBreakdown(sub, (qMarks, score, total) => {
            updateSubChange(sub.id, 'question_marks', qMarks);
            updateSubChange(sub.id, 'calculated_score', score);
            updateSubChange(sub.id, 'calculated_total', total);
            updateSubChange(sub.id, 'final_score_override', null);
          });
        }}
      />

      <AnimatePresence>
        {viewingUser && (
          <ViewCandidateDrawer
            user={viewingUser}
            onClose={() => setViewingUser(null)}
            onViewDoc={setGlobalViewingDoc}
            onViewBreakdown={handleOpenBreakdown}
          />
        )}
      </AnimatePresence>

      <DeleteConfirmModal
        user={userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
      />

      <QuestionBreakdownModal
        isOpen={!!viewingBreakdown}
        onClose={() => setViewingBreakdown(null)}
        submission={viewingBreakdown}
        questions={breakdownQuestions}
        loading={loadingBreakdown}
        onSave={breakdownOnSave}
      />

      <DocumentViewerOverlay
        doc={globalViewingDoc}
        onClose={() => setGlobalViewingDoc(null)}
      />
    </div>
  );
};

// ----------------------------------------------------
// SUB COMPONENTS
// ----------------------------------------------------

const StatBox = ({ label, value, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white/60 backdrop-blur-xl border border-white/40 p-8 rounded-[2rem] flex flex-col justify-between h-36 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:scale-[1.01] hover:border-slate-300 active:scale-95' : ''}`}
  >
    <span className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</span>
    <span className="text-5xl font-outfit font-black text-slate-800 leading-none">{value}</span>
  </div>
);

const CandidateCard = ({ user, onView, onEdit, onDelete, canManage }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="bg-white/60 backdrop-blur-xl border border-white/60 p-6 rounded-3xl flex flex-col gap-5 hover:shadow-bloom transition-all ring-1 ring-slate-100 group"
  >
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center text-white text-xl font-bold shadow-lg">
        {user.profile_photo_url ? <img src={user.profile_photo_url} className="w-full h-full object-cover" /> : user.full_name?.charAt(0) || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-outfit font-bold text-lg text-slate-800 truncate">{user.full_name || 'Incomplete Profile'}</h4>
        <p className="text-sm text-slate-500 truncate">{user.email}</p>
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      <div className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100/50">
        {user.allotted_exam_ids?.length || 0} ASSIGNMENTS
      </div>
      {user.is_exam_locked && (
        <div className="px-4 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-rose-100/50">
          LOCKED
        </div>
      )}
    </div>

    <div className="flex items-center justify-between pt-4 border-t border-slate-100 border-dashed mt-1 relative z-10">
      <div className="flex gap-2">
        <button onClick={onView} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-100 hover:border-blue-100 group/icon" title="View Details">
          <Eye className="w-4 h-4 group-hover/icon:scale-110 transition-transform" />
        </button>
        {canManage && (
          <>
            <button onClick={onEdit} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-slate-100 hover:border-emerald-100 group/icon" title="Edit User">
              <Edit2 className="w-4 h-4 group-hover/icon:scale-110 transition-transform" />
            </button>
            <button onClick={onDelete} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-slate-100 hover:border-rose-100 group/icon" title="Delete User">
              <Trash2 className="w-4 h-4 group-hover/icon:scale-110 transition-transform" />
            </button>
          </>
        )}
      </div>
      <button className={`p-2 rounded-xl border transition-all ${user.is_exam_locked ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-slate-50 text-slate-300 border-slate-100 hover:bg-slate-100'}`} title={user.is_exam_locked ? "Account Locked" : "Account Active"}>
        {user.is_exam_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </button>
    </div>
  </motion.div>
);

const AdminAccessControl = ({ users, searchTerm, setSearchTerm, onAddAdmin, onView, onEdit, onDelete, isSuperAdmin }) => {
  const staffAdmins = users.filter(u => u.role === 'admin');
  const candidates = users.filter(u => u.role === 'candidate');

  const filteredAdmins = staffAdmins.filter(u => {
    const searchLower = (searchTerm || '').toLowerCase();
    return (u.full_name || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower);
  });

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 ring-1 ring-slate-100 shadow-sm relative overflow-hidden">
        {/* Soft decorative glow */}
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100 relative z-10 shrink-0">
          <Shield className="w-8 h-8" />
        </div>
        <div className="flex-1 relative z-10">
          <h3 className="text-2xl font-black text-slate-900 mb-1">Admin Access Control</h3>
          <p className="text-slate-500 text-sm font-medium max-w-md">
            {isSuperAdmin
              ? 'Manage administrative privileges and staff accounts. System-wide changes require confirmation.'
              : 'View administrative staff roles. Privilege management is restricted to Super Admin.'}
          </p>
        </div>

        <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
          <div className="flex-1 md:flex-none px-6 py-4 bg-purple-50 rounded-2xl border border-purple-100 text-center ring-2 ring-purple-500/10 backdrop-blur-sm">
            <span className="block text-2xl font-black text-purple-600 leading-none">{staffAdmins.length}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600/60 mt-1 block">Staff Admins</span>
          </div>
          <div className="flex-1 md:flex-none px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="block text-2xl font-black text-slate-600 leading-none">{candidates.length}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 block">Candidates</span>
          </div>
        </div>

        {isSuperAdmin && (
          <button onClick={onAddAdmin} className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-purple-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 relative z-10">
            <Plus className="w-5 h-5" /> Add New Admin
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          placeholder="Search admins by name or email..."
          className="input-premium w-full !pl-14 !py-4"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredAdmins.map(admin => (
          <div key={admin.id} className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 border border-purple-200/50 flex items-center justify-center text-purple-600 font-bold overflow-hidden shadow-inner">
                {admin.profile_photo_url ? <img src={admin.profile_photo_url} className="w-full h-full object-cover" /> : admin.full_name?.charAt(0) || 'A'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800 leading-tight">{admin.full_name}</h4>
                  {(admin.email === 'admin@cambridgelearningservices.com' || admin.email === 'admin@cls.com' || admin.email === 'admin@pmi.com') && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-tighter rounded-md border border-amber-200 animate-pulse">
                      <Shield className="w-2.5 h-2.5" /> SUPER ADMIN
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-500">{admin.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
              <div className="px-4 py-1.5 bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-purple-100 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> ADMIN
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-500 hidden sm:block">Admin Access</span>
                <button
                  disabled={!isSuperAdmin}
                  className={`w-12 h-6 rounded-full relative p-0.5 shadow-inner transition-colors focus:outline-none ring-2 ring-transparent ${isSuperAdmin ? 'bg-purple-500 cursor-pointer focus:ring-purple-200' : 'bg-slate-300 cursor-not-allowed'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${isSuperAdmin ? 'right-0.5' : 'left-0.5'}`}></div>
                </button>
              </div>

              <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                <button onClick={() => onView(admin)} className="p-2 rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-all group/icon">
                  <Eye className="w-4 h-4 group-hover/icon:scale-110" />
                </button>
                {isSuperAdmin && (
                  <>
                    <button onClick={() => onEdit(admin)} className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all group/icon">
                      <Edit2 className="w-4 h-4 group-hover/icon:scale-110" />
                    </button>
                    <button onClick={() => onDelete(admin)} className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all group/icon">
                      <Trash2 className="w-4 h-4 group-hover/icon:scale-110" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// ----------------------------------------------------
// MODALS & DRAWERS
// ----------------------------------------------------

const CreateUserModal = ({ isOpen, onClose, newUser, setNewUser, handleCreateUser, creating, exams, isAdmin }) => {
  const [showPassword, setShowPassword] = useState(false);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser(prev => ({ ...prev, password }));
    setShowPassword(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white max-w-[440px] w-full rounded-[1.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-white/20 max-h-[90vh]"
          >
            {/* Header Section Matches Screenshot */}
            <div className={`p-6 flex justify-between items-start shrink-0 ${isAdmin ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}>
              <div className="flex gap-3 items-center">
                <div className="bg-white/20 p-2.5 rounded-[10px] backdrop-blur-md">
                  {isAdmin ? <Shield className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight">Create {isAdmin ? 'Staff Admin' : 'Candidate'}</h3>
                  <p className="text-white/80 text-[11px] font-medium mt-0.5">{isAdmin ? 'New account will have full admin privileges' : 'Register a new candidate access login'}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex shrink-0 mt-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 flex-1 relative overflow-hidden flex flex-col min-h-0">
              {/* Body is now scrollable */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
                {/* Decorative faint background icon */}
                <User className="absolute right-8 top-8 w-40 h-40 text-slate-200/50 -rotate-12 pointer-events-none" strokeWidth={-1} fill="currentColor" />

                <div className="text-center mb-10 relative z-10">
                  <h3 className="text-[28px] font-black text-[#1a202c] mb-1 tracking-tight">Create {isAdmin ? 'Staff' : 'Candidate'} Access</h3>
                  <p className="text-slate-500 text-sm font-medium">Register a new {isAdmin ? 'administrative staff member' : 'student taking an examination'}.</p>
                </div>

                <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#6b7280] ml-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-500" />
                      <input
                        type="email" required placeholder="candidate@cambridgelearningservices.com"
                        className="w-full pl-[50px] pr-4 py-3.5 bg-slate-100/80 border border-slate-200 text-slate-800 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all text-[15px] font-medium placeholder:font-normal placeholder:text-slate-400"
                        value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#6b7280] ml-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-500" />
                      <input
                        type="text" required placeholder="e.g. John Doe"
                        className="w-full pl-[50px] pr-4 py-3.5 bg-slate-100/80 border border-slate-200 text-slate-800 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all text-[15px] font-medium placeholder:font-normal placeholder:text-slate-400"
                        value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#6b7280] ml-2">Account Password</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-500" />
                      <input
                        type="password" required placeholder="Generate a secure password..."
                        {...(showPassword ? { type: "text" } : {})}
                        className="w-full pl-[50px] pr-[85px] py-3.5 bg-slate-100/80 border border-slate-200 text-slate-800 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all text-[15px] font-medium placeholder:font-normal placeholder:text-slate-400"
                        value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2.5 text-slate-500">
                        <button type="button" onClick={generatePassword} className="hover:text-indigo-600 transition-colors p-1"><RotateCw className="w-4 h-4" strokeWidth={2.5} /></button>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-indigo-600 transition-colors p-1">
                          {showPassword ? <X className="w-4 h-4" strokeWidth={2.5} /> : <Eye className="w-4 h-4" strokeWidth={2.5} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {!isAdmin && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#6b7280] ml-2">Initial Allotted Exam (Optional)</label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-500" />
                        <select
                          className="w-full pl-[50px] pr-4 py-3.5 bg-slate-100/80 border border-slate-200 text-slate-800 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all text-[15px] font-medium appearance-none cursor-pointer"
                          value={newUser.allottedExamId}
                          onChange={e => setNewUser({ ...newUser, allottedExamId: e.target.value })}
                        >
                          <option value="">No exam initially assigned</option>
                          {exams.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Footer is now fixed at bottom of modal */}
              <div className="px-8 py-6 bg-white border-t border-slate-100 shrink-0">
                <button
                  form="create-user-form"
                  disabled={creating}
                  className={`w-full py-4 rounded-[14px] font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 ${isAdmin ? 'bg-indigo-500 shadow-indigo-500/30' : 'bg-blue-500 shadow-blue-500/30'}`}
                >
                  {creating ? <Loader2 className="animate-spin w-5 h-5" /> : `Create ${isAdmin ? 'Staff' : 'Candidate'} Account`}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


const EditCandidateModal = ({ user, exams, onClose, onSave, onViewBreakdown }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    allotted_exam_ids: [],
    password: ''
  });
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [submissionChanges, setSubmissionChanges] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [examSearch, setExamSearch] = useState('');
  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        allotted_exam_ids: user.allotted_exam_ids || [],
        password: ''
      });
      setSubmissionChanges({});
      setShowPassword(false);
      fetchSubmissions();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [user]);

  const fetchSubmissions = async () => {
    setLoadingSubs(true);
    try {
      const { data } = await supabase
        .from('submissions')
        .select('*, exams(title, duration, marks_per_question)')
        .eq('user_id', user.id);
      setSubmissions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubs(false);
    }
  };

  const updateSubChange = (subId, field, value) => {
    setSubmissionChanges(prev => ({
      ...prev,
      [subId]: {
        ...(prev[subId] || {}),
        [field]: value
      }
    }));
  };

  const getSubValue = (sub, field) => {
    return submissionChanges[sub.id]?.[field] ?? sub[field];
  };

  const handleAdjustMark = (sub, amount) => {
    const details = getSubmissionMarksDetails(sub, submissionChanges[sub.id]);
    const currentScore = details.displayScore;
    const nextValue = Math.max(0, Math.min(details.displayTotal, currentScore + amount));
    updateSubChange(sub.id, 'final_score_override', nextValue);
  };

  if (!user) return null;

  const toggleExam = (id) => {
    setFormData(prev => ({
      ...prev,
      allotted_exam_ids: prev.allotted_exam_ids.includes(id)
        ? prev.allotted_exam_ids.filter(eid => eid !== id)
        : [...prev.allotted_exam_ids, id]
    }));
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
  };

  const handleSave = () => {
    onSave({
      ...formData,
      submissionChanges
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.98 }}
        className="fixed inset-0 z-[200] bg-slate-900/20 backdrop-blur-2xl overflow-y-auto custom-scrollbar flex flex-col items-center py-6 sm:py-10"
      >
        <div className="w-full max-w-5xl px-4 sm:px-6 flex flex-col">
          <div className="mb-6">
            <button onClick={onClose} className="inline-flex items-center gap-2 bg-white border border-slate-200 shadow-sm hover:shadow-md text-slate-600 hover:text-blue-600 font-bold px-6 py-3 rounded-full transition-all group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Candidates
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-6 sm:p-10 md:p-14 mb-20 relative overflow-hidden flex-1">
            {/* Subtle decorative glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

            <div className="mb-12 relative z-10 border-b border-slate-100 pb-10">
              <h2 className="text-4xl font-black text-slate-800 mb-3">Update User Profile</h2>
              <p className="text-slate-500 font-medium">Modify candidate details and examination permissions</p>
            </div>

            <div className="space-y-12 relative z-10">
              {/* Main Info */}
              <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100 space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 ml-2">Candidate Email</label>
                    <input className="input-premium w-full !bg-white opacity-70 cursor-not-allowed shadow-sm" value={user.email} disabled />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 ml-2">Full Name</label>
                    <input
                      className="input-premium w-full !bg-white shadow-sm"
                      value={formData.full_name}
                      onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 ml-2">New Password <span className="normal-case opacity-60">(leave blank to keep current)</span></label>
                  <div className="relative">
                    <input
                      className="input-premium w-full !bg-white shadow-sm"
                      type={showPassword ? "text" : "password"}
                      placeholder="Set a new password..."
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4 text-slate-400">
                      <button onClick={generatePassword} type="button" className="hover:text-blue-500 transition-colors p-1" title="Generate Random Password"><RotateCw className="w-5 h-5" /></button>
                      <div className="w-px h-5 bg-slate-200"></div>
                      <button onClick={() => setShowPassword(!showPassword)} type="button" className="hover:text-blue-500 transition-colors p-1" title="Toggle Visibility">
                        {showPassword ? <X className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity Verification */}
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100"><Shield className="w-5 h-5" /></div>
                  <h3 className="text-2xl font-black text-slate-800">Identity Verification</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <VerificationCard label="PROFILE PHOTO" url={user.live_photo_url || user.profile_photo_url} onView={() => setGlobalViewingDoc({ label: "PROFILE PHOTO", url: user.live_photo_url || user.profile_photo_url })} />
                  <VerificationCard label="AADHAAR FRONT" url={user.aadhaar_front_url} onView={() => setGlobalViewingDoc({ label: "AADHAAR FRONT", url: user.aadhaar_front_url })} />
                  <VerificationCard label="AADHAAR BACK" url={user.aadhaar_back_url} onView={() => setGlobalViewingDoc({ label: "AADHAAR BACK", url: user.aadhaar_back_url })} />
                </div>
              </div>

              {/* Allotted Exams - Smart Search Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100"><FileText className="w-5 h-5" /></div>
                    <h3 className="text-2xl font-black text-slate-800">Exam Permissions</h3>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {formData.allotted_exam_ids.length} EXAMS ASSIGNED
                  </div>
                </div>

                <div className="space-y-6 relative">
                  {/* Search Bar - Advanced Tag Input */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative group">
                      <div className="absolute inset-0 bg-blue-500/5 rounded-[24px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                      <div className={`
                         relative flex flex-wrap items-center gap-2 min-h-[64px] px-5 py-3 bg-slate-50/50 border-2 border-slate-100 rounded-[24px] transition-all 
                         ${isExamDropdownOpen ? 'border-blue-400 bg-white shadow-lg ring-4 ring-blue-500/5' : 'hover:border-slate-200'}
                       `}>
                        <Search className="w-5 h-5 text-slate-400 shrink-0" />

                        {/* Tags inside search bar */}
                        <AnimatePresence>
                          {formData.allotted_exam_ids.map(examId => {
                            const exam = exams.find(e => e.id === examId);
                            if (!exam) return null;
                            return (
                              <motion.div
                                key={examId}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20"
                              >
                                <span className="text-[11px] font-black uppercase tracking-wider">{exam.title}</span>
                                <button
                                  onClick={() => toggleExam(examId)}
                                  className="hover:bg-white/20 rounded-md p-0.5 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>

                        <input
                          type="text"
                          placeholder={formData.allotted_exam_ids.length === 0 ? "Search and assign examinations..." : ""}
                          className="flex-1 min-w-[120px] bg-transparent text-[15px] font-bold text-slate-800 focus:outline-none placeholder:font-medium placeholder:text-slate-400"
                          value={examSearch}
                          onChange={(e) => {
                            setExamSearch(e.target.value);
                            setIsExamDropdownOpen(true);
                          }}
                          onFocus={() => setIsExamDropdownOpen(true)}
                        />

                        {examSearch && (
                          <button
                            onClick={() => setExamSearch('')}
                            className="p-1 hover:bg-slate-100 rounded-full transition-colors shrink-0"
                          >
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Results */}
                      <AnimatePresence>
                        {isExamDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-[10]" onClick={() => setIsExamDropdownOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.98 }}
                              className="absolute left-0 right-0 top-full mt-3 bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-[100] max-h-[320px] flex flex-col"
                            >
                              <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Exams</span>
                                <button onClick={() => setIsExamDropdownOpen(false)} className="text-[10px] font-black text-blue-600 uppercase hover:underline">Close</button>
                              </div>
                              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                {exams
                                  .filter(ex => ex.title.toLowerCase().includes(examSearch.toLowerCase()))
                                  .map(exam => {
                                    const isSelected = formData.allotted_exam_ids.includes(exam.id);
                                    return (
                                      <div
                                        key={exam.id}
                                        className={`w-full p-3 rounded-2xl flex items-center justify-between group/item transition-all ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                                      >
                                        <div className="flex items-center gap-4">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-white shadow-sm border border-blue-100' : 'bg-slate-100 group-hover/item:bg-white border border-transparent'}`}>
                                            <FileText className={`w-5 h-5 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                                          </div>
                                          <div className="text-left">
                                            <div className="font-bold text-[14px] text-slate-800 leading-tight truncate max-w-[180px]">{exam.title}</div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{exam.duration} Minutes</div>
                                          </div>
                                        </div>

                                        {isSelected ? (
                                          <button
                                            onClick={() => toggleExam(exam.id)}
                                            className="px-4 py-2 bg-white text-rose-500 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center gap-2"
                                          >
                                            <X className="w-3 h-3" /> Remove
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => toggleExam(exam.id)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                                          >
                                            <Plus className="w-3 h-3" /> Assign
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                {exams.filter(ex => ex.title.toLowerCase().includes(examSearch.toLowerCase())).length === 0 && (
                                  <div className="p-10 text-center">
                                    <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <span className="text-sm font-bold text-slate-400">No exams matching "{examSearch}"</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* OK Final Check Button */}
                    <button
                      onClick={() => {
                        setIsExamDropdownOpen(false);
                        setExamSearch('');
                      }}
                      className="h-[64px] px-8 bg-emerald-500 text-white rounded-[24px] font-black text-[12px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" /> OK
                    </button>
                  </div>

                  {/* Selected Exams Permission List - COMPACT VERSION */}
                  <div className="space-y-2">
                    <div className="px-4 py-1.5 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Current Allotments</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Attempt Status</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <AnimatePresence>
                        {formData.allotted_exam_ids.map(examId => {
                          const exam = exams.find(e => e.id === examId);
                          if (!exam) return null;

                          const attempt = submissions.find(s => s.exam_id === examId);
                          const isAttempted = !!attempt;

                          return (
                            <motion.div
                              key={examId}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="bg-white border border-slate-100 px-4 py-3 rounded-xl flex items-center justify-between group hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${isAttempted ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                  <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="font-bold text-slate-800 text-[13px] leading-tight">{exam.title}</h5>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Auth Access</p>
                                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isAttempted ? 'text-emerald-500' : 'text-slate-400'}`}>
                                      {isAttempted ? 'Attempted' : 'Not Attempted'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {isAttempted && (
                                  <div className="px-2.5 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-tighter rounded-md shadow-sm">
                                    {attempt.score} / {attempt.total_questions}
                                  </div>
                                )}
                                <button
                                  onClick={() => toggleExam(examId)}
                                  className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                                  title="Revoke Permission"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                    {formData.allotted_exam_ids.length === 0 && (
                      <div className="w-full p-10 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-3">
                        <Shield className="w-6 h-6 text-slate-200" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Active Allotments</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance & Mark Release */}
              <div>
                <h3 className="text-2xl font-black text-slate-800 mb-8 mt-12">Performance & Mark Release</h3>

                {loadingSubs ? (
                  <div className="bg-slate-50 p-10 flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-100">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-sm font-bold text-slate-400">Loading assessments...</span>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="bg-slate-50 p-10 text-slate-400 text-sm font-medium rounded-3xl border border-slate-100 text-center">
                    No assessments completed yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {submissions.map(sub => {
                      const details = getSubmissionMarksDetails(sub, submissionChanges[sub.id]);
                      const hasChanges = (submissionChanges[sub.id]?.final_score_override !== undefined) ||
                        (submissionChanges[sub.id]?.question_marks !== undefined) ||
                        (submissionChanges[sub.id]?.is_released !== undefined);

                      return (
                        <div key={sub.id} className="bg-white p-8 rounded-3xl border border-slate-100 flex flex-col gap-6 shadow-sm">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                                <CheckCircle className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <h4 className="font-black text-xl text-slate-800 leading-none">{sub.exams?.title || 'Examination'}</h4>
                                  {hasChanges && <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-black uppercase rounded shadow-sm">PENDING SAVE</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Original Score: {sub.score} / {sub.total_questions}
                                  </span>
                                  {details.isOverridden && (
                                    <>
                                      <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                      <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[9px] font-black uppercase tracking-wider rounded border border-rose-100">
                                        {details.overrideSource === 'question' ? 'Question Overrides' : 'Score Overridden'}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-outfit font-black text-slate-800">{details.displayScore}</span>
                              <span className="text-slate-400 font-medium text-lg">/</span>
                              <span className="text-slate-400 font-semibold text-lg">{details.displayTotal}</span>
                              <span className="ml-2 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-black rounded-xl">
                                {details.percentage}%
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <div>
                              <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Total Questions</span>
                              <span className="text-sm font-bold text-slate-800">{details.totalQuestions}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Marks Per Q</span>
                              <span className="text-sm font-bold text-slate-800">{details.marksPerQ}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Correct Answers</span>
                              <span className="text-sm font-bold text-slate-800">{details.correctAnswers}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Final Score</span>
                              <span className="text-sm font-bold text-slate-800">{details.displayScore} / {details.displayTotal}</span>
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-2">
                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
                              <div className="text-left">
                                <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 block mb-1">Direct Override</label>
                                <div className="flex items-center bg-slate-50 rounded-full border-2 border-slate-100 p-1 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400/50 transition-all w-fit">
                                  <button onClick={() => handleAdjustMark(sub, -1)} className="w-8 h-8 rounded-full hover:bg-white hover:text-blue-600 hover:shadow-sm flex items-center justify-center text-slate-500 transition-all font-black text-lg">-</button>
                                  <input
                                    type="number"
                                    className="w-16 text-center bg-transparent font-black text-xl text-slate-800 focus:outline-none placeholder:text-slate-300"
                                    placeholder="0"
                                    value={details.displayScore === 0 ? '0' : (details.displayScore || '')}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '') {
                                        updateSubChange(sub.id, 'final_score_override', 0);
                                      } else {
                                        const num = parseInt(val);
                                        if (!isNaN(num)) {
                                          updateSubChange(sub.id, 'final_score_override', Math.max(0, Math.min(details.displayTotal, num)));
                                        }
                                      }
                                    }}
                                  />
                                  <button onClick={() => handleAdjustMark(sub, 1)} className="w-8 h-8 rounded-full hover:bg-white hover:text-blue-600 hover:shadow-sm flex items-center justify-center text-slate-500 transition-all font-black text-lg">+</button>
                                </div>
                              </div>
                              {hasChanges && (
                                <button onClick={() => {
                                  updateSubChange(sub.id, 'final_score_override', null);
                                  updateSubChange(sub.id, 'admin_score_override', null);
                                  updateSubChange(sub.id, 'question_marks', {});
                                  updateSubChange(sub.id, 'calculated_score', sub.score * (sub.marks_per_question || 5));
                                  updateSubChange(sub.id, 'calculated_total', sub.total_questions * (sub.marks_per_question || 5));
                                  updateSubChange(sub.id, 'is_released', sub.is_released);
                                }} className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] hover:text-blue-500 transition-all underline underline-offset-4">Reset Changes</button>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                              <button 
                                type="button"
                                onClick={() => onViewBreakdown(sub, (qMarks, score, total) => {
                                  updateSubChange(sub.id, 'question_marks', qMarks);
                                  updateSubChange(sub.id, 'calculated_score', score);
                                  updateSubChange(sub.id, 'calculated_total', total);
                                  updateSubChange(sub.id, 'final_score_override', null);
                                })}
                                className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-2xl border border-slate-200 transition-all text-xs flex items-center justify-center gap-2 group w-full sm:w-auto"
                              >
                                <Eye className="w-4 h-4 group-hover:text-blue-500 transition-colors" /> Question Breakdowns
                              </button>
                              <button
                                onClick={() => updateSubChange(sub.id, 'is_released', !details.isReleased)}
                                className={`px-6 py-3 font-black rounded-2xl transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 w-full sm:w-auto ${details.isReleased
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600 ring-2 ring-emerald-500/20'
                                    : 'bg-slate-900 text-white shadow-slate-900/30 hover:bg-slate-800'
                                  }`}
                              >
                                {details.isReleased ? (
                                  <><CheckCircle className="w-4 h-4" /> Result Live</>
                                ) : (
                                  <><Send className="w-4 h-4" /> Publish Result</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            <div className="mt-16 pt-10 border-t border-slate-100 flex justify-center relative z-10">
              <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-14 rounded-full shadow-xl shadow-blue-600/30 transition-all hover:-translate-y-1 text-lg">
                Save Profile Changes
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const VerificationCard = ({ label, url, onView }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 group">
    <span className="text-[10px] font-black uppercase tracking-widest text-[#666666]">{label}</span>
    <div className="bg-black rounded-xl aspect-[1.5] overflow-hidden flex items-center justify-center relative cursor-pointer" onClick={() => url && onView && onView()}>
      {url ? (
        <img src={url} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
      ) : (
        <Shield className="w-8 h-8 text-slate-700" />
      )}
      {url && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Eye className="w-6 h-6 text-white" />
        </div>
      )}
    </div>
  </div>
);


const DeleteConfirmModal = ({ user, onClose, onConfirm }) => {
  return (
    <AnimatePresence>
      {user && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white max-w-sm w-full p-8 rounded-[2rem] shadow-2xl relative z-10 text-center"
          >
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Delete User?</h3>
            <p className="text-slate-500 text-sm mb-8">Are you sure you want to remove <strong className="text-slate-800">{user.full_name || user.email}</strong>? This action cannot be undone.</p>

            <div className="flex gap-4">
              <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={onConfirm} className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-colors">Delete</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Side Drawer Modal for robust View Profile
const ViewCandidateDrawer = ({ user, onClose, onViewDoc, onViewBreakdown }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [extraVideoUrl, setExtraVideoUrl] = useState(null);
  const [extraIpAddress, setExtraIpAddress] = useState(null);

  const { showAlert } = useAlert();
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin' || 
    profile?.email === 'kabirhaldar4444@gmail.com' || 
    profile?.email === 'admin@cambridgelearningservices.com' || 
    profile?.email === 'admin@cls.com' || 
    profile?.email === 'admin@pmi.com';

  const handleUpdateSubmission = async (subId, updates) => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update(updates)
        .eq('id', subId);

      if (error) throw error;

      setSubmissions(prev =>
        prev.map(s => (s.id === subId ? { ...s, ...updates } : s))
      );
      showAlert('Assessment updated successfully', 'success');
    } catch (error) {
      console.error(error);
      showAlert(error.message || 'Failed to update assessment', 'error');
    }
  };

  useEffect(() => {
    if (user) {
      document.body.style.overflow = 'hidden';
      fetchSubmissions();

      // If user has no video_url, query admissions table as fallback
      if (!user.video_url && (user.email || user.phone)) {
        const fetchAdmissionVideo = async () => {
          try {
            let query = supabase.from('admissions').select('video_url, ip_address');
            if (user.email) {
              query = query.ilike('email', user.email.trim());
            } else if (user.phone) {
              query = query.eq('phone', user.phone.trim());
            }
            const { data } = await query.order('created_at', { ascending: false }).limit(1);
            if (data && data[0]) {
              if (data[0].video_url) setExtraVideoUrl(data[0].video_url);
              if (data[0].ip_address) setExtraIpAddress(data[0].ip_address);
            }
          } catch (e) {
            console.error('Error fetching admission video fallback:', e);
          }
        };
        fetchAdmissionVideo();
      }
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; }
  }, [user]);

  // Privacy Masking Helpers
  const maskPhone = (phone) => {
    if (!phone) return '+91 - Not Provided';
    if (isSuperAdmin) return phone;
    return phone.replace(/(\d{4})\d{4}(\d{2})/, '$1XXXX$2');
  };

  const maskAddress = (address) => {
    if (!address) return 'Location Not Provided';
    if (isSuperAdmin) return address;
    return 'Privacy Protected';
  };

  const maskIP = (ip) => {
    if (!ip || ip === 'Capture Disabled') return ip || 'Capture Disabled';
    if (isSuperAdmin) return ip;
    return ip.replace(/\d+\.\d+$/, 'XXX.XXX');
  };

  const effectiveVideoUrl = user?.video_url || extraVideoUrl;
  const effectiveIpAddress = user?.ip_address || extraIpAddress;

  const fetchSubmissions = async () => {
    setLoadingSubs(true);
    try {
      const { data } = await supabase
        .from('submissions')
        .select('*, exams(title, marks_per_question)')
        .eq('user_id', user.id);
      setSubmissions(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSubs(false);
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-slate-50 w-full max-w-4xl max-h-[90vh] shadow-2xl relative z-10 flex flex-col overflow-hidden rounded-[2rem] border border-white"
          >
            {/* Drawer Header */}
            <div className="p-6 md:p-8 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {user.profile_photo_url ? <img src={user.profile_photo_url} className="w-full h-full object-cover" /> : user.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 leading-none mb-1">{user.full_name || 'Incomplete Profile'}</h2>
                  <div className="flex items-center gap-2 text-sm text-blue-500 font-medium">
                    {user.email}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-colors border border-slate-100 hover:border-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">

              <div className="grid md:grid-cols-2 gap-6">
                {/* Personal Details Card */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full text-xs font-bold tracking-wider uppercase text-slate-600 mb-6 border border-slate-200">
                    <User className="w-3.5 h-3.5" /> PERSONAL DETAILS
                  </div>

                  <h3 className="text-2xl font-black text-slate-800 mb-6">{user.full_name || '--'}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-blue-500 font-medium">
                      <Mail className="w-4 h-4" /> {user.email}
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 font-medium">
                      <Phone className="w-4 h-4" /> {maskPhone(user.phone)}
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 font-medium">
                      <MapPin className="w-4 h-4" /> {maskAddress(user.address)}
                    </div>
                  </div>
                </div>

                {/* Verification Metadata Card */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full text-xs font-bold tracking-wider uppercase text-slate-600 mb-6 border border-slate-200">
                    <Shield className="w-3.5 h-3.5" /> VERIFICATION
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Registration IP</p>
                      <p className="text-slate-800 font-mono font-bold text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 inline-block">{maskIP(effectiveIpAddress)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">KYC Status</p>
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.profile_completed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {user.profile_completed ? <CheckCircle className="w-3 h-3" /> : <RotateCw className="w-3 h-3" />}
                        {user.profile_completed ? 'COMPLETED' : 'INCOMPLETE'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100"><FileText className="w-5 h-5" /></div>
                  <h3 className="text-2xl font-black text-slate-800">Documents</h3>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DocumentWidget label="Live Photo" url={user.profile_photo_url} onView={() => onViewDoc({ label: "Live Photo", url: user.profile_photo_url })} />
                  <DocumentWidget label="Aadhar Front" url={user.aadhaar_front_url} restricted={!isSuperAdmin} onView={() => onViewDoc({ label: "Aadhar Front", url: user.aadhaar_front_url })} />
                  <DocumentWidget label="Aadhar Back" url={user.aadhaar_back_url} restricted={!isSuperAdmin} onView={() => onViewDoc({ label: "Aadhar Back", url: user.aadhaar_back_url })} />
                  <DocumentWidget label="PAN Card" url={user.pan_card_url} restricted={!isSuperAdmin} onView={() => onViewDoc({ label: "PAN Card", url: user.pan_card_url })} />
                  <DocumentWidget label="Signature" url={user.signature_url} restricted={!isSuperAdmin} onView={() => onViewDoc({ label: "Signature Scan", url: user.signature_url })} />
                  <DocumentWidget label="Video Statement" url={effectiveVideoUrl} isVideo={true} restricted={!isSuperAdmin} onView={() => onViewDoc({ label: "Video Verification Statement", url: effectiveVideoUrl, type: 'video' })} />
                </div>
              </div>

              {/* Exam Results Section */}
              <div>
                <h3 className="text-2xl font-black text-slate-800 mb-6 mt-12">Exam Results</h3>

                {loadingSubs ? (
                  <div className="p-10 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                    Fetching examination data...
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 bg-white rounded-3xl border border-slate-100">
                    No exam assessments completed by this candidate yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map(sub => (
                      <MockResultCard 
                        key={sub.id} 
                        submission={sub} 
                        onViewBreakdown={() => onViewBreakdown(sub, async (qMarks, score, total) => {
                          await handleUpdateSubmission(sub.id, {
                            question_marks: qMarks,
                            calculated_score: score,
                            calculated_total: total,
                            final_score_override: null
                          });
                        })} 
                        onUpdateScore={(newScore) => handleUpdateSubmission(sub.id, { final_score_override: newScore })}
                        onToggleRelease={() => handleUpdateSubmission(sub.id, { is_released: !sub.is_released })}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Close Profile Footer */}
              <div className="pt-10 pb-6 flex justify-center">
                <button onClick={onClose} className="px-8 py-3 bg-white text-slate-500 font-bold rounded-full border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm flex items-center gap-2">
                  <X className="w-4 h-4" /> Close Profile
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DocumentViewerOverlay = ({ doc, onClose }) => {
  return (
    <AnimatePresence>
      {doc && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-slate-900 p-2 rounded-3xl shadow-2xl relative z-10 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex justify-between items-center p-5 border-b border-white/10 shrink-0">
              <h4 className="text-white font-bold">{doc.label}</h4>
              <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-2xl bg-black/50 m-2 flex justify-center items-center">
              {doc.type === 'video' ? (
                <video src={doc.url} controls autoPlay className="max-w-full max-h-[70vh] object-contain p-2" />
              ) : (
                <img src={doc.url} alt={doc.label} className="max-w-full max-h-full object-contain p-2" />
              )}
            </div>
            <div className="p-4 flex justify-end border-t border-white/10 shrink-0">
              <a href={doc.url} download target="_blank" rel="noreferrer" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Open Original
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DocumentWidget = ({ label, url, onView, restricted, isVideo }) => (
  <div className={`group relative bg-white p-5 rounded-3xl border transition-all duration-300 ${restricted ? 'border-slate-100' : 'border-slate-100 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5'}`}>
    <div className="flex flex-col gap-4">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${restricted
            ? 'bg-amber-50 border-amber-100/50 text-amber-500'
            : url
              ? 'bg-blue-50 border-blue-100/50 text-blue-600'
              : 'bg-slate-50 border-slate-100 text-slate-300'
          }`}>
          {restricted ? <ShieldAlert className="w-5 h-5" /> : (url ? (isVideo ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />) : <X className="w-5 h-5" />)}
        </div>

        {restricted ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50/50 text-amber-600 text-[8px] font-black uppercase tracking-[0.15em] rounded-lg border border-amber-100/50">
            <Lock className="w-2.5 h-2.5" /> Restricted
          </div>
        ) : url ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50/50 text-emerald-600 text-[8px] font-black uppercase tracking-[0.15em] rounded-lg border border-emerald-100/50">
            <CheckCircle className="w-2.5 h-2.5" /> Verified
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50/50 text-rose-500 text-[8px] font-black uppercase tracking-[0.15em] rounded-lg border border-rose-100/50">
            <X className="w-2.5 h-2.5" /> Missing
          </div>
        )}
      </div>

      {/* Text Content */}
      <div className="min-h-[40px]">
        <h5 className="font-black text-slate-800 text-[14px] leading-tight mb-1">{label}</h5>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
          {restricted ? 'Hidden for Privacy' : (url ? 'Uploaded' : 'No Data')}
        </p>
      </div>

      {/* Button only for non-restricted uploaded docs - SMALL VERSION */}
      {!restricted && url && (
        <div className="pt-2">
          <button
            onClick={onView}
            className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg transition-all font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 hover:shadow-blue-500/20 active:scale-[0.98]"
          >
            <Eye className="w-3 h-3" /> View Document
          </button>
        </div>
      )}
    </div>
  </div>
);

// UI Only Match to the exact design provided by screenshots for Results
const MockResultCard = ({ submission, onViewBreakdown, onUpdateScore, onToggleRelease }) => {
  const details = getSubmissionMarksDetails(submission, null);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col gap-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-lg text-slate-800 leading-tight">{submission.exams?.title || 'Unknown Exam'}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 font-medium">
                Original Score: {submission.score} / {submission.total_questions}
              </span>
              {details.isOverridden && (
                <>
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[9px] font-black uppercase tracking-wider rounded border border-rose-100">
                    {details.overrideSource === 'question' ? 'Question Overrides' : 'Score Overridden'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-2xl font-outfit font-black text-slate-800">{details.displayScore}</span>
          <span className="text-slate-400 font-medium text-lg">/</span>
          <span className="text-slate-400 font-semibold text-lg">{details.displayTotal}</span>
          <span className="ml-2 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-black rounded-xl">
            {details.percentage}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div>
          <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Total Questions</span>
          <span className="text-sm font-bold text-slate-800">{details.totalQuestions}</span>
        </div>
        <div>
          <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Marks Per Q</span>
          <span className="text-sm font-bold text-slate-800">{details.marksPerQ}</span>
        </div>
        <div>
          <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Correct Answers</span>
          <span className="text-sm font-bold text-slate-800">{details.correctAnswers}</span>
        </div>
        <div>
          <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Final Score</span>
          <span className="text-sm font-bold text-slate-800">{details.displayScore} / {details.displayTotal}</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-2">
        <div className="flex items-center bg-white rounded-full border-2 border-slate-100 shadow-inner p-1 w-fit">
          <button 
            onClick={() => onUpdateScore(Math.max(0, details.displayScore - 1))}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors font-black text-lg"
          >
            -
          </button>
          <input
            type="number"
            className="w-12 text-center bg-transparent font-black text-xl text-slate-800 focus:outline-none placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={details.displayScore}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                onUpdateScore(0);
              } else {
                const num = parseInt(val);
                if (!isNaN(num)) {
                  onUpdateScore(Math.max(0, Math.min(details.displayTotal || 250, num)));
                }
              }
            }}
          />
          <button 
            onClick={() => onUpdateScore(Math.min(details.displayTotal || 250, details.displayScore + 1))}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors font-black text-lg"
          >
            +
          </button>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            type="button"
            onClick={onViewBreakdown}
            className="px-6 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl border border-blue-200 transition-colors text-sm flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Eye className="w-4 h-4" /> Question Breakdowns
          </button>
          <button 
            onClick={onToggleRelease}
            className={`px-6 py-2.5 font-bold rounded-xl shadow-lg transition-colors text-sm flex items-center justify-center gap-2 w-full md:w-auto ${
              submission.is_released 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
            }`}
          >
            {submission.is_released ? (
              <><CheckCircle className="w-4 h-4" /> Result Live</>
            ) : (
              <><Send className="w-4 h-4" /> Publish Score</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Question Breakdown Viewer Component
const QuestionBreakdownModal = ({ isOpen, onClose, submission, questions, loading, onSave }) => {
  const [localQuestionMarks, setLocalQuestionMarks] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const marksPerQ = submission?.marks_per_question || submission?.exams?.marks_per_question || 5;

  // Initialize local state when modal opens or submission changes
  useEffect(() => {
    if (isOpen && submission) {
      setLocalQuestionMarks(submission.question_marks || {});
    }
  }, [isOpen, submission]);

  // Compute question values
  const getQuestionValues = (idx, isCorrect) => {
    const qOverride = localQuestionMarks[idx] || {};
    const assigned = qOverride.assigned !== undefined ? qOverride.assigned : marksPerQ;
    const obtained = qOverride.obtained !== undefined ? qOverride.obtained : (isCorrect ? assigned : 0);
    return { assigned, obtained };
  };

  // Compute totals
  let computedTotal = 0;
  let computedObtained = 0;
  if (questions && questions.length > 0) {
    questions.forEach((q, idx) => {
      const isCorrect = (submission?.answers?.[idx] === q.correct_option);
      const { assigned, obtained } = getQuestionValues(idx, isCorrect);
      computedTotal += assigned;
      computedObtained += obtained;
    });
  }
  const computedPercentage = computedTotal > 0 ? Math.round((computedObtained / computedTotal) * 100) : 0;

  const updateLocalMark = (idx, field, rawValue) => {
    const val = rawValue === '' ? 0 : parseInt(rawValue);
    if (isNaN(val)) return;

    setLocalQuestionMarks(prev => {
      const qOverride = { ...(prev[idx] || {}) };
      const q = questions[idx];
      const isCorrect = (submission?.answers?.[idx] === q.correct_option);

      let currentAssigned = qOverride.assigned !== undefined ? qOverride.assigned : marksPerQ;
      let currentObtained = qOverride.obtained !== undefined ? qOverride.obtained : (isCorrect ? currentAssigned : 0);

      if (field === 'assigned') {
        const nextAssigned = Math.max(1, val);
        qOverride.assigned = nextAssigned;
        if (currentObtained > nextAssigned) {
          qOverride.obtained = nextAssigned;
        } else {
          qOverride.obtained = currentObtained;
        }
      } else if (field === 'obtained') {
        qOverride.obtained = Math.max(0, Math.min(currentAssigned, val));
        qOverride.assigned = currentAssigned;
      }

      return {
        ...prev,
        [idx]: qOverride
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(localQuestionMarks, computedObtained, computedTotal);
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white max-w-2xl w-full rounded-[2rem] shadow-2xl relative z-10 flex flex-col overflow-hidden max-h-[85vh] border border-slate-100"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-start shrink-0">
              <div className="flex gap-3 items-center">
                <div className="bg-white/20 p-2.5 rounded-[10px] backdrop-blur-md">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight">Question Breakdown</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-white/80 text-[11px] font-medium mt-1">
                    <span>{submission?.exams?.title || 'Exam Assessment'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded font-black text-white">
                      Current Score: {computedObtained} / {computedTotal} ({computedPercentage}%)
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex shrink-0 mt-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="font-bold text-xs uppercase tracking-wider">Loading assessment data...</span>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center text-slate-400 py-10 font-medium">
                  No questions found for this examination.
                </div>
              ) : (
                questions.map((q, idx) => {
                  const candidateAnswerIdx = submission?.answers?.[idx];
                  const isCorrect = candidateAnswerIdx === q.correct_option;
                  const isNotAttempted = candidateAnswerIdx === undefined || candidateAnswerIdx === null;
                  const { assigned, obtained } = getQuestionValues(idx, isCorrect);

                  return (
                    <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3 justify-between">
                          <div className="flex gap-2.5 items-start">
                            <span className="bg-slate-100 text-slate-800 text-xs font-black w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <h4 className="font-bold text-slate-800 text-sm md:text-base leading-snug">
                              {q.question_text}
                            </h4>
                          </div>

                          {isNotAttempted ? (
                            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-full shrink-0 border border-slate-200">
                              Unattempted
                            </span>
                          ) : isCorrect ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full shrink-0 border border-emerald-100">
                              Correct
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest rounded-full shrink-0 border border-rose-100">
                              Incorrect
                            </span>
                          )}
                        </div>

                        {/* Interactive Question Marks Entry Panel */}
                        <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 w-fit ml-8">
                          <div className="flex items-center gap-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Obtained</label>
                            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5">
                              <button 
                                type="button"
                                onClick={() => updateLocalMark(idx, 'obtained', obtained - 1)}
                                className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors font-bold text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                className="w-10 text-center bg-transparent font-bold text-xs text-slate-800 focus:outline-none"
                                value={obtained}
                                onChange={e => updateLocalMark(idx, 'obtained', e.target.value)}
                              />
                              <button 
                                type="button"
                                onClick={() => updateLocalMark(idx, 'obtained', obtained + 1)}
                                className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          
                          <div className="h-4 w-px bg-slate-200" />
                          
                          <div className="flex items-center gap-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Max</label>
                            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5">
                              <button 
                                type="button"
                                onClick={() => updateLocalMark(idx, 'assigned', assigned - 1)}
                                className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors font-bold text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                className="w-10 text-center bg-transparent font-bold text-xs text-slate-800 focus:outline-none"
                                value={assigned}
                                onChange={e => updateLocalMark(idx, 'assigned', e.target.value)}
                              />
                              <button 
                                type="button"
                                onClick={() => updateLocalMark(idx, 'assigned', assigned + 1)}
                                className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8">
                        {q.options.map((option, optIdx) => {
                          const isOptionCorrect = optIdx === q.correct_option;
                          const isOptionSelected = optIdx === candidateAnswerIdx;

                          let optionStyle = "border-slate-100 bg-slate-50/50 text-slate-600";
                          let badge = null;

                          if (isOptionCorrect) {
                            optionStyle = "border-emerald-200 bg-emerald-50 text-emerald-800 font-bold";
                            badge = <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 ml-auto">Correct Choice</span>;
                          } else if (isOptionSelected && !isCorrect) {
                            optionStyle = "border-rose-200 bg-rose-50 text-rose-800 font-bold";
                            badge = <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 ml-auto">Your Choice</span>;
                          }

                          return (
                            <div key={optIdx} className={`p-3 border rounded-xl flex items-center gap-3 text-xs transition-all ${optionStyle}`}>
                              <span className={`w-5 h-5 rounded flex items-center justify-center font-black text-xs shrink-0 ${isOptionCorrect ? 'bg-emerald-500 text-white' : isOptionSelected ? 'bg-rose-500 text-white' : 'bg-white border text-slate-400'}`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{option}</span>
                              {badge}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
              <button 
                onClick={onClose} 
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={isSaving}
                onClick={handleSave} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Breakdown Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Users;
