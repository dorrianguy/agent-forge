'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2, VolumeX, X, Loader2 } from 'lucide-react';

interface VoiceAssistantProps {
  userName?: string;
  onNavigate?: (destination: string) => void;
  autoGreet?: boolean;
}

type ListeningState = 'idle' | 'listening' | 'processing' | 'speaking';

// Browser speech recognition types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export default function VoiceAssistant({ userName, onNavigate, autoGreet = true }: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ListeningState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Refs for state access in callbacks (fixes stale closure bug)
  const stateRef = useRef<ListeningState>('idle');
  const isOpenRef = useRef(false);
  const isMutedRef = useRef(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Clean up audio URL to prevent memory leaks
  const cleanupAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // Speak text using TTS API with fallback to browser
  const speak = useCallback(async (text: string) => {
    if (isMutedRef.current) return;

    setState('speaking');
    setResponse(text);

    // Clean up previous audio
    cleanupAudioUrl();

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova', speed: 1.0 }),
      });

      if (res.ok) {
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          cleanupAudioUrl();
          setState('listening');
          startListening();
        };

        audio.onerror = () => {
          cleanupAudioUrl();
          setState('listening');
          startListening();
        };

        await audio.play();
        return;
      }
    } catch {
      // TTS unavailable, fall through to browser TTS
    }

    // Fallback to browser TTS
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setState('listening');
      startListening();
    };

    utterance.onerror = () => {
      setState('listening');
      startListening();
    };

    window.speechSynthesis.speak(utterance);
  }, [cleanupAudioUrl]);

  // Initialize speech recognition
  const startListening = useCallback(() => {
    // Check for browser support
    const SpeechRecognitionAPI = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance; SpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition ||
                                  (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition;

    if (!SpeechRecognitionAPI) {
      return;
    }

    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        handleVoiceCommand(finalTranscript.toLowerCase().trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech') {
        setState('idle');
      }
    };

    recognition.onend = () => {
      // Use refs instead of state to avoid stale closure
      if (stateRef.current === 'listening' && isOpenRef.current && !isMutedRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch {
            // Already started
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      // Already started
    }
  }, []);

  // Handle voice commands
  const handleVoiceCommand = useCallback((command: string) => {
    setState('processing');
    setTranscript(command);

    // Parse intent
    let responseText = '';

    if (command.includes('text') || command.includes('chat') || command.includes('chatbot')) {
      responseText = 'Great choice! I\'ll take you to the text agent builder. You can create chatbots for customer support, sales, or any other purpose.';
      setTimeout(() => onNavigate?.('/build'), 2000);
    } else if (command.includes('voice') || command.includes('call') || command.includes('phone')) {
      responseText = 'Perfect! Let\'s build a voice agent. I\'ll take you to the voice agent builder where you can create AI that handles phone calls.';
      setTimeout(() => onNavigate?.('/build/voice'), 2000);
    } else if (command.includes('support') || command.includes('customer')) {
      responseText = 'A customer support agent is a great choice! Let me take you to the builder where you can customize how your agent handles inquiries.';
      setTimeout(() => onNavigate?.('/build'), 2000);
    } else if (command.includes('sales')) {
      responseText = 'A sales agent can really boost your conversions! I\'ll take you to the builder to set up your AI sales assistant.';
      setTimeout(() => onNavigate?.('/build'), 2000);
    } else if (command.includes('help') || command.includes('what can you do')) {
      responseText = 'I can help you build AI agents! Just say "text agent" for chatbots, "voice agent" for phone calls, or tell me what kind of agent you need like "customer support" or "sales agent".';
    } else if (command.includes('close') || command.includes('bye') || command.includes('stop') || command.includes('quiet')) {
      responseText = 'Okay, I\'ll be here if you need me. Just click the microphone icon to talk again.';
      setTimeout(() => setIsOpen(false), 2000);
    } else {
      responseText = `I heard "${command}". Would you like to build a text agent for chat, or a voice agent for phone calls? Just say "text agent" or "voice agent".`;
    }

    speak(responseText);
  }, [speak, onNavigate]);

  // Stop everything
  const stopAll = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    window.speechSynthesis.cancel();
    setState('idle');
  }, []);

  // Toggle assistant
  const toggleAssistant = useCallback(() => {
    if (isOpen) {
      stopAll();
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setHasGreeted(false);
    }
  }, [isOpen, stopAll]);

  // Auto-greet when opened
  useEffect(() => {
    if (isOpen && !hasGreeted && autoGreet) {
      setHasGreeted(true);
      const greeting = userName
        ? `Welcome to Agent Forge, ${userName}! What kind of agent do you want to build today? You can say text agent for chatbots, or voice agent for phone calls.`
        : 'Welcome to Agent Forge! What kind of agent do you want to build today? You can say text agent for chatbots, or voice agent for phone calls.';

      setTimeout(() => speak(greeting), 500);
    }
  }, [isOpen, hasGreeted, autoGreet, userName, speak]);

  // Auto-open on first load
  useEffect(() => {
    if (!autoGreet) {
      return;
    }
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [autoGreet]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopAll();
      cleanupAudioUrl();
    };
  }, [stopAll, cleanupAudioUrl]);

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={toggleAssistant}
        aria-label={isOpen ? 'Close voice assistant' : 'Open voice assistant'}
        aria-expanded={isOpen}
        aria-controls="voice-assistant-panel"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isOpen
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={state === 'listening' ? { boxShadow: ['0 0 0 0 rgba(249, 115, 22, 0.4)', '0 0 0 20px rgba(249, 115, 22, 0)'] } : {}}
        transition={state === 'listening' ? { duration: 1.5, repeat: Infinity } : {}}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" aria-hidden="true" />
        ) : (
          <Mic className="w-6 h-6 text-white" aria-hidden="true" />
        )}
      </motion.button>

      {/* Voice Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="voice-assistant-panel"
            role="dialog"
            aria-label="Voice Assistant"
            aria-live="polite"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      state === 'speaking' ? 'bg-blue-400 animate-pulse' :
                      state === 'listening' ? 'bg-green-400 animate-pulse' :
                      state === 'processing' ? 'bg-yellow-400 animate-pulse' :
                      'bg-white/30'
                    }`}
                    role="status"
                    aria-label={`Voice assistant is ${state}`}
                  />
                  <span className="text-white/70 text-sm font-medium">
                    {state === 'speaking' ? 'Speaking...' :
                     state === 'listening' ? 'Listening...' :
                     state === 'processing' ? 'Processing...' :
                     'Voice Assistant'}
                  </span>
                </div>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  aria-label={isMuted ? 'Unmute voice assistant' : 'Mute voice assistant'}
                  aria-pressed={isMuted}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-white/50" aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white/50" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 min-h-[120px]">
              {/* Visualization */}
              <div className="flex items-center justify-center mb-4">
                {state === 'listening' && (
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-orange-500 to-red-500 rounded-full"
                        animate={{
                          height: [8, 24, 8],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                )}
                {state === 'speaking' && (
                  <div className="flex items-center gap-1">
                    {[...Array(7)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-blue-500 to-cyan-500 rounded-full"
                        animate={{
                          height: [4, 20, 4],
                        }}
                        transition={{
                          duration: 0.3,
                          repeat: Infinity,
                          delay: i * 0.05,
                        }}
                      />
                    ))}
                  </div>
                )}
                {state === 'processing' && (
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                )}
                {state === 'idle' && (
                  <Mic className="w-8 h-8 text-white/20" />
                )}
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="mb-3 p-2 rounded-lg bg-white/5">
                  <p className="text-white/50 text-xs mb-1">You said:</p>
                  <p className="text-white text-sm">{transcript}</p>
                </div>
              )}

              {/* Response */}
              {response && (
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <p className="text-orange-400 text-xs mb-1">Assistant:</p>
                  <p className="text-white/80 text-sm">{response}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/5 bg-white/5">
              <p className="text-white/40 text-xs text-center">
                {state === 'listening'
                  ? 'Speak now...'
                  : 'Say "text agent" or "voice agent" to get started'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
