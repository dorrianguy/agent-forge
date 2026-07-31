import { createBrowserClient } from '@supabase/ssr';

// Lazy-loaded singleton to avoid build-time errors
type SupabaseClientType = ReturnType<typeof createBrowserClient>;
let supabaseInstance: SupabaseClientType | null = null;

export function createClient(): SupabaseClientType {
  // Return cached instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build, these may not be available
  if (!url || !key) {
    // Return a placeholder that will throw on actual use
    // This allows the build to proceed but runtime will fail clearly
    if (typeof window === 'undefined') {
      // Server-side build - return a mock that throws
      return new Proxy({} as SupabaseClientType, {
        get() {
          throw new Error('Supabase client not initialized. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
        },
      });
    }
    throw new Error('Supabase URL and API key are required.');
  }

  supabaseInstance = createBrowserClient(url, key);
  return supabaseInstance;
}

// Types for our database
export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  type: string;
  description: string | null;
  status: 'ready' | 'live' | 'paused';
  config: Record<string, any> | null;
  conversations: number;
  satisfaction: number;
  response_time: string | null;
  last_active: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}
