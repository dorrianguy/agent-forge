# Agent Forge - Updated Codebase for Review

Please review these UPDATED files for any remaining issues.
These files have been fixed for: security, rate limiting, TypeScript types, accessibility, error handling, and memory leaks.

---

## app/api/checkout/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// Price IDs - MUST be configured in environment
const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

function validatePriceIds(): boolean {
  const missing = Object.entries(PRICE_IDS)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    logger.error('Missing Stripe price IDs', undefined, { missing });
    return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 10 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') || 'unknown';

    const rateLimitResult = checkRateLimit(`checkout:${ip}`, {
      maxRequests: 10,
      windowMs: 60000,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Verify authentication using Supabase server client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('Unauthorized checkout attempt', { ip });
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!validatePriceIds()) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { plan, pendingAgentId } = body;

    if (!plan || !PRICE_IDS[plan]) {
      logger.warn('Invalid plan selected', { plan, userId: user.id });
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl && process.env.NODE_ENV === 'production') {
      logger.error('NEXT_PUBLIC_APP_URL not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const baseUrl = appUrl || 'http://localhost:3000';

    // Create checkout session with VERIFIED user data
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[plan]!, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        plan,
        pendingAgentId: pendingAgentId || '',
      },
      subscription_data: {
        metadata: { userId: user.id, plan },
      },
    });

    logger.info('Checkout session created', { userId: user.id, plan, sessionId: session.id });

    return NextResponse.json(
      { sessionId: session.id, url: session.url },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    logger.error('Stripe checkout error', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

```

---

## app/api/tts/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

const VOICE_MAP: Record<string, OpenAIVoice> = {
  'alloy': 'alloy',
  'echo': 'echo',
  'fable': 'fable',
  'nova': 'nova',
  'rachel': 'nova',
  'adam': 'onyx',
  'bella': 'shimmer',
};

const MAX_TEXT_LENGTH = 4096;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 20 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') || 'unknown';

    const rateLimitResult = checkRateLimit(`tts:${ip}`, {
      maxRequests: 20,
      windowMs: 60000,
    });

    if (!rateLimitResult.success) {
      logger.warn('TTS rate limit exceeded', { ip });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();
    const { text, voice, speed } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const sanitizedText = text.trim();
    if (sanitizedText.length === 0) {
      return NextResponse.json({ error: 'Text cannot be empty' }, { status: 400 });
    }

    if (sanitizedText.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text too long. Maximum ${MAX_TEXT_LENGTH} characters.` },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured');
      return NextResponse.json({ error: 'TTS service not available' }, { status: 503 });
    }

    const voiceKey = typeof voice === 'string' ? voice.toLowerCase() : 'nova';
    const openaiVoice: OpenAIVoice = VOICE_MAP[voiceKey] || 'nova';
    const speedValue = typeof speed === 'number' ? speed : 1.0;
    const clampedSpeed = Math.min(Math.max(speedValue, 0.25), 4.0);

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: openaiVoice,
      input: sanitizedText,
      speed: clampedSpeed,
    });

    const audioBuffer = await mp3Response.arrayBuffer();

    logger.debug('TTS generated', { textLength: sanitizedText.length, voice: openaiVoice });

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600',
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        logger.warn('OpenAI rate limit exceeded');
        return NextResponse.json({ error: 'TTS temporarily unavailable' }, { status: 503 });
      }
      if (error.status === 401) {
        logger.error('OpenAI authentication failed');
        return NextResponse.json({ error: 'TTS configuration error' }, { status: 503 });
      }
    }
    logger.error('TTS error', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}

