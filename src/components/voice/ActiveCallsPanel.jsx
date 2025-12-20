/**
 * ActiveCallsPanel - Real-time call monitoring
 * Features: WebSocket connection, active calls list, live transcripts, call controls
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  ArrowRightLeft,
  Clock,
  User,
  Radio,
  MessageSquare
} from 'lucide-react';

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

function CallTimer({ startTime }) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <span className="font-mono">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

function ActiveCallItem({ call, onMute, onTransfer, onEnd }) {
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const handleMute = () => {
    setIsMuted(!isMuted);
    onMute?.(call.id, !isMuted);
  };

  return (
    <motion.div
      variants={fadeInUp}
      className="relative p-4 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all overflow-hidden group"
      whileHover={{ y: -2 }}
    >
      {/* Active call pulse background */}
      <motion.div
        className="absolute inset-0 bg-purple-500/5"
        animate={{
          opacity: [0.05, 0.1, 0.05]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 relative"
              animate={{
                boxShadow: [
                  "0 4px 20px rgba(168, 85, 247, 0.2)",
                  "0 4px 30px rgba(168, 85, 247, 0.4)",
                  "0 4px 20px rgba(168, 85, 247, 0.2)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <User className="w-5 h-5 text-white" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-purple-400"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            <div>
              <h4 className="text-white font-medium">{call.caller || 'Unknown Caller'}</h4>
              <p className="text-white/50 text-xs">{call.phoneNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
              call.status === 'in_progress'
                ? 'bg-purple-500/20 text-purple-400'
                : call.status === 'ringing'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-green-500/20 text-green-400'
            }`}>
              <Radio className="w-3 h-3" />
              {call.status}
            </span>
          </div>
        </div>

        {/* Call Duration */}
        <div className="flex items-center gap-2 mb-3 text-white/70 text-sm">
          <Clock className="w-4 h-4" />
          <CallTimer startTime={call.startTime} />
          <span className="text-white/40 ml-auto text-xs">{call.direction}</span>
        </div>

        {/* Live Transcript Preview */}
        {call.transcript && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: showTranscript ? 'auto' : 60,
              opacity: 1
            }}
            className="mb-3 p-3 rounded-lg bg-black/20 border border-white/5 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-white/60 text-xs font-medium">Live Transcript</span>
              <motion.button
                onClick={() => setShowTranscript(!showTranscript)}
                className="ml-auto text-purple-400 text-xs hover:text-purple-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {showTranscript ? 'Show less' : 'Show more'}
              </motion.button>
            </div>
            <div className={`text-white/70 text-sm leading-relaxed ${!showTranscript && 'line-clamp-2'}`}>
              {call.transcript}
              {!showTranscript && call.transcript.length > 100 && (
                <motion.span
                  className="inline-block w-1.5 h-4 bg-purple-400 ml-1"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
          </motion.div>
        )}

        {/* Call Controls */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleMute}
            className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </motion.button>

          <motion.button
            onClick={() => onTransfer?.(call.id)}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white font-medium text-sm flex items-center justify-center gap-2 transition-all border border-white/5"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transfer
          </motion.button>

          <motion.button
            onClick={() => onEnd?.(call.id)}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium text-sm flex items-center justify-center gap-2 transition-all border border-red-500/30"
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 68, 68, 0.3)' }}
            whileTap={{ scale: 0.98 }}
          >
            <PhoneOff className="w-4 h-4" />
            End
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function ActiveCallsPanel({ agentId, onCallEnd }) {
  const [activeCalls, setActiveCalls] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Simulate WebSocket connection and live data
  useEffect(() => {
    // Simulated connection
    const connectTimer = setTimeout(() => setWsConnected(true), 500);

    // Mock active calls data
    const mockCalls = [
      {
        id: 'call-1',
        caller: 'Sarah Johnson',
        phoneNumber: '+1 (555) 234-5678',
        status: 'in_progress',
        direction: 'inbound',
        startTime: Date.now() - 45000,
        transcript: 'Hi, I need help with my account. I\'m trying to reset my password but I\'m not receiving the email...'
      },
      {
        id: 'call-2',
        caller: 'Michael Chen',
        phoneNumber: '+1 (555) 876-5432',
        status: 'in_progress',
        direction: 'outbound',
        startTime: Date.now() - 120000,
        transcript: 'Thank you for calling! Yes, I can help you with that subscription upgrade. Let me pull up your account details...'
      }
    ];

    setActiveCalls(mockCalls);

    return () => {
      clearTimeout(connectTimer);
    };
  }, [agentId]);

  const handleMute = (callId, muted) => {
    console.log(`Call ${callId} ${muted ? 'muted' : 'unmuted'}`);
  };

  const handleTransfer = (callId) => {
    console.log(`Transfer call ${callId}`);
  };

  const handleEnd = (callId) => {
    setActiveCalls(prev => prev.filter(call => call.id !== callId));
    onCallEnd?.(callId);
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center"
            animate={{
              boxShadow: wsConnected
                ? [
                    "0 10px 40px rgba(168, 85, 247, 0.25)",
                    "0 10px 60px rgba(168, 85, 247, 0.4)",
                    "0 10px 40px rgba(168, 85, 247, 0.25)"
                  ]
                : "0 10px 40px rgba(168, 85, 247, 0.25)"
            }}
            transition={{ duration: 2, repeat: wsConnected ? Infinity : 0 }}
          >
            <Phone className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold text-white">Active Calls</h3>
            <p className="text-white/50 text-sm">
              {wsConnected ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live monitoring
                </span>
              ) : (
                'Connecting...'
              )}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-white">{activeCalls.length}</p>
          <p className="text-white/50 text-xs">active now</p>
        </div>
      </div>

      <motion.div
        className="space-y-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {activeCalls.length > 0 ? (
            activeCalls.map(call => (
              <ActiveCallItem
                key={call.id}
                call={call}
                onMute={handleMute}
                onTransfer={handleTransfer}
                onEnd={handleEnd}
              />
            ))
          ) : (
            <motion.div
              variants={fadeInUp}
              className="text-center py-12"
            >
              <motion.div
                className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 0.7, 0.5]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Phone className="w-8 h-8 text-white/40" />
              </motion.div>
              <p className="text-white/50 text-sm">No active calls</p>
              <p className="text-white/30 text-xs mt-1">Waiting for incoming calls...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
