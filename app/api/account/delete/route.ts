import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * DELETE /api/account/delete
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * Requires a valid Supabase access token in the Authorization header.
 * Uses the Supabase service role key to perform admin-level user deletion.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 },
      );
    }

    // Verify the user's identity using their access token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 },
      );
    }

    // Use service role to delete user data and account
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user's agents
    await adminClient
      .from('agents')
      .delete()
      .eq('user_id', user.id);

    // Delete user's messages
    await adminClient
      .from('messages')
      .delete()
      .eq('user_id', user.id);

    // Delete user profile
    await adminClient
      .from('user_profiles')
      .delete()
      .eq('id', user.id);

    await adminClient
      .from('profiles')
      .delete()
      .eq('id', user.id);

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
