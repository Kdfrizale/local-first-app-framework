/**
 * Local Storage Manager
 * Handles local data persistence using IndexedDB with localStorage fallback
 */

class LocalStorage {
  constructor(appName, version = 1) {
    this.appName = appName;
    this.version = version;
    this.dbName = `localfirst-${appName}`;
    this.db = null;
    this.storeName = 'data';
    this.settingsKey = `${appName}-settings`;
  }

  /**
   * Initialize the database
   */
  async init() {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      console.warn('IndexedDB not available, falling back to localStorage');
      this.useLocalStorageFallback = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error, falling back to localStorage');
        this.useLocalStorageFallback = true;
        resolve();
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  /**
   * Save data
   * @param {string} key - Unique identifier
   * @param {any} data - Data to save
   * @param {Object} metadata - Optional metadata (synced, timestamp, etc.)
   */
  async save(key, data, metadata = {}) {
    if (this.useLocalStorageFallback) {
      return this._saveToLocalStorage(key, data, metadata);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);

      const record = {
        id: key,
        data: data,
        timestamp: Date.now(),
        synced: metadata.synced || false,
        sha: metadata.sha || null,
        ...metadata
      };

      const request = objectStore.put(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load data by key
   * @param {string} key - Unique identifier
   */
  async load(key) {
    if (this.useLocalStorageFallback) {
      return this._loadFromLocalStorage(key);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load full record with metadata
   * @param {string} key - Unique identifier
   */
  async loadRecord(key) {
    if (this.useLocalStorageFallback) {
      return this._loadRecordFromLocalStorage(key);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all records
   */
  async getAll() {
    if (this.useLocalStorageFallback) {
      return this._getAllFromLocalStorage();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all keys
   */
  async getAllKeys() {
    if (this.useLocalStorageFallback) {
      return this._getAllKeysFromLocalStorage();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAllKeys();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete data by key
   * @param {string} key - Unique identifier
   */
  async delete(key) {
    if (this.useLocalStorageFallback) {
      return this._deleteFromLocalStorage(key);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data
   */
  async clear() {
    if (this.useLocalStorageFallback) {
      return this._clearLocalStorage();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get unsynced records
   */
  async getUnsynced() {
    if (this.useLocalStorageFallback) {
      return this._getUnsyncedFromLocalStorage();
    }

    // Get all records and filter for unsynced ones
    // (Boolean indexing in IndexedDB is unreliable)
    const allRecords = await this.getAll();
    return allRecords.filter(record => !record.synced);
  }

  /**
   * Mark record as synced
   * @param {string} key - Record key
   * @param {string} sha - GitHub SHA
   */
  async markSynced(key, sha) {
    const record = await this.loadRecord(key);
    if (record) {
      record.synced = true;
      record.sha = sha;
      record.lastSyncTime = Date.now();
      await this.save(key, record.data, {
        synced: true,
        sha: sha,
        lastSyncTime: record.lastSyncTime
      });
    }
  }

  // Settings management (always uses localStorage)
  
  /**
   * Save setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   */
  saveSetting(key, value) {
    const settings = this.loadSettings();
    settings[key] = value;
    localStorage.setItem(this.settingsKey, JSON.stringify(settings));
  }

  /**
   * Load setting
   * @param {string} key - Setting key
   * @param {any} defaultValue - Default if not found
   */
  loadSetting(key, defaultValue = null) {
    const settings = this.loadSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }

  /**
   * Load all settings
   */
  loadSettings() {
    const settingsStr = localStorage.getItem(this.settingsKey);
    return settingsStr ? JSON.parse(settingsStr) : {};
  }

  /**
   * Clear all settings
   */
  clearSettings() {
    localStorage.removeItem(this.settingsKey);
  }

  // LocalStorage fallback methods

  _saveToLocalStorage(key, data, metadata) {
    const record = {
      id: key,
      data: data,
      timestamp: Date.now(),
      synced: metadata.synced || false,
      sha: metadata.sha || null,
      ...metadata
    };
    localStorage.setItem(`${this.dbName}-${key}`, JSON.stringify(record));
    return Promise.resolve(record);
  }

  _loadFromLocalStorage(key) {
    const recordStr = localStorage.getItem(`${this.dbName}-${key}`);
    if (!recordStr) return Promise.resolve(null);
    const record = JSON.parse(recordStr);
    return Promise.resolve(record.data);
  }

  _loadRecordFromLocalStorage(key) {
    const recordStr = localStorage.getItem(`${this.dbName}-${key}`);
    return Promise.resolve(recordStr ? JSON.parse(recordStr) : null);
  }

  _getAllFromLocalStorage() {
    const records = [];
    const prefix = `${this.dbName}-`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix) && key !== this.settingsKey) {
        const recordStr = localStorage.getItem(key);
        records.push(JSON.parse(recordStr));
      }
    }
    return Promise.resolve(records);
  }

  _getAllKeysFromLocalStorage() {
    const keys = [];
    const prefix = `${this.dbName}-`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix) && key !== this.settingsKey) {
        keys.push(key.replace(prefix, ''));
      }
    }
    return Promise.resolve(keys);
  }

  _deleteFromLocalStorage(key) {
    localStorage.removeItem(`${this.dbName}-${key}`);
    return Promise.resolve(true);
  }

  _clearLocalStorage() {
    const prefix = `${this.dbName}-`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix) && key !== this.settingsKey) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return Promise.resolve(true);
  }

  _getUnsyncedFromLocalStorage() {
    const records = [];
    const prefix = `${this.dbName}-`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix) && key !== this.settingsKey) {
        const recordStr = localStorage.getItem(key);
        const record = JSON.parse(recordStr);
        if (!record.synced) {
          records.push(record);
        }
      }
    }
    return Promise.resolve(records);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocalStorage;
}
