/**
 * App Configuration
 * Customize these values for your app
 */

const CONFIG = {
  appName: 'my-app',
  github: {
    owner: 'your-username',
    repo: 'family-data',
    branch: 'main',
    dataPath: 'apps/my-app/data.json'
  }
};

// Initialize app
let storage, github, syncController, router, appState;

/**
 * Initialize the application
 */
async function initApp() {
  // Initialize local storage
  storage = new LocalStorage(CONFIG.appName);
  await storage.init();
  
  // Initialize state management
  appState = new State({
    isSetup: false,
    isSyncing: false,
    items: []
  });
  
  // Check if GitHub is configured
  const token = storage.loadSetting('githubToken');
  const owner = storage.loadSetting('githubOwner') || CONFIG.github.owner;
  const repo = storage.loadSetting('githubRepo') || CONFIG.github.repo;
  
  if (token) {
    await setupGitHubSync(token, owner, repo);
    appState.set('isSetup', true);
    loadData();
  } else {
    showSetupScreen();
  }
  
  // Setup router
  setupRouter();
  
  // Setup UI event listeners
  setupEventListeners();
  
  // Setup offline indicator
  setupOfflineIndicator();
}

/**
 * Setup GitHub sync
 */
async function setupGitHubSync(token, owner, repo) {
  github = new GitHubSync({
    token: token,
    owner: owner,
    repo: repo,
    branch: CONFIG.github.branch
  });
  
  syncController = new SyncController(storage, github);
  
  // Listen to sync events
  syncController.on('syncStart', () => {
    appState.set('isSyncing', true);
    updateSyncButton(true);
  });
  
  syncController.on('syncComplete', (results) => {
    appState.set('isSyncing', false);
    updateSyncButton(false);
    
    // Check for partial sync failures
    if (results.errors && results.errors.length > 0) {
      toast.warning(`Sync completed with ${results.errors.length} error(s)`, 5000);
    } else if (results.uploaded > 0 || results.downloaded > 0) {
      toast.success(`Sync complete! ${results.uploaded} uploaded, ${results.downloaded} downloaded`, 3000);
    }
    
    // Reload data if anything changed
    if (results.uploaded > 0 || results.downloaded > 0) {
      loadData();
    }
  });
  
  syncController.on('syncError', (error) => {
    appState.set('isSyncing', false);
    updateSyncButton(false);
    toast.error(`Sync failed: ${error.message}`, 5000);
  });
  
  // Start automatic syncing
  syncController.start();
}

/**
 * Load data from local storage
 */
async function loadData() {
  const data = await storage.load('appData');
  
  if (data) {
    appState.set('items', data.items || []);
    renderItems();
  } else {
    // Try to download from GitHub
    if (syncController) {
      try {
        const result = await syncController.downloadFromGitHub(
          CONFIG.github.dataPath,
          'appData'
        );
        
        if (result.status === 'downloaded') {
          appState.set('items', result.data.items || []);
          renderItems();
        }
      } catch (error) {
        console.log('No data on GitHub yet');
      }
    }
  }
}

/**
 * Save data to local storage
 */
async function saveData() {
  const data = {
    items: appState.get('items'),
    lastUpdated: new Date().toISOString()
  };
  
  await storage.save('appData', data, {
    synced: false,
    githubPath: CONFIG.github.dataPath
  });
  
  // Trigger sync if online
  if (syncController && navigator.onLine) {
    syncController.sync();
  }
}

/**
 * Render items (customize this for your app)
 */
