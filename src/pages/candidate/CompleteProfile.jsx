import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Phone,
  MapPin,
  Upload,
  Camera,
  ChevronDown,
  ArrowRight,
  Loader2,
  CheckCircle,
  Video,
  X,
  Image as ImageIcon,
  Search,
  PenTool,
  ShieldAlert,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import SignatureCanvas from '../../components/SignatureCanvas';
import DisclaimerOverlay from '../../components/DisclaimerOverlay';
import { useAlert } from '../../context/AlertProvider';
import { indianStatesAndCities } from '../../utils/indiaLocationData';
import CambridgeSLogo from '../../components/common/CambridgeSLogo';

// --- SEARCHABLE DROPDOWN COMPONENT ---
const SearchableDropdown = ({ value, onChange, options, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  const filtered = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`input-premium w-full flex items-center justify-between cursor-pointer transition-all duration-200 ${disabled ? 'opacity-50 pointer-events-none bg-slate-50' : 'bg-white hover:border-primary-500/50 focus-within:ring-2 focus-within:ring-primary-500/50'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>{value || placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 ml-2" />
              <input
                autoFocus
                placeholder="Search..."
                className="w-full text-sm outline-none py-1"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <ul className="max-h-60 overflow-y-auto w-full p-2">
              {filtered.length > 0 ? filtered.map(opt => (
                <li
                  key={opt}
                  className="px-4 py-2 hover:bg-primary-500/5 hover:text-primary-600 rounded-xl cursor-pointer text-sm font-medium transition-colors"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {opt}
                </li>
              )) : (
                <li className="p-4 text-center text-sm text-slate-400">No results found</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- WEBRTC CAMERA MODAL COMPONENT ---
const CameraModal = ({ isOpen, onClose, onCapture }) => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(mediaStream => {
          setStream(mediaStream);
          if (videoRef.current) videoRef.current.srcObject = mediaStream;
          setError('');
        })
        .catch(err => setError('Camera access denied or unavailable. Please enable permissions.'));
    } else {
      if (stream) stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [isOpen]);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 400, 400);
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `live_capture_${Date.now()}.png`, { type: 'image/png' });
          onCapture(file);
          onClose();
        }
      }, 'image/png', 0.85);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl max-w-sm w-full relative"
          >
            <button onClick={onClose} className="absolute top-6 right-6 z-10 w-10 h-10 bg-black/5 hover:bg-black/10 text-slate-800 rounded-full flex items-center justify-center transition-all">
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 text-center border-b border-slate-100">
              <h3 className="font-outfit font-black text-2xl text-slate-900">Identity Scan</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Align your face in the center</p>
            </div>

            <div className="bg-slate-900 aspect-square relative flex items-center justify-center overflow-hidden">
              {error ? (
                <p className="text-amber-500 text-sm px-8 text-center font-medium">{error}</p>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  <div className="absolute inset-0 border-[3px] border-white/20 rounded-full m-10 pointer-events-none" />
                  <canvas ref={canvasRef} width="400" height="400" className="hidden" />
                </>
              )}
            </div>

            <div className="p-8 bg-slate-50/80">
              <button
                onClick={captureFrame} disabled={!!error}
                className="w-full btn-premium !py-5 !rounded-2xl transition-all shadow-xl shadow-primary-500/20"
              >
                Verify Identity
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- MAIN COMPONENT ---
const CompleteProfile = () => {
  const { user, profile } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isLegalAccepted, setIsLegalAccepted] = useState(false);
  const [ipAddress, setIpAddress] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null); // 'denied' | 'unavailable' | null
  const isGpsDetecting = useRef(false);

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: '',
    state: '',
    city: '',
    addressLine: '',
    pincode: ''
  });

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('Not Detected'));
  }, []);

  // Smart PIN Code → auto-fill State & City (only when user types manually)
  useEffect(() => {
    if (isGpsDetecting.current) return;

    const fetchLocationByPincode = async () => {
      const pin = formData.pincode.trim();
      if (pin.length === 6) {
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
          const data = await res.json();

          if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice) {
            const postOffice = data[0].PostOffice[0];
            let detectedState = postOffice.State;

            // Normalization: The API often returns "Jammu and Kashmir" but sometimes variations exist.
            // We match it against our local dataset keys (case-insensitive and handling & vs and)
            const localStates = Object.keys(indianStatesAndCities);
            const matchedState = localStates.find(s =>
              s.toLowerCase().replace(/ and /g, ' & ') === detectedState.toLowerCase().replace(/ and /g, ' & ') ||
              s.toLowerCase().replace(/ & /g, ' and ') === detectedState.toLowerCase().replace(/ & /g, ' and ')
            );

            if (matchedState) {
              setFormData(prev => ({
                ...prev,
                state: matchedState,
                // Ensure city is either a perfect match or we use the district/name provided
                city: postOffice.Name || postOffice.District || prev.city
              }));
              showAlert(`Location detected: ${postOffice.District || postOffice.State}`, 'success');
            }
          }
        } catch (err) {
          console.error('Pincode lookup failed', err);
        }
      }
    };
    fetchLocationByPincode();
  }, [formData.pincode]);

  const handleDetectLocation = () => {
    // Prevent duplicate calls if already running
    if (detectingLocation) return;
    setDetectingLocation(true);
    isGpsDetecting.current = true;

    const done = (pincode, state, city, address) => {
      setFormData(prev => ({
        ...prev,
        pincode: pincode || prev.pincode,
        state: state || prev.state,
        city: city || prev.city,
        addressLine: address || prev.addressLine
      }));
      showAlert('📍 Location detected successfully!', 'success');
      setDetectingLocation(false);
      setTimeout(() => { isGpsDetecting.current = false; }, 800);
    };

    const fail = () => {
      showAlert('Could not detect location. Please fill manually.', 'error');
      setDetectingLocation(false);
      isGpsDetecting.current = false;
    };

    // Step 2: given lat/lon → reverse geocode for PIN via Nominatim
    const reverseGeocode = async (lat, lon, fallbackState, fallbackCity) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const d = await res.json();
        if (d?.address?.postcode) {
          const pincode = d.address.postcode.replace(/\D/g, '').substring(0, 6);
          const city = d.address.suburb || d.address.village || d.address.town || d.address.city || fallbackCity || '';
          const street = [d.address.road, d.address.neighbourhood, d.address.suburb].filter(Boolean).join(', ');
          done(pincode, d.address.state || fallbackState, city, street);
        } else {
          // No PIN from Nominatim — apply what we have from IP
          done('', fallbackState, fallbackCity, '');
        }
      } catch {
        done('', fallbackState, fallbackCity, '');
      }
    };

    // Step 1a: GPS → most precise
    const tryGPS = () => {
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude, longitude } }) => {
          setLocationError(null);
          reverseGeocode(latitude, longitude, '', '');
        },
        (err) => {
          if (err.code === 1) {
            // PERMISSION_DENIED — show the modal, do NOT auto-fill via IP
            setLocationError('denied');
            setDetectingLocation(false);
            isGpsDetecting.current = false;
          } else {
            // POSITION_UNAVAILABLE or TIMEOUT — silent IP fallback is fine
            setLocationError('unavailable');
            tryIPFallback();
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    };

    // Step 1b: IP fallback → geojs.io (verified working, no CORS, no rate-limit)
    const tryIPFallback = async () => {
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const d = await res.json();
        if (d && d.city) {
          // geojs gives lat/lon too — use them for precise Nominatim PIN lookup
          reverseGeocode(d.latitude, d.longitude, d.region, d.city);
        } else {
          fail();
        }
      } catch {
        fail();
      }
    };

    if ('geolocation' in navigator) {
      tryGPS();
    } else {
      tryIPFallback();
    }
  };

  const [files, setFiles] = useState({
    photo: null,
    video: null,
    aadhaarFront: null,
    aadhaarBack: null,
    panCard: null,
    signature: null
  });

  // Camera & Video Recorder States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraError, setCameraError] = useState('');
  const [scriptLanguage, setScriptLanguage] = useState('english'); // 'english' | 'hindi'

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const photoCanvasRef = useRef(null);

  // Dynamic Prompt scripts containing student info
  const englishScript = `My name is ${formData.fullName || '______'}, and my registered email address is ${user?.email || '______'}. I purposely recorded this video statement to verify my profile, confirm my identity, and acknowledge my enrollment in Cambridge Learning Services' professional training program (available at cambridgelearningservices.org). I am purchasing this course for personal skill enhancement, professional development, and career growth. I fully accept and understand that Cambridge Learning Services is only an educational skills-based course training provider and never offers a job promise, job placement assurance, or particular career assurances upon course completion. Furthermore, I certify that I will not file any chargebacks or complaints regarding this transaction in the future. I also promise not to share or distribute any copyrighted course materials supplied to me throughout this program. "This statement is made freely, knowingly, and without pressure."`;

  const hindiScript = `मेरा नाम ${formData.fullName || '______'} है और मेरा रजिस्टर्ड ईमेल एड्रेस ${user?.email || '______'} है। मैंने यह वीडियो स्टेटमेंट जान-बूझकर रिकॉर्ड किया है ताकि मैं अपनी प्रोफ़ाइल वेरिफ़ाई कर सकूँ, अपनी पहचान कन्फ़र्म कर सकूँ और Cambridge Learning Services के प्रोफ़ेशनल ट्रेनिंग प्रोग्राम (जो cambridgelearningservices.org पर उपलब्ध है) में अपने एनरोलमेंट की पुष्टि कर सकूँ। मैं यह कोर्स अपनी पर्सनल स्किल बढ़ाने, प्रोफ़ेशनल डेवलपमेंट और करियर में आगे बढ़ने के लिए खरीद रहा हूँ। मैं पूरी तरह से मानता और समझता हूँ कि Cambridge Learning Services सिर्फ़ एक एजुकेशनल स्किल-बेस्ड कोर्स ट्रेनिंग प्रोवाइडर है और कोर्स पूरा होने पर कभी भी नौकरी का वादा, नौकरी मिलने की गारंटी या किसी खास करियर की गारंटी नहीं देता है। इसके अलावा, मैं यह सर्टिफ़ाई करता हूँ कि भविष्य में इस ट्रांज़ैक्शन के बारे में कोई चार्जबैक या शिकायत नहीं करूँगा। मैं यह भी वादा करता हूँ कि इस प्रोग्राम के दौरान मुझे दिए गए किसी भी कॉपीराइट वाले कोर्स मटीरियल को शेयर या डिस्ट्रीब्यूट नहीं करूँगा। "यह स्टेटमेंट बिना किसी दबाव के, पूरी जानकारी के साथ और अपनी मर्ज़ी से दिया जा रहा है।"`;

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Bind live webcam stream to video element when active and mounted
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraActive, cameraStream]);

  // Video and camera stream access
  const handleOpenLens = async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: true
      });
      setCameraStream(stream);
      setCameraActive(true);

      // Auto-capture profile photo thumbnail from webcam stream
      setTimeout(() => {
        captureStaticProfilePhoto(stream);
      }, 1500);

    } catch (err) {
      console.error(err);
      setCameraError('Webcam or Microphone access denied. Please allow permissions and try again.');
    }
  };

  // Captures static thumbnail from video blob or stream for profile photo
  const extractFrameFromVideo = (videoSource) => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.src = typeof videoSource === 'string' ? videoSource : URL.createObjectURL(videoSource);
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';

        const captureCanvas = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 400;
          canvas.height = video.videoHeight || 400;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `profile_${Date.now()}.png`, { type: 'image/png' });
              resolve(file);
            } else {
              resolve(null);
            }
          }, 'image/png', 0.85);
        };

        video.onloadeddata = () => {
          video.currentTime = 0.5;
        };

        video.onseeked = () => {
          captureCanvas();
        };

        // Fallback if seeking doesn't trigger on some browsers
        setTimeout(() => {
          captureCanvas();
        }, 1000);

        video.onerror = () => resolve(null);
      } catch (err) {
        console.error(err);
        resolve(null);
      }
    });
  };

  const captureStaticProfilePhoto = (stream) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 400;
    canvas.height = video.videoHeight || 400;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const profileFile = new File([blob], `profile_${Date.now()}.png`, { type: 'image/png' });
        setFiles(prev => ({ ...prev, photo: profileFile }));
      }
    }, 'image/png', 0.85);
  };

  // Video recording control
  const handleStartRecording = () => {
    if (!cameraStream) return;
    recordedChunksRef.current = [];

    captureStaticProfilePhoto(cameraStream);

    let options = {};
    if (MediaRecorder.isTypeSupported('video/mp4')) {
      options = { mimeType: 'video/mp4' };
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      options = { mimeType: 'video/webm;codecs=vp8,opus' };
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      options = { mimeType: 'video/webm' };
    }

    try {
      const recorder = new MediaRecorder(cameraStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'video/webm';
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const videoBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        const videoFile = new File([videoBlob], `statement_${Date.now()}.${ext}`, { type: mimeType });

        setFiles(prev => ({
          ...prev,
          video: videoFile
        }));

        const previewUrl = URL.createObjectURL(videoBlob);
        setVideoPreviewUrl(previewUrl);

        // Stop all track resources to turn off the camera lens indicator
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
        }
        setCameraStream(null);
        setCameraActive(false);
      };

      recorder.start(10); // Capture data chunks every 10ms
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start elapsed timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 60) { // Limit to 60s
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (e) {
      console.error('Failed to start recorder', e);
      showAlert('Could not start video recording', 'error');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleResetVideo = () => {
    setVideoPreviewUrl('');
    setFiles(prev => ({ ...prev, video: null }));
    handleOpenLens();
  };

  // Close camera on component unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [cameraStream]);

  const handleFileUpload = async (file, bucketPath, bucketName = 'aadhaar_cards') => {
    if (!file) return null;
    const fileExt = file.name ? file.name.split('.').pop() : (file.type ? file.type.split('/')[1] : 'png');
    const fileName = `${user.id}/${bucketPath}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from(bucketName).upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    return publicUrl;
  };

  const sendEmailNotification = async (candidateData) => {
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || '472f31d3-b4ff-46f5-8947-c1148f7aa52e',
          subject: `KYC Verification Report: ${candidateData.fullName}`,
          from_name: "Cambridge Learning Services Portal",
          recipient: import.meta.env.VITE_ADMIN_EMAIL || 'support@cambridgelearningservices.org',
          message: `Hello,

A new form has been submitted on your website. Details below.

Recipient
${import.meta.env.VITE_ADMIN_EMAIL || 'support@cambridgelearningservices.org'}
Message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KYC VERIFICATION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CANDIDATE INFORMATION:
──────────────────────
• Full Name: ${candidateData.fullName}
• Email ID: ${candidateData.email}
• PIN Code: ${candidateData.pincode}
• Location: ${candidateData.city}, ${candidateData.state}

VERIFICATION STATUS:
───────────────────
• Declaration: CHECKED & ACCEPTED ✓
• Signature: CAPTURED & VERIFIED ✓
• Documentation: ALL ASSETS UPLOADED ✓

LEGAL ACKNOWLEDGEMENT & ATTESTATION:
1. IDENTITY VERIFICATION:
Candidate authorizes live photo capture and video statement recording for identity authentication and anti-proxy measures.

2. EMPLOYMENT DISCLAIMER:
Candidate acknowledges certification does not guarantee employment, placement, or financial increases.

3. ACADEMIC INTEGRITY:
Candidate agrees to complete exams independently without unauthorized materials or AI assistance.

4. LIMITATION OF LIABILITY:
Portal is not liable for technical failures or candidate-side connectivity issues during examinations.

FINAL DECLARATION & FULL AGREEMENT:
----------------------------------
SERVICE DELIVERY: 
🔎 Step 1: Immediate Admission Confirmation After Payment
The student onboarding journey begins instantly upon checkout. As soon as a transaction clears our secure platform gateways, our backend servers trigger an Automated Admission Confirmation Notice. Students receive an digital welcome package containing their permanent user profile IDs, platform workspace access routes, and an overview map of their target educational tracks.

📌 Step 2: Mandatory Document KYC Verification
In strict compliance with structural risk management policies, all enrolled learners must verify their commercial profile data. Students are required to securely upload their valid identity documentation (such as government-issued photo IDs or institutional cards) to our encrypted verification portal. This step ensures that final completion documentation matches legal corporate profiles accurately.

🔎 Step 3: Secure Video KYC Authentication
To prevent platform identity theft, proxy testing, and transaction chargeback vectors, students must execute an automated Video KYC Verification step. Using an integrated web interface, learners record a brief, self-directed biometric identity check matching their uploaded documents. This establishes an unalterable audit trail for security purposes.

📊 Step 4: System Generation & Delivery of GST Invoice
Accountability and fiscal transparency are foundational to our services. Within 24 hours of successful verification, our accounting systems compile a comprehensive, legally compliant Corporate GST Invoice detailing the exact service breakdown and tax identifiers. This asset is dispatched straight to the student’s billing tab for corporate tax deduction filing purposes.

🗒️ Step 5: Dissemination of Comprehensive PDF Study Material (Strict One-Time Release)
Upon successful verification, the complete independent text registry library is unlocked. Students receive high-fidelity, comprehensive PDF Study Materials and Text Workbooks tailored strictly to their curriculum.
⚠️ Operational Security Notice: In accordance with our digital asset protection protocols, all reading materials are shared on a strict one-time basis only. Students must securely download and save these assets immediately upon distribution, as link refreshes or secondary file dispatches will not be granted.

🌟 Step 6: Issuance of Formal Training Enrollment Certificate
Before course modules begin, our records registry generates a formal, verifiable Cambridge Learning Services Enrollment Certificate. This initial credential serves as an active commercial proof of status, reflecting that the individual is currently under training within an active, non-affiliated skill development boot camp.

📈 Step 7: Access Provisioning for Video Lecture Sessions (Strict One-Time Release)
Learners gain access to their master collection of high-definition, pre-recorded visual walkthroughs and technical screen-shares. These professional Video Lectures contain the entirety of the execution-level core methodologies.
⚠️ Operational Security Notice: In line with platform distribution rules, access keys to the video lecture sets are shared on a strict one-time basis only. Re-sharing, profile splitting, or secondary video deliveries are completely restricted to safeguard content parameters.

🗓️ Step 8: Distribution of Final Examination Login Credentials
Once the 10-day, 20-day, or 30-day curriculum timeline has elapsed, the student workspace triggers the final evaluation phase. The platform outputs unique, encrypted Final Exam Login Credentials directly to the student portal, giving them an isolated access window to complete their timed, multiple-choice evaluation independently.

✅ Step 9: Final Exam Result Processing & Delivery with Provisional Certificate (PC)
Upon completing the examination, our grading engines parse the submission data against metric matrices. The comprehensive Final Exam Result Sheet is computed and displayed instantly inside the dashboard. Graduates are immediately issued their verified Provisional Certificate (PC), closing out the service lifecycle and enabling immediate skill deployment in the corporate sector.

TERMS & CONDITIONS: 
📜 TERMS AND CONDITIONS UPDATE: SERVICE FULFILLMENT & NO-REFUND POLICY
1. Scope of Independent Vocational Services
By completing a commercial transaction and registering for any training program on Cambridge Learning Services (https://cambridgelearningservices.org), the user (hereinafter referred to as the "Student" or "Client") explicitly acknowledges and agrees that all services rendered are independent, skill-based vocational training programs.
Cambridge Learning Services functions strictly as an asynchronous educational infrastructure platform. Our programs are non-degree, non-diploma courses and explicitly do not require or maintain any affiliation, accreditation, or licensing from any university, government institute, or private educational board. Cambridge Learning Services grants institutional "Certificates of Completion" and "Provisional Certificates" based solely on independent competency assessments.

2. Asynchronous Delivery Model & Anti-Interactive Clauses
The Client explicitly understands and accepts that Cambridge Learning Services operates on a static digital distribution model:
Exclusivity of Medium: Training is delivered solely and exclusively via pre-recorded, asynchronous video lecture modules and downloadable PDF text study workbooks.
Prohibition of Live Training: Cambridge Learning Services never offers, promises, or provides any person-to-person instruction, live classroom training, group webinars, real-time mentorship, or interactive tutor sessions.
Self-Directed Operational Responsibility: The Student bears absolute responsibility for navigating the course materials independently within the platform’s self-contained hosting framework. No claims for refunds based on the lack of live human interaction will be entertained under any circumstances, as the platform explicitly disclaims interactive training.

3. Strict 9-Step Service Delivery Protocol & Binding Benchmarks
Fulfillment of the purchase contract is systematically tracked and verified by our backend architecture across nine sequential milestones. By enrolling, the Student agrees to comply with the operational conditions of each step:
Admission Confirmation After Payment: Triggered instantly upon payment gateway clearance. This marks the commencement of the digital contractual relationship.
Mandatory Document KYC: The Student must securely upload valid government-issued photo identification to verify their profile. Failure to provide legitimate documentation within the course timeframe will result in account suspension without a refund.
Mandatory Video KYC Authentication: A biometric video check must be recorded by the student to verify identity, eliminate fraud, and prevent proxy test-taking. Accounts failing the security profile checks are immediately locked to preserve system integrity.
GST Invoice Delivery: A legally compliant Corporate GST Invoice is compiled and posted to the student's dashboard within 24 hours of successful validation.
PDF Study Material Dissemination (Strict One-Time Release Clauses): Comprehensive text materials are unlocked inside the student portal.
The Client acknowledges that files are shared on a strict one-time basis only. The Student bears the full legal and technical responsibility to securely save, download, and backup these digital assets immediately upon distribution. Cambridge Learning Services completely denies any liability for file loss, hardware failure, or requests for link refreshes post-distribution.
Enrollment Certificate Issuance: A digital record reflecting that the individual is actively under training within our independent boot camp is instantly generated and delivered.
Video Lecture Access Provisioning (Strict One-Time Release Clauses): Pre-recorded training paths are made accessible to the profile workspace.
Like the text files, access keys to the video streams are delivered on a strict one-time basis only. Account sharing, profile splitting, or data scraping are prohibited and will trigger automated account bans without a refund.
Final Examination Login Credentials: Upon expiration of the designated course duration (10, 20, or 30 days maximum), encrypted examination keys are assigned to the portal.
Final Exam Grading & Provisional Certificate (PC) Delivery: Upon submission, grading engines compute results instantly, and a provisional credential is issued to close the service loop.

4. Defatigability of Services & Definitive "No-Refund" Policy
Cambridge Learning Services distributes high-value, proprietary digital intellectual property. Due to the digital nature of these assets—which can be instantly viewed, saved, or downloaded upon release—all transactions executed on https://cambridgelearningservices.org are strictly FINAL, NON-CANCELLABLE, AND NON-REFUNDABLE.

[POLICY PROVISION TABLE]
--------------------------------------------------------------------------------------------------------
| POLICY PROVISION | DESCRIPTION & EXECUTION THRESHOLD | LEGAL IMPACT ON CLIENT |
| :--- | :--- | :--- |
| Instant Fulfillment Waiver | Triggered immediately upon Step 1 (Payment Clearance) and Step 5 (PDF Study Material Dissemination). | The Client explicitly waives any right to an operational "cooling-off period" or transaction cancellation once assets are deployed. |
| One-Time Sharing Indemnification | Established upon execution of the "Strict One-Time Release" protocols in Step 5 and Step 7. | The platform is completely indemnified against student complaints regarding data loss, user error, device incompatibility, or platform lockouts resulting from a breach of user rules. |
| KYC Refusal Forfeiture | Triggered if a user refuses or fails Step 2 (Document KYC) or Step 3 (Video KYC). | The user's account will be permanently banned for a security breach. All paid registration fees are entirely forfeited to cover administrative processing costs. |
| Dispute & Chargeback Mitigation | Triggered when a client files a dispute, credit card chargeback, or payment reversal claim. | Treated legally as a breach of contract. The platform will submit this policy and server logs to banks to aggressively deny the claim. |
--------------------------------------------------------------------------------------------------------
• Instant Fulfillment Waiver: Triggered immediately upon Step 1 (Payment Clearance) and Step 5 (PDF Study Material Dissemination). The Client explicitly waives any right to an operational "cooling-off period" or transaction cancellation once assets are deployed.
• One-Time Sharing Indemnification: Established upon execution of the "Strict One-Time Release" protocols in Step 5 and Step 7. The platform is completely indemnified against student complaints regarding data loss, user error, device incompatibility, or platform lockouts resulting from a breach of user rules.
• KYC Refusal Forfeiture: Triggered if a user refuses or fails Step 2 (Document KYC) or Step 3 (Video KYC). The user's account will be permanently banned for a security breach. All paid registration fees are entirely forfeited to cover administrative processing costs.
• Dispute & Chargeback Mitigation: Triggered when a client files a dispute, credit card chargeback, or payment reversal claim. Treated legally as a breach of contract. The platform will submit this policy and server logs to banks to aggressively deny the claim.

5. Acceptance of Terms
By scrolling past this screen, clicking "I Agree," or processing a training fee payment on our network domains, you explicitly declare that you have read, understood, and agreed to be legally bound by this Service Delivery Framework and No-Refund Policy. If you do not accept these asynchronous, un-affiliated delivery constraints, you must exit our platform immediately and refrain from purchasing any services.

PRIVACY POLICY: 
1. Introduction & Scope
This Privacy Policy governs the data collection, storage, processing, and security practices of Cambridge Learning Services (operating through its asynchronous educational infrastructure platform at https://cambridgelearningservices.org).
To deliver independent vocational training programs, identity verification services, and verifiable institutional credentials, Cambridge Learning Services must handle specific personal and biometric data. By registering an account, making a purchase, or completing the security verification steps, you explicitly consent to the collection, processing, and retention practices outlined in this policy.

2. Information We Collect
Cambridge Learning Services processes information through various stages of your onboarding, verification, and educational journey:
A. Personal Identification Data
Registration & Contact Information: Full legal name, billing address, phone number, and corporate email address collected during checkout or sign-up.
Fiscal Identity: Information required to generate corporate accounts, including corporate entity names and specific tax identifiers.
B. Mandatory KYC & Security Verification Data
Documentary Identity (Document KYC): Images or digital files of valid government-issued photo identification cards or institutional credential badges uploaded securely to our portal.
Biometric Identity (Video KYC): Self-directed, brief video records processed through an integrated web interface to execute facial matching against submitted documentation and to eliminate proxy testing.
C. Academic & Technical Workspace Logs
Evaluation Records: Answers, responses, submission timestamps, and performance metrics parsed by our grading matrices during automated final examinations.
System & Backend Server Logs: Unique workspace access keys, internet protocol (IP) address mapping, browser data, and precise file-download timestamps related to the release of text libraries and video lecture elements.

3. How We Use Your Data
Your information is processed strictly to maintain platform safety and complete the structural service loop:
Identity Verification & Anti-Fraud: Cross-referencing your biometric Video KYC data with your submitted physical document profile to establish an unalterable audit trail, eliminating proxy test-taking and financial transaction theft.
Service Fulfillment: Provisioning individual profiles with unique access keys to streaming lecture workspaces, digital text repositories, and encrypted final examination modules.
Credential Issuance: Generating accurate legal profiles for formal, verifiable documents, including initial Enrollment Certificates and final Provisional Certificates (PC).
Compliance & Legal Accountability: Compiling and posting legally compliant Corporate GST Invoices straight to your workspace within 24 hours of successful validation.

4. Data Protection, Sharing, and Disclosure
A. Strict Third-Party Restrictions
Cambridge Learning Services treats proprietary and personal data with high security. We do not sell, rent, trade, or share your personal, documentary, or biometric data with external third-party marketing networks or unrelated data brokers.
B. Conditional Sharing Framework
Data is shared exclusively under the following strict conditions:
Payment Processing: Financial details are managed securely via encrypted, external payment gateways during checkout to clear transactions safely.
Dispute and Chargeback Defense: In alignment with our Terms and Conditions, if a user files a transaction dispute, credit card chargeback, or payment reversal claim, Cambridge Learning Services will submit backend server logs (such as download metrics and KYC verification markers) to the involved financial institutions to defend against the claim.
Legal Enforcement: Data may be disclosed if required by an official court order, applicable government statutory body, or prevailing regulatory legal framework.

5. Security & Technical Safeguards
We implement a multi-layered security infrastructure to shield your files and identity profiles:
Data Encryption: Document uploads, video files, and financial invoice generation are processed and stored over secure, encrypted network connections.
Workspace Automated Bans: Automated behavioral system parameters track multi-location concurrent logins. Profiles attempting unauthorized concurrent access, scraping attempts via scripts, or distributing video access streams are banned to ensure ecosystem security.

6. Data Retention Policies
Operational Files: Personal profile structures, exam transcripts, and credential verification links are kept for as long as your workspace account remains active or to fulfill tax, corporate accounting, or institutional tracking standards.
KYC Security Profiles: Biometric checks and government identification logs are preserved securely to maintain an unalterable transaction audit trail, serving as definitive evidence of contractual compliance.

7. Acceptance & Acknowledgement
Interacting with the platform, completing registrations, or inputting identity vectors implies explicit and dynamic acknowledgement of this Privacy Policy. If you do not accept these data handling rules, you must immediately halt data submission and exit the platform.

REFUND POLICY:
1. Executive Summary & Legal Framework of Services
By completing a commercial financial transaction, processing a payment gateway fee, or registering for any independent skill-based training program on the Cambridge Learning Services network domains, the user (hereinafter legally referred to as the "Student", "Client", or "User") explicitly acknowledges, understands, and binds themselves to this comprehensive, non-negotiable Service Fulfillment and No-Refund Policy.
Cambridge Learning Services functions strictly and exclusively as an independent, asynchronous educational infrastructure platform. The digital training pathways, core methodologies, and instructional material hosted on the platform are structured solely as non-degree, non-diploma vocational training programs aimed at execution-level corporate skill development.
Independent Status Notice:
The Client explicitly recognizes that Cambridge Learning Services does not maintain, require, or claim any affiliation, accreditation, licensing, or oversight from any university, government institute, statutory educational body, or private educational board. All institutional credentials, including "Certificates of Completion" and "Provisional Certificates (PC)", are granted based entirely on independent competency assessments managed internally by the platform’s grading matrices. Consequently, normal academic withdrawal policies, student tuition protection schemes, or traditional institutional refund metrics are wholly inapplicable to transactions executed with this platform.

2. Asynchronous Delivery Model & Anti-Interactive Clauses
A fundamental pillar of this refund policy is the nature of the service delivery itself. Cambridge Learning Services operates on a static digital distribution model. The commercial valuation of the program is tied directly to the ingestion of proprietary digital intellectual property rather than live human instruction.
Exclusivity of Medium:
All vocational training curricula are delivered solely and exclusively via pre-recorded, asynchronous video lecture modules and downloadable PDF text study workbooks.
Prohibition of Live Training:
The platform never offers, promises, schedules, or provides any form of person-to-person instruction, live virtual classroom training, synchronous group webinars, real-time mentorship, or interactive tutor-led question-and-answer sessions.
Self-Directed Operational Responsibility:
The Student bears absolute, sole, and un-delegable responsibility for independently navigating, reading, viewing, and completing the course materials within the platform’s self-contained hosting framework.
BINDING CLAUSE: No claims, complaints, demands, or legal petitions for refunds based on a purported lack of live human interaction, lack of custom feedback, or dissatisfaction with the self-guided nature of the platform will be entertained under any circumstances. The platform explicitly disclaims interactive training prior to purchase, and registration constitutes a complete waiver of claims regarding structural isolation during the learning process.

3. The Strict 9-Step Service Delivery Protocol
Fulfillment of the digital purchase contract is systematically tracked, timestamped, and verified by the platform's automated backend server log database. Contractual execution is broken down into nine sequential milestones. By enrolling, the Student agrees that the completion of these milestones constitutes definitive operational execution of the service loop:
[Step 1: Payment & Instant Admission] ➡️ [Step 2: Document KYC] ➡️ [Step 3: Biometric Video KYC]
                                                                        ⬇️
[Step 6: Enrollment Certificate]    ⬅️ [Step 5: One-Time PDF Release] ⬅️ [Step 4: Corporate GST Invoice]
      ⬇
[Step 7: One-Time Video Release]   ➡️ [Step 8: Exam Key Distribution] ➡️ [Step 9: Grading & Provisional Cert]

Step 1: Immediate Admission Confirmation After Payment
This step is triggered instantly upon payment gateway clearance. As soon as the transaction clears, our backend architecture outputs an Automated Admission Confirmation Notice containing permanent user profile IDs, platform workspace access routes, and an educational track overview map. This instantaneous action marks the official commencement of the binding digital contractual relationship.

Step 2: Mandatory Document KYC Verification
In strict compliance with commercial risk management, students are required to securely upload valid government-issued photo identification to our encrypted verification portal. This ensures final documentation matches legal corporate profiles. Failure to upload legitimate documentation within the selected course timeframe results in account suspension without refund eligibility.

Step 3: Secure Video KYC Authentication
To prevent identity theft, proxy test-taking, and transaction chargeback vectors, students must execute an automated, self-directed biometric identity check via an integrated web interface. Accounts failing or refusing this profile check are immediately locked to preserve system integrity, causing immediate forfeiture of fees.

Step 4: System Generation & Delivery of GST Invoice
Accountability and fiscal transparency are verified through the automated compilation of a legally compliant Corporate GST Invoice detailing the exact service breakdown and tax identifiers. This asset is dispatched straight to the student’s billing tab within 24 hours of validation for corporate tax deduction purposes.

Step 5: Dissemination of Comprehensive PDF Study Material (Strict One-Time Release)
Upon successful validation, the comprehensive text registry library is unlocked, allowing the student to view high-fidelity PDF Study Materials and Text Workbooks.
The One-Time Release Clause: Files are shared on a strict one-time basis only. The Student bears full legal and technical responsibility to securely save, download, and backup these digital assets immediately upon distribution. Cambridge Learning Services completely denies any liability for file loss, hardware failure, or requests for link refreshes post-distribution.

Step 6: Issuance of Formal Training Enrollment Certificate
The records registry automatically generates a formal, verifiable Cambridge Learning Services Enrollment Certificate. Delivered straight to the portal dashboard, this initial credential serves as active commercial proof of status, reflecting that the individual is currently under training within an active, non-affiliated skill development boot camp.

Step 7: Access Provisioning for Video Lecture Sessions (Strict One-Time Release)
The student profile is provisioned with access keys to the master collection of pre-recorded visual walkthroughs and technical screen-shares containing execution-level core methodologies.
The One-Time Video Stream Clause: Like the text files, access keys to the video streams are delivered on a strict one-time basis only. Account sharing, profile splitting, or data scraping are prohibited and will trigger automated account bans without a refund.

Step 8: Distribution of Final Examination Login Credentials
Upon the expiration of the designated course duration matrix (10, 20, or 30 days maximum), the student workspace automatically triggers the evaluation phase by outputting unique, encrypted Final Exam Login Credentials directly to the student portal. This provides an isolated access window to complete the timed, multiple-choice evaluation independently.

Step 9: Final Exam Result Processing & Delivery with Provisional Certificate (PC)
Upon submission, grading engines parse the submission data against metric matrices instantly. The comprehensive Final Exam Result Sheet is computed and displayed inside the dashboard, and graduates are immediately issued their verified Provisional Certificate (PC), closing out the service lifecycle.

4. Defatigability of Services & Definitive "No-Refund" Core Policy
Cambridge Learning Services distributes high-value, proprietary digital intellectual property. Due to the digital nature of these assets—which can be instantly viewed, saved, cached, screenshotted, or downloaded immediately upon release—all transactions executed on https://cambridgelearningservices.org are strictly FINAL, NON-CANCELLABLE, AND NON-REFUNDABLE.

[POLICY PROVISION TABLE]
--------------------------------------------------------------------------------------------------------
| POLICY PROVISION | DESCRIPTION & EXECUTION THRESHOLD | LEGAL IMPACT ON CLIENT |
| :--- | :--- | :--- |
| Instant Fulfillment Waiver | Triggered immediately upon Step 1 (Payment Clearance) and Step 5 (PDF Study Material Dissemination). | The Client explicitly waives any right to an operational "cooling-off period" or transaction cancellation once assets are deployed. |
| One-Time Sharing Indemnification | Established upon execution of the "Strict One-Time Release" protocols in Step 5 and Step 7. | The platform is completely indemnified against student complaints regarding data loss, user error, device incompatibility, or platform lockouts resulting from a breach of user rules. |
| KYC Refusal Forfeiture | Triggered if a user refuses or fails Step 2 (Document KYC) or Step 3 (Video KYC). | The user's account will be permanently banned for a security breach. All paid registration fees are entirely forfeited to cover administrative processing costs. |
| Dispute & Chargeback Mitigation | Triggered when a client files a dispute, credit card chargeback, or payment reversal claim. | Treated legally as a breach of contract. The platform will submit this policy and server logs to banks to aggressively deny the claim. |
--------------------------------------------------------------------------------------------------------
• Instant Fulfillment Waiver: Triggered immediately upon Step 1 (Payment Clearance) and Step 5 (PDF Study Material Dissemination). The Client explicitly waives any right to an operational "cooling-off period" or transaction cancellation once assets are deployed.
• One-Time Sharing Indemnification: Established upon execution of the "Strict One-Time Release" protocols in Step 5 and Step 7. The platform is completely indemnified against student complaints regarding data loss, user error, device incompatibility, or platform lockouts resulting from a breach of user rules.
• KYC Refusal Forfeiture: Triggered if a user refuses or fails Step 2 (Document KYC) or Step 3 (Video KYC). The user's account will be permanently banned for a security breach. All paid registration fees are entirely forfeited to cover administrative processing costs.
• Dispute & Chargeback Mitigation: Triggered when a client files a dispute, credit card chargeback, or payment reversal claim. Treated legally as a breach of contract. The platform will submit this policy and server logs to banks to aggressively deny the claim.

5. Exhaustive Legal Provisos & Operational Enforcement
A. Technical Incompatibility & Device Disclaimers
The platform distributes standardized PDF formats and encrypted video stream wrappers. It is the sole technical responsibility of the Client to ensure that their personal hardware devices (desktop, laptop, mobile, or tablet), operating systems, and internet service providers meet the baseline operational requirements needed to stream video data and open PDF document repositories. No refunds will be granted based on technical limitations, outdated user browsers, local firewall blocks, network latency, ISP restrictions, or general device incompatibility.

B. Unilateral Account Revocation for Security Violations
Cambridge Learning Services maintains strict automated behavioral tracking parameters across its workspace dashboards. The platform reserves the right to terminate any user profile instantly, without warning, and without the obligation of financial reimbursement or refund, if the backend system logs detect any of the following unauthorized activities:
- Concurrent multi-location IP logins indicating profile sharing or account splitting.
- Attempted injection of automated data-scraping scripts, download managers, or unauthorized stream-ripping software designed to duplicate proprietary video lectures.
- The uploading of corrupted data packages, malware, or fraudulent identity documentation during Step 2 (Document KYC) or Step 3 (Video KYC) protocols.

C. Program Modification and Discontinuance Indemnity
Cambridge Learning Services reserves the right to modify, adjust, update, or re-sequence any portion of its pre-recorded instructional modules, PDF workbooks, grading metrics, or exam platforms at any time to preserve current corporate relevance. The execution of a curriculum update does not entitle the Client to a retrofitted refund, platform credit, or course exchange.

6. Acceptance of Terms & Dynamic Acknowledgement
By scrolling past presentation screens, checking an "I Agree" checkbox, interacting with any workspace element, or processing a training fee payment on our network domains, you explicitly declare that you have read, understood, and agreed to be legally bound by this Service Delivery Framework and No-Refund Policy.
If you do not accept these asynchronous, un-affiliated delivery constraints, or if you maintain any reservation regarding the definitive finality of commercial transactions executed on this domain, you must exit our platform immediately and refrain from purchasing any services.

ACCEPTED BY CANDIDATE: YES ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOCUMENT ACCESS LINKS:
─────────────────────
• Profile Photo:
${candidateData.photoUrl || 'Not uploaded'}

• Live Video Statement:
${candidateData.videoUrl || 'Not uploaded'}

• Aadhaar Card (Front):
${candidateData.frontUrl || 'Not uploaded'}

• Aadhaar Card (Back):
${candidateData.backUrl || 'Not uploaded'}

• PAN Card:
${candidateData.panUrl || 'Not uploaded'}

• Digital Signature:
${candidateData.signatureUrl || 'Not uploaded'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Submitted via Cambridge Learning Services Exam Portal
`
        })
      });
      return response.ok;
    } catch (err) {
      console.error('Email Error:', err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      showAlert('Invalid Mobile Number. Must be 10 digits.', 'error');
      return;
    }
    if (!files.video) {
      showAlert('Live Video Statement is mandatory. Please record yourself.', 'warning');
      return;
    }
    if (!files.signature || !files.aadhaarFront || !files.aadhaarBack || !files.panCard) {
      showAlert('Please provide all required documents, PAN card, and signature.', 'warning');
      return;
    }

    setLoading(true);
    try {
      let photoFile = files.photo;
      if (!photoFile && files.video) {
        photoFile = await extractFrameFromVideo(files.video);
      }

      const [photoUrl, videoUrl, frontUrl, backUrl, panUrl, signatureUrl] = await Promise.all([
        handleFileUpload(photoFile, 'photo', 'candidate_documents'),
        handleFileUpload(files.video, 'video_statement', 'candidate_documents'),
        handleFileUpload(files.aadhaarFront, 'aadhaar_front', 'aadhaar_cards'),
        handleFileUpload(files.aadhaarBack, 'aadhaar_back', 'aadhaar_cards'),
        handleFileUpload(files.panCard, 'pan_card', 'candidate_documents'),
        handleFileUpload(files.signature, 'signature', 'candidate_documents')
      ]);

      const fullAddress = `${formData.addressLine ? formData.addressLine + ', ' : ''}${formData.city}, ${formData.state}${formData.pincode ? ' - ' + formData.pincode : ''}`;
      const { error } = await supabase.from('profiles').update({
        full_name: formData.fullName,
        phone: formData.phone,
        address: fullAddress,
        profile_photo_url: photoUrl,
        video_url: videoUrl,
        aadhaar_front_url: frontUrl,
        aadhaar_back_url: backUrl,
        pan_card_url: panUrl,
        signature_url: signatureUrl,
        profile_completed: true
      }).eq('id', user.id);

      if (error) throw error;

      // Send administrative notification
      await sendEmailNotification({
        ...formData,
        email: user.email,
        photoUrl,
        videoUrl,
        frontUrl,
        backUrl,
        panUrl,
        signatureUrl
      });

      showAlert('Registration completed! Redirecting...', 'success');
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (error) {
      showAlert(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DisclaimerOverlay user={user} profile={profile} />
      
      {/* Hidden photo canvas to extract thumbnail */}
      <canvas ref={photoCanvasRef} width="400" height="400" className="hidden" />

      {/* ── LOCATION PERMISSION MODAL ── */}
      <AnimatePresence>
        {locationError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden"
            >
              {/* Amber gradient top */}
              <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 px-8 pt-8 pb-6 text-center relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full" />
                <div className="w-16 h-16 bg-white/25 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <ShieldAlert className="w-9 h-9 text-white" />
                </div>
                <h2 className="text-white font-black text-lg leading-tight">
                  {locationError === 'denied' ? 'Location Access Blocked' : 'Location Unavailable'}
                </h2>
                <p className="text-white/75 text-xs mt-1 font-medium">
                  {locationError === 'denied'
                    ? 'This browser has blocked location for this site.'
                    : 'Could not reach your GPS. Check device settings.'}
                </p>
              </div>

              {/* Steps */}
              <div className="px-7 py-6">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-4">
                  {locationError === 'denied' ? 'How to allow it in browser' : 'How to fix it'}
                </p>
                <div className="space-y-3 mb-6">
                  {(locationError === 'denied' ? [
                    { icon: '🔒', text: 'Click the lock icon in your browser address bar' },
                    { icon: '📍', text: 'Set "Location" permission to Allow' },
                    { icon: '🔄', text: 'Reload this page and click Detect Location again' },
                  ] : [
                    { icon: '⚙️', text: 'Open your device Settings' },
                    { icon: '📍', text: 'Go to Privacy → Location Services → turn On' },
                    { icon: '🔄', text: 'Come back and click Detect Location again' },
                  ]).map(({ icon, text }, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-base leading-none mt-0.5">{icon}</span>
                      <p className="text-sm text-slate-600 font-medium leading-snug">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setLocationError(null)}
                    className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    Fill Manually
                  </button>
                  <button
                    onClick={() => { setLocationError(null); window.location.reload(); }}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 active:scale-95 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload & Retry
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="py-10 px-6 flex flex-col items-center justify-start bg-slate-50/50">

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="glass-card-saas max-w-2xl w-full p-8 md:p-14 my-10 relative z-10"
        >
          <header className="text-center mb-12 flex flex-col items-center">
            <div className="mb-4">
              <CambridgeSLogo size={80} />
            </div>
            <h1 className="text-4xl font-outfit font-black text-slate-900 mb-2">Candidate Registration</h1>
            <p className="text-slate-500 font-medium">Complete your profile to access your assigned exams.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* LOCATION DETECTION */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Location Identification *</label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 border border-slate-200 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
              >
                <MapPin className="w-3 h-3" />
                {detectingLocation ? 'Detecting...' : 'Detect Location'}
              </button>
            </div>

            {/* IDENTITY VERIFICATION (LIVE PHOTO & VIDEO STATEMENT) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Identity verification (Live Photo & Video Statement) *</label>
                {files.photo && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Live Photo Captured ✓</span>
                    <div className="w-10 h-10 rounded-full border border-emerald-200 overflow-hidden shadow-sm">
                      <img src={URL.createObjectURL(files.photo)} className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6">
                {cameraError && (
                  <div className="mb-4 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 px-4 py-2 rounded-xl text-center">
                    {cameraError}
                  </div>
                )}

                {(cameraActive || videoPreviewUrl) ? (
                  <div className="flex flex-col items-center gap-8 w-full">
                    {/* Top: Camera View & Controls */}
                    <div className="flex flex-col items-center w-full max-w-xl">
                      <div className="w-full aspect-[4/3] bg-slate-900 rounded-[2rem] border border-slate-800 shadow-inner overflow-hidden relative flex items-center justify-center">
                        {videoPreviewUrl ? (
                          <video key={videoPreviewUrl} src={videoPreviewUrl} controls autoPlay playsInline className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                            {isRecording && (
                              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 text-white text-xs font-bold border border-white/10">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                                <span>RECORDING {formatTimer(recordingSeconds)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Controls below video */}
                      <div className="mt-6 flex gap-3">
                        {cameraActive && (
                          <>
                            {!isRecording ? (
                              <button
                                type="button"
                                onClick={handleStartRecording}
                                className="px-6 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-2"
                              >
                                <Video className="w-4 h-4" />
                                Start Recording
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleStopRecording}
                                className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 animate-pulse"
                              >
                                <X className="w-4 h-4" />
                                Stop Recording
                              </button>
                            )}
                          </>
                        )}

                        {videoPreviewUrl && (
                          <button
                            type="button"
                            onClick={handleResetVideo}
                            className="px-6 py-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-sm bg-white active:scale-95 transition-all flex items-center gap-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Re-record Video
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Read aloud scripts (Full Width Wide Box) */}
                    <div className="w-full flex flex-col gap-4 bg-white border border-slate-200/40 rounded-3xl p-6 md:p-8 shadow-sm">
                      {/* Language Selection Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">Select Script Language</span>
                        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/40">
                          <button
                            type="button"
                            onClick={() => setScriptLanguage('english')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${scriptLanguage === 'english' ? 'bg-white text-primary-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            English
                          </button>
                          <button
                            type="button"
                            onClick={() => setScriptLanguage('hindi')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${scriptLanguage === 'hindi' ? 'bg-white text-primary-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Hindi
                          </button>
                        </div>
                      </div>

                      {/* Selected Script */}
                      {scriptLanguage === 'english' ? (
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-[#2563eb] mb-2">Please read aloud (English):</h4>
                          <p className="text-sm text-slate-800 leading-relaxed font-bold italic bg-blue-50/50 border border-blue-100/50 p-5 rounded-2xl">
                            "{englishScript}"
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-[#7c3aed] mb-2">कृपया जोर से पढ़ें (Hindi):</h4>
                          <p className="text-sm text-slate-800 leading-relaxed font-medium bg-purple-50/50 border border-purple-100/30 p-5 rounded-2xl">
                            "{hindiScript}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Initial: Open Lens button
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={handleOpenLens}
                      className="group flex flex-col items-center gap-3 py-6 px-8 bg-white hover:bg-slate-50 text-primary-500 rounded-2xl shadow-xl transition-all active:scale-95 border border-slate-200/50"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 shadow-md group-hover:scale-105 transition-all">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-primary-500 transition-colors">Start Verification Camera</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Full Name *</label>
                <input type="text" className="input-premium w-full" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Phone Number *</label>
                <div className="flex rounded-xl bg-white/40 border border-slate-200/50 backdrop-blur-sm focus-within:bg-white focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all duration-300 overflow-hidden">
                  <div className="flex items-center justify-center px-5 bg-slate-100/90 border-r border-slate-200/50 text-slate-800 font-black text-sm tracking-wider">
                    IN +91
                  </div>
                  <input
                    type="tel"
                    className="w-full bg-transparent px-5 py-4 outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                    placeholder="9876543210"
                    maxLength={10}
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">State / UT *</label>
                <SearchableDropdown value={formData.state} onChange={val => setFormData({ ...formData, state: val, city: '' })} options={Object.keys(indianStatesAndCities)} placeholder="Search State..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">City *</label>
                <SearchableDropdown value={formData.city} onChange={val => setFormData({ ...formData, city: val })} options={formData.state ? indianStatesAndCities[formData.state] : []} placeholder={formData.state ? "Select City..." : "Select State First"} disabled={!formData.state} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Residential Address *</label>
                <input
                  type="text"
                  className="input-premium w-full"
                  placeholder="House No, Building, Street..."
                  value={formData.addressLine}
                  onChange={e => setFormData({ ...formData, addressLine: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">PIN Code *</label>
                <input
                  type="text"
                  className="input-premium w-full"
                  placeholder="400001"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={e => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Identity Documents (Aadhaar & PAN) *</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Aadhaar Front */}
                <div className="relative group h-[120px]">
                  <input type="file" accept="image/*" onChange={e => setFiles({ ...files, aadhaarFront: e.target.files[0] })} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <div className="h-full flex flex-col justify-center items-center border-2 border-dashed border-slate-200 rounded-[2rem] text-center group-hover:border-primary-500 transition-all bg-white shadow-sm overflow-hidden p-2">
                    {files.aadhaarFront ? (
                      <div className="w-full h-full relative">
                        <img src={URL.createObjectURL(files.aadhaarFront)} className="w-full h-full object-cover rounded-[1.5rem]" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider rounded-[1.5rem]">
                          Change Image
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="mx-auto w-6 h-6 text-slate-400 mb-2" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase line-clamp-1">Aadhaar Front</span>
                      </>
                    )}
                  </div>
                </div>
                {/* Aadhaar Back */}
                <div className="relative group h-[120px]">
                  <input type="file" accept="image/*" onChange={e => setFiles({ ...files, aadhaarBack: e.target.files[0] })} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <div className="h-full flex flex-col justify-center items-center border-2 border-dashed border-slate-200 rounded-[2rem] text-center group-hover:border-primary-500 transition-all bg-white shadow-sm overflow-hidden p-2">
                    {files.aadhaarBack ? (
                      <div className="w-full h-full relative">
                        <img src={URL.createObjectURL(files.aadhaarBack)} className="w-full h-full object-cover rounded-[1.5rem]" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider rounded-[1.5rem]">
                          Change Image
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="mx-auto w-6 h-6 text-slate-400 mb-2" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase line-clamp-1">Aadhaar Back</span>
                      </>
                    )}
                  </div>
                </div>
                {/* PAN */}
                <div className="relative group h-[120px]">
                  <input type="file" accept="image/*" onChange={e => setFiles({ ...files, panCard: e.target.files[0] })} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <div className="h-full flex flex-col justify-center items-center border-2 border-dashed border-slate-200 rounded-[2rem] text-center group-hover:border-primary-500 transition-all bg-white shadow-sm overflow-hidden p-2">
                    {files.panCard ? (
                      <div className="w-full h-full relative">
                        <img src={URL.createObjectURL(files.panCard)} className="w-full h-full object-cover rounded-[1.5rem]" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider rounded-[1.5rem]">
                          Change Image
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="mx-auto w-6 h-6 text-slate-400 mb-2" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase line-clamp-1">Upload PAN Card</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Digital Signature *</label>
              <div className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 h-[280px]">
                <SignatureCanvas onCapture={(blob) => setFiles({ ...files, signature: blob })} />
              </div>
            </div>

            {/* Legal Acknowledgement */}
            <div className="space-y-6 pt-6 border-t border-slate-200/50">
              <h3 className="text-xl font-outfit font-black text-slate-900 tracking-tight">Legal Acknowledgement</h3>
              <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-6 md:p-8 space-y-6 max-h-[300px] overflow-y-auto shadow-inner">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">1. Identity Verification and Authentication</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    To ensure the integrity of the examination process and to prevent proxy attendance, the Candidate hereby authorizes the Portal to capture a live photograph (selfie) at the commencement of and/or during the examination. This image will be used solely to authenticate the Candidate's identity against registered records. Failure to provide a clear image or any attempt to bypass this authentication may result in immediate disqualification.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">2. Purpose of Certification and Employment Disclaimer</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium mb-2">
                    The Candidate acknowledges and agrees that this certification is intended solely for personal and professional growth.
                  </p>
                  <ul className="list-disc pl-5 text-xs text-slate-600 space-y-2 font-medium">
                    <li><strong>No Guarantee of Employment:</strong> Successful completion of the exam and issuance of a certificate does not guarantee a job offer, placement, or any form of employment.</li>
                    <li><strong>No Guarantee of Financial Increase:</strong> This certification does not entitle the Candidate to a salary hike, promotion, or bonus from any current or future employer.</li>
                  </ul>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium mt-2">
                    The Portal and its affiliates are not liable for any career expectations not met following the attainment of this certification.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">3. Academic Integrity</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    The Candidate agrees to complete the examination independently without the use of unauthorized materials, AI tools, or external assistance. Any detected malpractice will lead to the permanent banning of the Candidate's profile and the nullification of any previous results.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">4. Limitation of Liability</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    The Portal shall not be held responsible for technical failures on the Candidate's end, including but not limited to internet connectivity issues, hardware malfunctions, or power outages during the examination session.
                  </p>
                </div>
                <div className="space-y-3 pt-3 border-t border-slate-200/60">
                  <h4 className="text-sm font-bold text-slate-900">5. Defatigability of Services & Definitive "No-Refund" Policy</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Cambridge Learning Services distributes high-value, proprietary digital intellectual property. Due to the digital nature of these assets—which can be instantly viewed, saved, or downloaded upon release—all transactions executed on https://cambridgelearningservices.org are strictly FINAL, NON-CANCELLABLE, AND NON-REFUNDABLE.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-rose-200/80 shadow-sm mt-3">
                    <table className="w-full text-left border-collapse text-[11px] bg-white">
                      <thead>
                        <tr className="bg-rose-50/90 border-b border-rose-200/70 text-[#991B1B] uppercase font-bold tracking-wider">
                          <th className="p-3 border-r border-rose-100/60 w-1/4">Policy Provision</th>
                          <th className="p-3 border-r border-rose-100/60 w-5/12">Description & Execution Threshold</th>
                          <th className="p-3">Legal Impact on Client</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100/70 text-slate-700">
                        <tr>
                          <td className="p-3 font-bold text-slate-900 border-r border-rose-100/50 align-top">Instant Fulfillment Waiver</td>
                          <td className="p-3 border-r border-rose-100/50 align-top">Triggered immediately upon Step 1 (Payment Clearance) and Step 5 (PDF Study Material Dissemination).</td>
                          <td className="p-3 align-top">The Client <strong className="text-slate-900 font-bold">explicitly waives any right to an operational "cooling-off period"</strong> or transaction cancellation once assets are deployed.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-slate-900 border-r border-rose-100/50 align-top">One-Time Sharing Indemnification</td>
                          <td className="p-3 border-r border-rose-100/50 align-top">Established upon execution of the "Strict One-Time Release" protocols in Step 5 and Step 7.</td>
                          <td className="p-3 align-top">The platform is <strong className="text-slate-900 font-bold">completely indemnified</strong> against student complaints regarding data loss, user error, device incompatibility, or platform lockouts resulting from a breach of user rules.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-slate-900 border-r border-rose-100/50 align-top">KYC Refusal Forfeiture</td>
                          <td className="p-3 border-r border-rose-100/50 align-top">Triggered if a user refuses or fails Step 2 (Document KYC) or Step 3 (Video KYC).</td>
                          <td className="p-3 align-top">The user's account will be permanently banned for a security breach. <strong className="text-slate-900 font-bold">All paid registration fees are entirely forfeited</strong> to cover administrative processing costs.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-slate-900 border-r border-rose-100/50 align-top">Dispute & Chargeback Mitigation</td>
                          <td className="p-3 border-r border-rose-100/50 align-top">Triggered when a client files a dispute, credit card chargeback, or payment reversal claim.</td>
                          <td className="p-3 align-top">Treated legally as a <strong className="text-slate-900 font-bold">breach of contract</strong>. The platform will submit this policy and server logs to banks to <strong className="text-slate-900 font-bold">aggressively deny the claim</strong>.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-4 cursor-pointer group mt-4 bg-white p-4 rounded-2xl border border-slate-100 hover:border-primary-500/30 transition-all shadow-sm">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isLegalAccepted}
                    onChange={() => setIsLegalAccepted(!isLegalAccepted)}
                  />
                  <div className="w-6 h-6 border-2 border-slate-200 rounded-lg group-hover:border-primary-500 transition-all peer-checked:bg-primary-500 peer-checked:border-primary-500" />
                  <CheckCircle className="absolute inset-0 w-6 h-6 text-white scale-0 peer-checked:scale-100 transition-transform" />
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-relaxed">
                  I have read, understood, and agree to follow all the legal terms and academic integrity policies mentioned above.
                </span>
              </label>
            </div>

            <AnimatePresence>
              {isLegalAccepted && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full btn-premium !py-5 !text-lg !rounded-2xl shadow-2xl flex items-center justify-center gap-3 overflow-hidden"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Complete Registration <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                </motion.button>
              )}
            </AnimatePresence>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default CompleteProfile;
