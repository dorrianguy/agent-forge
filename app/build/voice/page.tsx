'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Bot, Sparkles, Check, ArrowRight, ArrowLeft,
  Phone, Headphones, Calendar, MessageSquare, Users,
  Zap, Mic, Volume2, Settings, ChevronLeft,
  PhoneCall, PhoneOff, Play, Pause, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Voice Agent Templates
const voiceAgentTemplates = [
  {
    id: 'voice_support',
    name: 'Voice Support Agent',
    icon: Headphones,
    description: 'Handle inbound support calls 24/7. Answer questions, troubleshoot issues, and escalate when needed.',
    color: 'blue',
    placeholder: 'I need a voice agent that answers support calls, helps customers troubleshoot common issues, checks order status, and transfers to human support for complex problems...',
    features: ['Inbound calls', 'FAQ handling', 'Call transfer', 'Sentiment detection']
  },
  {
    id: 'voice_sales',
    name: 'Voice Sales Agent',
    icon: Phone,
    description: 'Make outbound sales calls, qualify leads, handle objections, and book appointments.',
    color: 'green',
    placeholder: 'I need a voice agent that makes outbound calls to leads, qualifies them based on budget and timeline, handles common objections, and books demo meetings...',
    features: ['Outbound calls', 'Lead qualification', 'Objection handling', 'Appointment booking']
  },
  {
    id: 'voice_appointment',
    name: 'Appointment Booker',
    icon: Calendar,
    description: 'Automatically schedule appointments, send reminders, and handle reschedules.',
    color: 'purple',
    placeholder: 'I need a voice agent that schedules appointments, checks calendar availability, sends SMS confirmations, and handles cancellations and reschedules...',
    features: ['Cal.com integration', 'SMS confirmations', 'Availability check', 'Rescheduling']
  },
  {
    id: 'voice_receptionist',
    name: 'AI Receptionist',
    icon: Users,
    description: 'Answer all incoming calls, route to departments, take messages, and provide information.',
    color: 'orange',
    placeholder: 'I need a voice receptionist that answers all calls, greets callers professionally, routes calls to the right department, and takes messages when people are unavailable...',
    features: ['Call routing', 'Message taking', 'Directory lookup', 'Business hours handling']
  },
  {
    id: 'voice_custom',
    name: 'Custom Voice Agent',
    icon: Sparkles,
    description: 'Build any voice agent from scratch with your own conversation flow.',
    color: 'pink',
    placeholder: 'Describe your custom voice agent. What calls should it handle? What should it say? What actions can it take?',
    features: ['Fully customizable', 'Custom flow editor', 'Any use case']
  }
];

// TTS Voice Options (sample)
const voiceOptions = [
  { id: 'alloy', name: 'Alloy', gender: 'neutral', provider: 'openai', preview: '/voices/alloy.mp3' },
  { id: 'echo', name: 'Echo', gender: 'male', provider: 'openai', preview: '/voices/echo.mp3' },
  { id: 'fable', name: 'Fable', gender: 'female', provider: 'openai', preview: '/voices/fable.mp3' },
  { id: 'nova', name: 'Nova', gender: 'female', provider: 'openai', preview: '/voices/nova.mp3' },
  { id: 'rachel', name: 'Rachel', gender: 'female', provider: 'elevenlabs', preview: '/voices/rachel.mp3' },
  { id: 'adam', name: 'Adam', gender: 'male', provider: 'elevenlabs', preview: '/voices/adam.mp3' },
  { id: 'bella', name: 'Bella', gender: 'female', provider: 'elevenlabs', preview: '/voices/bella.mp3' },
];

// Build stages
const buildStages = [
  { stage: 'analyzing', progress: 15, text: 'Analyzing conversation requirements...' },
  { stage: 'voice_selection', progress: 30, text: 'Configuring voice settings...' },
  { stage: 'flow_design', progress: 50, text: 'Designing conversation flow...' },
  { stage: 'training', progress: 70, text: 'Training voice responses...' },
  { stage: 'testing', progress: 85, text: 'Testing voice quality...' },
  { stage: 'complete', progress: 100, text: 'Voice agent forged!' }
];

