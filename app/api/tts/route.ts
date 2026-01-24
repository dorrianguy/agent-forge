import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { checkRateLimitAsync, getRateLimitHeaders } from '@/lib/rateLimit';

// Lazy initialize OpenAI client to validate env at runtime
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

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
// Anonymous users get restricted limits to prevent cost abuse
const ANON_MAX_TEXT_LENGTH = 500;
const ANON_RATE_LIMIT = 5; // 5 requests per minute
const AUTH_RATE_LIMIT = 50; // 50 requests per minute for authenticated users

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') || 'unknown';

    // Check authentication (optional - allows anonymous with restrictions)
    let userId: string | null = null;
    let isAuthenticated = false;

    try {
      const cookieStore = await cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createServerClient(supabaseUrl, supabaseKey, {
          cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            },
          },
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          isAuthenticated = true;
        }
      }
    } catch {
      // Auth check failed - continue as anonymous
      logger.debug('TTS auth check failed, continuing as anonymous');
    }

    // Tiered rate limiting based on authentication
    const rateLimitKey = isAuthenticated ? `tts:user:${userId}` : `tts:anon:${ip}`;
    const maxRequests = isAuthenticated ? AUTH_RATE_LIMIT : ANON_RATE_LIMIT;

    const rateLimitResult = await checkRateLimitAsync(rateLimitKey, {
      maxRequests,
      windowMs: 60000,
    });

    if (!rateLimitResult.success) {
      logger.warn('TTS rate limit exceeded', { ip, userId, isAuthenticated });
      return NextResponse.json(
        {
          error: isAuthenticated
            ? 'Rate limit exceeded. Please try again later.'
            : 'Rate limit exceeded. Sign in for higher limits.'
        },
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

    // Tiered text length limits based on authentication
    const maxTextLength = isAuthenticated ? MAX_TEXT_LENGTH : ANON_MAX_TEXT_LENGTH;
    if (sanitizedText.length > maxTextLength) {
      return NextResponse.json(
        {
          error: isAuthenticated
            ? `Text too long. Maximum ${MAX_TEXT_LENGTH} characters.`
            : `Text too long. Maximum ${ANON_MAX_TEXT_LENGTH} characters for anonymous users. Sign in for up to ${MAX_TEXT_LENGTH} characters.`
        },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    if (!openai) {
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

    logger.debug('TTS generated', {
      textLength: sanitizedText.length,
      voice: openaiVoice,
      authenticated: isAuthenticated,
      userId: userId || undefined,
    });

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
