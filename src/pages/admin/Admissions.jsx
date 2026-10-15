import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, User, Mail, Phone, MapPin, Calendar, Network,
  CheckCircle, Loader2, RefreshCw, X, Download, ShieldAlert, Eye, Copy, Check, ChevronDown, BookOpen,
  UserX, AlertTriangle, Key, ShieldCheck
} from 'lucide-react';
import { useAlert } from '../../context/AlertProvider';

// Helper to detect if a URL points to video media
const isVideoMedia = (url) => {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return lower.includes('.webm') || lower.includes('.mp4') || lower.includes('profile_video') || lower.includes('video_statement') || lower.startsWith('data:video/');
};

// Generates 2-letter uppercase monogram initials from candidate full name
const getCandidateInitials = (name) => {
  if (!name || typeof name !== 'string') return 'C';
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'C';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Deterministic vibrant gradient pairing based on name
const getCandidateGradient = (name) => {
  const gradients = [
    'from-indigo-600 to-violet-700',
    'from-blue-600 to-indigo-700',
    'from-emerald-600 to-teal-700',
    'from-violet-600 to-purple-800',
    'from-amber-600 to-orange-700',
    'from-rose-600 to-pink-700',
    'from-cyan-600 to-blue-700',
  ];
  if (!name) return gradients[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

const CandidateAvatar = ({ photoUrl, videoUrl, name, status }) => {
  const [imgError, setImgError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Check if photoUrl is actually a video file (.webm/.mp4) from previous submissions
  const photoIsVideo = isVideoMedia(photoUrl);
  const effectiveVideo = photoIsVideo ? photoUrl : (isVideoMedia(videoUrl) ? videoUrl : null);
  const effectivePhoto = !photoIsVideo ? photoUrl : null;

  return (
    <div className="w-20 h-20 rounded-full border-4 border-white shadow-xl overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center relative select-none">
      {/* 1. Try Image First (if provided and not a video file) */}
      {effectivePhoto && !imgError ? (
        <img
          src={effectivePhoto}
          alt={name ? `${name}'s profile` : 'Candidate profile'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : effectiveVideo && !videoError ? (
        /* 2. Seamless looping muted video statement frame playback */
        <video
          src={effectiveVideo}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover scale-105 pointer-events-none"
          onError={() => setVideoError(true)}
        />
      ) : (
        /* 3. Monogram Gradient Initials Fallback (never broken) */
        <div className={`w-full h-full bg-gradient-to-tr ${getCandidateGradient(name)} flex items-center justify-center text-white font-outfit font-black text-xl tracking-wider`}>
          {getCandidateInitials(name)}
        </div>
      )}

      {/* Verified / Approved status badge */}
      {status === 'approved' && (
        <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm" title="Approved Candidate">
          <Check className="w-3 h-3 stroke-[3]" />
        </div>
      )}
    </div>
  );
};

const AdmissionsManagement = () => {
  const { showAlert } = useAlert();
  const [admissions, setAdmissions] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  
  // Modals and overlay views
  const [globalViewingDoc, setGlobalViewingDoc] = useState(null);
  const [approvingAdmission, setApprovingAdmission] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [allottedExamIds, setAllottedExamIds] = useState([]);
  const [examDropdownOpen, setExamDropdownOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalSuccessDetails, setApprovalSuccessDetails] = useState(null);
  const [rejectingAdmission, setRejectingAdmission] = useState(null);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [admissionsRes, examsRes, profilesRes] = await Promise.all([
        supabase.from('admissions').select('*').order('created_at', { ascending: false }),
        supabase.from('exams').select('*').order('title'),
        supabase.from('profiles').select('*').eq('role', 'candidate')
      ]);

      if (admissionsRes.error) console.warn('Admissions fetch notice:', admissionsRes.error);
      if (examsRes.error) console.warn('Exams fetch notice:', examsRes.error);

      let dbAdmissions = admissionsRes.data || [];
      const examsList = examsRes.data || [];
      const candidateProfiles = profilesRes.data || [];

      // Read localStorage backups
      let localAdmissions = [];
      try {
        const rawLocal = localStorage.getItem('cambridge_admissions') || localStorage.getItem('harvard_admissions') || '[]';
        localAdmissions = JSON.parse(rawLocal);
        if (!Array.isArray(localAdmissions)) localAdmissions = [];
      } catch (e) {
        localAdmissions = [];
      }

      // Sanitize local admissions: if profile_photo_url contains video (.webm), ensure video_url is populated
      let hasLocalChanges = false;
      localAdmissions = localAdmissions.map(adm => {
        let changed = false;
        let vUrl = adm.video_url;
        let pUrl = adm.profile_photo_url;
        if (pUrl && (pUrl.includes('.webm') || pUrl.includes('profile_video_'))) {
          if (!vUrl) {
            vUrl = pUrl;
            changed = true;
          }
        }
        if (changed) hasLocalChanges = true;
        return {
          ...adm,
          video_url: vUrl,
          profile_photo_url: pUrl
        };
      });

      if (hasLocalChanges) {
        try {
          localStorage.setItem('cambridge_admissions', JSON.stringify(localAdmissions));
        } catch (e) {}
      }

      // 1. Sync any local admissions that are not in DB
      for (const localAdm of localAdmissions) {
        if (!localAdm.email) continue;
        const existsInDb = dbAdmissions.some(
          a => a.email?.toLowerCase().trim() === localAdm.email.toLowerCase().trim()
        );
        if (!existsInDb) {
          const newAdmPayload = {
            full_name: localAdm.full_name || 'Candidate',
            email: localAdm.email.toLowerCase().trim(),
            phone: localAdm.phone && !localAdm.phone.startsWith('NO_PHONE') ? localAdm.phone : 'N/A',
            course_name: localAdm.course_name || 'Cambridge Examination',
            pincode: localAdm.pincode || '',
            state: localAdm.state || '',
            city: localAdm.city || '',
            address: localAdm.address || '',
            aadhaar_front_url: localAdm.aadhaar_front_url || '',
            aadhaar_back_url: localAdm.aadhaar_back_url || '',
            pan_url: localAdm.pan_url || '',
            signature_url: localAdm.signature_url || '',
            profile_photo_url: localAdm.profile_photo_url || localAdm.video_url || '',
            video_url: localAdm.video_url || '',
            ip_address: localAdm.ip_address || 'Not captured',
            status: localAdm.status || 'pending',
            created_at: localAdm.created_at || new Date().toISOString()
          };

          try {
            const { data: insData } = await supabase
              .from('admissions')
              .insert([newAdmPayload])
              .select();
            if (insData && insData[0]) {
              dbAdmissions.unshift(insData[0]);
            } else {
              dbAdmissions.unshift({ ...newAdmPayload, id: localAdm.id || `LOCAL-${Date.now()}` });
            }
          } catch (e) {
            dbAdmissions.unshift({ ...newAdmPayload, id: localAdm.id || `LOCAL-${Date.now()}` });
          }
        }
      }

      // 2. Sync candidates from profiles who completed their profile or uploaded KYC documents
      for (const prof of candidateProfiles) {
        if (!prof.email) continue;
        const hasKycOrCompleted = prof.profile_completed || prof.video_url || prof.aadhaar_front_url || prof.signature_url;
        if (!hasKycOrCompleted) continue;

        const existsInDb = dbAdmissions.some(
          a => a.email?.toLowerCase().trim() === prof.email.toLowerCase().trim()
        );

        if (!existsInDb) {
          const isAllotted = Array.isArray(prof.allotted_exam_ids) && prof.allotted_exam_ids.length > 0;
          const newAdmFromProf = {
            full_name: prof.full_name || prof.email.split('@')[0],
            email: prof.email.toLowerCase().trim(),
            phone: prof.phone && !prof.phone.startsWith('NO_PHONE') ? prof.phone : 'N/A',
            course_name: 'Cambridge Examination',
            pincode: prof.pincode || '',
            state: prof.state || '',
            city: prof.city || '',
            address: prof.address || '',
            aadhaar_front_url: prof.aadhaar_front_url || '',
            aadhaar_back_url: prof.aadhaar_back_url || '',
            pan_url: prof.pan_card_url || prof.pan_url || '',
            signature_url: prof.signature_url || '',
            profile_photo_url: prof.profile_photo_url || prof.video_url || '',
            video_url: prof.video_url || '',
            ip_address: prof.ip_address || 'Not captured',
            status: isAllotted ? 'approved' : 'pending',
            created_at: prof.created_at || new Date().toISOString(),
            profile_id: prof.id,
            allotted_exam_ids: prof.allotted_exam_ids || []
          };

          try {
            const { data: insData } = await supabase
              .from('admissions')
              .insert([newAdmFromProf])
              .select();
            if (insData && insData[0]) {
              dbAdmissions.unshift(insData[0]);
            } else {
              dbAdmissions.unshift({ ...newAdmFromProf, id: prof.id });
            }
          } catch (e) {
            dbAdmissions.unshift({ ...newAdmFromProf, id: prof.id });
          }
        }
      }

      // Deduplicate admissions by email
      const uniqueAdmissions = [];
      const seenEmails = new Set();
      for (const adm of dbAdmissions) {
        const em = (adm.email || '').toLowerCase().trim();
        if (!em || seenEmails.has(em)) continue;
        seenEmails.add(em);
        uniqueAdmissions.push(adm);
      }

      setAdmissions(uniqueAdmissions);
      setExams(examsList);
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
    setAllottedExamIds(admission.allotted_exam_ids || []);
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

      // 1. Ensure target admission has a valid UUID in the public.admissions table
      let targetAdmissionId = approvingAdmission.id;
      const isTemporaryId = typeof targetAdmissionId === 'string' && (
        targetAdmissionId.startsWith('CLS-ADM-') || 
        targetAdmissionId.startsWith('LOCAL-') ||
        targetAdmissionId.length < 30
      );

      if (isTemporaryId) {
        const { data: foundDb } = await supabase
          .from('admissions')
          .select('id')
          .eq('email', approvingAdmission.email.toLowerCase().trim())
          .maybeSingle();

        if (foundDb && foundDb.id) {
          targetAdmissionId = foundDb.id;
        } else {
          const { data: insData, error: insErr } = await supabase
            .from('admissions')
            .insert([{
              full_name: approvingAdmission.full_name,
              email: approvingAdmission.email.toLowerCase().trim(),
              phone: approvingAdmission.phone || 'N/A',
              course_name: approvingAdmission.course_name || 'Cambridge Examination',
              pincode: approvingAdmission.pincode || '',
              state: approvingAdmission.state || '',
              city: approvingAdmission.city || '',
              address: approvingAdmission.address || '',
              aadhaar_front_url: approvingAdmission.aadhaar_front_url || '',
              aadhaar_back_url: approvingAdmission.aadhaar_back_url || '',
              pan_url: approvingAdmission.pan_url || approvingAdmission.pan_card_url || '',
              signature_url: approvingAdmission.signature_url || '',
              profile_photo_url: approvingAdmission.profile_photo_url || approvingAdmission.video_url || '',
              video_url: approvingAdmission.video_url || '',
              ip_address: approvingAdmission.ip_address || 'Not captured',
              status: 'pending'
            }])
            .select();

          if (insErr) throw insErr;
          if (insData && insData[0]) targetAdmissionId = insData[0].id;
        }
      }

      // 2. Ensure phone format is safe for Postgres unique/not-null checks
      let phoneVal = approvingAdmission.phone?.trim();
      let wasPlaceholderPhone = false;
      if (!phoneVal || phoneVal === '' || phoneVal === '+91' || phoneVal === 'N/A' || phoneVal.startsWith('NO_PHONE')) {
        const safePhone = `NO_PHONE_${targetAdmissionId.replace(/-/g, '').slice(0, 10)}`;
        await supabase.from('admissions').update({ phone: safePhone }).eq('id', targetAdmissionId);
        approvingAdmission.phone = safePhone;
        wasPlaceholderPhone = true;
      }

      // 3. Check if user account already exists in auth.users by email
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', approvingAdmission.email.toLowerCase().trim())
        .maybeSingle();

      if (existingUser) {
        try {
          await supabase.rpc('delete_user_by_id', { p_user_id: existingUser.id });
        } catch (delErr) {
          console.warn('Notice removing existing account before fresh credentials creation:', delErr);
        }
      }

      // 4. Call create_user_from_admission RPC on Supabase
      const { data: newUserId, error } = await supabase.rpc('create_user_from_admission', {
        p_admission_id: targetAdmissionId,
        p_password: generatedPassword,
        p_exam_id: primaryExamId
      });

      if (error) {
        if (error.code === 'P0001') {
          throw new Error(error.message);
        }
        throw error;
      }

      // 5. Sync profile updates (allotted exams, video_url, ip_address, permissions)
      if (newUserId) {
        const profileUpdates = {
          allotted_exam_ids: allottedExamIds,
          profile_completed: true,
          disclaimer_accepted: true,
          is_exam_locked: false,
          can_register: true
        };
        if (approvingAdmission.video_url) profileUpdates.video_url = approvingAdmission.video_url;
        if (approvingAdmission.ip_address) profileUpdates.ip_address = approvingAdmission.ip_address;
        if (wasPlaceholderPhone) {
          profileUpdates.phone = null;
        }

        try {
          await supabase.from('profiles').update(profileUpdates).eq('id', newUserId);
        } catch (e) {
          if (allottedExamIds.length > 0) {
            await supabase.from('profiles').update({ allotted_exam_ids: allottedExamIds }).eq('id', newUserId);
          }
        }
      }

      // 6. Sync localStorage
      try {
        const rawLocal = localStorage.getItem('cambridge_admissions') || '[]';
        let localList = JSON.parse(rawLocal);
        localList = localList.map(item => {
          if (item.email?.toLowerCase().trim() === approvingAdmission.email?.toLowerCase().trim()) {
            return { ...item, status: 'approved', id: targetAdmissionId };
          }
          return item;
        });
        localStorage.setItem('cambridge_admissions', JSON.stringify(localList));
      } catch (e) {
        console.warn('LocalStorage status sync notice:', e);
      }

      setApprovalSuccessDetails({
        fullName: approvingAdmission.full_name,
        email: approvingAdmission.email,
        password: generatedPassword,
        allottedCount: allottedExamIds.length
      });

      showAlert('Admission approved & Candidate account created successfully!', 'success');
      
      // Update local state list
      setAdmissions(prev => prev.map(a => 
        (a.id === approvingAdmission.id || a.email?.toLowerCase().trim() === approvingAdmission.email?.toLowerCase().trim())
          ? { ...a, id: targetAdmissionId, status: 'approved', allotted_exam_ids: allottedExamIds }
          : a
      ));

    } catch (err) {
      console.error(err);
      showAlert(err.message || 'Error approving admission.', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleOpenRejectModal = (admission) => {
    setRejectingAdmission(admission);
  };

  const handleConfirmReject = async () => {
    if (!rejectingAdmission) return;
    setRejecting(true);
    try {
      let targetId = rejectingAdmission.id;
      const isTemporaryId = typeof targetId === 'string' && (
        targetId.startsWith('CLS-ADM-') || 
        targetId.startsWith('LOCAL-') ||
        targetId.length < 30
      );

      if (isTemporaryId) {
        const { data: foundDb } = await supabase
          .from('admissions')
          .select('id')
          .eq('email', rejectingAdmission.email.toLowerCase().trim())
          .maybeSingle();
        if (foundDb?.id) targetId = foundDb.id;
      }

      if (targetId && !isTemporaryId) {
        const { error } = await supabase
          .from('admissions')
          .update({ status: 'rejected' })
          .eq('id', targetId);

        if (error) throw error;
      }

      // Also sync localStorage
      try {
        const rawLocal = localStorage.getItem('cambridge_admissions') || '[]';
        let localList = JSON.parse(rawLocal);
        localList = localList.map(item => {
          if (item.email?.toLowerCase().trim() === rejectingAdmission.email?.toLowerCase().trim()) {
            return { ...item, status: 'rejected' };
          }
          return item;
        });
        localStorage.setItem('cambridge_admissions', JSON.stringify(localList));
      } catch (e) {}

      showAlert(`Application for ${rejectingAdmission.full_name} rejected.`, 'info');
      setAdmissions(prev => prev.map(a => 
        (a.id === rejectingAdmission.id || a.email?.toLowerCase().trim() === rejectingAdmission.email?.toLowerCase().trim())
          ? { ...a, status: 'rejected' }
          : a
      ));
      setRejectingAdmission(null);
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'Error rejecting application.', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const filteredAdmissions = admissions.filter(a => {
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch = (a.full_name || '').toLowerCase().includes(searchLower) ||
      (a.email || '').toLowerCase().includes(searchLower) ||
      (a.course_name || '').toLowerCase().includes(searchLower);
    
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  const stats = {
    pendingCount: admissions.filter(a => a.status === 'pending').length,
    approvedCount: admissions.filter(a => a.status === 'approved').length,
    rejectedCount: admissions.filter(a => a.status === 'rejected').length,
    totalCount: admissions.length
  };

  return (
    <div className="space-y-8 animate-fade-in relative font-outfit">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">Admin Dashboard</h1>
          <p className="text-slate-500 font-medium">Orchestrating examination protocols, admissions, and candidate credentials</p>
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

      {/* Sub-header with interactive filter tabs */}
      <div className="bg-white/70 border border-white/80 backdrop-blur-xl px-6 sm:px-8 py-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5 shadow-sm">
        <div>
          <h3 className="text-lg font-black text-slate-800">Candidate Admissions Queue</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Review documentation, verify KYC, and provision exam access.</p>
        </div>
        
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl text-center transition-all ${
              statusFilter === 'pending'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                : 'bg-indigo-50/80 border border-indigo-100 text-indigo-700 hover:bg-indigo-100/70'
            }`}
          >
            <span className="block text-xl font-black leading-none">{stats.pendingCount}</span>
            <span className={`text-[10px] font-black uppercase tracking-wider mt-1 block ${statusFilter === 'pending' ? 'text-indigo-100' : 'text-indigo-600/70'}`}>Pending Review</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl text-center transition-all ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                : 'bg-emerald-50/80 border border-emerald-100 text-emerald-700 hover:bg-emerald-100/70'
            }`}
          >
            <span className="block text-xl font-black leading-none">{stats.approvedCount}</span>
            <span className={`text-[10px] font-black uppercase tracking-wider mt-1 block ${statusFilter === 'approved' ? 'text-emerald-100' : 'text-emerald-600/70'}`}>Approved Users</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl text-center transition-all ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25 scale-[1.02]'
                : 'bg-rose-50/80 border border-rose-100 text-rose-700 hover:bg-rose-100/70'
            }`}
          >
            <span className="block text-xl font-black leading-none">{stats.rejectedCount}</span>
            <span className={`text-[10px] font-black uppercase tracking-wider mt-1 block ${statusFilter === 'rejected' ? 'text-rose-100' : 'text-rose-600/70'}`}>Rejected</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2.5 rounded-2xl text-center transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/25 scale-[1.02]'
                : 'bg-slate-100 border border-slate-200/80 text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            <span className="block text-xl font-black leading-none">{stats.totalCount}</span>
            <span className={`text-[10px] font-black uppercase tracking-wider mt-1 block ${statusFilter === 'all' ? 'text-slate-200' : 'text-slate-500'}`}>All</span>
          </button>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white/40 border border-white/40 rounded-3xl backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="font-bold text-xs uppercase tracking-wider">Synchronizing admissions directory...</span>
        </div>
      ) : filteredAdmissions.length === 0 ? (
        <div className="text-center py-16 bg-white/40 border border-white/40 rounded-3xl backdrop-blur-sm shadow-sm flex flex-col items-center">
          <FileText className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-800 text-base">
            {statusFilter === 'pending' ? 'No Pending Admissions' :
             statusFilter === 'approved' ? 'No Approved Candidates' :
             statusFilter === 'rejected' ? 'No Rejected Applications' : 'No Admissions Found'}
          </h3>
          <p className="text-slate-400 text-xs font-medium mt-1">
            {statusFilter === 'pending' 
              ? 'There are currently no admission applications awaiting review.'
              : `No candidate records match the '${statusFilter}' filter.`}
          </p>
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
              className="bg-white/70 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2rem] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:shadow-md transition-all duration-300 shadow-sm"
            >
              {/* Left Column: Avatar & Personal Info */}
              <div className="flex items-start md:items-center gap-5 flex-1 min-w-0">
                {/* Profile Avatar */}
                <CandidateAvatar
                  photoUrl={adm.profile_photo_url}
                  videoUrl={adm.video_url}
                  name={adm.full_name}
                  status={adm.status}
                />

                {/* Candidate Info Grid */}
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-outfit font-black text-xl text-slate-800 truncate">{adm.full_name}</h4>
                      {adm.status === 'approved' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                          Active
                        </span>
                      )}
                      {adm.status === 'rejected' && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[9px] font-black uppercase tracking-wider">
                          Rejected
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 mt-2 text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{adm.email}</span>
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

              {/* Middle & Right Row: Meta details, Docs review row, Actions */}
              <div className="flex flex-col gap-4 w-full lg:w-auto lg:items-end justify-between self-stretch shrink-0">
                
                {/* Date and IP Metadata */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold text-slate-400 justify-start lg:justify-end">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-300" />
                    <span>SUBMITTED: {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Network className="w-3 h-3 text-slate-300" />
                    <span>IP: {adm.ip_address || 'Not captured'}</span>
                  </div>
                </div>

                {/* Media assets review buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const vUrl = adm.video_url || (isVideoMedia(adm.profile_photo_url) ? adm.profile_photo_url : '');
                      setGlobalViewingDoc({ url: vUrl, label: 'Live Video Statement', type: 'video' });
                    }}
                    disabled={!adm.video_url && !isVideoMedia(adm.profile_photo_url)}
                    className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-500 transition-colors border border-rose-100 disabled:opacity-40"
                  >
                    Video
                  </button>
                  <button
                    onClick={() => {
                      const isVid = isVideoMedia(adm.profile_photo_url);
                      setGlobalViewingDoc({ 
                        url: adm.profile_photo_url, 
                        label: 'Candidate Profile Photo', 
                        type: isVid ? 'video' : 'image' 
                      });
                    }}
                    disabled={!adm.profile_photo_url}
                    className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl bg-violet-50 hover:bg-violet-100/80 text-violet-600 transition-colors border border-violet-100 disabled:opacity-40"
                  >
                    Photo
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

                {/* Status action buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {adm.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleOpenRejectModal(adm)}
                        className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <UserX className="w-4 h-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleOpenApproveModal(adm)}
                        className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        Accept & Create User ✓
                      </button>
                    </>
                  ) : adm.status === 'approved' ? (
                    <>
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Approved & Enrolled</span>
                      </div>
                      <button
                        onClick={() => handleOpenApproveModal(adm)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                        title="Re-assign exams or reset credentials"
                      >
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        Manage Creds
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Rejected Application</span>
                      </div>
                      <button
                        onClick={() => handleOpenApproveModal(adm)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                      >
                        Reconsider & Approve ✓
                      </button>
                    </>
                  )}
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
                {(globalViewingDoc.type === 'video' || isVideoMedia(globalViewingDoc.url)) ? (
                  <video src={globalViewingDoc.url} controls autoPlay className="max-w-full max-h-[70vh] object-contain p-2 rounded-xl" />
                ) : (
                  <img src={globalViewingDoc.url} alt={globalViewingDoc.label} className="max-w-full max-h-[70vh] object-contain p-2 rounded-xl" />
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
              className="bg-white max-w-[460px] w-full rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden border border-slate-100"
            >
              
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-start shrink-0">
                <div className="flex gap-3 items-center">
                  <div className="bg-white/10 p-2.5 rounded-[12px] backdrop-blur-md">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg leading-tight">Approve Application</h3>
                    <p className="text-slate-300 text-[11px] font-medium mt-0.5">Register user credentials & allot examinations</p>
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
                          Allot Exam Assignment (Mandatory to attend exam)
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
                            <span className="text-slate-400 text-sm font-medium">Select exam(s) to allot...</span>
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
                              <p className="p-3 text-xs text-slate-400 text-center font-medium">No exams available in system</p>
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
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-2">Login Password</label>
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
                      <p className="text-[9px] text-amber-600 font-bold ml-2">⚠️ Make sure to copy this password so the candidate can log in to attend their exam.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <button
                        onClick={handleConfirmApproval}
                        disabled={approving}
                        className="w-full py-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] transition-all"
                      >
                        {approving ? (
                          <>
                            <Loader2 className="animate-spin w-4 h-4" />
                            Provisioning Account & Allotting Exam...
                          </>
                        ) : (
                          'Confirm & Create Candidate Account ✓'
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
                      <h4 className="font-outfit font-black text-lg text-slate-900">Account Credentials Ready!</h4>
                      <p className="text-slate-400 text-xs mt-1">The candidate can now log in at the portal and attend the exam.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Candidate Name</span>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{approvalSuccessDetails.fullName}</p>
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Registered Login Email</span>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-sm font-bold text-slate-800 truncate select-all">{approvalSuccessDetails.email}</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(approvalSuccessDetails.email);
                              showAlert('Email copied to clipboard!', 'success');
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors shrink-0"
                            title="Copy Email"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Account Password</span>
                        <div className="flex justify-between items-center mt-1 bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl">
                          <p className="text-sm font-black text-amber-900 select-all tracking-wider">{approvalSuccessDetails.password}</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(approvalSuccessDetails.password);
                              showAlert('Password copied to clipboard!', 'success');
                            }}
                            className="p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg transition-colors border border-amber-200 shrink-0"
                            title="Copy Password"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Allotted Examinations</span>
                        <p className="text-xs font-bold text-slate-700 mt-1">
                          {approvalSuccessDetails.allottedCount > 0 
                            ? `${approvalSuccessDetails.allottedCount} exam(s) successfully allotted` 
                            : 'No exams allotted'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setApprovingAdmission(null);
                        setApprovalSuccessDetails(null);
                        fetchData();
                      }}
                      className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider transition-colors shadow-lg active:scale-[0.99]"
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

      {/* Confirmation Modal for Rejecting Candidate */}
      <AnimatePresence>
        {rejectingAdmission && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !rejecting && setRejectingAdmission(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 z-10 font-outfit"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 text-center">
                Confirm Candidate Rejection
              </h3>
              <p className="text-slate-500 text-xs text-center mt-2 leading-relaxed font-medium">
                Are you sure you want to reject the application for{' '}
                <span className="font-bold text-slate-800">{rejectingAdmission.full_name}</span>{' '}
                ({rejectingAdmission.email})?
              </p>
              <p className="text-slate-400 text-[11px] text-center mt-1">
                This action will mark the admission application as <strong className="text-red-500 font-bold">Rejected</strong>.
              </p>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  disabled={rejecting}
                  onClick={() => setRejectingAdmission(null)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={rejecting}
                  onClick={handleConfirmReject}
                  className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {rejecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <UserX className="w-4 h-4" />
                      Confirm Reject
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AdmissionsManagement;
