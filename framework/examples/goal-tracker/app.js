/**
 * Goal Tracker App
 * Track Wildly Important Goals (WIGs) with lead and lag measures
 * Based on "The 4 Disciplines of Execution" methodology
 * 
 * Refactored to use the App base class
 */

class GoalTrackerApp extends App {
  constructor() {
    super({
      appName: 'goal-tracker',
      dataPath: 'apps/goal-tracker/data.json',
      initialState: {
        goals: [],
        viewMode: 'cards' // cards or list
      }
    });
  }

  async onInit() {
    this.state.subscribe('goals', () => this.renderGoals());
    this.state.subscribe('viewMode', () => this.renderGoals());
    this.setupEventHandlers();
  }

  onDataLoaded(data, source) {
    this.state.set('goals', data.goals || []);
    this.renderGoals();
  }

  getData() {
    return {
      goals: this.state.get('goals')
    };
  }

  setupEventHandlers() {
    document.getElementById('sync-btn')?.addEventListener('click', () => this.sync());
    document.getElementById('settings-btn')?.addEventListener('click', () => this.showSettings());
    document.getElementById('add-goal-btn')?.addEventListener('click', () => this.showAddGoal());
  }

  // --- Rendering ---

  renderGoals() {
    const container = document.getElementById('goals-container');
    if (!container) return;
    
    if (!this.state.get('isSetup')) {
      this.showSetupScreen();
      return;
    }
    
    const goals = this.state.get('goals') || [];
    
    if (goals.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }
    
    container.innerHTML = `
      <div class="space-y-6">
        ${goals.map(goal => this.renderGoalCard(goal)).join('')}
      </div>
    `;
  }

  renderGoalCard(goal) {
    const lagProgress = this.calculateLagProgress(goal);
    const leadProgress = this.calculateLeadProgress(goal);
    
    return `
      <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-violet-500">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-xl font-bold text-gray-900">${this.escapeHtml(goal.title)}</h3>
            <p class="text-gray-600">${this.escapeHtml(goal.description || '')}</p>
          </div>
          <div class="flex gap-2">
            <button onclick="app.showEditGoal('${goal.id}')" class="text-gray-400 hover:text-violet-600">✏️</button>
            <button onclick="app.deleteGoal('${goal.id}')" class="text-gray-400 hover:text-red-600">🗑️</button>
          </div>
        </div>
        
        <!-- Lag Measure (Outcome) -->
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-1">
            <span class="font-medium text-gray-700">📊 Lag Measure: ${this.escapeHtml(goal.lagMeasure?.name || 'Not set')}</span>
            <span class="text-violet-600 font-bold">${goal.lagMeasure?.current || 0} / ${goal.lagMeasure?.target || 100}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div class="bg-violet-600 h-3 rounded-full transition-all" style="width: ${lagProgress}%"></div>
          </div>
        </div>
        
        <!-- Lead Measures (Activities) -->
        <div class="mb-4">
          <h4 class="font-medium text-gray-700 mb-2">🎯 Lead Measures</h4>
          ${(goal.leadMeasures || []).map(lead => `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm">${this.escapeHtml(lead.name)}</span>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500">${lead.current || 0}/${lead.target}</span>
                <button onclick="app.incrementLead('${goal.id}', '${lead.id}')" 
                        class="px-2 py-1 bg-violet-100 text-violet-700 rounded hover:bg-violet-200">+1</button>
              </div>
            </div>
          `).join('')}
          <button onclick="app.showAddLeadMeasure('${goal.id}')" 
                  class="mt-2 text-sm text-violet-600 hover:text-violet-800">+ Add Lead Measure</button>
        </div>
        
        <!-- Progress Summary -->
        <div class="flex gap-4 text-sm text-gray-500">
          <span>Created: ${new Date(goal.createdAt).toLocaleDateString()}</span>
          ${goal.deadline ? `<span>Deadline: ${new Date(goal.deadline).toLocaleDateString()}</span>` : ''}
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="text-center py-12 bg-white rounded-lg shadow">
        <span class="text-6xl mb-4 block">🎯</span>
        <h2 class="text-2xl font-bold text-gray-900 mb-4">No goals yet</h2>
        <p class="text-gray-600 mb-8">Start by defining your Wildly Important Goals!</p>
        <button onclick="app.showAddGoal()" class="px-6 py-3 bg-violet-600 text-white rounded-md hover:bg-violet-700">
          Add Your First Goal
        </button>
      </div>
    `;
  }

  // --- Calculations ---

  calculateLagProgress(goal) {
    if (!goal.lagMeasure || !goal.lagMeasure.target) return 0;
    return Math.min(100, Math.round((goal.lagMeasure.current / goal.lagMeasure.target) * 100));
  }

  calculateLeadProgress(goal) {
    if (!goal.leadMeasures || goal.leadMeasures.length === 0) return 0;
    const total = goal.leadMeasures.reduce((sum, lead) => {
      return sum + Math.min(100, (lead.current / lead.target) * 100);
    }, 0);
    return Math.round(total / goal.leadMeasures.length);
  }

  // --- CRUD Operations ---

