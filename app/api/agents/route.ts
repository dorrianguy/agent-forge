import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { checkRateLimitAsync, getRateLimitHeaders } from '@/lib/rateLimit';

/**
 * /api/agents — Server-side CRUD for agents
 *
 * GET  — List all agents for authenticated user
 * POST — Create a new agent
 *
 * Protected by middleware (requires auth).
 * Rate-limited: 60 requests/minute per user.
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

/**
 * GET /api/agents
 * List all agents for the authenticated user.
 * Optional query params: status, sort, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedSupabase();
    if (!supabase || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = await checkRateLimitAsync(`agents:${user.id}`, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'ready' | 'live' | 'paused'
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') === 'asc' ? true : false;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('agents')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    if (status && ['ready', 'live', 'paused'].includes(status)) {
      query = query.eq('status', status);
    }

    // Validate sort column to prevent injection
    const allowedSortColumns = ['created_at', 'updated_at', 'name', 'status', 'conversations', 'satisfaction'];
    const sortColumn = allowedSortColumns.includes(sort) ? sort : 'created_at';

    query = query
      .order(sortColumn, { ascending: order })
      .range(offset, offset + limit - 1);

    const { data: agents, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch agents', error, { userId: user.id });
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        agents: agents || [],
        total: count || 0,
        limit,
        offset,
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    logger.error('Unexpected error in GET /api/agents', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents
 * Create a new agent.
 * Body: { name, type, description?, config? }
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedSupabase();
    if (!supabase || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = await checkRateLimitAsync(`agents:${user.id}`, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Parse and validate body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { name, type, description, config } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Agent name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: 'Agent type is required' },
        { status: 400 }
      );
    }

    const validTypes = ['customer_support', 'sales', 'lead_qualifier', 'booking', 'faq', 'voice', 'email', 'custom'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid agent type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Check agent limit based on plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    const planLimits: Record<string, number> = {
      free: 0,
      starter: 3,
      pro: 15,
      scale: Infinity,
      enterprise: Infinity,
      // Legacy plan names (backwards compat)
      professional: 5,
    };

    const maxAgents = planLimits[profile?.plan || 'free'] || 0;

    if (maxAgents !== Infinity) {
      const { count: currentCount } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((currentCount || 0) >= maxAgents) {
        return NextResponse.json(
          {
            error: maxAgents === 0
              ? 'Upgrade to a paid plan to create agents'
              : `You've reached your plan limit of ${maxAgents} agent${maxAgents === 1 ? '' : 's'}. Upgrade your plan to create more.`,
          },
          { status: 403 }
        );
      }
    }

    // Create the agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        user_id: user.id,
        name: name.trim(),
        type,
        description: description?.trim() || null,
        config: config || {},
        status: 'ready',
        conversations: 0,
        satisfaction: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create agent', error, { userId: user.id });
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }

    logger.info('Agent created', { agentId: agent.id, userId: user.id, type });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    logger.error('Unexpected error in POST /api/agents', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
