/**
 * Goal Tracker App
 * Track Wildly Important Goals (WIGs) with lead and lag measures
 * Based on "The 4 Disciplines of Execution" methodology
 */

class GoalTrackerApp extends App {
  constructor() {
    super({
      appName: 'goal-tracker',
      dataPath: 'apps/goal-tracker/data.json'
    });
    
    this.goals = [];
    this.charts = {}; // Store chart instances
  }

  async onInit() {
    this.setupEventHandlers();
  }

  onDataLoaded(data, source) {
    console.log('[GoalTracker] Data loaded from:', source);
    this.goals = data.goals || [];
    this.render();
  }

  getData() {
    return {
      goals: this.goals
    };
  }

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  setupEventHandlers() {
    document.getElementById('sync-btn').addEventListener('click', () => this.sync());
    document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
    
    document.getElementById('add-goal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addGoal(e.target);
    });
  }

  // ============================================================
  // GOAL CRUD
  // ============================================================

  addGoal(form) {
    const formData = new FormData(form);
    const today = new Date().toISOString().split('T')[0];
    
    const goal = {
      id: this.generateId(),
      title: formData.get('title').trim(),
      description: formData.get('description')?.trim() || '',
      deadline: formData.get('deadline') || null,
      lagMeasure: {
        name: formData.get('lagName')?.trim() || 'Progress',
        unit: formData.get('lagUnit')?.trim() || '',
        start: parseFloat(formData.get('lagStart')) || 0,
        target: parseFloat(formData.get('lagTarget')) || 100,
        current: parseFloat(formData.get('lagStart')) || 0,
        history: [{
          date: today,
          value: parseFloat(formData.get('lagStart')) || 0
        }]
      },
      leadMeasures: [],
      createdAt: new Date().toISOString()
    };
    
    this.goals.unshift(goal);
    
    form.reset();
    this.render();
    this.saveData();
    
    this._showToast('Goal created!', 'success');
  }

  editGoal(id) {
    const goal = this.goals.find(g => g.id === id);
    if (!goal) return;
    
    modal.show({
      title: '✏️ Edit Goal',
      content: `
        <form id="edit-goal-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
            <input type="text" name="title" required value="${this.escapeHtml(goal.title)}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${this.escapeHtml(goal.description || '')}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <input type="date" name="deadline" value="${goal.deadline || ''}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Lag Measure</label>
              <input type="text" name="lagName" value="${this.escapeHtml(goal.lagMeasure?.name || '')}"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <input type="number" name="lagStart" step="any" value="${goal.lagMeasure?.start || 0}"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Target</label>
              <input type="number" name="lagTarget" step="any" value="${goal.lagMeasure?.target || 100}"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Save Changes',
          primary: true,
          onClick: () => {
            const form = document.getElementById('edit-goal-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }
            
            const formData = new FormData(form);
            const idx = this.goals.findIndex(g => g.id === id);
            if (idx !== -1) {
              this.goals[idx] = {
                ...this.goals[idx],
                title: formData.get('title').trim(),
                description: formData.get('description')?.trim() || '',
                deadline: formData.get('deadline') || null,
                lagMeasure: {
                  ...this.goals[idx].lagMeasure,
                  name: formData.get('lagName')?.trim() || 'Progress',
                  start: parseFloat(formData.get('lagStart')) || 0,
                  target: parseFloat(formData.get('lagTarget')) || 100
                },
                updatedAt: new Date().toISOString()
              };
              
              this.render();
              this.saveData();
              this._showToast('Goal updated!', 'success');
            }
            
            modal.close();
          }
        }
      ]
    });
  }

  deleteGoal(id) {
    modal.confirm('Delete this goal and all its data?', 'Delete Goal').then(confirmed => {
      if (!confirmed) return;
      
      // Destroy chart if exists
      if (this.charts[id]) {
        this.charts[id].destroy();
        delete this.charts[id];
      }
      
      this.goals = this.goals.filter(g => g.id !== id);
      this.render();
      this.saveData();
      
      this._showToast('Goal deleted', 'info');
    });
  }

  // ============================================================
  // LAG MEASURE (Manual Entry)
  // ============================================================

  showUpdateLagMeasure(goalId) {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    modal.show({
      title: `📊 Update ${goal.lagMeasure?.name || 'Progress'}`,
      content: `
        <form id="lag-form" class="space-y-4">
          <div class="p-4 bg-violet-50 rounded-lg">
            <div class="flex justify-between text-sm mb-2">
              <span>Current: <strong>${goal.lagMeasure?.current || 0}</strong></span>
              <span>Target: <strong>${goal.lagMeasure?.target || 100}</strong></span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">New Value *</label>
            <input type="number" name="value" step="any" required value="${goal.lagMeasure?.current || 0}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium">
            <p class="text-xs text-gray-500 mt-1">Enter the current value (can go up or down)</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" name="date" value="${today}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input type="text" name="note" placeholder="e.g., Weighed after workout"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Record Value',
          primary: true,
          onClick: () => {
            const form = document.getElementById('lag-form');
            const formData = new FormData(form);
            const value = parseFloat(formData.get('value'));
            
            if (isNaN(value)) {
              this._showToast('Please enter a valid number', 'error');
              return;
            }
            
            this.updateLagMeasure(goalId, {
              value,
              date: formData.get('date') || today,
              note: formData.get('note')?.trim() || ''
            });
            
            modal.close();
          }
        }
      ]
    });
  }

  updateLagMeasure(goalId, data) {
    const idx = this.goals.findIndex(g => g.id === goalId);
    if (idx === -1) return;
    
    const goal = this.goals[idx];
    
    // Update current value
    goal.lagMeasure.current = data.value;
    
    // Add to history
    if (!goal.lagMeasure.history) {
      goal.lagMeasure.history = [];
    }
    
    // Check if entry for this date exists
    const existingIdx = goal.lagMeasure.history.findIndex(h => h.date === data.date);
    if (existingIdx !== -1) {
      goal.lagMeasure.history[existingIdx] = {
        date: data.date,
        value: data.value,
        note: data.note
      };
    } else {
      goal.lagMeasure.history.push({
        date: data.date,
        value: data.value,
        note: data.note
      });
      // Sort by date
      goal.lagMeasure.history.sort((a, b) => a.date.localeCompare(b.date));
    }
    
    goal.updatedAt = new Date().toISOString();
    this.goals[idx] = goal;
    
    this.render();
    this.saveData();
    
    this._showToast('Value recorded!', 'success');
  }

  // ============================================================
  // LEAD MEASURES
  // ============================================================

  showAddLeadMeasure(goalId) {
    modal.show({
      title: '🎯 Add Lead Measure',
      content: `
        <form id="lead-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Activity Name *</label>
            <input type="text" name="name" required placeholder="e.g., Steps walked"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Unit (optional)</label>
            <input type="text" name="unit" placeholder="e.g., steps, minutes, calories"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
              <input type="number" name="target" step="any" value="10000" placeholder="e.g., 10000"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select name="frequency" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <p class="text-xs text-gray-500">You'll track this value over time and it will appear on the progress chart.</p>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Add Measure',
          primary: true,
          onClick: () => {
            const form = document.getElementById('lead-form');
            const formData = new FormData(form);
            const name = formData.get('name')?.trim();
            
            if (!name) {
              this._showToast('Name is required', 'error');
              return;
            }
            
            this.addLeadMeasure(goalId, {
              name,
              unit: formData.get('unit')?.trim() || '',
              target: parseFloat(formData.get('target')) || 100,
              frequency: formData.get('frequency') || 'daily'
            });
            
            modal.close();
          }
        }
      ]
    });
  }

  addLeadMeasure(goalId, data) {
    const idx = this.goals.findIndex(g => g.id === goalId);
    if (idx === -1) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    this.goals[idx].leadMeasures = this.goals[idx].leadMeasures || [];
    this.goals[idx].leadMeasures.push({
      id: this.generateId(),
      name: data.name,
      unit: data.unit,
      target: data.target,
      frequency: data.frequency,
      current: 0,
      history: [] // Will store {date, value} entries
    });
    this.goals[idx].updatedAt = new Date().toISOString();
    
    this.render();
    this.saveData();
    
    this._showToast('Lead measure added!', 'success');
  }

  showUpdateLeadMeasure(goalId, leadId) {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const lead = goal.leadMeasures?.find(l => l.id === leadId);
    if (!lead) return;
    
    const today = new Date().toISOString().split('T')[0];
    const frequencyLabel = lead.frequency === 'daily' ? 'today' : 
                          lead.frequency === 'weekly' ? 'this week' : 'this month';
    
    modal.show({
      title: `📊 Update ${lead.name}`,
      content: `
        <form id="lead-update-form" class="space-y-4">
          <div class="p-4 bg-green-50 rounded-lg">
            <div class="flex justify-between text-sm mb-1">
              <span>Current ${frequencyLabel}: <strong>${lead.current || 0}</strong> ${lead.unit || ''}</span>
              <span>Target: <strong>${lead.target}</strong> ${lead.unit || ''}</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">New Value *</label>
            <input type="number" name="value" step="any" required value="${lead.current || 0}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium">
            <p class="text-xs text-gray-500 mt-1">Enter the current value for ${frequencyLabel}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" name="date" value="${today}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Record Value',
          primary: true,
          onClick: () => {
            const form = document.getElementById('lead-update-form');
            const formData = new FormData(form);
            const value = parseFloat(formData.get('value'));
            
            if (isNaN(value)) {
              this._showToast('Please enter a valid number', 'error');
              return;
            }
            
            this.updateLeadMeasure(goalId, leadId, {
              value,
              date: formData.get('date') || today
            });
            
            modal.close();
          }
        }
      ]
    });
  }

  updateLeadMeasure(goalId, leadId, data) {
    const goalIdx = this.goals.findIndex(g => g.id === goalId);
    if (goalIdx === -1) return;
    
    const leadIdx = this.goals[goalIdx].leadMeasures.findIndex(l => l.id === leadId);
    if (leadIdx === -1) return;
    
    const lead = this.goals[goalIdx].leadMeasures[leadIdx];
    
    // Update current value
    lead.current = data.value;
    
    // Add to history
    if (!lead.history) lead.history = [];
    
    // Check if entry for this date exists
    const existingIdx = lead.history.findIndex(h => h.date === data.date);
    if (existingIdx !== -1) {
      lead.history[existingIdx].value = data.value;
    } else {
      lead.history.push({ date: data.date, value: data.value });
      lead.history.sort((a, b) => a.date.localeCompare(b.date));
    }
    
    this.goals[goalIdx].updatedAt = new Date().toISOString();
    
    this.render();
    this.saveData();
    
    this._showToast('Value recorded!', 'success');
  }

  deleteLeadMeasure(goalId, leadId) {
    const goalIdx = this.goals.findIndex(g => g.id === goalId);
    if (goalIdx === -1) return;
    
    this.goals[goalIdx].leadMeasures = this.goals[goalIdx].leadMeasures.filter(l => l.id !== leadId);
    this.goals[goalIdx].updatedAt = new Date().toISOString();
    
    this.render();
    this.saveData();
    
    this._showToast('Lead measure removed', 'info');
  }

  getPeriodKey(date, frequency) {
    const d = new Date(date + 'T00:00:00');
    if (frequency === 'daily') {
      return date;
    } else if (frequency === 'weekly') {
      const day = d.getDay();
      d.setDate(d.getDate() - day);
      return d.toISOString().split('T')[0];
    } else { // monthly
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  getCurrentPeriodKey(frequency) {
    return this.getPeriodKey(new Date().toISOString().split('T')[0], frequency);
  }

  // ============================================================
  // RENDERING
  // ============================================================

  render() {
    const container = document.getElementById('goals-container');
    
    if (this.goals.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <span class="text-5xl mb-4 block">🎯</span>
          No goals yet. Create your first goal above!
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.goals.map(goal => this.renderGoalCard(goal)).join('');
    
    // Initialize charts after DOM is ready
    setTimeout(() => {
      this.goals.forEach(goal => this.renderChart(goal));
    }, 100);
  }

  renderGoalCard(goal) {
    const progress = this.calculateProgress(goal);
    const progressColor = progress >= 100 ? 'bg-green-500' : 'bg-violet-600';
    const hasChartData = (goal.lagMeasure?.history?.length > 0) || 
                         (goal.leadMeasures || []).some(l => l.history?.length > 0);
    
    return `
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <!-- Header -->
        <div class="p-6 border-b border-gray-100">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-900">${this.escapeHtml(goal.title)}</h3>
              ${goal.description ? `<p class="text-gray-600 mt-1">${this.escapeHtml(goal.description)}</p>` : ''}
            </div>
            <div class="flex gap-1 ml-4">
              <button onclick="app.editGoal('${goal.id}')" 
                class="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition" title="Edit">✏️</button>
              <button onclick="app.deleteGoal('${goal.id}')" 
                class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete">🗑️</button>
            </div>
          </div>
          
          <div class="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            <span>📅 Created: ${new Date(goal.createdAt).toLocaleDateString()}</span>
            ${goal.deadline ? `<span>🎯 Deadline: ${new Date(goal.deadline).toLocaleDateString()}</span>` : ''}
          </div>
        </div>
        
        <!-- Measures Grid -->
        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Lag Measure -->
          <div class="p-4 bg-violet-50 rounded-lg">
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-semibold text-violet-800">📊 Lag: ${this.escapeHtml(goal.lagMeasure?.name || 'Outcome')}</h4>
              <button onclick="app.showUpdateLagMeasure('${goal.id}')"
                class="px-3 py-1 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition">
                Update
              </button>
            </div>
            
            <div class="flex justify-between text-sm mb-2">
              <span>Start: ${goal.lagMeasure?.start || 0}</span>
              <span class="font-bold text-violet-700">${goal.lagMeasure?.current || 0}</span>
              <span>Target: ${goal.lagMeasure?.target || 100}</span>
            </div>
            <div class="w-full bg-violet-200 rounded-full h-3">
              <div class="${progressColor} h-3 rounded-full transition-all" style="width: ${Math.min(100, Math.max(0, progress))}%"></div>
            </div>
            <div class="text-right text-sm font-medium text-violet-700 mt-1">${progress.toFixed(1)}%</div>
          </div>
          
          <!-- Lead Measures -->
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-semibold text-gray-800">🎯 Lead Measures</h4>
              <button onclick="app.showAddLeadMeasure('${goal.id}')"
                class="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition">
                + Add
              </button>
            </div>
            
            ${(goal.leadMeasures || []).length === 0 ? `
              <p class="text-gray-400 text-sm">No activities yet</p>
            ` : `
              <div class="space-y-2 max-h-48 overflow-y-auto">
                ${(goal.leadMeasures || []).map(lead => this.renderLeadMeasure(goal.id, lead)).join('')}
              </div>
            `}
          </div>
        </div>
        
        <!-- Progress Chart (Full Width) -->
        ${hasChartData ? `
          <div class="p-6 pt-0">
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-semibold text-gray-700 mb-3">📈 Progress Over Time</h4>
              <div style="height: 250px;">
                <canvas id="chart-${goal.id}"></canvas>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderLeadMeasure(goalId, lead) {
    const frequencyLabel = lead.frequency === 'daily' ? 'today' : 
                          lead.frequency === 'weekly' ? 'this week' : 'this month';
    const progress = Math.min(100, ((lead.current || 0) / lead.target) * 100);
    const progressColor = progress >= 100 ? 'bg-green-500' : 'bg-blue-500';
    
    return `
      <div class="p-3 bg-gray-50 rounded-lg">
        <div class="flex justify-between items-center mb-2">
          <div>
            <span class="font-medium text-gray-700">${this.escapeHtml(lead.name)}</span>
            <span class="text-xs text-gray-400 ml-2">(${lead.frequency})</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium ${progress >= 100 ? 'text-green-600' : 'text-gray-600'}">
              ${lead.current || 0} / ${lead.target} ${lead.unit || ''}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="${progressColor} h-2 rounded-full transition-all" style="width: ${progress}%"></div>
            </div>
          </div>
          <button onclick="app.showUpdateLeadMeasure('${goalId}', '${lead.id}')"
            class="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 font-medium transition">
            Update
          </button>
          <button onclick="app.deleteLeadMeasure('${goalId}', '${lead.id}')"
            class="p-1 text-gray-400 hover:text-red-600 transition" title="Remove">×</button>
        </div>
      </div>
    `;
  }

  renderChart(goal) {
    const canvas = document.getElementById(`chart-${goal.id}`);
    if (!canvas) return;
    
    // Destroy existing chart
    if (this.charts[goal.id]) {
      this.charts[goal.id].destroy();
    }
    
    // Collect all dates from lag and lead measures
    const allDates = new Set();
    
    const lagHistory = goal.lagMeasure?.history || [];
    lagHistory.forEach(h => allDates.add(h.date));
    
    (goal.leadMeasures || []).forEach(lead => {
      (lead.history || []).forEach(h => allDates.add(h.date));
    });
    
    if (allDates.size === 0) return;
    
    // Sort dates
    const labels = Array.from(allDates).sort();
    
    // Build datasets
    const datasets = [];
    
    // Colors for different measures
    const colors = [
      { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' }, // violet (lag)
      { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' }, // blue
      { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }, // amber
      { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }, // emerald
      { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' }, // pink
      { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' }, // purple
    ];
    
    // Lag measure dataset
    if (lagHistory.length > 0) {
      const lagData = labels.map(date => {
        const entry = lagHistory.find(h => h.date === date);
        return entry ? entry.value : null;
      });
      
      datasets.push({
        label: `${goal.lagMeasure?.name || 'Lag'} (Outcome)`,
        data: lagData,
        borderColor: colors[0].border,
        backgroundColor: colors[0].bg,
        fill: false,
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y'
      });
      
      // Target line for lag measure
      datasets.push({
        label: `${goal.lagMeasure?.name || 'Lag'} Target`,
        data: labels.map(() => goal.lagMeasure?.target || 100),
        borderColor: colors[0].border,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        yAxisID: 'y'
      });
    }
    
    // Lead measure datasets
    (goal.leadMeasures || []).forEach((lead, idx) => {
      if (!lead.history || lead.history.length === 0) return;
      
      const colorIdx = (idx + 1) % colors.length;
      const leadData = labels.map(date => {
        const entry = lead.history.find(h => h.date === date);
        return entry ? entry.value : null;
      });
      
      datasets.push({
        label: `${lead.name} (Lead)`,
        data: leadData,
        borderColor: colors[colorIdx].border,
        backgroundColor: colors[colorIdx].bg,
        fill: false,
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y1'
      });
      
      // Target line for lead measure
      datasets.push({
        label: `${lead.name} Target`,
        data: labels.map(() => lead.target),
        borderColor: colors[colorIdx].border,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: false,
        yAxisID: 'y1'
      });
    });
    
    if (datasets.length === 0) return;
    
    // Determine if we need dual Y axes
    const hasLeadData = (goal.leadMeasures || []).some(l => l.history && l.history.length > 0);
    
    this.charts[goal.id] = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              filter: (item) => !item.text.includes('Target'),
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (ctx.raw === null) return null;
                return `${ctx.dataset.label}: ${ctx.raw}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: { display: true, text: 'Date' }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { 
              display: true, 
              text: goal.lagMeasure?.name || 'Lag Measure'
            }
          },
          y1: hasLeadData ? {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Lead Measures' },
            grid: { drawOnChartArea: false }
          } : undefined
        }
      }
    });
  }

  calculateProgress(goal) {
    if (!goal.lagMeasure) return 0;
    
    const { start, current, target } = goal.lagMeasure;
    const range = target - start;
    
    if (range === 0) return current === target ? 100 : 0;
    
    const progress = ((current - start) / range) * 100;
    return progress;
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', async () => {
  app = new GoalTrackerApp();
  await app.init();
});