```

---

## app/api/webhooks/stripe/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  sendWelcomeEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from '@/lib/emailService';
import { logger } from '@/lib/logger';
import { shouldProcessEvent } from '@/lib/idempotency';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Helper to get customer details
async function getCustomerDetails(customerId: string): Promise<{ email: string; name: string } | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }
    return {
      email: customer.email || '',
      name: customer.name || 'there',
    };
  } catch (error) {
    logger.error('Error fetching customer', error, { customerId });
    return null;
  }
}

// Helper to format plan name
function formatPlanName(plan: string): string {
  const planNames: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };
  return planNames[plan.toLowerCase()] || plan;
}

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    logger.warn('Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    logger.error('Webhook signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency check - prevent duplicate processing
  if (!shouldProcessEvent(event.id)) {
    logger.info('Duplicate event skipped', { eventId: event.id, eventType: event.type });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerDetails = await getCustomerDetails(session.customer as string);
        if (!customerDetails) {
          logger.error('Could not retrieve customer details', undefined, { eventId: event.id });
          break;
        }

        const plan = session.metadata?.plan || 'unknown';
        const formattedPlan = formatPlanName(plan);

        await sendWelcomeEmail(customerDetails.email, customerDetails.name, formattedPlan);
        logger.info('Welcome email sent', { email: customerDetails.email, plan: formattedPlan, eventId: event.id });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerDetails = await getCustomerDetails(invoice.customer as string);
        if (!customerDetails) {
          logger.error('Could not retrieve customer details', undefined, { eventId: event.id });
          break;
        }

        let plan = 'Subscription';
        const subscriptionId = invoice.subscription;
        if (subscriptionId && typeof subscriptionId === 'string') {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            plan = formatPlanName(subscription.metadata?.plan || 'subscription');
          } catch (error) {
            logger.error('Error fetching subscription', error, { subscriptionId });
          }
        }

        await sendPaymentSuccessEmail(customerDetails.email, customerDetails.name, invoice.amount_paid, plan, invoice.hosted_invoice_url || undefined);
        logger.info('Payment success email sent', { email: customerDetails.email, eventId: event.id });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerDetails = await getCustomerDetails(invoice.customer as string);
        if (!customerDetails) {
          logger.error('Could not retrieve customer details', undefined, { eventId: event.id });
          break;
        }

        let plan = 'Subscription';
        let retryDate: string | undefined;

        const failedSubId = invoice.subscription;
        if (failedSubId && typeof failedSubId === 'string') {
          try {
            const subscription = await stripe.subscriptions.retrieve(failedSubId);
            plan = formatPlanName(subscription.metadata?.plan || 'subscription');
            if (invoice.next_payment_attempt) {
              retryDate = new Date(invoice.next_payment_attempt * 1000).toLocaleDateString();
            }
          } catch (error) {
            logger.error('Error fetching subscription', error, { subscriptionId: failedSubId });
          }
        }

        await sendPaymentFailedEmail(customerDetails.email, customerDetails.name, invoice.amount_due, plan, retryDate);
        logger.info('Payment failed email sent', { email: customerDetails.email, eventId: event.id });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerDetails = await getCustomerDetails(subscription.customer as string);
        if (!customerDetails) {
          logger.error('Could not retrieve customer details', undefined, { eventId: event.id });
          break;
        }

        const plan = formatPlanName(subscription.metadata?.plan || 'subscription');
        const endDate = new Date(subscription.current_period_end * 1000).toLocaleDateString();

        await sendSubscriptionCanceledEmail(customerDetails.email, customerDetails.name, plan, endDate);
        logger.info('Subscription canceled email sent', { email: customerDetails.email, eventId: event.id });
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        logger.info('New subscription created', { subscriptionId: subscription.id, eventId: event.id });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        logger.info('Subscription updated', { subscriptionId: subscription.id, eventId: event.id });
        break;
      }

      default:
        logger.debug('Unhandled event type', { eventType: event.type, eventId: event.id });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', error, { eventId: event.id });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

```

---

## components/VoiceAssistant.tsx

```typescript
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
    if (autoGreet) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
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

```

---

## components/ErrorBoundary.tsx

```typescript
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (Sentry, etc.)
    }
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
          <p className="text-white/60 text-sm text-center mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;

```

---

## components/dashboard/StatCard.tsx

```typescript
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'yellow';
  trend: string;
}

const colorMap: Record<string, string> = {
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-green-500 to-emerald-500',
  purple: 'from-purple-500 to-pink-500',
  yellow: 'from-yellow-500 to-orange-500'
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function StatCard({ title, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <motion.div
      className="relative p-5 rounded-2xl bg-white/5 border border-white/5 overflow-hidden group"
      variants={fadeInUp}
      whileHover={{ y: -4 }}
    >
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div className="text-white/40 text-xs">{trend}</div>
        </div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm text-white/50">{title}</p>
      </div>
    </motion.div>
  );
}

```

---

## components/dashboard/AgentCard.tsx

```typescript
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Clock, ChevronRight } from 'lucide-react';
import type { Agent } from '@/lib/supabase';

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${agent.name}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="relative p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 cursor-pointer group overflow-hidden"
      whileHover={{ y: -4 }}
    >
      <div className="relative">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Bot className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{agent.name}</h3>
            <p className="text-xs text-white/50 capitalize">{agent.type.replace('_', ' ')}</p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              agent.status === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}
            role="status"
          >
            {agent.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />}
            {agent.status === 'live' ? 'Live' : 'Ready'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-white font-medium">{(agent.conversations || 0).toLocaleString()}</p>
            <p className="text-white/40 text-xs">conversations</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-white font-medium">{agent.satisfaction || 0}%</p>
            <p className="text-white/40 text-xs">satisfaction</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-white/40 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {agent.last_active ? new Date(agent.last_active).toLocaleDateString() : 'Just created'}
          </span>
          <span className="text-orange-400 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View details <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

```

