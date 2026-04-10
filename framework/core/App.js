/**
 * Base Application Class
 * Simple local-first app with GitHub sync
 * 
 * Sync Flow:
 * 1. On load: Load local data instantly, then pull from GitHub
 * 2. If conflict: Show modal (Keep Local / Use Remote / Merge)
 * 3. Push local changes to GitHub
 * 4. Sync button: Force pull, handle conflicts, push
 * 
 * @example
 * class MyApp extends App {
 *   constructor() {
 *     super({
 *       appName: 'my-app',
 *       dataPath: 'apps/my-app/data.json'
 *     });
 *   }
 *   
 *   onDataLoaded(data) {
 *     // Update UI with data
 *   }
 *   
 *   getData() {
 *     return { items: [...] };
 *   }
 * }
 */

class App {
  constructor(config) {
    this.config = {
      appName: config.appName,
      dataPath: config.dataPath,
      branch: config.branch || 'main'
    };
    
    this.storage = null;
    this.github = null;
    this.state = new State(config.initialState || {});
    
    // Track sync state
    this.localData = null;
    this.localSha = null;
    this.isSyncing = false;
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async init() {
    // 1. Initialize storage
    this.storage = new Storage(this.config.appName);
    await this.storage.init();
    
    // 2. Load local data immediately (instant UI)
    await this._loadLocalData();
    
    // 3. Check for GitHub config
    const token = this.storage.loadSharedSetting('githubToken');
    const owner = this.storage.loadSharedSetting('githubOwner');
    const repo = this.storage.loadSharedSetting('githubRepo');
    
    if (token && owner && repo) {
      this.github = new GitHubSync({ token, owner, repo, branch: this.config.branch });
      
      // 4. Pull from GitHub on load
      if (navigator.onLine) {
        await this._pullFromGitHub();
      }
    }
    
    // 5. Setup offline indicator
    this._setupOfflineIndicator();
    
    // 6. Call subclass init
    if (typeof this.onInit === 'function') {
      await this.onInit();
    }
    
    return this;
  }

  // ============================================================
  // CORE SYNC OPERATIONS
  // ============================================================

  /**
   * Load data from local storage
   */
  async _loadLocalData() {
    const record = await this.storage.loadRecord('appData');
    
    if (record && record.data) {
      this.localData = record.data;
      this.localSha = record.sha || null;
      this._notifyDataLoaded(this.localData, 'local');
    } else {
      this.localData = {};
      this._notifyDataLoaded({}, 'empty');
    }
  }

  /**
   * Pull data from GitHub and handle conflicts
   */
  async _pullFromGitHub() {
    if (!this.github) {
      console.log('[App] GitHub not configured');
      return { status: 'not-configured' };
    }
    
    if (!navigator.onLine) {
      console.log('[App] Offline, skipping pull');
      return { status: 'offline' };
    }
    
    this._setSyncing(true);
    
    try {
      console.log('[App] Pulling from GitHub:', this.config.dataPath);
      
      // Always fetch fresh (no cache)
      const remote = await this.github.readFile(this.config.dataPath, { noCache: true });
      
      if (remote.notFound) {
        console.log('[App] No remote file exists yet');
        this._setSyncing(false);
        return { status: 'no-remote' };
      }
      
      const remoteData = remote.content;
      const remoteSha = remote.sha;
      
      // Check if remote is different from local
      if (this._dataEquals(this.localData, remoteData)) {
        console.log('[App] Data is in sync');
        this.localSha = remoteSha;
        await this._saveLocal(this.localData, remoteSha, true);
        this._setSyncing(false);
        return { status: 'in-sync' };
      }
      
      // Data differs - check for conflict
      const localRecord = await this.storage.loadRecord('appData');
      const hasUnsyncedChanges = localRecord && localRecord.synced === false;
      
      if (hasUnsyncedChanges && this.localData && Object.keys(this.localData).length > 0) {
        // CONFLICT: Local has unsynced changes and remote is different
        console.log('[App] Conflict detected');
        const resolution = await this._showConflictModal(this.localData, remoteData);
        
        if (resolution === 'local') {
          // Keep local, push to GitHub
          await this._pushToGitHub(remoteSha);
        } else if (resolution === 'remote') {
          // Use remote
          this.localData = remoteData;
          this.localSha = remoteSha;
          await this._saveLocal(remoteData, remoteSha, true);
          this._notifyDataLoaded(remoteData, 'remote');
        } else if (resolution === 'merge') {
          // Merge both
          const merged = this._mergeData(this.localData, remoteData);
          this.localData = merged;
          await this._saveLocal(merged, remoteSha, false);
          this._notifyDataLoaded(merged, 'merged');
          await this._pushToGitHub(remoteSha);
        }
      } else {
        // No conflict - just use remote data
        console.log('[App] Using remote data');
        this.localData = remoteData;
        this.localSha = remoteSha;
        await this._saveLocal(remoteData, remoteSha, true);
        this._notifyDataLoaded(remoteData, 'remote');
      }
      
      this._setSyncing(false);
      this._showToast('Synced with GitHub', 'success');
      return { status: 'synced' };
      
    } catch (error) {
      console.error('[App] Pull error:', error);
      this._setSyncing(false);
      this._showToast('Sync failed: ' + error.message, 'error');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Push local data to GitHub
   */
  async _pushToGitHub(sha = null) {
    if (!this.github) {
      return { status: 'not-configured' };
    }
    
    if (!navigator.onLine) {
      return { status: 'offline' };
    }
    
    try {
      console.log('[App] Pushing to GitHub:', this.config.dataPath);
      
      // Get current SHA if we don't have it
      if (!sha) {
        try {
          const remote = await this.github.readFile(this.config.dataPath, { noCache: true });
          sha = remote.sha;
        } catch (e) {
          // File doesn't exist yet, that's fine
          sha = null;
        }
      }
      
      const data = typeof this.getData === 'function' ? this.getData() : this.localData;
      data.lastUpdated = new Date().toISOString();
      
      const result = await this.github.writeFile(
        this.config.dataPath,
        data,
        sha,
        `Update ${this.config.appName} data`
      );
      
      this.localSha = result.sha;
      await this._saveLocal(data, result.sha, true);
      
      console.log('[App] Push successful, new SHA:', result.sha);
      return { status: 'pushed', sha: result.sha };
      
    } catch (error) {
      console.error('[App] Push error:', error);
      throw error;
    }
  }

  /**
   * Save data to local storage
   */
  async _saveLocal(data, sha, synced) {
    await this.storage.save('appData', data, {
      sha: sha,
      synced: synced,
      githubPath: this.config.dataPath
    });
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Save data and sync to GitHub
   */
  async saveData() {
    if (typeof this.getData !== 'function') {
      throw new Error('Subclass must implement getData()');
    }
    
    const data = this.getData();
    data.lastUpdated = new Date().toISOString();
    this.localData = data;
    
    // Save locally (mark as unsynced)
    await this._saveLocal(data, this.localSha, false);
    
    // Push to GitHub if configured and online
    if (this.github && navigator.onLine) {
      try {
        await this._pushToGitHub(this.localSha);
        this._showToast('Saved and synced!', 'success');
      } catch (error) {
        this._showToast('Saved locally. Sync failed.', 'warning');
      }
    } else {
      this._showToast('Saved locally', 'info');
    }
  }

  /**
   * Sync button handler - force pull and push
   */
  async sync() {
    if (!this.github) {
      this._showToast('GitHub not configured. Click Settings to set up.', 'warning');
      this.showSetupScreen();
      return;
    }
    
    if (!navigator.onLine) {
      this._showToast('Cannot sync while offline', 'warning');
      return;
    }
    
    await this._pullFromGitHub();
  }

  /**
   * Show settings modal
   */
  showSettings() {
    const token = this.storage.loadSharedSetting('githubToken');
    const owner = this.storage.loadSharedSetting('githubOwner');
    const repo = this.storage.loadSharedSetting('githubRepo');
    
    modal.show({
      title: '⚙️ Settings',
      content: `
        <div class="space-y-3">
          <div>
            <span class="text-sm text-gray-500">GitHub:</span>
            <span class="font-medium">${owner || 'Not configured'}/${repo || ''}</span>
          </div>
          <div>
            <span class="text-sm text-gray-500">Status:</span>
            <span class="font-medium">${this.github ? '✅ Connected' : '❌ Not connected'}</span>
          </div>
          <div>
            <span class="text-sm text-gray-500">Network:</span>
            <span class="font-medium">${navigator.onLine ? '🟢 Online' : '🔴 Offline'}</span>
          </div>
        </div>
      `,
      buttons: [
        {
          text: 'Reconfigure',
          onClick: () => {
            modal.close();
            this._clearGitHubConfig();
            this.showSetupScreen();
          }
        },
        {
          text: 'Close',
          primary: true,
          onClick: () => modal.close()
        }
      ]
    });
  }

  /**
   * Show GitHub setup screen
   */
  showSetupScreen() {
    const owner = this.storage.loadSharedSetting('githubOwner') || '';
    const repo = this.storage.loadSharedSetting('githubRepo') || 'local-first-data';
    
    modal.show({
      title: '🔗 Connect to GitHub',
      content: `
        <form id="github-setup-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Personal Access Token</label>
            <input type="password" name="token" required
              class="w-full px-3 py-2 border rounded-md"
              placeholder="ghp_...">
            <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank"
              class="text-xs text-blue-600 hover:underline">Create token with 'repo' scope</a>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" name="owner" required value="${owner}"
              class="w-full px-3 py-2 border rounded-md">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Repository</label>
            <input type="text" name="repo" required value="${repo}"
              class="w-full px-3 py-2 border rounded-md">
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Connect',
          primary: true,
          onClick: async () => {
            const form = document.getElementById('github-setup-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }
            
            const formData = new FormData(form);
            const token = formData.get('token');
            const owner = formData.get('owner');
            const repo = formData.get('repo');
            
            // Test connection
            this._showToast('Testing connection...', 'info');
            const testGithub = new GitHubSync({ token, owner, repo });
            const authResult = await testGithub.testAuth();
            
            if (!authResult.success) {
              this._showToast('Authentication failed. Check your token.', 'error');
              return;
            }
            
            // Save config
            this.storage.saveSharedSetting('githubToken', token);
            this.storage.saveSharedSetting('githubOwner', owner);
            this.storage.saveSharedSetting('githubRepo', repo);
            
            this.github = testGithub;
            modal.close();
            
            this._showToast('Connected to GitHub!', 'success');
            
            // Pull data
            await this._pullFromGitHub();
          }
        }
      ],
      closeOnBackdrop: false
    });
  }

  // ============================================================
  // CONFLICT RESOLUTION
  // ============================================================

  async _showConflictModal(localData, remoteData) {
    return new Promise((resolve) => {
      const localSummary = this._summarizeData(localData);
      const remoteSummary = this._summarizeData(remoteData);
      
      modal.show({
        title: '⚠️ Sync Conflict',
        content: `
          <p class="mb-4 text-gray-600">Changes exist both locally and on GitHub.</p>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="p-3 bg-blue-50 rounded border border-blue-200">
              <div class="font-medium text-blue-800 mb-1">📱 Local</div>
              <div class="text-sm text-blue-700">${localSummary}</div>
            </div>
            <div class="p-3 bg-green-50 rounded border border-green-200">
              <div class="font-medium text-green-800 mb-1">☁️ GitHub</div>
              <div class="text-sm text-green-700">${remoteSummary}</div>
            </div>
          </div>
        `,
        buttons: [
          { text: 'Keep Local', onClick: () => { modal.close(); resolve('local'); } },
          { text: 'Use GitHub', onClick: () => { modal.close(); resolve('remote'); } },
          { text: 'Merge Both', primary: true, onClick: () => { modal.close(); resolve('merge'); } }
        ],
        closeOnBackdrop: false,
        closeOnEscape: false
      });
    });
  }

  _summarizeData(data) {
    if (!data) return 'Empty';
    const parts = [];
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        parts.push(`${value.length} ${key}`);
      } else if (key === 'lastUpdated') {
        parts.push(`Updated: ${new Date(value).toLocaleString()}`);
      }
    }
    return parts.join('<br>') || 'No data';
  }

  _mergeData(local, remote) {
    const merged = { ...remote };
    
    for (const [key, value] of Object.entries(local)) {
      if (Array.isArray(value) && Array.isArray(remote[key])) {
        // Merge arrays by ID
        const remoteIds = new Set(remote[key].map(item => item.id));
        const combined = [...remote[key]];
        for (const item of value) {
          if (item.id && !remoteIds.has(item.id)) {
            combined.push(item);
          }
        }
        merged[key] = combined;
      } else if (!remote.hasOwnProperty(key)) {
        merged[key] = value;
      }
    }
    
    merged.lastUpdated = new Date().toISOString();
    return merged;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  _notifyDataLoaded(data, source) {
    console.log('[App] Data loaded from:', source);
    if (typeof this.onDataLoaded === 'function') {
      this.onDataLoaded(data, source);
    }
  }

  _dataEquals(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  _setSyncing(syncing) {
    this.isSyncing = syncing;
    this._updateSyncUI(syncing);
  }

  _updateSyncUI(syncing) {
    const btn = document.getElementById('sync-btn');
    const icon = document.getElementById('sync-icon');
    
    if (btn) {
      btn.disabled = syncing;
    }
    if (icon) {
      icon.style.animation = syncing ? 'spin 1s linear infinite' : 'none';
    }
  }

  _showToast(message, type = 'info') {
    if (typeof toast !== 'undefined') {
      toast[type] ? toast[type](message) : toast.info(message);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  _clearGitHubConfig() {
    this.storage.saveSharedSetting('githubToken', null);
    this.storage.saveSharedSetting('githubOwner', null);
    this.storage.saveSharedSetting('githubRepo', null);
    this.github = null;
  }

  _setupOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    
    const updateIndicator = () => {
      if (indicator) {
        indicator.style.display = navigator.onLine ? 'none' : 'flex';
      }
    };
    
    window.addEventListener('online', () => {
      updateIndicator();
      this._showToast('Back online', 'success');
    });
    
    window.addEventListener('offline', () => {
      updateIndicator();
      this._showToast('You are offline', 'warning');
    });
    
    updateIndicator();
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}
