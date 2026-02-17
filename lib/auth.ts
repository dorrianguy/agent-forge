import { createClient } from './supabase';
import type { Profile, Agent } from './supabase';

const supabase = createClient();

// ================================
// AUTH FUNCTIONS
// ================================

export async function signUp(email: string, password: string, name?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0],
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signInWithOAuth(provider: 'google' | 'github') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// ================================
// PROFILE FUNCTIONS
// ================================

export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  // Map subscription_tier to plan for backward compatibility
  if (data) {
    return { ...data, plan: data.subscription_tier || 'free' };
  }
  return data;
}

export async function updateProfile(updates: Partial<Profile>) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ================================
// AGENT FUNCTIONS
// ================================

export async function getAgents(): Promise<Agent[]> {
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAgent(id: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createAgent(agent: {
  name: string;
  type: string;
  description?: string;
  config?: Record<string, any>;
}): Promise<Agent> {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('agents')
    .insert({
      user_id: user.id,
      name: agent.name,
      type: agent.type,
      description: agent.description,
      config: agent.config || {},
      status: 'ready',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAgent(id: string) {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ================================
// PENDING AGENT (for try-before-buy flow)
// ================================

export function savePendingAgent(agent: {
  name: string;
  type: string;
  description?: string;
}) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pendingAgent', JSON.stringify(agent));
  }
}

export function getPendingAgent(): { name: string; type: string; description?: string } | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('pendingAgent');
  return data ? JSON.parse(data) : null;
}

export function clearPendingAgent() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pendingAgent');
  }
}

// Save pending agent to database after auth
export async function savePendingAgentToDb(): Promise<Agent | null> {
  const pending = getPendingAgent();
  if (!pending) return null;

  try {
    const agent = await createAgent(pending);
    clearPendingAgent();
    return agent;
  } catch (error) {
    console.error('Failed to save pending agent:', error);
    return null;
  }
}