---

## lib/logger.ts

```typescript
/**
 * Production-ready logger utility
 * Replaces console.log with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

const isDev = process.env.NODE_ENV === 'development';

function formatLog(entry: LogEntry): string {
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${dataStr}`;
}

function createLogEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    if (isDev) {
      const entry = createLogEntry('debug', message, data);
      console.debug(formatLog(entry));
    }
  },

  info(message: string, data?: Record<string, unknown>) {
    const entry = createLogEntry('info', message, data);
    if (isDev) {
      console.info(formatLog(entry));
    }
    // In production, send to logging service (e.g., Datadog, LogDNA)
  },

  warn(message: string, data?: Record<string, unknown>) {
    const entry = createLogEntry('warn', message, data);
    console.warn(formatLog(entry));
  },

  error(message: string, error?: unknown, data?: Record<string, unknown>) {
    const errorData = error instanceof Error
      ? { errorMessage: error.message, stack: error.stack, ...data }
      : { error, ...data };
    const entry = createLogEntry('error', message, errorData);
    console.error(formatLog(entry));
  },
};

export default logger;

```

---

## lib/rateLimit.ts

```typescript
/**
 * Simple in-memory rate limiter for API routes
 * For production, use Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
}

```

---

## lib/idempotency.ts

```typescript
/**
 * Idempotency tracking for webhook events
 * Prevents duplicate processing of the same event
 * For production, use Redis or database storage
 */

interface ProcessedEvent {
  processedAt: number;
}

// In-memory store for processed events (use Redis in production)
const processedEvents = new Map<string, ProcessedEvent>();

// TTL for processed events (24 hours)
const EVENT_TTL_MS = 24 * 60 * 60 * 1000;

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of processedEvents.entries()) {
    if (now - entry.processedAt > EVENT_TTL_MS) {
      processedEvents.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Check if an event has already been processed
 * @param eventId - Unique event identifier (e.g., Stripe event ID)
 * @returns true if event was already processed
 */
export function isEventProcessed(eventId: string): boolean {
  return processedEvents.has(eventId);
}

/**
 * Mark an event as processed
 * @param eventId - Unique event identifier
 */
export function markEventProcessed(eventId: string): void {
  processedEvents.set(eventId, {
    processedAt: Date.now(),
  });
}

/**
 * Combined check and mark for atomic operation
 * @param eventId - Unique event identifier
 * @returns true if event should be processed (wasn't already processed)
 */
export function shouldProcessEvent(eventId: string): boolean {
  if (isEventProcessed(eventId)) {
    return false;
  }
  markEventProcessed(eventId);
  return true;
}

```

---

## hooks/useAnimatedCounter.ts

```typescript
import { useState, useEffect } from 'react';

/**
 * Hook that animates a number from 0 to the target value
 * @param target - The target number to animate to
 * @param duration - Animation duration in milliseconds
 */
export function useAnimatedCounter(target: number, duration = 1000): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [target, duration]);

  return count;
}

export default useAnimatedCounter;

