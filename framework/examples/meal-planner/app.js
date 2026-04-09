/**
 * Meal Planner App
 * A local-first weekly meal planning application
 */

// App Configuration
const CONFIG = {
  appName: 'meal-planner',
  github: {
    dataPath: 'apps/meal-planner/data.json'
  },
  mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
};

// State Management
const appState = new State({
  currentWeekStart: getWeekStart(new Date()),
  meals: {},  // { "2026-04-07": { "Breakfast": {...}, "Lunch": {...}, ... } }
  favorites: [],
  shoppingList: [],
  isSetup: false,
  isSyncing: false
});

// Storage and Sync
let storage;
let githubSync;
let syncController;

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  storage = new LocalStorage(CONFIG.appName);
  await storage.init();
  
  // Check if GitHub is configured
  const token = storage.loadSetting('githubToken');
  const owner = storage.loadSetting('githubOwner');
  const repo = storage.loadSetting('githubRepo');
  
  if (token && owner && repo) {
    appState.set('isSetup', true);
    await initializeSync(token, owner, repo);
  }
  
  // Subscribe to state changes
  appState.subscribe('currentWeekStart', renderWeek);
  appState.subscribe('meals', () => {
    renderMealGrid();
    renderStats();
  });
  appState.subscribe('favorites', renderFavorites);
  
  // Load data and render
  await loadData();
  renderWeek();
  renderMealGrid();
  renderFavorites();
  renderStats();
  
  if (!appState.get('isSetup')) {
    showSetupScreen();
  }
});

async function initializeSync(token, owner, repo) {
  githubSync = new GitHubSync({ token, owner, repo });
  
  try {
    await githubSync.testAuth();
    syncController = new SyncController(storage, githubSync);
    
    syncController.on('syncStart', () => {
      appState.set('isSyncing', true);
      document.getElementById('sync-status').textContent = '🔄';
    });
    
    syncController.on('syncComplete', () => {
      appState.set('isSyncing', false);
      document.getElementById('sync-status').textContent = '●';
      loadData();
    });
    
    syncController.on('syncError', (error) => {
      appState.set('isSyncing', false);
      document.getElementById('sync-status').textContent = '⚠️';
    });
    
    syncController.start();
  } catch (error) {
    console.error('Sync init failed:', error);
    toast.error('GitHub sync failed: ' + error.message);
    // Don't start sync controller if auth failed
    githubSync = null;
    syncController = null;
  }
}

