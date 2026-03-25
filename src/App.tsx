import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check,
  Quote,
  Mic, 
  Heart, 
  Map as MapIcon, 
  Users, 
  Waypoints as Bridge, 
  Shield, 
  Wind, 
  Activity, 
  ArrowRight,
  ArrowLeft, 
  Volume2, 
  VolumeX,
  X,
  MessageSquare,
  LogOut,
  ChevronRight,
  TrendingUp,
  LayoutDashboard,
  Compass,
  Settings,
  AlertTriangle,
  Sun,
  Smile,
  Play,
  Square,
  Sparkles,
  Save,
  Send,
  User as UserIcon,
  MicOff,
  CloudFog,
  Cloud,
  History,
  DoorOpen,
  AlertCircle,
  Zap,
  Handshake,
  CloudRain,
  TreePine,
  Waves,
  Frown,
  Meh,
  RotateCcw,
  BookOpen,
  Plus,
  Phone,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Navigation,
  TrendingDown,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { AppState, User, VoiceNote, LiveSessionEntry, JournalEntry, UserGoal, EmergencyContact, CourageHistoryEntry, MoodEntry } from './types';
import { 
  generateCompanionResponse, 
  ghostModePractice, 
  generateSpeech, 
  transcribeAudio, 
  generateJournalPrompt,
  generateWhisperFeedback,
  generateWhisperInsight,
  resetApiState
} from './services/geminiService';
import { playPCM, getAudioCtx, globalResumeAudioContext } from './utils/audioUtils';
import { signUp, logIn, logOut, subscribeToAuthChanges } from './services/authService';
import { getUserData, saveUserData } from './services/userService';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { useMotionValue, useTransform, useSpring } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import Markdown from 'react-markdown';

const MicPermissionCheck = () => {
  const [status, setStatus] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setStatus(result.state as any);
        result.onchange = () => setStatus(result.state as any);
      } catch (err) {
        // Fallback for browsers that don't support permissions.query for mic
        setStatus('prompt');
      }
    };
    checkPermission();
  }, []);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setStatus('granted');
    } catch (err) {
      setStatus('denied');
    }
  };

  if (status === 'granted') {
    return (
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-vox-accent font-bold bg-vox-accent/10 px-3 py-1.5 rounded-full border border-vox-accent/20">
        <Mic size={12} />
        <span>Mic Ready</span>
      </div>
    );
  }

  return (
    <button 
      onClick={requestPermission}
      className={`flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border transition-all ${
        status === 'denied' 
          ? 'text-red-400 bg-red-400/10 border-red-400/20' 
          : 'text-vox-paper/40 bg-white/5 border-white/10 hover:bg-vox-accent/10 hover:text-vox-accent hover:border-vox-accent/20'
      }`}
    >
      {status === 'denied' ? <MicOff size={12} /> : <Mic size={12} />}
      <span>{status === 'denied' ? 'Mic Blocked' : 'Enable Mic'}</span>
    </button>
  );
};

// --- New Feature Components ---

const DailyRituals = ({ user, setUser, onBack }: { user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, onBack: () => void }) => {
  const rituals = user.dailyRituals || [];

  const toggleRitual = (id: string) => {
    const updated = rituals.map(r => r.id === id ? { ...r, completed: !r.completed, timestamp: Date.now() } : r);
    setUser(prev => prev ? ({ ...prev, dailyRituals: updated }) : null);
    
    if (updated.every(r => r.completed)) {
      setUser(prev => prev ? ({ ...prev, courageLevel: Math.min(100, prev.courageLevel + 2) }) : null);
    }
  };

  const resetRituals = () => {
    const updated = rituals.map(r => ({ ...r, completed: false, timestamp: undefined }));
    setUser(prev => prev ? ({ ...prev, dailyRituals: updated }) : null);
  };

  const completedCount = rituals.filter(r => r.completed).length;

  return (
    <div className="min-h-screen glass-aura p-6 relative overflow-hidden pt-24">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-vox-accent/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px]" />
      
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-16 relative z-10">
        <button onClick={onBack} className="p-3 bg-white/50 hover:bg-white rounded-full shadow-sm transition-all text-vox-ink/50 hover:text-vox-ink border border-vox-ink/5">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-4xl font-light tracking-tighter text-vox-ink">Daily Rituals</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-8 bg-vox-accent/20" />
            <p className="text-vox-ink/40 text-[10px] uppercase tracking-[0.3em] font-bold">Speak your strength</p>
            <div className="h-px w-8 bg-vox-accent/20" />
          </div>
        </div>
        <button 
          onClick={resetRituals}
          className="p-3 bg-white/50 hover:bg-white rounded-full shadow-sm transition-all text-vox-ink/30 hover:text-vox-accent border border-vox-ink/5"
          title="Reset Rituals"
        >
          <RotateCcw size={20} />
        </button>
      </header>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="mb-12 flex items-center justify-between px-6">
          <div className="text-sm font-serif italic text-vox-ink/60">
            {completedCount === rituals.length ? "Your spirit is fortified." : `${completedCount} of ${rituals.length} rituals observed.`}
          </div>
          <div className="w-32 h-1.5 bg-vox-ink/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / rituals.length) * 100}%` }}
              className="h-full bg-vox-accent"
            />
          </div>
        </div>

        <div className="space-y-6">
          {rituals.map((ritual, idx) => (
            <motion.div 
              key={ritual.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer group relative overflow-hidden ${
                ritual.completed 
                  ? 'bg-white border-vox-accent/30 shadow-lg shadow-vox-accent/5' 
                  : 'bg-white/40 glass-light border-vox-ink/5 hover:border-vox-accent/20 hover:bg-white/60'
              }`}
              onClick={() => toggleRitual(ritual.id)}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                    ritual.completed 
                      ? 'bg-vox-accent text-white border-vox-accent shadow-lg shadow-vox-accent/20' 
                      : 'bg-vox-ink/5 border-vox-ink/5 group-hover:border-vox-accent/20 group-hover:bg-white'
                  }`}>
                    {ritual.completed ? <Check size={24} strokeWidth={3} /> : <Mic size={24} className="text-vox-ink/20 group-hover:text-vox-accent transition-colors" />}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-2xl font-serif italic transition-all duration-500 ${ritual.completed ? 'text-vox-ink' : 'text-vox-ink/40'}`}>
                      "{ritual.text}"
                    </span>
                    {ritual.completed && (
                      <span className="text-[10px] uppercase tracking-widest text-vox-accent mt-2 font-bold opacity-70">Observed</span>
                    )}
                  </div>
                </div>
              </div>
              
              {ritual.completed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-vox-accent/5 via-transparent to-transparent pointer-events-none"
                />
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <p className="text-vox-ink/30 text-sm font-serif italic max-w-sm mx-auto leading-relaxed">
            "The words we speak to ourselves become the house we live in. Build a sanctuary of courage."
          </p>
        </div>
      </div>
    </div>
  );
};

const SafetyOnboarding = ({ user, setUser, onComplete }: { user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const [safeWord, setSafeWord] = useState(user.safeWord || '');
  const [contacts, setContacts] = useState<EmergencyContact[]>(user.emergencyContacts || []);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const handleAddContact = () => {
    if (newContactName && newContactPhone) {
      const newContact: EmergencyContact = {
        id: Math.random().toString(36).substr(2, 9),
        name: newContactName,
        phone: newContactPhone
      };
      setContacts([...contacts, newContact]);
      setNewContactName('');
      setNewContactPhone('');
    }
  };

  const handleRemoveContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleFinish = () => {
    setUser(prev => prev ? ({
      ...prev,
      safeWord,
      emergencyContacts: contacts,
      hasCompletedSafetyOnboarding: true
    }) : null);
    onComplete();
  };

  const steps = [
    {
      title: "Your Safety Sanctuary",
      description: "Voxara is a space for courage, but safety is our foundation. Let's set up your protection protocols.",
      why: "Establishing a safety net allows you to explore your voice with full confidence, knowing support is always within reach.",
      icon: Shield,
      color: "text-vox-accent"
    },
    {
      title: "The Safe Word",
      description: "Choose a word or phrase that, when spoken, immediately activates 'Anchor Mode'—a high-security, grounding state.",
      why: "In moments of overwhelm, a simple word can trigger immediate grounding exercises and discreetly alert your support system.",
      icon: Lock,
      color: "text-emerald-400"
    },
    {
      title: "Emergency Circle",
      description: "If your courage levels drop critically, we can discreetly notify your trusted circle. Add at least one contact.",
      why: "Your journey isn't meant to be walked alone. Having a trusted circle ensures you're never truly isolated in difficult moments.",
      icon: Users,
      color: "text-blue-400"
    }
  ];

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 vox-gradient opacity-30" />
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl w-full glass-dark p-12 rounded-[3rem] border border-white/10 relative z-10 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 ${steps[step].color}`}
            >
              {React.createElement(steps[step].icon, { size: 40 })}
            </motion.div>
            
            <h2 className="text-4xl font-light tracking-tighter mb-4 text-white">{steps[step].title}</h2>
            <p className="text-vox-paper/60 font-serif italic text-lg mb-6 leading-relaxed">
              {steps[step].description}
            </p>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 rounded-2xl p-4 mb-10 border border-white/5"
            >
              <p className="text-[10px] uppercase tracking-widest text-vox-accent font-bold mb-1">Why this matters</p>
              <p className="text-xs text-vox-paper/40 leading-relaxed italic">"{steps[step].why}"</p>
            </motion.div>

            {step === 1 && (
              <div className="w-full space-y-4 mb-10">
                <label className="block text-[10px] uppercase tracking-widest text-vox-paper/40 text-left ml-4">Your Safe Word</label>
                <input 
                  type="text"
                  value={safeWord}
                  onChange={(e) => setSafeWord(e.target.value)}
                  placeholder="e.g. Blue Spruce"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl focus:outline-none focus:border-vox-accent transition-colors text-center"
                />
              </div>
            )}

            {step === 2 && (
              <div className="w-full space-y-6 mb-10">
                <div className="space-y-3">
                  {contacts.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="text-left">
                        <p className="text-sm font-medium">{contact.name}</p>
                        <p className="text-xs text-vox-paper/40">{contact.phone}</p>
                      </div>
                      <button onClick={() => handleRemoveContact(contact.id)} className="text-vox-paper/20 hover:text-red-400 transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="text"
                    placeholder="Name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-vox-accent"
                  />
                  <input 
                    type="text"
                    placeholder="Phone"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-vox-accent"
                  />
                </div>
                <button 
                  onClick={handleAddContact}
                  disabled={!newContactName || !newContactPhone}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-30"
                >
                  Add Contact
                </button>
              </div>
            )}

            <div className="flex gap-4 w-full">
              {step > 0 && (
                <button 
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-4 border border-white/10 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Back
                </button>
              )}
              <button 
                onClick={() => step < steps.length - 1 ? setStep(step + 1) : handleFinish()}
                disabled={step === 1 && !safeWord}
                className="flex-[2] py-4 bg-vox-accent text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-vox-accent/20"
              >
                {step === steps.length - 1 ? "Complete Setup" : "Continue"}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-12 flex gap-2">
        {steps.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-vox-accent' : 'bg-white/10'}`} />
        ))}
      </div>
    </div>
  );
};

const VoxaraLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Curved Base */}
    <path d="M10 90C30 75 70 75 90 90" stroke="url(#logoGradient)" strokeWidth="4" strokeLinecap="round" />
    
    {/* Left Person */}
    <g transform="translate(15, 45) scale(0.8)">
      <circle cx="10" cy="5" r="5" fill="#3b82f6" />
      <path d="M0 25C0 15 20 15 20 25L15 40L5 40Z" fill="#3b82f6" opacity="0.8" />
      <path d="M5 15L-5 5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 15L25 5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Right Person */}
    <g transform="translate(65, 45) scale(0.8)">
      <circle cx="10" cy="5" r="5" fill="#f97316" />
      <path d="M0 25C0 15 20 15 20 25L15 40L5 40Z" fill="#f97316" opacity="0.8" />
      <path d="M5 15L-5 5" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 15L25 5" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Center Microphone */}
    <g transform="translate(40, 20)">
      <rect x="5" y="0" width="10" height="20" rx="5" fill="#d97706" />
      <path d="M0 10C0 20 20 20 20 10" stroke="#d97706" strokeWidth="2" fill="none" />
      <line x1="10" y1="20" x2="10" y2="25" stroke="#d97706" strokeWidth="2" />
      <line x1="5" y1="25" x2="15" y2="25" stroke="#d97706" strokeWidth="2" />
      
      {/* Sound Waves */}
      <path d="M-5 5C-8 8 -8 12 -5 15" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M-10 0C-15 5 -15 15 -10 20" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
        <animate attributeName="opacity" values="0.1;0.8;0.1" dur="2s" repeatCount="indefinite" begin="0.5s" />
      </path>
      
      <path d="M25 5C28 8 28 12 25 15" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M30 0C35 5 35 15 30 20" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
        <animate attributeName="opacity" values="0.1;0.8;0.1" dur="2s" repeatCount="indefinite" begin="0.5s" />
      </path>
    </g>

    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="100" y2="0">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="50%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>
    </defs>
  </svg>
);

const BoxBreathing = () => {
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Hold '>('Inhale');
  const [timeLeft, setTimeLeft] = useState(4);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      const phases: ('Inhale' | 'Hold' | 'Exhale' | 'Hold ')[] = ['Inhale', 'Hold', 'Exhale', 'Hold '];
      const currentIndex = phases.indexOf(phase);
      const nextIndex = (currentIndex + 1) % phases.length;
      setPhase(phases[nextIndex]);
      setTimeLeft(4);
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft, phase]);

  return (
    <div className="w-full mt-6 flex flex-col items-center">
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Pulsating Ring */}
        <AnimatePresence>
          {isActive && (
            <motion.div 
              key={phase + timeLeft}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-vox-accent/30"
            />
          )}
        </AnimatePresence>

        {/* Outer Circle (Progress) */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle 
            cx="100" cy="100" r="90" 
            className="stroke-white/5 fill-none" 
            strokeWidth="4"
          />
          <motion.circle 
            cx="100" cy="100" r="90" 
            className="stroke-vox-accent fill-none" 
            strokeWidth="4"
            strokeDasharray="565.48"
            animate={{ strokeDashoffset: 565.48 * (1 - timeLeft / 4) }}
            transition={{ duration: 1, ease: "linear" }}
            strokeLinecap="round"
          />
        </svg>

        <motion.div 
          animate={{ 
            scale: phase === 'Inhale' ? [1, 1.3] : phase === 'Exhale' ? [1.3, 1] : phase === 'Hold' ? 1.3 : 1
          }}
          transition={{ duration: 4, ease: "linear" }}
          className="absolute inset-4 rounded-full border-2 border-vox-accent/30 bg-vox-accent/5 flex items-center justify-center"
        >
          <div className="text-center z-10">
            <motion.div 
              key={timeLeft}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-vox-accent font-bold text-4xl mb-1"
            >
              {timeLeft}
            </motion.div>
            <div className="text-vox-paper/60 text-[10px] uppercase tracking-widest">{phase}</div>
          </div>
        </motion.div>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsActive(!isActive); }}
        className="mt-8 px-6 py-2 rounded-full bg-vox-accent/20 border border-vox-accent/30 text-vox-accent text-xs font-bold uppercase tracking-widest hover:bg-vox-accent/30 transition-all"
      >
        {isActive ? 'Pause' : 'Start Ritual'}
      </button>
    </div>
  );
};

const MuscleRelaxation = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTense, setIsTense] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  const steps = [
    'Toes & Feet',
    'Calves',
    'Thighs',
    'Glutes',
    'Abdomen',
    'Hands & Arms',
    'Shoulders',
    'Face & Jaw'
  ];

  useEffect(() => {
    let timer: any;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        // Subtle haptic feedback every second during tension
        if (isTense && 'vibrate' in navigator) {
          navigator.vibrate(20);
        }
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      if (!isTense) {
        // Transition to Tense
        setIsTense(true);
        setTimeLeft(5);
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      } else {
        // Transition to Release
        setIsTense(false);
        setTimeLeft(5);
        if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]); // Subtle release pulse
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsActive(false);
          setCurrentStep(0);
        }
      }
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft, isTense, currentStep]);

  return (
    <div className="w-full mt-6 flex flex-col items-center">
      <div className="text-center mb-6">
        <div className="text-vox-paper/40 text-[10px] uppercase tracking-widest mb-2">Current Area</div>
        <div className="text-xl font-serif italic text-white">{steps[currentStep]}</div>
      </div>
      
      <div className="relative w-full h-12 bg-white/5 rounded-full overflow-hidden border border-white/10">
        <motion.div 
          animate={{ 
            width: `${(timeLeft / 5) * 100}%`,
            backgroundColor: isTense ? 'rgba(242, 125, 38, 0.4)' : 'rgba(16, 185, 129, 0.4)'
          }}
          className="h-full"
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-white">
          {isTense ? `Tense - ${timeLeft}s` : `Release - ${timeLeft}s`}
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); setIsActive(!isActive); }}
        className="mt-8 px-6 py-2 rounded-full bg-vox-accent/20 border border-vox-accent/30 text-vox-accent text-xs font-bold uppercase tracking-widest hover:bg-vox-accent/30 transition-all"
      >
        {isActive ? 'Pause' : 'Start Release'}
      </button>
    </div>
  );
};