```

---

## app/dashboard/page.tsx

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Bot, MessageSquare, BarChart3, Star, Plus, X,
  Settings, Activity, Clock, Sparkles, Copy,
  Check, Play, Pause, LogOut, CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, getProfile, getAgents, updateAgent, signOut, savePendingAgentToDb } from '@/lib/auth';
import type { Profile, Agent } from '@/lib/supabase';
import VoiceAssistant from '@/components/VoiceAssistant';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import StatCard from '@/components/dashboard/StatCard';
import AgentCard from '@/components/dashboard/AgentCard';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

// Animation variants
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState('agents');
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Check auth and load data
  useEffect(() => {
    async function loadData() {
      try {
        const user = await getUser();
        if (!user) {
          router.push('/login?redirect=/dashboard');
          return;
        }

        // Load profile first to check subscription
        const profileData = await getProfile();

        // HARD PAYWALL: Only paid users can access dashboard
        // No agents leave before payment is secured
        if (!profileData || profileData.plan === 'free' || !profileData.plan) {
          router.push('/pricing?required=true');
          return;
        }

        // Save any pending agent from the builder (only after payment confirmed)
        await savePendingAgentToDb();

        // Load agents
        const agentsData = await getAgents();

        setProfile(profileData);
        setAgents(agentsData);
      } catch {
        router.push('/login?redirect=/dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Calculate stats
  const stats = {
    totalAgents: agents.length,
    activeConversations: agents.reduce((sum, a) => sum + (a.conversations || 0), 0),
    messagesThisMonth: agents.reduce((sum, a) => sum + (a.conversations || 0) * 12, 0),
    satisfaction: agents.length > 0
      ? Math.round(agents.reduce((sum, a) => sum + (a.satisfaction || 0), 0) / agents.length)
      : 0
  };

  const animatedAgents = useAnimatedCounter(stats.totalAgents, 800);
  const animatedConversations = useAnimatedCounter(stats.activeConversations, 1000);
  const animatedMessages = useAnimatedCounter(stats.messagesThisMonth, 1500);
  const animatedSatisfaction = useAnimatedCounter(stats.satisfaction, 1200);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const copyEmbedCode = (agentId: string) => {
    navigator.clipboard.writeText(`<script src="https://agent-forge.app/widget/${agentId}"></script>`);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  const toggleAgentStatus = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const newStatus = agent.status === 'live' ? 'paused' : 'live';

    try {
      await updateAgent(agentId, { status: newStatus });
      setAgents(prev => prev.map(a =>
        a.id === agentId ? { ...a, status: newStatus } : a
      ));
      if (selectedAgent?.id === agentId) {
        setSelectedAgent({ ...selectedAgent, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update agent status:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Flame className="w-6 h-6 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -top-48 -left-48"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-48 -right-48"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 25, repeat: Infinity }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <motion.div
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25"
                  whileHover={{ scale: 1.05 }}
                >
                  <Flame className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-xl font-bold">Agent Forge</h1>
                  <p className="text-xs text-white/50">Dashboard</p>
                </div>
              </Link>

              <div className="flex items-center gap-4">
                {/* Navigation Tabs */}
                <nav className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg p-1">
                  {['agents', 'analytics', 'settings'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        activeTab === tab
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </nav>

                <Link href="/build">
                  <motion.button
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/25"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-4 h-4" />
                    New Agent
                  </motion.button>
                </Link>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-medium"
                  >
                    {profile?.name?.charAt(0).toUpperCase() || 'U'}
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-12 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden"
                      >
                        <div className="p-4 border-b border-white/5">
                          <p className="text-white font-medium">{profile?.name}</p>
                          <p className="text-white/50 text-sm">{profile?.email}</p>
                          <span className="inline-block mt-2 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded capitalize">
                            {profile?.plan || 'free'} plan
                          </span>
                        </div>
                        <div className="p-2">
                          <Link href="/billing" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition">
                            <CreditCard className="w-4 h-4 text-white/50" />
                            <span className="text-white/70">Billing</span>
                          </Link>
                          <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition">
                            <Settings className="w-4 h-4 text-white/50" />
                            <span className="text-white/70">Settings</span>
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition text-red-400"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Welcome Message */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold text-white">
              Welcome back, {profile?.name?.split(' ')[0] || 'there'}!
            </h2>
            <p className="text-white/50">Here's what's happening with your agents.</p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <StatCard title="Total Agents" value={animatedAgents} icon={Bot} color="blue" trend={`${agents.length} active`} />
            <StatCard title="Total Conversations" value={animatedConversations} icon={MessageSquare} color="green" trend="All time" />
            <StatCard title="Messages This Month" value={animatedMessages.toLocaleString()} icon={BarChart3} color="purple" trend="Current period" />
            <StatCard title="Satisfaction Rate" value={`${animatedSatisfaction}%`} icon={Star} color="yellow" trend="Average" />
          </motion.div>

          {/* Agents Section */}
          <motion.div className="mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Your Agents</h2>
                <p className="text-white/50 text-sm mt-1">Manage and monitor your AI workforce</p>
              </div>
            </div>

            {agents.length === 0 ? (
              <motion.div className="text-center py-16 rounded-2xl bg-white/5 border border-white/5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Bot className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No agents yet</h3>
                <p className="text-white/50 mb-6">Create your first AI agent to get started</p>
                <Link href="/build">
                  <motion.button
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold inline-flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Sparkles className="w-5 h-5" />
                    Create Your First Agent
                  </motion.button>
                </Link>
              </motion.div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" variants={staggerContainer} initial="hidden" animate="visible">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} onClick={() => setSelectedAgent(agent)} />
                ))}
                <Link href="/build">
                  <motion.div
                    variants={fadeInUp}
                    className="p-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex flex-col items-center justify-center min-h-[200px] cursor-pointer group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:bg-orange-500/20 transition-colors">
                      <Plus className="w-6 h-6 text-white/40 group-hover:text-orange-400 transition-colors" />
                    </div>
                    <span className="text-white/40 font-medium group-hover:text-white/70 transition-colors">Create New Agent</span>
                  </motion.div>
                </Link>
              </motion.div>
            )}
          </motion.div>

        </main>
      </div>

      {/* Voice Assistant - wrapped in ErrorBoundary to prevent crashes */}
      <ErrorBoundary>
        <VoiceAssistant
          userName={profile?.name?.split(' ')[0]}
          onNavigate={(path) => router.push(path)}
          autoGreet={true}
        />
      </ErrorBoundary>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedAgent(null)} />
            <motion.div
              className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="h-32 bg-gradient-to-br from-orange-500/20 via-red-500/20 to-purple-500/20 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                <button onClick={() => setSelectedAgent(null)} className="absolute top-4 right-4 text-white/60 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 pb-6 -mt-12 relative">
                <div className="flex items-end gap-4 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg border-4 border-slate-900">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white">{selectedAgent.name}</h3>
                    <p className="text-white/50 capitalize">{selectedAgent.type.replace('_', ' ')} Agent</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    selectedAgent.status === 'live'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {selectedAgent.status === 'live' ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Live
                      </span>
                    ) : 'Ready'}
                  </span>
                </div>

                {selectedAgent.description && (
                  <p className="text-white/60 text-sm mb-6">{selectedAgent.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Conversations', value: (selectedAgent.conversations || 0).toLocaleString(), icon: MessageSquare },
                    { label: 'Satisfaction', value: `${selectedAgent.satisfaction || 0}%`, icon: Star },
                    { label: 'Response Time', value: selectedAgent.response_time || '—', icon: Clock },
                    { label: 'Last Active', value: selectedAgent.last_active ? new Date(selectedAgent.last_active).toLocaleDateString() : '—', icon: Activity }
                  ].map((stat) => (
                    <div key={stat.label} className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <stat.icon className="w-4 h-4 text-white/40 mb-2" />
                      <p className="text-white font-semibold">{stat.value}</p>
                      <p className="text-white/40 text-xs">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Embed Code */}
                <div className="mb-6">
                  <label className="text-white/60 text-sm mb-2 block">Embed Code</label>
                  <div className="relative">
                    <pre className="p-4 rounded-xl bg-black/30 text-xs text-white/70 overflow-x-auto border border-white/5">
{`<script src="https://agent-forge.app/widget/${selectedAgent.id}"></script>`}
                    </pre>
                    <button
                      onClick={() => copyEmbedCode(selectedAgent.id)}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                    >
                      {copiedEmbed ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition font-medium flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4" />
                    Configure
                  </button>
                  <button className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition font-medium flex items-center justify-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </button>
                  <button
                    onClick={() => toggleAgentStatus(selectedAgent.id)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                  >
                    {selectedAgent.status === 'live' ? (
                      <><Pause className="w-4 h-4" />Pause</>
                    ) : (
                      <><Play className="w-4 h-4" />Go Live</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color, trend }: { title: string; value: string | number; icon: any; color: string; trend: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    yellow: 'from-yellow-500 to-orange-500'
  };

  return (
    <motion.div className="relative p-5 rounded-2xl bg-white/5 border border-white/5 overflow-hidden group" variants={fadeInUp} whileHover={{ y: -4 }}>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-white/40 text-xs">{trend}</div>
        </div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm text-white/50">{title}</p>
      </div>
    </motion.div>
  );
}

// Agent Card Component
function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  return (
    <motion.div
      variants={fadeInUp}
      onClick={onClick}
      className="relative p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 cursor-pointer group overflow-hidden"
      whileHover={{ y: -4 }}
    >
      <div className="relative">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{agent.name}</h3>
            <p className="text-xs text-white/50 capitalize">{agent.type.replace('_', ' ')}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            agent.status === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {agent.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
            {agent.status === 'live' ? 'Live' : 'Ready'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-white font-medium">{(agent.conversations || 0).toLocaleString()}</p>
            <p className="text-white/40 text-xs">conversations</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-white font-medium">{agent.satisfaction || 0}%</p>
            <p className="text-white/40 text-xs">satisfaction</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-white/40 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {agent.last_active ? new Date(agent.last_active).toLocaleDateString() : 'Just created'}
          </span>
          <span className="text-orange-400 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View details <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

```

---