function renderItems() {
  const items = appState.get('items');
  const container = document.getElementById('app-container');
  
  if (items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">No items yet</h2>
        <p class="text-gray-600 mb-8">Get started by adding your first item.</p>
      </div>
    `;
  } else {
    // Use ListHelper to render items
    ListHelper.render(
      items,
      (item, index) => {
        return `
          <div class="bg-white p-4 rounded-lg shadow mb-4">
            <h3 class="font-semibold text-gray-900">${item.title || 'Untitled'}</h3>
            <p class="text-gray-600 text-sm mt-1">${item.description || ''}</p>
          </div>
        `;
      },
      container,
      {
        emptyMessage: 'No items to display'
      }
    );
  }
}

/**
 * Show setup screen
 */
function showSetupScreen() {
  const container = document.getElementById('app-container');
  
  container.innerHTML = `
    <div class="max-w-md mx-auto">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Setup GitHub Sync</h2>
        <p class="text-gray-600 mb-6">Enter your GitHub details to enable data synchronization.</p>
        
        <form id="setup-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              GitHub Personal Access Token
            </label>
            <input 
              type="password" 
              name="token" 
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ghp_..."
            />
            <p class="text-xs text-gray-500 mt-1">
              <a href="https://github.com/settings/tokens/new" target="_blank" class="text-blue-600 hover:underline">
                Create a token
              </a> with 'repo' scope
            </p>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              GitHub Username
            </label>
            <input 
              type="text" 
              name="owner" 
              required
              value="${CONFIG.github.owner}"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Repository Name
            </label>
            <input 
              type="text" 
              name="repo" 
              required
              value="${CONFIG.github.repo}"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button 
            type="submit"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Connect to GitHub
          </button>
        </form>
      </div>
    </div>
  `;
  
  // Setup form submission
  FormHelper.onSubmit('#setup-form', async (data) => {
    try {
      // Test connection
      const testGithub = new GitHubSync({
        token: data.token,
        owner: data.owner,
        repo: data.repo
      });
      
      const authTest = await testGithub.testAuth();
      
      if (!authTest.success) {
        toast.error('GitHub authentication failed. Please check your token.');
        return;
      }
      
      const repoTest = await testGithub.validateRepo();
      
      if (!repoTest.success) {
        toast.error('Cannot access repository. Please check the repo name and token permissions.');
        return;
      }
      
      // Save settings
      storage.saveSetting('githubToken', data.token);
      storage.saveSetting('githubOwner', data.owner);
      storage.saveSetting('githubRepo', data.repo);
      
      // Setup sync
      await setupGitHubSync(data.token, data.owner, data.repo);
      appState.set('isSetup', true);
      
      toast.success('GitHub sync configured successfully!');
      
      // Load data
      loadData();
      
    } catch (error) {
      toast.error(`Setup failed: ${error.message}`);
    }
  });
}

/**
 * Setup router
 */
function setupRouter() {
  router = new Router();
  
  router.on('/', () => {
    // Home route
    if (appState.get('isSetup')) {
      renderItems();
    } else {
      showSetupScreen();
    }
  });
  
  // Add more routes as needed
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Sync button
  document.getElementById('sync-btn').addEventListener('click', async () => {
    if (syncController) {
      await syncController.sync();
    } else {
      toast.warning('GitHub sync is not configured yet');
    }
  });
  
  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    showSettings();
  });
}

/**
 * Show settings modal
 */
async function showSettings() {
  const token = storage.loadSetting('githubToken');
  const owner = storage.loadSetting('githubOwner');
  const repo = storage.loadSetting('githubRepo');
  
  const content = `
    <div class="space-y-4">
      <div>
        <p class="text-sm font-medium text-gray-700">GitHub Owner</p>
        <p class="text-gray-900">${owner || 'Not configured'}</p>
      </div>
      <div>
        <p class="text-sm font-medium text-gray-700">Repository</p>
        <p class="text-gray-900">${repo || 'Not configured'}</p>
      </div>
      <div>
        <p class="text-sm font-medium text-gray-700">Token</p>
        <p class="text-gray-900">${token ? '••••••••' : 'Not configured'}</p>
      </div>
      ${syncController ? `
      <div>
        <p class="text-sm font-medium text-gray-700">Last Sync</p>
        <p class="text-gray-900">${syncController.lastSyncTime ? syncController.lastSyncTime.toLocaleString() : 'Never'}</p>
      </div>
      ` : ''}
    </div>
  `;
  
  modal.show({
    title: 'Settings',
    content,
    buttons: [
      {
        text: 'Reconfigure',
        onClick: () => {
          modal.close();
          storage.clearSettings();
          appState.set('isSetup', false);
          if (syncController) {
            syncController.stop();
          }
          showSetupScreen();
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
 * Update sync button state
 */
function updateSyncButton(syncing) {
  const btn = document.getElementById('sync-btn');
  const icon = document.getElementById('sync-icon');
  const text = document.getElementById('sync-text');
  
  if (syncing) {
    btn.disabled = true;
    icon.textContent = '⏳';
    text.textContent = 'Syncing...';
  } else {
    btn.disabled = false;
    icon.textContent = '🔄';
    text.textContent = 'Sync';
  }
}

/**
 * Setup offline indicator
 */
function setupOfflineIndicator() {
  const indicator = document.getElementById('offline-indicator');
  
  function updateOnlineStatus() {
    if (navigator.onLine) {
      indicator.classList.remove('show');
    } else {
      indicator.classList.add('show');
    }
  }
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  updateOnlineStatus();
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
