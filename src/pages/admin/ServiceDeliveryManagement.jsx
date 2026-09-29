import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  User, 
  Truck, 
  Edit3, 
  Save, 
  RotateCcw, 
  ChevronRight, 
  ArrowRight, 
  ArrowLeft,
  Sparkles, 
  Loader2, 
  ShieldCheck,
  Check,
  Award,
  BookOpen,
  Mail,
  X,
  ChevronLeft,
  FileCheck
} from 'lucide-react';
import { SERVICE_DELIVERY_STEPS } from '../candidate/ServiceDelivery';

const ServiceDeliveryManagement = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'completed', 'in_progress'
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [viewMode, setViewMode] = useState('directory'); // 'directory' | 'detail'

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'candidate')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const list = (data || []).map(item => ({ 
        ...item, 
        service_delivery_step: item.service_delivery_step !== undefined && item.service_delivery_step !== null 
          ? Number(item.service_delivery_step) 
          : 9 
      }));

      setCandidates(list);
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper for Initials (e.g. "BALAMURUGAN S" -> "BS")
  const getInitials = (name) => {
    if (!name) return 'BS';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Clickable Step Tracker: Updates candidate completion stage immediately & syncs to Supabase
  const handleUpdateStep = async (candidateId, newStep) => {
    const clampedStep = Math.max(1, Math.min(9, newStep));
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, service_delivery_step: clampedStep } : c));
    if (selectedCandidate?.id === candidateId) {
      setSelectedCandidate(prev => ({ ...prev, service_delivery_step: clampedStep }));
    }

    // Persist to Supabase database
    try {
      if (candidateId) {
        await supabase
          .from('profiles')
          .update({ service_delivery_step: clampedStep })
          .eq('id', candidateId);
      }
    } catch (e) {
      console.error('Database update error:', e);
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        (c.full_name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.phone || '').includes(term) ||
        (c.course_name || '').toLowerCase().includes(term);

      const currentStep = c.service_delivery_step !== undefined && c.service_delivery_step !== null ? Number(c.service_delivery_step) : 9;
      if (filterStatus === 'completed') return matchesSearch && currentStep >= 9;
      if (filterStatus === 'in_progress') return matchesSearch && currentStep < 9;
      return matchesSearch;
    });
  }, [candidates, searchTerm, filterStatus]);

  const handleSelectCandidate = (cand) => {
    setSelectedCandidate(cand);
    setViewMode('detail');
  };

  const activeStep = selectedCandidate?.service_delivery_step ?? 9;
  const isSelectedCompleted = activeStep >= 9;

  return (
    <div className="space-y-8">
      {viewMode === 'directory' ? (
        <div className="space-y-8">
          {/* Header & Stats */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-outfit font-black text-slate-900 tracking-tight">Service Delivery Management</h1>
              <p className="text-sm font-medium text-slate-500">Track and manage candidate 9-stage service delivery lifecycle</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
                <span className="text-lg font-black text-slate-900 font-outfit">{candidates.length}</span>
              </div>
              <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
                <span className="text-lg font-black text-emerald-700 font-outfit">
                  {candidates.filter(c => (c.service_delivery_step ?? 9) >= 9).length}
                </span>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidates by name, email or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  filterStatus === 'all' ? 'bg-primary-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({candidates.length})
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  filterStatus === 'completed' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Completed ({candidates.filter(c => (c.service_delivery_step ?? 9) >= 9).length})
              </button>
              <button
                onClick={() => setFilterStatus('in_progress')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  filterStatus === 'in_progress' ? 'bg-secondary-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                In Progress ({candidates.filter(c => (c.service_delivery_step ?? 9) < 9).length})
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Candidates...</span>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-16 text-center border border-slate-200/60 shadow-sm max-w-lg mx-auto">
              <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mx-auto mb-4 border border-primary-100">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-outfit font-black text-slate-800 mb-1">No Candidates in Service Delivery</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                {searchTerm ? 'No candidates match your search.' : 'When candidates enroll or are created, they will automatically appear here for 9-stage milestone tracking.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCandidates.map((candidate, idx) => {
                const step = candidate.service_delivery_step ?? 9;
                const isComplete = step >= 9;
                const stepObj = SERVICE_DELIVERY_STEPS.find(s => s.id === step) || SERVICE_DELIVERY_STEPS[8];

                return (
                  <motion.div
                    key={candidate.id || idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => handleSelectCandidate(candidate)}
                    className="p-6 rounded-[2rem] bg-white border border-slate-100 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex items-center justify-center text-slate-600 font-black text-lg">
                            {candidate.profile_photo_url ? (
                              <img src={candidate.profile_photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(candidate.full_name)
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          </div>
                        </div>

                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                          isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
                          {isComplete ? 'Completed' : `Step ${step}/9`}
                        </div>
                      </div>

                      <div className="space-y-1 mb-4">
                        <h3 className="text-base font-outfit font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase">
                          {candidate.full_name}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {candidate.email}
                        </p>
                      </div>

                      <div className="space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600 truncate">{step}/9 Delivered • {stepObj.shortDesc}</span>
                          <span className={`font-black ${isComplete ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {Math.round((step / 9) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400"
                            style={{ width: `${(step / 9) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectCandidate(candidate)}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white hover:bg-blue-600 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      View Live Stepper <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* EXACT SCREENSHOT TIMELINE VIEW IN ADMIN (9 CLICKABLE POINTS) */
        selectedCandidate && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setViewMode('directory')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider border border-slate-200 shadow-sm transition-all group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> BACK TO CANDIDATE CARDS
              </button>
            </div>

            {/* EXACT SCREENSHOT CONTAINER */}
            <div className="relative bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)] space-y-10 overflow-hidden">
              
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                
                {/* Left: Avatar and Candidate Info */}
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-slate-200/70 border border-slate-300/40 ring-4 ring-purple-100/60 shadow-sm flex items-center justify-center">
                    {selectedCandidate.profile_photo_url ? (
                      <img src={selectedCandidate.profile_photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-2xl tracking-wide">
                        {getInitials(selectedCandidate.full_name)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                      {selectedCandidate.full_name}
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedCandidate.email}
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

              {/* 9-STEP HORIZONTAL TRACK (EXACT SCREENSHOT FIDELITY & CLICKABLE) */}
              <div className="relative z-10 pt-4">
                <div className="relative pb-4 overflow-x-auto no-scrollbar">
                  <div className="min-w-[860px] relative py-4 px-2">
                    
                    {/* Continuous Track Line */}
                    <div className="absolute top-[51px] left-[5.55%] right-[5.55%] h-[3px] bg-slate-200/90 rounded-full -z-0">
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
                            onClick={() => handleUpdateStep(selectedCandidate.id, step.id)}
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

                            {/* Node Orb on Track */}
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
          </div>
        )
      )}
    </div>
  );
};

export default ServiceDeliveryManagement;
