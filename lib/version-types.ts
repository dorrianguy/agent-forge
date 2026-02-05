/**
 * Version Control System Types
 * 
 * Defines the data structures for agent versioning, drafts, and rollback.
 */

// The full agent configuration that gets versioned
export interface AgentConfig {
  name: string;
  type: string;
  description: string | null;
  systemPrompt: string;
  greeting: string;
  personality: string;
  tone: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools: AgentTool[];
  knowledgeBase: KnowledgeItem[];
  triggers: AgentTrigger[];
  fallbackResponse: string;
  escalationEmail: string | null;
  workingHours: WorkingHours | null;
  customInstructions: string;
}

export interface AgentTool {
  id: string;
  name: string;
  type: 'api' | 'function' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'url' | 'file';
  createdAt: string;
}

export interface AgentTrigger {
  id: string;
  condition: string;
  action: 'respond' | 'escalate' | 'transfer' | 'tag';
  value: string;
  enabled: boolean;
}

export interface WorkingHours {
  enabled: boolean;
  timezone: string;
  schedule: {
    [day: string]: { start: string; end: string } | null;
  };
  outsideHoursMessage: string;
}

// Version statuses
export type VersionStatus = 'draft' | 'published' | 'archived';

// A single version of an agent
export interface AgentVersion {
  id: string;
  agentId: string;
  version: number;
  status: VersionStatus;
  config: AgentConfig;
  notes: string;
  createdAt: string;
  createdBy: string;
  publishedAt: string | null;
  rollbackFromVersion: number | null; // If this was created via rollback
}

// Version comparison result
export interface VersionDiff {
  field: string;
  path: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
}

// Summary of changes between versions
export interface VersionChangeSummary {
  totalChanges: number;
  added: number;
  removed: number;
  modified: number;
  diffs: VersionDiff[];
}

// Draft state for an agent
export interface DraftState {
  agentId: string;
  config: AgentConfig;
  lastSaved: string;
  hasChanges: boolean;
  baseVersion: number; // The published version this draft is based on
}

// Publishing options
export interface PublishOptions {
  notes: string;
  scheduledFor: string | null; // ISO date string for scheduled publish
}

// Rollback confirmation
export interface RollbackRequest {
  agentId: string;
  targetVersion: number;
  reason: string;
}

// Audit log entry for rollbacks
export interface RollbackAuditEntry {
  id: string;
  agentId: string;
  fromVersion: number;
  toVersion: number;
  performedBy: string;
  performedAt: string;
  reason: string;
  newVersionCreated: number;
}

// API response types
export interface VersionListResponse {
  versions: AgentVersion[];
  currentVersion: number;
  hasDraft: boolean;
}

export interface CreateVersionResponse {
  version: AgentVersion;
  message: string;
}

export interface RollbackResponse {
  success: boolean;
  newVersion: AgentVersion;
  auditEntry: RollbackAuditEntry;
}

// Default config for new agents
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  name: '',
  type: 'customer_support',
  description: null,
  systemPrompt: 'You are a helpful AI assistant.',
  greeting: 'Hello! How can I help you today?',
  personality: 'friendly',
  tone: 'professional',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000,
  tools: [],
  knowledgeBase: [],
  triggers: [],
  fallbackResponse: "I'm sorry, I don't understand. Could you rephrase that?",
  escalationEmail: null,
  workingHours: null,
  customInstructions: '',
};

// Helper to create an empty diff
export function createEmptyChangeSummary(): VersionChangeSummary {
  return {
    totalChanges: 0,
    added: 0,
    removed: 0,
    modified: 0,
    diffs: [],
  };
}

// Helper to generate version label
export function getVersionLabel(version: AgentVersion): string {
  if (version.status === 'draft') {
    return 'Draft';
  }
  return `v${version.version}`;
}

// Helper to format relative time
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}