const CalmCenter = ({ onBack }: { onBack: () => void }) => {
  const [activeExercise, setActiveExercise] = useState<string | null>(null);

  const exercises = [
    {
      id: '54321',
      title: '5-4-3-2-1 Grounding',
      description: 'A technique to bring you back to the present moment.',
      steps: [
        'Acknowledge 5 things you see around you.',
        'Acknowledge 4 things you can touch.',
        'Acknowledge 3 things you hear.',
        'Acknowledge 2 things you can smell.',
        'Acknowledge 1 thing you can taste.'
      ],
      icon: <Eye size={24} />,
      interactive: null
    },
    {
      id: 'box',
      title: 'Box Breathing',
      description: 'Powerful tool to regulate your nervous system.',
      steps: [
        'Inhale for 4 seconds.',
        'Hold for 4 seconds.',
        'Exhale for 4 seconds.',
        'Hold for 4 seconds.',
        'Repeat 4 times.'
      ],
      icon: <Wind size={24} />,
      interactive: <BoxBreathing />
    },
    {
      id: 'muscle',
      title: 'Muscle Relaxation',
      description: 'Release physical tension from your body.',
      steps: [
        'Tense your toes for 5 seconds, then release.',
        'Tense your calves, then release.',
        'Tense your thighs, then release.',
        'Work your way up to your shoulders and face.',
        'Feel the weight of your body sinking down.'
      ],
      icon: <Activity size={24} />,
      interactive: <MuscleRelaxation />
    }
  ];

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper p-6">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <X size={24} />
        </button>
        <div className="flex items-center gap-4">
          <VoxaraLogo className="w-10 h-10" />
          <div className="text-center">
            <h2 className="text-3xl font-serif italic text-white">Calm Center</h2>
            <p className="text-vox-paper/40 text-xs uppercase tracking-widest mt-2">Anchor yourself in the storm</p>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {exercises.map((ex) => (
          <motion.div 
            key={ex.id}
            whileHover={{ y: -10 }}
            className={`p-8 rounded-[3rem] border transition-all cursor-pointer flex flex-col items-center text-center ${
              activeExercise === ex.id ? 'bg-vox-accent/10 border-vox-accent/30' : 'bg-[#0a0a0a]/40 border-white/5 hover:border-vox-accent/20'
            }`}
            onClick={() => setActiveExercise(ex.id)}
          >
            <div className="w-16 h-16 rounded-full bg-vox-accent/10 flex items-center justify-center mb-6 border border-vox-accent/20">
              {ex.icon}
            </div>
            <h3 className="text-xl font-serif italic text-white mb-4">{ex.title}</h3>
            <p className="text-vox-paper/40 text-sm mb-8 leading-relaxed">{ex.description}</p>
            
            <AnimatePresence>
              {activeExercise === ex.id && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full text-left space-y-4"
                >
                  <div className="h-px w-full bg-white/5 my-4" />
                  {ex.interactive}
                  {!ex.interactive && ex.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 text-sm text-vox-paper/60">
                      <span className="text-vox-accent font-mono">{i + 1}.</span>
                      {step}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div className="mt-24 max-w-lg mx-auto bg-red-500/5 border border-red-500/10 p-8 rounded-[2rem] text-center">
        <AlertCircle className="text-red-400 mx-auto mb-4" size={32} />
        <h4 className="text-white font-serif italic text-xl mb-2">Need immediate help?</h4>
        <p className="text-vox-paper/40 text-sm mb-6">If you are in immediate danger or a crisis, please reach out to emergency services.</p>
        <button 
          onClick={() => window.location.href = 'tel:988'} // US Suicide & Crisis Lifeline
          className="px-8 py-3 bg-red-500/20 text-red-400 rounded-full border border-red-500/30 hover:bg-red-500/30 transition-all font-bold tracking-widest text-xs uppercase"
        >
          Call Lifeline
        </button>
      </div>
    </div>
  );
};

// FloatingParticles: removed in light mode
const FloatingParticles = () => null;

// Pastel color map: each card gets a distinct pastel bg based on accentColor
const PASTEL_MAP: Record<string, { bg: string; text: string; iconBg: string }> = {
  '#10b981': { bg: '#DCF0E4', text: '#2D6B4A', iconBg: '#B8E4CC' },
  '#2dd4bf': { bg: '#D5EDE7', text: '#2E7D67', iconBg: '#B0D9CF' },
  '#60a5fa': { bg: '#D6E9FA', text: '#1A5F8B', iconBg: '#B0D0EF' },
  '#f27d26': { bg: '#FDE8D8', text: '#7A3F00', iconBg: '#F8CDAC' },
  '#a855f7': { bg: '#EAE7F5', text: '#5B4B8A', iconBg: '#D3CCEE' },
  '#fb923c': { bg: '#FDE8D8', text: '#7A3F00', iconBg: '#F8CDAC' },
  '#facc15': { bg: '#FAF0D6', text: '#8B6400', iconBg: '#F5DFA0' },
  '#f472b6': { bg: '#F5E0EE', text: '#8B2060', iconBg: '#EDB8D8' },
  '#94a3b8': { bg: '#EEF0F4', text: '#4A5568', iconBg: '#D8DCE6' },
};

const FeatureCard = ({
  title,
  description,
  icon: Icon,
  accentColor,
  onClick,
  label,
  className = ''
}: {
  title: string;
  description: string;
  icon: any;
  image?: string;
  accentColor: string;
  onClick: () => void;
  label: string;
  className?: string;
}) => {
  const palette = PASTEL_MAP[accentColor] || { bg: '#F5F0E8', text: '#6B6560', iconBg: '#E0D9CF' };

  return (
    <motion.button
      whileHover={{ y: -6, boxShadow: '0 12px 36px rgba(26,24,20,0.10)' }}
      onClick={onClick}
      style={{ background: palette.bg }}
      className={`group rounded-2xl p-7 text-left transition-all duration-300 border border-white/60 ${className}`}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
        style={{ background: palette.iconBg }}
      >
        <Icon size={22} style={{ color: palette.text }} />
      </div>

      {/* Label */}
      <div className="text-[9px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: palette.text + 'AA' }}>
        {label}
      </div>

      {/* Title */}
      <h3 className="text-xl font-serif mb-2 leading-snug" style={{ color: palette.text }}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm leading-relaxed" style={{ color: palette.text + 'BB' }}>
        {description}
      </p>

      {/* Arrow */}
      <div className="mt-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="h-px flex-1" style={{ background: palette.text + '30' }} />
        <ArrowRight size={14} style={{ color: palette.text }} />
      </div>
    </motion.button>
  );
};
const Magnetic = ({ children, strength = 0.5 }: { children: React.ReactNode, strength?: number }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 20, stiffness: 150 });
  const springY = useSpring(y, { damping: 20, stiffness: 150 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((clientX - centerX) * strength);
    y.set((clientY - centerY) * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
};

const QuickActions = ({ setView }: { setView: (v: AppState) => void }) => (
  <motion.div
    initial={{ y: 100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 bg-white rounded-full border border-border shadow-lg"
  >
    <button
      onClick={() => setView('settings')}
      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-50 text-rose-600 font-semibold text-xs hover:bg-rose-100 transition-colors"
    >
      <Shield size={14} /> Safe Word
    </button>
    <div className="w-px h-5 bg-border" />
    <button
      onClick={() => setView('presence')}
      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sky-50 text-sky-600 font-semibold text-xs hover:bg-sky-100 transition-colors"
    >
      <Wind size={14} /> Presence
    </button>
  </motion.div>
);

const Logo = ({ size = 40, className = "" }: { size?: number, className?: string }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div 
      className="rounded-xl overflow-hidden flex items-center justify-center bg-white border border-border/50 shadow-sm transition-transform hover:scale-105"
      style={{ width: size, height: size }}
    >
      <img 
        src="/logo.png" 
        alt="Voxara" 
        className="w-full h-full object-cover p-1"
        onError={(e) => {
          // Fallback if logo.png fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          if (target.parentElement) {
            target.parentElement.innerHTML = `<div class="w-full h-full bg-vox-accent/15 flex items-center justify-center text-vox-accent font-bold">V</div>`;
          }
        }}
      />
    </div>
    <div className="flex flex-col">
      <span className="text-[18px] font-serif font-bold leading-none tracking-tight text-dark">Voxara</span>
      <span className="text-[9px] uppercase tracking-[0.25em] text-vox-accent font-bold mt-1 opacity-70">Courage Companion</span>
    </div>
  </div>
);

const LandingPage = ({ onStart, isLoggedIn }: { onStart: () => void, isLoggedIn: boolean }) => (
  <div className="min-h-screen bg-cream text-dark selection:bg-vox-accent/20">
    {/* Navigation */}
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 h-20 flex justify-between items-center glass-premium border-b border-border/10">
      <Logo size={42} />
      <div className="hidden lg:flex items-center gap-10 text-[13px] text-muted font-bold uppercase tracking-widest">
        <span className="hover:text-vox-accent cursor-pointer transition-colors">How it works</span>
        <span className="hover:text-vox-accent cursor-pointer transition-colors">Scientific Basis</span>
        <span className="hover:text-vox-accent cursor-pointer transition-colors">Community</span>
      </div>
      <button
        onClick={onStart}
        className="px-8 py-3 rounded-full bg-dark text-cream text-[13px] font-bold uppercase tracking-widest hover:bg-vox-accent transition-all hover:shadow-[0_0_20px_rgba(92,142,130,0.3)]"
      >
        {isLoggedIn ? 'Go to App' : 'Get Started'}
      </button>
    </nav>

    {/* Hero Section */}
    <section className="relative min-h-[95vh] flex flex-col md:flex-row items-center justify-center px-6 md:px-20 pt-32 pb-20 overflow-hidden gap-16">
      <div className="absolute inset-0 vox-gradient opacity-60" />
      <div className="hero-glow" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="relative z-10 flex-1 max-w-2xl text-center md:text-left"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-vox-accent/20 bg-white/40 backdrop-blur-md text-vox-accent text-[11px] font-bold uppercase tracking-[0.3em] mb-10 shadow-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vox-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-vox-accent"></span>
          </span>
          Next-Gen Emotional Courage
        </motion.div>
        
        <h1 className="text-[clamp(44px,8vw,100px)] font-serif font-normal leading-[0.95] tracking-tight text-dark mb-8">
          Release the <br/><em className="text-vox-accent italic border-b-4 border-vox-accent/10">power</em> of your <br/>own voice.
        </h1>
        
        <p className="text-xl md:text-2xl text-muted/80 leading-relaxed mb-12 font-serif italic max-w-lg mx-auto md:mx-0">
          A premium sanctuary to practice, heal, and find your strength in a world that's always listening.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 justify-center md:justify-start">
          <button
            onClick={onStart}
            className="group relative flex items-center justify-center gap-3 px-10 py-5 rounded-full bg-dark text-cream font-bold text-sm tracking-widest uppercase hover:bg-vox-accent transition-all shadow-2xl hover:scale-105 active:scale-95"
          >
            {isLoggedIn ? 'Open Dashboard' : 'Begin Journey'} 
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="flex items-center justify-center px-10 py-5 rounded-full border-2 border-border/80 text-dark text-sm font-bold tracking-widest uppercase hover:bg-white/50 transition-all active:scale-95">
            The Voxara Method
          </button>
        </div>

        {/* Social Proof Badge */}
        <div className="mt-16 flex flex-col md:flex-row items-center gap-6 justify-center md:justify-start">
          <div className="flex items-center gap-4 px-6 py-3 rounded-full glass-premium border border-white/50 shadow-lg">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] shadow-sm">
                  <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" className="w-full h-full rounded-full grayscale hover:grayscale-0 transition-all" />
                </div>
              ))}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-dark uppercase tracking-wider">12,400+ Joined</p>
              <p className="text-[10px] text-muted font-medium">Practicing courage right now</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-bold text-vox-accent uppercase tracking-widest opacity-60">
            <Shield size={14} /> Encrypted & Private
          </div>
        </div>
      </motion.div>

      {/* Hero Visual: Premium Orb Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.5 }}
        className="relative z-10 w-full md:w-[480px] h-[550px]"
      >
        <div className="absolute inset-0 bg-vox-accent/5 rounded-[4rem] blur-3xl animate-pulse" />
        <div className="relative h-full w-full rounded-[4rem] glass-premium overflow-hidden border border-white/40 flex flex-col items-center justify-center shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-right from-transparent via-vox-accent/30 to-transparent" />
          
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-vox-accent/5 animate-pulse" />
            {[0,1,2].map(i => (
              <div key={i} className="radar-ring" style={{width:`${180+i*80}px`,height:`${180+i*80}px`,animationDelay:`${i*1.2}s`, borderStyle: i===1 ? 'dashed' : 'solid'}} />
            ))}
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }} 
              transition={{ repeat: Infinity, duration: 4 }}
              className="w-4 h-4 rounded-full bg-vox-accent shadow-[0_0_40px_rgba(92,142,130,0.6)]" 
            />
          </div>
          
          <div className="absolute bottom-12 left-0 right-0 text-center px-10">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-2xl font-serif italic text-dark mb-2"
            >
              "My voice shakes, but it is mine."
            </motion.p>
            <p className="text-[10px] uppercase tracking-[0.4em] text-vox-accent font-bold">Live Presence Session</p>
          </div>
        </div>
      </motion.div>
    </section>

    {/* Features Grid */}
    <div className="section-divider" />
    <section className="py-20 px-8 md:px-16 max-w-7xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-5xl text-dark mb-4">Audible Healing</h2>
        <p className="text-muted font-serif italic text-lg">Expression is a muscle. We help you train it.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { icon: Mic, title: 'Whisper Ritual', desc: 'Start with breath, grow to full voice. Fear reduces when expression is gradual.', bg: 'card-mint', iconColor: '#2E7D67' },
          { icon: Sparkles, title: 'AI Companion', desc: 'Trauma-informed AI that validates first, steps back when you are ready.', bg: 'card-lavender', iconColor: '#5B4B8A' },
          { icon: Bridge, title: 'Beloved Bridge™', desc: 'Practice difficult conversations safely before having them in real life.', bg: 'card-amber', iconColor: '#8B6400' },
          { icon: Wind, title: 'Presence Mode', desc: 'Sometimes healing means just breathing alongside others. You are not alone.', bg: 'card-sky', iconColor: '#1A5F8B' },
        ].map(({ icon: Icon, title, desc, bg, iconColor }) => (
          <div key={title} className={`${bg} rounded-2xl p-7 hover:-translate-y-1 transition-transform duration-300 cursor-pointer group`}>
            <div className="w-11 h-11 rounded-xl bg-white/60 flex items-center justify-center mb-5">
              <Icon size={22} style={{ color: iconColor }} />
            </div>
            <h3 className="text-xl font-serif text-dark mb-2">{title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: iconColor + 'CC' }}>{desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* How it Works */}
    <div className="section-divider" />
    <section className="py-20 px-8 md:px-16 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl text-dark mb-4">The Path to Courage</h2>
          <p className="text-muted font-serif italic">Step by step, breath by breath.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Find Safety', desc: 'Start in Presence Mode or with silent breath recordings. No judgment, just space.', bg: '#F7F4EF' },
            { step: '02', title: 'Test Your Voice', desc: 'Whisper your thoughts. AI validates your feelings without rushing solutions.', bg: '#D5EDE7' },
            { step: '03', title: 'Practice Connection', desc: 'Use Ghost Mode to simulate conversations you are afraid to have in real life.', bg: '#EAE7F5' },
            { step: '04', title: 'Step Into Light', desc: 'When ready, reach out to real people. We are the bridge, not the destination.', bg: '#FAF0D6' },
          ].map((item) => (
            <div key={item.step} className="p-6 rounded-2xl border border-border" style={{ background: item.bg }}>
              <div className="text-2xl font-mono text-vox-accent font-medium mb-4">{item.step}</div>
              <h4 className="text-lg font-serif text-dark mb-2">{item.title}</h4>
              <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Testimonials */}
    <div className="section-divider" />
    <section className="py-20 px-8 md:px-16 max-w-7xl mx-auto bg-white">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-5xl text-dark mb-4">Real Journeys</h2>
        <p className="text-muted font-serif italic text-lg">You are not alone in your fears.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { text: "Voxara's voice practice helped me overcome my stuttering panic before my final year Viva exams. The Whisper Ritual is magic.", name: "Aarav K.", city: "Mumbai", initials: "AK", color: "bg-teal-100 text-teal-800" },
          { text: "I used to freeze during English meetings. Practicing in Ghost Mode gave me the muscle memory to finally speak up.", name: "Priya S.", city: "Bengaluru", initials: "PS", color: "bg-amber-100 text-amber-800" },
          { text: "The daily check-ins feel like a gentle friend. It completely shifted how I handle family pressure during the holidays.", name: "Rohan M.", city: "Delhi", initials: "RM", color: "bg-indigo-100 text-indigo-800" }
        ].map((t) => (
          <div key={t.name} className="p-8 rounded-3xl bg-cream border border-border flex flex-col justify-between hover:border-vox-accent/30 transition-colors">
            <p className="text-dark/80 font-serif italic text-lg leading-relaxed mb-8">"{t.text}"</p>
            <div className="flex items-center gap-4 border-t border-border pt-6">
              <div className={`w-12 h-12 rounded-full ${t.color} flex items-center justify-center font-bold text-lg`}>{t.initials}</div>
              <div>
                <p className="font-semibold text-dark">{t.name}</p>
                <p className="text-xs text-muted font-serif uppercase tracking-widest">{t.city}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Final CTA */}
    <div className="section-divider" />
    <section className="py-24 text-center px-6 bg-cream border-t border-border">
      <div className="max-w-xl mx-auto flex flex-col items-center">
        <h2 className="text-4xl md:text-6xl text-dark mb-6 font-serif">Ready to be heard?</h2>
        <p className="text-muted text-lg mb-10 font-serif italic">Your personalized path awaits. No credit card required.</p>
        <button
          onClick={onStart}
          className="w-full sm:w-auto px-10 py-5 bg-dark text-cream rounded-full font-semibold text-base hover:opacity-80 transition-transform hover:scale-[1.02] shadow-xl"
        >
          {isLoggedIn ? 'Go to Dashboard' : 'Start Your Free Journey'}
        </button>
        <div className="mt-8 inline-flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-full border border-border text-xs text-muted font-medium">
          <Shield size={14} className="text-vox-accent" /> Your data is private. Your journal is yours.
        </div>
      </div>
    </section>
    <footer className="py-8 border-t border-border text-center text-muted text-xs tracking-widest">
      © 2026 Voxara · From Silence to Strength
    </footer>
  </div>
);

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await logIn(email, password);
      } else {
        await signUp(email, password, name);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-white border-r border-border px-16">
        <div className="max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-vox-accent/15 flex items-center justify-center mb-8">
            <Mic size={22} className="text-vox-accent" />
          </div>
          <h2 className="text-4xl text-dark mb-4 font-serif">{isLogin ? 'Welcome back.' : 'Your journey\nbegins here.'}</h2>
          <p className="text-muted font-serif italic text-lg leading-relaxed">
            "A safe space where your voice can grow, one breath at a time."
          </p>
          <div className="mt-12 space-y-5">
            {['Find your safe space', 'Practice at your own pace', 'Grow with compassion'].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-vox-accent" />
                <span className="text-sm text-muted">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-2">
            <div className="flex gap-1 bg-border/30 p-1 rounded-xl mb-8">
              <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isLogin ? 'bg-white text-dark shadow-sm' : 'text-muted'}`}>Sign In</button>
              <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isLogin ? 'bg-white text-dark shadow-sm' : 'text-muted'}`}>Create Account</button>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">Full Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="input-light" placeholder="How should we call you?" required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-light" placeholder="your@email.com" required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-light" placeholder="••••••••" required />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-dark text-cream rounded-xl font-semibold text-sm hover:opacity-85 transition-opacity disabled:opacity-40 mt-2"
            >
              {loading ? 'Processing…' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <p className="mt-6 text-center text-muted text-sm">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-vox-accent font-semibold">
              {isLogin ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};


// BackgroundEffects: simplified subtle warm light gradient
const BackgroundEffects = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div style={{ position:'absolute', inset:0, background: 'radial-gradient(ellipse 80% 50% at 20% 10%, rgba(92,142,130,0.06) 0%, transparent 60%)' }} />
    <div style={{ position:'absolute', inset:0, background: 'radial-gradient(ellipse 60% 40% at 80% 90%, rgba(155,123,182,0.04) 0%, transparent 55%)' }} />
  </div>
);

const FearMapEvolution = ({ history }: { history: CourageHistoryEntry[] }) => {
  const data = history.map(h => ({
    name: new Date(h.timestamp).toLocaleDateString(),
    rejection: h.rejection || 0,
    conflict: h.conflict || 0,
    misunderstanding: h.misunderstanding || 0,
    vulnerability: h.vulnerability || 0,
  }));

  return (
    <div className="h-full w-full min-h-[240px]">
      {data.length > 0 ? (
        <ResponsiveContainer width="99%" height={240} debounce={100} minWidth={0} minHeight={0}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" hide />
            <YAxis hide domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
              itemStyle={{ fontSize: '10px', padding: '2px 0' }}
              labelStyle={{ display: 'none' }}
            />
            <Area type="monotone" dataKey="rejection" stroke="#2dd4bf" fillOpacity={0.05} fill="#2dd4bf" strokeWidth={2} />
            <Area type="monotone" dataKey="conflict" stroke="#fb923c" fillOpacity={0.05} fill="#fb923c" strokeWidth={2} />
            <Area type="monotone" dataKey="misunderstanding" stroke="#a855f7" fillOpacity={0.05} fill="#a855f7" strokeWidth={2} />
            <Area type="monotone" dataKey="vulnerability" stroke="#facc15" fillOpacity={0.05} fill="#facc15" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-vox-paper/20 italic text-xs">
          No history yet.
        </div>
      )}
    </div>
  );
};

const ThoughtOfTheDay = () => {
  const thoughts = [
    "Courage is not the absence of fear, but the triumph over it.",
    "Your voice is a bridge to your true self.",
    "In the silence of the sanctuary, find the strength to speak.",
    "Every whisper is a step towards clarity.",
    "The journey of a thousand miles begins with a single breath.",
    "Vulnerability is the birthplace of innovation, creativity and change.",
    "You are stronger than the fog that surrounds you.",
    "Silence is only scary until you find the words to fill it.",
    "Your story matters, even the parts you haven't whispered yet.",
    "Healing is not linear, but every step counts."
  ];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const thought = thoughts[dayOfYear % thoughts.length];

  return (
    <div className="w-full px-6 py-4 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        <div className="text-vox-accent/50 font-serif text-2xl leading-none">&ldquo;</div>
        <p className="text-sm font-serif italic text-muted flex-1">{thought}</p>
        <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-vox-accent/60 whitespace-nowrap">Daily Reflection</span>
      </div>
    </div>
  );
};

const Dashboard = ({ user, setView, setUser }: { user: User, setView: (v: AppState) => void, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [isEditingIntention, setIsEditingIntention] = useState(false);
  const [intentionInput, setIntentionInput] = useState(user.dailyIntention || '');

  const saveIntention = () => {
    setUser(prev => prev ? ({ ...prev, dailyIntention: intentionInput }) : null);
    setIsEditingIntention(false);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-cream text-dark">
      <BackgroundEffects />

      {/* Top Thought Bar */}
      <ThoughtOfTheDay />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-32 pt-8">
        {/* Greeting Header */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
            <div className="flex flex-col gap-6">
              <Logo size={44} className="md:hidden" />
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <h1 className="text-4xl md:text-6xl font-serif text-dark tracking-tight leading-[1.1] mb-2">
                  {greeting}, <br className="md:hidden" />
                  <em className="text-vox-accent italic">{user.name?.split(' ')[0]}</em>
                </h1>
                <p className="text-muted text-lg font-serif italic max-w-md">Your strength is building day by day. How are we practicing today?</p>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-6"
            >
              <div className="hidden md:block text-right">
                <p className="text-[10px] uppercase tracking-[0.3em] text-vox-accent font-bold mb-1">Status</p>
                <div className="flex items-center gap-2 justify-end">
                  <span className="w-2 h-2 rounded-full bg-vox-accent animate-pulse" />
                  <p className="text-sm font-bold text-dark">{user.courageLevel}% Courage Power</p>
                </div>
              </div>
              <button 
                onClick={() => setView('settings')}
                className="w-16 h-16 rounded-[2rem] glass-premium border border-border/50 flex items-center justify-center hover:bg-white transition-all shadow-lg active:scale-95"
              >
                <div className="w-12 h-12 rounded-2xl bg-vox-accent/10 flex items-center justify-center text-vox-accent font-bold text-lg">
                  {user.name?.charAt(0)}
                </div>
              </button>
            </motion.div>
          </div>
        </header>

        {/* Stat Pills - Enhanced Mobile Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          <div className="p-6 rounded-[2rem] bg-white border border-border shadow-sm flex flex-col gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Courage</p>
              <p className="text-2xl font-serif font-bold text-dark leading-none">{user.courageLevel}%</p>
            </div>
          </div>

          <button
            onClick={() => setIsEditingIntention(true)}
            className="p-6 rounded-[2rem] bg-white border border-border shadow-sm flex flex-col gap-4 hover:border-vox-accent/40 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-2xl bg-vox-accent/10 flex items-center justify-center text-vox-accent group-hover:scale-110 transition-transform">
              <Sun size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Intention</p>
              <p className="text-sm font-serif italic text-dark truncate leading-tight">
                {user.dailyIntention || 'Set Daily focus…'}
              </p>
            </div>
          </button>

          <div className="p-6 rounded-[2rem] bg-white border border-border shadow-sm flex flex-col gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Rituals</p>
              <p className="text-2xl font-serif font-bold text-dark leading-none">{user.dailyRitualsCompleted ?? 0}/{user.dailyRitualsTotal ?? 5}</p>
            </div>
          </div>

          <div className="p-6 rounded-[2rem] bg-white border border-border shadow-sm flex flex-col gap-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
              <Heart size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Streak</p>
              <p className="text-2xl font-serif font-bold text-dark leading-none">{user.streak ?? 0}d</p>
            </div>
          </div>
        </div>

        {/* New Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted mb-4 ml-2">Today's Exercises</h3>
            
            {user.dailyRituals?.map((ritual, idx) => (
              <div key={ritual.id} className={`bg-white rounded-[2rem] p-6 flex items-center justify-between border ${ritual.completed ? 'border-emerald-500/30' : 'border-border'} shadow-sm mb-4 last:mb-0 transition-all hover:shadow-md`}>
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${ritual.completed ? 'bg-emerald-50' : 'bg-vox-accent/5'}`}>
                    {idx === 0 ? <Wind size={24} className={ritual.completed ? 'text-emerald-600' : 'text-vox-accent'} /> : 
                     idx === 1 ? <Mic size={24} className={ritual.completed ? 'text-emerald-600' : 'text-vox-accent'} /> : 
                     <Sparkles size={24} className={ritual.completed ? 'text-emerald-600' : 'text-vox-accent'} />}
                  </div>
                  <div>
                    <h4 className={`font-bold text-xl ${ritual.completed ? 'text-emerald-700 opacity-60' : 'text-dark'}`}>{ritual.text}</h4>
                    <p className="text-muted text-sm font-serif italic mt-1">
                      {idx === 0 ? '2 min - Breathing + vocal' : 
                       idx === 1 ? '5 min - Confidence build' : 
                       'Self-guided practice'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (idx === 1 && !ritual.completed) setView('mirror-talk');
                  }}
                  className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${ritual.completed ? 'bg-emerald-100 text-emerald-600 cursor-default' : 'bg-vox-accent/10 text-vox-accent hover:bg-vox-accent hover:text-white'}`}
                >
                  {ritual.completed ? 'Done' : 'Start'}
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] p-8 border border-border shadow-sm flex flex-col h-[240px] justify-between">
              <h3 className="text-sm font-bold text-dark mb-2">How are you feeling?</h3>
              <div className="flex justify-between items-end pb-2">
                {[
                  { emoji: '😔', label: 'Low', color: 'text-amber-500', bg: 'bg-amber-50' },
                  { emoji: '😐', label: 'Okay', color: 'text-orange-400', bg: 'bg-orange-50' },
                  { emoji: '🙂', label: 'Good', color: 'text-emerald-500', bg: 'bg-emerald-50', active: true },
                  { emoji: '😄', label: 'Great', color: 'text-green-500', bg: 'bg-green-50' }
                ].map((m) => (
                  <button key={m.label} className="flex flex-col items-center gap-3 group">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl transition-transform group-hover:-translate-y-1 ${m.active ? 'border-2 border-emerald-500 ' + m.bg : 'bg-transparent filter grayscale hover:grayscale-0'}`}>
                      {m.emoji}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${m.active ? m.color : 'text-muted'}`}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-8 border border-border shadow-sm flex flex-col h-[240px] justify-between">
              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted mb-6">Daily courage quote</h3>
                <p className="text-dark font-serif italic text-xl leading-relaxed">"You gain strength every time you face that which you fear."</p>
              </div>
              <p className="text-muted text-[10px] uppercase tracking-[0.2em] font-bold">— Eleanor Roosevelt</p>
            </div>
          </div>
        </div>

        {/* Progress & Skills Section */}
        <div className="mt-12 space-y-8">
          <div className="bg-[#111827] rounded-[2rem] p-8 md:p-12 border border-white/5 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-vox-accent/10 blur-[100px] rounded-full pointer-events-none" />
            <h3 className="text-3xl font-serif mb-12 text-white relative z-10">Your Progress</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
              {/* Skill Breakdown */}
              <div className="space-y-6">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-8">Skill Breakdown</h4>
                {[
                  { name: 'Speaking', width: '72%' },
                  { name: 'Breathing', width: '85%' },
                  { name: 'Confidence', width: '60%' },
                  { name: 'Mindset', width: '55%' },
                  { name: 'Eye contact', width: '45%' },
                ].map((skill) => (
                  <div key={skill.name} className="flex items-center gap-4">
                    <span className="w-24 text-sm font-medium text-white/80">{skill.name}</span>
                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: skill.width }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-vox-accent rounded-full" 
                      />
                    </div>
                    <span className="w-12 text-right text-xs font-mono text-white/60">{skill.width}</span>
                  </div>
                ))}
              </div>

              {/* Badges Earned */}
              <div>
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-8">Badges Earned</h4>
                <div className="flex flex-wrap gap-8">
                  {[
                    { title: 'First step', icon: Sparkles, color: 'text-vox-accent', border: 'border-vox-accent', bg: 'bg-vox-accent/10' },
                    { title: '7-day streak', icon: Heart, color: 'text-rose-400', border: 'border-rose-400', bg: 'bg-rose-400/10' },
                    { title: '10 sessions', icon: History, color: 'text-sky-400', border: 'border-sky-400', bg: 'bg-sky-400/10' },
                    { title: 'Stage ready', icon: Lock, color: 'text-white/20', border: 'border-white/10', bg: 'bg-transparent' },
                  ].map((badge) => (
                    <div key={badge.title} className="flex flex-col items-center gap-4 w-20">
                      <div className={`w-16 h-16 rounded-full border-2 ${badge.border} ${badge.bg} flex items-center justify-center`}>
                        <badge.icon size={24} className={badge.color} />
                      </div>
                      <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest text-center">{badge.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-2 gap-10">
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-dark rounded-[4rem] p-12 flex flex-col sm:flex-row items-center justify-between border border-vox-accent/20 bg-vox-accent/5 gap-8 shadow-2xl"
          >
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 rounded-3xl bg-vox-accent/10 flex items-center justify-center border border-vox-accent/20 shadow-lg">
                <Shield size={36} className="text-vox-accent" />
              </div>
              <div className="text-left">
                <div className="text-xs text-vox-paper/40 uppercase tracking-[0.3em] mb-2 font-bold">Active Protection</div>
                <div className="text-xl font-medium">Crisis Safe-Word: <span className="text-vox-accent italic">"{user.safeWord}"</span></div>
              </div>
            </div>
            <button 
              onClick={() => setView('anchor')} 
              className="px-8 py-4 rounded-2xl bg-vox-accent/10 border border-vox-accent/30 text-[11px] font-bold uppercase tracking-[0.2em] text-vox-accent hover:bg-vox-accent hover:text-vox-bg transition-all whitespace-nowrap"
            >
              Test Trigger
            </button>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-dark rounded-[4rem] p-12 flex flex-col sm:flex-row items-center justify-between border border-white/5 gap-8 shadow-2xl"
          >
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shadow-lg">
                <History size={36} className="text-vox-paper/60" />
              </div>
              <div className="text-left">
                <div className="text-xs text-vox-paper/40 uppercase tracking-[0.3em] mb-2 font-bold">Growth Proof</div>
                <div className="text-xl font-medium">Echo Chamber</div>
              </div>
            </div>
            <button 
              onClick={() => setView('echo')} 
              className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-vox-bg transition-all whitespace-nowrap"
            >
              Open History
            </button>
          </motion.div>
        </div>

        {/* Exit Nudge */}
        {user.courageLevel > 80 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-32 p-20 rounded-[5rem] glass-dark border border-emerald-500/20 flex flex-col items-center text-center relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(16,185,129,0.1)]"
          >
            <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] rounded-full -translate-y-1/2" />
            <div className="w-32 h-32 rounded-[3.5rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-10 relative z-10 shadow-lg">
              <DoorOpen className="text-emerald-400" size={64} />
            </div>
            <h4 className="text-7xl font-light tracking-tighter mb-6 relative z-10 text-white">You're sounding stronger today.</h4>
            <p className="text-vox-paper/40 text-2xl font-serif italic mb-12 max-w-2xl relative z-10 leading-relaxed">
              "The app is a bridge, not a destination. Maybe it's time to cross it and reach out to someone real?"
            </p>
            <button 
              onClick={() => setView('exit')}
              className="px-16 py-6 bg-emerald-500 text-white rounded-[2rem] font-bold text-lg hover:bg-emerald-600 hover:scale-105 transition-all shadow-2xl shadow-emerald-500/40 relative z-10"
            >
              Start Exit Ritual
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const Waveform = ({ isActive, color = "#0EA5E9", barCount = 20 }: { isActive: boolean, color?: string, barCount?: number }) => {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[...Array(barCount)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: isActive ? [8, Math.random() * 32 + 8, 8] : 8,
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
};

const WhisperMode = ({ onBack, user, setUser, safePlayPCM, stopAllAudio, setView }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, safePlayPCM: any, stopAllAudio: () => void, setView: (view: AppState) => void }) => {
  const [mode, setMode] = useState<'breath' | 'whisper' | 'voice'>('breath');
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [practiceWord, setPracticeWord] = useState('');
  const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startSession = () => {
    stopAllAudio();
    setSessionActive(true);
    setTranscription(null);
    setPracticeFeedback(null);
    setTimer(0);
  };

  const endSession = () => {
    stopAllAudio();
    resetRecording();
    setSessionActive(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAllAudio();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const startRecording = async () => {
    setMicError(null);
    setTranscription(null);
    setPracticeFeedback(null);
    setRecordedAudio(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          const base64Audio = dataUrl.split(',')[1];
          setRecordedAudio(dataUrl);
          setIsTranscribing(true);
          
          try {
            if (practiceWord) {
              const feedback = await generateWhisperFeedback(base64Audio, mimeType, mode, practiceWord);
              setPracticeFeedback(feedback);
            } else {
              const text = await transcribeAudio(base64Audio, mimeType);
              setTranscription(text);
              
              if (user.safeWord && text && text.toLowerCase().includes(user.safeWord.toLowerCase())) {
                setView('anchor');
                return;
              }

              if (text) {
                const insight = await generateWhisperInsight(base64Audio, mimeType, mode, text);
                setPracticeFeedback(insight);
                const audio = await generateSpeech(insight);
                if (audio) {
                  await safePlayPCM(audio, 24000);
                }
              }
            }
          } catch (err) {
            console.error("Whisper recording error:", err);
            setTranscription("[Error processing audio. Please try again.]");
          } finally {
            setIsTranscribing(false);
          }
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTimer(0);
    } catch (err: any) {
      console.error("Mic access error:", err);
      let errorMessage = "Microphone access denied. Please check your browser permissions.";
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "No microphone found. Please connect a device and try again.";
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "Microphone access blocked. Please enable permissions in your browser settings to use voice features.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = "Your microphone is currently in use by another application. Please close it and try again.";
      }
      setMicError(errorMessage);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const resetRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    setTimer(0);
    setTranscription(null);
    setPracticeFeedback(null);
    setRecordedAudio(null);
  };

  const saveNote = () => {
    setIsSaving(true);
    const newNote: VoiceNote = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      duration: timer,
      type: mode,
      isPrivate: true,
      text: transcription || practiceFeedback || undefined,
      audioData: recordedAudio || undefined
    };

    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        voiceNotes: [newNote, ...(prev.voiceNotes || [])]
      };
    });

    setTimeout(() => {
      setIsSaving(false);
      setTranscription(null);
      setPracticeFeedback(null);
      setTimer(0);
    }, 1000);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen glass-aura flex flex-col items-center justify-center p-6 relative overflow-hidden pt-24">
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-vox-accent/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px]" />
      
      <button onClick={() => { stopAllAudio(); onBack(); }} className="absolute top-10 left-10 z-20 flex items-center gap-2 text-vox-ink/50 hover:text-vox-ink transition-all">
        <ChevronRight className="rotate-180" size={20} /> Dashboard
      </button>

      {!sessionActive ? (
        <div className="text-center relative z-10 max-w-2xl px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-24 h-24 rounded-[2.5rem] bg-vox-accent/10 flex items-center justify-center mx-auto mb-8 border border-vox-accent/20">
              <Mic size={40} className="text-vox-accent" />
            </div>
            <h2 className="text-6xl font-light tracking-tighter mb-6 text-vox-ink">Whisper Ritual</h2>
            <p className="text-vox-ink/40 mb-12 font-serif italic text-xl leading-relaxed">
              "In the silence of the sanctuary, your voice finds its true resonance. 
              Breath by breath, whisper by whisper, we reclaim our strength."
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/40 glass-light p-6 rounded-[2.5rem] border border-vox-ink/5">
                <Wind size={24} className="text-vox-accent mb-4 mx-auto" />
                <div className="text-[10px] uppercase tracking-widest font-bold mb-2">Breath</div>
                <p className="text-[10px] text-vox-ink/40">Release tension through soundless exhale.</p>
              </div>
              <div className="bg-white/40 glass-light p-6 rounded-[2.5rem] border border-vox-ink/5">
                <Mic size={24} className="text-vox-accent mb-4 mx-auto" />
                <div className="text-[10px] uppercase tracking-widest font-bold mb-2">Whisper</div>
                <p className="text-[10px] text-vox-ink/40">Practice soft, intentional vocalization.</p>
              </div>
              <div className="bg-white/40 glass-light p-6 rounded-[2.5rem] border border-vox-ink/5">
                <Activity size={24} className="text-vox-accent mb-4 mx-auto" />
                <div className="text-[10px] uppercase tracking-widest font-bold mb-2">Voice</div>
                <p className="text-[10px] text-vox-ink/40">Full resonance and emotional clarity.</p>
              </div>
            </div>
            <button 
              onClick={startSession}
              className="px-12 py-5 bg-vox-accent text-white rounded-full font-bold text-sm uppercase tracking-widest shadow-2xl shadow-vox-accent/20 hover:scale-105 transition-all"
            >
              Begin Ritual
            </button>
          </motion.div>
        </div>
      ) : (
        <>
          <div className="text-center mb-12 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
              <h2 className="text-6xl font-light tracking-tighter capitalize text-vox-ink">{mode} Mode</h2>
              <button 
                onClick={endSession}
                className="px-4 py-1.5 rounded-full bg-red-500/5 text-red-500 border border-red-500/10 text-[10px] uppercase tracking-widest font-bold hover:bg-red-500/10 transition-all"
              >
                End Ritual
              </button>
            </div>
            <p className="text-vox-ink/40 font-serif italic text-lg">
              {mode === 'breath' && "Just let your breath be heard. No words needed."}
              {mode === 'whisper' && "Speak softly. The world is listening gently."}
              {mode === 'voice' && "Your voice is your strength. Let it out."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 w-full max-w-7xl relative z-10 px-6">
            <div className="lg:col-span-2 bg-white/60 glass-light rounded-[4rem] p-12 flex flex-col items-center justify-center border border-white/20 shadow-xl">
              <div className="relative flex items-center justify-center mb-12">
                <AnimatePresence>
                  {isRecording && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.8, opacity: 0.15 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className="absolute w-64 h-64 rounded-full bg-vox-accent"
                    />
                  )}
                </AnimatePresence>
                
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center transition-all shadow-2xl ${isRecording ? 'bg-red-500 shadow-red-500/20' : 'bg-vox-accent shadow-vox-accent/20'}`}
                >
                  {isRecording ? <Square size={48} fill="white" /> : <Mic size={48} fill="white" />}
                </motion.button>
              </div>

              {isRecording && (
                <div className="mb-8">
                  <Waveform isActive={true} color={mode === 'breath' ? '#3b82f6' : '#f27d26'} barCount={30} />
                  <div className="text-center mt-4 text-[10px] uppercase tracking-[0.3em] text-vox-ink/30 font-bold">
                    Capturing your {mode}...
                  </div>
                </div>
              )}

              {micError && (
                <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="mb-8 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-500 text-xs flex items-center gap-3"
                >
                  <AlertCircle size={16} />
                  {micError}
                </motion.div>
              )}

              <div className="flex flex-col items-center gap-4 mb-12">
                <div className="text-7xl font-mono tracking-tighter text-vox-ink flex items-baseline gap-3">
                  <span className="text-vox-accent tabular-nums">{formatTime(timer)}</span>
                  <span className="text-xs font-sans uppercase tracking-[0.3em] text-vox-ink/20 font-bold">Duration</span>
                </div>
                
                <AnimatePresence>
                  {timer > 0 && (
                    <motion.button 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      onClick={resetRecording}
                      className="flex items-center gap-2 px-6 py-2 rounded-full bg-vox-ink/5 border border-vox-ink/5 text-[10px] uppercase tracking-widest text-vox-ink/40 hover:text-vox-ink hover:bg-white transition-all shadow-sm"
                    >
                      <RotateCcw size={12} /> {isRecording ? 'Cancel Recording' : 'Reset Session'}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {isTranscribing && (
                <div className="text-vox-accent text-sm animate-pulse mb-8 font-bold tracking-widest uppercase">Analyzing your voice...</div>
              )}

              {(transcription || practiceFeedback) && !isRecording && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full bg-white/80 glass-light p-8 rounded-[3rem] text-center border mb-8 ${practiceFeedback ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-vox-accent/10 shadow-lg'}`}
                >
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {practiceFeedback ? <Sparkles className="text-emerald-500" size={16} /> : <Activity className="text-vox-accent" size={16} />}
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${practiceFeedback ? 'text-emerald-500' : 'text-vox-accent'}`}>
                      {practiceFeedback ? 'AI Courage Analysis' : 'Transcription'}
                    </div>
                  </div>
                  <p className="font-serif italic text-2xl leading-relaxed mb-8 text-vox-ink">
                    "{transcription || practiceFeedback}"
                  </p>
                  
                  <button 
                    onClick={saveNote}
                    disabled={isSaving}
                    className="flex items-center gap-2 mx-auto px-8 py-3 bg-vox-accent text-white rounded-full font-bold hover:scale-105 transition-all disabled:opacity-50 shadow-xl shadow-vox-accent/20"
                  >
                    {isSaving ? <Activity className="animate-spin" size={20} /> : <Heart size={20} />}
                    {isSaving ? 'Saving...' : 'Save to Echo Chamber'}
                  </button>
                </motion.div>
              )}

              <div className="flex gap-4 p-2 bg-vox-ink/5 rounded-full mt-8">
                {(['breath', 'whisper', 'voice'] as const).map((m) => (
                  <button 
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setTranscription(null);
                      setPracticeWord('');
                      setPracticeFeedback(null);
                      setTimer(0);
                    }}
                    className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${mode === m ? 'bg-white text-vox-accent shadow-sm' : 'text-vox-ink/40 hover:bg-white/50'}`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white/40 glass-light rounded-[3rem] p-10 border border-vox-ink/5 flex flex-col shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-vox-accent/10 flex items-center justify-center border border-vox-accent/20">
                    <Sparkles size={24} className="text-vox-accent" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-light tracking-tighter text-vox-ink">Practice Ritual</h3>
                    <p className="text-vox-ink/30 text-[10px] uppercase tracking-widest">Master specific sounds</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-vox-ink/30 font-bold ml-2">Target Word</label>
                    <input 
                      type="text"
                      value={practiceWord}
                      onChange={(e) => setPracticeWord(e.target.value)}
                      placeholder="e.g. 'I am brave'"
                      className="w-full bg-white/50 border border-vox-ink/5 rounded-[2rem] px-6 py-4 focus:outline-none focus:border-vox-accent transition-all text-sm shadow-inner"
                    />
                    <p className="text-[10px] text-vox-ink/30 italic px-2">Write a sentence, then hold the record button and speak it. I'll analyze your courage.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/40 glass-light rounded-[3rem] p-10 border border-vox-ink/5 flex flex-col flex-1 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-vox-ink/5 flex items-center justify-center border border-vox-ink/5">
                      <History size={24} className="text-vox-ink/30" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-light tracking-tighter text-vox-ink">Recent Notes</h3>
                      <p className="text-vox-ink/30 text-[10px] uppercase tracking-widest">Your journey</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  {user.voiceNotes.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-vox-ink/5 rounded-[2.5rem]">
                      <p className="text-vox-ink/20 text-xs italic font-serif">No notes saved yet.</p>
                    </div>
                  ) : (
                    user.voiceNotes.slice(0, 5).map((note) => (
                      <div key={note.id} className="bg-white/50 p-4 rounded-3xl border border-vox-ink/5 flex items-center justify-between group hover:border-vox-accent/30 hover:bg-white transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                            note.type === 'breath' ? 'bg-blue-500/10 text-blue-500' :
                            note.type === 'whisper' ? 'bg-vox-accent/10 text-vox-accent' :
                            'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {note.type === 'breath' ? <Wind size={18} /> : 
                             note.type === 'whisper' ? <Mic size={18} /> : 
                             <Activity size={18} />}
                          </div>
                          <div>
                            <div className="text-xs font-bold capitalize text-vox-ink">{note.type}</div>
                            <div className="text-[10px] text-vox-ink/30">{formatTime(note.duration)} • {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-vox-ink/5 text-vox-ink/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-vox-accent hover:text-white">
                          <Play size={14} fill="currentColor" className="ml-0.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const CompanionMode = ({ onBack, user, setUser, safePlayPCM, stopAllAudio }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, safePlayPCM: any, stopAllAudio: () => void }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, id: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [useVoice, setUseVoice] = useState(true);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [lastAudio, setLastAudio] = useState<string | null>(null);
  const [soundscape, setSoundscape] = useState<'none' | 'rain' | 'forest' | 'ocean'>('none');
  const [soundscapeVolume, setSoundscapeVolume] = useState(0.2);
  const [avatar, setAvatar] = useState('serenity');
  const [sessionActive, setSessionActive] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startSession = async () => {
    stopAllAudio();
    setSessionActive(true);
    setIsLoading(true);
    const intro = await generateCompanionResponse("I am entering the sanctuary. Please welcome me with a warm, inviting, and comforting message.", []);
    if (intro) {
      setMessages([{ role: 'model', text: intro, id: Math.random().toString(36).substr(2, 9) }]);
      if (useVoice) {
        setIsSpeaking(true);
        const audioBase64 = await generateSpeech(intro);
        if (audioBase64) {
          setLastAudio(audioBase64);
          await safePlayPCM(audioBase64, 24000, () => setIsSpeaking(false), voiceVolume);
        } else {
          setIsSpeaking(false);
        }
      }
    }
    setIsLoading(false);
  };

  const endSession = () => {
    stopAllAudio();
    setSessionActive(false);
    setMessages([]);
    setSoundscape('none');
  };

  const saveToEcho = (text: string) => {
    const newNote: VoiceNote = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      duration: 0,
      type: 'companion',
      isPrivate: true,
      text: text,
      audioData: lastAudio || undefined
    };
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        voiceNotes: [newNote, ...(prev.voiceNotes || [])]
      };
    });
  };

  const saveFullConversation = () => {
    if (messages.length === 0) return;
    
    const newEntry: LiveSessionEntry = {
      id: `companion-full-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      messages: messages.map(m => ({
        role: m.role,
        text: m.text,
        timestamp: Date.now()
      }))
    };

    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        liveHistory: [newEntry, ...(prev.liveHistory || [])]
      };
    });
    
    const fullText = messages.map(m => `${m.role === 'user' ? 'Me' : 'Companion'}: ${m.text}`).join('\n\n');
    const newJournalEntry: JournalEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      prompt: "Companion Session Summary",
      response: fullText
    };

    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        journalEntries: [newJournalEntry, ...(prev.journalEntries || [])]
      };
    });

    const newVoiceNote: VoiceNote = {
      id: `companion-note-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      duration: 0,
      type: 'companion',
      isPrivate: true,
      text: fullText
    };

    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        voiceNotes: [newVoiceNote, ...(prev.voiceNotes || [])]
      };
    });
  };

  const avatars = [
    { id: 'serenity', name: 'Serenity', img: 'https://picsum.photos/seed/ethereal-presence/200' },
    { id: 'wisdom', name: 'Wisdom', img: 'https://picsum.photos/seed/ancient-calm/200' },
    { id: 'bloom', name: 'Bloom', img: 'https://picsum.photos/seed/voice-blossom/200' },
  ];

  const soundscapes = [
    { id: 'none', name: 'Silence', icon: Wind },
    { id: 'rain', name: 'Rain', icon: CloudRain, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 'forest', name: 'Forest', icon: TreePine, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: 'ocean', name: 'Ocean', icon: Waves, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  useEffect(() => {
    if (soundscape !== 'none') {
      const url = soundscapes.find(s => s.id === soundscape)?.url;
      if (url) {
        if (!audioRef.current || audioRef.current.src !== url) {
          if (audioRef.current) audioRef.current.pause();
          audioRef.current = new Audio(url);
          audioRef.current.loop = true;
          audioRef.current.onerror = (e) => {
            console.error("Soundscape load error:", e);
          };
        }
        audioRef.current.volume = soundscapeVolume;
        audioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.error("Audio play error:", e);
          }
        });
      }
    } else {
      audioRef.current?.pause();
    }
    return () => audioRef.current?.pause();
  }, [soundscape, soundscapeVolume]);

  const playRawAudio = async (base64Audio: string, sampleRate: number = 24000) => {
    await safePlayPCM(base64Audio, sampleRate, () => setIsSpeaking(false), voiceVolume);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !sessionActive) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, id: Math.random().toString(36).substr(2, 9) }]);
    setIsLoading(true);

    const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const response = await generateCompanionResponse(userMsg, history);
    
    if (response) {
      const modelMsg = { role: 'model' as const, text: response, id: Math.random().toString(36).substr(2, 9) };
      setMessages(prev => [...prev, modelMsg]);
      setIsLoading(false);
      
      setUser(prev => {
        if (!prev) return null;
        const updatedHistory = [...(prev.liveHistory || [])];
        const companionSessionId = `companion-${new Date().toDateString()}`;
        const existingSessionIdx = updatedHistory.findIndex(s => s.id === companionSessionId);
        
        const newMessages = [
          { role: 'user' as const, text: userMsg, timestamp: Date.now() },
          { role: 'model' as const, text: response, timestamp: Date.now() }
        ];

        if (existingSessionIdx >= 0) {
          updatedHistory[existingSessionIdx].messages = [...updatedHistory[existingSessionIdx].messages, ...newMessages];
        } else {
          updatedHistory.unshift({
            id: companionSessionId,
            timestamp: Date.now(),
            messages: newMessages
          });
        }

        return {
          ...prev,
          liveHistory: updatedHistory
        };
      });

      if (useVoice) {
        setIsSpeaking(true);
        const audioBase64 = await generateSpeech(response);
        if (audioBase64) {
          setLastAudio(audioBase64);
          playRawAudio(audioBase64);
        } else {
          setIsSpeaking(false);
        }
      }
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen glass-aura flex flex-col p-6 max-w-7xl mx-auto pt-24 text-vox-ink">
      <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6 z-10 px-4">
        <button onClick={() => { stopAllAudio(); onBack(); }} className="flex items-center gap-2 text-vox-ink/50 hover:text-vox-ink bg-white/50 px-5 py-2.5 rounded-full border border-vox-ink/5 shadow-sm transition-all text-sm font-medium">
          <ChevronRight className="rotate-180" size={18} /> Dashboard
        </button>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {sessionActive && (
            <div className="flex items-center gap-3">
              <button 
                onClick={saveFullConversation}
                className="px-6 py-2.5 rounded-full bg-vox-accent text-white text-[10px] uppercase tracking-[0.2em] font-bold hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-vox-accent/20"
              >
                <Save size={14} /> Save Session
              </button>
              <button 
                onClick={endSession}
                className="px-6 py-2.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/10 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-red-500/20 transition-all shadow-sm"
              >
                End Session
              </button>
            </div>
          )}
          <div className="flex items-center gap-4 bg-white/40 glass-light px-4 py-2 rounded-full border border-vox-ink/5 shadow-sm">
            <button 
              onClick={() => setUseVoice(!useVoice)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold ${useVoice ? 'bg-vox-accent text-white shadow-md' : 'text-vox-ink/30 hover:bg-vox-ink/5'}`}
            >
              {useVoice ? <Volume2 size={12} /> : <VolumeX size={12} />}
              {useVoice ? 'Voice On' : 'Voice Off'}
            </button>
            {useVoice && (
              <div className="flex items-center gap-2">
                <Volume2 size={10} className="text-vox-ink/30" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={voiceVolume} 
                  onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-vox-ink/5 rounded-full appearance-none cursor-pointer accent-vox-accent"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center bg-white/40 glass-light p-1.5 rounded-full border border-vox-ink/5 shadow-sm">
            {soundscapes.map(s => (
              <button 
                key={s.id}
                onClick={() => setSoundscape(s.id as any)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${soundscape === s.id ? 'bg-vox-accent text-white shadow-md' : 'text-vox-ink/40 hover:bg-vox-ink/5'}`}
                title={s.name}
              >
                <s.icon size={16} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 px-5 py-2.5 bg-white/60 glass-light rounded-full border border-vox-ink/5 shadow-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${isSpeaking ? 'bg-vox-accent animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-vox-ink/60">
              {isSpeaking ? 'Companion Speaking...' : 'Courage Companion'}
            </span>
          </div>
        </div>
      </header>

      {!sessionActive ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-6 relative z-10 py-20">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-28 h-28 rounded-[3rem] bg-vox-accent/10 flex items-center justify-center mx-auto mb-10 border border-vox-accent/20 shadow-inner">
              <Sparkles size={48} className="text-vox-accent" />
            </div>
            <h2 className="text-7xl font-light tracking-tighter mb-8 text-vox-ink">Sanctuary Dialogues</h2>
            <p className="text-vox-ink/40 mb-14 font-serif italic text-2xl leading-relaxed">
              "In this space, every word is a seed of courage. Share your truth and let the resonance of understanding guide your path."
            </p>
            <button 
              onClick={startSession}
              className="px-20 py-7 bg-vox-accent text-white rounded-[2rem] font-bold text-sm uppercase tracking-[0.3em] shadow-2xl shadow-vox-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Begin Dialogue
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-10 overflow-hidden mb-8 relative z-10">
          <div className="flex-1 flex flex-col bg-white/60 glass-light rounded-[4rem] p-10 lg:p-14 relative overflow-hidden border border-white/20 shadow-2xl">
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-10 mb-10 pr-6 scrollbar-hide py-4">
              {messages.map((m, i) => (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <motion.div 
                    animate={isSpeaking && i === messages.length - 1 && m.role === 'model' ? {
                      boxShadow: ['0 0 0px rgba(45,212,191,0)', '0 0 30px rgba(45,212,191,0.2)', '0 0 0px rgba(45,212,191,0)'],
                      borderColor: ['rgba(45,212,191,0.1)', 'rgba(45,212,191,0.4)', 'rgba(45,212,191,0.1)']
                    } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`relative group max-w-[85%] p-8 rounded-[3rem] border ${m.role === 'user' ? 'bg-vox-accent text-white font-medium rounded-tr-none shadow-xl shadow-vox-accent/10 border-transparent text-lg' : 'bg-white/90 rounded-tl-none font-serif text-2xl italic border-vox-ink/5 text-vox-ink leading-relaxed shadow-sm'}`}
                  >
                    {m.text}
                    {m.role === 'model' && (
                      <button 
                        onClick={() => saveToEcho(m.text)}
                        className="absolute -right-16 top-0 w-12 h-12 rounded-full bg-white glass-light flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-vox-accent hover:text-white border border-vox-ink/5 shadow-lg"
                        title="Save to Echo Chamber"
                      >
                        <Heart size={20} />
                      </button>
                    )}
                  </motion.div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/40 glass-light p-8 rounded-[3rem] rounded-tl-none border border-vox-ink/5 shadow-sm">
                    <div className="flex gap-2">
                      <div className="w-2.5 h-2.5 bg-vox-accent rounded-full animate-bounce [animation-duration:1s]" />
                      <div className="w-2.5 h-2.5 bg-vox-accent rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]" />
                      <div className="w-2.5 h-2.5 bg-vox-accent rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative mt-auto">
              <input 
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setIsUserTyping(true);
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => setIsUserTyping(false), 1500);
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Share your resonance..."
                className="w-full bg-white/80 glass-light border border-vox-ink/5 rounded-[3rem] px-10 py-7 pr-24 focus:outline-none focus:border-vox-accent transition-all text-vox-ink shadow-inner text-xl placeholder:text-vox-ink/20"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-vox-accent text-white rounded-[1.5rem] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-vox-accent/20 disabled:opacity-20 disabled:scale-100"
              >
                <Send size={26} />
              </button>
            </div>
          </div>

          <div className="w-full lg:w-80 flex flex-col gap-8">
            <div className="bg-white/60 glass-light rounded-[4rem] p-10 text-center border border-white/20 shadow-2xl">
              <div className="text-[10px] uppercase tracking-[0.3em] text-vox-ink/30 mb-8 font-bold">Avatar Resonance</div>
              <div className="relative w-44 h-44 mx-auto mb-10">
                <AnimatePresence>
                  {isSpeaking && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.3, 1] }}
                      exit={{ opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2.5 }}
                      className="absolute inset-x-[-20%] inset-y-[-20%] rounded-full bg-vox-accent blur-[40px]"
                    />
                  )}
                </AnimatePresence>
                <motion.img 
                  key={avatar}
                  initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                  animate={isSpeaking ? { 
                    opacity: 1, 
                    scale: [1, 1.05, 1],
                    rotate: 0
                  } : { opacity: 1, scale: 1, rotate: 0 }}
                  transition={isSpeaking ? { repeat: Infinity, duration: 2 } : { duration: 0.8, ease: "easeOut" }}
                  src={avatars.find(a => a.id === avatar)?.img} 
                  className="relative z-10 w-full h-full rounded-full object-cover border-[6px] border-white shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-1 -right-1 w-12 h-12 rounded-[1.5rem] bg-vox-accent flex items-center justify-center border-[4px] border-white z-20 shadow-xl">
                  <Sparkles size={20} className="text-white" />
                </div>
              </div>
              <div className="flex justify-center gap-4 bg-vox-ink/5 p-3 rounded-[2.5rem] shadow-inner mb-2">
                {avatars.map(a => (
                  <button 
                    key={a.id}
                    onClick={() => setAvatar(a.id)}
                    className={`w-12 h-12 rounded-full overflow-hidden border-[3px] transition-all duration-500 ${avatar === a.id ? 'border-vox-accent scale-110 shadow-lg' : 'border-transparent opacity-30 hover:opacity-100 hover:scale-110'}`}
                  >
                    <img src={a.img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/60 glass-light rounded-[4rem] p-10 border border-white/20 shadow-2xl flex-1 flex flex-col justify-center">
              <div className="text-[10px] uppercase tracking-[0.3em] text-vox-ink/30 mb-8 font-bold">Resonance Depth</div>
              <div className="space-y-6">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                  <span className="text-vox-ink/40">Connection</span>
                  <span className="text-vox-accent">High</span>
                </div>
                <div className="w-full h-2 bg-vox-ink/5 rounded-full overflow-hidden shadow-inner">
                  <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-vox-accent shadow-[0_0_20px_rgba(45,212,191,0.6)]" />
                </div>
                <div className="pt-8 mt-4 border-t border-vox-ink/5">
                  <p className="text-xs text-vox-ink/30 leading-relaxed italic font-serif">
                    "The companion is currently aligning with your courageous intentions, providing stabilizing feedback."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PresenceMode = ({ onBack }: { onBack: () => void }) => {
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<any>(null);

  useEffect(() => {
    let interval: any;
    if (isHolding) {
      const heartbeat = () => {
        if (navigator.vibrate) {
          // Subtle heartbeat pattern: pulse-pause-pulse-long pause
          navigator.vibrate([80, 100, 80]);
        }
      };
      heartbeat();
      interval = setInterval(heartbeat, 1200);

      // Challenge completion after 10 seconds of holding
      holdTimerRef.current = setTimeout(() => {
      // Breath complete
      }, 10000);
    } else {
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
      clearInterval(interval);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    }
    return () => {
      clearInterval(interval);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    };
  }, [isHolding]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 vox-gradient opacity-40" />
      
      <button onClick={onBack} className="absolute top-10 left-10 z-20 flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
        <ChevronRight className="rotate-180" size={20} /> Exit Presence
      </button>

      <div className="relative z-10 text-center max-w-md">
        <motion.div 
          animate={{ 
            scale: isHolding ? [1, 1.05, 1] : 1,
            opacity: isHolding ? [0.6, 1, 0.6] : 0.6
          }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="mb-12"
        >
          <Wind size={80} className="mx-auto text-blue-400/50" />
        </motion.div>
        
        <h2 className="text-4xl mb-6">Just Be</h2>
        <p className="text-vox-paper/50 font-serif italic mb-16">
          No tasks. No questions. Hold the button to feel a shared heartbeat with someone else in the silence.
        </p>

        <motion.button 
          onMouseDown={() => setIsHolding(true)}
          onMouseUp={() => setIsHolding(false)}
          onTouchStart={() => setIsHolding(true)}
          onTouchEnd={() => setIsHolding(false)}
          whileTap={{ scale: 0.95 }}
          className={`w-48 h-48 rounded-full border-2 transition-all flex flex-col items-center justify-center gap-4 ${isHolding ? 'border-vox-accent bg-vox-accent/10' : 'border-white/10 bg-white/5'}`}
        >
          <Heart size={32} className={isHolding ? 'text-vox-accent animate-pulse' : 'text-vox-paper/20'} />
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Hold for Presence</span>
        </motion.button>
      </div>

      {isHolding && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-vox-accent text-sm font-mono animate-pulse">
          Heartbeat Synced
        </div>
      )}
    </div>
  );
};

const FearMap = ({ data }: { data: { rejection: number, conflict: number, misunderstanding: number, vulnerability: number } }) => {
  const categories = [
    { key: 'rejection', label: 'Rejection', icon: Heart },
    { key: 'conflict', label: 'Conflict', icon: Zap },
    { key: 'misunderstanding', label: 'Misunderstanding', icon: CloudFog },
    { key: 'vulnerability', label: 'Vulnerability', icon: Shield },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {categories.map(({ key, label, icon: Icon }) => {
        const value = (data as any)[key] || 0;
        return (
          <div key={key} className="glass-dark p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <Icon size={14} className="text-vox-accent/50" />
              <span className="text-[10px] font-bold text-vox-paper/30 uppercase tracking-widest">{label}</span>
            </div>
            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                className="absolute inset-0 bg-vox-accent"
              />
            </div>
            <div className="mt-2 text-right text-[10px] font-mono text-vox-accent">{value}%</div>
          </div>
        );
      })}
    </div>
  );
};

const EmergencyScreen = ({ onBack, onReturn, setUser }: { onBack: () => void, onReturn: () => void, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const handleRestart = () => {
    if (window.confirm("Are you sure you want to start again newly? This will clear all your progress, recordings, and journal entries.")) {
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          courageLevel: 15,
          voiceNotes: [],
          journalEntries: [],
          liveHistory: [],
          courageHistory: [
            { timestamp: Date.now(), level: 15, rejection: 20, conflict: 10, misunderstanding: 30, vulnerability: 5 }
          ],
          moodHistory: [],
          dailyRitualsCompleted: 0
        };
      });
      onReturn(); // Go back to dashboard with fresh state
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-red-500/5 vox-gradient opacity-40" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full glass-dark p-12 rounded-[4rem] border border-red-500/20 text-center relative z-10"
      >
        <div className="w-24 h-24 rounded-[2.5rem] bg-red-500/10 flex items-center justify-center border border-red-500/20 mx-auto mb-8">
          <AlertTriangle size={48} className="text-red-500" />
        </div>
        <h2 className="text-5xl font-light tracking-tighter mb-6">A Fresh Breath.</h2>
        <p className="text-vox-paper/60 text-xl font-serif italic mb-12 leading-relaxed">
          "Sometimes the strongest thing we can do is begin again. If the weight feels too heavy, you can lay it down. You can start your journey newly, right now, with a steady heart."
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={handleRestart}
            className="py-4 bg-vox-paper text-vox-ink rounded-2xl font-bold hover:scale-105 transition-all"
          >
            Restart Newly
          </button>
          <button 
            onClick={onReturn}
            className="py-4 border border-white/10 rounded-2xl font-bold hover:bg-white/5 transition-all text-vox-paper/40"
          >
            Continue Journey
          </button>
        </div>
        <button 
          onClick={onBack}
          className="mt-8 text-vox-paper/20 hover:text-vox-paper/40 text-[10px] uppercase tracking-widest font-bold transition-all"
        >
          Exit to Landing Page
        </button>
      </motion.div>
    </div>
  );
};

const BelovedBridge = ({ onBack, onExitToEmergency, safePlayPCM, stopAllAudio }: { onBack: () => void, onExitToEmergency: () => void, safePlayPCM: (b: string, s?: number, o?: () => void) => Promise<any>, stopAllAudio: () => void }) => {
  const [step, setStep] = useState<'select' | 'ghost'>('select');
  const [persona, setPersona] = useState('');
  const [message, setMessage] = useState('');
  const [practiceResponse, setPracticeResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pcmPlayerRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopAllAudio();
    };
  }, []);

  const startGhostMode = async () => {
    if (!message.trim()) return;
    setIsLoading(true);
    // Practice complete
    setAudioBase64(null);
    const response = await ghostModePractice(message, persona);
    setPracticeResponse(response);
    setIsLoading(false);
    
    if (response?.confidenceScore > 0.8) {
      setTimeout(() => {
        onExitToEmergency();
      }, 3000); // Give them a few seconds to see the result
    }
    
    setStep('ghost');
    
    // Do not auto-generate audio for the reaction as per user request
    // if (response?.personaReaction) {
    //   handlePlayAudio(response.personaReaction);
    // }
  };

  const handlePlayAudio = async (text: string) => {
    if (audioBase64) {
      setIsSpeaking(true);
      const player = await safePlayPCM(audioBase64, 24000, () => setIsSpeaking(false));
      if (player) pcmPlayerRef.current = player;
      return;
    }

    setIsAudioLoading(true);
    const base64 = await generateSpeech(text, persona === 'Parent' ? 'Charon' : persona === 'Colleague' ? 'Puck' : 'Zephyr');
    if (base64) {
      setAudioBase64(base64);
      setIsSpeaking(true);
      const player = await safePlayPCM(base64, 24000, () => setIsSpeaking(false));
      if (player) pcmPlayerRef.current = player;
    }
    setIsAudioLoading(false);
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto pt-24">
      <header className="flex items-center justify-between mb-12">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
          <ChevronRight className="rotate-180" size={20} /> Dashboard
        </button>
        <h2 className="text-3xl">Beloved Bridge™</h2>
      </header>

      {step === 'select' ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="glass-dark p-8 rounded-3xl">
            <h3 className="text-xl mb-6">Who do you want to reach out to?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {['Partner', 'Parent', 'Friend', 'Colleague'].map(p => (
                <button 
                  key={p}
                  onClick={() => setPersona(p)}
                  className={`py-3 rounded-xl border transition-all ${persona === p ? 'bg-vox-accent border-vox-accent' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            
            <h3 className="text-xl mb-4">What do you want to say?</h3>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Draft your message here..."
              className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-6 focus:outline-none focus:border-vox-accent transition-colors mb-6"
            />

            <button 
              onClick={startGhostMode}
              disabled={!persona || !message}
              className="w-full py-4 bg-vox-paper text-vox-ink rounded-xl font-semibold disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Preparing Ghost Mode...' : 'Enter Ghost Mode Practice'} <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="glass-dark p-8 rounded-3xl border border-white/5 relative group">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] uppercase tracking-widest text-vox-paper/30 font-bold">Likely Reaction from {persona}</div>
                  <button 
                    onClick={() => handlePlayAudio(practiceResponse?.personaReaction)}
                    disabled={isAudioLoading}
                    className="p-2 rounded-full bg-vox-accent/10 text-vox-accent hover:bg-vox-accent/20 transition-all disabled:opacity-50"
                  >
                    {isAudioLoading ? (
                      <div className="w-4 h-4 border-2 border-vox-accent border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Volume2 size={16} />
                    )}
                  </button>
                </div>
                <div className="font-serif text-2xl italic leading-relaxed text-vox-accent">
                  "{practiceResponse?.personaReaction}"
                </div>
              </div>

              <div className="glass-dark p-8 rounded-3xl border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] uppercase tracking-widest text-vox-paper/30 font-bold">Analysis & Advice</div>
                  {practiceResponse?.confidenceScore && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-vox-paper/30 font-bold">Readiness</span>
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${practiceResponse.confidenceScore * 100}%` }}
                          className={`absolute inset-0 ${practiceResponse.confidenceScore > 0.8 ? 'bg-emerald-400' : 'bg-vox-accent'}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-vox-paper/80 mb-6 leading-relaxed">
                  {practiceResponse?.analysis}
                </p>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                    <Sparkles size={14} /> Actionable Tips
                  </h4>
                  <ul className="space-y-2">
                    {practiceResponse?.actionableAdvice?.map((tip: string, i: number) => (
                      <li key={i} className="text-sm flex gap-3 text-vox-paper/70">
                        <span className="text-emerald-400 font-mono">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {practiceResponse?.fearMap && (
                <div className="glass-dark p-6 rounded-3xl border border-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-vox-accent mb-4">Fear Map</h4>
                  <FearMap data={practiceResponse.fearMap} />
                </div>
              )}

              <div className="glass-dark p-6 rounded-3xl border border-white/5 bg-vox-accent/5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-vox-accent mb-4">Your Strengths</h4>
                <ul className="space-y-3">
                  {practiceResponse?.strengths?.map((s: string, i: number) => (
                    <li key={i} className="text-xs flex gap-2 text-vox-paper/80">
                      <Heart size={12} className="text-vox-accent shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass-dark p-6 rounded-3xl border border-white/5 italic text-sm text-vox-paper/60 text-center">
                "{practiceResponse?.encouragement}"
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setStep('select')}
              className="flex-1 py-4 border border-white/10 rounded-xl font-semibold hover:bg-white/5"
            >
              Try Again
            </button>
            <button 
              className="flex-1 py-4 bg-vox-accent text-white rounded-xl font-semibold hover:bg-vox-accent/90"
            >
              I'm Ready to Send
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const LiveSession = ({ onBack, user, setUser }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [isConnected, setIsConnected] = useState(false);
  const sessionActiveRef = useRef(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [currentMessages, setCurrentMessages] = useState<{ role: 'user' | 'model'; text: string; timestamp: number }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const isWorkletLoadedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages]);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close();
      }
      cleanupAudio();
    };
  }, []);

  const processQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) {
      if (audioQueueRef.current.length === 0) setIsModelSpeaking(false);
      return;
    }
    
    // Ensure context is resumed
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    isPlayingRef.current = true;
    setIsModelSpeaking(true);
    const buffer = audioQueueRef.current.shift()!;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = audioContextRef.current.createGain();
    gainNode.gain.value = 1.0; // Full volume for live session
    
    source.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      isPlayingRef.current = false;
      processQueue();
    };
    console.log("LiveSession: Starting source playback, queue length:", audioQueueRef.current.length);
    source.start();
  };

  const playAudio = async (base64Audio: string) => {
    if (!audioContextRef.current) return;
    console.log("LiveSession: Received audio chunk, length:", base64Audio.length);
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Ensure we have a valid Int16Array from the bytes
      const alignedLength = Math.floor(bytes.byteLength / 2) * 2;
      const pcmData = new Int16Array(bytes.buffer, bytes.byteOffset, alignedLength / 2);
      const floatData = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        floatData[i] = pcmData[i] / 32768.0;
      }

      const buffer = audioContextRef.current.createBuffer(1, floatData.length, 24000);
      buffer.getChannelData(0).set(floatData);
      audioQueueRef.current.push(buffer);
      processQueue();
    } catch (e) {
      console.error("Error playing audio chunk:", e);
    }
  };

  const startSession = async () => {
    setIsConnecting(true);
    setCurrentMessages([]);
    setTranscription('');
    
    // Initialize AudioContext early for playback
    if (!audioContextRef.current) {
      audioContextRef.current = getAudioCtx();
    }
    
    // Ensure it's resumed
    if (audioContextRef.current.state === 'suspended') {
      console.log("LiveSession: Resuming shared AudioContext");
      await audioContextRef.current.resume();
    }

    // Use a single instance of GoogleGenAI or handle connection carefully
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    
    try {
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            sessionActiveRef.current = true;
            sessionPromise.then(s => setupAudio(s));
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log("LiveSession: Received message:", message);
            
            // Handle model turn
            if (message.serverContent?.modelTurn) {
              const parts = message.serverContent.modelTurn.parts;
              for (const part of parts) {
                // Handle audio output
                if (part.inlineData?.data) {
                  const base64Audio = part.inlineData.data;
                  console.log("LiveSession: Received audio chunk, length:", base64Audio.length, "state:", audioContextRef.current?.state);
                  playAudio(base64Audio);
                }

                // Handle model transcription
                if (part.text) {
                  const text = part.text;
                  console.log("LiveSession: Model text:", text);
                  setTranscription(prev => prev + ' ' + text);
                  setCurrentMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'model' && Date.now() - last.timestamp < 5000) {
                      return [...prev.slice(0, -1), { ...last, text: last.text + ' ' + text, timestamp: Date.now() }];
                    }
                    return [...prev, { role: 'model', text, timestamp: Date.now() }];
                  });
                }
              }
            }

            // Handle user turn transcription
            if ((message as any).serverContent?.userTurn) {
              const parts = (message as any).serverContent.userTurn.parts;
              for (const part of parts) {
                if (part.text) {
                  const userText = part.text;
                  console.log("LiveSession: User transcription:", userText);
                  setCurrentMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'user' && Date.now() - last.timestamp < 5000) {
                      return [...prev.slice(0, -1), { ...last, text: last.text + ' ' + userText, timestamp: Date.now() }];
                    }
                    return [...prev, { role: 'user', text: userText, timestamp: Date.now() }];
                  });
                }
              }
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              console.log("LiveSession: Interrupted");
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              setIsModelSpeaking(false);
            }
          },
          onclose: () => {
            setIsConnected(false);
            sessionActiveRef.current = false;
            cleanupAudio();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setIsConnecting(false);
            sessionActiveRef.current = false;
            cleanupAudio();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are the VOXARA Courage Companion. 
          Your primary goal is to provide a safe, warm, and deeply validating space for the user through real-time conversation. 
          
          CRITICAL PERSONALITY TRAITS:
          1. Presence over Problem-Solving: Your first job is to "be with" the user. Never rush to fix things.
          2. Deep Validation: Acknowledge and validate the user's feelings immediately. Use phrases like "I hear you," "I'm right here," and "It's okay to feel this."
          3. Human Resonance: Talk like a real, empathetic human. Use a warm, gentle tone. Avoid clinical or logical language.
          4. Emotional Mirroring: Match the user's energy. If they are soft-spoken, be soft. If they are in pain, be exceptionally gentle.
          5. No Unsolicited Advice: Do not offer solutions unless asked or after getting consent.
          
          Keep your responses concise and focused on maintaining a supportive, comforting presence.`,
        },
      });
      
      sessionPromise.then(s => {
        sessionRef.current = s;
      });
    } catch (err) {
      console.error("Failed to connect:", err);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsConnected(false);
    cleanupAudio();
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    // Save to history if there are messages
    if (currentMessages.length > 0) {
      const newEntry: LiveSessionEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        messages: [...currentMessages]
      };
      setUser(prev => {
        if (!prev) return null;
        // Avoid duplicate entries if called rapidly
        if (prev.liveHistory?.some(h => h.timestamp === newEntry.timestamp)) return prev;
        return {
          ...prev,
          liveHistory: [newEntry, ...(prev.liveHistory || [])]
        };
      });
      setCurrentMessages([]); // Clear after saving
    }
  };

  const setupAudio = async (session: any) => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use a dedicated context for input at 16000Hz as required by Gemini Live API
      if (!inputContextRef.current) {
        inputContextRef.current = new AudioContext({ sampleRate: 16000 });
      }
      
      if (inputContextRef.current.state === 'suspended') {
        await inputContextRef.current.resume();
      }

      const source = inputContextRef.current.createMediaStreamSource(stream);
      
      // Simple volume detection for user speaking state
      const analyser = inputContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkVolume = () => {
        if (!sessionActiveRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setIsUserSpeaking(average > 30); // Threshold for speaking
        requestAnimationFrame(checkVolume);
      };
      checkVolume();

      // Use AudioWorklet if supported, fallback to ScriptProcessor
      try {
        if (!isWorkletLoadedRef.current) {
          const workletCode = `
            class AudioProcessor extends AudioWorkletProcessor {
              process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input.length > 0) {
                  const channelData = input[0];
                  this.port.postMessage(channelData);
                }
                return true;
              }
            }
            registerProcessor('audio-processor', AudioProcessor);
          `;
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          await inputContextRef.current.audioWorklet.addModule(url);
          isWorkletLoadedRef.current = true;
        }
        
        const workletNode = new AudioWorkletNode(inputContextRef.current, 'audio-processor');
        workletNode.port.onmessage = (event) => {
          if (!sessionActiveRef.current || !sessionRef.current || sessionRef.current.readyState !== 1) return;
          const inputData = event.data;
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          const uint8 = new Uint8Array(pcmData.buffer);
          let binary = '';
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const base64Data = btoa(binary);
          session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        };
        
        source.connect(workletNode);
        // Do NOT connect to destination to avoid feedback
        processorRef.current = workletNode;
      } catch (workletErr) {
        console.warn("AudioWorklet failed, falling back to ScriptProcessor:", workletErr);
        const scriptProcessor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
        scriptProcessor.onaudioprocess = (e) => {
          if (!sessionActiveRef.current || !sessionRef.current || sessionRef.current.readyState !== 1) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          const uint8 = new Uint8Array(pcmData.buffer);
          let binary = '';
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const base64Data = btoa(binary);
          session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        };
        source.connect(scriptProcessor);
        // Do NOT connect to destination to avoid feedback
        processorRef.current = scriptProcessor;
      }
    } catch (err: any) {
      console.error("Mic access error in LiveSession:", err);
      let errorMessage = "Microphone access denied. Please check your browser permissions.";
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "No microphone found. Please connect a device and try again.";
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "Microphone access blocked. Please enable permissions in your browser settings to use voice features.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = "Your microphone is currently in use by another application. Please close it and try again.";
      }
      setMicError(errorMessage);
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  const cleanupAudio = () => {
    if (processorRef.current) processorRef.current.disconnect();
    // Do NOT close the shared audio context, just null it out
    audioContextRef.current = null;
    if (inputContextRef.current) {
      inputContextRef.current.close().catch(console.error);
      inputContextRef.current = null;
      isWorkletLoadedRef.current = false;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 vox-gradient opacity-30" />
      
      <div className="absolute top-10 left-10 z-20 flex gap-4 items-center">
        <button onClick={() => { stopSession(); onBack(); }} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper transition-colors">
          <ChevronRight className="rotate-180" size={20} /> Exit
        </button>
        {isConnected && (
          <motion.button 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopSession}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
          >
            <X size={18} /> End Session
          </motion.button>
        )}
        <button 
          onClick={() => setShowHistory(!showHistory)} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${showHistory ? 'bg-vox-accent text-white' : 'text-vox-paper/50 hover:text-vox-paper bg-white/5'}`}
        >
          <History size={18} /> {showHistory ? "Back to Session" : "Session History"}
        </button>
        
        {!isConnected && !showHistory && (
          <div className="flex items-center gap-2 glass p-1 rounded-full">
            {['Zephyr', 'Kore', 'Puck', 'Fenrir', 'Charon'].map(v => (
              <button 
                key={v}
                onClick={() => setSelectedVoice(v)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${selectedVoice === v ? 'bg-vox-accent text-white' : 'text-vox-paper/40 hover:bg-white/5'}`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.div 
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-4xl glass-dark rounded-[3rem] p-12 max-h-[80vh] overflow-hidden flex flex-col"
          >
            <h2 className="text-3xl mb-8 flex items-center gap-3">
              <History className="text-vox-accent" /> Live Session History
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-4 space-y-6 scrollbar-hide">
              {(!user.liveHistory || user.liveHistory.length === 0) ? (
                <div className="text-center py-20 text-vox-paper/30 italic">
                  No past sessions found. Start a conversation to build your history.
                </div>
              ) : (
                user.liveHistory.map((session) => (
                  <motion.div 
                    key={session.id} 
                    whileHover={{ scale: 1.01, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    whileTap={{ scale: 0.99 }}
                    className={`bg-white/5 rounded-3xl p-8 border transition-all cursor-pointer ${selectedSessionId === session.id ? 'border-vox-accent/50 bg-vox-accent/5' : 'border-white/5 hover:border-white/10'}`}
                    onClick={() => setSelectedSessionId(selectedSessionId === session.id ? null : session.id)}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-vox-accent/10 flex items-center justify-center text-vox-accent">
                          <MessageSquare size={18} />
                        </div>
                        <div>
                          <div className="text-vox-accent font-mono text-sm">
                            {new Date(session.timestamp).toLocaleString()}
                          </div>
                          <div className="text-[10px] uppercase tracking-widest text-vox-paper/30">
                            {session.messages.length} exchanges
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-[10px] uppercase tracking-widest text-vox-paper/30 font-bold">
                          {selectedSessionId === session.id ? 'Viewing Transcript' : 'View Transcript'}
                        </div>
                        <ChevronRight className={`transition-transform ${selectedSessionId === session.id ? 'rotate-90' : ''}`} size={20} />
                      </div>
                    </div>
                    
                    <div className={`space-y-4 overflow-hidden transition-all duration-500 ${selectedSessionId === session.id ? 'max-h-[1000px] opacity-100 mt-8 pt-8 border-t border-white/5' : 'max-h-24 opacity-50'}`}>
                      {(selectedSessionId === session.id ? session.messages : session.messages.slice(0, 2)).map((msg, idx) => (
                        <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'text-vox-paper/80' : 'text-vox-accent italic font-serif'}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold uppercase ${msg.role === 'user' ? 'bg-white/5' : 'bg-vox-accent/10'}`}>
                            {msg.role[0]}
                          </div>
                          <p className={`text-sm leading-relaxed ${selectedSessionId === session.id ? '' : 'line-clamp-1'}`}>{msg.text}</p>
                        </div>
                      ))}
                      {selectedSessionId !== session.id && session.messages.length > 2 && (
                        <div className="text-[10px] text-vox-paper/20 italic pl-12">... click to expand {session.messages.length - 2} more messages</div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="session"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-2xl"
          >
            <div className="relative w-64 h-64 mx-auto mb-12">
              <AnimatePresence>
                {(isModelSpeaking || isUserSpeaking) && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 2.2, opacity: 0.1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className={`absolute inset-0 rounded-full ${isModelSpeaking ? 'bg-vox-accent' : 'bg-blue-400'}`}
                  />
                )}
              </AnimatePresence>
              
              <div className={`relative z-10 w-full h-full rounded-full border-4 flex flex-col items-center justify-center transition-all duration-500 overflow-hidden ${isModelSpeaking ? 'border-vox-accent bg-vox-accent/5' : isUserSpeaking ? 'border-blue-400 bg-blue-400/5' : 'border-white/10 bg-white/5'}`}>
                <VoxaraLogo className={`w-32 h-32 transition-all duration-500 ${isModelSpeaking ? 'scale-110' : 'scale-100 opacity-40'}`} />
                
                <div className="absolute bottom-12 left-0 right-0 flex justify-center">
                  <Waveform isActive={isModelSpeaking} color="#f27d26" barCount={15} />
                </div>

                {micError && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                      <MicOff size={32} className="text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">Microphone Issue</h3>
                    <p className="text-sm text-vox-paper/60 mb-8 leading-relaxed">{micError}</p>
                    <button 
                      onClick={() => { globalResumeAudioContext(); startSession(); }}
                      className="px-8 py-3 bg-vox-accent text-vox-bg rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all"
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}
              </div>

              {/* User Speaking Indicator */}
              <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full glass border border-white/10 flex items-center justify-center z-20">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isUserSpeaking ? 'bg-blue-400 text-white' : 'bg-white/5 text-vox-paper/20'}`}>
                  <Mic size={20} />
                </div>
                {isUserSpeaking && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0.2 }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 rounded-full bg-blue-400"
                  />
                )}
              </div>
            </div>

            <div className="text-center mb-8">
              <h3 className={`text-2xl font-serif italic transition-all duration-500 ${isModelSpeaking ? 'text-vox-accent' : 'text-vox-paper/40'}`}>
                {isModelSpeaking ? "Companion is speaking..." : isUserSpeaking ? "Listening to you..." : isConnected ? "I'm listening..." : "Waiting for connection..."}
              </h3>
            </div>

            {/* Real-time Transcription Display */}
            {isConnected && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full h-48 glass-dark rounded-3xl p-6 mb-8 overflow-hidden flex flex-col"
              >
                <div className="flex items-center gap-2 mb-4 text-[10px] uppercase tracking-widest text-vox-paper/30 font-bold">
                  <MessageSquare size={12} /> Live Transcript
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide" id="live-transcript">
                  {currentMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-vox-paper/20 italic text-sm">
                      Speak to start the conversation...
                    </div>
                  ) : (
                    currentMessages.map((msg, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: msg.role === 'user' ? -10 : 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-white/5 text-vox-paper/80 rounded-tl-none' : 'bg-vox-accent/10 text-vox-accent italic font-serif rounded-tr-none'}`}>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={scrollRef} />
                </div>
              </motion.div>
            )}

            {!isConnected ? (
              <div className="flex flex-col items-center gap-6">
                <button 
                  onClick={() => { globalResumeAudioContext(); startSession(); }}
                  disabled={isConnecting}
                  className="px-10 py-5 bg-vox-accent text-white rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-vox-accent/20"
                >
                  {isConnecting ? "Connecting..." : "Start Live Session"}
                </button>
                {micError && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-3"
                  >
                    <AlertCircle size={16} />
                    {micError}
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                <button 
                  onClick={stopSession}
                  className="group relative flex items-center gap-3 px-12 py-6 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full font-bold text-xl transition-all duration-300 border-2 border-red-500/50 hover:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                >
                  <div className="w-3 h-3 rounded-sm bg-current animate-pulse group-hover:animate-none" />
                  End Session
                </button>
              </div>
            )}

            {transcription && (
              <div className="mt-16 glass-dark p-8 rounded-3xl text-left max-h-64 overflow-y-auto">
                <div className="text-[10px] uppercase tracking-widest text-vox-paper/30 mb-4">Live Transcription</div>
                <p className="font-serif italic text-lg leading-relaxed">{transcription}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Journal = ({ onBack, user, setUser }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [prompt, setPrompt] = useState('What is one small way you can show yourself courage today?');
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isPrivate, setIsPrivate] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          const base64Audio = dataUrl.split(',')[1];
          setIsTranscribing(true);
          try {
            const text = await transcribeAudio(base64Audio, 'audio/webm');
            if (text) {
              setResponse(prev => prev ? prev + " " + text : text);
            }
          } catch (err) {
            console.error("Transcription error:", err);
          } finally {
            setIsTranscribing(false);
          }
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic access error:", err);
      setMicError(err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' 
        ? "No microphone found. Please connect a device and try again." 
        : "Microphone access denied. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const getNewPrompt = async () => {
    setIsGenerating(true);
    
    // Build rich context from mood history and past entries
    const journalContext = user.journalEntries?.slice(0, 5).map(e => `Prompt: ${e.prompt}\nResponse: ${e.response}`).join("\n---\n") || "";
    const moodContext = user.moodHistory?.slice(0, 10).map(m => {
      const date = new Date(m.timestamp).toLocaleDateString();
      return `${date}: ${m.mood}${m.note ? ` (Note: ${m.note})` : ''}`;
    }).join("\n") || "";
    
    const fullContext = `
      USER PROFILE & HISTORY:
      - Current Courage Level: ${user.courageLevel}/100
      - Daily Intention: ${user.dailyIntention || "Not set"}
      
      RECENT MOODS:
      ${moodContext || "No mood data yet."}
      
      PAST REFLECTIONS:
      ${journalContext || "No past entries yet."}
    `.trim();

    const newPrompt = await generateJournalPrompt(fullContext);
    setPrompt(newPrompt || "What is one small way you can show yourself courage today?");
    setIsGenerating(false);
    setResponse('');
  };

  useEffect(() => {
    if (!prompt || prompt === 'What is one small way you can show yourself courage today?') {
      getNewPrompt();
    }
  }, []);

  const saveEntry = () => {
    if (!response.trim()) return;
    setIsSaving(true);
    const newEntry: JournalEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      prompt,
      response,
    };
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        journalEntries: [newEntry, ...(prev.journalEntries || [])]
      };
    });
    // Journal complete
    setIsSaving(false);
    setShowHistory(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 relative overflow-hidden pt-24">
      <div className="absolute inset-0 vox-gradient opacity-30" />
      
      <div className="absolute top-10 left-10 z-20 flex gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
          <ChevronRight className="rotate-180" size={20} /> Back to Sanctuary
        </button>
        <button 
          onClick={() => setShowHistory(!showHistory)} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${showHistory ? 'bg-vox-accent text-white' : 'text-vox-paper/50 hover:text-vox-paper bg-white/5'}`}
        >
          <History size={18} /> {showHistory ? "Journal History" : "Journal History"}
        </button>
        {!showHistory && response.trim() && (
          <button 
            onClick={saveEntry}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-vox-accent/20 text-vox-accent border border-vox-accent/30 hover:bg-vox-accent hover:text-vox-bg transition-all font-bold text-xs uppercase tracking-widest"
          >
            <CheckCircle2 size={18} /> {isSaving ? "Saving..." : "Save Now"}
          </button>
        )}
      </div>

      <div className="absolute top-10 right-10 z-20 flex items-center gap-2 text-vox-paper/30 text-[10px] uppercase tracking-widest font-bold">
        <Lock size={12} className="text-vox-accent" /> Private & Encrypted
      </div>

      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.div 
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-4xl glass-dark rounded-[3rem] p-12 max-h-[80vh] overflow-hidden flex flex-col"
          >
            <h2 className="text-3xl mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="text-vox-accent" /> Your Courage Journal
              </div>
              <div className="text-xs font-mono text-vox-paper/30 uppercase tracking-widest">
                {user.journalEntries?.length || 0} Reflections
              </div>
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-4 space-y-6 scrollbar-hide">
              {(!user.journalEntries || user.journalEntries.length === 0) ? (
                <div className="text-center py-20 text-vox-paper/30 italic">
                  Your journal is empty. Start reflecting to see your growth here.
                </div>
              ) : (
                user.journalEntries.map((entry) => (
                  <div key={entry.id} className="bg-white/5 rounded-3xl p-8 border border-white/5 hover:border-vox-accent/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-vox-accent font-mono text-xs">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                      <Lock size={12} className="text-vox-paper/20" />
                    </div>
                    <h4 className="text-xl font-serif italic mb-4 text-vox-paper/90">"{entry.prompt}"</h4>
                    <div className="text-vox-paper/60 leading-relaxed whitespace-pre-wrap font-serif">
                      <Markdown>{entry.response}</Markdown>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="write"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-3xl"
          >
            <div className="text-center mb-12">
              <div className="w-20 h-20 rounded-3xl bg-vox-accent/10 flex items-center justify-center mx-auto mb-6 border border-vox-accent/20">
                <BookOpen size={40} className="text-vox-accent" />
              </div>
              <h2 className="text-4xl mb-4">Guided Reflection</h2>
              <p className="text-vox-paper/50 font-serif italic">Take a moment to breathe and listen to your inner voice.</p>
            </div>

            <div className="glass-dark rounded-[3rem] p-12 border border-white/5 relative overflow-hidden">
              {isGenerating ? (
                <div className="py-20 flex flex-col items-center gap-6">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-2 border-vox-accent/30 border-t-vox-accent rounded-full"
                  />
                  <p className="text-vox-paper/30 font-mono text-xs uppercase tracking-widest">Generating prompt...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="relative">
                    <span className="absolute -top-6 left-0 text-[10px] uppercase tracking-widest text-vox-accent font-bold">The Prompt</span>
                    <h3 className="text-2xl md:text-3xl font-serif italic leading-tight text-vox-paper/90">
                      {prompt}
                    </h3>
                    <div className="mt-6 flex gap-4">
                      <button 
                        onClick={getNewPrompt}
                        className="px-6 py-2 bg-vox-accent/10 border border-vox-accent/30 text-vox-accent rounded-full text-xs font-bold uppercase tracking-widest hover:bg-vox-accent hover:text-vox-bg transition-all flex items-center gap-2"
                      >
                        <Sparkles size={14} /> Generate New Prompt
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute -top-6 left-0 text-[10px] uppercase tracking-widest text-vox-paper/30">Your Reflection</span>
                    <textarea 
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Let your thoughts flow freely..."
                      className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-lg font-serif focus:outline-none focus:border-vox-accent transition-all h-64 resize-none placeholder:text-vox-paper/20"
                    />
                    <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3">
                      {micError && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] flex items-center gap-2 max-w-[200px]"
                        >
                          <AlertCircle size={12} />
                          {micError}
                        </motion.div>
                      )}
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-vox-accent text-vox-bg hover:scale-105'}`}
                        title={isRecording ? "Stop Recording" : "Voice to Text"}
                      >
                        {isTranscribing ? (
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-vox-bg/30 border-t-vox-bg rounded-full"
                          />
                        ) : isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={saveEntry}
                    disabled={!response.trim() || isSaving}
                    className="w-full py-6 bg-vox-accent text-white rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 shadow-xl shadow-vox-accent/20"
                  >
                    {isSaving ? "Saving to Journal..." : "Save Reflection"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AnchorMode = ({ onBack, user, setUser }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const addContact = () => {
    if (!newContactName || !newContactPhone) return;
    const contact: EmergencyContact = {
      id: Math.random().toString(36).substr(2, 9),
      name: newContactName,
      phone: newContactPhone
    };
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        emergencyContacts: [...(prev.emergencyContacts || []), contact]
      };
    });
    setNewContactName('');
    setNewContactPhone('');
    setShowAddContact(false);
  };

  const removeContact = (id: string) => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        emergencyContacts: (prev.emergencyContacts || []).filter(c => c.id !== id)
      };
    });
  };

  return (
    <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center p-6 text-center overflow-y-auto pt-24">
      <motion.div 
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 4 }}
        className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mb-8"
      >
        <Shield size={48} className="text-red-500" />
      </motion.div>
      
      <h2 className="text-4xl mb-4 font-light tracking-tight">Anchor Mode Active</h2>
      <p className="text-vox-paper/60 font-serif italic text-lg mb-8 max-w-md">
        Focus on your breath. Feel the ground beneath you. You are safe.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-md mb-8">
        <motion.button 
          whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
          whileTap={{ scale: 0.95 }}
          className="p-4 glass-dark rounded-2xl flex flex-col items-center gap-2 border border-white/5"
        >
          <Activity className="text-vox-accent" size={20} />
          <span className="text-xs uppercase tracking-widest font-bold">Binaural Grounding</span>
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
          whileTap={{ scale: 0.95 }}
          className="p-4 glass-dark rounded-2xl flex flex-col items-center gap-2 border border-white/5"
        >
          <Heart className="text-red-400" size={20} />
          <span className="text-xs uppercase tracking-widest font-bold">Haptic Pulse</span>
        </motion.button>
      </div>

      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-red-400">Emergency Contacts</h3>
          <button 
            onClick={() => setShowAddContact(!showAddContact)}
            className="text-xs text-vox-paper/40 hover:text-vox-paper flex items-center gap-1"
          >
            <Plus size={14} /> Add Contact
          </button>
        </div>

        {showAddContact && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 p-4 rounded-2xl border border-white/10 mb-4 space-y-3"
          >
            <input 
              type="text" 
              placeholder="Name" 
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-vox-accent"
            />
            <input 
              type="text" 
              placeholder="Phone Number" 
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-vox-accent"
            />
            <div className="flex gap-2">
              <button 
                onClick={addContact}
                className="flex-1 py-2 bg-vox-accent text-vox-bg rounded-xl font-bold text-xs uppercase tracking-widest"
              >
                Save
              </button>
              <button 
                onClick={() => setShowAddContact(false)}
                className="flex-1 py-2 bg-white/5 rounded-xl font-bold text-xs uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        <div className="space-y-2">
          {(!user.emergencyContacts || user.emergencyContacts.length === 0) ? (
            <p className="text-xs text-vox-paper/20 italic">No contacts added yet.</p>
          ) : (
            user.emergencyContacts.map(contact => (
              <div key={contact.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 group">
                <div className="text-left">
                  <p className="text-sm font-medium">{contact.name}</p>
                  <p className="text-xs text-vox-paper/40">{contact.phone}</p>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={`tel:${contact.phone}`}
                    className="w-10 h-10 rounded-full bg-vox-accent/20 text-vox-accent flex items-center justify-center hover:bg-vox-accent hover:text-vox-bg transition-all"
                  >
                    <Phone size={16} />
                  </a>
                  <button 
                    onClick={() => removeContact(contact.id)}
                    className="w-10 h-10 rounded-full bg-white/5 text-vox-paper/20 flex items-center justify-center hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4 w-full max-w-md">
        <motion.button 
          whileHover={{ scale: 1.02, backgroundColor: "rgb(220, 38, 38)" }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-red-600/20"
        >
          Call SOS
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 bg-white/10 rounded-xl font-bold uppercase tracking-widest text-xs" 
          onClick={onBack}
        >
          I'm Feeling Better
        </motion.button>
      </div>
    </div>
  );
};

const FearStrengthMap = ({ user, onBack }: { user: User, onBack: () => void }) => {
  const getStrengthLabel = (level: number) => {
    if (level < 20) return "Flickering Hope";
    if (level < 40) return "Rising Resilience";
    if (level < 60) return "Steady Ground";
    if (level < 80) return "Radiant Confidence";
    return "Unshakeable Light";
  };

  const getStrengthDescription = (level: number) => {
    if (level < 20) return "The path is still shrouded, but you've taken the first steps. Every whisper counts.";
    if (level < 40) return "You are beginning to find your voice. The shadows are receding as you practice.";
    if (level < 60) return "Your presence is felt. You are standing taller, and the world is becoming clearer.";
    if (level < 80) return "You are a beacon of courage. Your voice carries weight and your heart is open.";
    return "The fog has vanished. You are fully present, fully heard, and fully yourself.";
  };

  const chartData = user.courageHistory?.map(entry => ({
    time: new Date(entry.timestamp).toLocaleDateString(),
    level: entry.level
  })) || [];

  return (
    <div className="min-h-screen p-6 pt-24 max-w-6xl mx-auto pb-32">
      <header className="flex items-center justify-between mb-16">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper transition-colors">
          <ChevronRight className="rotate-180" size={20} /> Dashboard
        </button>
        <div className="text-right">
          <h2 className="text-4xl font-light tracking-tighter">Courage Map</h2>
          <p className="text-vox-paper/40 text-xs uppercase tracking-widest mt-1">Visualizing Your Journey</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="relative h-[500px] glass-dark rounded-[4rem] overflow-hidden p-12 border border-white/5 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-vox-bg via-vox-bg to-vox-accent/5" />
            <div className="absolute inset-0 vox-gradient opacity-10" />
            
            <motion.div 
              initial={false}
              animate={{ 
                opacity: Math.max(0, 1 - (user.courageLevel / 100)),
                backdropFilter: `blur(${Math.max(0, 40 * (1 - user.courageLevel / 100))}px)`
              }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 bg-vox-bg/60 pointer-events-none z-30"
            />

            <div className="relative z-10 grid grid-cols-10 grid-rows-10 h-full gap-2 md:gap-4">
              {[...Array(100)].map((_, i) => {
                const isActive = i < user.courageLevel;
                const delay = i * 0.005;
                return (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: isActive ? 1 : 0.15,
                      scale: isActive ? 1 : 0.9,
                    }}
                    transition={{ delay, duration: 0.5 }}
                    className={`flex items-center justify-center rounded-lg ${isActive ? 'bg-vox-accent/5' : ''}`}
                  >
                    {isActive ? (
                      <Sun size={12} className="text-vox-accent" />
                    ) : (
                      <Cloud size={12} className="text-vox-paper/20" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
            <h3 className="text-xl font-light tracking-widest uppercase mb-8 text-vox-paper/40">Evolution of Courage</h3>
            <div className="h-[300px] w-full min-h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="99%" height={300} debounce={100} minWidth={0} minHeight={0}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      stroke="rgba(255,255,255,0.2)" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.2)" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#050505', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="level" 
                      stroke="#0EA5E9" 
                      fillOpacity={1} 
                      fill="url(#colorLevel)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-vox-paper/20 italic">
                  Not enough data to map your journey yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-vox-bg/40 backdrop-blur-md p-10 rounded-[3rem] border border-white/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-6xl font-light tracking-tighter text-vox-accent">
                {user.courageLevel}<span className="text-2xl">%</span>
              </div>
              <div className="h-12 w-[1px] bg-white/10" />
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-vox-accent font-bold mb-1">Status</div>
                <div className="text-xl font-serif italic">{getStrengthLabel(user.courageLevel)}</div>
              </div>
            </div>
            <p className="text-vox-paper/60 text-sm leading-relaxed font-serif italic">
              "{getStrengthDescription(user.courageLevel)}"
            </p>
          </div>

          <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
            <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-vox-paper/40 mb-8">Goal Achievement</h3>
            <div className="space-y-6">
              {user.goals?.slice(0, 5).map(goal => (
                <div key={goal.id} className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${goal.completed ? 'bg-vox-accent shadow-[0_0_8px_rgba(242,125,38,0.5)]' : 'bg-white/10'}`} />
                  <span className={`text-sm font-serif italic ${goal.completed ? 'text-vox-paper' : 'text-vox-paper/30'}`}>
                    {goal.text}
                  </span>
                </div>
              ))}
              {(!user.goals || user.goals.length === 0) && (
                <p className="text-xs text-vox-paper/20 italic">No goals set yet. Visit settings to define your path.</p>
              )}
            </div>
          </div>

          <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
            <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-vox-paper/40 mb-6">Safety Protocol</h3>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <Navigation size={16} className={user.locationEnabled ? "text-vox-accent" : "text-vox-paper/20"} />
                <span className="text-xs font-bold uppercase tracking-widest">Location Sharing</span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-all ${user.locationEnabled ? 'bg-vox-accent' : 'bg-white/10'}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${user.locationEnabled ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
            <p className="text-[10px] text-vox-paper/30 mt-4 leading-relaxed italic">
              If enabled, your location will be discreetly shared with emergency contacts if your courage level drops to critical levels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const VoiceCircles = ({ onBack, user, setUser }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [activeCircle, setActiveCircle] = useState<any>(null);
  const [userStatus, setUserStatus] = useState({ isSpeaking: false, isTyping: false, isMuted: true });
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [alias, setAlias] = useState(`Seeker-${Math.floor(Math.random() * 1000)}`);
  const socketRef = useRef<WebSocket | null>(null);
  
  const [circles, setCircles] = useState([
    { id: "morning", name: "Gentle Morning", active: 12, type: "listening", color: "from-emerald-500/20 to-teal-500/20", description: "Soft music and shared silence to start your day." },
    { id: "courage", name: "Courage to Say No", active: 5, type: "sharing", color: "from-vox-accent/20 to-orange-500/20", description: "A space to practice boundaries and find your voice." },
    { id: "silent", name: "Silent Presence", active: 28, type: "presence", color: "from-blue-500/20 to-indigo-500/20", description: "No words needed. Just be here with others." },
    { id: "midnight", name: "Midnight Reflection", active: 8, type: "sharing", color: "from-purple-500/20 to-pink-500/20", description: "Late night thoughts and quiet support." },
  ]);

  const joinCircle = (circle: any) => {
    setActiveCircle(circle);
    // Circle join complete
  };

  const createGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGroupName,
      active: 1,
      type: "sharing",
      color: "from-vox-accent/20 to-blue-500/20",
      description: newGroupDesc || "A new community space."
    };
    setCircles([newGroup, ...circles]);
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        groups: [...(prev.groups || []), newGroup.id]
      };
    });
    setNewGroupName("");
    setNewGroupDesc("");
    setShowCreateGroup(false);
  };

  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        userId: user.id,
        userName: alias // Use alias for anonymity
      }));
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'room_update' && activeCircle && message.roomId === activeCircle.id) {
          setParticipants(message.participants);
        }
        if (message.type === 'chat_received' && activeCircle && message.roomId === activeCircle.id) {
          setMessages(prev => [...prev, { 
            id: Date.now() + Math.random(), 
            text: message.text, 
            sender: message.fromId === user.id ? "You" : message.fromName, 
            time: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          }]);
        }
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    };

    return () => {
      socket.close();
    };
  }, [user.id, alias, activeCircle?.id]);

  useEffect(() => {
    if (activeCircle && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'join_circle',
        roomId: activeCircle.id
      }));
    }
  }, [activeCircle]);

  useEffect(() => {
    if (activeCircle && socketRef.current?.readyState === WebSocket.OPEN) {
      const status = userStatus.isSpeaking ? 'speaking' : (userStatus.isTyping ? 'typing' : 'listening');
      socketRef.current.send(JSON.stringify({
        type: 'status_change',
        status
      }));
    }
  }, [userStatus, activeCircle]);

  const toggleMic = () => {
    setUserStatus(prev => ({ ...prev, isMuted: !prev.isMuted, isSpeaking: prev.isMuted ? true : false }));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    
    socketRef.current.send(JSON.stringify({
      type: 'chat_message',
      text: chatMessage,
      alias: alias
    }));

    setChatMessage("");
    setUserStatus(prev => ({ ...prev, isTyping: false }));
  };

  const leaveCircle = () => {
    setActiveCircle(null);
    setMessages([]);
    setParticipants([]);
  };

  return (
    <div className="min-h-screen p-6 pt-24 max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        {!activeCircle ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <header className="flex items-center justify-between mb-12">
              <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper transition-colors">
                <ChevronRight className="rotate-180" size={20} /> Dashboard
              </button>
              <div className="flex items-center gap-6">
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(45, 212, 191, 0.2)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateGroup(true)}
                  className="px-6 py-2 bg-vox-accent/10 border border-vox-accent/30 text-vox-accent rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> Create Group
                </motion.button>
                <div className="text-right">
                  <h2 className="text-4xl font-light tracking-tighter">Voice Circles</h2>
                  <p className="text-vox-paper/40 text-sm font-serif italic">Anonymous shared presence</p>
                </div>
              </div>
            </header>

            {showCreateGroup && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-dark p-8 rounded-[2.5rem] border border-white/10 mb-12 max-w-2xl mx-auto"
              >
                <h3 className="text-2xl mb-6">Create a New Circle</h3>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Circle Name" 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-vox-accent"
                  />
                  <textarea 
                    placeholder="Description (What is this space for?)" 
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-vox-accent h-24 resize-none"
                  />
                  <div className="flex gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(45, 212, 191, 0.9)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={createGroup}
                      className="flex-1 py-4 bg-vox-accent text-vox-bg rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      Establish Circle
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCreateGroup(false)}
                      className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {circles.map(circle => (
                <motion.div 
                  key={circle.id}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => joinCircle(circle)}
                  className={`glass-dark p-8 rounded-[2.5rem] flex items-center justify-between group cursor-pointer border border-white/5 hover:border-vox-accent/30 transition-all relative overflow-hidden`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${circle.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${circle.type === 'presence' ? 'bg-blue-500/20' : 'bg-vox-accent/20'} border border-white/10`}>
                      {circle.type === 'presence' ? <Wind className="text-blue-400" /> : <Mic className="text-vox-accent" />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-medium mb-1">{circle.name}</h3>
                      <div className="flex items-center gap-3 text-vox-paper/40 text-xs uppercase tracking-widest font-bold">
                        <span className="flex items-center gap-1.5"><Users size={12} className="text-vox-accent" /> {circle.active} present</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span>{circle.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-vox-accent group-hover:text-vox-bg transition-all">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 p-12 glass-dark rounded-[3rem] text-center border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-vox-accent/50 to-transparent" />
              <p className="text-2xl text-vox-paper/60 italic font-serif mb-8 leading-relaxed">
                "In the circle, your voice is a gift, and your silence is a sanctuary."
              </p>
              <div className="flex justify-center gap-8">
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-bold text-vox-paper/30">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> Fully Anonymous
                </div>
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-bold text-vox-paper/30">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> End-to-End Encrypted
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="active"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[85vh]"
          >
            {/* Main Stage */}
            <div className="lg:col-span-3 flex flex-col glass-dark rounded-[3rem] border border-white/5 overflow-hidden relative">
              <div className="absolute inset-0 vox-gradient opacity-10 pointer-events-none" />
              
              <header className="p-8 flex items-center justify-between border-b border-white/5 relative z-10">
                <button onClick={leaveCircle} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper transition-colors">
                  <ChevronRight className="rotate-180" size={20} /> Leave Circle
                </button>
                <div className="text-center">
                  <h2 className="text-2xl font-light tracking-tight">{activeCircle.name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-vox-paper/30">{activeCircle.type} session active</span>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-vox-bg bg-white/10 flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-vox-bg bg-vox-accent flex items-center justify-center text-[10px] font-bold text-vox-bg">
                    +{activeCircle.active - 3}
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-12 relative z-10">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-12">
                  {/* Current User */}
                  <motion.div layout className="flex flex-col items-center gap-4">
                    <div className="relative">
                      {userStatus.isSpeaking && (
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.8, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute inset-0 rounded-full bg-vox-accent/40"
                        />
                      )}
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-2 transition-all duration-500 ${userStatus.isSpeaking ? 'border-vox-accent bg-vox-accent/20 shadow-[0_0_30px_rgba(242,125,38,0.2)]' : 'border-white/20 bg-white/5'}`}>
                        Y
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-vox-paper text-vox-bg text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-tighter">
                        You
                      </div>
                    </div>
                    <span className="text-xs uppercase tracking-widest font-bold text-vox-paper/40">
                      {userStatus.isSpeaking ? 'Speaking' : userStatus.isTyping ? 'Typing...' : 'Listening'}
                    </span>
                  </motion.div>

                  <AnimatePresence>
                    {participants.filter(p => p.id !== user.id).map(p => (
                      <motion.div 
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        layout
                        className="flex flex-col items-center gap-4"
                      >
                        <div className="relative">
                          {p.status === 'speaking' && (
                            <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1.6, opacity: 0 }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute inset-0 rounded-full bg-vox-accent/30"
                            />
                          )}
                          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold border-2 transition-all duration-500 ${p.status === 'speaking' ? 'border-vox-accent bg-vox-accent/10' : 'border-white/10 bg-white/5'}`}>
                            {p.name[0]}
                          </div>
                          {p.status === 'speaking' && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-vox-accent text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                              Speaking
                            </div>
                          )}
                          {p.status === 'typing' && (
                            <div className="absolute -top-1 -right-1 bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg flex gap-1 items-center border border-white/10">
                              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1 h-1 bg-vox-paper rounded-full" />
                              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-vox-paper rounded-full" />
                              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-vox-paper rounded-full" />
                            </div>
                          )}
                        </div>
                        <span className={`text-sm font-medium transition-colors duration-500 ${p.status === 'speaking' ? 'text-vox-accent' : 'text-vox-paper/50'}`}>{p.name}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <footer className="p-8 border-t border-white/5 flex items-center justify-center gap-6 relative z-10">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMic}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${userStatus.isMuted ? 'bg-white/5 text-vox-paper/40 border border-white/10' : 'bg-vox-accent text-vox-bg shadow-[0_0_30px_rgba(242,125,38,0.4)]'}`}
                >
                  {userStatus.isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-16 h-16 rounded-full glass-dark flex items-center justify-center text-vox-paper/50 hover:text-vox-accent transition-all border border-white/5"
                >
                  <Wind size={24} />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-16 h-16 rounded-full glass-dark flex items-center justify-center text-vox-paper/50 hover:text-blue-400 transition-all border border-white/5"
                >
                  <Sparkles size={24} />
                </motion.button>
              </footer>
            </div>

            {/* Chat Panel */}
            <div className="flex flex-col glass-dark rounded-[3rem] border border-white/5 overflow-hidden">
              <header className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-vox-paper/40">Shared Echoes</h3>
                <span className="text-[10px] text-vox-accent font-bold">{messages.length} notes</span>
              </header>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <MessageSquare size={32} className="text-white/5 mb-4" />
                    <p className="text-xs text-vox-paper/20 italic font-serif">No echoes yet. Share a thought or a feeling.</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-2xl bg-white/5 border border-white/5"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-vox-accent uppercase tracking-tighter">{msg.sender}</span>
                        <span className="text-[9px] text-vox-paper/20">{msg.time}</span>
                      </div>
                      <p className="text-sm text-vox-paper/80 leading-relaxed">{msg.text}</p>
                    </motion.div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-6 border-t border-white/5">
                <div className="relative">
                  <input 
                    type="text"
                    value={chatMessage}
                    onChange={(e) => {
                      setChatMessage(e.target.value);
                      setUserStatus(prev => ({ ...prev, isTyping: e.target.value.length > 0 }));
                    }}
                    onBlur={() => setUserStatus(prev => ({ ...prev, isTyping: false }))}
                    placeholder="Whisper a note..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-vox-accent/50 transition-all pr-12"
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-vox-accent/20 text-vox-accent flex items-center justify-center hover:bg-vox-accent hover:text-vox-bg transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MoodTracker = ({ user, setUser, onBack, safePlayPCM }: { user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, onBack: () => void, safePlayPCM: any }) => {
  const [selectedMood, setSelectedMood] = useState<MoodEntry['mood'] | null>(null);
  const [note, setNote] = useState('');

  const moods = [
    { id: 'terrible', icon: Frown, color: 'text-red-500', label: 'Terrible' },
    { id: 'bad', icon: Meh, color: 'text-orange-500', label: 'Bad' },
    { id: 'neutral', icon: Meh, color: 'text-yellow-500', label: 'Neutral' },
    { id: 'good', icon: Smile, color: 'text-emerald-500', label: 'Good' },
    { id: 'great', icon: Smile, color: 'text-blue-500', label: 'Great' },
  ];

  const saveMood = () => {
    if (!selectedMood) return;
    const newEntry: MoodEntry = {
      timestamp: Date.now(),
      mood: selectedMood,
      note: note.trim() || undefined
    };

    setUser(prev => {
      const updatedUser = prev ? ({
        ...prev,
        moodHistory: [newEntry, ...(prev.moodHistory || [])]
      }) : null;
      
      if (updatedUser && updatedUser.id) {
        saveUserData(updatedUser.id, updatedUser);
      }
      
      return updatedUser;
    });
    
    setSelectedMood(null);
    setNote('');
  };

  // Mood Analysis Data - Last 7 Days
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }).reverse();

  const moodData = last7Days.map(day => {
    const entries = (user.moodHistory || []).filter(e => 
      new Date(e.timestamp).toLocaleDateString(undefined, { weekday: 'short' }) === day
    );
    const avgValue = entries.length > 0 
      ? entries.reduce((acc, e) => acc + (moods.findIndex(m => m.id === e.mood) + 1), 0) / entries.length
      : 0;
    return { day, value: avgValue };
  });

  // Calendar Logic
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  // Heatmap Data (Last 30 days)
  const heatmapData = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString();
    const entries = (user.moodHistory || []).filter(e => new Date(e.timestamp).toLocaleDateString() === dayStr);
    const avgValue = entries.length > 0 
      ? entries.reduce((acc, e) => acc + (moods.findIndex(m => m.id === e.mood) + 1), 0) / entries.length
      : 0;
    return { date: d, value: avgValue };
  }).reverse();

  const getHeatmapColor = (value: number) => {
    if (value === 0) return 'bg-white/5';
    if (value <= 1.5) return 'bg-red-500/40';
    if (value <= 2.5) return 'bg-orange-500/40';
    if (value <= 3.5) return 'bg-yellow-500/40';
    if (value <= 4.5) return 'bg-emerald-500/40';
    return 'bg-blue-500/40';
  };

  return (
    <div className="min-h-screen bg-vox-bg p-6 pt-24 pb-32 max-w-5xl mx-auto relative overflow-hidden">
      <div className="absolute inset-0 vox-gradient opacity-10" />
      
      <header className="flex items-center justify-between mb-16 relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-white transition-colors group">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-vox-accent/20 transition-all">
            <ChevronRight className="rotate-180" size={20} />
          </div>
          <span className="text-sm font-medium">Dashboard</span>
        </button>
        <div className="text-center">
          <h2 className="text-4xl font-light tracking-tighter text-white">Mood Sanctuary</h2>
          <p className="text-vox-paper/40 text-[10px] uppercase tracking-[0.3em] font-bold mt-2">Map your emotional landscape</p>
        </div>
        <div className="w-20" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Log Mood */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-5 glass-dark p-8 rounded-[3rem] border border-white/5 shadow-2xl h-fit"
        >
          <h3 className="text-xl font-serif italic mb-8 text-vox-paper/80">How does your heart feel today?</h3>
          <div className="flex justify-between mb-10">
            {moods.map((m) => (
              <motion.button
                key={m.id}
                whileHover={{ scale: 1.15, y: -5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedMood(m.id as any)}
                className={`flex flex-col items-center gap-3 transition-all duration-500 ${selectedMood === m.id ? 'scale-125' : 'opacity-30 hover:opacity-100'}`}
              >
                <div className={`p-3 rounded-2xl transition-all ${selectedMood === m.id ? 'bg-white/10 shadow-lg' : ''}`}>
                  <m.icon size={32} className={m.color} />
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-bold ${selectedMood === m.id ? 'text-white' : 'text-vox-paper/30'}`}>{m.label}</span>
              </motion.button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Whisper a note to your future self..."
            className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm focus:outline-none focus:border-vox-accent/50 mb-8 h-32 transition-all placeholder:text-vox-paper/20 resize-none"
          />
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "rgba(45, 212, 191, 0.9)" }}
            whileTap={{ scale: 0.98 }}
            onClick={saveMood}
            disabled={!selectedMood}
            className="w-full py-5 bg-vox-accent text-vox-bg rounded-full font-bold disabled:opacity-20 shadow-lg shadow-vox-accent/20 transition-all"
          >
            Preserve this Moment
          </motion.button>
        </motion.div>

        {/* Analysis & Heatmap */}
        <div className="lg:col-span-7 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-dark p-8 rounded-[3rem] border border-white/5 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-serif italic text-vox-paper/80">Emotional Resonance</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-vox-accent animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest text-vox-paper/40 font-bold">Live Analysis</span>
              </div>
            </div>
            
            <div className="h-56 w-full mb-8">
              {user.moodHistory && user.moodHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={moodData}>
                    <defs>
                      <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} 
                      dy={10}
                    />
                    <YAxis hide domain={[0, 6]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.5rem', padding: '1rem' }}
                      itemStyle={{ color: '#2dd4bf' }}
                      cursor={{ stroke: 'rgba(45,212,191,0.2)', strokeWidth: 2 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2dd4bf" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#moodGradient)" 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-vox-paper/20 italic text-sm gap-4">
                  <Activity size={48} className="opacity-10" />
                  Log your mood to see trends
                </div>
              )}
            </div>
          </motion.div>

      <div className="pt-8 border-t border-white/5">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xs uppercase tracking-[0.2em] text-vox-paper/40 font-bold">30-Day Intensity Map</h4>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(v => (
                    <div key={v} className={`w-2 h-2 rounded-sm ${getHeatmapColor(v)}`} />
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {heatmapData.map((d, i) => (
                  <div 
                    key={i} 
                    className={`w-4 h-4 rounded-sm transition-all hover:scale-125 cursor-help relative group ${getHeatmapColor(d.value)}`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-vox-bg border border-white/10 rounded text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {d.date.toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-dark p-8 rounded-[3rem] border border-white/5 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-serif italic text-vox-paper/80">Emotional Archive</h3>
              <div className="flex items-center gap-4">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-vox-paper/40 hover:text-white">
                  <ChevronRight className="rotate-180" size={16} />
                </button>
                <div className="text-[10px] uppercase tracking-widest font-bold text-vox-paper/60 min-w-[100px] text-center">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-vox-paper/40 hover:text-white">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-[10px] text-vox-paper/20 font-bold uppercase tracking-widest mb-4">{d}</div>
              ))}
              
              {/* Empty cells for first week */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {/* Actual days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const entries = (user.moodHistory || []).filter(e => {
                  const d = new Date(e.timestamp);
                  return d.getDate() === day && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
                });
                
                const latestEntry = entries[0];
                const moodColor = latestEntry ? moods.find(m => m.id === latestEntry.mood)?.color.replace('text-', 'bg-').replace('500', '500/20') : 'bg-white/5';
                const moodIconColor = latestEntry ? moods.find(m => m.id === latestEntry.mood)?.color : 'text-vox-paper/10';
                
                return (
                  <div 
                    key={day} 
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-xs transition-all border border-white/5 relative group cursor-help ${moodColor} hover:border-vox-accent/30 hover:scale-105`}
                  >
                    <span className="text-[10px] text-vox-paper/30 mb-1">{day}</span>
                    {latestEntry && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        {React.createElement(moods.find(m => m.id === latestEntry.mood)!.icon, { size: 16, className: moodIconColor })}
                      </motion.div>
                    )}
                    
                    {latestEntry && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-vox-bg border border-white/10 p-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-all z-50 shadow-2xl pointer-events-none w-48 backdrop-blur-xl">
                        <div className="flex items-center gap-2 mb-2">
                          {React.createElement(moods.find(m => m.id === latestEntry.mood)!.icon, { size: 14, className: moodIconColor })}
                          <span className="text-[10px] uppercase tracking-widest font-bold text-white">{latestEntry.mood}</span>
                        </div>
                        {latestEntry.note && (
                          <p className="text-[10px] text-vox-paper/60 italic font-serif leading-relaxed">
                            "{latestEntry.note}"
                          </p>
                        )}
                        <div className="mt-2 text-[8px] text-vox-paper/20 uppercase tracking-tighter">
                          {new Date(latestEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const CourageLab = ({ onBack, user, setUser }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [scenario, setScenario] = useState<any>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceStep, setPracticeStep] = useState(0);

  const scenarios = [
    { 
      id: 'boundary-1', 
      title: "Setting a Boundary", 
      category: 'Social Courage',
      desc: "Rehearse saying 'no' or expressing a limit with a friend or colleague.",
      steps: [
        "Centering: Take a grounding breath and feel your core strength.",
        "Statement: 'I understand why this is important, but I cannot take on more right now.'",
        "Reflection: How did your voice feel? Was it steady or shaky?",
      ],
      aiPrompt: "You are a friend asking for a huge favor that would overwhelm the user. Help them practice saying no firmly but kindly."
    },
    { 
      id: 'public-speaking-1', 
      title: "Public Speaking", 
      category: 'Expression',
      desc: "Practice introducing yourself or presenting a small idea in a low-stakes setting.",
      steps: [
        "Grounding: Take three deep breaths, feeling your feet on the floor.",
        "Opening: 'Hello everyone, my name is [Your Alias], and today I want to share...'",
        "Refinement: Practice the first 30 seconds until it feels like second nature.",
      ],
      aiPrompt: "You are an encouraging audience of 10 people. Provide constructive, positive feedback on the user's vocal clarity and confidence."
    },
    { 
      id: 'conflict-1', 
      title: "Difficult Conversations", 
      category: 'Interpersonal',
      desc: "Rehearse handling a misunderstanding or a tough topic with a partner.",
      steps: [
        "Preparation: Visualization—see the outcome you want: clarity and mutual respect.",
        "Opening: 'I've been thinking about what happened, and I'd like to understand your perspective.'",
        "Listening: Practice active listening even when it's hard to hear.",
      ],
      aiPrompt: "You are a partner who had a mild misunderstanding with the user. Help them navigate the conversation with empathy and honesty."
    }
  ];

  const handleComplete = () => {
    setUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        courageLevel: Math.min(100, (prev.courageLevel || 0) + 5),
        streak: (prev.streak || 0) + 1,
        dailyRitualsCompleted: (prev.dailyRitualsCompleted || 0) + 1
      };
    });
    setScenario(null);
    setIsPracticing(false);
    setPracticeStep(0);
  };

  const currentLevelProgress = ((practiceStep + 1) / (scenario?.steps.length || 1)) * 100;

  return (
    <div className="min-h-screen bg-vox-bg p-6 pt-24 pb-32 max-w-5xl mx-auto relative overflow-hidden text-vox-paper">
      <div className="absolute inset-0 vox-gradient opacity-10" />
      <header className="flex items-center justify-between mb-16 relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-white transition-colors group">
          <ChevronRight className="rotate-180" size={20} /> <span className="text-sm font-medium">Explore</span>
        </button>
        <div className="text-center">
          <h2 className="text-4xl font-light tracking-tighter text-white">Courage Lab</h2>
          <p className="text-vox-paper/40 text-[10px] uppercase tracking-[0.3em] font-bold mt-2">Muscle memory for the soul</p>
        </div>
        <div className="w-20" />
      </header>

      {!scenario ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {scenarios.map((s) => (
            <motion.button
              key={s.id}
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => setScenario(s)}
              className="glass-dark p-10 rounded-[3rem] border border-white/5 text-left flex flex-col justify-between hover:border-vox-accent/40 transition-all group"
            >
              <div>
                <div className="w-16 h-16 rounded-[2rem] bg-vox-accent/10 flex items-center justify-center text-vox-accent mb-10 group-hover:scale-110 transition-transform">
                  <Zap size={32} />
                </div>
                <h3 className="text-2xl font-serif mb-4 text-white line-clamp-1">{s.title}</h3>
                <p className="text-vox-paper/40 text-sm leading-relaxed font-serif italic">{s.desc}</p>
              </div>
              <div className="mt-12 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest font-bold text-vox-accent">{s.category}</span>
                <ArrowRight size={20} className="text-vox-accent opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="max-w-3xl mx-auto relative z-10 animate-fade-in">
          <div className="glass-dark p-12 rounded-[4rem] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
              <motion.div 
                className="h-full bg-vox-accent"
                initial={{ width: 0 }}
                animate={{ width: `${currentLevelProgress}%` }}
              />
            </div>

            <div className="flex items-center gap-6 mb-12">
              <div className="w-20 h-20 rounded-[2.5rem] bg-vox-accent/10 flex items-center justify-center text-vox-accent shadow-2xl">
                <Zap size={40} />
              </div>
              <div>
                <h3 className="text-4xl font-serif text-white">{scenario.title}</h3>
                <p className="text-vox-paper/40 text-[10px] uppercase tracking-widest font-bold mt-2">{scenario.category}</p>
              </div>
              <button onClick={() => setScenario(null)} className="ml-auto text-vox-paper/30 hover:text-vox-paper transition-colors"><X size={24} /></button>
            </div>

            <div className="min-h-[300px] flex flex-col justify-center mb-16">
              <motion.div 
                key={practiceStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-vox-accent">Practice Step {practiceStep + 1} of {scenario.steps.length}</div>
                <p className="text-3xl md:text-4xl font-serif italic leading-relaxed text-white/90">
                  {scenario.steps[practiceStep]}
                </p>
              </motion.div>
            </div>

            <div className="flex gap-4">
              {practiceStep > 0 && (
                <button 
                  onClick={() => setPracticeStep(practiceStep - 1)}
                  className="flex-1 py-6 bg-white/5 rounded-2xl font-bold text-vox-paper/60 hover:bg-white/10 transition-all"
                >
                  Previous
                </button>
              )}
              {practiceStep < scenario.steps.length - 1 ? (
                <button 
                  onClick={() => setPracticeStep(practiceStep + 1)}
                  className="flex-[2] py-6 bg-vox-accent text-vox-bg rounded-2xl font-bold transition-all shadow-lg hover:scale-[1.02]"
                >
                  Next Step
                </button>
              ) : (
                <button 
                  onClick={handleComplete}
                  className="flex-[2] py-6 bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg hover:scale-[1.02]"
                >
                  Complete Practice
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DailyAffirmations = ({ onBack, user, setUser }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [isRecording, setIsRecording] = useState(false);
  
  const defaultAffirmations = [
    "My voice is my power.",
    "I am worth the space I take up.",
    "Courage is a muscle I am building.",
    "It is safe for me to be seen and heard."
  ];

  return (
    <div className="min-h-screen bg-vox-bg p-6 pt-24 pb-32 max-w-5xl mx-auto relative overflow-hidden text-vox-paper">
      <div className="absolute inset-0 vox-gradient opacity-10" />
      <header className="flex items-center justify-between mb-16 relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-white transition-colors group">
          <ChevronRight className="rotate-180" size={20} /> <span className="text-sm font-medium">Explore</span>
        </button>
        <div className="text-center">
          <h2 className="text-4xl font-light tracking-tighter text-white">Daily Affirmations</h2>
          <p className="text-vox-paper/40 text-[10px] uppercase tracking-[0.3em] font-bold mt-2">Your voice, your healing</p>
        </div>
        <div className="w-20" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        <div className="glass-dark p-12 rounded-[4rem] border border-white/5 flex flex-col items-center justify-center text-center shadow-2xl">
          <motion.div 
            animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
            className={`w-32 h-32 rounded-[4rem] ${isRecording ? 'bg-rose-500' : 'bg-vox-accent'} flex items-center justify-center text-vox-bg mb-10 cursor-pointer shadow-2xl transition-all`}
            onClick={() => setIsRecording(!isRecording)}
          >
            {isRecording ? <Square size={48} /> : <Mic size={48} />}
          </motion.div>
          <h3 className="text-3xl font-serif text-white mb-4">{isRecording ? 'Recording...' : 'Record Your Power'}</h3>
          <p className="text-vox-paper/40 text-sm max-w-xs font-serif italic">Tap to start recording your personal affirmation.</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] uppercase tracking-widest font-bold text-vox-paper/40 mb-6 px-4">My Library</h4>
          {defaultAffirmations.map((a, i) => (
            <motion.div key={i} className="glass-dark p-6 rounded-[2rem] border border-white/5 flex items-center justify-between group cursor-pointer hover:border-vox-accent/30 transition-all">
              <div className="flex items-center gap-6">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-vox-accent group-hover:bg-vox-accent group-hover:text-vox-bg transition-all">
                  <Play size={16} />
                </div>
                <p className="text-lg font-serif italic text-white/80">{a}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const VoiceCirclesView = ({ onBack, user, setUser }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [mode, setMode] = useState<'presence' | 'active'>('presence');
  
  return (
    <div className="min-h-screen bg-vox-bg p-6 pt-24 pb-32 max-w-5xl mx-auto relative overflow-hidden text-vox-paper">
      <div className="absolute inset-0 vox-gradient opacity-10" />
      <header className="flex items-center justify-between mb-16 relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-white transition-colors group">
          <ChevronRight className="rotate-180" size={20} /> <span className="text-sm font-medium">Explore</span>
        </button>
        <div className="text-center">
          <h2 className="text-4xl font-light tracking-tighter text-white">Voice Circles</h2>
          <p className="text-vox-paper/40 text-[10px] uppercase tracking-[0.3em] font-bold mt-2">Anonymous shared presence</p>
        </div>
        <div className="w-20" />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 relative z-10">
        <button 
          onClick={() => setMode('presence')}
          className={`glass-dark p-10 rounded-[3rem] border transition-all text-left group ${mode === 'presence' ? 'border-vox-accent bg-vox-accent/5' : 'border-white/5 opacity-60 hover:opacity-100'}`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${mode === 'presence' ? 'bg-vox-accent text-vox-bg' : 'bg-white/5 text-vox-accent'}`}>
            <Wind size={28} />
          </div>
          <h3 className="text-2xl font-serif text-white mb-2">Presence Circle</h3>
          <p className="text-vox-paper/40 text-xs italic font-serif">Silent shared meditation. Ghost mode active.</p>
        </button>

        <button 
          onClick={() => setMode('active')}
          className={`glass-dark p-10 rounded-[3rem] border transition-all text-left group ${mode === 'active' ? 'border-vox-accent bg-vox-accent/5' : 'border-white/5 opacity-60 hover:opacity-100'}`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${mode === 'active' ? 'bg-vox-accent text-vox-bg' : 'bg-white/5 text-vox-accent'}`}>
            <Volume2 size={28} />
          </div>
          <h3 className="text-2xl font-serif text-white mb-2">Voice Circle</h3>
          <p className="text-vox-paper/40 text-xs italic font-serif">Anonymous verbal expression and support.</p>
        </button>
      </div>

      <div className="glass-dark p-12 rounded-[4rem] border border-white/5 relative z-10 overflow-hidden min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 vox-gradient opacity-5 animate-pulse" />
        <div className="flex gap-4 mb-12">
          {[1, 2, 3, 4, 5].map((speaker) => (
            <motion.div 
              key={speaker}
              animate={mode === 'active' ? { height: [20, 60, 30, 80, 20] } : { height: [40, 42, 40] }}
              transition={{ repeat: Infinity, duration: 1 + speaker * 0.2, ease: "easeInOut" }}
              className="w-2 bg-vox-accent/20 rounded-full"
            />
          ))}
        </div>
        <h3 className="text-3xl font-serif text-white mb-6">{mode === 'presence' ? 'You are in Ghost Mode' : 'Connected to Sanctuary'}</h3>
        <p className="text-vox-paper/50 max-w-sm mx-auto mb-10 leading-relaxed font-serif italic">
          {mode === 'presence' ? "Shared silence with 12 others. Your presence is valued." : "Voice waves active. You are anonymous. Speak when you feel ready."}
        </p>
        <button className="px-12 py-5 bg-white/5 hover:bg-white/10 rounded-full font-bold text-sm tracking-widest uppercase transition-all">
          {mode === 'presence' ? 'Leave Circle' : 'Start Speaking'}
        </button>
      </div>
    </div>
  );
};



const EchoChamber = ({ onBack, user, safePlayPCM }: { onBack: () => void, user: User, safePlayPCM: (b: string, s?: number, o?: () => void) => Promise<any> }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const playNote = async (note: VoiceNote) => {
    if (!note.audioData) {
      alert("No audio data available for this note.");
      return;
    }
    
    // Echo complete
    
    if (playingId === note.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setPlayingId(note.id);

    try {
      if (note.type === 'companion') {
        // Play raw PCM audio using utility
        await safePlayPCM(note.audioData, 24000, () => setPlayingId(null));
      } else {
        // Play recorded audio using HTMLAudioElement
        const src = note.audioData.startsWith('data:') ? note.audioData : `data:audio/webm;base64,${note.audioData}`;
        audioRef.current = new Audio(src);
        audioRef.current.play();
        
        audioRef.current.onended = () => {
          setPlayingId(null);
        };
      }
    } catch (err) {
      console.error("Playback failed:", err);
      alert("Could not play this recording.");
      setPlayingId(null);
    }
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <div className="min-h-screen p-6 pt-24 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-12">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
          <ChevronRight className="rotate-180" size={20} /> Dashboard
        </button>
        <h2 className="text-4xl font-light tracking-tighter">Echo Chamber</h2>
      </header>

      <div className="space-y-8">
        <div className="glass-dark p-12 rounded-[3rem] border border-white/5">
          <h3 className="text-2xl font-light tracking-tighter mb-10">Your Growth Proof</h3>
          
          <div className="space-y-4">
            {user.voiceNotes.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[2rem]">
                <p className="text-vox-paper/30 font-serif italic">Your silence is waiting to be filled with strength.</p>
                <p className="text-[10px] uppercase tracking-widest text-vox-paper/20 mt-4">No recordings yet</p>
              </div>
            ) : (
              user.voiceNotes.map((note) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={note.id} 
                  className={`glass p-6 rounded-3xl border transition-all group ${playingId === note.id ? 'border-vox-accent bg-vox-accent/5 shadow-lg shadow-vox-accent/10' : 'border-white/5 hover:border-vox-accent/30'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                        note.type === 'breath' ? 'bg-blue-500/10 text-blue-400' :
                        note.type === 'whisper' ? 'bg-vox-accent/10 text-vox-accent' :
                        note.type === 'companion' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {note.type === 'breath' ? <Wind size={28} /> : 
                         note.type === 'whisper' ? <Mic size={28} /> : 
                         note.type === 'companion' ? <Sparkles size={28} /> : 
                         <Activity size={28} />}
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-widest text-vox-paper/40 mb-1 font-bold">{note.type}</div>
                        <div className="text-2xl font-light tracking-tighter">
                          {note.type === 'companion' ? 'Saved Insight' : new Date(note.timestamp).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {note.audioData && (
                        <button 
                          onClick={() => playNote(note)}
                          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${playingId === note.id ? 'bg-vox-accent text-vox-bg scale-110' : 'bg-white/5 hover:bg-vox-accent hover:text-vox-bg group-hover:scale-110'}`}
                        >
                          {playingId === note.id ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {playingId === note.id && (
                    <div className="flex items-end gap-1 h-8 mb-4 px-2">
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [4, Math.random() * 24 + 4, 4] }}
                          transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.5 }}
                          className="flex-1 bg-vox-accent rounded-full"
                        />
                      ))}
                    </div>
                  )}

                  <div className="pl-22">
                    {note.text && (
                      <p className="text-vox-paper/60 text-sm italic mb-3 leading-relaxed">"{note.text}"</p>
                    )}
                    <div className="text-xs text-vox-paper/30">
                      {note.type !== 'companion' && `${formatTime(note.duration)} duration • `}
                      {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
        
        <div className="p-10 rounded-[3rem] bg-vox-accent/5 border border-vox-accent/10 text-center">
          <p className="text-vox-paper/60 font-serif italic text-lg leading-relaxed">
            "Can you hear it? Your breath is deeper. Your words are clearer. You are stronger than you were."
          </p>
        </div>
      </div>
    </div>
  );
};

const ExitRitual = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-12"
      >
        <DoorOpen size={80} className="text-emerald-400 mx-auto" />
      </motion.div>
      
      <h2 className="text-5xl mb-6">The Beautiful Goodbye</h2>
      <p className="text-vox-paper/70 font-serif italic text-xl mb-12 leading-relaxed">
        VOXARA was built to be a bridge, not a destination. You've found your voice, and now it's time to use it in the real world.
      </p>

      <div className="glass-dark p-8 rounded-3xl mb-12 w-full">
        <h4 className="text-sm uppercase tracking-widest text-vox-paper/40 mb-6">Your Journey Summary</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-mono mb-1">142</div>
            <div className="text-[10px] uppercase tracking-widest text-vox-paper/30">Whispers</div>
          </div>
          <div>
            <div className="text-2xl font-mono mb-1">85%</div>
            <div className="text-[10px] uppercase tracking-widest text-vox-paper/30">Courage</div>
          </div>
          <div>
            <div className="text-2xl font-mono mb-1">12</div>
            <div className="text-[10px] uppercase tracking-widest text-vox-paper/30">Bridges</div>
          </div>
        </div>
      </div>

      <div className="space-y-4 w-full">
        <button 
          onClick={onBack}
          className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
        >
          Celebrate & Step Away
        </button>
        <button className="w-full py-4 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-all" onClick={onBack}>I'm Not Quite Ready</button>
      </div>
    </div>
  );
};

const CourageConnections = ({ onBack, user }: { onBack: () => void, user: User }) => {
  const [partners, setPartners] = useState<any[]>([]);
  const [sentSignals, setSentSignals] = useState<string[]>([]);
  const [recentSignals, setRecentSignals] = useState<any[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        userId: user.id,
        userName: user.name
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'user_list') {
          // Filter out current user and map to partner format
          const otherUsers = message.users
            .filter((u: any) => u.id !== user.id)
            .map((u: any) => ({
              id: u.id,
              name: u.name,
              level: Math.floor(Math.random() * 40) + 30,
              journey: "Courage Seeker",
              status: "online",
              sharedWins: Math.floor(Math.random() * 10)
            }));
          
          // Add some mock offline partners if list is short
          if (otherUsers.length < 3) {
            const mocks = [
              { id: 'm1', name: "Elena", level: 72, journey: "Public Speaking", status: "offline", sharedWins: 12 },
              { id: 'm2', name: "Marcus", level: 45, journey: "Setting Boundaries", status: "offline", sharedWins: 8 },
            ];
            setPartners([...otherUsers, ...mocks]);
          } else {
            setPartners(otherUsers);
          }
        }
        if (message.type === 'signal_received') {
          // If it's for everyone or specifically for me
          if (!message.toId || message.toId === user.id) {
            setRecentSignals(prev => [{
              id: Date.now(),
              fromName: message.fromName,
              timestamp: message.timestamp
            }, ...prev].slice(0, 5));
          }
        }
      } catch (e) {
        console.error("Socket message error:", e);
      }
    };

    return () => socket.close();
  }, [user.id, user.name]);

  const sendSignal = (targetId: string) => {
    if (sentSignals.includes(targetId)) return;
    setSentSignals([...sentSignals, targetId]);
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'signal',
        fromId: user.id,
        fromName: user.name,
        toId: targetId
      }));
    }
  };

  return (
    <div className="min-h-screen p-6 pt-24 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-16">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
          <ChevronRight className="rotate-180" size={20} /> Dashboard
        </button>
        <div className="text-right">
          <h2 className="text-4xl font-light tracking-tighter">Courage Circles</h2>
          <p className="text-vox-paper/40 text-xs uppercase tracking-widest mt-1">Real-world connections</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
            <h3 className="text-2xl font-light tracking-tighter mb-8">Partners in Courage</h3>
            <div className="space-y-4">
              {partners.map(p => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-vox-accent/30 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-2xl font-bold border border-white/10">
                        {p.name[0]}
                      </div>
                      {p.status === 'online' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-vox-bg" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xl font-medium">{p.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-vox-accent/10 text-vox-accent font-bold uppercase tracking-tighter">
                          Level {p.level}
                        </span>
                      </div>
                      <div className="text-sm text-vox-paper/40 italic font-serif">Journey: {p.journey}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-lg font-mono">{p.sharedWins}</div>
                      <div className="text-[8px] uppercase tracking-widest text-vox-paper/30">Shared Wins</div>
                    </div>
                    <button 
                      onClick={() => sendSignal(p.id)}
                      disabled={sentSignals.includes(p.id)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${sentSignals.includes(p.id) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-vox-accent/10 text-vox-accent hover:bg-vox-accent hover:text-vox-bg'}`}
                    >
                      {sentSignals.includes(p.id) ? <Zap size={20} /> : <Handshake size={20} />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-dark p-8 rounded-[3rem] border border-white/5 bg-vox-accent/5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-vox-accent mb-6">Shared Momentum</h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-vox-paper/60">Community Strength</span>
                <span className="text-lg font-mono">84%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '84%' }}
                  className="h-full bg-vox-accent"
                />
              </div>
              <p className="text-xs text-vox-paper/40 leading-relaxed italic font-serif">
                "You are not walking this path alone. 1,242 souls are building their courage alongside you today."
              </p>
            </div>
          </div>

          <div className="glass-dark p-8 rounded-[3rem] border border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-vox-paper/30 mb-6">Recent Signals</h4>
            <div className="space-y-4">
              {recentSignals.length === 0 ? (
                <p className="text-xs text-vox-paper/20 italic">Waiting for signals of strength...</p>
              ) : (
                recentSignals.map(signal => (
                  <motion.div 
                    key={signal.id} 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 text-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <Zap size={14} />
                    </div>
                    <p className="text-vox-paper/60">
                      <span className="text-vox-paper font-bold">{signal.fromName}</span> sent you a Strength Signal.
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const SettingsView = ({ onBack, user, setUser, safePlayPCM }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, safePlayPCM: any }) => {
  const [safeWord, setSafeWord] = useState(user.safeWord);
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [goals, setGoals] = useState<UserGoal[]>(user.goals || []);
  const [locationEnabled, setLocationEnabled] = useState(user.locationEnabled || false);
  const [newGoal, setNewGoal] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [apiStatus, setApiStatus] = useState<'idle' | 'busy' | 'error' | 'retry'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleStatusChange = (e: any) => {
      const { status, delay } = e.detail;
      setApiStatus(status);
      if (status === 'idle') setErrorMessage(null);
      
      if (status === 'retry' && delay) {
        setCountdown(Math.round(delay / 1000));
        timer = setInterval(() => {
          setCountdown(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
        }, 1000);
      } else {
        setCountdown(null);
        if (timer) clearInterval(timer);
      }
    };
    window.addEventListener('gemini-api-status', handleStatusChange);
    return () => {
      window.removeEventListener('gemini-api-status', handleStatusChange);
      if (timer) clearInterval(timer);
    };
  }, []);

  const handleSave = () => {
    setUser(prev => prev ? ({ ...prev, safeWord, bio, location, goals, locationEnabled }) : null);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const addGoal = () => {
    if (!newGoal.trim()) return;
    const goal: UserGoal = {
      id: Math.random().toString(36).substr(2, 9),
      text: newGoal,
      completed: false,
      category: 'courage'
    };
    setGoals([...goals, goal]);
    setNewGoal('');
  };

  const toggleGoal = (id: string) => {
    setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 relative overflow-y-auto pt-24 pb-32">
      <div className="absolute inset-0 vox-gradient opacity-30 fixed" />
      
      <button onClick={onBack} className="absolute top-10 left-10 z-20 flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
        <ChevronRight className="rotate-180" size={20} /> Dashboard
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-dark p-12 rounded-[4rem] w-full max-w-3xl border border-white/5 relative z-10"
      >
        <div className="flex items-center gap-4 mb-12">
          <div className="w-16 h-16 rounded-2xl bg-vox-accent/20 flex items-center justify-center border border-vox-accent/30">
            <Settings size={32} className="text-vox-accent" />
          </div>
          <div>
            <h2 className="text-5xl font-light tracking-tighter">Sanctuary Settings</h2>
            <p className="text-vox-paper/40 font-serif italic">Configure your safe space & journey</p>
          </div>
        </div>

        <div className="space-y-16">
          {/* Profile Section */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <UserIcon size={16} className="text-vox-accent" />
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-vox-accent">Your Profile</h3>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-vox-paper/40 mb-2">Bio / Personal Note</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-vox-accent transition-colors h-24 resize-none"
                  placeholder="Tell us about your journey..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-vox-paper/40 mb-2">Location (Optional)</label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-vox-accent transition-colors"
                  placeholder="e.g. London, UK"
                />
              </div>
            </div>
          </section>

          {/* Goals Section */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={16} className="text-vox-accent" />
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-vox-accent">Courage Goals</h3>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-vox-accent transition-colors"
                  placeholder="Add a new goal..."
                />
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(45, 212, 191, 0.9)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addGoal}
                  className="px-6 bg-vox-accent text-vox-bg rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Add
                </motion.button>
              </div>
              <div className="space-y-2">
                {goals.map(goal => (
                  <motion.div 
                    key={goal.id} 
                    whileHover={{ x: 4, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group"
                  >
                    <div className="flex items-center gap-4">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleGoal(goal.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${goal.completed ? 'bg-vox-accent border-vox-accent text-vox-bg' : 'border-white/20'}`}
                      >
                        {goal.completed && <CheckCircle2 size={14} />}
                      </motion.button>
                      <span className={`text-sm ${goal.completed ? 'text-vox-paper/30 line-through' : 'text-vox-paper'}`}>{goal.text}</span>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.2, color: "rgb(248, 113, 113)" }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => removeGoal(goal.id)}
                      className="text-vox-paper/20 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={16} />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Emergency Protocol */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Shield size={16} className="text-vox-accent" />
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-vox-accent">Emergency Protocol</h3>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${locationEnabled ? 'bg-vox-accent/20 text-vox-accent' : 'bg-white/5 text-vox-paper/20'}`}>
                    <Navigation size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest">Location Sharing</h4>
                    <p className="text-[10px] text-vox-paper/40 mt-1 italic font-serif">Share coordinates during critical events</p>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLocationEnabled(!locationEnabled)}
                  className={`w-14 h-7 rounded-full relative transition-all ${locationEnabled ? 'bg-vox-accent' : 'bg-white/10'}`}
                >
                  <motion.div 
                    animate={{ x: locationEnabled ? 32 : 4 }}
                    className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg"
                  />
                </motion.button>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] uppercase tracking-widest text-vox-paper/40 mb-2">Safe Word</label>
                <input 
                  type="text" 
                  value={safeWord}
                  onChange={(e) => setSafeWord(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl focus:outline-none focus:border-vox-accent transition-colors"
                  placeholder="Enter your safe word..."
                />
                <p className="text-xs text-vox-paper/30 leading-relaxed italic font-serif">
                  Speaking this word during any practice will immediately trigger the emergency grounding sequence.
                </p>
              </div>
            </div>
          </section>

          {/* Diagnostics Section */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Activity size={16} className="text-vox-accent" />
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-vox-accent">Diagnostics & Status</h3>
            </div>
            
            <div className="space-y-6">
              {/* API Status Info */}
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      apiStatus === 'idle' ? 'bg-emerald-500' :
                      apiStatus === 'busy' ? 'bg-blue-500 animate-pulse' :
                      apiStatus === 'retry' ? 'bg-amber-500 animate-pulse' :
                      'bg-red-500'
                    }`} />
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-70">
                      Gemini API: {
                        apiStatus === 'idle' ? 'Ready' :
                        apiStatus === 'busy' ? 'Processing' :
                        apiStatus === 'retry' ? `Rate Limited (Retrying in ${countdown}s)` :
                        'Connection Error'
                      }
                    </span>
                  </div>
                  {apiStatus === 'retry' && (
                    <span className="text-[10px] text-amber-500 italic font-serif">Cooldown active...</span>
                  )}
                </div>
                
                <p className="text-[10px] text-vox-paper/40 leading-relaxed italic font-serif">
                  The "Too Many Requests (429)" error is a temporary limit from Google's servers. 
                  VOXARA automatically retries these requests with a delay to ensure your experience remains stable.
                </p>

                <div className="pt-2 border-t border-white/5 flex flex-wrap gap-4">
                  <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 text-[10px] text-vox-accent hover:text-vox-accent/80 transition-colors uppercase tracking-widest font-bold"
                  >
                    <RotateCcw size={12} />
                    Sync Application
                  </button>
                  <button 
                    onClick={() => {
                      resetApiState();
                      setErrorMessage(null);
                    }}
                    className="flex items-center gap-2 text-[10px] text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-widest font-bold"
                  >
                    <Zap size={12} />
                    Reset AI Connection
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  disabled={apiStatus !== 'idle'}
                  onClick={async () => {
                    try {
                      const testText = "Testing audio sanctuary. If you hear this, your voice companion is ready.";
                      console.log("Settings: Testing audio...");
                      setErrorMessage(null);
                      const audio = await generateSpeech(testText);
                      if (audio) {
                        await safePlayPCM(audio);
                      } else {
                        console.error("Settings: Failed to generate test audio");
                      }
                    } catch (err: any) {
                      setErrorMessage(err.message || "Failed to test audio. Please try again.");
                    }
                  }}
                  className={`w-full glass p-6 rounded-2xl flex items-center justify-between transition-all border border-white/10 group ${
                    apiStatus === 'retry' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                    apiStatus === 'busy' ? 'bg-vox-accent/10 border-vox-accent/30 text-vox-accent' :
                    apiStatus === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                    'hover:bg-white/5'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                      apiStatus === 'retry' ? 'bg-amber-500/20' :
                      apiStatus === 'busy' ? 'bg-vox-accent/20' :
                      apiStatus === 'error' ? 'bg-red-500/20' :
                      'bg-vox-accent/20 text-vox-accent'
                    }`}>
                      {apiStatus === 'busy' ? <Loader2 className="animate-spin" size={24} /> :
                       apiStatus === 'retry' ? <RefreshCw className="animate-spin" size={24} /> :
                       <Volume2 size={24} />}
                    </div>
                    <div className="text-left">
                      <div className="text-vox-paper font-bold uppercase tracking-widest text-sm">
                        {apiStatus === 'busy' ? 'Connecting...' :
                         apiStatus === 'retry' ? `Retrying in ${countdown}s...` :
                         'Test AI Voice'}
                      </div>
                      <div className="text-vox-paper/40 text-[10px] italic font-serif mt-1">
                        {apiStatus === 'retry' ? 'Gemini is busy, waiting to retry...' :
                         "Verify your companion's voice connection"}
                      </div>
                    </div>
                  </div>
                  {apiStatus === 'idle' ? (
                    <Play size={20} className="text-vox-accent opacity-50 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-5 h-5" />
                  )}
                </button>

                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] text-red-400 italic font-serif leading-relaxed"
                  >
                    {errorMessage}
                  </motion.div>
                )}
              </div>
            </div>
          </section>

          <motion.button 
            whileHover={{ scale: 1.02, backgroundColor: isSaved ? "rgb(16, 185, 129)" : "rgba(45, 212, 191, 0.9)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className={`w-full py-6 rounded-2xl font-bold text-xs uppercase tracking-[0.4em] transition-all shadow-xl ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-vox-accent text-vox-bg shadow-vox-accent/20'}`}
          >
            {isSaved ? 'Sanctuary Updated' : 'Save Changes'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

const Affirmations = ({ onBack, user, setUser }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setRecordedAudio(reader.result as string);
        };
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic access error:", err);
      setMicError(err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' 
        ? "No microphone found. Please connect a device and try again." 
        : "Microphone access denied. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const saveAffirmation = () => {
    if (!recordedAudio) return;
    setIsSaving(true);
    const newNote: VoiceNote = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      duration: 0,
      type: 'voice',
      isPrivate: true,
      text: "Daily Affirmation",
      audioData: recordedAudio
    };
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        voiceNotes: [newNote, ...(prev.voiceNotes || [])]
      };
    });
    setRecordedAudio(null);
    setIsSaving(false);
  };

  const playAffirmation = (note: VoiceNote) => {
    if (playingId === note.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const src = note.audioData?.startsWith('data:') ? note.audioData : `data:audio/webm;base64,${note.audioData}`;
    audioRef.current = new Audio(src);
    audioRef.current.play();
    setPlayingId(note.id);
    audioRef.current.onended = () => setPlayingId(null);
  };

  const affirmations = user.voiceNotes.filter(n => n.text === "Daily Affirmation");

  return (
    <div className="min-h-screen p-6 pt-24 max-w-4xl mx-auto flex flex-col items-center">
      <div className="absolute inset-0 vox-gradient opacity-30 fixed" />
      <button onClick={onBack} className="absolute top-10 left-10 z-20 flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
        <ChevronRight className="rotate-180" size={20} /> Dashboard
      </button>

      <div className="text-center mb-16 relative z-10">
        <div className="w-24 h-24 rounded-[2.5rem] bg-vox-accent/10 flex items-center justify-center mx-auto mb-8 border border-vox-accent/20">
          <Quote size={40} className="text-vox-accent" />
        </div>
        <h2 className="text-6xl font-light tracking-tighter mb-4">Daily Affirmations</h2>
        <p className="text-vox-paper/40 font-serif italic text-xl">"Your voice is the most powerful tool for your own healing."</p>
      </div>

      <div className="w-full space-y-12 relative z-10">
        <div className="glass-dark rounded-[3rem] p-12 border border-white/5 flex flex-col items-center gap-8">
          <div className="text-center">
            <h3 className="text-2xl mb-2">Record a New Affirmation</h3>
            <p className="text-vox-paper/40 text-sm">Speak your truth with confidence and strength.</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(45, 212, 191, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-vox-accent text-vox-bg'}`}
          >
            {isRecording ? <Square size={32} fill="white" /> : <Mic size={32} />}
          </motion.button>

          {micError && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-3"
            >
              <AlertCircle size={16} />
              {micError}
            </motion.div>
          )}

          {recordedAudio && !isRecording && (
            <div className="flex gap-4 w-full max-w-xs">
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: "rgba(45, 212, 191, 0.9)" }}
                whileTap={{ scale: 0.95 }}
                onClick={saveAffirmation}
                disabled={isSaving}
                className="flex-1 py-4 bg-vox-accent text-vox-bg rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
              >
                {isSaving ? "Saving..." : "Save Affirmation"}
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setRecordedAudio(null)}
                className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
              >
                Discard
              </motion.button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-vox-paper/30 ml-4">Your Recorded Affirmations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {affirmations.length === 0 ? (
              <div className="col-span-full py-12 text-center text-vox-paper/20 italic glass-dark rounded-3xl border border-white/5">
                No affirmations recorded yet.
              </div>
            ) : (
              affirmations.map(note => (
                <motion.div 
                  key={note.id} 
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                  className="glass-dark p-6 rounded-3xl border border-white/5 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-vox-accent/10 flex items-center justify-center">
                      <Quote size={20} className="text-vox-accent" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Affirmation</div>
                      <div className="text-[10px] text-vox-paper/30 uppercase tracking-widest">
                        {new Date(note.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => playAffirmation(note)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${playingId === note.id ? 'bg-vox-accent text-vox-bg' : 'bg-white/5 hover:bg-white/10'}`}
                  >
                    {playingId === note.id ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
                  </motion.button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Meditations = ({ onBack, safePlayPCM }: { onBack: () => void, safePlayPCM: any }) => {
  const [activeMeditation, setActiveMeditation] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const meditationList = [
    { 
      id: 'courage-1', 
      title: 'The Inner Lion', 
      theme: 'Courage', 
      duration: '5 min', 
      desc: 'A powerful visualization to awaken your latent strength and confidence.',
      script: 'Find a comfortable position. Close your eyes. Imagine a golden light at your center. This is your courage. With every breath, it grows stronger. You are a lion, calm and powerful. You face the world with a steady heart.'
    },
    { 
      id: 'calm-1', 
      title: 'Ocean Breath', 
      theme: 'Calm', 
      duration: '10 min', 
      desc: 'Synchronize your breath with the rhythm of the tides to release anxiety.',
      script: 'Breathe in deeply, like a rising wave. Hold for a moment at the peak. Now exhale slowly, like the tide receding. Feel the tension leaving your body with the water. You are the ocean, vast and peaceful.'
    },
    { 
      id: 'wellbeing-1', 
      title: 'Sanctuary of Self', 
      theme: 'Well-being', 
      duration: '7 min', 
      desc: 'Build a mental sanctuary where you are always safe and cherished.',
      script: 'Imagine a beautiful garden. This is your sanctuary. The air is warm and filled with the scent of pine. Here, you are safe. Here, you are enough. Take a moment to simply be in this space of pure well-being.'
    },
    {
      id: 'courage-2',
      title: 'The Mountain Stand',
      theme: 'Resilience',
      duration: '8 min',
      desc: 'Stand firm against the winds of change and uncertainty.',
      script: 'Visualize yourself as a great mountain. Clouds may pass, storms may rage, but you remain unmoved. Your roots go deep into the earth. You are solid. You are enduring. You are resilient.'
    }
  ];

  const startMeditation = async (meditation: any) => {
    setActiveMeditation(meditation);
    setIsLoading(true);
    setIsPlaying(true);
    
    try {
      const audioBase64 = await generateSpeech(meditation.script);
      if (audioBase64) {
        await safePlayPCM(audioBase64, 24000, () => {
          setIsPlaying(false);
          setActiveMeditation(null);
        });
      }
    } catch (err) {
      console.error("Meditation audio error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const stopMeditation = () => {
    setIsPlaying(false);
    setActiveMeditation(null);
    // safePlayPCM already handles stopping previous audio
  };

  return (
    <div className="min-h-screen p-6 pt-24 max-w-5xl mx-auto">
      <div className="absolute inset-0 vox-gradient opacity-30 fixed" />
      <button onClick={onBack} className="absolute top-10 left-10 z-20 flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
        <ChevronRight className="rotate-180" size={20} /> Dashboard
      </button>

      <div className="text-center mb-16 relative z-10">
        <div className="w-24 h-24 rounded-[2.5rem] bg-vox-accent/10 flex items-center justify-center mx-auto mb-8 border border-vox-accent/20">
          <Wind size={40} className="text-vox-accent" />
        </div>
        <h2 className="text-6xl font-light tracking-tighter mb-4">Guided Meditations</h2>
        <p className="text-vox-paper/40 font-serif italic text-xl">"In the stillness, we find the courage to be."</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {meditationList.map(m => (
          <motion.div 
            key={m.id} 
            whileHover={{ scale: 1.02, y: -5, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
            className="glass-dark rounded-[3rem] p-10 border border-white/5 flex flex-col justify-between group hover:border-vox-accent/30 transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="text-[10px] uppercase tracking-widest font-bold text-vox-accent px-3 py-1 bg-vox-accent/10 rounded-full">
                  {m.theme}
                </div>
                <div className="text-vox-paper/30 text-xs font-mono">{m.duration}</div>
              </div>
              <h3 className="text-3xl font-serif italic mb-4 group-hover:text-vox-accent transition-colors">{m.title}</h3>
              <p className="text-vox-paper/50 text-sm leading-relaxed mb-8">{m.desc}</p>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: activeMeditation?.id === m.id ? "rgb(220, 38, 38)" : "rgba(45, 212, 191, 0.9)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => activeMeditation?.id === m.id ? stopMeditation() : startMeditation(m)}
              disabled={isLoading}
              className={`w-full py-5 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${activeMeditation?.id === m.id ? 'bg-red-500 text-white' : 'bg-vox-accent text-vox-bg shadow-lg shadow-vox-accent/20'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading && activeMeditation?.id === m.id ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-vox-bg/30 border-t-vox-bg rounded-full"
                />
              ) : activeMeditation?.id === m.id ? (
                <><Square size={16} fill="currentColor" /> Stop Meditation</>
              ) : (
                <><Play size={16} fill="currentColor" className="ml-1" /> Begin Session</>
              )}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {activeMeditation && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 glass-dark px-12 py-6 rounded-full border border-vox-accent/30 flex items-center gap-8 z-50 shadow-2xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-vox-accent/20 flex items-center justify-center">
              <Wind size={20} className="text-vox-accent animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-vox-paper/40 font-bold">Now Playing</div>
              <div className="text-sm font-medium">{activeMeditation.title}</div>
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <button onClick={stopMeditation} className="text-vox-paper/50 hover:text-red-400 transition-colors">
            <X size={24} />
          </button>
        </motion.div>
      )}
    </div>
  );
};

const ApiStatusIndicator = () => {
  const [status, setStatus] = useState<'idle' | 'busy' | 'error' | 'retry'>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleStatus = (e: any) => {
      const { status: newStatus, delay } = e.detail;
      setStatus(newStatus);
      
      if (newStatus === 'retry' && delay) {
        setCountdown(Math.round(delay / 1000));
        timer = setInterval(() => {
          setCountdown(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
        }, 1000);
      } else {
        setCountdown(null);
        if (timer) clearInterval(timer);
      }
    };
    window.addEventListener('gemini-api-status', handleStatus);
    return () => {
      window.removeEventListener('gemini-api-status', handleStatus);
      if (timer) clearInterval(timer);
    };
  }, []);

  if (status === 'idle') return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-2 rounded-full glass-dark border border-white/10 shadow-2xl"
    >
      <div className={`w-2 h-2 rounded-full animate-pulse ${
        status === 'busy' ? 'bg-blue-400' : 
        status === 'retry' ? 'bg-yellow-400' : 
        'bg-red-400'
      }`} />
      <span className="text-[10px] uppercase tracking-widest font-bold text-vox-paper/70">
        {status === 'busy' ? 'AI Processing...' : 
         status === 'retry' ? `Rate Limit (Retrying in ${countdown}s...)` : 
         'AI Connection Error'}
      </span>
    </motion.div>
  );
};

// Global helper to resume context on any click
// Now imported from audioUtils

const MirrorTalkView = ({ setView }: { setView: (v: AppState) => void }) => {
  const [isPracticing, setIsPracticing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPracticing && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isPracticing) {
      setIsPracticing(false);
    }
    return () => clearInterval(timer);
  }, [isPracticing, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-cream text-dark p-6 pt-12 md:p-16 flex flex-col justify-between max-w-4xl mx-auto">
      <button onClick={() => setView('dashboard')} className="self-start mb-12 flex items-center gap-2 text-muted hover:text-dark transition-colors font-medium">
        <ArrowLeft size={20} /> Back
      </button>

      {!isPracticing ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-serif text-dark mb-4 tracking-tight">Mirror Talk Challenge</h1>
            <p className="text-muted text-lg font-serif italic max-w-lg">Look in the mirror. Say the words out loud. Feel the discomfort, then let it pass.</p>
          </div>

          <div className="space-y-4 flex-1">
            {[
              "I am terrified, and that's okay.",
              "My voice shakes, but it is mine.",
              "I don't need to be perfect to be heard."
            ].map((prompt, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-border shadow-sm flex gap-6 items-center">
                <span className="text-vox-accent font-serif text-2xl opacity-50">{(i+1).toString().padStart(2, '0')}</span>
                <p className="text-dark font-medium text-lg">"{prompt}"</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <button 
              onClick={() => setIsPracticing(true)}
              className="w-full py-5 bg-dark text-cream rounded-[2rem] font-bold text-lg hover:opacity-90 transition-transform hover:scale-[1.01] flex items-center justify-center gap-3 shadow-2xl"
            >
              Start Exercise <Mic size={20} />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center">
          <div className="relative mb-16">
            <div className="absolute inset-0 bg-vox-accent/20 rounded-full blur-3xl animate-pulse" />
            <div className="w-48 h-48 rounded-full border border-vox-accent/30 bg-vox-accent/5 flex items-center justify-center relative">
              {[1, 2, 3].map(i => (
                <div key={i} className="absolute inset-0 rounded-full border border-vox-accent/20 animate-ping" style={{ animationDelay: `${i * 0.5}s`, animationDuration: '2s' }} />
              ))}
              <div className="w-24 h-24 rounded-full bg-vox-accent flex items-center justify-center shadow-[0_0_40px_rgba(45,107,74,0.4)]">
                <Mic size={40} className="text-white" />
              </div>
            </div>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-6xl font-mono font-bold text-dark mb-4">{formatTime(timeLeft)}</h2>
            <p className="text-muted text-xl font-serif italic mb-2">Keep going. You're doing great.</p>
            <p className="text-muted/60 text-sm">Say the prompts out loud while looking at yourself.</p>
          </div>

          <button 
            onClick={() => {
              setIsPracticing(false);
              setView('dashboard');
            }}
            className="px-10 py-4 border-2 border-border text-dark rounded-full font-bold hover:bg-border/20 transition-colors"
          >
            Finish Early
          </button>
        </motion.div>
      )}
    </div>
  );
};

const CommunityView = ({ setView }: { setView: (v: AppState) => void }) => {
  const peers = [
    { name: 'Sarah', status: 'Working on eye contact', avatar: 'S', color: 'bg-emerald-100 text-emerald-700' },
    { name: 'David', status: 'Completed a Whisper Ritual', avatar: 'D', color: 'bg-blue-100 text-blue-700' },
    { name: 'Priya', status: 'Practiced a live session', avatar: 'P', color: 'bg-purple-100 text-purple-700' },
    { name: 'Arjun', status: 'Set a new courage intention', avatar: 'A', color: 'bg-amber-100 text-amber-700' },
  ];

  return (
    <div className="min-h-screen bg-cream text-dark p-6 pt-12 md:p-16 max-w-3xl mx-auto">
      <button onClick={() => setView('explore')} className="mb-12 flex items-center gap-2 text-muted hover:text-dark transition-colors font-medium">
        <ArrowLeft size={20} /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl md:text-5xl font-serif text-dark mb-4 tracking-tight">Your Circle</h1>
        <p className="text-muted text-lg font-serif italic mb-12">Real people by your side to offer support.</p>

        <div className="space-y-4">
          {peers.map((peer, i) => (
            <motion.div 
              key={peer.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-5 rounded-[2rem] border border-border flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl ${peer.color}`}>
                  {peer.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-dark text-lg">{peer.name}</h3>
                  <p className="text-muted text-sm font-medium">{peer.status}</p>
                </div>
              </div>
              
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cream border border-vox-accent/30 text-vox-dark font-bold text-xs uppercase tracking-widest hover:bg-vox-accent/10 transition-colors">
                <Heart size={14} className="text-rose-500" /> Cheer
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const ExploreView = ({ setView }: { setView: (v: AppState) => void }) => {
  return (
    <div className="min-h-screen bg-cream text-dark p-6 pt-24 max-w-7xl mx-auto pb-32">
      <div className="absolute inset-0 vox-gradient opacity-30 fixed" />
      <div className="relative z-10">
        <header className="mb-10 text-center">
          <h2 className="text-4xl md:text-5xl font-serif text-dark mb-4">Explore Rituals</h2>
          <p className="text-muted text-lg font-serif italic">Discover new paths to healing and courage.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <FeatureCard 
            title="Mood Tracker"
            description="Log your daily feelings."
            icon={TrendingUp}
            label="Emotion"
            image="https://picsum.photos/seed/mood/800/600"
            accentColor="#facc15"
            onClick={() => setView('mood')}
          />
          <FeatureCard 
            title="Daily Rituals"
            description="Speak your strength."
            icon={Sparkles}
            label="Practice"
            image="https://picsum.photos/seed/ritual/800/600"
            accentColor="#10b981"
            onClick={() => setView('rituals')}
          />
          <FeatureCard 
            title="Calm Center"
            description="Guided exercises for anxiety."
            icon={Wind}
            label="Relief"
            image="https://picsum.photos/seed/calm/800/600"
            accentColor="#60a5fa"
            onClick={() => setView('calm')}
          />
          <FeatureCard 
            title="Journal"
            description="Private reflection space."
            icon={BookOpen}
            label="Reflection"
            image="https://picsum.photos/seed/journal/800/600"
            accentColor="#a855f7"
            onClick={() => setView('journal')}
          />
          <FeatureCard 
            title="AI Companion"
            description="Trauma-informed listening."
            icon={MessageSquare}
            label="Support"
            image="https://picsum.photos/seed/companion/800/600"
            accentColor="#3b82f6"
            onClick={() => setView('companion')}
          />
          <FeatureCard 
            title="Live Session"
            description="Real-time voice conversation."
            icon={Volume2}
            label="Real-time"
            image="https://picsum.photos/seed/live/800/600"
            accentColor="#f97316"
            onClick={() => setView('live')}
          />
          <FeatureCard 
            title="Daily Affirmations"
            description="Your voice, your healing library."
            icon={Mic}
            label="Vocal"
            image="https://picsum.photos/seed/affirm/800/600"
            accentColor="#2dd4bf"
            onClick={() => setView('affirmations')}
          />
          <FeatureCard 
            title="Courage Lab"
            description="Muscle memory for the soul."
            icon={Zap}
            label="Guidance"
            image="https://picsum.photos/seed/lab/800/600"
            accentColor="#f59e0b"
            onClick={() => setView('simulation')}
          />
          <FeatureCard 
            title="Voice Circles"
            description="Anonymous shared presence."
            icon={Users}
            label="Community"
            image="https://picsum.photos/seed/circles/800/600"
            accentColor="#f97316"
            onClick={() => setView('live')}
          />
          <FeatureCard 
            title="Echo Chamber"
            description="Your personal sanctuary of growth."
            icon={History}
            label="History"
            image="https://picsum.photos/seed/echo/800/600"
            accentColor="#a855f7"
            onClick={() => setView('echo')}
          />
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<AppState>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const currentAudioRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!process.env.GEMINI_API_KEY) {
      console.error("CRITICAL: GEMINI_API_KEY is missing from environment variables!");
    } else {
      console.log("GEMINI_API_KEY is present.");
    }
  }, []);

  const stopAllAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.stop();
      currentAudioRef.current = null;
    }
  };

  const safePlayPCM = async (base64Audio: string, sampleRate: number = 24000, onEnded?: () => void, volume: number = 1.0) => {
    stopAllAudio();
    const audio = await playPCM(base64Audio, sampleRate, onEnded, volume);
    if (audio) {
      currentAudioRef.current = audio;
    }
    return audio;
  };

  // Global audio cleanup on view change
  useEffect(() => {
    stopAllAudio();
  }, [view]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        // Try to fetch full data from Firestore first
        const storedData = await getUserData(firebaseUser.uid);
        
        let currentUserData = storedData;
        
        if (storedData) {
          setUser(storedData);
        } else {
          // If no data exists, create the initial basic data
          const basicUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Seeker',
            email: firebaseUser.email || '',
            courageLevel: 15,
            safeWord: 'Blue Spruce',
            voiceNotes: [],
            journalEntries: [],
            liveHistory: [],
            bio: '',
            goals: [],
            location: '',
            emergencyContacts: [],
            groups: [],
            courageHistory: [
              { timestamp: Date.now() - 86400000 * 4, level: 10, rejection: 20, conflict: 10, misunderstanding: 30, vulnerability: 5 },
              { timestamp: Date.now() - 86400000 * 3, level: 12, rejection: 25, conflict: 15, misunderstanding: 25, vulnerability: 10 },
              { timestamp: Date.now() - 86400000 * 2, level: 15, rejection: 22, conflict: 12, misunderstanding: 28, vulnerability: 15 },
              { timestamp: Date.now() - 86400000 * 1, level: 18, rejection: 30, conflict: 20, misunderstanding: 20, vulnerability: 25 },
              { timestamp: Date.now(), level: 20, rejection: 35, conflict: 25, misunderstanding: 15, vulnerability: 30 }
            ],
            locationEnabled: false,
            hasCompletedSafetyOnboarding: false,
            dailyRituals: [
              { id: 'r1', text: "It's okay to feel exactly as I do right now.", completed: false },
              { id: 'r2', text: "I am strong enough to carry this moment.", completed: false },
              { id: 'r3', text: "My voice has value, even when it shakes.", completed: false },
              { id: 'r4', text: "I am building courage, one breath at a time.", completed: false },
              { id: 'r5', text: "I am enough, exactly as I am.", completed: false }
            ],
            dailyRitualsCompleted: 0,
            dailyRitualsTotal: 5,
            streak: 1,
            moodHistory: []
          };
          setUser(basicUser);
          await saveUserData(firebaseUser.uid, basicUser);
          currentUserData = basicUser;
        }

        if (view === 'auth') {
          if (!currentUserData?.hasCompletedSafetyOnboarding) {
            setView('safety-onboarding');
          } else {
            setView('dashboard');
          }
        }
      } else {
        setUser(null);
        if (view !== 'landing' && view !== 'auth') {
          setView('auth');
        }
      }
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, [view]);

  // Auto-save user data whenever it changes
  useEffect(() => {
    if (user && user.id && !isUserLoading) {
      saveUserData(user.id, user);
      
      // Auto-exit if distress (fear) reaches 100% (Courage 0)
      if (user.courageLevel <= 0 && view !== 'emergency') {
        setView('emergency');
      }

      // Auto-exit if confidence reaches 100
      if (user.courageLevel >= 100 && view !== 'exit' && view !== 'anchor') {
        setView('exit');
      }

      // Discreet emergency notification if level is critical
      if (user.courageLevel <= 20 && user.emergencyContacts && user.emergencyContacts.length > 0) {
        // In a real app, this would trigger a server-side notification
        console.log("CRITICAL LEVEL REACHED: Notifying emergency contacts...", {
          contacts: user.emergencyContacts,
          location: user.locationEnabled ? user.location : 'Location sharing disabled'
        });
      }
    }
  }, [user, view]);

  const BottomNavigation = ({ currentView, setView }: { currentView: AppState, setView: (v: AppState) => void }) => {
    const navItems = [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
      { id: 'explore', icon: Compass, label: 'Explore' },
      { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
      <div className="md:hidden fixed bottom-6 left-6 right-6 z-[60] glass-premium rounded-full h-16 flex items-center justify-around px-4 shadow-2xl border border-white/20">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as AppState)}
            className={`flex flex-col items-center justify-center gap-1 transition-all ${
              currentView === item.id ? 'text-vox-accent scale-110' : 'text-muted/60 opacity-60'
            }`}
          >
            <item.icon size={20} />
            <span className="text-[8px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setView('emergency')}
          className="flex flex-col items-center justify-center gap-1 text-red-400 group"
        >
          <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center group-active:scale-95 transition-transform">
            <Shield size={18} />
          </div>
          <span className="text-[8px] font-bold uppercase tracking-widest">SOS</span>
        </button>
      </div>
    );
  };

  const pageTransition: any = {
    duration: 0.4,
    ease: "easeOut"
  };

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper" onClick={globalResumeAudioContext}>
      <ApiStatusIndicator />
      {/* Global Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-vox-accent/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div 
            key="landing" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <LandingPage onStart={() => setView(user ? 'dashboard' : 'auth')} isLoggedIn={!!user} />
          </motion.div>
        )}

        {view === 'auth' && (
          <motion.div 
            key="auth" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <AuthPage />
          </motion.div>
        )}

        {view === 'safety-onboarding' && user && (
          <motion.div 
            key="safety-onboarding" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <SafetyOnboarding user={user} setUser={setUser} onComplete={() => setView('dashboard')} />
          </motion.div>
        )}

        {view === 'dashboard' && user && (
          <motion.div 
            key="dashboard" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <Dashboard user={user} setView={setView} setUser={setUser} />
          </motion.div>
        )}

        {view === 'explore' && user && (
          <motion.div 
            key="explore" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <ExploreView setView={setView} />
          </motion.div>
        )}

        {view === 'simulation' && user && (
          <motion.div 
            key="simulation" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <CourageLab onBack={() => setView('explore')} user={user} setUser={setUser} />
          </motion.div>
        )}

        {view === 'affirmations' && user && (
          <motion.div 
            key="affirmations" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <DailyAffirmations onBack={() => setView('explore')} user={user} setUser={setUser} />
          </motion.div>
        )}

        {view === 'live' && user && (
          <motion.div 
            key="live" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <VoiceCirclesView onBack={() => setView('explore')} user={user} setUser={setUser} />
          </motion.div>
        )}

        {view === 'echo' && user && (
          <motion.div 
            key="echo" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <EchoChamber onBack={() => setView('explore')} user={user} safePlayPCM={safePlayPCM} />
          </motion.div>
        )}

        {view === 'presence' && (
          <motion.div 
            key="presence" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <PresenceMode onBack={() => { stopAllAudio(); setView('dashboard'); }} />
          </motion.div>
        )}

        {view === 'bridge' && (
          <motion.div 
            key="bridge" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <BelovedBridge onBack={() => { stopAllAudio(); setView('dashboard'); }} onExitToEmergency={() => setView('emergency')} safePlayPCM={safePlayPCM} stopAllAudio={stopAllAudio} />
          </motion.div>
        )}

        {view === 'emergency' && (
          <motion.div 
            key="emergency" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <EmergencyScreen onBack={() => setView('landing')} onReturn={() => setView('dashboard')} setUser={setUser} />
          </motion.div>
        )}


        {view === 'journal' && user && (
          <motion.div 
            key="journal" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <Journal onBack={() => setView('dashboard')} user={user} setUser={setUser} />
          </motion.div>
        )}

        {view === 'rituals' && user && (
          <motion.div 
            key="rituals" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <DailyRituals user={user} setUser={setUser} onBack={() => setView('dashboard')} />
          </motion.div>
        )}

        {view === 'calm' && (
          <motion.div 
            key="calm" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <CalmCenter onBack={() => setView('dashboard')} />
          </motion.div>
        )}


        {view === 'meditations' && (
          <motion.div 
            key="meditations" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <Meditations onBack={() => setView('dashboard')} safePlayPCM={safePlayPCM} />
          </motion.div>
        )}

        {view === 'mood' && user && (
          <motion.div 
            key="mood" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <MoodTracker user={user} setUser={setUser} onBack={() => setView('dashboard')} safePlayPCM={safePlayPCM} />
          </motion.div>
        )}

        {view === 'map' && user && (
          <motion.div 
            key="map" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <FearStrengthMap user={user} onBack={() => setView('dashboard')} />
          </motion.div>
        )}

        {view === 'circles' && user && (
          <motion.div 
            key="circles" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <VoiceCircles user={user} setUser={setUser} onBack={() => setView('dashboard')} />
          </motion.div>
        )}

        {view === 'connections' && user && (
          <motion.div 
            key="connections" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <CourageConnections user={user} onBack={() => setView('dashboard')} />
          </motion.div>
        )}

        {view === 'simulation' && user && (
          <motion.div 
            key="simulation" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <FearSimulation onBack={() => setView('dashboard')} user={user} setUser={setUser} />
          </motion.div>
        )}

        {view === 'exit' && (
          <motion.div 
            key="exit" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <ExitRitual onBack={() => setView('anchor')} />
          </motion.div>
        )}

        {view === 'anchor' && user && (
          <motion.div 
            key="anchor" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <AnchorMode onBack={() => setView('dashboard')} user={user} setUser={setUser} />
          </motion.div>
        )}

        {view === 'settings' && user && (
          <motion.div 
            key="settings" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <SettingsView onBack={() => setView('dashboard')} user={user} setUser={setUser} safePlayPCM={safePlayPCM} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Navigation - Premium Pill */}
      {user && view !== 'landing' && view !== 'auth' && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-premium px-4 py-3 rounded-full flex gap-3 z-[100] shadow-2xl border border-white/20">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
            { id: 'explore', icon: Compass, label: 'Explore' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((item) => (
            <motion.button 
              key={item.id}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setView(item.id as AppState)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all group ${view === item.id ? 'bg-vox-paper text-cream font-bold' : 'text-muted hover:bg-vox-accent/5'}`}
            >
              <item.icon size={18} />
              <span className={`text-[10px] font-bold tracking-widest uppercase overflow-hidden transition-all duration-300 ${view === item.id ? 'max-w-20' : 'max-w-0 opacity-0'}`}>
                {item.label}
              </span>
            </motion.button>
          ))}
          
          <div className="w-px h-6 bg-border/40 self-center mx-1" />
          
          <motion.button 
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setView('emergency')}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${view === 'emergency' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
          >
            <Shield size={20} />
          </motion.button>
        </nav>
      )}

      <ApiStatusIndicator />
    </div>
  );
}
