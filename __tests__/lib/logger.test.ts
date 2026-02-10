/**
 * Tests for lib/logger.ts
 *
 * Validates that the logger:
 * - Outputs structured log entries
 * - Respects log levels
 * - Formats error objects correctly
 * - Includes timestamps
 */

import { logger } from '@/lib/logger';

describe('logger', () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('warn', () => {
    it('should output a formatted warning', () => {
      logger.warn('test warning');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const output = consoleWarnSpy.mock.calls[0][0];
      expect(output).toContain('WARN');
      expect(output).toContain('test warning');
    });

    it('should include data in the output', () => {
      logger.warn('rate limited', { ip: '127.0.0.1', path: '/api/test' });
      const output = consoleWarnSpy.mock.calls[0][0];
      expect(output).toContain('rate limited');
      expect(output).toContain('127.0.0.1');
      expect(output).toContain('/api/test');
    });

    it('should include an ISO timestamp', () => {
      logger.warn('timestamp test');
      const output = consoleWarnSpy.mock.calls[0][0];
      // ISO timestamp pattern: YYYY-MM-DDTHH:mm:ss
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('error', () => {
    it('should output a formatted error', () => {
      logger.error('something broke');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('ERROR');
      expect(output).toContain('something broke');
    });

    it('should include Error object details', () => {
      const err = new Error('connection timeout');
      logger.error('database failed', err);
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('database failed');
      expect(output).toContain('connection timeout');
    });

    it('should handle non-Error error values', () => {
      logger.error('unexpected', 'string error value');
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('unexpected');
      expect(output).toContain('string error value');
    });

    it('should include additional data alongside error', () => {
      const err = new Error('not found');
      logger.error('fetch failed', err, { url: '/api/test', status: 404 });
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('fetch failed');
      expect(output).toContain('not found');
      expect(output).toContain('/api/test');
    });
  });
});
