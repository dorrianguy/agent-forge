import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import {
  AgentVersion,
  AgentConfig,
  VersionListResponse,
  CreateVersionResponse,
  RollbackResponse,
  RollbackAuditEntry,
  VersionStatus,
  DEFAULT_AGENT_CONFIG,
} from '@/lib/version-types';

export function generateStaticParams() {
  return [];
}

// Helper to generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// GET /api/agents/[id]/versions - List all versions for an agent
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const agentId = params.id;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify agent ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch versions from database
    const { data: versions, error: versionsError } = await supabase
      .from('agent_versions')
      .select('*')
      .eq('agent_id', agentId)
      .order('version', { ascending: false });

    if (versionsError) {
      console.error('Error fetching versions:', versionsError);
      return NextResponse.json(
        { error: 'Failed to fetch versions' },
        { status: 500 }
      );
    }

    // Define database row type
    type VersionRow = {
      id: string;
      agent_id: string;
      version: number;
      status: VersionStatus;
      config: AgentConfig;
      notes: string | null;
      created_at: string;
      created_by: string | null;
      published_at: string | null;
      rollback_from_version: number | null;
    };

    const versionRows = (versions || []) as VersionRow[];

    // Find current (latest published) version
    const publishedVersions = versionRows.filter((v) => v.status === 'published');
    const currentVersion = publishedVersions.length > 0
      ? Math.max(...publishedVersions.map((v) => v.version))
      : 0;

    // Check for draft
    const hasDraft = versionRows.some((v) => v.status === 'draft');

    const response: VersionListResponse = {
      versions: versionRows.map((v) => ({
        id: v.id,
        agentId: v.agent_id,
        version: v.version,
        status: v.status,
        config: v.config,
        notes: v.notes || '',
        createdAt: v.created_at,
        createdBy: v.created_by || user.email || 'Unknown',
        publishedAt: v.published_at,
        rollbackFromVersion: v.rollback_from_version,
      })),
      currentVersion,
      hasDraft,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Versions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/agents/[id]/versions - Create a new version (publish)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const agentId = params.id;
    const body = await request.json();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify agent ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { config, notes, scheduledFor } = body as {
      config: AgentConfig;
      notes: string;
      scheduledFor?: string;
    };

    if (!config) {
      return NextResponse.json(
        { error: 'Config is required' },
        { status: 400 }
      );
    }

    // Get the latest version number
    const { data: latestVersion } = await supabase
      .from('agent_versions')
      .select('version')
      .eq('agent_id', agentId)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const newVersionNumber = (latestVersion?.version || 0) + 1;

    // Archive previous published versions
    await supabase
      .from('agent_versions')
      .update({ status: 'archived' })
      .eq('agent_id', agentId)
      .eq('status', 'published');

    // Delete any existing draft
    await supabase
      .from('agent_versions')
      .delete()
      .eq('agent_id', agentId)
      .eq('status', 'draft');

    // Create new version
    const newVersion = {
      id: generateId(),
      agent_id: agentId,
      version: newVersionNumber,
      status: 'published',
      config,
      notes: notes || '',
      created_at: new Date().toISOString(),
      created_by: user.email || user.id,
      published_at: scheduledFor || new Date().toISOString(),
      rollback_from_version: null,
    };

    const { data: insertedVersion, error: insertError } = await supabase
      .from('agent_versions')
      .insert(newVersion)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating version:', insertError);
      return NextResponse.json(
        { error: 'Failed to create version' },
        { status: 500 }
      );
    }

    // Update the main agent record with the new config
    await supabase
      .from('agents')
      .update({
        name: config.name,
        description: config.description,
        config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    const response: CreateVersionResponse = {
      version: {
        id: insertedVersion.id,
        agentId: insertedVersion.agent_id,
        version: insertedVersion.version,
        status: insertedVersion.status,
        config: insertedVersion.config,
        notes: insertedVersion.notes,
        createdAt: insertedVersion.created_at,
        createdBy: insertedVersion.created_by,
        publishedAt: insertedVersion.published_at,
        rollbackFromVersion: insertedVersion.rollback_from_version,
      },
      message: `Version ${newVersionNumber} published successfully`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Versions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/agents/[id]/versions - Rollback to a specific version
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const agentId = params.id;
    const body = await request.json();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify agent ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { targetVersion, reason } = body as {
      targetVersion: number;
      reason: string;
    };

    if (!targetVersion) {
      return NextResponse.json(
        { error: 'Target version is required' },
        { status: 400 }
      );
    }

    // Fetch the target version
    const { data: targetVersionData, error: targetError } = await supabase
      .from('agent_versions')
      .select('*')
      .eq('agent_id', agentId)
      .eq('version', targetVersion)
      .single();

    if (targetError || !targetVersionData) {
      return NextResponse.json(
        { error: `Version ${targetVersion} not found` },
        { status: 404 }
      );
    }

    // Get the latest version number
    const { data: latestVersion } = await supabase
      .from('agent_versions')
      .select('version')
      .eq('agent_id', agentId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const currentVersionNumber = latestVersion?.version || 0;
    const newVersionNumber = currentVersionNumber + 1;

    // Archive current published versions
    await supabase
      .from('agent_versions')
      .update({ status: 'archived' })
      .eq('agent_id', agentId)
      .eq('status', 'published');

    // Create new version from rollback target
    const newVersion = {
      id: generateId(),
      agent_id: agentId,
      version: newVersionNumber,
      status: 'published',
      config: targetVersionData.config,
      notes: `Rollback to v${targetVersion}: ${reason || 'No reason provided'}`,
      created_at: new Date().toISOString(),
      created_by: user.email || user.id,
      published_at: new Date().toISOString(),
      rollback_from_version: targetVersion,
    };

    const { data: insertedVersion, error: insertError } = await supabase
      .from('agent_versions')
      .insert(newVersion)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating rollback version:', insertError);
      return NextResponse.json(
        { error: 'Failed to create rollback version' },
        { status: 500 }
      );
    }

    // Create audit log entry
    const auditEntry: RollbackAuditEntry = {
      id: generateId(),
      agentId,
      fromVersion: currentVersionNumber,
      toVersion: targetVersion,
      performedBy: user.email || user.id,
      performedAt: new Date().toISOString(),
      reason: reason || 'No reason provided',
      newVersionCreated: newVersionNumber,
    };

    // Store audit entry (you might want a separate table for this)
    try {
      await supabase
        .from('rollback_audit_log')
        .insert({
          id: auditEntry.id,
          agent_id: auditEntry.agentId,
          from_version: auditEntry.fromVersion,
          to_version: auditEntry.toVersion,
          performed_by: auditEntry.performedBy,
          performed_at: auditEntry.performedAt,
          reason: auditEntry.reason,
          new_version_created: auditEntry.newVersionCreated,
        });
    } catch {
      // Audit table might not exist yet - that's okay
      console.log('Audit log table not available');
    }

    // Update the main agent record
    await supabase
      .from('agents')
      .update({
        name: targetVersionData.config.name,
        description: targetVersionData.config.description,
        config: targetVersionData.config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    const response: RollbackResponse = {
      success: true,
      newVersion: {
        id: insertedVersion.id,
        agentId: insertedVersion.agent_id,
        version: insertedVersion.version,
        status: insertedVersion.status,
        config: insertedVersion.config,
        notes: insertedVersion.notes,
        createdAt: insertedVersion.created_at,
        createdBy: insertedVersion.created_by,
        publishedAt: insertedVersion.published_at,
        rollbackFromVersion: insertedVersion.rollback_from_version,
      },
      auditEntry,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Versions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id]/versions - Save draft
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const agentId = params.id;
    const body = await request.json();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify agent ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { config } = body as { config: Partial<AgentConfig> };

    // Get current draft or create new one
    const { data: existingDraft } = await supabase
      .from('agent_versions')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'draft')
      .single();

    // Get the current published version's config as base
    const { data: currentVersion } = await supabase
      .from('agent_versions')
      .select('config')
      .eq('agent_id', agentId)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const baseConfig = currentVersion?.config || DEFAULT_AGENT_CONFIG;
    const mergedConfig = { ...baseConfig, ...config };

    if (existingDraft) {
      // Update existing draft
      const { error: updateError } = await supabase
        .from('agent_versions')
        .update({
          config: mergedConfig,
          created_at: new Date().toISOString(),
        })
        .eq('id', existingDraft.id);

      if (updateError) {
        console.error('Error updating draft:', updateError);
        return NextResponse.json(
          { error: 'Failed to save draft' },
          { status: 500 }
        );
      }
    } else {
      // Create new draft
      const { error: insertError } = await supabase
        .from('agent_versions')
        .insert({
          id: generateId(),
          agent_id: agentId,
          version: 0,
          status: 'draft',
          config: mergedConfig,
          notes: '',
          created_at: new Date().toISOString(),
          created_by: user.email || user.id,
          published_at: null,
          rollback_from_version: null,
        });

      if (insertError) {
        console.error('Error creating draft:', insertError);
        return NextResponse.json(
          { error: 'Failed to create draft' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Draft saved',
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Versions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[id]/versions - Discard draft
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const agentId = params.id;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify agent ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete draft
    const { error: deleteError } = await supabase
      .from('agent_versions')
      .delete()
      .eq('agent_id', agentId)
      .eq('status', 'draft');

    if (deleteError) {
      console.error('Error deleting draft:', deleteError);
      return NextResponse.json(
        { error: 'Failed to discard draft' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Draft discarded',
    });
  } catch (error) {
    console.error('Versions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
