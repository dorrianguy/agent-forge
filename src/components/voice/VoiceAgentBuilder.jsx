/**
 * VoiceAgentBuilder - Multi-step wizard for creating voice AI agents
 * Features: 5-step wizard, animated transitions, 20 agent types, voice/LLM config
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, ChevronRight, ChevronLeft, Check, Sparkles,
  MessageSquare, ShoppingCart, Heart, DollarSign, Coffee,
  Headphones, TrendingUp, Users, Calendar, BookOpen,
  Shield, Briefcase, Home, Plane, Utensils, Music,
  Zap, Globe, Clock, Volume2, Settings, Rocket,
  AlertCircle, X, Key, ExternalLink, Eye, EyeOff,
  Thermometer, Languages, MessageCircle, Hash, PhoneForwarded,
  Play, Square, Webhook, Plus, Trash2
} from 'lucide-react';

// Animation variants from AgentForgeDashboard
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
};

const slideInRight = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 }
};

// Agent type categories and templates
const AGENT_CATEGORIES = {
  'Customer Service': [
    { id: 'support', name: 'Customer Support', icon: Headphones, description: 'Handle inquiries and troubleshooting' },
    { id: 'helpdesk', name: 'IT Helpdesk', icon: Settings, description: 'Technical support and IT assistance' },
    { id: 'returns', name: 'Returns & Refunds', icon: ShoppingCart, description: 'Process returns and refund requests' },
    { id: 'onboarding', name: 'Customer Onboarding', icon: Users, description: 'Guide new customers through setup' }
  ],
  'Sales': [
    { id: 'lead-qualify', name: 'Lead Qualification', icon: TrendingUp, description: 'Qualify and score incoming leads' },
    { id: 'appointment', name: 'Appointment Setter', icon: Calendar, description: 'Schedule sales calls and demos' },
    { id: 'outbound', name: 'Outbound Sales', icon: Phone, description: 'Proactive sales outreach calls' },
    { id: 'upsell', name: 'Upsell Assistant', icon: DollarSign, description: 'Identify upsell opportunities' }
  ],
  'Healthcare': [
    { id: 'appointment-medical', name: 'Medical Scheduler', icon: Calendar, description: 'Book and manage appointments' },
    { id: 'reminder', name: 'Appointment Reminders', icon: AlertCircle, description: 'Send automated reminders' },
    { id: 'intake', name: 'Patient Intake', icon: BookOpen, description: 'Collect patient information' },
    { id: 'prescription', name: 'Prescription Refills', icon: Heart, description: 'Handle refill requests' }
  ],
  'Financial': [
    { id: 'billing', name: 'Billing Support', icon: DollarSign, description: 'Handle billing inquiries' },
    { id: 'collections', name: 'Collections', icon: Briefcase, description: 'Payment collection and follow-up' },
    { id: 'fraud', name: 'Fraud Detection', icon: Shield, description: 'Alert and verify suspicious activity' },
    { id: 'advisor', name: 'Financial Advisor', icon: TrendingUp, description: 'Provide financial guidance' }
  ],
  'Hospitality': [
    { id: 'reservations', name: 'Reservations', icon: Calendar, description: 'Book tables and rooms' },
    { id: 'concierge', name: 'Virtual Concierge', icon: Coffee, description: 'Provide guest assistance' },
    { id: 'room-service', name: 'Room Service', icon: Utensils, description: 'Take food and beverage orders' },
    { id: 'travel', name: 'Travel Booking', icon: Plane, description: 'Assist with travel arrangements' }
  ]
};

// Voice options
const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy - Neutral', gender: 'Neutral', tone: 'Professional' },
  { id: 'echo', name: 'Echo - Male', gender: 'Male', tone: 'Friendly' },
  { id: 'fable', name: 'Fable - British', gender: 'Male', tone: 'Sophisticated' },
  { id: 'onyx', name: 'Onyx - Male', gender: 'Male', tone: 'Deep & Authoritative' },
  { id: 'nova', name: 'Nova - Female', gender: 'Female', tone: 'Warm & Energetic' },
  { id: 'shimmer', name: 'Shimmer - Female', gender: 'Female', tone: 'Soft & Caring' }
];

// Language options - 28 languages for global coverage
const LANGUAGES = [
  // English variants
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'en-AU', name: 'English (Australia)', flag: '🇦🇺' },
  // Spanish variants
  { code: 'es-ES', name: 'Spanish (Spain)', flag: '🇪🇸' },
  { code: 'es-MX', name: 'Spanish (Mexico)', flag: '🇲🇽' },
  { code: 'es-AR', name: 'Spanish (Argentina)', flag: '🇦🇷' },
  // European languages
  { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', flag: '🇵🇹' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'nl-NL', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl-PL', name: 'Polish', flag: '🇵🇱' },
  { code: 'sv-SE', name: 'Swedish', flag: '🇸🇪' },
  { code: 'da-DK', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi-FI', name: 'Finnish', flag: '🇫🇮' },
  { code: 'no-NO', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'ru-RU', name: 'Russian', flag: '🇷🇺' },
  { code: 'uk-UA', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'cs-CZ', name: 'Czech', flag: '🇨🇿' },
  // Asian languages
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { code: 'th-TH', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi-VN', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'id-ID', name: 'Indonesian', flag: '🇮🇩' },
  // Middle East
  { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦' },
  { code: 'tr-TR', name: 'Turkish', flag: '🇹🇷' },
  { code: 'he-IL', name: 'Hebrew', flag: '🇮🇱' }
];

// LLM providers
const LLM_PROVIDERS = [
  { id: 'openai-gpt4', name: 'OpenAI GPT-4', model: 'gpt-4-turbo', speed: 'Fast', quality: 'Excellent' },
  { id: 'openai-gpt3.5', name: 'OpenAI GPT-3.5', model: 'gpt-3.5-turbo', speed: 'Very Fast', quality: 'Good' },
  { id: 'gemini-pro', name: 'Google Gemini Pro', model: 'gemini-pro', speed: 'Fast', quality: 'Excellent' },
  { id: 'gemini-flash', name: 'Google Gemini Flash', model: 'gemini-1.5-flash', speed: 'Ultra Fast', quality: 'Good' }
];

export default function VoiceAgentBuilder({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('Customer Service');
  const [formData, setFormData] = useState({
    agentType: null,
    voice: 'alloy',
    language: 'en-US',
    speechSpeed: 1.0,
    // Advanced voice settings
    voiceTemperature: 0.7,
    autoDetectLanguage: false,
    backChanneling: true,
    backChannelFrequency: 'medium', // 'low', 'medium', 'high'
    readNumbersSlowly: true,
    llmProvider: 'openai-gpt4',
    greeting: '',
    systemPrompt: '',
    maxCallDuration: 10,
    capabilities: {
      voicemail: true,
      transfer: true,
      recording: true,
      transcription: true,
      sentiment: false
    },
    // Transfer settings
    transferType: 'cold', // 'cold' or 'warm'
    transferNumber: '',
    phoneOption: 'new', // 'new' or 'existing'
    areaCode: '',
    existingNumber: '',
    // ElevenLabs integration
    useElevenLabs: false,
    elevenLabsApiKey: '',
    // Webhook integrations
    webhooks: []
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewAudioRef = useRef(null);

  // Voice preview samples (mock URLs - would be real TTS API in production)
  const VOICE_PREVIEWS = {
    'alloy': 'Hello, I am Alloy. I have a neutral, professional tone perfect for business calls.',
    'echo': 'Hi there! I am Echo. My friendly voice is great for casual conversations.',
    'fable': 'Good day. I am Fable, speaking with a sophisticated British accent.',
    'onyx': 'Greetings. I am Onyx, with a deep and authoritative voice.',
    'nova': 'Hey! I am Nova, bringing warm and energetic vibes to every call!',
    'shimmer': 'Hello. I am Shimmer, with a soft and caring voice for sensitive conversations.'
  };

  // Webhook event types
  const WEBHOOK_EVENTS = [
    { id: 'call.started', label: 'Call Started', description: 'When a call begins' },
    { id: 'call.ended', label: 'Call Ended', description: 'When a call completes' },
    { id: 'call.transferred', label: 'Call Transferred', description: 'When transferred to human' },
    { id: 'transcript.ready', label: 'Transcript Ready', description: 'When transcription completes' },
    { id: 'voicemail.received', label: 'Voicemail Received', description: 'When voicemail is left' },
    { id: 'sentiment.negative', label: 'Negative Sentiment', description: 'When negative sentiment detected' }
  ];

  const handleVoicePreview = () => {
    if (isPreviewPlaying) {
      // Stop preview
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPreviewPlaying(false);
    } else {
      // Play preview using Web Speech API
      setPreviewLoading(true);
      const text = VOICE_PREVIEWS[formData.voice] || 'Hello, this is a voice preview.';

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = formData.speechSpeed;

        utterance.onstart = () => {
          setPreviewLoading(false);
          setIsPreviewPlaying(true);
        };
        utterance.onend = () => {
          setIsPreviewPlaying(false);
        };
        utterance.onerror = () => {
          setPreviewLoading(false);
          setIsPreviewPlaying(false);
        };

        window.speechSynthesis.speak(utterance);
      } else {
        setPreviewLoading(false);
      }
    }
  };

  const addWebhook = () => {
    updateFormData({
      webhooks: [...formData.webhooks, { url: '', events: [], secret: '' }]
    });
  };

  const removeWebhook = (index) => {
    const newWebhooks = formData.webhooks.filter((_, i) => i !== index);
    updateFormData({ webhooks: newWebhooks });
  };

  const updateWebhook = (index, field, value) => {
    const newWebhooks = [...formData.webhooks];
    newWebhooks[index] = { ...newWebhooks[index], [field]: value };
    updateFormData({ webhooks: newWebhooks });
  };

  const toggleWebhookEvent = (webhookIndex, eventId) => {
    const newWebhooks = [...formData.webhooks];
    const events = newWebhooks[webhookIndex].events || [];
    if (events.includes(eventId)) {
      newWebhooks[webhookIndex].events = events.filter(e => e !== eventId);
    } else {
      newWebhooks[webhookIndex].events = [...events, eventId];
    }
    updateFormData({ webhooks: newWebhooks });
  };

  const steps = [
    { id: 'type', title: 'Select Agent Type', icon: Users },
    { id: 'voice', title: 'Configure Voice', icon: Volume2 },
    { id: 'behavior', title: 'Customize Behavior', icon: Settings },
    { id: 'phone', title: 'Phone Number', icon: Phone },
    { id: 'review', title: 'Review & Deploy', icon: Rocket }
  ];

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.agentType !== null;
      case 1: return formData.voice && formData.language;
      case 2: return formData.greeting && formData.systemPrompt;
      case 3: return formData.phoneOption === 'new' ? formData.areaCode : formData.existingNumber;
      default: return true;
    }
  };

  const handleDeploy = () => {
    if (onComplete) {
      onComplete(formData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-5xl bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25 }}
        >
          {/* Gradient header */}
          <div className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-purple-500" />

          {/* Header */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center"
                  whileHover={{ rotate: 5, scale: 1.05 }}
                >
                  <Phone className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Create Voice Agent</h2>
                  <p className="text-white/50 text-sm">Build your AI phone assistant in 5 steps</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Step Progress */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center gap-2">
                    <motion.div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        index < currentStep
                          ? 'bg-green-500 border-green-500'
                          : index === currentStep
                          ? 'bg-orange-500 border-orange-500'
                          : 'bg-white/5 border-white/10'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {index < currentStep ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <step.icon className={`w-5 h-5 ${
                          index === currentStep ? 'text-white' : 'text-white/40'
                        }`} />
                      )}
                    </motion.div>
                    <span className={`text-xs font-medium hidden md:block ${
                      index === currentStep ? 'text-white' : 'text-white/40'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-green-500' : 'bg-white/10'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="p-6 min-h-[500px] max-h-[600px] overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* Step 1: Agent Type Selection */}
              {currentStep === 0 && (
                <motion.div
                  key="step-1"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={fadeInUp}
                >
                  {/* Category Tabs */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {Object.keys(AGENT_CATEGORIES).map((category) => (
                      <motion.button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          selectedCategory === category
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {category}
                      </motion.button>
                    ))}
                  </div>

                  {/* Agent Type Cards */}
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {AGENT_CATEGORIES[selectedCategory].map((type) => (
                      <motion.button
                        key={type.id}
                        onClick={() => updateFormData({ agentType: type.id })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.agentType === type.id
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                        variants={fadeInUp}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start gap-3">
                          <motion.div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              formData.agentType === type.id
                                ? 'bg-orange-500'
                                : 'bg-white/10'
                            }`}
                            whileHover={{ rotate: 5 }}
                          >
                            <type.icon className="w-6 h-6 text-white" />
                          </motion.div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold mb-1">{type.name}</h3>
                            <p className="text-white/60 text-sm">{type.description}</p>
                          </div>
                          {formData.agentType === type.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                </motion.div>
              )}

              {/* Step 2: Voice Configuration */}
              {currentStep === 1 && (
                <motion.div
                  key="step-2"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={fadeInUp}
                  className="space-y-6"
                >
                  {/* Voice Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-white font-medium">Select Voice</label>
                      {/* Voice Preview Button */}
                      <motion.button
                        onClick={handleVoicePreview}
                        disabled={previewLoading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                          isPreviewPlaying
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {previewLoading ? (
                          <motion.div
                            className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                        ) : isPreviewPlaying ? (
                          <Square className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        {isPreviewPlaying ? 'Stop Preview' : 'Preview Voice'}
                      </motion.button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {VOICE_OPTIONS.map((voice) => (
                        <motion.button
                          key={voice.id}
                          onClick={() => updateFormData({ voice: voice.id })}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            formData.voice === voice.id
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-semibold">{voice.name}</h4>
                            {formData.voice === voice.id && (
                              <Check className="w-5 h-5 text-orange-500" />
                            )}
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="px-2 py-1 rounded bg-white/10 text-white/60">{voice.gender}</span>
                            <span className="px-2 py-1 rounded bg-white/10 text-white/60">{voice.tone}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div>
                    <label className="text-white font-medium mb-3 block">Language</label>
                    <select
                      value={formData.language}
                      onChange={(e) => updateFormData({ language: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Speech Speed */}
                  <div>
                    <label className="text-white font-medium mb-3 block">
                      Speech Speed: {formData.speechSpeed.toFixed(1)}x
                    </label>
                    <div className="flex items-center gap-4">
                      <span className="text-white/40 text-sm">Slow</span>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={formData.speechSpeed}
                        onChange={(e) => updateFormData({ speechSpeed: parseFloat(e.target.value) })}
                        className="flex-1 h-2 rounded-lg appearance-none bg-white/10 slider-thumb"
                        style={{
                          background: `linear-gradient(to right, #f97316 0%, #f97316 ${((formData.speechSpeed - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) ${((formData.speechSpeed - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) 100%)`
                        }}
                      />
                      <span className="text-white/40 text-sm">Fast</span>
                    </div>
                  </div>

                  {/* Voice Temperature */}
                  <div>
                    <label className="text-white font-medium mb-3 block flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-orange-400" />
                      Voice Temperature: {formData.voiceTemperature.toFixed(1)}
                    </label>
                    <p className="text-white/40 text-xs mb-3">Controls voice variability. Lower = more consistent, Higher = more expressive</p>
                    <div className="flex items-center gap-4">
                      <span className="text-white/40 text-sm">Stable</span>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.1"
                        value={formData.voiceTemperature}
                        onChange={(e) => updateFormData({ voiceTemperature: parseFloat(e.target.value) })}
                        className="flex-1 h-2 rounded-lg appearance-none bg-white/10"
                        style={{
                          background: `linear-gradient(to right, #f97316 0%, #f97316 ${formData.voiceTemperature * 100}%, rgba(255,255,255,0.1) ${formData.voiceTemperature * 100}%, rgba(255,255,255,0.1) 100%)`
                        }}
                      />
                      <span className="text-white/40 text-sm">Expressive</span>
                    </div>
                  </div>

                  {/* Advanced Voice Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Auto-detect Language */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Languages className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">Auto-detect Language</p>
                            <p className="text-white/40 text-xs">Detect caller&apos;s language automatically</p>
                          </div>
                        </div>
                        <motion.button
                          onClick={() => updateFormData({ autoDetectLanguage: !formData.autoDetectLanguage })}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            formData.autoDetectLanguage ? 'bg-blue-500' : 'bg-white/10'
                          }`}
                          whileTap={{ scale: 0.95 }}
                        >
                          <motion.div
                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
                            animate={{ left: formData.autoDetectLanguage ? '26px' : '4px' }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        </motion.button>
                      </div>
                    </div>

                    {/* Read Numbers Slowly */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Hash className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">Read Numbers Slowly</p>
                            <p className="text-white/40 text-xs">Speak numbers clearly for accuracy</p>
                          </div>
                        </div>
                        <motion.button
                          onClick={() => updateFormData({ readNumbersSlowly: !formData.readNumbersSlowly })}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            formData.readNumbersSlowly ? 'bg-purple-500' : 'bg-white/10'
                          }`}
                          whileTap={{ scale: 0.95 }}
                        >
                          <motion.div
                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
                            animate={{ left: formData.readNumbersSlowly ? '26px' : '4px' }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Back-channeling */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">Back-channeling</p>
                          <p className="text-white/40 text-xs">Insert acknowledgments like &quot;uh-huh&quot;, &quot;I see&quot; during caller speech</p>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => updateFormData({ backChanneling: !formData.backChanneling })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          formData.backChanneling ? 'bg-cyan-500' : 'bg-white/10'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.div
                          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
                          animate={{ left: formData.backChanneling ? '26px' : '4px' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                    <AnimatePresence>
                      {formData.backChanneling && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex gap-2 mt-3"
                        >
                          {['low', 'medium', 'high'].map((freq) => (
                            <motion.button
                              key={freq}
                              onClick={() => updateFormData({ backChannelFrequency: freq })}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                formData.backChannelFrequency === freq
                                  ? 'bg-cyan-500 text-white'
                                  : 'bg-white/5 text-white/60 hover:bg-white/10'
                              }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {freq.charAt(0).toUpperCase() + freq.slice(1)}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* LLM Provider */}
                  <div>
                    <label className="text-white font-medium mb-3 block">AI Model Provider</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {LLM_PROVIDERS.map((provider) => (
                        <motion.button
                          key={provider.id}
                          onClick={() => updateFormData({ llmProvider: provider.id })}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            formData.llmProvider === provider.id
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-semibold">{provider.name}</h4>
                            {formData.llmProvider === provider.id && (
                              <Check className="w-5 h-5 text-orange-500" />
                            )}
                          </div>
                          <p className="text-white/40 text-xs mb-2">{provider.model}</p>
                          <div className="flex gap-2 text-xs">
                            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">{provider.speed}</span>
                            <span className="px-2 py-1 rounded bg-green-500/20 text-green-400">{provider.quality}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* ElevenLabs Integration */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                          <Key className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Connect ElevenLabs</h4>
                          <p className="text-white/50 text-sm">Use your own ElevenLabs API key for premium voices</p>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => updateFormData({ useElevenLabs: !formData.useElevenLabs })}
                        className={`relative w-14 h-7 rounded-full transition-colors ${
                          formData.useElevenLabs ? 'bg-emerald-500' : 'bg-white/10'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.div
                          className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg"
                          animate={{ left: formData.useElevenLabs ? '32px' : '4px' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>

                    <AnimatePresence>
                      {formData.useElevenLabs && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
                            {/* API Key Input */}
                            <div>
                              <label className="text-white/80 text-sm mb-2 block">ElevenLabs API Key</label>
                              <div className="relative">
                                <input
                                  type={showApiKey ? 'text' : 'password'}
                                  value={formData.elevenLabsApiKey}
                                  onChange={(e) => updateFormData({ elevenLabsApiKey: e.target.value })}
                                  placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                >
                                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                            </div>

                            {/* Benefits */}
                            <div className="flex flex-wrap gap-2">
                              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                                29+ Languages
                              </span>
                              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                                Ultra-realistic voices
                              </span>
                              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                                Voice cloning
                              </span>
                            </div>

                            {/* Get API Key Link */}
                            <a
                              href="https://elevenlabs.io/app/settings/api-keys"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Get your API key from ElevenLabs
                            </a>

                            {/* Validation Status */}
                            {formData.elevenLabsApiKey && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`flex items-center gap-2 text-sm ${
                                  formData.elevenLabsApiKey.startsWith('sk_') && formData.elevenLabsApiKey.length > 20
                                    ? 'text-green-400'
                                    : 'text-yellow-400'
                                }`}
                              >
                                {formData.elevenLabsApiKey.startsWith('sk_') && formData.elevenLabsApiKey.length > 20 ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    API key format looks valid
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-4 h-4" />
                                    API key should start with &quot;sk_&quot;
                                  </>
                                )}
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Behavior Customization */}
              {currentStep === 2 && (
                <motion.div
                  key="step-3"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={fadeInUp}
                  className="space-y-6"
                >
                  {/* Greeting Message */}
                  <div>
                    <label className="text-white font-medium mb-2 block">Greeting Message</label>
                    <p className="text-white/40 text-sm mb-3">What should the agent say when answering the call?</p>
                    <textarea
                      value={formData.greeting}
                      onChange={(e) => updateFormData({ greeting: e.target.value })}
                      placeholder="Hello! Thanks for calling. I'm an AI assistant. How can I help you today?"
                      className="w-full h-24 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                    />
                  </div>

                  {/* System Prompt */}
                  <div>
                    <label className="text-white font-medium mb-2 block">System Prompt</label>
                    <p className="text-white/40 text-sm mb-3">Define the agent&apos;s role, knowledge, and behavior</p>
                    <textarea
                      value={formData.systemPrompt}
                      onChange={(e) => updateFormData({ systemPrompt: e.target.value })}
                      placeholder="You are a helpful customer service agent. Be polite, professional, and concise. If you don't know something, admit it and offer to connect the caller with a human representative..."
                      className="w-full h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                    />
                  </div>

                  {/* Max Call Duration */}
                  <div>
                    <label className="text-white font-medium mb-3 block">
                      Max Call Duration: {formData.maxCallDuration} minutes
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={formData.maxCallDuration}
                      onChange={(e) => updateFormData({ maxCallDuration: parseInt(e.target.value) })}
                      className="w-full h-2 rounded-lg appearance-none bg-white/10"
                      style={{
                        background: `linear-gradient(to right, #f97316 0%, #f97316 ${((formData.maxCallDuration - 1) / 29) * 100}%, rgba(255,255,255,0.1) ${((formData.maxCallDuration - 1) / 29) * 100}%, rgba(255,255,255,0.1) 100%)`
                      }}
                    />
                  </div>

                  {/* Capabilities */}
                  <div>
                    <label className="text-white font-medium mb-3 block">Agent Capabilities</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { key: 'voicemail', label: 'Voicemail Detection', description: 'Detect and leave messages' },
                        { key: 'transfer', label: 'Call Transfer', description: 'Transfer to human agents', hasConfig: true },
                        { key: 'recording', label: 'Call Recording', description: 'Record all conversations' },
                        { key: 'transcription', label: 'Live Transcription', description: 'Real-time text conversion' },
                        { key: 'sentiment', label: 'Sentiment Analysis', description: 'Analyze caller emotions' }
                      ].map((capability) => (
                        <motion.label
                          key={capability.key}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.capabilities[capability.key]
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={formData.capabilities[capability.key]}
                              onChange={(e) => updateFormData({
                                capabilities: {
                                  ...formData.capabilities,
                                  [capability.key]: e.target.checked
                                }
                              })}
                              className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500"
                            />
                            <div>
                              <p className="text-white font-medium">{capability.label}</p>
                              <p className="text-white/40 text-sm">{capability.description}</p>
                            </div>
                          </div>
                        </motion.label>
                      ))}
                    </div>
                  </div>

                  {/* Transfer Type Configuration - Shows when Call Transfer is enabled */}
                  <AnimatePresence>
                    {formData.capabilities.transfer && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                              <PhoneForwarded className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">Transfer Configuration</h4>
                              <p className="text-white/50 text-sm">Configure how calls are transferred to human agents</p>
                            </div>
                          </div>

                          {/* Transfer Type Selection */}
                          <div className="mb-4">
                            <p className="text-white/60 text-sm mb-3">Transfer Type</p>
                            <div className="grid grid-cols-2 gap-3">
                              <motion.button
                                onClick={() => updateFormData({ transferType: 'cold' })}
                                className={`p-3 rounded-xl border-2 transition-all text-left ${
                                  formData.transferType === 'cold'
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-white font-medium">Cold Transfer</span>
                                  {formData.transferType === 'cold' && (
                                    <Check className="w-4 h-4 text-orange-500" />
                                  )}
                                </div>
                                <p className="text-white/40 text-xs">Immediate handoff without context</p>
                              </motion.button>

                              <motion.button
                                onClick={() => updateFormData({ transferType: 'warm' })}
                                className={`p-3 rounded-xl border-2 transition-all text-left ${
                                  formData.transferType === 'warm'
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-white font-medium">Warm Transfer</span>
                                  {formData.transferType === 'warm' && (
                                    <Check className="w-4 h-4 text-orange-500" />
                                  )}
                                </div>
                                <p className="text-white/40 text-xs">Brief the agent before connecting caller</p>
                              </motion.button>
                            </div>
                          </div>

                          {/* Transfer Phone Number */}
                          <div>
                            <label className="text-white/60 text-sm mb-2 block">Transfer Number</label>
                            <input
                              type="tel"
                              value={formData.transferNumber}
                              onChange={(e) => updateFormData({ transferNumber: e.target.value })}
                              placeholder="+1 (555) 123-4567"
                              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                            <p className="text-white/40 text-xs mt-2">Phone number to transfer calls to when human assistance is needed</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Webhook Integrations */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          <Webhook className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Webhook Integrations</h4>
                          <p className="text-white/50 text-sm">Sync call events with your CRM, helpdesk, or custom systems</p>
                        </div>
                      </div>
                      <motion.button
                        onClick={addWebhook}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors text-sm font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="w-4 h-4" />
                        Add Webhook
                      </motion.button>
                    </div>

                    <AnimatePresence>
                      {formData.webhooks.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4"
                        >
                          {formData.webhooks.map((webhook, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-white/60 text-sm font-medium">Webhook {index + 1}</span>
                                <motion.button
                                  onClick={() => removeWebhook(index)}
                                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </motion.button>
                              </div>

                              {/* Webhook URL */}
                              <div className="mb-4">
                                <label className="text-white/60 text-xs mb-1.5 block">Endpoint URL</label>
                                <input
                                  type="url"
                                  value={webhook.url}
                                  onChange={(e) => updateWebhook(index, 'url', e.target.value)}
                                  placeholder="https://your-app.com/webhooks/voice-agent"
                                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                              </div>

                              {/* Webhook Secret */}
                              <div className="mb-4">
                                <label className="text-white/60 text-xs mb-1.5 block">Signing Secret (optional)</label>
                                <input
                                  type="password"
                                  value={webhook.secret}
                                  onChange={(e) => updateWebhook(index, 'secret', e.target.value)}
                                  placeholder="whsec_..."
                                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                                />
                              </div>

                              {/* Event Selection */}
                              <div>
                                <label className="text-white/60 text-xs mb-2 block">Events to Send</label>
                                <div className="flex flex-wrap gap-2">
                                  {WEBHOOK_EVENTS.map((event) => (
                                    <motion.button
                                      key={event.id}
                                      onClick={() => toggleWebhookEvent(index, event.id)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        webhook.events?.includes(event.id)
                                          ? 'bg-indigo-500 text-white'
                                          : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                                      }`}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      title={event.description}
                                    >
                                      {event.label}
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {formData.webhooks.length === 0 && (
                      <div className="text-center py-6 rounded-xl border border-dashed border-white/10">
                        <Webhook className="w-8 h-8 text-white/20 mx-auto mb-2" />
                        <p className="text-white/40 text-sm">No webhooks configured</p>
                        <p className="text-white/30 text-xs">Add a webhook to sync call events with external systems</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Phone Number */}
              {currentStep === 3 && (
                <motion.div
                  key="step-4"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={fadeInUp}
                  className="space-y-6"
                >
                  {/* Phone Option Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.button
                      onClick={() => updateFormData({ phoneOption: 'new' })}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        formData.phoneOption === 'new'
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        {formData.phoneOption === 'new' && (
                          <Check className="w-6 h-6 text-orange-500" />
                        )}
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">Get New Number</h3>
                      <p className="text-white/60 text-sm">Provision a new phone number for your agent</p>
                    </motion.button>

                    <motion.button
                      onClick={() => updateFormData({ phoneOption: 'existing' })}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        formData.phoneOption === 'existing'
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Phone className="w-6 h-6 text-white" />
                        </div>
                        {formData.phoneOption === 'existing' && (
                          <Check className="w-6 h-6 text-orange-500" />
                        )}
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">Use Existing Number</h3>
                      <p className="text-white/60 text-sm">Forward calls from your current number</p>
                    </motion.button>
                  </div>

                  {/* New Number - Area Code */}
                  {formData.phoneOption === 'new' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <label className="text-white font-medium mb-2 block">Preferred Area Code</label>
                      <p className="text-white/40 text-sm mb-3">Choose your desired area code (optional)</p>
                      <input
                        type="text"
                        value={formData.areaCode}
                        onChange={(e) => updateFormData({ areaCode: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                        placeholder="e.g., 415, 212, 310"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                      {formData.areaCode && formData.areaCode.length === 3 && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-green-400 text-sm mt-2"
                        >
                          Available numbers in ({formData.areaCode}) area code will be shown
                        </motion.p>
                      )}
                    </motion.div>
                  )}

                  {/* Existing Number */}
                  {formData.phoneOption === 'existing' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <label className="text-white font-medium mb-2 block">Your Phone Number</label>
                      <p className="text-white/40 text-sm mb-3">Enter the number to forward calls from</p>
                      <input
                        type="tel"
                        value={formData.existingNumber}
                        onChange={(e) => updateFormData({ existingNumber: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Step 5: Review & Deploy */}
              {currentStep === 4 && (
                <motion.div
                  key="step-5"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={fadeInUp}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <motion.div
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4"
                      animate={{
                        scale: [1, 1.05, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Rocket className="w-10 h-10 text-white" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-2">Ready to Deploy</h3>
                    <p className="text-white/60">Review your configuration before launching</p>
                  </div>

                  {/* Summary Cards */}
                  <div className="space-y-4">
                    {/* Agent Type */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/40 text-sm mb-1">Agent Type</p>
                          <p className="text-white font-semibold">
                            {Object.values(AGENT_CATEGORIES)
                              .flat()
                              .find(t => t.id === formData.agentType)?.name || 'Not selected'}
                          </p>
                        </div>
                        <motion.button
                          onClick={() => setCurrentStep(0)}
                          className="text-orange-400 hover:text-orange-300 text-sm"
                          whileHover={{ scale: 1.05 }}
                        >
                          Edit
                        </motion.button>
                      </div>
                    </div>

                    {/* Voice & Language */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-white/40 text-sm mb-1">Voice & Language</p>
                          <p className="text-white font-semibold">
                            {VOICE_OPTIONS.find(v => v.id === formData.voice)?.name || 'Not selected'}
                          </p>
                          <p className="text-white/60 text-sm">
                            {LANGUAGES.find(l => l.code === formData.language)?.name || 'Not selected'} • {formData.speechSpeed}x speed
                          </p>
                        </div>
                        <motion.button
                          onClick={() => setCurrentStep(1)}
                          className="text-orange-400 hover:text-orange-300 text-sm"
                          whileHover={{ scale: 1.05 }}
                        >
                          Edit
                        </motion.button>
                      </div>
                      {/* Advanced Voice Settings Summary */}
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                        <span className="px-2 py-1 rounded-lg bg-white/5 text-white/50 text-xs flex items-center gap-1">
                          <Thermometer className="w-3 h-3" />
                          Temp: {formData.voiceTemperature.toFixed(1)}
                        </span>
                        {formData.autoDetectLanguage && (
                          <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs flex items-center gap-1">
                            <Languages className="w-3 h-3" />
                            Auto-detect
                          </span>
                        )}
                        {formData.backChanneling && (
                          <span className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            Back-channel ({formData.backChannelFrequency})
                          </span>
                        )}
                        {formData.readNumbersSlowly && (
                          <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            Slow numbers
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AI Model */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/40 text-sm mb-1">AI Model</p>
                          <p className="text-white font-semibold">
                            {LLM_PROVIDERS.find(p => p.id === formData.llmProvider)?.name || 'Not selected'}
                          </p>
                        </div>
                        <motion.button
                          onClick={() => setCurrentStep(1)}
                          className="text-orange-400 hover:text-orange-300 text-sm"
                          whileHover={{ scale: 1.05 }}
                        >
                          Edit
                        </motion.button>
                      </div>
                    </div>

                    {/* ElevenLabs Integration */}
                    {formData.useElevenLabs && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                              <Key className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-emerald-400 text-sm font-medium">ElevenLabs Connected</p>
                              <p className="text-white/50 text-xs">
                                {formData.elevenLabsApiKey ?
                                  `API Key: ${formData.elevenLabsApiKey.slice(0, 8)}...${formData.elevenLabsApiKey.slice(-4)}` :
                                  'No API key provided'}
                              </p>
                            </div>
                          </div>
                          <motion.button
                            onClick={() => setCurrentStep(1)}
                            className="text-emerald-400 hover:text-emerald-300 text-sm"
                            whileHover={{ scale: 1.05 }}
                          >
                            Edit
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {/* Phone Number */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/40 text-sm mb-1">Phone Number</p>
                          <p className="text-white font-semibold">
                            {formData.phoneOption === 'new'
                              ? formData.areaCode
                                ? `New number in (${formData.areaCode})`
                                : 'New number (any area code)'
                              : formData.existingNumber || 'Not configured'}
                          </p>
                        </div>
                        <motion.button
                          onClick={() => setCurrentStep(3)}
                          className="text-orange-400 hover:text-orange-300 text-sm"
                          whileHover={{ scale: 1.05 }}
                        >
                          Edit
                        </motion.button>
                      </div>
                    </div>

                    {/* Capabilities */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-white/40 text-sm mb-2">Enabled Capabilities</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(formData.capabilities)
                          .filter(([_, enabled]) => enabled)
                          .map(([key]) => (
                            <span
                              key={key}
                              className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm"
                            >
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Transfer Configuration */}
                    {formData.capabilities.transfer && (
                      <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                              <PhoneForwarded className="w-4 h-4 text-orange-400" />
                            </div>
                            <div>
                              <p className="text-orange-400 text-sm font-medium">
                                {formData.transferType === 'warm' ? 'Warm Transfer' : 'Cold Transfer'}
                              </p>
                              <p className="text-white/50 text-xs">
                                {formData.transferNumber || 'No transfer number set'}
                              </p>
                            </div>
                          </div>
                          <motion.button
                            onClick={() => setCurrentStep(2)}
                            className="text-orange-400 hover:text-orange-300 text-sm"
                            whileHover={{ scale: 1.05 }}
                          >
                            Edit
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {/* Webhooks */}
                    {formData.webhooks.length > 0 && (
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                              <Webhook className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                              <p className="text-indigo-400 text-sm font-medium">
                                {formData.webhooks.length} Webhook{formData.webhooks.length > 1 ? 's' : ''} Configured
                              </p>
                              <p className="text-white/50 text-xs">
                                {formData.webhooks.flatMap(w => w.events || []).length} events subscribed
                              </p>
                            </div>
                          </div>
                          <motion.button
                            onClick={() => setCurrentStep(2)}
                            className="text-indigo-400 hover:text-indigo-300 text-sm"
                            whileHover={{ scale: 1.05 }}
                          >
                            Edit
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="p-6 border-t border-white/5 bg-white/5">
            <div className="flex items-center justify-between gap-4">
              <motion.button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="px-6 py-3 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                whileHover={{ scale: currentStep > 0 ? 1.02 : 1 }}
                whileTap={{ scale: currentStep > 0 ? 0.98 : 1 }}
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </motion.button>

              <div className="text-center">
                <p className="text-white/40 text-sm">
                  Step {currentStep + 1} of {steps.length}
                </p>
              </div>

              {currentStep < steps.length - 1 ? (
                <motion.button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
                  whileHover={{ scale: canProceed() ? 1.02 : 1, boxShadow: canProceed() ? "0 20px 40px rgba(249, 115, 22, 0.3)" : undefined }}
                  whileTap={{ scale: canProceed() ? 0.98 : 1 }}
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleDeploy}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-green-500/25"
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(34, 197, 94, 0.3)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Rocket className="w-5 h-5" />
                  Deploy Agent
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
