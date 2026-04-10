/**
 * Sync Controller
 * Orchestrates synchronization between local storage and GitHub
 */

class SyncController {
  constructor(localStorage, githubSync, options = {}) {
    this.localStorage = localStorage;
    this.githubSync = githubSync;
    
    // Configuration
    this.autoSyncInterval = options.autoSyncInterval || 60000; // 1 minute default
    this.conflictStrategy = options.conflictStrategy || 'last-write-wins'; // or 'manual'
    
    // State
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncTimer = null;
    this.syncQueue = [];
    
    // Event listeners
    this.listeners = {
      syncStart: [],
      syncComplete: [],
      syncError: [],
      conflictDetected: [],
      onlineStatusChange: []
    };

    // Setup online/offline detection
    this._setupOnlineDetection();
  }

  /**
   * Start automatic syncing
   */
  start() {
    console.log('Sync controller started');
    
    // Initial sync if online
    if (this.isOnline) {
      this.sync();
    }

    // Setup automatic sync interval
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, this.autoSyncInterval);
  }

  /**
   * Stop automatic syncing
   */
  stop() {
    console.log('Sync controller stopped');
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Manual sync trigger
   */
  async sync() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { status: 'already-syncing' };
    }

    if (!this.isOnline) {
      console.log('Cannot sync while offline');
      return { status: 'offline' };
    }

    this.isSyncing = true;
    this._emit('syncStart');

    try {
      console.log('Starting sync...');
      
      // Get all unsynced local records
      const unsyncedRecords = await this.localStorage.getUnsynced();
      
      const results = {
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        merged: 0,  // Track merge operations
        errors: []
      };

      // Upload unsynced records
      for (const record of unsyncedRecords) {
        try {
          const uploadResult = await this._uploadRecord(record);
          results.uploaded++;
          if (uploadResult?.merged) {
            results.merged++;
          }
        } catch (error) {
          console.error(`Error uploading ${record.id}:`, error);
          results.errors.push({
            record: record.id,
            error: error.message
          });
        }
      }

      this.lastSyncTime = new Date();
      this.isSyncing = false;
      
      this._emit('syncComplete', results);
      
      console.log('Sync complete:', results);
      return { status: 'success', results };

    } catch (error) {
      console.error('Sync error:', error);
      this.isSyncing = false;
      this._emit('syncError', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Download data from GitHub
   * @param {string} path - File path in GitHub repo
   * @param {string} localKey - Local storage key
   */
  async downloadFromGitHub(path, localKey) {
    try {
      const result = await this.githubSync.readFile(path);
      
      if (result.notFound) {
        console.log(`File ${path} not found on GitHub`);
        return { status: 'not-found' };
      }

      if (result.cached) {
        console.log(`File ${path} not modified`);
        return { status: 'not-modified' };
      }

      // Check for conflicts
      const localRecord = await this.localStorage.loadRecord(localKey);
      
      if (localRecord && !localRecord.synced) {
        // We have unsynced local changes - potential conflict
        if (this.conflictStrategy === 'last-write-wins') {
          // Compare timestamps (if available)
          const conflict = await this._detectConflict(localRecord, result);
          if (conflict) {
            this._emit('conflictDetected', { localRecord, remoteData: result, resolution: 'last-write-wins' });
            // For now, keep local changes and mark for upload
            return { status: 'conflict-local-wins' };
          }
        } else {
          // Manual conflict resolution needed
          this._emit('conflictDetected', { localRecord, remoteData: result, resolution: 'manual' });
          return { status: 'conflict-manual', localRecord, remoteData: result };
        }
      }

      // Save to local storage
      await this.localStorage.save(localKey, result.content, {
        synced: true,
        sha: result.sha,
        lastSyncTime: Date.now()
      });

      return { status: 'downloaded', data: result.content };

    } catch (error) {
      console.error(`Error downloading ${path}:`, error);
      throw error;
    }
  }

  /**
   * Merge local and remote data intelligently
   * @param {Object} local - Local data
   * @param {Object} remote - Remote data from GitHub
   * @returns {Object} - Merged data
   */
  mergeData(local, remote) {
    if (!local) return remote;
    if (!remote) return local;

    console.log('[SyncController] Merging data:', { local, remote });

    const merged = {};

    // Merge all top-level keys
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);

    for (const key of allKeys) {
      const localValue = local[key];
      const remoteValue = remote[key];

      // If only one side has the value, use it
      if (localValue === undefined) {
        merged[key] = remoteValue;
        continue;
      }
      if (remoteValue === undefined) {
        merged[key] = localValue;
        continue;
      }

      // Both sides have the value - merge based on type
      if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
        // Check if it's an array of objects with IDs
        const hasIds = localValue.length > 0 && localValue[0]?.id !== undefined;
        
        if (hasIds) {
          // Merge arrays of records by ID
          merged[key] = this._mergeRecordArrays(localValue, remoteValue);
        } else {
          // Simple array - union merge
          merged[key] = this._mergeSimpleArrays(localValue, remoteValue);
        }
      } else if (typeof localValue === 'object' && typeof remoteValue === 'object') {
        // Nested object - recursive merge
        merged[key] = this.mergeData(localValue, remoteValue);
      } else {
        // Primitive value - use remote (GitHub is source of truth)
        merged[key] = remoteValue;
      }
    }

    // Update lastUpdated to now
    merged.lastUpdated = new Date().toISOString();

    console.log('[SyncController] Merge result:', merged);
    return merged;
  }

  /**
   * Merge arrays of records (objects with ID and timestamps)
   */
  _mergeRecordArrays(localArray, remoteArray) {
    const merged = new Map();

    // Add all remote records first
    for (const record of remoteArray) {
      merged.set(record.id, record);
    }

    // Add or update with local records
    for (const localRecord of localArray) {
      const existingRecord = merged.get(localRecord.id);

      if (!existingRecord) {
        // New local record - add it
        merged.set(localRecord.id, localRecord);
      } else {
        // Record exists on both sides - use timestamp to resolve
        const localTime = new Date(localRecord.updatedAt || localRecord.createdAt || 0);
        const remoteTime = new Date(existingRecord.updatedAt || existingRecord.createdAt || 0);

        if (localTime > remoteTime) {
          // Local is newer
          merged.set(localRecord.id, localRecord);
          console.log(`[SyncController] Local record newer for ID ${localRecord.id}`);
        } else {
          // Remote is newer or same - keep remote
          console.log(`[SyncController] Remote record newer for ID ${localRecord.id}`);
        }
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Merge simple arrays (strings, numbers) - union merge
   */
  _mergeSimpleArrays(localArray, remoteArray) {
    // Union of both arrays, removing duplicates
    const uniqueValues = new Set([...localArray, ...remoteArray]);
    return Array.from(uniqueValues).sort();
  }

  /**
   * Upload data to GitHub
   * @param {string} localKey - Local storage key
   * @param {string} path - File path in GitHub repo
   * @param {string} commitMessage - Optional commit message
   */
  async uploadToGitHub(localKey, path, commitMessage = null) {
    try {
      const record = await this.localStorage.loadRecord(localKey);
      
      if (!record) {
        throw new Error(`No local data found for key: ${localKey}`);
      }

      const message = commitMessage || `Update ${path}`;
      
      // First, check if file exists on GitHub and get current SHA + data
      let currentSha = null;
      let remoteData = null;
      let dataToUpload = record.data;
      
      try {
        const existing = await this.githubSync.readFile(path);
        if (existing && !existing.notFound) {
          currentSha = existing.sha;
          remoteData = existing.content;
          
          // MERGE: Combine local and remote data
          if (remoteData) {
            console.log('[SyncController] Merging local and remote data before upload');
            dataToUpload = this.mergeData(record.data, remoteData);
            
            // Save merged data locally
            await this.localStorage.save(localKey, dataToUpload);
          }
        }
      } catch (e) {
        // File doesn't exist yet, that's fine
        console.log(`[SyncController] File ${path} doesn't exist on GitHub yet, will create`);
      }
      
      const result = await this.githubSync.writeFile(
        path,
        dataToUpload,  // Upload merged data
        currentSha,
        message
      );

      // Mark as synced with the new SHA
      await this.localStorage.markSynced(localKey, result.sha);

      return { 
        status: 'uploaded', 
        sha: result.sha,
        merged: remoteData !== null  // Indicate if merge occurred
      };

    } catch (error) {
      if (error.message.includes('Conflict')) {
        // File was modified on GitHub - need to download first
        return { status: 'conflict', error: error.message };
      }
      throw error;
    }
  }

  /**
   * Internal: Upload a record
   */
  async _uploadRecord(record) {
    // You'll need to know the GitHub path for each record
    // This could be stored in record metadata or derived from record.id
    const path = record.githubPath || `apps/data/${record.id}.json`;
    
    return await this.uploadToGitHub(record.id, path);
  }

  /**
   * Internal: Detect conflicts
   */
  async _detectConflict(localRecord, remoteData) {
    // Simple conflict detection: check if remote SHA differs from local SHA
    if (localRecord.sha && localRecord.sha !== remoteData.sha) {
      return true;
    }
    return false;
  }

  /**
   * Internal: Setup online/offline detection
   */
  _setupOnlineDetection() {
    window.addEventListener('online', () => {
      console.log('Network status: online');
      this.isOnline = true;
      this._emit('onlineStatusChange', true);
      
      // Trigger sync when coming back online
      if (!this.isSyncing) {
        setTimeout(() => this.sync(), 1000);
      }
    });

    window.addEventListener('offline', () => {
      console.log('Network status: offline');
      this.isOnline = false;
      this._emit('onlineStatusChange', false);
    });
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Internal: Emit event
   */
  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      autoSyncEnabled: this.syncTimer !== null
    };
  }

  /**
   * Force download and overwrite local data
   * @param {string} path - GitHub file path
   * @param {string} localKey - Local storage key
   */
  async forceDownload(path, localKey) {
    const result = await this.githubSync.readFile(path);
    
    if (result.notFound) {
      throw new Error(`File ${path} not found on GitHub`);
    }

    await this.localStorage.save(localKey, result.content, {
      synced: true,
      sha: result.sha,
      lastSyncTime: Date.now()
    });

    return { status: 'downloaded', data: result.content };
  }

  /**
   * Force upload and overwrite remote data
   * @param {string} localKey - Local storage key
   * @param {string} path - GitHub file path
   */
  async forceUpload(localKey, path) {
    const record = await this.localStorage.loadRecord(localKey);
    
    if (!record) {
      throw new Error(`No local data found for key: ${localKey}`);
    }

    // Get current SHA from GitHub
    let currentSha = null;
    try {
      const remoteFile = await this.githubSync.readFile(path);
      currentSha = remoteFile.sha;
    } catch (error) {
      // File might not exist yet
    }

    const result = await this.githubSync.writeFile(
      path,
      record.data,
      currentSha,
      `Force update ${path}`
    );

    await this.localStorage.markSynced(localKey, result.sha);

    return { status: 'uploaded', sha: result.sha };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncController;
}
