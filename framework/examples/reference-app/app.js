/**
 * Reference App - A comprehensive example of the local-first framework
 * 
 * This app demonstrates:
 * - Extending the App base class
 * - CRUD operations (Create, Read, Update, Delete)
 * - Sync with GitHub
 * - Conflict resolution
 * - Filtering and sorting
 * - State management
 * - Toast notifications
 * - Modal dialogs
 * - Form handling
 * - Offline support
 */

class ReferenceApp extends App {
  constructor() {
    super({
      appName: 'reference-app',
      dataPath: 'apps/reference-app/data.json',
      initialState: {
        tasks: [],
        filter: 'all',      // all, active, completed
        sortBy: 'created',  // created, priority, title
        searchQuery: ''
      }
    });
  }

  /**
   * Called after app initialization
   */
  async onInit() {
    // Subscribe to state changes for re-rendering
    this.state.subscribe('tasks', () => this.renderTasks());
    this.state.subscribe('filter', () => this.renderTasks());
    this.state.subscribe('sortBy', () => this.renderTasks());
    this.state.subscribe('searchQuery', () => this.renderTasks());
    
    // Setup UI event handlers
    this.setupEventHandlers();
  }

  /**
   * Called when data is loaded (from local or remote)
   */
  onDataLoaded(data, source) {
    console.log(`[ReferenceApp] Data loaded from ${source}:`, data);
    
    this.state.set('tasks', data.tasks || []);
    this.renderTasks();
    
    if (source === 'remote' || source === 'merged') {
      this._showToast(`Data loaded from ${source}`, 'info');
    }
  }

