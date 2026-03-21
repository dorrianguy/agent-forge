import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { checkRateLimitAsync, getRateLimitHeaders } from '@/lib/rateLimit';

export function generateStaticParams() {
  return [];
}

/**
 * /api/agents/[id] — Single agent operations
 *
 * GET    — Fetch a single agent by ID
 * PATCH  — Update an agent (name, description, config, status)
 * DELETE — Delete an agent
 *
 * All routes require authentication and verify ownership.
 */

const RATE_LIMIT_CONFIG = { maxRequests: 60, windowMs: 60000 };

async function getAuthenticatedSupabase() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { supabase: null, user: null, error: 'Auth service not configured' };
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { supabase: null, user: null, error: 'Authentication required' };
  }

  return { supabase, user, error: null };
}

// Validate UUID format to prevent injection
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id]
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const { supabase, user, error: authError } = await getAuthenticatedSupabase();
    if (!supabase || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimitAsync(`agents:${user.id}`, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    logger.error('Unexpected error in GET /api/agents/[id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/agents/[id]
 * Updatable fields: name, description, config, status
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const { supabase, user, error: authError } = await getAuthenticatedSupabase();
    if (!supabase || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimitAsync(`agents:${user.id}`, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate and build update object
    const updates: Record<string, unknown> = {};

    if ('name' in body) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 });
      }
      if (body.name.trim().length > 100) {
        return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
      }
      updates.name = body.name.trim();
    }

    if ('description' in body) {
      if (body.description !== null && typeof body.description !== 'string') {
        return NextResponse.json({ error: 'Description must be a string or null' }, { status: 400 });
      }
      updates.description = body.description?.trim() || null;
    }

    if ('status' in body) {
      const validStatuses = ['ready', 'live', 'paused'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Status must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    if ('config' in body) {
      if (typeof body.config !== 'object' || body.config === null) {
        return NextResponse.json({ error: 'Config must be an object' }, { status: 400 });
      }
      updates.config = body.config;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update only if owned by user
    updates.updated_at = new Date().toISOString();

    const { data: agent, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found or update failed' }, { status: 404 });
    }

    logger.info('Agent updated', { agentId: id, userId: user.id, fields: Object.keys(updates) });

    return NextResponse.json({ agent });
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/agents/[id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/[id]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const { supabase, user, error: authError } = await getAuthenticatedSupabase();
    if (!supabase || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimitAsync(`agents:${user.id}`, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Verify ownership before deleting
    const { data: existing } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      logger.error('Failed to delete agent', error, { agentId: id, userId: user.id });
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
    }

    logger.info('Agent deleted', { agentId: id, agentName: existing.name, userId: user.id });

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/agents/[id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