  showAddGoal() {
    modal.show({
      title: '🎯 Add New Goal',
      content: `
        <form id="goal-form" class="space-y-4">
          <div>
            <label class="form-label">Goal Title *</label>
            <input type="text" name="title" required class="form-input" 
                   placeholder="e.g., Increase revenue by 20%">
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea name="description" class="form-input" rows="2" 
                      placeholder="Why is this goal important?"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Lag Measure Name</label>
              <input type="text" name="lagName" class="form-input" placeholder="e.g., Revenue">
            </div>
            <div>
              <label class="form-label">Target Value</label>
              <input type="number" name="lagTarget" class="form-input" placeholder="100">
            </div>
          </div>
          <div>
            <label class="form-label">Deadline</label>
            <input type="date" name="deadline" class="form-input">
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Create Goal',
          primary: true,
          onClick: () => {
            const data = FormHelper.getData('#goal-form');
            if (!data.title?.trim()) {
              toast.error('Goal title is required');
              return;
            }
            this.addGoal(data);
            modal.close();
          }
        }
      ]
    });
  }

  showEditGoal(id) {
    const goal = this.state.get('goals').find(g => g.id === id);
    if (!goal) return;
    
    modal.show({
      title: '✏️ Edit Goal',
      content: `
        <form id="goal-form" class="space-y-4">
          <div>
            <label class="form-label">Goal Title *</label>
            <input type="text" name="title" required class="form-input" value="${this.escapeHtml(goal.title)}">
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea name="description" class="form-input" rows="2">${this.escapeHtml(goal.description || '')}</textarea>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="form-label">Lag Measure</label>
              <input type="text" name="lagName" class="form-input" value="${this.escapeHtml(goal.lagMeasure?.name || '')}">
            </div>
            <div>
              <label class="form-label">Current</label>
              <input type="number" name="lagCurrent" class="form-input" value="${goal.lagMeasure?.current || 0}">
            </div>
            <div>
              <label class="form-label">Target</label>
              <input type="number" name="lagTarget" class="form-input" value="${goal.lagMeasure?.target || 100}">
            </div>
          </div>
          <div>
            <label class="form-label">Deadline</label>
            <input type="date" name="deadline" class="form-input" value="${goal.deadline || ''}">
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Save Changes',
          primary: true,
          onClick: () => {
            const data = FormHelper.getData('#goal-form');
            if (!data.title?.trim()) {
              toast.error('Goal title is required');
              return;
            }
            this.updateGoal(id, data);
            modal.close();
          }
        }
      ]
    });
  }

  showAddLeadMeasure(goalId) {
    modal.show({
      title: '📊 Add Lead Measure',
      content: `
        <form id="lead-form" class="space-y-4">
          <div>
            <label class="form-label">Lead Measure Name *</label>
            <input type="text" name="name" required class="form-input" 
                   placeholder="e.g., Sales calls per day">
          </div>
          <div>
            <label class="form-label">Weekly Target</label>
            <input type="number" name="target" class="form-input" value="5">
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Add Measure',
          primary: true,
          onClick: () => {
            const data = FormHelper.getData('#lead-form');
            if (!data.name?.trim()) {
              toast.error('Name is required');
              return;
            }
            this.addLeadMeasure(goalId, data);
            modal.close();
          }
        }
      ]
    });
  }

  addGoal(data) {
    const goals = this.state.get('goals') || [];
    
    const newGoal = {
      id: this.generateId(),
      title: data.title.trim(),
      description: data.description?.trim() || '',
      lagMeasure: {
        name: data.lagName?.trim() || 'Progress',
        current: 0,
        target: parseInt(data.lagTarget) || 100
      },
      leadMeasures: [],
      deadline: data.deadline || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.state.set('goals', [...goals, newGoal]);
    this.saveData();
    toast.success('Goal created!');
  }

  updateGoal(id, data) {
    const goals = this.state.get('goals').map(goal => {
      if (goal.id === id) {
        return {
          ...goal,
          title: data.title.trim(),
          description: data.description?.trim() || '',
          lagMeasure: {
            name: data.lagName?.trim() || goal.lagMeasure?.name || 'Progress',
            current: parseInt(data.lagCurrent) || 0,
            target: parseInt(data.lagTarget) || 100
          },
          deadline: data.deadline || goal.deadline,
          updatedAt: new Date().toISOString()
        };
      }
      return goal;
    });
    
    this.state.set('goals', goals);
    this.saveData();
    toast.success('Goal updated!');
  }

  addLeadMeasure(goalId, data) {
    const goals = this.state.get('goals').map(goal => {
      if (goal.id === goalId) {
        return {
          ...goal,
          leadMeasures: [
            ...(goal.leadMeasures || []),
            {
              id: this.generateId(),
              name: data.name.trim(),
              target: parseInt(data.target) || 5,
              current: 0
            }
          ],
          updatedAt: new Date().toISOString()
        };
      }
      return goal;
    });
    
    this.state.set('goals', goals);
    this.saveData();
    toast.success('Lead measure added!');
  }

  incrementLead(goalId, leadId) {
    const goals = this.state.get('goals').map(goal => {
      if (goal.id === goalId) {
        return {
          ...goal,
          leadMeasures: goal.leadMeasures.map(lead => {
            if (lead.id === leadId) {
              return { ...lead, current: (lead.current || 0) + 1 };
            }
            return lead;
          }),
          updatedAt: new Date().toISOString()
        };
      }
      return goal;
    });
    
    this.state.set('goals', goals);
    this.saveData();
  }

  async deleteGoal(id) {
    const confirmed = await modal.confirm('Delete this goal and all its data?', 'Delete Goal');
    if (!confirmed) return;
    
    const goals = this.state.get('goals').filter(g => g.id !== id);
    this.state.set('goals', goals);
    this.saveData();
    toast.success('Goal deleted!');
  }

  // --- Utilities ---

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
