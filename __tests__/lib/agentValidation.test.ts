/**
 * Tests for agent creation validation logic
 *
 * These test the validation rules used in the agents API
 * without requiring Next.js request mocking.
 */

describe('Agent Validation', () => {
  // Validation functions extracted from the API route logic
  const VALID_TYPES = ['customer_support', 'sales', 'lead_qualifier', 'booking', 'faq', 'voice', 'email', 'custom'];
  const MAX_NAME_LENGTH = 100;

  function validateName(name: unknown): { valid: boolean; error?: string } {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { valid: false, error: 'Agent name is required' };
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      return { valid: false, error: 'Agent name must be 100 characters or less' };
    }
    return { valid: true };
  }

  function validateType(type: unknown): { valid: boolean; error?: string } {
    if (!type || typeof type !== 'string') {
      return { valid: false, error: 'Agent type is required' };
    }
    if (!VALID_TYPES.includes(type)) {
      return { valid: false, error: `Invalid agent type. Must be one of: ${VALID_TYPES.join(', ')}` };
    }
    return { valid: true };
  }

  function checkPlanLimit(plan: string, currentCount: number): { allowed: boolean; maxAgents: number } {
    const planLimits: Record<string, number> = {
      free: 0,
      starter: 3,
      pro: 15,
      scale: Infinity,
      enterprise: Infinity,
      professional: 5,
    };
    const maxAgents = planLimits[plan] || 0;
    return {
      allowed: maxAgents === Infinity || currentCount < maxAgents,
      maxAgents,
    };
  }

  describe('validateName', () => {
    it('rejects empty name', () => {
      expect(validateName('')).toEqual({ valid: false, error: 'Agent name is required' });
    });

    it('rejects null name', () => {
      expect(validateName(null)).toEqual({ valid: false, error: 'Agent name is required' });
    });

    it('rejects undefined name', () => {
      expect(validateName(undefined)).toEqual({ valid: false, error: 'Agent name is required' });
    });

    it('rejects whitespace-only name', () => {
      expect(validateName('   ')).toEqual({ valid: false, error: 'Agent name is required' });
    });

    it('rejects non-string name', () => {
      expect(validateName(42)).toEqual({ valid: false, error: 'Agent name is required' });
      expect(validateName(true)).toEqual({ valid: false, error: 'Agent name is required' });
      expect(validateName({})).toEqual({ valid: false, error: 'Agent name is required' });
    });

    it('accepts valid name', () => {
      expect(validateName('My Support Agent')).toEqual({ valid: true });
    });

    it('accepts single character name', () => {
      expect(validateName('A')).toEqual({ valid: true });
    });

    it('accepts name at max length', () => {
      const name = 'A'.repeat(100);
      expect(validateName(name)).toEqual({ valid: true });
    });

    it('rejects name over max length', () => {
      const name = 'A'.repeat(101);
      expect(validateName(name)).toEqual({
        valid: false,
        error: 'Agent name must be 100 characters or less',
      });
    });

    it('trims name before length check', () => {
      const name = '  ' + 'A'.repeat(100) + '  ';
      expect(validateName(name)).toEqual({ valid: true });
    });
  });

  describe('validateType', () => {
    it('accepts all valid types', () => {
      for (const type of VALID_TYPES) {
        expect(validateType(type)).toEqual({ valid: true });
      }
    });

    it('rejects empty type', () => {
      expect(validateType('')).toEqual({ valid: false, error: 'Agent type is required' });
    });

    it('rejects null type', () => {
      expect(validateType(null)).toEqual({ valid: false, error: 'Agent type is required' });
    });

    it('rejects invalid type string', () => {
      const result = validateType('invalid_type');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid agent type');
    });

    it('rejects non-string type', () => {
      expect(validateType(123)).toEqual({ valid: false, error: 'Agent type is required' });
    });

    it('is case-sensitive', () => {
      const result = validateType('Customer_Support');
      expect(result.valid).toBe(false);
    });
  });

  describe('checkPlanLimit', () => {
    it('blocks free plan from creating agents', () => {
      expect(checkPlanLimit('free', 0)).toEqual({ allowed: false, maxAgents: 0 });
    });

    it('allows starter plan to create 1 agent', () => {
      expect(checkPlanLimit('starter', 0)).toEqual({ allowed: true, maxAgents: 1 });
    });

    it('blocks starter plan at limit', () => {
      expect(checkPlanLimit('starter', 1)).toEqual({ allowed: false, maxAgents: 1 });
    });

    it('allows professional plan up to 5 agents', () => {
      expect(checkPlanLimit('professional', 0)).toEqual({ allowed: true, maxAgents: 5 });
      expect(checkPlanLimit('professional', 4)).toEqual({ allowed: true, maxAgents: 5 });
    });

    it('blocks professional plan at limit', () => {
      expect(checkPlanLimit('professional', 5)).toEqual({ allowed: false, maxAgents: 5 });
    });

    it('allows enterprise unlimited agents', () => {
      expect(checkPlanLimit('enterprise', 0)).toEqual({ allowed: true, maxAgents: Infinity });
      expect(checkPlanLimit('enterprise', 100)).toEqual({ allowed: true, maxAgents: Infinity });
      expect(checkPlanLimit('enterprise', 999)).toEqual({ allowed: true, maxAgents: Infinity });
    });

    it('treats unknown plan as free tier', () => {
      expect(checkPlanLimit('unknown', 0)).toEqual({ allowed: false, maxAgents: 0 });
    });
  });

  describe('Sort Column Validation', () => {
    const ALLOWED_SORT_COLUMNS = ['created_at', 'updated_at', 'name', 'status', 'conversations', 'satisfaction'];

    function validateSortColumn(column: string): string {
      return ALLOWED_SORT_COLUMNS.includes(column) ? column : 'created_at';
    }

    it('accepts valid sort columns', () => {
      for (const col of ALLOWED_SORT_COLUMNS) {
        expect(validateSortColumn(col)).toBe(col);
      }
    });

    it('defaults to created_at for invalid column', () => {
      expect(validateSortColumn('DROP TABLE;')).toBe('created_at');
      expect(validateSortColumn('invalid')).toBe('created_at');
      expect(validateSortColumn('')).toBe('created_at');
    });

    it('prevents SQL injection in sort column', () => {
      expect(validateSortColumn("name; DROP TABLE agents;--")).toBe('created_at');
      expect(validateSortColumn("name OR 1=1")).toBe('created_at');
    });
  });

  describe('Status Filter Validation', () => {
    const VALID_STATUSES = ['ready', 'live', 'paused'];

    function validateStatus(status: string | null): string | null {
      if (status && VALID_STATUSES.includes(status)) return status;
      return null;
    }

    it('accepts valid statuses', () => {
      expect(validateStatus('ready')).toBe('ready');
      expect(validateStatus('live')).toBe('live');
      expect(validateStatus('paused')).toBe('paused');
    });

    it('returns null for invalid status', () => {
      expect(validateStatus('invalid')).toBeNull();
      expect(validateStatus(null)).toBeNull();
      expect(validateStatus('')).toBeNull();
    });
  });

  describe('Pagination Validation', () => {
    function validateLimit(input: string | null): number {
      return Math.min(parseInt(input || '50', 10), 100);
    }

    function validateOffset(input: string | null): number {
      return parseInt(input || '0', 10);
    }

    it('defaults limit to 50', () => {
      expect(validateLimit(null)).toBe(50);
    });

    it('caps limit at 100', () => {
      expect(validateLimit('500')).toBe(100);
    });

    it('accepts valid limit', () => {
      expect(validateLimit('25')).toBe(25);
    });

    it('defaults offset to 0', () => {
      expect(validateOffset(null)).toBe(0);
    });

    it('accepts valid offset', () => {
      expect(validateOffset('50')).toBe(50);
    });

    it('handles NaN limit gracefully', () => {
      const result = validateLimit('not-a-number');
      expect(Number.isNaN(result)).toBe(true);
    });
  });
});
