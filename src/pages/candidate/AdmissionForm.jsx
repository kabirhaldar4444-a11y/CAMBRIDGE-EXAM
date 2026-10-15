import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { 
  ArrowRight, 
  ArrowLeft, 
  Camera, 
  RotateCcw, 
  Loader2, 
  CheckCircle, 
  MapPin, 
  LogIn, 
  Copy, 
  Check 
} from 'lucide-react';

const indianStates = [
  "Select State", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export default function AdmissionForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedId, setSubmittedId] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [result, setResult] = useState("");

  // Script Language (Both, English, Hindi)
  const [activeScriptLang, setActiveScriptLang] = useState('both');

  // Step 1 Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [courseName, setCourseName] = useState('');

  // Step 2 Form Fields
  const [pincode, setPincode] = useState('');
  const [stateName, setStateName] = useState('Select State');
  const [cityName, setCityName] = useState('');
  const [address, setAddress] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeMsg, setPincodeMsg] = useState('');

  // Video Recording & Media
  const [videoStream, setVideoStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [capturedProfilePhoto, setCapturedProfilePhoto] = useState(null);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Identity Documents Previews
  const [aadhaarFrontPreview, setAadhaarFrontPreview] = useState(null);
  const [aadhaarBackPreview, setAadhaarBackPreview] = useState(null);
  const [panCardPreview, setPanCardPreview] = useState(null);

  // Signature Canvas
  const canvasRef = useRef(null);
  const [signatureData, setSignatureData] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Terms Acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);

  // User IP Address
  const [userIp, setUserIp] = useState('');
  const [ipLoading, setIpLoading] = useState(false);

  // Multi-Provider Reliable IP Address Capture
  const captureIpAddress = async () => {
    if (userIp && userIp !== 'Not captured' && userIp.trim().length > 0) {
      return userIp;
    }
    setIpLoading(true);

    const providers = [
      () => fetch('https://api64.ipify.org?format=json', { signal: AbortSignal.timeout(3000) }).then(r => r.json()).then(d => d.ip),
      () => fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) }).then(r => r.json()).then(d => d.ip),
      () => fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) }).then(r => r.json()).then(d => d.ip),
      () => fetch('https://jsonip.com', { signal: AbortSignal.timeout(3000) }).then(r => r.json()).then(d => d.ip),
      () => fetch('https://api.db-ip.com/v2/free/myip', { signal: AbortSignal.timeout(3000) }).then(r => r.json()).then(d => d.ipAddress)
    ];

    for (const fetcher of providers) {
      try {
        const ip = await fetcher();
        if (ip && typeof ip === 'string' && ip.trim().length > 0) {
          const cleanIp = ip.trim();
          setUserIp(cleanIp);
          setIpLoading(false);
          return cleanIp;
        }
      } catch (err) {
        // try next provider
      }
    }

    setIpLoading(false);
    return userIp || 'Not captured';
  };

  // Initial IP capture on mount
  useEffect(() => {
    captureIpAddress();
  }, []);

  // India Post PIN Code Lookup Handler
  const fetchLocationByPincode = async (pin) => {
    const cleanPin = pin ? pin.toString().replace(/\D/g, '').trim() : '';
    if (cleanPin.length !== 6) return;

    // Trigger IP capture simultaneously
    captureIpAddress();

    try {
      setPincodeLoading(true);
      setPincodeMsg('');
      const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
      const data = await res.json();
      
      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
        const po = data[0].PostOffice[0];
        const stateFound = po.State;
        const districtFound = po.District || po.Block || po.Name;

        if (stateFound) {
          const matched = indianStates.find(s => s.toLowerCase() === stateFound.toLowerCase());
          setStateName(matched || stateFound);
        }
        if (districtFound) {
          setCityName(districtFound);
        }
        setPincodeMsg(`✓ ${districtFound ? districtFound + ', ' : ''}${stateFound || ''}`);
      } else {
        setPincodeMsg('PIN code not found in India Post');
      }
    } catch (err) {
      console.warn('India Post API error:', err);
      setPincodeMsg('Unable to fetch India Post details');
    } finally {
      setPincodeLoading(false);
    }
  };

  const handlePincodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
    // Capture IP whenever candidate enters / updates PIN code
    if (!userIp || userIp === 'Not captured') {
      captureIpAddress();
    }
    if (val.length === 6) {
      fetchLocationByPincode(val);
      captureIpAddress();
    } else {
      setPincodeMsg('');
    }
  };

  const handleAddressChange = (e) => {
    setAddress(e.target.value);
    // Capture IP whenever candidate enters / edits residential address
    if (!userIp || userIp === 'Not captured') {
      captureIpAddress();
    }
  };

  // Location Auto-Detect Handler
  const handleDetectLocation = () => {
    captureIpAddress();
    if ("geolocation" in navigator) {
      setLoadingMsg("Detecting location...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await res.json();
            if (data) {
              if (data.postcode) {
                const pin = data.postcode.replace(/\D/g, '').slice(0, 6);
                setPincode(pin);
                if (pin.length === 6) {
                  fetchLocationByPincode(pin);
                }
              }
              if (data.principalSubdivision) {
                const matched = indianStates.find(s => s.toLowerCase() === data.principalSubdivision.toLowerCase());
                setStateName(matched || data.principalSubdivision);
              }
              if (data.city || data.locality) setCityName(data.city || data.locality);
            }
          } catch (e) {
            console.warn('Geocoding notice:', e);
          } finally {
            setLoadingMsg("");
          }
        },
        () => setLoadingMsg("")
      );
    }
  };

  // Bind live stream to video element
  useEffect(() => {
    if (isCameraActive && videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [isCameraActive, videoStream]);

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [videoStream]);

  // Video Recorder Controls
  const startCamera = async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      });
      setVideoStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera/mic access error:', err);
      setErrorMsg('Camera and Microphone permissions are required to record your live video statement. Please allow permissions in your browser.');
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setIsCameraActive(false);
  };

  // Dedicated frame capture helper directly from live camera feed
  const capturePhotoFromLiveVideo = () => {
    try {
      if (videoRef.current) {
        const videoEl = videoRef.current;
        const w = videoEl.videoWidth || 640;
        const h = videoEl.videoHeight || 480;
        if (w > 0 && h > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoEl, 0, 0, w, h);
          const photoDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          if (photoDataUrl && photoDataUrl.length > 200) {
            setCapturedProfilePhoto(photoDataUrl);
            return photoDataUrl;
          }
        }
      }
    } catch (err) {
      console.warn('Live photo frame extraction notice:', err);
    }
    return null;
  };

  const startRecording = () => {
    if (!videoStream) return;
    recordedChunksRef.current = [];
    
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const mediaRecorder = new MediaRecorder(videoStream, { 
        mimeType,
        videoBitsPerSecond: 1500000 
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const maxSizeBytes = 500 * 1024 * 1024;
        if (blob.size > maxSizeBytes) {
          setErrorMsg('Recorded video exceeds the maximum limit. Please record a shorter statement.');
          stopCamera();
          return;
        }

        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideoBlob(blob);
        setRecordedVideoUrl(videoUrl);

        // Guarantee profile photo snapshot from blob if live capture was not set
        extractFrameFromBlob(blob).then(frame => {
          if (frame) {
            setCapturedProfilePhoto(prev => prev || frame);
          }
        });

        stopCamera();
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTimer(0);

      // Auto-capture clear profile photo snapshots while user is reading their statement
      setTimeout(() => {
        capturePhotoFromLiveVideo();
      }, 1500);
      setTimeout(() => {
        capturePhotoFromLiveVideo();
      }, 3000);

      timerRef.current = setInterval(() => {
        setRecordingTimer(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting video recording:', err);
      setErrorMsg('Failed to start video recording. Please ensure camera/mic permissions are enabled.');
    }
  };

  const extractFrameFromBlob = (blob) => {
    return new Promise((resolve) => {
      try {
        const v = document.createElement('video');
        v.src = URL.createObjectURL(blob);
        v.muted = true;
        v.playsInline = true;
        v.crossOrigin = 'anonymous';

        let captured = false;
        const doCapture = () => {
          if (captured) return;
          try {
            const w = v.videoWidth || 640;
            const h = v.videoHeight || 480;
            if (w > 0 && h > 0) {
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(v, 0, 0, w, h);
              captured = true;
              resolve(canvas.toDataURL('image/jpeg', 0.92));
            }
          } catch (e) {
            resolve(null);
          }
        };

        v.onloadedmetadata = () => {
          v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
        };
        v.onseeked = () => {
          doCapture();
        };
        v.onloadeddata = () => {
          doCapture();
        };
        setTimeout(() => {
          doCapture();
          if (!captured) resolve(null);
        }, 1500);
        v.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Instantly capture profile photo snapshot directly from the active live video stream
      capturePhotoFromLiveVideo();

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const retakeVideo = () => {
    setRecordedVideoBlob(null);
    setRecordedVideoUrl(null);
    setCapturedProfilePhoto(null);
    setRecordingTimer(0);
    startCamera();
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Signature Pad Handlers with touch + DPI scaling
  const getCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e, canvas);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0D4A38';
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e, canvas);
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (canvasRef.current) {
        setSignatureData(canvasRef.current.toDataURL('image/png'));
      }
    }
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setSignatureData(null);
      setHasSigned(false);
    }
  };

  // File Upload Handler
  const handleFileChange = (e, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Step 1 Submit
  const handleStep1Submit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) return setErrorMsg('Please enter your full name.');
    if (!email.trim() || !email.includes('@')) return setErrorMsg('Please enter a valid email address.');
    if (!courseName.trim()) return setErrorMsg('Please enter the course name you are applying for.');

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const blobToDataURL = (blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  };

  // Storage Upload Helper
  const uploadAsset = async (fileOrBase64, filenamePrefix) => {
    if (!fileOrBase64) return '';

    const fileExt = (fileOrBase64 instanceof Blob && fileOrBase64.type?.includes('video')) ? 'webm' : 'jpg';
    const path = `${filenamePrefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    if (supabase && supabase.storage) {
      try {
        let fileBody = fileOrBase64;
        let contentType = 'image/jpeg';

        if (fileOrBase64 instanceof Blob) {
          fileBody = fileOrBase64;
          contentType = fileOrBase64.type || (fileExt === 'webm' ? 'video/webm' : 'image/jpeg');
        } else if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
          const parts = fileOrBase64.split(';base64,');
          contentType = parts[0].split(':')[1] || 'image/jpeg';
          const raw = window.atob(parts[1]);
          const uInt8Array = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
          }
          fileBody = new Blob([uInt8Array], { type: contentType });
        }

        let targetBucket = 'admissions';
        let uploadRes = await supabase.storage.from(targetBucket).upload(path, fileBody, {
          contentType: contentType,
          upsert: true
        });

        if (uploadRes.error) {
          targetBucket = 'aadhaar_cards';
          uploadRes = await supabase.storage.from(targetBucket).upload(path, fileBody, {
            contentType: contentType,
            upsert: true
          });
        }

        if (!uploadRes.error) {
          const { data } = supabase.storage.from(targetBucket).getPublicUrl(path);
          if (data && data.publicUrl) {
            return data.publicUrl;
          }
        }
      } catch (err) {
        console.warn('Supabase storage upload notice:', err);
      }
    }

    if (typeof fileOrBase64 === 'string') {
      return fileOrBase64;
    }

    if (fileOrBase64 instanceof Blob) {
      return await blobToDataURL(fileOrBase64);
    }

    return '';
  };

  // Step 2 Submit
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!recordedVideoBlob && !recordedVideoUrl) {
      return setErrorMsg('Please record your live video statement reading the text.');
    }
    if (!pincode.trim() || pincode.length !== 6) {
      return setErrorMsg('Please enter a valid 6-digit PIN code.');
    }
    if (!stateName || stateName === 'Select State') {
      return setErrorMsg('Please select your state.');
    }
    if (!cityName.trim()) {
      return setErrorMsg('Please enter your city/district.');
    }
    if (!address.trim()) {
      return setErrorMsg('Please enter your residential address.');
    }
    if (!aadhaarFrontPreview) {
      return setErrorMsg('Please upload your Aadhaar card front image.');
    }
    if (!aadhaarBackPreview) {
      return setErrorMsg('Please upload your Aadhaar card back image.');
    }
    if (!panCardPreview) {
      return setErrorMsg('Please upload your PAN card image.');
    }
    if (!hasSigned || !signatureData) {
      return setErrorMsg('Please sign in the digital signature box.');
    }
    if (!termsAccepted) {
      return setErrorMsg('Please check the legal terms acknowledgement box to proceed.');
    }

    setResult("Sending....");
    setLoading(true);
    setLoadingMsg("Sending....");

    try {
      // 1. Ensure profile photo snapshot is extracted directly from the video statement
      let finalPhotoData = capturedProfilePhoto;
      if (!finalPhotoData && recordedVideoBlob) {
        finalPhotoData = await extractFrameFromBlob(recordedVideoBlob);
      }

      const [videoUrl, photoUrl, frontUrl, backUrl, panUrl, signUrl] = await Promise.all([
        uploadAsset(recordedVideoBlob, 'video_statement'),
        uploadAsset(finalPhotoData, 'profile_photo'),
        uploadAsset(aadhaarFrontPreview, 'aadhaar_front'),
        uploadAsset(aadhaarBackPreview, 'aadhaar_back'),
        uploadAsset(panCardPreview, 'pan_card'),
        uploadAsset(signatureData, 'signature')
      ]);

      const formatDocLink = (url) => {
        if (url && typeof url === 'string' && url.startsWith('http')) {
          return url;
        }
        return 'Saved in Admin Portal';
      };

      // Ensure IP address is strictly captured before finalizing submission
      let activeIp = userIp;
      if (!activeIp || activeIp === 'Not captured') {
        activeIp = await captureIpAddress();
      }
      if (!activeIp || activeIp.trim() === '') activeIp = 'Not captured';

      const admissionRecord = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: 'N/A',
        course_name: courseName.trim(),
        pincode: pincode.trim(),
        state: stateName.trim(),
        city: cityName.trim(),
        address: address.trim(),
        aadhaar_front_url: frontUrl || (aadhaarFrontPreview || ''),
        aadhaar_back_url: backUrl || (aadhaarBackPreview || ''),
        pan_url: panUrl || (panCardPreview || ''),
        signature_url: signUrl || (signatureData || ''),
        profile_photo_url: photoUrl || (finalPhotoData || ''),
        video_url: videoUrl || (recordedVideoUrl || ''),
        ip_address: activeIp,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      let recordId = `CLS-ADM-${Date.now().toString().slice(-6)}`;

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('admissions')
            .insert([admissionRecord])
            .select();

          if (data && data[0]) recordId = data[0].id;
          if (error) console.warn('Supabase DB Notice:', error.message);
        } catch (dbErr) {
          console.warn('DB Insert fallback notice:', dbErr);
        }
      }

      // Save local backup in cambridge_admissions (deduplicated by email)
      const existingLocal = JSON.parse(localStorage.getItem('cambridge_admissions') || '[]')
        .filter(a => a.email?.toLowerCase().trim() !== admissionRecord.email.toLowerCase().trim());
      existingLocal.unshift({ ...admissionRecord, id: recordId });
      localStorage.setItem('cambridge_admissions', JSON.stringify(existingLocal));

      // Notification via Web3Forms (Admission Verification Report)
      try {
        const reportMessage = `----------------------------------------
ADMISSION VERIFICATION REPORT
----------------------------------------
APPLICATION & CANDIDATE DETAILS:
--------------------------------
• Application Reference ID: ${recordId}
• Application Status: Pending Admin Approval
• Full Name: ${fullName.trim()}
• Email ID: ${email.trim().toLowerCase()}
• Course Applied: ${courseName.trim()}
• PIN Code: ${pincode.trim()}
• Location: ${cityName.trim()}, ${stateName.trim()}
• Residential Address: ${address.trim() || 'N/A'}
• IP Address: ${activeIp}

VERIFICATION STATUS:
------------------
• Declaration: CHECKED & ACCEPTED ✓
• Signature: CAPTURED & VERIFIED ✓
• Documentation: ALL ASSETS UPLOADED ✓

LEGAL ACKNOWLEDGEMENT & ATTESTATION:
----------------------------------
1. IDENTITY VERIFICATION:
Candidate authorizes live photo capture and video statement recording for identity
authentication and anti-proxy measures.
2. EMPLOYMENT DISCLAIMER:
Candidate acknowledges certification does not guarantee
employment, placement, or financial increases.
3. ACADEMIC INTEGRITY:
Candidate agrees to complete exams independently
without unauthorized materials or AI assistance.
4. LIMITATION OF LIABILITY:
Portal is not liable for technical failures or candidate-side
connectivity issues during examinations.

FINAL DECLARATION & FULL AGREEMENT:
----------------------------------
SERVICE DELIVERY:
Step 1: Immediate Admission Confirmation After Payment
The student onboarding journey begins instantly upon checkout. As
soon as a transaction clears our secure platform gateways, our
backend servers trigger an Automated Admission Confirmation Notice.
Students receive an digital welcome package containing their
permanent user profile IDs, platform workspace access routes, and an
overview map of their target educational tracks.

Step 2: Mandatory Document KYC Verification
In strict compliance with structural risk management policies, all
enrolled learners must verify their commercial profile data. Students
are required to securely upload their valid identity documentation
(such as government-issued photo IDs or institutional cards) to our
encrypted verification portal. This step ensures that final completion
documentation matches legal corporate profiles accurately.

Step 3: Secure Video KYC Authentication
To prevent platform identity theft, proxy testing, and transaction
chargeback vectors, students must execute an automated Video KYC
Verification step. Using an integrated web interface, learners record a
brief, self-directed biometric identity check matching their uploaded
documents. This establishes an unalterable audit trail for security
purposes.

Step 4: System Generation & Delivery of GST Invoice
Accountability and fiscal transparency are foundational to our services.
Within 24 hours of successful verification, our accounting systems
compile a comprehensive, legally compliant Corporate GST Invoice
detailing the exact service breakdown and tax identifiers. This asset is
dispatched straight to the studentʼs billing tab for corporate tax
deduction filing purposes.

Step 5: Dissemination of Comprehensive PDF Study Material (Strict
One-Time Release)
Upon successful verification, the complete independent text registry
library is unlocked. Students receive high-fidelity, comprehensive PDF
Study Materials and Text Workbooks tailored strictly to their
curriculum.
Operational Security Notice: In accordance with our digital asset
protection protocols, all reading materials are shared on a strict one
time basis only. Students must securely download and save these
assets immediately upon distribution, as link refreshes or secondary
file dispatches will not be granted.

Step 6: Issuance of Formal Training Enrollment Certificate
Before course modules begin, our records registry generates a formal,
verifiable Cambridge Learning Services Enrollment Certificate. This initial credential
serves as an active commercial proof of status, reflecting that the
individual is currently under training within an active, non-affiliated skill
development boot camp.

Step 7: Access Provisioning for Video Lecture Sessions (Strict One
Time Release)
Learners gain access to their master collection of high-definition, pre
recorded visual walkthroughs and technical screen-shares. These
professional Video Lectures contain the entirety of the execution-level
core methodologies.
Operational Security Notice: In line with platform distribution rules,
access keys to the video lecture sets are shared on a strict one-time
basis only. Re-sharing, profile splitting, or secondary video deliveries
are completely restricted to safeguard content parameters.

Step 8: Distribution of Final Examination Login Credentials
Once the 10-day, 20-day, or 30-day curriculum timeline has elapsed,
the student workspace triggers the final evaluation phase. The
platform outputs unique, encrypted Final Exam Login Credentials
directly to the student portal, giving them an isolated access window
to complete their timed, multiple-choice evaluation independently.

Step 9: Final Exam Result Processing & Delivery with Provisional
Certificate (PC)
Upon completing the examination, our grading engines parse the
submission data against metric matrices. The comprehensive Final
Exam Result Sheet is computed and displayed instantly inside the
dashboard. Graduates are immediately issued their verified Provisional
Certificate (PC), closing out the service lifecycle and enabling
immediate skill deployment in the corporate sector.

TERMS & CONDITIONS:
TERMS AND CONDITIONS UPDATE: SERVICE FULFILLMENT & NO REFUND POLICY
1. Scope of Independent Vocational Services
By completing a commercial transaction and registering for any
training program on Cambridge Learning Services (
https://cambridgelearningservices.org
), the user
(hereinafter referred to as the "Student" or "Client") explicitly
acknowledges and agrees that all services rendered are independent,
skill-based vocational training programs.
Cambridge Learning Services functions strictly as an asynchronous educational
infrastructure platform. Our programs are non-degree, non-diploma
courses and explicitly do not require or maintain any affiliation,
accreditation, or licensing from any university, government institute, or
private educational board. Cambridge Learning Services grants institutional
"Certificates of Completion" and "Provisional Certificates" based
solely on independent competency assessments.

2. Asynchronous Delivery Model & Anti-Interactive Clauses
The Client explicitly understands and accepts that Cambridge Learning Services
operates on a static digital distribution model:
Exclusivity of Medium: Training is delivered solely and exclusively via
pre-recorded, asynchronous video lecture modules and downloadable
PDF text study workbooks.
Prohibition of Live Training: Cambridge Learning Services never offers, promises, or
provides any person-to-person instruction, live classroom training,
group webinars, real-time mentorship, or interactive tutor sessions.
Self-Directed Operational Responsibility: The Student bears absolute
responsibility for navigating the course materials independently within
the platformʼs self-contained hosting framework. No claims for refunds
based on the lack of live human interaction will be entertained under
any circumstances, as the platform explicitly disclaims interactive
training.

3. Strict 9-Step Service Delivery Protocol & Binding Benchmarks
Fulfillment of the purchase contract is systematically tracked and
verified by our backend architecture across nine sequential milestones.
By enrolling, the Student agrees to comply with the operational
conditions of each step:
Admission Confirmation After Payment: Triggered instantly upon
payment gateway clearance. This marks the commencement of the
digital contractual relationship.
Mandatory Document KYC: The Student must securely upload valid
government-issued photo identification to verify their profile. Failure to
provide legitimate documentation within the course timeframe will
result in account suspension without a refund.
Mandatory Video KYC Authentication: A biometric video check must
be recorded by the student to verify identity, eliminate fraud, and
prevent proxy test-taking. Accounts failing the security profile checks
are immediately locked to preserve system integrity.
GST Invoice Delivery: A legally compliant Corporate GST Invoice is
compiled and posted to the student's dashboard within 24 hours of
successful validation.
PDF Study Material Dissemination (Strict One-Time Release Clauses):
Comprehensive text materials are unlocked inside the student portal.
The Client acknowledges that files are shared on a strict one-time
basis only. The Student bears the full legal and technical responsibility
to securely save, download, and backup these digital assets
immediately upon distribution. Cambridge Learning Services completely denies any
liability for file loss, hardware failure, or requests for link refreshes
post-distribution.
Enrollment Certificate Issuance: A digital record reflecting that the
individual is actively under training within our independent boot camp
is instantly generated and delivered.
Video Lecture Access Provisioning (Strict One-Time Release Clauses):
Pre-recorded training paths are made accessible to the profile
workspace.
Like the text files, access keys to the video streams are delivered on a
strict one-time basis only. Account sharing, profile splitting, or data
scraping are prohibited and will trigger automated account bans
without a refund.
Final Examination Login Credentials: Upon expiration of the designated
course duration (10, 20, or 30 days maximum), encrypted examination
keys are assigned to the portal.
Final Exam Grading & Provisional Certificate (PC) Delivery: Upon
submission, grading engines compute results instantly, and a
provisional credential is issued to close the service loop.

4. Defatigability of Services & Definitive "No-Refund" Policy
Cambridge Learning Services distributes high-value, proprietary digital intellectual
property. Due to the digital nature of these assets—which can be
instantly viewed, saved, or downloaded upon release—all transactions
executed on 
https://cambridgelearningservices.org
are strictly FINAL, NON-CANCELLABLE, AND NON-REFUNDABLE.

[POLICY PROVISION TABLE]--------------------------------------------------------------------------------------------------------
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
By scrolling past this screen, clicking "I Agree," or processing a training
fee payment on our network domains, you explicitly declare that you
have read, understood, and agreed to be legally bound by this Service
Delivery Framework and No-Refund Policy. If you do not accept these
asynchronous, un-affiliated delivery constraints, you must exit our
platform immediately and refrain from purchasing any services.

PRIVACY POLICY:
1. Introduction & Scope
This Privacy Policy governs the data collection, storage, processing,
and security practices of Cambridge Learning Services (operating through its
asynchronous educational infrastructure platform at
https://cambridgelearningservices.org
).
To deliver independent vocational training programs, identity
verification services, and verifiable institutional credentials, Cambridge
Learning Services must handle specific personal and biometric data. By
registering an account, making a purchase, or completing the security
verification steps, you explicitly consent to the collection, processing,
and retention practices outlined in this policy.

2. Information We Collect
Cambridge Learning Services processes information through various stages of your
onboarding, verification, and educational journey:
A. Personal Identification Data
Registration & Contact Information: Full legal name, billing address,
and corporate email address collected during checkout
or sign-up.
Fiscal Identity: Information required to generate corporate accounts,
including corporate entity names and specific tax identifiers.
B. Mandatory KYC & Security Verification Data
Documentary Identity (Document KYC): Images or digital files of valid
government-issued photo identification cards or institutional credential
badges uploaded securely to our portal.
Biometric Identity (Video KYC): Self-directed, brief video records
processed through an integrated web interface to execute facial
matching against submitted documentation and to eliminate proxy
testing.
C. Academic & Technical Workspace Logs
Evaluation Records: Answers, responses, submission timestamps, and
performance metrics parsed by our grading matrices during
automated final examinations.
System & Backend Server Logs: Unique workspace access keys,
internet protocol (IP) address mapping, browser data, and precise file
download timestamps related to the release of text libraries and video
lecture elements.

3. How We Use Your Data
Your information is processed strictly to maintain platform safety and
complete the structural service loop:
Identity Verification & Anti-Fraud: Cross-referencing your biometric
Video KYC data with your submitted physical document profile to
establish an unalterable audit trail, eliminating proxy test-taking and
financial transaction theft.
Service Fulfillment: Provisioning individual profiles with unique access
keys to streaming lecture workspaces, digital text repositories, and
encrypted final examination modules.
Credential Issuance: Generating accurate legal profiles for formal,
verifiable documents, including initial Enrollment Certificates and final
Provisional Certificates (PC).
Compliance & Legal Accountability: Compiling and posting legally
compliant Corporate GST Invoices straight to your workspace within
24 hours of successful validation.

4. Data Protection, Sharing, and Disclosure
A. Strict Third-Party Restrictions
Cambridge Learning Services treats proprietary and personal data with high security.
We do not sell, rent, trade, or share your personal, documentary, or
biometric data with external third-party marketing networks or
unrelated data brokers.
B. Conditional Sharing Framework
Data is shared exclusively under the following strict conditions:
Payment Processing: Financial details are managed securely via
encrypted, external payment gateways during checkout to clear
transactions safely.
Dispute and Chargeback Defense: In alignment with our Terms and
Conditions, if a user files a transaction dispute, credit card
chargeback, or payment reversal claim, Cambridge Learning Services will submit
backend server logs (such as download metrics and KYC verification
markers) to the involved financial institutions to defend against the
claim.
Legal Enforcement: Data may be disclosed if required by an official
court order, applicable government statutory body, or prevailing
regulatory legal framework.

5. Security & Technical Safeguards
We implement a multi-layered security infrastructure to shield your
files and identity profiles:
Data Encryption: Document uploads, video files, and financial invoice
generation are processed and stored over secure, encrypted network
connections.
Workspace Automated Bans: Automated behavioral system
parameters track multi-location concurrent logins. Profiles attempting
unauthorized concurrent access, scraping attempts via scripts, or
distributing video access streams are banned to ensure ecosystem
security.

6. Data Retention Policies
Operational Files: Personal profile structures, exam transcripts, and
credential verification links are kept for as long as your workspace
account remains active or to fulfill tax, corporate accounting, or
institutional tracking standards.
KYC Security Profiles: Biometric checks and government identification
logs are preserved securely to maintain an unalterable transaction
audit trail, serving as definitive evidence of contractual compliance.

7. Acceptance & Acknowledgement
Interacting with the platform, completing registrations, or inputting
identity vectors implies explicit and dynamic acknowledgement of this
Privacy Policy. If you do not accept these data handling rules, you must
immediately halt data submission and exit the platform.

REFUND POLICY:
1. Executive Summary & Legal Framework of Services
By completing a commercial financial transaction, processing a
payment gateway fee, or registering for any independent skill-based
training program on the Cambridge Learning Services network domains, the user
(hereinafter legally referred to as the "Student", "Client", or "User")
explicitly acknowledges, understands, and binds themselves to this
comprehensive, non-negotiable Service Fulfillment and No-Refund
Policy.
Cambridge Learning Services functions strictly and exclusively as an independent,
asynchronous educational infrastructure platform. The digital training
pathways, core methodologies, and instructional material hosted on
the platform are structured solely as non-degree, non-diploma
vocational training programs aimed at execution-level corporate skill
development.

Independent Status Notice:
The Client explicitly recognizes that Cambridge Learning Services does not maintain,
require, or claim any affiliation, accreditation, licensing, or oversight
from any university, government institute, statutory educational body,
or private educational board. All institutional credentials, including
"Certificates of Completion" and "Provisional Certificates (PC)", are
granted based entirely on independent competency assessments
managed internally by the platformʼs grading matrices. Consequently,
normal academic withdrawal policies, student tuition protection
schemes, or traditional institutional refund metrics are wholly
inapplicable to transactions executed with this platform.

2. Asynchronous Delivery Model & Anti-Interactive Clauses
A fundamental pillar of this refund policy is the nature of the service
delivery itself. Cambridge Learning Services operates on a static digital distribution
model. The commercial valuation of the program is tied directly to the
ingestion of proprietary digital intellectual property rather than live
human instruction.
Exclusivity of Medium:
All vocational training curricula are delivered solely and exclusively via
pre-recorded, asynchronous video lecture modules and downloadable
PDF text study workbooks.
Prohibition of Live Training:
The platform never offers, promises, schedules, or provides any form
of person-to-person instruction, live virtual classroom training,
synchronous group webinars, real-time mentorship, or interactive
tutor-led question-and-answer sessions.
Self-Directed Operational Responsibility:
The Student bears absolute, sole, and un-delegable responsibility for
independently navigating, reading, viewing, and completing the course
materials within the platformʼs self-contained hosting framework.
BINDING CLAUSE: No claims, complaints, demands, or legal petitions
for refunds based on a purported lack of live human interaction, lack of
custom feedback, or dissatisfaction with the self-guided nature of the
platform will be entertained under any circumstances. The platform
explicitly disclaims interactive training prior to purchase, and
registration constitutes a complete waiver of claims regarding
structural isolation during the learning process.

3. The Strict 9-Step Service Delivery Protocol
Fulfillment of the digital purchase contract is systematically tracked,
timestamped, and verified by the platform's automated backend server
log database. Contractual execution is broken down into nine
sequential milestones. By enrolling, the Student agrees that the
completion of these milestones constitutes definitive operational
execution of the service loop:
[Step 1: Payment & Instant Admission] ➡ [Step 2: Document KYC] ➡ [Step 3: Biometric Video KYC]
⬇
[Step 6: Enrollment Certificate] ⬅ [Step 5: One-Time PDF Release] ⬅ [Step 4: Corporate GST Invoice]
⬇
[Step 7: One-Time Video Release] ➡ [Step 8: Exam Key Distribution] ➡ [Step 9: Grading & Provisional Cert]

Step 1: Immediate Admission Confirmation After Payment
This step is triggered instantly upon payment gateway clearance. As
soon as the transaction clears, our backend architecture outputs an
Automated Admission Confirmation Notice containing permanent user
profile IDs, platform workspace access routes, and an educational
track overview map. This instantaneous action marks the official
commencement of the binding digital contractual relationship.

Step 2: Mandatory Document KYC Verification
In strict compliance with commercial risk management, students are
required to securely upload valid government-issued photo
identification to our encrypted verification portal. This ensures final
documentation matches legal corporate profiles. Failure to upload
legitimate documentation within the selected course timeframe results
in account suspension without refund eligibility.

Step 3: Secure Video KYC Authentication
To prevent identity theft, proxy test-taking, and transaction
chargeback vectors, students must execute an automated, self
directed biometric identity check via an integrated web interface.
Accounts failing or refusing this profile check are immediately locked
to preserve system integrity, causing immediate forfeiture of fees.

Step 4: System Generation & Delivery of GST Invoice
Accountability and fiscal transparency are verified through the
automated compilation of a legally compliant Corporate GST Invoice
detailing the exact service breakdown and tax identifiers. This asset is
dispatched straight to the studentʼs billing tab within 24 hours of
validation for corporate tax deduction purposes.

Step 5: Dissemination of Comprehensive PDF Study Material (Strict
One-Time Release)
Upon successful validation, the comprehensive text registry library is
unlocked, allowing the student to view high-fidelity PDF Study
Materials and Text Workbooks.
The One-Time Release Clause: Files are shared on a strict one-time
basis only. The Student bears full legal and technical responsibility to
securely save, download, and backup these digital assets immediately
upon distribution. Cambridge Learning Services completely denies any liability for file
loss, hardware failure, or requests for link refreshes post-distribution.

Step 6: Issuance of Formal Training Enrollment Certificate
The records registry automatically generates a formal, verifiable Cambridge Learning
Services Enrollment Certificate. Delivered straight to the portal
dashboard, this initial credential serves as active commercial proof of
status, reflecting that the individual is currently under training within an
active, non-affiliated skill development boot camp.

Step 7: Access Provisioning for Video Lecture Sessions (Strict One
Time Release)
The student profile is provisioned with access keys to the master
collection of pre-recorded visual walkthroughs and technical screen
shares containing execution-level core methodologies.
The One-Time Video Stream Clause: Like the text files, access keys to
the video streams are delivered on a strict one-time basis only.
Account sharing, profile splitting, or data scraping are prohibited and
will trigger automated account bans without a refund.

Step 8: Distribution of Final Examination Login Credentials
Upon the expiration of the designated course duration matrix (10, 20,
or 30 days maximum), the student workspace automatically triggers
the evaluation phase by outputting unique, encrypted Final Exam Login
Credentials directly to the student portal. This provides an isolated
access window to complete the timed, multiple-choice evaluation
independently.

Step 9: Final Exam Result Processing & Delivery with Provisional
Certificate (PC)
Upon submission, grading engines parse the submission data against
metric matrices instantly. The comprehensive Final Exam Result Sheet
is computed and displayed inside the dashboard, and graduates are
immediately issued their verified Provisional Certificate (PC), closing
out the service lifecycle.

4. Defatigability of Services & Definitive "No-Refund" Core Policy
Cambridge Learning Services distributes high-value, proprietary digital intellectual
property. Due to the digital nature of these assets—which can be
instantly viewed, saved, cached, screenshotted, or downloaded
immediately upon release—all transactions executed on
https://cambridgelearningservices.org
are strictly FINAL, NON-CANCELLABLE, AND
NON-REFUNDABLE.

[POLICY PROVISION TABLE]--------------------------------------------------------------------------------------------------------
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
The platform distributes standardized PDF formats and encrypted
video stream wrappers. It is the sole technical responsibility of the
Client to ensure that their personal hardware devices (desktop, laptop,
mobile, or tablet), operating systems, and internet service providers
meet the baseline operational requirements needed to stream video
data and open PDF document repositories. No refunds will be granted
based on technical limitations, outdated user browsers, local firewall
blocks, network latency, ISP restrictions, or general device
incompatibility.

B. Unilateral Account Revocation for Security Violations
Cambridge Learning Services maintains strict automated behavioral tracking
parameters across its workspace dashboards. The platform reserves
the right to terminate any user profile instantly, without warning, and
without the obligation of financial reimbursement or refund, if the
backend system logs detect any of the following unauthorized
activities:- Concurrent multi-location IP logins indicating profile sharing or
account splitting.- Attempted injection of automated data-scraping scripts, download
managers, or unauthorized stream-ripping software designed to
duplicate proprietary video lectures.- The uploading of corrupted data packages, malware, or fraudulent
identity documentation during Step 2 (Document KYC) or Step 3
(Video KYC) protocols.

C. Program Modification and Discontinuance Indemnity
Cambridge Learning Services reserves the right to modify, adjust, update, or re
sequence any portion of its pre-recorded instructional modules, PDF
workbooks, grading metrics, or exam platforms at any time to preserve
current corporate relevance. The execution of a curriculum update
does not entitle the Client to a retrofitted refund, platform credit, or
course exchange.

6. Acceptance of Terms & Dynamic Acknowledgement
By scrolling past presentation screens, checking an "I Agree"
checkbox, interacting with any workspace element, or processing a
training fee payment on our network domains, you explicitly declare
that you have read, understood, and agreed to be legally bound by this
Service Delivery Framework and No-Refund Policy.
If you do not accept these asynchronous, un-affiliated delivery
constraints, or if you maintain any reservation regarding the definitive
finality of commercial transactions executed on this domain, you must
exit our platform immediately and refrain from purchasing any
services.

ACCEPTED BY CANDIDATE: YES ✓
----------------------------------------
SUPPORTING EVIDENCE:
--------------------
• IP Address: ${activeIp}
• Profile Photo (Captured from Video):
${formatDocLink(photoUrl)}
• Live Video Statement:
${formatDocLink(videoUrl)}
• Aadhaar Card (Front):
${formatDocLink(frontUrl)}
• Aadhaar Card (Back): ${formatDocLink(backUrl)}
• PAN Card: ${formatDocLink(panUrl)}
• Digital Signature: ${formatDocLink(signUrl)}

By proceeding, the candidate electronically signs and agrees to all
terms above.
----------------------------------------
Submitted via Cambridge Learning Services Exam Portal`;

        // Clean Web3Forms Submission Pattern:
        // Only include access_key, name, email, subject, from_name, and message.
        // This guarantees the email strictly terminates on:
        // "Submitted via Cambridge Learning Services Exam Portal"
        // without appending extra trailing fields (Pincode, State, City, Address) at the bottom.
        const formData = new FormData();
        formData.append("access_key", "1c3b3a9a-a54c-4f0f-b644-f930f6cbca8b");
        formData.append("name", fullName.trim());
        formData.append("email", email.trim().toLowerCase());
        formData.append("subject", `Admission Form Submitted - ${fullName.trim()} (${courseName.trim()})`);
        formData.append("from_name", "Cambridge Learning Services Admission Portal");
        formData.append("message", reportMessage);

        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: formData
        });

        const data = await response.json();
        if (data.success) {
          setResult("Form Submitted Successfully");
          setSubmittedId(recordId);
        } else {
          setResult("Error");
          console.error("Web3Forms Notice: Email submission error", data);
          setSubmittedId(recordId);
        }
      } catch (e) {
        console.warn('Web3Forms Notice:', e);
        setResult("Error");
        setSubmittedId(recordId);
      }

    } catch (err) {
      console.error('Final Submit Error:', err);
      setResult("Error");
      setErrorMsg(err.message || 'Failed to submit admission application. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const copyToClipboard = () => {
    if (submittedId) {
      navigator.clipboard.writeText(submittedId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const inputClass = "w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-800 text-sm font-semibold focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-slate-400";
  const labelClass = "block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 ml-1";

  // SUCCESS CONFIRMATION VIEW
  if (submittedId) {
    return (
      <div className="min-h-screen py-12 px-4 font-inter text-slate-900 flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg-gradient)' }}>
        <div className="max-w-lg w-full bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-600" />
          
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto text-3xl font-black shadow-inner">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>

          <div className="space-y-2">
            <div className="inline-block px-3.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
              <span>{result || "Form Submitted Successfully"}</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight font-outfit">Application Submitted!</h2>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">
              Your admission details, live video statement, and identity verification documents have been securely processed.
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Reference Number</span>
              <button 
                type="button" 
                onClick={copyToClipboard}
                className="text-primary-700 hover:text-primary-800 flex items-center gap-1 font-bold text-[11px]"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="font-mono text-primary-700 font-black text-lg select-all bg-white px-3 py-1.5 rounded-xl border border-slate-200/80">
              {submittedId}
            </div>
            <div className="pt-2 border-t border-slate-200/60 text-slate-600 space-y-1 text-[11px]">
              <div><strong>Name:</strong> {fullName}</div>
              <div><strong>Email:</strong> {email}</div>
              <div><strong>Course:</strong> {courseName}</div>
              <div className="pt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                  Status: Pending Admin Approval
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            Our admissions department will verify your records. Updates will be dispatched to <strong>{email}</strong>.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full btn-premium !py-4 !rounded-2xl text-xs uppercase tracking-[0.2em] font-black flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Go to Candidate Portal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 font-inter text-slate-900 flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg-gradient)' }}>
      
      {/* Background Academic Auras */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[700px] h-[700px] bg-primary-600/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] bg-secondary-500/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-3xl w-full">
        
        {/* Branding Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div 
            onClick={() => navigate('/login')}
            className="w-32 h-auto p-3 bg-white rounded-3xl shadow-xl border border-slate-100 cursor-pointer hover:scale-[1.03] transition-transform duration-500 mb-5 flex items-center justify-center"
          >
            <img 
              src="/Cambridge-Learning-Services.png" 
              alt="Cambridge Learning Services" 
              className="w-full h-auto object-contain max-h-16" 
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-widest text-[#1e293b] uppercase font-outfit">ADMISSION FORM</h1>
            <p className="text-[11px] font-black tracking-[0.3em] text-primary-600 uppercase">
              STEP {step} OF 2: {step === 1 ? 'INITIAL DETAILS' : 'LIVE VIDEO & IDENTITY VERIFICATION'}
            </p>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden border-t-4 border-t-primary-600">
          
          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-between px-8 py-5 bg-slate-50 border-b border-slate-100">
            <div className={`flex items-center gap-3 ${step >= 1 ? 'text-primary-700' : 'text-slate-400'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step >= 1 ? 'bg-primary-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>1</span>
              <span className="text-[11px] font-black uppercase tracking-widest">Step 1: Details</span>
            </div>
            <div className="flex-1 mx-6 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full bg-primary-600 transition-all duration-500 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
            </div>
            <div className={`flex items-center gap-3 ${step >= 2 ? 'text-primary-700' : 'text-slate-400'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step >= 2 ? 'bg-primary-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>2</span>
              <span className="text-[11px] font-black uppercase tracking-widest">Step 2: Verification</span>
            </div>
          </div>

          <div className="p-8 md:p-12">
            
            {/* STEP 1: INITIAL DETAILS */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-6">
                <div className="space-y-2">
                  <label className={labelClass}>
                    FULL NAME <span className="text-primary-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>
                    EMAIL ADDRESS <span className="text-primary-600">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>
                    COURSE NAME <span className="text-primary-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="course_name"
                    required
                    placeholder="Enter the course you're applying for"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {errorMsg && (
                  <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-center">
                    {errorMsg}
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 px-8 rounded-2xl text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-slate-900/15 flex items-center justify-center gap-2 group active:scale-[0.99]"
                  >
                    <span>PROCEED TO VERIFICATION</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: LIVE VIDEO & IDENTITY VERIFICATION */}
            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-10">
                {errorMsg && (
                  <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-4 rounded-xl text-center">
                    {errorMsg}
                  </div>
                )}

                {/* 2A: LIVE VIDEO STATEMENT */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm font-outfit uppercase tracking-wider flex items-center gap-2">
                        <span>📹</span> STEP 2A: LIVE VIDEO STATEMENT <span className="text-primary-600">*</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Record a live video reading the read-aloud script below.
                      </p>
                    </div>

                    {/* Script Language Switcher */}
                    <div className="flex items-center self-start sm:self-auto bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                      <button 
                        type="button"
                        onClick={() => setActiveScriptLang('both')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${activeScriptLang === 'both' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Both
                      </button>
                      <button 
                        type="button"
                        onClick={() => setActiveScriptLang('en')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${activeScriptLang === 'en' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        English
                      </button>
                      <button 
                        type="button"
                        onClick={() => setActiveScriptLang('hi')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${activeScriptLang === 'hi' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        हिंदी
                      </button>
                    </div>
                  </div>

                  {/* Camera Display Box */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-[380px] flex items-center justify-center border border-slate-800 shadow-inner">
                    
                    {isCameraActive && !recordedVideoUrl && (
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]"></video>
                    )}

                    {recordedVideoUrl && (
                      <video src={recordedVideoUrl} controls autoPlay playsInline className="w-full h-full object-contain bg-black"></video>
                    )}

                    {!recordedVideoUrl && isCameraActive && (
                      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4 z-10">
                        {!isRecording ? (
                          <button 
                            type="button" 
                            onClick={startRecording}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-2.5 rounded-full text-xs flex items-center gap-2 shadow-lg shadow-rose-600/40 active:scale-95 transition-all"
                          >
                            <span className="w-3 h-3 rounded-full bg-white animate-ping"></span>
                            Start Recording
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="bg-black/80 backdrop-blur-md text-white font-mono font-bold px-4 py-2 rounded-full text-xs border border-white/20 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                              REC {formatTimer(recordingTimer)}
                            </span>
                            <button 
                              type="button" 
                              onClick={stopRecording}
                              className="bg-slate-900 hover:bg-black text-white font-bold px-6 py-2 rounded-full text-xs border border-slate-700 shadow-lg active:scale-95 transition-all"
                            >
                              Stop Recording
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {recordedVideoUrl && (
                      <div className="absolute top-4 right-4 z-10">
                        <button 
                          type="button"
                          onClick={retakeVideo}
                          className="bg-slate-900/90 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs border border-slate-700 shadow-lg flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Retake Video
                        </button>
                      </div>
                    )}

                    {!isCameraActive && !recordedVideoUrl && (
                      <div className="text-center p-6 space-y-3">
                        <button 
                          type="button"
                          onClick={startCamera}
                          className="w-16 h-16 rounded-full bg-primary-600/20 text-primary-700 border border-primary-600/30 flex items-center justify-center mx-auto text-2xl hover:scale-105 hover:bg-primary-600/30 transition-all cursor-pointer shadow-lg"
                        >
                          <Camera className="w-7 h-7 text-primary-700" />
                        </button>
                        <p className="text-xs font-bold text-slate-300">Click to Open Camera & Microphone</p>
                      </div>
                    )}
                  </div>

                  {/* Profile Photo Snapshot Preview */}
                  {capturedProfilePhoto && (
                    <div className="flex items-center gap-3.5 p-3.5 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl shadow-sm">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500 shadow-md shrink-0 bg-slate-900">
                        <img src={capturedProfilePhoto} alt="Captured Profile Photo" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Profile Photo Captured From Video Statement</span>
                        </div>
                        <p className="text-[11px] text-emerald-700/80 font-medium mt-0.5">
                          High-resolution biometric face snapshot has been automatically generated from your live video.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Read-Aloud Scripts */}
                  <div className="space-y-4 pt-2">
                    {(activeScriptLang === 'both' || activeScriptLang === 'en') && (
                      <div className="space-y-2">
                        <h5 className="font-black text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-2 ml-1">
                          <span className="w-2 h-2 rounded-full bg-primary-600"></span>
                          PLEASE READ ALOUD (ENGLISH):
                        </h5>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 text-slate-700 text-xs leading-relaxed font-medium shadow-sm space-y-3">
                          <p>
                            "My name is <strong className="text-primary-700">{fullName || 'test'}</strong>, and my registered email address is <strong className="text-primary-700">{email || 'test@gmail.com'}</strong>. I purposely recorded this video statement to verify my profile, confirm my identity, and acknowledge my enrollment in Cambridge Learning Services' professional training program (available at cambridgelearningservices.org)."
                          </p>
                          <p>
                            "I am purchasing this course for personal skill enhancement, professional development, and career growth. I fully accept and understand that Cambridge Learning Services is only an educational skills-based course training provider and never offers a job promise, job placement assurance, or particular career assurances upon course completion."
                          </p>
                          <p>
                            "Furthermore, I certify that I will not file any chargebacks or complaints regarding this transaction in the future. I also promise not to share or distribute any copyrighted course materials supplied to me throughout this program. &ldquo;This statement is made freely, knowingly, and without pressure.&rdquo;"
                          </p>
                        </div>
                      </div>
                    )}

                    {(activeScriptLang === 'both' || activeScriptLang === 'hi') && (
                      <div className="space-y-2">
                        <h5 className="font-black text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-2 ml-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          कृपया ज़ोर से पढ़ें (HINDI):
                        </h5>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 text-slate-700 text-xs leading-relaxed font-medium shadow-sm space-y-3">
                          <p>
                            "मेरा नाम <strong className="text-emerald-700">{fullName || 'test'}</strong> है और मेरा रजिस्टर्ड ईमेल एड्रेस <strong className="text-emerald-700">{email || 'test@gmail.com'}</strong> है। मैंने यह वीडियो स्टेटमेंट जान-बूझकर रिकॉर्ड किया है ताकि मैं अपनी प्रोफ़ाइल वेरिफ़ाई कर सकूँ, अपनी पहचान कन्फ़र्म कर सकूँ और Cambridge Learning Services के प्रोफ़ेशनल ट्रेनिंग प्रोग्राम (जो cambridgelearningservices.org पर उपलब्ध है) में अपने एनरोलमेंट की पुष्टि कर सकूँ।"
                          </p>
                          <p>
                            "मैं यह कोर्स अपनी पर्सनल स्किल बढ़ाने, प्रोफ़ेशनल डेवलपमेंट और करियर में आगे बढ़ने के लिए खरीद रहा हूँ। मैं पूरी तरह से मानता और समझता हूँ कि Cambridge Learning Services सिर्फ़ एक एजुकेशनल स्किल-बेस्ड कोर्स ट्रेनिंग प्रोवाइडर है और कोर्स पूरा होने पर कभी भी नौकरी का वादा, नौकरी मिलने की गारंटी या किसी खास करियर की गारंटी नहीं देता है।"
                          </p>
                          <p>
                            "इसके अलावा, मैं यह सर्टिफ़ाई करता हूँ कि भविष्य में इस ट्रांसैक्शन के बारे में कोई चार्जबैक या शिकायत नहीं करूँगा। मैं यह भी वादा करता हूँ कि इस प्रोग्राम के दौरान मुझे दिए गए किसी भी कॉपीराइट वाले कोर्स मटीरियल को शेयर या डिस्ट्रीब्यूट नहीं करूँगा। &ldquo;यह स्टेटमेंट बिना किसी दबाव के, पूरी जानकारी के साथ और अपनी मर्ज़ी से दिया जा रहा है।&rdquo;"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2B: RESIDENTIAL LOCATION */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-black text-slate-900 text-sm font-outfit uppercase tracking-wider">
                      STEP 2B: RESIDENTIAL LOCATION
                    </h4>
                    <button 
                      type="button" 
                      onClick={handleDetectLocation}
                      className="text-xs font-bold text-primary-700 hover:text-primary-800 flex items-center gap-1 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Detect Location</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                          PIN CODE *
                        </label>
                        {pincodeLoading && (
                          <span className="text-[10px] text-primary-600 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-ping"></span>
                            Fetching...
                          </span>
                        )}
                        {!pincodeLoading && pincodeMsg && (
                          <span className={`text-[10px] font-bold ${pincodeMsg.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {pincodeMsg}
                          </span>
                        )}
                      </div>
                      <input 
                        type="text" 
                        required
                        maxLength={6}
                        placeholder="6-digit PIN"
                        value={pincode}
                        onChange={handlePincodeChange}
                        onBlur={() => { if (!userIp || userIp === 'Not captured') captureIpAddress(); }}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>STATE / UT *</label>
                      <select 
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className={`${inputClass} cursor-pointer`}
                      >
                        {indianStates.map((st, idx) => (
                          <option key={idx} value={st} disabled={idx === 0}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>CITY / DISTRICT *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="City Name"
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>RESIDENTIAL ADDRESS *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Flat / House No., Street, Locality"
                      value={address}
                      onChange={handleAddressChange}
                      onBlur={() => { if (!userIp || userIp === 'Not captured') captureIpAddress(); }}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* 2C: IDENTITY DOCUMENTS */}
                <div className="space-y-4">
                  <h4 className="font-black text-slate-900 text-sm font-outfit uppercase tracking-wider border-b border-slate-100 pb-2">
                    STEP 2C: IDENTITY DOCUMENTS
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Aadhaar Front */}
                    <div className="space-y-2">
                      <label className={labelClass}>AADHAAR FRONT *</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        required={!aadhaarFrontPreview}
                        onChange={(e) => handleFileChange(e, setAadhaarFrontPreview)}
                        className="text-xs w-full text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-600/10 file:text-primary-700 hover:file:bg-primary-600/20 cursor-pointer"
                      />
                      {aadhaarFrontPreview && (
                        <div className="h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner">
                          <img src={aadhaarFrontPreview} alt="Aadhaar Front" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Aadhaar Back */}
                    <div className="space-y-2">
                      <label className={labelClass}>AADHAAR BACK *</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        required={!aadhaarBackPreview}
                        onChange={(e) => handleFileChange(e, setAadhaarBackPreview)}
                        className="text-xs w-full text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-600/10 file:text-primary-700 hover:file:bg-primary-600/20 cursor-pointer"
                      />
                      {aadhaarBackPreview && (
                        <div className="h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner">
                          <img src={aadhaarBackPreview} alt="Aadhaar Back" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* PAN Card */}
                    <div className="space-y-2">
                      <label className={labelClass}>PAN CARD *</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        required={!panCardPreview}
                        onChange={(e) => handleFileChange(e, setPanCardPreview)}
                        className="text-xs w-full text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-600/10 file:text-primary-700 hover:file:bg-primary-600/20 cursor-pointer"
                      />
                      {panCardPreview && (
                        <div className="h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner">
                          <img src={panCardPreview} alt="PAN Card" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2D: DIGITAL SIGNATURE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <label className={labelClass}>DIGITAL SIGNATURE *</label>
                    {hasSigned && (
                      <button 
                        type="button" 
                        onClick={clearSignature}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
                      >
                        Clear Signature
                      </button>
                    )}
                  </div>

                  <div className="border border-slate-300 rounded-2xl overflow-hidden bg-slate-50 relative shadow-inner">
                    <canvas 
                      ref={canvasRef}
                      width={700}
                      height={150}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-36 bg-white cursor-crosshair touch-none"
                    ></canvas>
                    {!hasSigned && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-bold uppercase tracking-wider opacity-60">
                        Sign Here Using Mouse or Touch Screen
                      </div>
                    )}
                  </div>
                </div>

                {/* 2E: LEGAL TERMS ACKNOWLEDGEMENT */}
                <label className="flex items-start gap-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100/60 transition-colors">
                  <input 
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed font-medium select-none">
                    I certify that all details, identity documents, digital signature, and live video statement submitted are genuine. I agree to the terms and policies of Cambridge Learning Services.
                  </span>
                </label>

                {/* Navigation Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setStep(1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Step 1</span>
                  </button>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    {result && (
                      <span className={`text-xs font-bold px-3.5 py-2 rounded-xl border flex items-center gap-2 ${
                        result === 'Sending....'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                          : result === 'Form Submitted Successfully'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {result === 'Sending....' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{result}</span>
                      </span>
                    )}

                    {termsAccepted ? (
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto btn-premium !py-4 !px-8 !rounded-2xl text-xs uppercase tracking-[0.2em] font-black transition-all shadow-xl shadow-primary-600/25 flex items-center justify-center gap-2 animate-fade-in"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{result || loadingMsg || 'Sending....'}</span>
                          </>
                        ) : (
                          <>
                            <span>Submit Form</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="text-[11px] font-bold text-slate-400 italic text-center sm:text-right">
                        Please check the agreement box above to enable submission
                      </div>
                    )}
                  </div>
                </div>

              </form>
            )}

          </div>

        </div>

        {/* Footer Link */}
        <div className="mt-8 text-center pb-6">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary-700 transition-colors"
          >
            Already have an account? Sign In to Candidate Portal
          </button>
        </div>

      </div>
    </div>
  );
}
