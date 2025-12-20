/**
 * Voice Test Playground Component
 * Browser-based voice call simulation and testing
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Play, Pause, Square, Mic, MicOff, Volume2, VolumeX,
  Activity, Clock, Zap, MessageSquare, ChevronDown, AlertCircle,
  CheckCircle, TrendingUp, FileText, Settings, Save
} from 'lucide-react';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const pulseAnimation = {
  scale: [1, 1.2, 1],
  opacity: [0.5, 0.8, 0.5]
};

export default function VoiceTestPlayground() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [latency, setLatency] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [showScenarioDropdown, setShowScenarioDropdown] = useState(false);
  const [agents, setAgents] = useState([]);
  const [metrics, setMetrics] = useState({
    avgLatency: 0,
    peakLatency: 0,
    wordCount: 0,
    turns: 0
  });

  const callTimerRef = useRef(null);
  const audioSimulatorRef = useRef(null);
  const transcriptEndRef = useRef(null);

  const testScenarios = [
    {
      id: 'support-basic',
      name: 'Basic Support Inquiry',
      description: 'Customer asking about product features',
      initialMessage: 'Hi, I need help understanding your pricing plans.'
    },
    {
      id: 'support-technical',
      name: 'Technical Issue',
      description: 'Customer reporting a technical problem',
      initialMessage: 'I\'m having trouble logging into my account.'
    },
    {
      id: 'sales-demo',
      name: 'Sales Demo Request',
      description: 'Prospect interested in a product demo',
      initialMessage: 'I\'d like to schedule a demo of your platform.'
    },
    {
      id: 'billing-question',
      name: 'Billing Question',
      description: 'Customer asking about billing and invoices',
      initialMessage: 'Can you help me understand my latest invoice?'
    },
    {
      id: 'custom',
      name: 'Custom Scenario',
      description: 'Test with custom input',
      initialMessage: ''
    }
  ];

  // Load mock agents
  useEffect(() => {
    setAgents([
      {
        id: 'agent-1',
        name: 'Support Bot',
        type: 'customer_support',
        voiceEnabled: true
      },
      {
        id: 'agent-2',
        name: 'Sales Assistant',
        type: 'sales',
        voiceEnabled: true
      },
      {
        id: 'agent-3',
        name: 'Lead Qualifier',
        type: 'lead_gen',
        voiceEnabled: false
      }
    ]);
  }, []);

  // Call timer
  useEffect(() => {
    if (isCallActive && !isPaused) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isCallActive, isPaused]);

  // Audio level simulator
  useEffect(() => {
    if (isCallActive && !isPaused && !isMuted) {
      audioSimulatorRef.current = setInterval(() => {
        setAudioLevel(Math.random() * 100);
        setLatency(80 + Math.random() * 40); // 80-120ms
      }, 100);
    } else {
      setAudioLevel(0);
      if (audioSimulatorRef.current) {
        clearInterval(audioSimulatorRef.current);
      }
    }

    return () => {
      if (audioSimulatorRef.current) {
        clearInterval(audioSimulatorRef.current);
      }
    };
  }, [isCallActive, isPaused, isMuted]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleStartCall = () => {
    if (!selectedAgent) return;

    setIsCallActive(true);
    setCallDuration(0);
    setTranscript([]);
    setMetrics({
      avgLatency: 0,
      peakLatency: 0,
      wordCount: 0,
      turns: 0
    });

    // Simulate initial greeting
    setTimeout(() => {
      addTranscriptMessage('agent', `Hello! This is ${selectedAgent.name}. How can I help you today?`, 95);
    }, 1000);

    // If scenario selected, add initial message
    if (selectedScenario) {
      setTimeout(() => {
        addTranscriptMessage('user', selectedScenario.initialMessage, 102);
      }, 2500);

      // Simulate agent response
      setTimeout(() => {
        const responses = {
          'support-basic': 'I\'d be happy to explain our pricing plans. We have three tiers...',
          'support-technical': 'I can help you with that login issue. Let me check your account status...',
          'sales-demo': 'Great! I can schedule a demo for you. What time works best?',
          'billing-question': 'Of course! Let me pull up your invoice. Can you provide your account number?'
        };
        addTranscriptMessage('agent', responses[selectedScenario.id] || 'I understand. Let me assist you with that.', 88);
      }, 4000);
    }
  };

  const handleStopCall = () => {
    setIsCallActive(false);
    setIsPaused(false);
    setCallDuration(0);
    setAudioLevel(0);
    setLatency(0);
  };

  const addTranscriptMessage = (speaker, text, latencyMs) => {
    const newMessage = {
      id: Date.now(),
      speaker,
      text,
      timestamp: new Date().toLocaleTimeString(),
      latency: latencyMs
    };

    setTranscript(prev => [...prev, newMessage]);

    // Update metrics
    setMetrics(prev => ({
      avgLatency: (prev.avgLatency * prev.turns + latencyMs) / (prev.turns + 1),
      peakLatency: Math.max(prev.peakLatency, latencyMs),
      wordCount: prev.wordCount + text.split(' ').length,
      turns: prev.turns + 1
    }));
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25"
              whileHover={{ scale: 1.05 }}
            >
              <Phone className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white">Voice Test Playground</h1>
              <p className="text-white/50 text-sm">Test voice agents in browser</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <motion.div
            className="lg:col-span-1 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Agent Selection */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-orange-400" />
                Select Agent
              </h3>
              <div className="space-y-2">
                {agents.map((agent) => (
                  <motion.button
                    key={agent.id}
                    onClick={() => !isCallActive && setSelectedAgent(agent)}
                    disabled={!agent.voiceEnabled || isCallActive}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      selectedAgent?.id === agent.id
                        ? 'bg-orange-500 text-white'
                        : agent.voiceEnabled
                        ? 'bg-white/5 text-white/70 hover:bg-white/10'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}
                    whileHover={agent.voiceEnabled ? { scale: 1.02 } : {}}
                    whileTap={agent.voiceEnabled ? { scale: 0.98 } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{agent.name}</span>
                      {agent.voiceEnabled ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    <span className="text-xs opacity-60 mt-1 block">{agent.type}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Test Scenario */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Test Scenario
              </h3>
              <div className="relative">
                <motion.button
                  onClick={() => setShowScenarioDropdown(!showScenarioDropdown)}
                  disabled={isCallActive}
                  className="w-full px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 transition-all flex items-center justify-between disabled:opacity-40"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>{selectedScenario?.name || 'Select scenario...'}</span>
                  <ChevronDown className="w-4 h-4" />
                </motion.button>

                <AnimatePresence>
                  {showScenarioDropdown && (
                    <motion.div
                      className="absolute top-full mt-2 w-full bg-slate-800 rounded-xl border border-white/10 shadow-2xl overflow-hidden z-10 max-h-64 overflow-y-auto custom-scrollbar"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {testScenarios.map((scenario) => (
                        <button
                          key={scenario.id}
                          onClick={() => {
                            setSelectedScenario(scenario);
                            setShowScenarioDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                          <p className="text-white font-medium text-sm">{scenario.name}</p>
                          <p className="text-white/40 text-xs mt-1">{scenario.description}</p>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {selectedScenario && selectedScenario.id !== 'custom' && (
                <motion.div
                  className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <p className="text-blue-400 text-xs font-medium mb-1">Initial Message:</p>
                  <p className="text-white/60 text-sm">{selectedScenario.initialMessage}</p>
                </motion.div>
              )}
            </div>

            {/* Call Controls */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
              <h3 className="text-white font-semibold mb-4">Call Controls</h3>

              {!isCallActive ? (
                <motion.button
                  onClick={handleStartCall}
                  disabled={!selectedAgent}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-500/25"
                  whileHover={selectedAgent ? { scale: 1.05, boxShadow: "0 20px 40px rgba(34, 197, 94, 0.3)" } : {}}
                  whileTap={selectedAgent ? { scale: 0.95 } : {}}
                >
                  <Play className="w-5 h-5" />
                  Start Call
                </motion.button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => setIsPaused(!isPaused)}
                      className="flex-1 py-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </motion.button>
                    <motion.button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                        isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      {isMuted ? 'Muted' : 'Mute'}
                    </motion.button>
                  </div>
                  <motion.button
                    onClick={handleStopCall}
                    className="w-full py-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(239, 68, 68, 0.3)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Square className="w-5 h-5" />
                    End Call
                  </motion.button>
                </div>
              )}
            </div>

            {/* Audio Visualizer */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-400" />
                Audio Level
              </h3>
              <div className="flex items-center gap-2 h-20">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full"
                    animate={{
                      height: isCallActive && !isPaused && !isMuted
                        ? `${Math.max(10, (audioLevel / 100) * 100 * (0.5 + Math.random() * 0.5))}%`
                        : '10%'
                    }}
                    transition={{ duration: 0.1 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Transcript and Metrics */}
          <motion.div
            className="lg:col-span-2 space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Metrics */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <MetricCard
                icon={Clock}
                label="Call Duration"
                value={formatDuration(callDuration)}
                color="blue"
                active={isCallActive}
              />
              <MetricCard
                icon={Zap}
                label="Current Latency"
                value={`${Math.round(latency)}ms`}
                color="purple"
                active={isCallActive && !isPaused}
              />
              <MetricCard
                icon={Activity}
                label="Avg Latency"
                value={`${Math.round(metrics.avgLatency)}ms`}
                color="green"
                active={isCallActive}
              />
              <MetricCard
                icon={MessageSquare}
                label="Turns"
                value={metrics.turns}
                color="orange"
                active={isCallActive}
              />
            </motion.div>

            {/* Transcript */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                  Real-time Transcript
                </h3>
                {transcript.length > 0 && (
                  <motion.button
                    className="px-3 py-1.5 bg-white/5 rounded-lg text-white/70 hover:bg-white/10 transition-all text-sm flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Save className="w-3 h-3" />
                    Export
                  </motion.button>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
                <AnimatePresence mode="popLayout">
                  {transcript.length === 0 ? (
                    <motion.div
                      className="flex flex-col items-center justify-center h-full text-white/30"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <MessageSquare className="w-16 h-16 mb-4" />
                      <p>Start a call to see transcript...</p>
                    </motion.div>
                  ) : (
                    transcript.map((message, index) => (
                      <TranscriptMessage
                        key={message.id}
                        message={message}
                        index={index}
                      />
                    ))
                  )}
                </AnimatePresence>
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon: Icon, label, value, color, active }) {
  const colorMap = {
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-green-500 to-emerald-500',
    orange: 'from-orange-500 to-red-500'
  };

  const bgColorMap = {
    blue: 'bg-blue-500/10',
    purple: 'bg-purple-500/10',
    green: 'bg-green-500/10',
    orange: 'bg-orange-500/10'
  };

  return (
    <motion.div
      variants={fadeInUp}
      className={`p-4 rounded-xl bg-white/5 border border-white/5 ${active ? 'border-white/10' : ''}`}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <motion.div
          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}
          animate={active ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon className="w-4 h-4 text-white" />
        </motion.div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-white/50 text-xs">{label}</p>
    </motion.div>
  );
}

// Transcript Message Component
function TranscriptMessage({ message, index }) {
  const isAgent = message.speaker === 'agent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05 }}
      className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`max-w-[80%] ${isAgent ? 'order-1' : 'order-2'}`}>
        <div className={`p-4 rounded-2xl ${
          isAgent
            ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30'
            : 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-semibold ${
              isAgent ? 'text-purple-400' : 'text-orange-400'
            }`}>
              {isAgent ? 'Agent' : 'User'}
            </span>
            <span className="text-white/40 text-xs">{message.timestamp}</span>
            {message.latency && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                message.latency < 100
                  ? 'bg-green-500/20 text-green-400'
                  : message.latency < 150
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {Math.round(message.latency)}ms
              </span>
            )}
          </div>
          <p className="text-white text-sm leading-relaxed">{message.text}</p>
        </div>
      </div>
    </motion.div>
  );
}
