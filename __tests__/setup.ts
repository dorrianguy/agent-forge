/**
 * Jest setup file
 * Runs before each test suite to configure the test environment.
 */

// Set NODE_ENV to test
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true, configurable: true });

// Suppress console output in tests unless DEBUG is set
if (!process.env.DEBUG) {
  jest.spyOn(console, 'debug').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  // Keep console.warn and console.error visible for debugging failures
}
