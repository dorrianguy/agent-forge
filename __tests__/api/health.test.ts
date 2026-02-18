/**
 * Tests for app/api/health/route.ts
 * Tests the health check endpoint logic
 */

describe('/api/health', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules so import gets fresh state
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 200 when all services are configured', async () => {
    // Set all required env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.RESEND_API_KEY = 're_test';

    // Mock fetch for Supabase health check
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.timestamp).toBeDefined();
    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(data.checks).toBeInstanceOf(Array);
    expect(data.checks.length).toBe(4);
  });

  it('returns degraded when optional services are missing', async () => {
    // Only set required vars, omit optional ones
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.OPENAI_API_KEY;
    delete process.env.RESEND_API_KEY;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('degraded');

    // Check that missing services are flagged as warnings
    const stripeCheck = data.checks.find((c: { name: string }) => c.name === 'stripe');
    expect(stripeCheck?.status).toBe('warn');

    const openaiCheck = data.checks.find((c: { name: string }) => c.name === 'openai');
    expect(openaiCheck?.status).toBe('warn');
  });

  it('returns unhealthy when Supabase is unreachable', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');

    const supabaseCheck = data.checks.find((c: { name: string }) => c.name === 'supabase');
    expect(supabaseCheck?.status).toBe('fail');
  });

  it('includes version and uptime in response', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(data.version).toBeDefined();
    expect(typeof data.uptime).toBe('number');
    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });
});
