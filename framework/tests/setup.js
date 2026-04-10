/**
 * Test setup file
 * Runs before all tests to configure the environment
 */

// Mock IndexedDB if not available
if (typeof indexedDB === 'undefined') {
  global.indexedDB = {
    open: () => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null
    })
  };
}

// Mock localStorage if not available
if (typeof localStorage === 'undefined') {
  class LocalStorageMock {
    constructor() {
      this.store = {};
    }
    getItem(key) {
      return this.store[key] || null;
    }
    setItem(key, value) {
      this.store[key] = String(value);
    }
    removeItem(key) {
      delete this.store[key];
    }
    clear() {
      this.store = {};
    }
  }
  global.localStorage = new LocalStorageMock();
}

// Suppress console logs during tests (unless debugging)
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: () => {},
    debug: () => {},
    info: () => {}
  };
}