// Date Utilities
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getWeekDates(startDate) {
  const dates = [];
  const start = new Date(startDate + 'T00:00:00');
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Data Management
async function loadData() {
  const data = await storage.load('mealData');
  
  if (data) {
    appState.set({
      meals: data.meals || {},
      favorites: data.favorites || [],
      shoppingList: data.shoppingList || []
    });
  } else if (syncController) {
    try {
      const result = await syncController.downloadFromGitHub(CONFIG.github.dataPath, 'mealData');
      if (result.status === 'downloaded' && result.data) {
        appState.set({
          meals: result.data.meals || {},
          favorites: result.data.favorites || [],
          shoppingList: result.data.shoppingList || []
        });
      }
    } catch (e) {
      console.log('No remote data yet');
    }
  }
}

async function saveData() {
  const data = {
    meals: appState.get('meals'),
    favorites: appState.get('favorites'),
    shoppingList: appState.get('shoppingList'),
    lastUpdated: new Date().toISOString()
  };
  
  await storage.save('mealData', data, {
    synced: false,
    githubPath: CONFIG.github.dataPath
  });
  
  if (syncController && navigator.onLine) {
    setTimeout(() => syncController.sync(), 500);
  }
}

// Rendering
function renderWeek() {
  const weekStart = appState.get('currentWeekStart');
  const dates = getWeekDates(weekStart);
  
  // Update week display
  const weekEnd = dates[6];
  document.getElementById('week-display').textContent = 
    `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  
  // Update day headers
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dates.forEach((date, i) => {
    const d = new Date(date + 'T00:00:00');
    const isToday = date === new Date().toISOString().split('T')[0];
    document.getElementById(`day-${i}`).innerHTML = `
      <div class="${isToday ? 'bg-emerald-600 text-white rounded-lg p-1' : ''}">
        <div class="font-semibold">${dayNames[d.getDay()]}</div>
        <div class="text-xs">${d.getDate()}</div>
      </div>
    `;
  });
}

function renderMealGrid() {
  const weekStart = appState.get('currentWeekStart');
  const dates = getWeekDates(weekStart);
  const meals = appState.get('meals') || {};
  
  const grid = document.getElementById('meal-grid');
  grid.innerHTML = CONFIG.mealTypes.map(mealType => `
    <tr class="border-b">
      <td class="p-3 font-medium text-gray-700 bg-gray-50">${getMealEmoji(mealType)} ${mealType}</td>
      ${dates.map(date => {
        const meal = meals[date]?.[mealType];
        return `
          <td class="p-2 border-l">
            <div class="meal-slot rounded-lg p-2 cursor-pointer ${meal ? 'bg-emerald-50' : 'bg-gray-50 hover:bg-emerald-50'}"
                 onclick="editMeal('${date}', '${mealType}')">
              ${meal ? `
                <div class="text-sm font-medium text-gray-800">${meal.name}</div>
                ${meal.notes ? `<div class="text-xs text-gray-500 truncate">${meal.notes}</div>` : ''}
              ` : `
                <div class="text-xs text-gray-400 text-center">+ Add</div>
              `}
            </div>
          </td>
        `;
      }).join('')}
    </tr>
  `).join('');
}

function getMealEmoji(mealType) {
  const emojis = { 'Breakfast': '🌅', 'Lunch': '☀️', 'Dinner': '🌙', 'Snacks': '🍎' };
  return emojis[mealType] || '🍽️';
}

function renderFavorites() {
  const favorites = appState.get('favorites') || [];
  const container = document.getElementById('favorites-container');
  
  if (favorites.length === 0) {
    container.innerHTML = '<p class="text-gray-400 text-sm">No favorites yet. Add your family\'s go-to meals!</p>';
    return;
  }
  
  container.innerHTML = favorites.map(fav => `
    <button class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-emerald-100 text-sm flex items-center gap-2 group"
            onclick="useFavorite('${fav.id}')">
      <span>${fav.name}</span>
      <span class="text-gray-400 group-hover:text-red-500" onclick="event.stopPropagation(); deleteFavorite('${fav.id}')">×</span>
    </button>
  `).join('');
}

function renderStats() {
  const meals = appState.get('meals') || {};
  const weekStart = appState.get('currentWeekStart');
  const dates = getWeekDates(weekStart);
  const shoppingList = appState.get('shoppingList') || [];
  
  let planned = 0;
  const recipes = new Set();
  
  dates.forEach(date => {
    if (meals[date]) {
      Object.values(meals[date]).forEach(meal => {
        if (meal && meal.name) {
          planned++;
          recipes.add(meal.name.toLowerCase());
        }
      });
    }
  });
  
  document.getElementById('stat-planned').textContent = planned;
  document.getElementById('stat-recipes').textContent = recipes.size;
  document.getElementById('stat-shopping').textContent = shoppingList.length;
}

// Navigation
function previousWeek() {
  const current = appState.get('currentWeekStart');
  const date = new Date(current + 'T00:00:00');
  date.setDate(date.getDate() - 7);
  appState.set('currentWeekStart', date.toISOString().split('T')[0]);
  renderMealGrid();
}

function nextWeek() {
  const current = appState.get('currentWeekStart');
  const date = new Date(current + 'T00:00:00');
  date.setDate(date.getDate() + 7);
  appState.set('currentWeekStart', date.toISOString().split('T')[0]);
  renderMealGrid();
}

// Meal Management
window.editMeal = function(date, mealType) {
  const meals = appState.get('meals') || {};
  const existing = meals[date]?.[mealType];
  const favorites = appState.get('favorites') || [];
  
  const favoritesHtml = favorites.length > 0 ? `
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Quick Pick from Favorites</label>
      <div class="flex flex-wrap gap-2">
        ${favorites.map(f => `
          <button type="button" class="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                  onclick="document.getElementById('meal-name').value='${f.name}'; document.getElementById('meal-notes').value='${f.notes || ''}';">
            ${f.name}
          </button>
        `).join('')}
      </div>
    </div>
  ` : '';
  
  modal.show({
    title: `${getMealEmoji(mealType)} ${mealType} - ${formatDate(date)}`,
    content: `
      <form id="meal-form" class="space-y-4">
        ${favoritesHtml}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Meal Name</label>
          <input type="text" id="meal-name" name="name" value="${existing?.name || ''}" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                 placeholder="e.g., Spaghetti Bolognese" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Notes / Ingredients</label>
          <textarea id="meal-notes" name="notes" rows="3" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Shopping items, recipe notes...">${existing?.notes || ''}</textarea>
        </div>
      </form>
    `,
    buttons: [
      existing ? {
        text: 'Clear',
        onClick: async () => {
          const meals = { ...appState.get('meals') };
          if (meals[date]) {
            delete meals[date][mealType];
            if (Object.keys(meals[date]).length === 0) {
              delete meals[date];
            }
          }
          appState.set('meals', meals);
          await saveData();
          toast.success('Meal cleared');
          modal.close();
        }
      } : null,
      { text: 'Cancel', onClick: () => modal.close() },
      {
        text: 'Save',
        primary: true,
        onClick: async () => {
          const name = document.getElementById('meal-name').value.trim();
          if (!name) {
            toast.error('Please enter a meal name');
            return;
          }
          
          const meals = { ...appState.get('meals') };
          if (!meals[date]) meals[date] = {};
          
          meals[date][mealType] = {
            name,
            notes: document.getElementById('meal-notes').value.trim()
          };
          
          appState.set('meals', meals);
          await saveData();
          toast.success('Meal saved!');
          modal.close();
        }
      }
    ].filter(Boolean)
  });
};

// Favorites
window.showAddFavorite = function() {
  modal.show({
    title: '⭐ Add Favorite Meal',
    content: `
      <form id="favorite-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Meal Name *</label>
          <input type="text" name="name" required
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                 placeholder="e.g., Taco Tuesday" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Default Notes</label>
          <textarea name="notes" rows="2"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Shopping items, recipe link..."></textarea>
        </div>
      </form>
    `,
    buttons: [
      { text: 'Cancel', onClick: () => modal.close() },
      {
        text: 'Add',
        primary: true,
        onClick: async () => {
          const form = document.getElementById('favorite-form');
          const data = FormHelper.getData(form);
          
          if (!data.name?.trim()) {
            toast.error('Please enter a meal name');
            return;
          }
          
          const favorites = [...(appState.get('favorites') || []), {
            id: Date.now().toString(),
            name: data.name.trim(),
            notes: data.notes?.trim() || ''
          }];
          
          appState.set('favorites', favorites);
          await saveData();
          toast.success('Favorite added!');
          modal.close();
        }
      }
    ]
  });
};

window.useFavorite = function(id) {
  const favorites = appState.get('favorites') || [];
  const fav = favorites.find(f => f.id === id);
  if (fav) {
    toast.info(`Click a meal slot to add "${fav.name}"`);
  }
};

window.deleteFavorite = async function(id) {
  const confirmed = await modal.confirm('Remove this favorite?', 'Delete Favorite');
  if (confirmed) {
    const favorites = (appState.get('favorites') || []).filter(f => f.id !== id);
    appState.set('favorites', favorites);
    await saveData();
    toast.success('Favorite removed');
  }
};

// Shopping List
window.showShoppingList = function() {
  const meals = appState.get('meals') || {};
  const weekStart = appState.get('currentWeekStart');
  const dates = getWeekDates(weekStart);
  
  // Extract ingredients from notes
  const ingredients = [];
  dates.forEach(date => {
    if (meals[date]) {
      Object.values(meals[date]).forEach(meal => {
        if (meal?.notes) {
          // Split notes by newlines and commas
          const items = meal.notes.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
          items.forEach(item => {
            if (!ingredients.some(i => i.toLowerCase() === item.toLowerCase())) {
              ingredients.push(item);
            }
          });
        }
      });
    }
  });
  
  modal.show({
    title: '🛒 Shopping List',
    content: `
      <div class="space-y-4">
        <p class="text-sm text-gray-600">Items extracted from meal notes for this week:</p>
        ${ingredients.length > 0 ? `
          <ul class="space-y-2">
            ${ingredients.map(item => `
              <li class="flex items-center gap-2">
                <input type="checkbox" class="w-4 h-4 text-emerald-600 rounded" />
                <span>${item}</span>
              </li>
            `).join('')}
          </ul>
        ` : `
          <p class="text-gray-400 text-center py-4">No items found. Add ingredients to meal notes!</p>
        `}
      </div>
    `,
    buttons: [
      { text: 'Close', primary: true, onClick: () => modal.close() }
    ]
  });
};

// Sync
window.manualSync = async function() {
  if (!syncController) {
    toast.error('GitHub not configured');
    return;
  }
  
  toast.info('Syncing...');
  await syncController.sync();
  toast.success('Sync complete!');
};

// Settings
window.showSettings = function() {
  const token = storage.loadSetting('githubToken');
  const owner = storage.loadSetting('githubOwner');
  const repo = storage.loadSetting('githubRepo');
  
  modal.show({
    title: 'Settings',
    content: `
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
          <p class="text-sm font-medium text-gray-700">Status</p>
          <p class="text-gray-900">${token ? '✅ Connected' : '❌ Not connected'}</p>
        </div>
        <hr />
        <button onclick="showSetupScreen(); modal.close();" class="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
          Reconfigure GitHub
        </button>
        <button onclick="clearLocalData()" class="w-full px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200">
          Clear Local Data
        </button>
      </div>
    `,
    buttons: [
      { text: 'Close', primary: true, onClick: () => modal.close() }
    ]
  });
};

window.clearLocalData = async function() {
  const confirmed = await modal.confirm('This will clear all local data. Are you sure?', 'Clear Data');
  if (confirmed) {
    await storage.clear();
    location.reload();
  }
};

// Setup Screen
function showSetupScreen() {
  const container = document.querySelector('main');
  container.innerHTML = `
    <div class="max-w-md mx-auto">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Welcome to Meal Planner! 🍽️</h2>
        <p class="text-gray-600 mb-6">Connect to GitHub to sync your meal plans across devices.</p>
        
        <form id="setup-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">GitHub Token</label>
            <input type="password" name="token" required
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                   placeholder="ghp_xxxxxxxxxxxx" />
            <p class="text-xs text-gray-500 mt-1">Create at GitHub → Settings → Developer settings → Personal access tokens</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">GitHub Username</label>
            <input type="text" name="owner" required
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                   placeholder="your-username" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Repository Name</label>
            <input type="text" name="repo" required value="local-first-app-data"
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          
          <button type="submit" class="w-full px-4 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium">
            Connect & Start Planning
          </button>
        </form>
        
        <div class="mt-4 text-center">
          <button onclick="skipSetup()" class="text-sm text-gray-500 hover:text-gray-700">
            Skip for now (local only)
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = FormHelper.getData(e.target);
    
    toast.info('Testing connection...');
    
    try {
      const testSync = new GitHubSync({ token: data.token, owner: data.owner, repo: data.repo });
      await testSync.testAuth();
      
      storage.saveSetting('githubToken', data.token);
      storage.saveSetting('githubOwner', data.owner);
      storage.saveSetting('githubRepo', data.repo);
      
      toast.success('Connected successfully!');
      appState.set('isSetup', true);
      await initializeSync(data.token, data.owner, data.repo);
      location.reload();
      
    } catch (error) {
      toast.error('Connection failed: ' + error.message);
    }
  });
}

window.skipSetup = function() {
  appState.set('isSetup', true);
  location.reload();
};
