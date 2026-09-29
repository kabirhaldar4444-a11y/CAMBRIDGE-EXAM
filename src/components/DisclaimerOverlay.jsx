import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAlert } from '../context/AlertProvider';

const DisclaimerOverlay = ({ user, profile, onAccepted }) => {
  const { showAlert } = useAlert();
  const [disclaimerCheckbox, setDisclaimerCheckbox] = useState(false);
  const [loading, setLoading] = useState(false);

  // Smart Logic: Force showing every time before registration is complete (Session-based)
  const isSessionAccepted = typeof window !== 'undefined' && sessionStorage.getItem(`disclaimer_accepted_${user?.id}`);
  
  if (!profile) return null;
  
  // Rule: Only hide if (DB flag is true AND profile is complete) OR its already accepted in THIS session
  if ((profile.disclaimer_accepted === true && profile.profile_completed === true) || isSessionAccepted) {
    return null;
  }

  const handleAcceptDisclaimer = async () => {
    if (!disclaimerCheckbox) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ disclaimer_accepted: true })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Save to session to allow this registration session to proceed
      sessionStorage.setItem(`disclaimer_accepted_${user?.id}`, 'true');
      
      if (onAccepted) onAccepted();
      showAlert('Terms accepted successfully', 'success');
      
      // Force an immediate refresh to sync database state with UI
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-3xl border border-white/50 w-full max-w-[960px] rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-primary-50/50 to-transparent">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-600/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Cambridge Learning Services Policies</h3>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] mt-1">Review our service delivery and privacy standards</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">

            <div className="max-w-[850px] mx-auto space-y-12">
              
              {/* 1. Service Delivery / Platform */}
              <section className="space-y-6">
                <h4 className="text-[26px] font-bold text-slate-900 border-l-4 border-primary-500 pl-5">1. Service Delivery</h4>
                <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100/80">
                  <div className="space-y-6 text-slate-600 text-[15px] leading-relaxed">
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">🔎 Step 1: Immediate Admission Confirmation After Payment</h5>
                      <p>The student onboarding journey begins instantly upon checkout. As soon as a transaction clears our secure platform gateways, our backend servers trigger an Automated Admission Confirmation Notice. Students receive a digital welcome package containing their permanent user profile IDs, platform workspace access routes, and an overview map of their target educational tracks.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">📌 Step 2: Mandatory Document KYC Verification</h5>
                      <p>In strict compliance with structural risk management policies, all enrolled learners must verify their commercial profile data. Students are required to securely upload their valid identity documentation (such as government-issued photo IDs or institutional cards) to our encrypted verification portal. This step ensures that final completion documentation matches legal corporate profiles accurately.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">🔎 Step 3: Secure Video KYC Authentication</h5>
                      <p>To prevent platform identity theft, proxy testing, and transaction chargeback vectors, students must execute an automated Video KYC Verification step. Using an integrated web interface, learners record a brief, self-directed biometric identity check matching their uploaded documents. This establishes an unalterable audit trail for security purposes.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">📊 Step 4: System Generation & Delivery of GST Invoice</h5>
                      <p>Accountability and fiscal transparency are foundational to our services. Within 24 hours of successful verification, our accounting systems compile a comprehensive, legally compliant Corporate GST Invoice detailing the exact service breakdown and tax identifiers. This asset is dispatched straight to the student's billing tab for corporate tax deduction filing purposes.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">🗒️ Step 5: Dissemination of Comprehensive PDF Study Material <span className="text-rose-600">(Strict One-Time Release)</span></h5>
                      <p>Upon successful verification, the complete independent text registry library is unlocked. Students receive high-fidelity, comprehensive PDF Study Materials and Text Workbooks tailored strictly to their curriculum.</p>
                      <p className="mt-2 text-rose-600 font-semibold">⚠️ Operational Security Notice: In accordance with our digital asset protection protocols, all reading materials are shared on a strict one-time basis only. Students must securely download and save these assets immediately upon distribution, as link refreshes or secondary file dispatches will not be granted.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">🌟 Step 6: Issuance of Formal Training Enrollment Certificate</h5>
                      <p>Before course modules begin, our records registry generates a formal, verifiable Cambridge Learning Services Enrollment Certificate. This initial credential serves as an active commercial proof of status, reflecting that the individual is currently under training within an active, non-affiliated skill development boot camp.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">📈 Step 7: Access Provisioning for Video Lecture Sessions <span className="text-rose-600">(Strict One-Time Release)</span></h5>
                      <p>Learners gain access to their master collection of high-definition, pre-recorded visual walkthroughs and technical screen-shares. These professional Video Lectures contain the entirety of the execution-level core methodologies.</p>
                      <p className="mt-2 text-rose-600 font-semibold">⚠️ Operational Security Notice: In line with platform distribution rules, access keys to the video lecture sets are shared on a strict one-time basis only. Re-sharing, profile splitting, or secondary video deliveries are completely restricted to safeguard content parameters.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">🗓️ Step 8: Distribution of Final Examination Login Credentials</h5>
                      <p>Once the designated curriculum timeline has elapsed, the student workspace triggers the final evaluation phase. The platform outputs unique, encrypted Final Exam Login Credentials directly to the student portal, giving them an isolated access window to complete their timed, multiple-choice evaluation independently.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">✅ Step 9: Final Exam Result Processing & Delivery with Provisional Certificate (PC)</h5>
                      <p>Upon completing the examination, our grading engines parse the submission data against metric matrices. The comprehensive Final Exam Result Sheet is computed and displayed instantly inside the dashboard. Graduates are immediately issued their verified Provisional Certificate (PC), closing out the service lifecycle and enabling immediate skill deployment in the corporate sector.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Terms & Conditions */}
              <section className="space-y-6">
                <h4 className="text-[26px] font-bold text-slate-900 border-l-4 border-primary-500 pl-5">2. Terms & Conditions</h4>
                <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100/80">
                  <div className="space-y-6 text-slate-600 text-[15px] leading-relaxed">
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">1. Scope of Independent Vocational Services</h5>
                      <p>By completing a commercial transaction and registering for any training program on Cambridge Learning Services (https://cambridgelearningservices.org), you explicitly acknowledge and agree that all services rendered are independent, skill-based vocational training programs. Cambridge Learning Services functions strictly as an asynchronous educational infrastructure platform. Our programs are non-degree, non-diploma courses and explicitly do not require or maintain any affiliation, accreditation, or licensing from any university, government institute, or private educational board.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">2. Asynchronous Delivery Model & Anti-Interactive Clauses</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Exclusivity of Medium:</strong> Training is delivered solely and exclusively via pre-recorded, asynchronous video lecture modules and downloadable PDF text study workbooks.</li>
                        <li><strong>Prohibition of Live Training:</strong> Cambridge Learning Services never offers, promises, or provides any person-to-person instruction, live classroom training, group webinars, real-time mentorship, or interactive tutor sessions.</li>
                        <li><strong>Self-Directed Operational Responsibility:</strong> The Student bears absolute responsibility for navigating the course materials independently. No claims for refunds based on the lack of live human interaction will be entertained under any circumstances.</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">3. Strict 9-Step Service Delivery Protocol & Binding Benchmarks</h5>
                      <p className="mb-2">Fulfillment of the purchase contract is systematically tracked and verified by our backend architecture across nine sequential milestones. By enrolling, the Student agrees to comply with the operational conditions of each step:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Step 1 – Admission Confirmation After Payment:</strong> Triggered instantly upon payment gateway clearance. This marks the commencement of the digital contractual relationship.</li>
                        <li><strong>Step 2 – Mandatory Document KYC:</strong> The Student must securely upload valid government-issued photo identification. Failure to provide legitimate documentation within the course timeframe will result in account suspension without a refund.</li>
                        <li><strong>Step 3 – Mandatory Video KYC Authentication:</strong> A biometric video check must be recorded by the student to verify identity, eliminate fraud, and prevent proxy test-taking. Accounts failing the security profile checks are immediately locked.</li>
                        <li><strong>Step 4 – GST Invoice Delivery:</strong> A legally compliant Corporate GST Invoice is compiled and posted to the student's dashboard within 24 hours of successful validation.</li>
                        <li><strong>Step 5 – PDF Study Material Dissemination (Strict One-Time Release):</strong> Files are shared on a strict one-time basis only. The Student bears the full legal and technical responsibility to securely save, download, and backup these digital assets immediately upon distribution.</li>
                        <li><strong>Step 6 – Enrollment Certificate Issuance:</strong> A digital record reflecting active training within our independent boot camp is instantly generated and delivered.</li>
                        <li><strong>Step 7 – Video Lecture Access Provisioning (Strict One-Time Release):</strong> Access keys to the video streams are delivered on a strict one-time basis only. Account sharing, profile splitting, or data scraping are prohibited and will trigger automated account bans without a refund.</li>
                        <li><strong>Step 8 – Final Examination Login Credentials:</strong> Upon expiration of the designated course duration, encrypted examination keys are assigned to the portal.</li>
                        <li><strong>Step 9 – Final Exam Grading & Provisional Certificate (PC) Delivery:</strong> Upon submission, grading engines compute results instantly, and a provisional credential is issued to close the service loop.</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">4. Certificate Format</h5>
                      <p>Upon successful completion of the program, the certificate will be released with an abbreviation format. For example, if the course enrolled is "Resilience Coach Training", then "RCT" will appear on the certificate; similarly, "Decision Making Mastery Training" will show "DMMT".</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">5. Acceptance of Terms</h5>
                      <p>By scrolling past this screen, clicking "I Agree," or processing a training fee payment on our network domains, you explicitly declare that you have read, understood, and agreed to be legally bound by this Service Delivery Framework and No-Refund Policy.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Privacy Policy */}
              <section className="space-y-6">
                <h4 className="text-[26px] font-bold text-slate-900 border-l-4 border-primary-500 pl-5">3. Privacy Policy</h4>
                <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100/80">
                  <div className="space-y-6 text-slate-600 text-[15px] leading-relaxed">
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">1. Introduction & Scope</h5>
                      <p>This Privacy Policy governs the data collection, storage, processing, and security practices of Cambridge Learning Services (operating through its asynchronous educational infrastructure platform at https://cambridgelearningservices.org). By registering an account, making a purchase, or completing the security verification steps, you explicitly consent to the collection, processing, and retention practices outlined in this policy.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">2. Information We Collect</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Personal Identification Data:</strong> Full legal name, billing address, phone number, and corporate email address collected during checkout or sign-up.</li>
                        <li><strong>Documentary Identity (Document KYC):</strong> Images or digital files of valid government-issued photo identification cards uploaded securely to our portal.</li>
                        <li><strong>Biometric Identity (Video KYC):</strong> Self-directed, brief video records processed through an integrated web interface to execute facial matching against submitted documentation and to eliminate proxy testing.</li>
                        <li><strong>Evaluation Records:</strong> Answers, responses, submission timestamps, and performance metrics parsed by our grading matrices during automated final examinations.</li>
                        <li><strong>System & Backend Server Logs:</strong> Unique workspace access keys, IP address mapping, browser data, and precise file-download timestamps related to the release of text libraries and video lecture elements.</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">3. How We Use Your Data</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Identity Verification & Anti-Fraud:</strong> Cross-referencing your biometric Video KYC data with your submitted physical document profile to establish an unalterable audit trail, eliminating proxy test-taking and financial transaction theft.</li>
                        <li><strong>Service Fulfillment:</strong> Provisioning individual profiles with unique access keys to streaming lecture workspaces, digital text repositories, and encrypted final examination modules.</li>
                        <li><strong>Credential Issuance:</strong> Generating accurate legal profiles for formal, verifiable documents, including initial Enrollment Certificates and final Provisional Certificates (PC).</li>
                        <li><strong>Compliance & Legal Accountability:</strong> Compiling and posting legally compliant Corporate GST Invoices straight to your workspace within 24 hours of successful validation.</li>
                      </ul>
                      <p className="mt-2">We do not sell, rent, trade, or share your personal, documentary, or biometric data with external third-party marketing networks or unrelated data brokers.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">4. Data Protection, Sharing & Disclosure</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Payment Processing:</strong> Financial details are managed securely via encrypted, external payment gateways during checkout to clear transactions safely.</li>
                        <li><strong>Dispute and Chargeback Defense:</strong> If a user files a transaction dispute, credit card chargeback, or payment reversal claim, Cambridge Learning Services will submit backend server logs (such as download metrics and KYC verification markers) to the involved financial institutions to defend against the claim.</li>
                        <li><strong>Legal Enforcement:</strong> Data may be disclosed if required by an official court order, applicable government statutory body, or prevailing regulatory legal framework.</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">5. Security & Technical Safeguards</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Data Encryption:</strong> Document uploads, video files, and financial invoice generation are processed and stored over secure, encrypted network connections.</li>
                        <li><strong>Workspace Automated Bans:</strong> Automated behavioral system parameters track multi-location concurrent logins. Profiles attempting unauthorized concurrent access, scraping attempts via scripts, or distributing video access streams are banned to ensure ecosystem security.</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">6. Data Retention Policies</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Operational Files:</strong> Personal profile structures, exam transcripts, and credential verification links are kept for as long as your workspace account remains active or to fulfill tax, corporate accounting, or institutional tracking standards.</li>
                        <li><strong>KYC Security Profiles:</strong> Biometric checks and government identification logs are preserved securely to maintain an unalterable transaction audit trail, serving as definitive evidence of contractual compliance.</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">7. Acceptance & Acknowledgement</h5>
                      <p>Interacting with the platform, completing registrations, or inputting identity vectors implies explicit and dynamic acknowledgement of this Privacy Policy. Cambridge Learning Services reserves the right to update or modify this Privacy Policy at any time without prior notice. The revised version will be posted on our website with an updated effective date.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. Refund Policy */}
              <section className="space-y-6">
                <h4 className="text-[26px] font-bold text-slate-900 border-l-4 border-primary-500 pl-5">4. Refund Policy</h4>
                <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100/80">
                  <div className="space-y-6 text-slate-600 text-[15px] leading-relaxed">
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">1. Executive Summary & Legal Framework</h5>
                      <p>By completing a commercial financial transaction or registering for any independent skill-based training program on the Cambridge Learning Services network domains, the user explicitly acknowledges, understands, and binds themselves to this comprehensive, non-negotiable Service Fulfillment and No-Refund Policy. Cambridge Learning Services functions strictly and exclusively as an independent, asynchronous educational infrastructure platform.</p>
                      <p className="mt-2 text-amber-700 font-semibold">Independent Status Notice: Cambridge Learning Services does not maintain, require, or claim any affiliation, accreditation, licensing, or oversight from any university, government institute, statutory educational body, or private educational board. Consequently, normal academic withdrawal policies, student tuition protection schemes, or traditional institutional refund metrics are wholly inapplicable.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">2. Asynchronous Delivery Model & Anti-Interactive Clauses</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Exclusivity of Medium:</strong> All vocational training curricula are delivered solely and exclusively via pre-recorded, asynchronous video lecture modules and downloadable PDF text study workbooks.</li>
                        <li><strong>Prohibition of Live Training:</strong> The platform never offers, promises, schedules, or provides any form of person-to-person instruction, live virtual classroom training, synchronous group webinars, real-time mentorship, or interactive tutor-led sessions.</li>
                        <li><strong>Binding Clause:</strong> No claims, complaints, demands, or legal petitions for refunds based on a purported lack of live human interaction or dissatisfaction with the self-guided nature of the platform will be entertained under any circumstances.</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">3. Exhaustive Legal Provisos & Operational Enforcement</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Technical Incompatibility & Device Disclaimers:</strong> No refunds will be granted based on technical limitations, outdated user browsers, local firewall blocks, network latency, ISP restrictions, or general device incompatibility.</li>
                        <li><strong>Unilateral Account Revocation for Security Violations:</strong> Cambridge Learning Services reserves the right to terminate any user profile instantly, without warning, and without the obligation of financial reimbursement, if backend system logs detect concurrent multi-location IP logins, data-scraping scripts, or fraudulent identity documentation during KYC protocols.</li>
                        <li><strong>Program Modification and Discontinuance Indemnity:</strong> Cambridge Learning Services reserves the right to modify, adjust, update, or re-sequence any portion of its instructional modules, PDF workbooks, grading metrics, or exam platforms at any time. This does not entitle the Client to a retrofitted refund, platform credit, or course exchange.</li>
                      </ul>
                    </div>

                    <div className="pt-6 border-t border-slate-200/60 space-y-4">
                      <h5 className="font-bold text-slate-800 text-lg">4. Defatigability of Services & Definitive "No-Refund" Policy</h5>
                      <p className="leading-relaxed">
                        Cambridge Learning Services distributes high-value, proprietary digital intellectual property. Due to the digital nature of these assets—which can be instantly viewed, saved, cached, screenshotted, or downloaded immediately upon release—all transactions executed on https://cambridgelearningservices.org are strictly FINAL, NON-CANCELLABLE, AND NON-REFUNDABLE.
                      </p>
                      
                      <div className="overflow-x-auto rounded-2xl border border-rose-200/80 shadow-sm mt-3 bg-white">
                        <table className="w-full text-left border-collapse text-xs md:text-sm">
                          <thead>
                            <tr className="bg-rose-50/90 border-b border-rose-200/70 text-[#991B1B] uppercase font-bold tracking-wider text-[11px] md:text-xs">
                              <th className="p-3.5 md:p-4 border-r border-rose-100/60 w-1/4">Policy Provision</th>
                              <th className="p-3.5 md:p-4 border-r border-rose-100/60 w-5/12">Description & Execution Threshold</th>
                              <th className="p-3.5 md:p-4">Legal Impact on Client</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-rose-100/70 text-slate-700">
                            <tr>
                              <td className="p-3.5 md:p-4 font-bold text-slate-900 border-r border-rose-100/50 align-top">Instant Fulfillment Waiver</td>
                              <td className="p-3.5 md:p-4 border-r border-rose-100/50 align-top">Triggered immediately upon Step 1 (Payment Clearance) and Step 5 (PDF Study Material Dissemination).</td>
                              <td className="p-3.5 md:p-4 align-top">The Client <strong className="text-slate-900 font-bold">explicitly waives any right to an operational "cooling-off period"</strong> or transaction cancellation once assets are deployed.</td>
                            </tr>
                            <tr>
                              <td className="p-3.5 md:p-4 font-bold text-slate-900 border-r border-rose-100/50 align-top">One-Time Sharing Indemnification</td>
                              <td className="p-3.5 md:p-4 border-r border-rose-100/50 align-top">Established upon execution of the "Strict One-Time Release" protocols in Step 5 and Step 7.</td>
                              <td className="p-3.5 md:p-4 align-top">The platform is <strong className="text-slate-900 font-bold">completely indemnified</strong> against student complaints regarding data loss, user error, device incompatibility, or platform lockouts resulting from a breach of user rules.</td>
                            </tr>
                            <tr>
                              <td className="p-3.5 md:p-4 font-bold text-slate-900 border-r border-rose-100/50 align-top">KYC Refusal Forfeiture</td>
                              <td className="p-3.5 md:p-4 border-r border-rose-100/50 align-top">Triggered if a user refuses or fails Step 2 (Document KYC) or Step 3 (Video KYC).</td>
                              <td className="p-3.5 md:p-4 align-top">The user's account will be permanently banned for a security breach. <strong className="text-slate-900 font-bold">All paid registration fees are entirely forfeited</strong> to cover administrative processing costs.</td>
                            </tr>
                            <tr>
                              <td className="p-3.5 md:p-4 font-bold text-slate-900 border-r border-rose-100/50 align-top">Dispute & Chargeback Mitigation</td>
                              <td className="p-3.5 md:p-4 border-r border-rose-100/50 align-top">Triggered when a client files a dispute, credit card chargeback, or payment reversal claim.</td>
                              <td className="p-3.5 md:p-4 align-top">Treated legally as a <strong className="text-slate-900 font-bold">breach of contract</strong>. The platform will submit this policy and server logs to banks to <strong className="text-slate-900 font-bold">aggressively deny the claim</strong>.</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">5. Acceptance of Terms & Dynamic Acknowledgement</h5>
                      <p>By scrolling past presentation screens, checking an "I Agree" checkbox, interacting with any workspace element, or processing a training fee payment on our network domains, you explicitly declare that you have read, understood, and agreed to be legally bound by this Service Delivery Framework and No-Refund Policy.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 5. Additional Policies */}
              <section className="space-y-6">
                <h4 className="text-[26px] font-bold text-slate-900 border-l-4 border-primary-500 pl-5">Agreement to Policies & Disclaimer</h4>
                <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100/80">
                  <div className="space-y-6 text-slate-600 text-[15px] leading-relaxed">
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">Agreement to Policies</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>By enrolling in any course offered by Cambridge Learning Services Education, candidates acknowledge and agree to comply with all policies, terms of service, and refund rules.</li>
                        <li>Enrolling confirms that the candidate has read, understood, and accepted the terms outlined in the policies, including payment, course access, exam schedules, and refund rules.</li>
                        <li>Candidates are responsible for reviewing these policies prior to enrollment, as continued use of the course materials implies acceptance of all terms.</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">Independent Organization</h5>
                      <p>Cambridge Learning Services is an independent training and service provider. We are not affiliated, associated, authorized, endorsed by, or in any way officially connected with any other institute, organization, or governing body. All rights related to our services, content, and training materials are solely reserved by Cambridge Learning Services.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">No Guarantee of Employment or Monetary Benefit</h5>
                      <p>Our programs are designed for skill development and professional enhancement only. We do not guarantee any monetary benefit, job placement, promotion, or financial gain as a result of completing our training or certification programs.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2">Third-Party Recommendations</h5>
                      <p>Cambridge Learning Services shall not be held responsible for any financial, personal, or professional loss incurred by customers who enroll in our services based on third-party recommendations, promotions, or representations. Any such engagement is strictly at the discretion and responsibility of the individual.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="p-10 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-6">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  id="disclaimer-check"
                  className="peer sr-only" 
                  checked={disclaimerCheckbox}
                  onChange={() => setDisclaimerCheckbox(!disclaimerCheckbox)}
                />
                <div className="w-6 h-6 border-2 border-slate-200 rounded-lg group-hover:border-primary-500 transition-all peer-checked:bg-primary-500 peer-checked:border-primary-500" />
                <CheckCircle className="absolute inset-0 w-6 h-6 text-white scale-0 peer-checked:scale-75 transition-transform" />
              </div>
              <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">I agree and continue to the platform</span>
            </label>

            <button 
              onClick={handleAcceptDisclaimer}
              disabled={!disclaimerCheckbox || loading}
              className="w-full btn-premium !py-5 !rounded-2xl !text-base shadow-xl hover:shadow-primary-500/25 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
            >
              Continue to Platform
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DisclaimerOverlay;