  /**
   * Returns data to be saved/synced
   */
  getData() {
    return {
      tasks: this.state.get('tasks')
    };
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Sync button
    document.getElementById('sync-btn')?.addEventListener('click', () => {
      this.sync();
    });
    
    // Settings button
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      this.showSettings();
    });
  }

  /**
   * Render the main task list
   */
  renderTasks() {
    const container = document.getElementById('app-container');
    const tasks = this.getFilteredTasks();
    
    if (!this.state.get('isSetup')) {
      this.showSetupScreen();
      return;
    }
    
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header with Add button -->
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold text-gray-900">Tasks</h2>
          <button onclick="app.showAddTask()" class="btn btn-primary">
            ➕ Add Task
          </button>
        </div>
        
        <!-- Filters -->
        <div class="flex flex-wrap gap-4 items-center">
          <div class="flex gap-2">
            <button class="btn ${this.state.get('filter') === 'all' ? 'btn-primary' : 'btn-secondary'}"
                    onclick="app.setFilter('all')">
              All
            </button>
            <button class="btn ${this.state.get('filter') === 'active' ? 'btn-primary' : 'btn-secondary'}"
                    onclick="app.setFilter('active')">
              Active
            </button>
            <button class="btn ${this.state.get('filter') === 'completed' ? 'btn-primary' : 'btn-secondary'}"
                    onclick="app.setFilter('completed')">
              Completed
            </button>
          </div>
          
          <div class="flex-1">
            <input type="text" 
                   placeholder="Search tasks..." 
                   class="form-input"
                   value="${this.state.get('searchQuery')}"
                   oninput="app.setSearchQuery(this.value)">
          </div>
          
          <select class="form-input w-auto" onchange="app.setSortBy(this.value)">
            <option value="created" ${this.state.get('sortBy') === 'created' ? 'selected' : ''}>
              Sort: Newest
            </option>
            <option value="priority" ${this.state.get('sortBy') === 'priority' ? 'selected' : ''}>
              Sort: Priority
            </option>
            <option value="title" ${this.state.get('sortBy') === 'title' ? 'selected' : ''}>
              Sort: Title
            </option>
          </select>
        </div>
        
        <!-- Task List -->
        <div id="task-list" class="space-y-3">
          ${tasks.length === 0 ? this.renderEmptyState() : tasks.map(t => this.renderTask(t)).join('')}
        </div>
        
        <!-- Stats -->
        <div class="text-sm text-gray-500 text-center">
          ${this.renderStats()}
        </div>
      </div>
    `;
  }

  /**
   * Render a single task
   */
  renderTask(task) {
    const priorityClass = `priority-${task.priority || 'medium'}`;
    const completedClass = task.completed ? 'completed' : '';
    
    return `
      <div class="task-item card border-l-4 ${priorityClass} ${completedClass}">
        <div class="card-body flex items-start gap-4">
          <input type="checkbox" 
                 class="mt-1 h-5 w-5 rounded border-gray-300"
                 ${task.completed ? 'checked' : ''}
                 onchange="app.toggleTask('${task.id}')">
          
          <div class="flex-1 min-w-0">
            <h3 class="task-title font-medium text-gray-900">${this.escapeHtml(task.title)}</h3>
            ${task.description ? `<p class="text-sm text-gray-600 mt-1">${this.escapeHtml(task.description)}</p>` : ''}
            <div class="flex gap-4 mt-2 text-xs text-gray-500">
              <span>📅 ${new Date(task.createdAt).toLocaleDateString()}</span>
              <span>🏷️ ${task.priority || 'medium'}</span>
              ${task.category ? `<span>📁 ${this.escapeHtml(task.category)}</span>` : ''}
            </div>
          </div>
          
          <div class="flex gap-2">
            <button onclick="app.showEditTask('${task.id}')" 
                    class="btn btn-ghost text-sm">✏️</button>
            <button onclick="app.deleteTask('${task.id}')" 
                    class="btn btn-ghost text-sm text-red-600">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    const filter = this.state.get('filter');
    const searchQuery = this.state.get('searchQuery');
    
    let message = 'No tasks yet. Add your first task!';
    if (searchQuery) {
      message = `No tasks matching "${searchQuery}"`;
    } else if (filter === 'active') {
      message = 'No active tasks. Great job! 🎉';
    } else if (filter === 'completed') {
      message = 'No completed tasks yet.';
    }
    
    return `
      <div class="empty-state card">
        <div class="empty-state-icon">📋</div>
        <h3 class="empty-state-title">No Tasks</h3>
        <p class="empty-state-description">${message}</p>
        ${!searchQuery && filter === 'all' ? `
          <button onclick="app.showAddTask()" class="btn btn-primary">
            ➕ Add Task
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render stats
   */
  renderStats() {
    const tasks = this.state.get('tasks') || [];
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    
    return `${completed} of ${total} tasks completed`;
  }

  /**
   * Get filtered and sorted tasks
   */
  getFilteredTasks() {
    let tasks = [...(this.state.get('tasks') || [])];
    const filter = this.state.get('filter');
    const sortBy = this.state.get('sortBy');
    const searchQuery = this.state.get('searchQuery')?.toLowerCase() || '';
    
    // Filter
    if (filter === 'active') {
      tasks = tasks.filter(t => !t.completed);
    } else if (filter === 'completed') {
      tasks = tasks.filter(t => t.completed);
    }
    
    // Search
    if (searchQuery) {
      tasks = tasks.filter(t => 
        t.title.toLowerCase().includes(searchQuery) ||
        (t.description && t.description.toLowerCase().includes(searchQuery)) ||
        (t.category && t.category.toLowerCase().includes(searchQuery))
      );
    }
    
    // Sort
    tasks.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorities = { high: 0, medium: 1, low: 2 };
          return (priorities[a.priority] || 1) - (priorities[b.priority] || 1);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    
    return tasks;
  }

  /**
   * Show add task modal
   */
  showAddTask() {
    modal.show({
      title: '➕ Add New Task',
      content: `
        <form id="task-form" class="space-y-4">
          <div>
            <label class="form-label">Title *</label>
            <input type="text" name="title" required class="form-input" placeholder="What needs to be done?">
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea name="description" class="form-input" rows="3" placeholder="Add details..."></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Priority</label>
              <select name="priority" class="form-input">
                <option value="low">🟢 Low</option>
                <option value="medium" selected>🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
            <div>
              <label class="form-label">Category</label>
              <input type="text" name="category" class="form-input" placeholder="e.g., Work, Personal">
            </div>
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Add Task',
          primary: true,
          onClick: () => {
            const form = document.getElementById('task-form');
            const data = FormHelper.getData(form);
            
            if (!data.title?.trim()) {
              toast.error('Title is required');
              return;
            }
            
            this.addTask(data);
            modal.close();
          }
        }
      ]
    });
    
    // Focus the title input
    setTimeout(() => {
      document.querySelector('#task-form input[name="title"]')?.focus();
    }, 100);
  }

  /**
   * Show edit task modal
   */
  showEditTask(id) {
    const task = this.state.get('tasks').find(t => t.id === id);
    if (!task) return;
    
    modal.show({
      title: '✏️ Edit Task',
      content: `
        <form id="task-form" class="space-y-4">
          <div>
            <label class="form-label">Title *</label>
            <input type="text" name="title" required class="form-input" value="${this.escapeHtml(task.title)}">
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea name="description" class="form-input" rows="3">${this.escapeHtml(task.description || '')}</textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Priority</label>
              <select name="priority" class="form-input">
                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>🔴 High</option>
              </select>
            </div>
            <div>
              <label class="form-label">Category</label>
              <input type="text" name="category" class="form-input" value="${this.escapeHtml(task.category || '')}">
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
            const form = document.getElementById('task-form');
            const data = FormHelper.getData(form);
            
            if (!data.title?.trim()) {
              toast.error('Title is required');
              return;
            }
            
            this.updateTask(id, data);
            modal.close();
          }
        }
      ]
    });
  }

  /**
   * Add a new task
   */
  addTask(data) {
    const tasks = this.state.get('tasks') || [];
    
    const newTask = {
      id: this.generateId(),
      title: data.title.trim(),
      description: data.description?.trim() || '',
      priority: data.priority || 'medium',
      category: data.category?.trim() || '',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.state.set('tasks', [...tasks, newTask]);
    this.saveData();
    toast.success('Task added!');
  }

  /**
   * Update a task
   */
  updateTask(id, data) {
    const tasks = this.state.get('tasks').map(task => {
      if (task.id === id) {
        return {
          ...task,
          title: data.title.trim(),
          description: data.description?.trim() || '',
          priority: data.priority || task.priority,
          category: data.category?.trim() || '',
          updatedAt: new Date().toISOString()
        };
      }
      return task;
    });
    
    this.state.set('tasks', tasks);
    this.saveData();
    toast.success('Task updated!');
  }

  /**
   * Toggle task completion
   */
  toggleTask(id) {
    const tasks = this.state.get('tasks').map(task => {
      if (task.id === id) {
        return {
          ...task,
          completed: !task.completed,
          updatedAt: new Date().toISOString()
        };
      }
      return task;
    });
    
    this.state.set('tasks', tasks);
    this.saveData();
  }

  /**
   * Delete a task
   */
  async deleteTask(id) {
    const confirmed = await modal.confirm('Are you sure you want to delete this task?', 'Delete Task');
    if (!confirmed) return;
    
    const tasks = this.state.get('tasks').filter(t => t.id !== id);
    this.state.set('tasks', tasks);
    this.saveData();
    toast.success('Task deleted!');
  }

  /**
   * Set filter
   */
  setFilter(filter) {
    this.state.set('filter', filter);
  }

  /**
   * Set sort order
   */
  setSortBy(sortBy) {
    this.state.set('sortBy', sortBy);
  }

  /**
   * Set search query
   */
  setSearchQuery(query) {
    this.state.set('searchQuery', query);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Create and initialize app
let app;

document.addEventListener('DOMContentLoaded', async () => {
  app = new ReferenceApp();
  await app.init();
});
