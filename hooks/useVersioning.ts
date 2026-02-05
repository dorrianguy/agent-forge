/**
 * Version Management Hook
 * 
 * Provides state management and operations for agent versioning,
 * drafts, publishing, and rollback functionality.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AgentVersion,
  AgentConfig,
  DraftState,
  VersionDiff,
  VersionChangeSummary,
  PublishOptions,
  RollbackAuditEntry,
  DEFAULT_AGENT_CONFIG,
  createEmptyChangeSummary,
} from '@/lib/version-types';

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Deep comparison helper
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual(a[key], b[key]));
}

// Compare two configs and generate diffs
function compareConfigs(
  oldConfig: AgentConfig | null,
  newConfig: AgentConfig,
  path = ''
): VersionDiff[] {
  const diffs: VersionDiff[] = [];
  
  if (!oldConfig) {
    // Everything is new
    Object.keys(newConfig).forEach(key => {
      diffs.push({
        field: key,
        path: path ? `${path}.${key}` : key,
        oldValue: null,
        newValue: (newConfig as any)[key],
        changeType: 'added',
      });
    });
    return diffs;
  }
  
  const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);
  
  allKeys.forEach(key => {
    const oldVal = (oldConfig as any)[key];
    const newVal = (newConfig as any)[key];
    const fullPath = path ? `${path}.${key}` : key;
    
    if (oldVal === undefined && newVal !== undefined) {
      diffs.push({
        field: key,
        path: fullPath,
        oldValue: null,
        newValue: newVal,
        changeType: 'added',
      });
    } else if (oldVal !== undefined && newVal === undefined) {
      diffs.push({
        field: key,
        path: fullPath,
        oldValue: oldVal,
        newValue: null,
        changeType: 'removed',
      });
    } else if (!deepEqual(oldVal, newVal)) {
      diffs.push({
        field: key,
        path: fullPath,
        oldValue: oldVal,
        newValue: newVal,
        changeType: 'modified',
      });
    }
  });
  
  return diffs;
}

// Zustand store interface
interface VersioningState {
  // Versions by agent ID
  versions: Record<string, AgentVersion[]>;
  
  // Draft states by agent ID
  drafts: Record<string, DraftState>;
  
  // Rollback audit log
  auditLog: RollbackAuditEntry[];
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  loadVersions: (agentId: string) => Promise<AgentVersion[]>;
  getVersion: (agentId: string, version: number) => AgentVersion | null;
  getCurrentVersion: (agentId: string) => AgentVersion | null;
  getDraft: (agentId: string) => DraftState | null;
  
  // Draft operations
  saveDraft: (agentId: string, config: Partial<AgentConfig>) => void;
  discardDraft: (agentId: string) => void;
  hasDraftChanges: (agentId: string) => boolean;
  
  // Publishing
  publish: (agentId: string, options: PublishOptions) => Promise<AgentVersion>;
  
  // Rollback
  rollback: (agentId: string, targetVersion: number, reason: string) => Promise<AgentVersion>;
  
  // Comparison
  compareVersions: (agentId: string, v1: number, v2: number) => VersionChangeSummary;
  getDraftChanges: (agentId: string) => VersionChangeSummary;
  
  // Clear error
  clearError: () => void;
}

export const useVersioningStore = create<VersioningState>()(
  persist(
    (set, get) => ({
      versions: {},
      drafts: {},
      auditLog: [],
      isLoading: false,
      error: null,
      
      loadVersions: async (agentId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // In production, this would fetch from API
          // For now, return stored versions or empty array
          const stored = get().versions[agentId] || [];
          set({ isLoading: false });
          return stored;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load versions';
          set({ isLoading: false, error: message });
          return [];
        }
      },
      
      getVersion: (agentId: string, version: number) => {
        const agentVersions = get().versions[agentId] || [];
        return agentVersions.find(v => v.version === version) || null;
      },
      
      getCurrentVersion: (agentId: string) => {
        const agentVersions = get().versions[agentId] || [];
        const published = agentVersions
          .filter(v => v.status === 'published')
          .sort((a, b) => b.version - a.version);
        return published[0] || null;
      },
      
      getDraft: (agentId: string) => {
        return get().drafts[agentId] || null;
      },
      
      saveDraft: (agentId: string, configUpdates: Partial<AgentConfig>) => {
        const currentDraft = get().drafts[agentId];
        const currentVersion = get().getCurrentVersion(agentId);
        
        const baseConfig = currentDraft?.config || currentVersion?.config || DEFAULT_AGENT_CONFIG;
        
        const newConfig: AgentConfig = {
          ...baseConfig,
          ...configUpdates,
        };
        
        const baseVersion = currentVersion?.version || 0;
        
        // Check if there are actual changes
        const hasChanges = !deepEqual(newConfig, currentVersion?.config || DEFAULT_AGENT_CONFIG);
        
        set(state => ({
          drafts: {
            ...state.drafts,
            [agentId]: {
              agentId,
              config: newConfig,
              lastSaved: new Date().toISOString(),
              hasChanges,
              baseVersion,
            },
          },
        }));
      },
      
      discardDraft: (agentId: string) => {
        set(state => {
          const { [agentId]: _, ...remainingDrafts } = state.drafts;
          return { drafts: remainingDrafts };
        });
      },
      
      hasDraftChanges: (agentId: string) => {
        const draft = get().drafts[agentId];
        return draft?.hasChanges || false;
      },
      
      publish: async (agentId: string, options: PublishOptions) => {
        set({ isLoading: true, error: null });
        
        try {
          const draft = get().drafts[agentId];
          if (!draft) {
            throw new Error('No draft to publish');
          }
          
          const currentVersion = get().getCurrentVersion(agentId);
          const newVersionNumber = (currentVersion?.version || 0) + 1;
          
          const newVersion: AgentVersion = {
            id: generateId(),
            agentId,
            version: newVersionNumber,
            status: 'published',
            config: draft.config,
            notes: options.notes,
            createdAt: new Date().toISOString(),
            createdBy: 'current-user', // In production, get from auth
            publishedAt: options.scheduledFor || new Date().toISOString(),
            rollbackFromVersion: null,
          };
          
          // Archive previous version
          set(state => {
            const agentVersions = state.versions[agentId] || [];
            const updatedVersions = agentVersions.map(v => 
              v.status === 'published' ? { ...v, status: 'archived' as const } : v
            );
            
            return {
              versions: {
                ...state.versions,
                [agentId]: [...updatedVersions, newVersion],
              },
              drafts: (() => {
                const { [agentId]: _, ...rest } = state.drafts;
                return rest;
              })(),
              isLoading: false,
            };
          });
          
          return newVersion;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to publish';
          set({ isLoading: false, error: message });
          throw err;
        }
      },
      
      rollback: async (agentId: string, targetVersion: number, reason: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const targetVersionData = get().getVersion(agentId, targetVersion);
          if (!targetVersionData) {
            throw new Error(`Version ${targetVersion} not found`);
          }
          
          const currentVersion = get().getCurrentVersion(agentId);
          const newVersionNumber = (currentVersion?.version || 0) + 1;
          
          // Create new version from rollback target
          const newVersion: AgentVersion = {
            id: generateId(),
            agentId,
            version: newVersionNumber,
            status: 'published',
            config: { ...targetVersionData.config },
            notes: `Rollback to v${targetVersion}: ${reason}`,
            createdAt: new Date().toISOString(),
            createdBy: 'current-user',
            publishedAt: new Date().toISOString(),
            rollbackFromVersion: targetVersion,
          };
          
          // Create audit entry
          const auditEntry: RollbackAuditEntry = {
            id: generateId(),
            agentId,
            fromVersion: currentVersion?.version || 0,
            toVersion: targetVersion,
            performedBy: 'current-user',
            performedAt: new Date().toISOString(),
            reason,
            newVersionCreated: newVersionNumber,
          };
          
          set(state => {
            const agentVersions = state.versions[agentId] || [];
            const updatedVersions = agentVersions.map(v =>
              v.status === 'published' ? { ...v, status: 'archived' as const } : v
            );
            
            return {
              versions: {
                ...state.versions,
                [agentId]: [...updatedVersions, newVersion],
              },
              auditLog: [...state.auditLog, auditEntry],
              isLoading: false,
            };
          });
          
          return newVersion;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to rollback';
          set({ isLoading: false, error: message });
          throw err;
        }
      },
      
      compareVersions: (agentId: string, v1: number, v2: number): VersionChangeSummary => {
        const version1 = get().getVersion(agentId, v1);
        const version2 = get().getVersion(agentId, v2);
        
        if (!version1 || !version2) {
          return createEmptyChangeSummary();
        }
        
        const diffs = compareConfigs(version1.config, version2.config);
        
        return {
          totalChanges: diffs.length,
          added: diffs.filter(d => d.changeType === 'added').length,
          removed: diffs.filter(d => d.changeType === 'removed').length,
          modified: diffs.filter(d => d.changeType === 'modified').length,
          diffs,
        };
      },
      
      getDraftChanges: (agentId: string): VersionChangeSummary => {
        const draft = get().drafts[agentId];
        const currentVersion = get().getCurrentVersion(agentId);
        
        if (!draft) {
          return createEmptyChangeSummary();
        }
        
        const diffs = compareConfigs(currentVersion?.config || null, draft.config);
        
        return {
          totalChanges: diffs.length,
          added: diffs.filter(d => d.changeType === 'added').length,
          removed: diffs.filter(d => d.changeType === 'removed').length,
          modified: diffs.filter(d => d.changeType === 'modified').length,
          diffs,
        };
      },
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'agent-forge-versions',
      partialize: (state) => ({
        versions: state.versions,
        drafts: state.drafts,
        auditLog: state.auditLog,
      }),
    }
  )
);

// Convenience hook for component use
export function useVersioning(agentId: string) {
  const store = useVersioningStore();
  
  return {
    // State
    versions: store.versions[agentId] || [],
    draft: store.drafts[agentId] || null,
    currentVersion: store.getCurrentVersion(agentId),
    isLoading: store.isLoading,
    error: store.error,
    hasDraftChanges: store.hasDraftChanges(agentId),
    
    // Actions
    loadVersions: () => store.loadVersions(agentId),
    getVersion: (version: number) => store.getVersion(agentId, version),
    saveDraft: (config: Partial<AgentConfig>) => store.saveDraft(agentId, config),
    discardDraft: () => store.discardDraft(agentId),
    publish: (options: PublishOptions) => store.publish(agentId, options),
    rollback: (targetVersion: number, reason: string) => store.rollback(agentId, targetVersion, reason),
    compareVersions: (v1: number, v2: number) => store.compareVersions(agentId, v1, v2),
    getDraftChanges: () => store.getDraftChanges(agentId),
    clearError: store.clearError,
  };
}

export default useVersioning;
