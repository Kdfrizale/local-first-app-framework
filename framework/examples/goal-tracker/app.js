/**
 * Goal Tracker App
 * Track Wildly Important Goals (WIGs) with lead and lag measures
 * Based on "The 4 Disciplines of Execution" methodology
 */

// App Configuration
const CONFIG = {
  appName: 'goal-tracker',
  github: {
    dataPath: 'apps/goal-tracker/data.json'
  }
};

// State Management
const appState = new State({
  goals: [],
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
  appState.subscribe('goals', renderGoals);
  
  // Load data and render
  await loadData();
  renderGoals();
  
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

// Data Management
async function loadData() {
  const data = await storage.load('goalData');
  
  if (data) {
    appState.set('goals', data.goals || []);
  } else if (syncController) {
    try {
      const result = await syncController.downloadFromGitHub(CONFIG.github.dataPath, 'goalData');
      if (result.status === 'downloaded' && result.data) {
        appState.set('goals', result.data.goals || []);
      }
    } catch (e) {
      console.log('No remote data yet');
    }
  }
}

async function saveData() {
  const data = {
    goals: appState.get('goals'),
    lastUpdated: new Date().toISOString()
  };
  
  await storage.save('goalData', data, {
    synced: false,
    githubPath: CONFIG.github.dataPath
  });
  
  if (syncController && navigator.onLine) {
    setTimeout(() => syncController.sync(), 500);
  }
}

// Rendering
function renderGoals() {
  const goals = appState.get('goals') || [];
  const container = document.getElementById('goals-container');
  
  if (goals.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 bg-white rounded-lg shadow">
        <span class="text-6xl mb-4 block">🎯</span>
        <h2 class="text-2xl font-bold text-gray-900 mb-4">No goals yet</h2>
        <p class="text-gray-600 mb-8">Start by defining your Wildly Important Goals!</p>
        <button onclick="showAddGoal()" class="px-6 py-3 bg-violet-600 text-white rounded-md hover:bg-violet-700">
          Add Your First Goal
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = goals.map(goal => renderGoalCard(goal)).join('');
}

function renderGoalCard(goal) {
  const lagProgress = calculateLagProgress(goal);
  const leadProgress = calculateLeadProgress(goal);
  const recentEntries = getRecentEntries(goal, 7);
  
  return `
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <!-- Goal Header -->
      <div class="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-xl font-bold">${goal.name}</h3>
            <p class="text-violet-200 text-sm mt-1">${goal.description || ''}</p>
          </div>
          <div class="flex space-x-2">
            <button onclick="showEditGoal('${goal.id}')" class="p-2 hover:bg-white/20 rounded">✏️</button>
            <button onclick="deleteGoal('${goal.id}')" class="p-2 hover:bg-white/20 rounded">🗑️</button>
          </div>
        </div>
      </div>
      
      <!-- Progress Section -->
      <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Lag Measure (Outcome) -->
        <div class="space-y-3">
          <h4 class="font-semibold text-gray-700 flex items-center gap-2">
            📊 Lag Measure <span class="text-xs font-normal text-gray-500">(Outcome you're tracking)</span>
          </h4>
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-600 mb-2">${goal.lagMeasure?.name || 'Not defined'}</p>
            <div class="flex items-center gap-4">
              <div class="flex-1">
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-500">Progress</span>
                  <span class="font-semibold">${lagProgress.current} / ${goal.lagMeasure?.target || 0}</span>
                </div>
                <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div class="h-full bg-violet-600 rounded-full transition-all duration-500" 
                       style="width: ${Math.min(100, lagProgress.percent)}%"></div>
                </div>
              </div>
              <div class="text-2xl font-bold text-violet-600">${lagProgress.percent}%</div>
            </div>
            <button onclick="showLogLag('${goal.id}')" 
                    class="mt-3 w-full py-2 bg-violet-100 text-violet-700 rounded-md hover:bg-violet-200 text-sm">
              + Log Progress
            </button>
          </div>
        </div>
        
        <!-- Lead Measures (Activities) -->
        <div class="space-y-3">
          <h4 class="font-semibold text-gray-700 flex items-center gap-2">
            🏃 Lead Measures <span class="text-xs font-normal text-gray-500">(Activities you control)</span>
          </h4>
          <div class="space-y-2">
            ${(goal.leadMeasures || []).map((lead, idx) => `
              <div class="bg-gray-50 rounded-lg p-3">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-700">${lead.name}</span>
                  <span class="text-xs text-gray-500">${lead.frequency || 'weekly'}</span>
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded-full" 
                         style="width: ${calculateLeadMeasureProgress(goal, idx)}%"></div>
                  </div>
                  <button onclick="showLogLead('${goal.id}', ${idx})" 
                          class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200">
                    + Log
                  </button>
                </div>
              </div>
            `).join('') || '<p class="text-gray-400 text-sm">No lead measures defined</p>'}
          </div>
        </div>
      </div>
      
      <!-- Chart Section -->
      <div class="px-4 pb-4">
        <h4 class="font-semibold text-gray-700 mb-3">📈 Progress Over Time</h4>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="chart-container">
            <canvas id="chart-${goal.id}"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Recent Activity -->
      <div class="px-4 pb-4">
        <h4 class="font-semibold text-gray-700 mb-3">📝 Recent Activity</h4>
        <div class="space-y-2 max-h-40 overflow-y-auto">
          ${recentEntries.length > 0 ? recentEntries.map(entry => `
            <div class="flex justify-between items-center text-sm py-2 border-b border-gray-100">
              <span class="text-gray-600">${entry.type}: ${entry.description}</span>
              <span class="text-gray-400">${formatDate(entry.date)}</span>
            </div>
          `).join('') : '<p class="text-gray-400 text-sm">No recent activity</p>'}
        </div>
      </div>
    </div>
  `;
}

// Progress Calculations
function calculateLagProgress(goal) {
  if (!goal.lagMeasure?.target) return { current: 0, percent: 0 };
  
  const entries = goal.lagMeasure.entries || [];
  const current = entries.reduce((sum, e) => sum + (e.value || 0), 0);
  const percent = Math.round((current / goal.lagMeasure.target) * 100);
  
  return { current, percent };
}

function calculateLeadProgress(goal) {
  // Average progress across all lead measures
  const leads = goal.leadMeasures || [];
  if (leads.length === 0) return 0;
  
  const total = leads.reduce((sum, lead, idx) => {
    return sum + calculateLeadMeasureProgress(goal, idx);
  }, 0);
  
  return Math.round(total / leads.length);
}

function calculateLeadMeasureProgress(goal, leadIdx) {
  const lead = goal.leadMeasures?.[leadIdx];
  if (!lead?.target) return 0;
  
  const entries = lead.entries || [];
  const now = new Date();
  
  // Filter entries based on frequency
  let relevantEntries = entries;
  if (lead.frequency === 'daily') {
    const today = now.toISOString().split('T')[0];
    relevantEntries = entries.filter(e => e.date.startsWith(today));
  } else if (lead.frequency === 'weekly') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    relevantEntries = entries.filter(e => new Date(e.date) >= weekAgo);
  }
  
  const current = relevantEntries.reduce((sum, e) => sum + (e.value || 0), 0);
  return Math.min(100, Math.round((current / lead.target) * 100));
}

function getRecentEntries(goal, days) {
  const entries = [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  // Lag entries
  (goal.lagMeasure?.entries || []).forEach(e => {
    if (new Date(e.date) >= cutoff) {
      entries.push({ type: 'Lag', description: `${goal.lagMeasure.name}: ${e.value}`, date: e.date });
    }
  });
  
  // Lead entries
  (goal.leadMeasures || []).forEach(lead => {
    (lead.entries || []).forEach(e => {
      if (new Date(e.date) >= cutoff) {
        entries.push({ type: 'Lead', description: `${lead.name}: ${e.value}`, date: e.date });
      }
    });
  });
  
  return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Draw simple chart after render
function drawCharts() {
  const goals = appState.get('goals') || [];
  
  goals.forEach(goal => {
    const canvas = document.getElementById(`chart-${goal.id}`);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 180;
    
    // Get last 30 days of data
    const data = getLast30DaysData(goal);
    
    if (data.length === 0) {
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data yet. Start logging progress!', canvas.width / 2, 90);
      return;
    }
    
    const maxValue = Math.max(...data.map(d => d.lag), 1);
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    // Draw axes
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw lag measure line
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = canvas.height - padding - (d.lag / maxValue) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = '#7C3AED';
    data.forEach((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = canvas.height - padding - (d.lag / maxValue) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Legend
    ctx.fillStyle = '#7C3AED';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('● Lag Measure', padding, 20);
  });
}

function getLast30DaysData(goal) {
  const data = [];
  const entries = goal.lagMeasure?.entries || [];
  
  // Group entries by date and accumulate
  const byDate = {};
  let cumulative = 0;
  
  entries.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(e => {
    const date = e.date.split('T')[0];
    cumulative += e.value || 0;
    byDate[date] = cumulative;
  });
  
  // Get last 30 days
  const now = new Date();
  let lastValue = 0;
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    if (byDate[dateStr] !== undefined) {
      lastValue = byDate[dateStr];
    }
    
    data.push({ date: dateStr, lag: lastValue });
  }
  
  return data;
}

// Render and draw charts
const originalRenderGoals = renderGoals;
renderGoals = function() {
  originalRenderGoals();
  setTimeout(drawCharts, 100);
};

// Goal Management
window.showAddGoal = function() {
  modal.show({
    title: '🎯 Add New Goal',
    content: `
      <form id="goal-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Goal Name *</label>
          <input type="text" name="name" required
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                 placeholder="e.g., Lose 20 pounds by December" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea name="description" rows="2"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Why is this important to you?"></textarea>
        </div>
        
        <hr class="my-4" />
        
        <h4 class="font-semibold text-gray-700">📊 Lag Measure (Outcome)</h4>
        <p class="text-xs text-gray-500 mb-2">The result you want to achieve</p>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">What to Measure</label>
            <input type="text" name="lagName" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                   placeholder="e.g., Pounds lost" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Target</label>
            <input type="number" name="lagTarget" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                   placeholder="e.g., 20" />
          </div>
        </div>
        
        <hr class="my-4" />
        
        <h4 class="font-semibold text-gray-700">🏃 Lead Measures (Activities)</h4>
        <p class="text-xs text-gray-500 mb-2">Actions you'll take to achieve the goal</p>
        
        <div id="lead-measures-container" class="space-y-3">
          <div class="lead-measure-row grid grid-cols-12 gap-2 items-end">
            <div class="col-span-5">
              <label class="block text-xs text-gray-500 mb-1">Activity</label>
              <input type="text" name="leadName[]" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                     placeholder="e.g., Workouts" />
            </div>
            <div class="col-span-3">
              <label class="block text-xs text-gray-500 mb-1">Target</label>
              <input type="number" name="leadTarget[]" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                     placeholder="5" />
            </div>
            <div class="col-span-3">
              <label class="block text-xs text-gray-500 mb-1">Per</label>
              <select name="leadFrequency[]" 
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm">
                <option value="weekly">Week</option>
                <option value="daily">Day</option>
              </select>
            </div>
            <div class="col-span-1">
              <button type="button" onclick="this.closest('.lead-measure-row').remove()" class="p-2 text-red-500 hover:text-red-700">×</button>
            </div>
          </div>
        </div>
        
        <button type="button" onclick="addLeadMeasureRow()" class="text-sm text-violet-600 hover:text-violet-800">
          + Add Another Lead Measure
        </button>
      </form>
    `,
    buttons: [
      { text: 'Cancel', onClick: () => modal.close() },
      {
        text: 'Create Goal',
        primary: true,
        onClick: async () => {
          const form = document.getElementById('goal-form');
          const data = FormHelper.getData(form);
          
          if (!data.name?.trim()) {
            toast.error('Please enter a goal name');
            return;
          }
          
          // Parse lead measures
          const leadNames = form.querySelectorAll('input[name="leadName[]"]');
          const leadTargets = form.querySelectorAll('input[name="leadTarget[]"]');
          const leadFreqs = form.querySelectorAll('select[name="leadFrequency[]"]');
          
          const leadMeasures = [];
          leadNames.forEach((input, i) => {
            if (input.value.trim()) {
              leadMeasures.push({
                name: input.value.trim(),
                target: parseInt(leadTargets[i].value) || 1,
                frequency: leadFreqs[i].value,
                entries: []
              });
            }
          });
          
          const newGoal = {
            id: Date.now().toString(),
            name: data.name.trim(),
            description: data.description?.trim() || '',
            lagMeasure: {
              name: data.lagName?.trim() || 'Progress',
              target: parseInt(data.lagTarget) || 100,
              entries: []
            },
            leadMeasures,
            createdAt: new Date().toISOString()
          };
          
          const goals = [...(appState.get('goals') || []), newGoal];
          appState.set('goals', goals);
          await saveData();
          toast.success('Goal created!');
          modal.close();
        }
      }
    ]
  });
};

window.addLeadMeasureRow = function() {
  const container = document.getElementById('lead-measures-container');
  const row = document.createElement('div');
  row.className = 'lead-measure-row grid grid-cols-12 gap-2 items-end';
  row.innerHTML = `
    <div class="col-span-5">
      <input type="text" name="leadName[]" 
             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
             placeholder="e.g., Calories tracked" />
    </div>
    <div class="col-span-3">
      <input type="number" name="leadTarget[]" 
             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
             placeholder="7" />
    </div>
    <div class="col-span-3">
      <select name="leadFrequency[]" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm">
        <option value="weekly">Week</option>
        <option value="daily">Day</option>
      </select>
    </div>
    <div class="col-span-1">
      <button type="button" onclick="this.closest('.lead-measure-row').remove()" class="p-2 text-red-500 hover:text-red-700">×</button>
    </div>
  `;
  container.appendChild(row);
};

window.showEditGoal = function(id) {
  const goals = appState.get('goals') || [];
  const goal = goals.find(g => g.id === id);
  if (!goal) return;
  
  // Similar to add but pre-filled - simplified for now
  toast.info('Edit goal coming soon! For now, delete and recreate.');
};

window.deleteGoal = async function(id) {
  const confirmed = await modal.confirm('Delete this goal and all its data?', 'Delete Goal');
  if (confirmed) {
    const goals = (appState.get('goals') || []).filter(g => g.id !== id);
    appState.set('goals', goals);
    await saveData();
    toast.success('Goal deleted');
  }
};

// Logging Progress
window.showLogLag = function(goalId) {
  const goals = appState.get('goals') || [];
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  
  modal.show({
    title: `📊 Log ${goal.lagMeasure?.name || 'Progress'}`,
    content: `
      <form id="log-lag-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Amount</label>
          <input type="number" name="value" required step="any"
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                 placeholder="e.g., 2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}"
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
          <input type="text" name="notes"
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                 placeholder="Any details..." />
        </div>
      </form>
    `,
    buttons: [
      { text: 'Cancel', onClick: () => modal.close() },
      {
        text: 'Log Progress',
        primary: true,
        onClick: async () => {
          const form = document.getElementById('log-lag-form');
          const data = FormHelper.getData(form);
          
          if (!data.value) {
            toast.error('Please enter an amount');
            return;
          }
          
          const goals = appState.get('goals').map(g => {
            if (g.id === goalId) {
              const entries = [...(g.lagMeasure.entries || []), {
                value: parseFloat(data.value),
                date: data.date + 'T12:00:00Z',
                notes: data.notes?.trim() || ''
              }];
              return { ...g, lagMeasure: { ...g.lagMeasure, entries } };
            }
            return g;
          });
          
          appState.set('goals', goals);
          await saveData();
          toast.success('Progress logged!');
          modal.close();
        }
      }
    ]
  });
};

window.showLogLead = function(goalId, leadIdx) {
  const goals = appState.get('goals') || [];
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  
  const lead = goal.leadMeasures?.[leadIdx];
  if (!lead) return;
  
  modal.show({
    title: `🏃 Log ${lead.name}`,
    content: `
      <form id="log-lead-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Amount</label>
          <input type="number" name="value" required step="any" value="1"
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}"
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </form>
    `,
    buttons: [
      { text: 'Cancel', onClick: () => modal.close() },
      {
        text: 'Log Activity',
        primary: true,
        onClick: async () => {
          const form = document.getElementById('log-lead-form');
          const data = FormHelper.getData(form);
          
          const goals = appState.get('goals').map(g => {
            if (g.id === goalId) {
              const leadMeasures = g.leadMeasures.map((l, i) => {
                if (i === leadIdx) {
                  const entries = [...(l.entries || []), {
                    value: parseFloat(data.value) || 1,
                    date: data.date + 'T12:00:00Z'
                  }];
                  return { ...l, entries };
                }
                return l;
              });
              return { ...g, leadMeasures };
            }
            return g;
          });
          
          appState.set('goals', goals);
          await saveData();
          toast.success('Activity logged!');
          modal.close();
        }
      }
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
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Welcome to Goal Tracker! 🎯</h2>
        <p class="text-gray-600 mb-6">Connect to GitHub to sync your goals across devices.</p>
        
        <form id="setup-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">GitHub Token</label>
            <input type="password" name="token" required
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                   placeholder="ghp_xxxxxxxxxxxx" />
            <p class="text-xs text-gray-500 mt-1">Create at GitHub → Settings → Developer settings → Personal access tokens</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">GitHub Username</label>
            <input type="text" name="owner" required
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                   placeholder="your-username" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Repository Name</label>
            <input type="text" name="repo" required value="local-first-app-data"
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          
          <button type="submit" class="w-full px-4 py-3 bg-violet-600 text-white rounded-md hover:bg-violet-700 font-medium">
            Connect & Start Tracking
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
