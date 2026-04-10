/**
 * My App - Template for Local-First Apps
 * 
 * To create a new app:
 * 1. Copy this directory to examples/your-app-name/
 * 2. Rename this class and update the config
 * 3. Implement onDataLoaded() and getData()
 * 4. Add your custom rendering and business logic
 */

class MyApp extends App {
  constructor() {
    super({
      appName: 'my-app',                        // Unique app identifier
      dataPath: 'apps/my-app/data.json',        // Path in GitHub repo
      initialState: {
        items: []                                // Your initial state
      }
    });
  }

  /**
   * Called after app initialization
   * Setup event handlers and state subscriptions here
   */
  async onInit() {
    // Subscribe to state changes for re-rendering
    this.state.subscribe('items', () => this.renderItems());
    
    // Setup UI event handlers
    this.setupEventHandlers();
  }

  /**
   * Called when data is loaded (from local storage or GitHub)
   * @param {Object} data - The loaded data
   * @param {string} source - 'local', 'remote', 'merged', or 'empty'
   */
  onDataLoaded(data, source) {
    console.log(`[MyApp] Data loaded from ${source}`);
    this.state.set('items', data.items || []);
    this.renderItems();
  }

  /**
   * Returns the data to be saved and synced
   * Must return an object that will be saved as JSON
   */
  getData() {
    return {
      items: this.state.get('items')
    };
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    document.getElementById('sync-btn')?.addEventListener('click', () => this.sync());
    document.getElementById('settings-btn')?.addEventListener('click', () => this.showSettings());
    document.getElementById('add-btn')?.addEventListener('click', () => this.showAddItem());
  }

  /**
   * Render items to the page
   */
  renderItems() {
    const container = document.getElementById('app-container');
    if (!container) return;
    
    // Show setup screen if not configured
    if (!this.state.get('isSetup')) {
      this.showSetupScreen();
      return;
    }
    
    const items = this.state.get('items') || [];
    
    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state card">
          <div class="empty-state-icon">📦</div>
          <h3 class="empty-state-title">No items yet</h3>
          <p class="empty-state-description">Add your first item to get started!</p>
          <button onclick="app.showAddItem()" class="btn btn-primary">
            ➕ Add Item
          </button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">My Items</h2>
          <button onclick="app.showAddItem()" class="btn btn-primary">➕ Add</button>
        </div>
        
        <div class="space-y-3">
          ${items.map(item => this.renderItem(item)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render a single item
   */
  renderItem(item) {
    return `
      <div class="card card-body flex justify-between items-center">
        <div>
          <h3 class="font-medium">${this.escapeHtml(item.title)}</h3>
          <p class="text-sm text-gray-500">${this.escapeHtml(item.description || '')}</p>
        </div>
        <div class="flex gap-2">
          <button onclick="app.editItem('${item.id}')" class="btn btn-ghost">✏️</button>
          <button onclick="app.deleteItem('${item.id}')" class="btn btn-ghost text-red-600">🗑️</button>
        </div>
      </div>
    `;
  }

  /**
   * Show add item modal
   */
  showAddItem() {
    modal.show({
      title: '➕ Add Item',
      content: `
        <form id="item-form" class="space-y-4">
          <div>
            <label class="form-label">Title *</label>
            <input type="text" name="title" required class="form-input" placeholder="Enter title">
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea name="description" class="form-input" rows="3" placeholder="Optional description"></textarea>
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Add',
          primary: true,
          onClick: () => {
            const data = FormHelper.getData('#item-form');
            if (!data.title?.trim()) {
              toast.error('Title is required');
              return;
            }
            this.addItem(data);
            modal.close();
          }
        }
      ]
    });
  }

  /**
   * Add a new item
   */
  addItem(data) {
    const items = this.state.get('items') || [];
    
    const newItem = {
      id: this.generateId(),
      title: data.title.trim(),
      description: data.description?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.state.set('items', [...items, newItem]);
    this.saveData();
    toast.success('Item added!');
  }

  /**
   * Edit an item
   */
  editItem(id) {
    const item = this.state.get('items').find(i => i.id === id);
    if (!item) return;
    
    modal.show({
      title: '✏️ Edit Item',
      content: `
        <form id="item-form" class="space-y-4">
          <div>
            <label class="form-label">Title *</label>
            <input type="text" name="title" required class="form-input" value="${this.escapeHtml(item.title)}">
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea name="description" class="form-input" rows="3">${this.escapeHtml(item.description || '')}</textarea>
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Save',
          primary: true,
          onClick: () => {
            const data = FormHelper.getData('#item-form');
            if (!data.title?.trim()) {
              toast.error('Title is required');
              return;
            }
            this.updateItem(id, data);
            modal.close();
          }
        }
      ]
    });
  }

  /**
   * Update an item
   */
  updateItem(id, data) {
    const items = this.state.get('items').map(item => {
      if (item.id === id) {
        return {
          ...item,
          title: data.title.trim(),
          description: data.description?.trim() || '',
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });
    
    this.state.set('items', items);
    this.saveData();
    toast.success('Item updated!');
  }

  /**
   * Delete an item
   */
  async deleteItem(id) {
    const confirmed = await modal.confirm('Delete this item?', 'Confirm Delete');
    if (!confirmed) return;
    
    const items = this.state.get('items').filter(i => i.id !== id);
    this.state.set('items', items);
    this.saveData();
    toast.success('Item deleted!');
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

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', async () => {
  app = new MyApp();
  await app.init();
});