export default function VoiceBuildPage() {
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'describe' | 'voice' | 'building' | 'complete'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof voiceAgentTemplates[0] | null>(null);
  const [description, setDescription] = useState('');
  const [agentName, setAgentName] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(voiceOptions[0]);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [buildStatus, setBuildStatus] = useState<typeof buildStages[0] | null>(null);
  const [builtAgent, setBuiltAgent] = useState<any>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Voice settings
  const [voiceSettings, setVoiceSettings] = useState({
    backchannel: true,
    interruption: 'medium',
    greetingMessage: 'Hello! Thank you for calling. How can I help you today?',
    maxCallDuration: 30, // minutes
    silenceTimeout: 10, // seconds
  });

  const handleSelectTemplate = (template: typeof voiceAgentTemplates[0]) => {
    setSelectedTemplate(template);
    setDescription('');
    setAgentName(template.id === 'voice_custom' ? '' : `My ${template.name}`);
    setStep('describe');
  };

  const handleContinueToVoice = () => {
    if (!description.trim() || !agentName.trim()) return;
    setStep('voice');
  };

  const handleBuild = async () => {
    setStep('building');

    // Simulate build process
    for (let i = 0; i < buildStages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 900));
      setBuildStatus(buildStages[i]);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Create the voice agent object
    const agent = {
      id: `voice-agent-${Date.now()}`,
      name: agentName,
      type: selectedTemplate?.id || 'voice_custom',
      description: description,
      voice: {
        id: selectedVoice.id,
        name: selectedVoice.name,
        provider: selectedVoice.provider,
        speed: voiceSpeed,
        settings: voiceSettings,
      },
      status: 'ready',
      isVoice: true,
      createdAt: new Date().toISOString()
    };

    // Store in localStorage
    localStorage.setItem('pendingVoiceAgent', JSON.stringify(agent));

    setBuiltAgent(agent);
    setStep('complete');
  };

  const handleChoosePlan = () => {
    router.push('/pricing?from=voice-build');
  };

  const playVoicePreview = async () => {
    if (isPlayingVoice) return;
    setIsPlayingVoice(true);

    try {
      // Use OpenAI TTS API for human-like voice quality
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: voiceSettings.greetingMessage,
          voice: selectedVoice.id,
          speed: voiceSpeed,
        }),
      });

      if (!response.ok) {
        throw new Error('TTS API failed');
      }

      // Play the high-quality audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlayingVoice(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingVoice(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS API error, falling back to browser TTS:', error);
      // Fallback to browser TTS if OpenAI API fails
      try {
        const utterance = new SpeechSynthesisUtterance(voiceSettings.greetingMessage);
        utterance.rate = voiceSpeed;
        utterance.onend = () => setIsPlayingVoice(false);
        utterance.onerror = () => setIsPlayingVoice(false);
        window.speechSynthesis.speak(utterance);
      } catch (fallbackError) {
        console.error('Browser TTS fallback also failed:', fallbackError);
        setIsPlayingVoice(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl -bottom-48 -right-48"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <motion.div
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/25"
                whileHover={{ scale: 1.05 }}
              >
                <Phone className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold">Voice Agent Builder</h1>
                <p className="text-xs text-white/50">AI Voice Agents in Minutes</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/build" className="text-white/70 hover:text-white transition flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Text Agent Builder
              </Link>
              <Link href="/login" className="text-white/70 hover:text-white transition">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Template */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-12">
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <PhoneCall className="w-4 h-4" />
                  Build AI Phone Agents
                </motion.div>
                <h1 className="text-4xl font-bold mb-4">What kind of voice agent do you need?</h1>
                <p className="text-xl text-white/60">Handle phone calls with AI that sounds human</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {voiceAgentTemplates.map((template, i) => (
                  <motion.button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-${template.color}-500/50 hover:bg-white/10 transition-all text-left group`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-${template.color}-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                      <template.icon className={`w-6 h-6 text-${template.color}-400`} />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{template.name}</h3>
                    <p className="text-white/60 text-sm mb-4">{template.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {template.features.map((feature, fi) => (
                        <span key={fi} className="px-2 py-1 rounded-full bg-white/5 text-white/50 text-xs">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Describe Agent */}
          {step === 'describe' && selectedTemplate && (
            <motion.div
              key="describe"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <button
                onClick={() => setStep('select')}
                className="flex items-center gap-2 text-white/60 hover:text-white transition mb-8"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to templates
              </button>

              <div className="text-center mb-8">
                <div className={`inline-flex w-16 h-16 rounded-2xl bg-${selectedTemplate.color}-500/20 items-center justify-center mb-4`}>
                  <selectedTemplate.icon className={`w-8 h-8 text-${selectedTemplate.color}-400`} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Build your {selectedTemplate.name}</h1>
                <p className="text-white/60">Describe how your agent should handle calls</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="My Voice Agent"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Describe how your agent should handle calls
                    <span className="text-white/40 font-normal ml-2">(The more detail, the better)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={selectedTemplate.placeholder}
                    className="w-full h-48 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Greeting Message</label>
                  <input
                    type="text"
                    value={voiceSettings.greetingMessage}
                    onChange={(e) => setVoiceSettings({...voiceSettings, greetingMessage: e.target.value})}
                    placeholder="Hello! How can I help you today?"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition"
                  />
                </div>

                <div className="flex gap-4">
                  <motion.button
                    onClick={() => setStep('select')}
                    className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleContinueToVoice}
                    disabled={!description.trim() || !agentName.trim()}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowRight className="w-5 h-5" />
                    Choose Voice
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Voice Selection */}
          {step === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <button
                onClick={() => setStep('describe')}
                className="flex items-center gap-2 text-white/60 hover:text-white transition mb-8"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to description
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-purple-500/20 items-center justify-center mb-4">
                  <Mic className="w-8 h-8 text-purple-400" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Choose a voice</h1>
                <p className="text-white/60">Select how your agent sounds on calls</p>
              </div>

              {/* Voice Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {voiceOptions.map((voice) => (
                  <motion.button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice)}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      selectedVoice.id === voice.id
                        ? 'bg-purple-500/20 border-purple-500/50'
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{voice.name}</span>
                      {selectedVoice.id === voice.id && (
                        <Check className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50 capitalize">{voice.gender}</span>
                      <span className="text-xs text-white/30">|</span>
                      <span className="text-xs text-white/50 capitalize">{voice.provider}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Voice Preview */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium">Preview Voice</span>
                  </div>
                  <motion.button
                    onClick={playVoicePreview}
                    disabled={isPlayingVoice}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isPlayingVoice ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Playing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Play Sample
                      </>
                    )}
                  </motion.button>
                </div>
                <p className="text-white/60 text-sm italic">
                  "{voiceSettings.greetingMessage}"
                </p>
              </div>

              {/* Voice Settings */}
              <div className="space-y-4 mb-8">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4 text-white/50" />
                  Voice Settings
                </h3>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Speaking Speed: {voiceSpeed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>Slower</span>
                    <span>Normal</span>
                    <span>Faster</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <div>
                    <p className="text-white text-sm">Back-channeling</p>
                    <p className="text-white/50 text-xs">Say "uh-huh", "I see" while listening</p>
                  </div>
                  <button
                    onClick={() => setVoiceSettings({...voiceSettings, backchannel: !voiceSettings.backchannel})}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      voiceSettings.backchannel ? 'bg-purple-500' : 'bg-white/20'
                    }`}
                  >
                    <motion.div
                      className="w-5 h-5 rounded-full bg-white shadow-sm"
                      animate={{ x: voiceSettings.backchannel ? 24 : 2 }}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Interruption Handling</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'medium', 'high'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setVoiceSettings({...voiceSettings, interruption: level})}
                        className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                          voiceSettings.interruption === level
                            ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                            : 'bg-white/5 border border-white/10 text-white/60 hover:border-white/30'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/40 text-xs mt-2">
                    How quickly the agent responds when interrupted
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <motion.button
                  onClick={() => setStep('describe')}
                  className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowLeft className="w-5 h-5 inline mr-2" />
                  Back
                </motion.button>
                <motion.button
                  onClick={handleBuild}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                  whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(168, 85, 247, 0.3)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Phone className="w-5 h-5" />
                  Forge Voice Agent
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Building */}
          {step === 'building' && buildStatus && (
            <motion.div
              key="building"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-16"
            >
              <motion.div
                className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-purple-500/30"
                animate={{
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    "0 20px 40px rgba(168, 85, 247, 0.3)",
                    "0 20px 60px rgba(168, 85, 247, 0.5)",
                    "0 20px 40px rgba(168, 85, 247, 0.3)"
                  ]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {buildStatus.stage === 'complete' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10 }}
                  >
                    <Check className="w-16 h-16 text-white" />
                  </motion.div>
                ) : (
                  <Phone className="w-16 h-16 text-white" />
                )}
              </motion.div>

              <motion.h2
                className="text-2xl font-bold text-white mb-2"
                key={buildStatus.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {buildStatus.text}
              </motion.h2>
              <p className="text-white/60 mb-8">Building {agentName}...</p>

              <div className="max-w-md mx-auto">
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${buildStatus.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-white/50 text-sm mt-2">{buildStatus.progress}%</p>
              </div>
            </motion.div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && builtAgent && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10 }}
              >
                <Check className="w-12 h-12 text-white" />
              </motion.div>

              <h1 className="text-4xl font-bold mb-2">Your voice agent is ready!</h1>
              <p className="text-xl text-white/60 mb-8">{builtAgent.name} is ready to take calls</p>

              {/* Agent Preview Card */}
              <motion.div
                className="max-w-md mx-auto mb-8 p-6 rounded-2xl bg-white/5 border border-white/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                    <Phone className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-white">{builtAgent.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 text-sm">Voice: {builtAgent.voice.name}</span>
                      <span className="text-white/30">|</span>
                      <span className="text-white/50 text-sm">{builtAgent.voice.speed}x speed</span>
                    </div>
                  </div>
                  <span className="ml-auto px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm border border-green-500/30">
                    Ready
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                  <Volume2 className="w-4 h-4" />
                  <span>Greeting: "{builtAgent.voice.settings.greetingMessage}"</span>
                </div>
                <p className="text-white/60 text-sm text-left line-clamp-2 mb-4">{builtAgent.description}</p>

                {/* Test Voice Button */}
                <motion.button
                  onClick={playVoicePreview}
                  disabled={isPlayingVoice}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition border border-purple-500/30"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isPlayingVoice ? (
                    <>
                      <Volume2 className="w-5 h-5 animate-pulse" />
                      Speaking...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Test Voice Agent
                    </>
                  )}
                </motion.button>
              </motion.div>

              {/* Next Steps */}
              <motion.div
                className="max-w-md mx-auto p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <PhoneCall className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Get a phone number</h3>
                <p className="text-white/70 text-sm mb-6">
                  Choose a plan to get a phone number and start receiving calls.
                </p>
                <motion.button
                  onClick={handleChoosePlan}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                  whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(168, 85, 247, 0.3)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowRight className="w-5 h-5" />
                  View Pricing Plans
                </motion.button>
                <p className="text-white/50 text-xs mt-3">
                  Voice plans start at $79/month + usage
                </p>
              </motion.div>

              {/* Build another */}
              <motion.button
                onClick={() => {
                  setStep('select');
                  setSelectedTemplate(null);
                  setDescription('');
                  setAgentName('');
                  setBuildStatus(null);
                  setBuiltAgent(null);
                }}
                className="text-white/60 hover:text-white transition flex items-center gap-2 mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Sparkles className="w-4 h-4" />
                Build another voice agent
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
