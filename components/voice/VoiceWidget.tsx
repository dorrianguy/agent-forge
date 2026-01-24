'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface VoiceWidgetConfig {
  agentId: string;
  apiKey: string;
  apiEndpoint?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  greeting?: string;
  title?: string;
  subtitle?: string;
  showTranscript?: boolean;
  enableMinimize?: boolean;
  autoExpand?: boolean;
  pulseAnimation?: boolean;
}

interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CallState {
  status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'processing' | 'ended' | 'error';
  duration: number;
  callId?: string;
  errorMessage?: string;
}

// WebSocket message types from the voice backend
type WebSocketMessage =
  | { type: 'authenticated'; callId: string }
  | { type: 'transcript'; role: 'user' | 'assistant'; text: string }
  | { type: 'status'; speaking?: boolean; processing?: boolean }
  | { type: 'audio'; audio: string }
  | { type: 'error'; message: string }
  | { type: 'ended' };

// ============================================================================
// Voice Widget Component
// ============================================================================

export const VoiceWidget: React.FC<VoiceWidgetConfig> = ({
  agentId,
  apiKey,
  apiEndpoint = '/api/voice',
  position = 'bottom-right',
  theme = 'dark',
  primaryColor = '#6366f1',
  greeting = 'Hi! Click the button to start a voice conversation.',
  title = 'Voice Assistant',
  subtitle = 'Powered by Agent Forge',
  showTranscript = true,
  enableMinimize = true,
  autoExpand = false,
  pulseAnimation = true,
}) => {
  // State
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callState, setCallState] = useState<CallState>({ status: 'idle', duration: 0 });
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Computed theme
  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'top-left': { top: 20, left: 20 },
  };

  // ============================================================================
  // Audio Processing
  // ============================================================================

  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });

      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Start audio level monitoring
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current && callState.status !== 'idle' && callState.status !== 'ended') {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      return stream;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    }
  }, [callState.status]);

  const cleanupAudio = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // ============================================================================
  // WebSocket Connection
  // ============================================================================

  const connectWebSocket = useCallback(async () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}${apiEndpoint}/ws/${agentId}`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      // Send authentication
      wsRef.current?.send(JSON.stringify({
        type: 'auth',
        apiKey,
        agentId
      }));
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setCallState(prev => ({ ...prev, status: 'error', errorMessage: 'Connection error' }));
    };

    wsRef.current.onclose = () => {
      if (callState.status !== 'idle' && callState.status !== 'ended') {
        setCallState(prev => ({ ...prev, status: 'ended' }));
      }
    };
  }, [apiEndpoint, agentId, apiKey, callState.status]);

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'authenticated':
        setCallState(prev => ({ ...prev, status: 'connected', callId: data.callId }));
        break;

      case 'transcript':
        setTranscript(prev => [...prev, {
          id: Date.now().toString(),
          role: data.role,
          content: data.text,
          timestamp: new Date()
        }]);
        break;

      case 'status':
        if (data.speaking) {
          setCallState(prev => ({ ...prev, status: 'speaking' }));
        } else if (data.processing) {
          setCallState(prev => ({ ...prev, status: 'processing' }));
        } else {
          setCallState(prev => ({ ...prev, status: 'listening' }));
        }
        break;

      case 'audio':
        // Handle incoming audio playback
        playAudio(data.audio);
        break;

      case 'error':
        setCallState(prev => ({ ...prev, status: 'error', errorMessage: data.message }));
        break;

      case 'ended':
        setCallState(prev => ({ ...prev, status: 'ended' }));
        break;
    }
  };

  const playAudio = async (base64Audio: string) => {
    try {
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      if (audioContextRef.current) {
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  // ============================================================================
  // Call Controls
  // ============================================================================

  const startCall = async () => {
    try {
      setCallState({ status: 'connecting', duration: 0 });
      setTranscript([]);

      await initializeAudio();
      await connectWebSocket();

      // Start duration timer
      timerRef.current = setInterval(() => {
        setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

    } catch (error) {
      console.error('Failed to start call:', error);
      setCallState({ status: 'error', duration: 0, errorMessage: 'Failed to start call' });
    }
  };

  const endCall = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
      wsRef.current.close();
      wsRef.current = null;
    }

    cleanupAudio();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setCallState(prev => ({ ...prev, status: 'ended' }));
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callState.status) {
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'speaking': return 'Assistant speaking...';
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'ended': return 'Call ended';
      case 'error': return callState.errorMessage || 'Error';
      default: return 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (callState.status) {
      case 'connected':
      case 'listening':
        return '#22c55e';
      case 'speaking':
        return primaryColor;
      case 'processing':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return isDark ? '#6b7280' : '#9ca3af';
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <AnimatePresence>
        {/* Floating Button */}
        {!isExpanded && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(true)}
            aria-label="Open voice assistant"
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
          >
            {/* Pulse animation */}
            {pulseAnimation && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: primaryColor,
                }}
              />
            )}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </motion.button>
        )}

        {/* Expanded Widget */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 'auto' : 480
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              width: 360,
              background: isDark ? '#1f2937' : '#ffffff',
              borderRadius: 16,
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              background: isDark ? '#111827' : '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: isDark ? '#f9fafb' : '#111827'
                }}>
                  {title}
                </h3>
                <p style={{
                  margin: '4px 0 0',
                  fontSize: 12,
                  color: isDark ? '#9ca3af' : '#6b7280'
                }}>
                  {subtitle}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {enableMinimize && (
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    aria-label={isMinimized ? 'Expand widget' : 'Minimize widget'}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDark ? '#9ca3af' : '#6b7280',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      {isMinimized ? (
                        <path d="M19 13H5v-2h14v2z"/>
                      ) : (
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                      )}
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => {
                    endCall();
                    setIsExpanded(false);
                  }}
                  aria-label="Close voice assistant"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDark ? '#9ca3af' : '#6b7280',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <>
                {/* Status Bar */}
                <div style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <motion.div
                      animate={{ scale: callState.status === 'listening' ? [1, 1.2, 1] : 1 }}
                      transition={{ duration: 1, repeat: callState.status === 'listening' ? Infinity : 0 }}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: getStatusColor(),
                      }}
                    />
                    <span style={{
                      fontSize: 13,
                      color: isDark ? '#d1d5db' : '#4b5563'
                    }}>
                      {getStatusText()}
                    </span>
                  </div>
                  {(callState.status !== 'idle' && callState.status !== 'error') && (
                    <span style={{
                      fontSize: 13,
                      fontVariantNumeric: 'tabular-nums',
                      color: isDark ? '#9ca3af' : '#6b7280'
                    }}>
                      {formatDuration(callState.duration)}
                    </span>
                  )}
                </div>

                {/* Transcript Area */}
                {showTranscript && (
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}>
                    {transcript.length === 0 && callState.status === 'idle' && (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: isDark ? '#9ca3af' : '#6b7280',
                      }}>
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          style={{ opacity: 0.5, marginBottom: 16 }}
                        >
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                        <p style={{ margin: 0, fontSize: 14 }}>{greeting}</p>
                      </div>
                    )}

                    {transcript.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div style={{
                          maxWidth: '85%',
                          padding: '10px 14px',
                          borderRadius: 12,
                          background: msg.role === 'user'
                            ? primaryColor
                            : (isDark ? '#374151' : '#e5e7eb'),
                          color: msg.role === 'user'
                            ? '#ffffff'
                            : (isDark ? '#f3f4f6' : '#1f2937'),
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}>
                          {msg.content}
                        </div>
                        <span style={{
                          fontSize: 10,
                          color: isDark ? '#6b7280' : '#9ca3af',
                          marginTop: 4,
                        }}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </motion.div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                )}

                {/* Audio Visualizer */}
                {(callState.status === 'connected' || callState.status === 'listening' || callState.status === 'speaking') && (
                  <div style={{
                    padding: '0 20px 16px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 3,
                    height: 40,
                  }}>
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: callState.status === 'listening'
                            ? Math.max(4, audioLevel * 30 * Math.random())
                            : (callState.status === 'speaking' ? 15 + Math.sin(Date.now() / 100 + i) * 10 : 4),
                        }}
                        transition={{ duration: 0.1 }}
                        style={{
                          width: 3,
                          background: primaryColor,
                          borderRadius: 2,
                          minHeight: 4,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Controls */}
                <div style={{
                  padding: '16px 20px',
                  borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 16,
                }}>
                  {callState.status === 'idle' || callState.status === 'ended' || callState.status === 'error' ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startCall}
                      aria-label="Start voice call"
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        border: 'none',
                        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 20px ${primaryColor}40`,
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    </motion.button>
                  ) : (
                    <>
                      {/* Mute Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleMute}
                        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                        aria-pressed={isMuted}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          border: 'none',
                          background: isMuted ? '#ef4444' : (isDark ? '#374151' : '#e5e7eb'),
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isMuted ? '#ffffff' : (isDark ? '#d1d5db' : '#4b5563'),
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          {isMuted ? (
                            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                          ) : (
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          )}
                        </svg>
                      </motion.button>

                      {/* End Call Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={endCall}
                        aria-label="End voice call"
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          border: 'none',
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
                        }}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                          <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                        </svg>
                      </motion.button>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Embed Script Generator
// ============================================================================

export const generateEmbedScript = (config: VoiceWidgetConfig): string => {
  return `
<!-- Agent Forge Voice Widget -->
<script>
(function() {
  var config = ${JSON.stringify(config, null, 2)};

  var script = document.createElement('script');
  script.src = 'https://your-domain.com/voice-widget.js';
  script.async = true;
  script.onload = function() {
    window.AgentForgeVoice.init(config);
  };
  document.head.appendChild(script);
})();
</script>
  `.trim();
};

// ============================================================================
// Hook for programmatic control
// ============================================================================

export const useVoiceWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
};

export default VoiceWidget;
