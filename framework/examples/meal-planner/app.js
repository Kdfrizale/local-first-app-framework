/**
 * Meal Planner App
 * Plan weekly meals for your family
 */

class MealPlannerApp extends App {
  constructor() {
    super({
      appName: 'meal-planner',
      dataPath: 'apps/meal-planner/data.json'
    });
    
    this.meals = {};        // { "2026-04-07": { "Breakfast": {...}, "Lunch": {...}, ... } }
    this.favorites = [];
    this.shoppingList = [];
    this.currentWeekStart = this.getWeekStart(new Date());
    
    this.mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  }

  async onInit() {
    this.setupEventHandlers();
  }

  onDataLoaded(data, source) {
    console.log('[MealPlanner] Data loaded from:', source);
    this.meals = data.meals || {};
    this.favorites = data.favorites || [];
    this.shoppingList = data.shoppingList || [];
    this.render();
  }

  getData() {
    return {
      meals: this.meals,
      favorites: this.favorites,
      shoppingList: this.shoppingList
    };
  }

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  setupEventHandlers() {
    document.getElementById('sync-btn').addEventListener('click', () => this.sync());
    document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
    
    document.getElementById('prev-week-btn').addEventListener('click', () => this.changeWeek(-1));
    document.getElementById('next-week-btn').addEventListener('click', () => this.changeWeek(1));
    document.getElementById('today-btn').addEventListener('click', () => this.goToToday());
    
    document.getElementById('add-favorite-btn').addEventListener('click', () => this.showAddFavorite());
    
    // Shopping list
    document.getElementById('add-shopping-btn').addEventListener('click', () => this.addShoppingItem());
    document.getElementById('shopping-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addShoppingItem();
    });
    document.getElementById('clear-shopping-btn').addEventListener('click', () => this.clearShoppingList());
  }

  // ============================================================
  // WEEK NAVIGATION
  // ============================================================

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toISOString().split('T')[0];
  }

  getWeekDates() {
    const dates = [];
    const start = new Date(this.currentWeekStart + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  changeWeek(delta) {
    const current = new Date(this.currentWeekStart);
    current.setDate(current.getDate() + (delta * 7));
    this.currentWeekStart = current.toISOString().split('T')[0];
    this.render();
  }

  goToToday() {
    this.currentWeekStart = this.getWeekStart(new Date());
    this.render();
  }

  formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  formatDateShort(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  }

  // ============================================================
  // MEAL OPERATIONS
  // ============================================================

  showMealEditor(date, mealType) {
    const existing = this.meals[date]?.[mealType];
    
    const favoritesOptions = this.favorites.length > 0 ? `
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Quick Pick from Favorites</label>
        <select id="favorite-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Choose a favorite...</option>
          ${this.favorites.map(f => `<option value="${this.escapeHtml(f.name)}">${this.escapeHtml(f.name)}</option>`).join('')}
        </select>
      </div>
    ` : '';
    
    modal.show({
      title: `${mealType} - ${this.formatDate(date)}`,
      content: `
        <form id="meal-form" class="space-y-4">
          ${favoritesOptions}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Meal Name</label>
            <input type="text" name="name" id="meal-name-input" value="${this.escapeHtml(existing?.name || '')}"
              placeholder="What are you having?"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes / Recipe</label>
            <textarea name="notes" rows="2" placeholder="Recipe link, ingredients, prep notes..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none">${this.escapeHtml(existing?.notes || '')}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ingredients (for shopping list)</label>
            <textarea name="ingredients" rows="2" placeholder="One ingredient per line..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none">${this.escapeHtml(existing?.ingredients || '')}</textarea>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" name="favorite" id="favorite-check" ${existing?.isFavorite ? 'checked' : ''}>
            <label for="favorite-check" class="text-sm">⭐ Save to favorites</label>
          </div>
        </form>
      `,
      buttons: [
        existing ? {
          text: 'Remove Meal',
          onClick: () => {
            this.removeMeal(date, mealType);
            modal.close();
          }
        } : null,
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: existing ? 'Update' : 'Save',
          primary: true,
          onClick: () => {
            const form = document.getElementById('meal-form');
            const formData = new FormData(form);
            const name = formData.get('name')?.trim();
            
            if (name) {
              this.saveMeal(date, mealType, {
                name,
                notes: formData.get('notes')?.trim() || '',
                ingredients: formData.get('ingredients')?.trim() || '',
                isFavorite: form.querySelector('#favorite-check').checked
              });
            }
            
            modal.close();
          }
        }
      ].filter(Boolean)
    });
    
    // Setup favorite quick-pick
    setTimeout(() => {
      const select = document.getElementById('favorite-select');
      if (select) {
        select.addEventListener('change', (e) => {
          if (e.target.value) {
            document.getElementById('meal-name-input').value = e.target.value;
          }
        });
      }
    }, 100);
  }

  saveMeal(date, mealType, data) {
    if (!this.meals[date]) {
      this.meals[date] = {};
    }
    
    this.meals[date][mealType] = {
      name: data.name,
      notes: data.notes,
      ingredients: data.ingredients,
      isFavorite: data.isFavorite,
      updatedAt: new Date().toISOString()
    };
    
    // Add to favorites if checked
    if (data.isFavorite && !this.favorites.some(f => f.name.toLowerCase() === data.name.toLowerCase())) {
      this.favorites.push({
        id: this.generateId(),
        name: data.name,
        addedAt: new Date().toISOString()
      });
    }
    
    // Add ingredients to shopping list
    if (data.ingredients) {
      const items = data.ingredients.split('\n').map(i => i.trim()).filter(i => i);
      items.forEach(item => {
        if (!this.shoppingList.some(s => s.name.toLowerCase() === item.toLowerCase())) {
          this.shoppingList.push({
            id: this.generateId(),
            name: item,
            checked: false
          });
        }
      });
    }
    
    this.render();
    this.saveData();
    
    this._showToast('Meal saved!', 'success');
  }

  removeMeal(date, mealType) {
    if (this.meals[date]) {
      delete this.meals[date][mealType];
      if (Object.keys(this.meals[date]).length === 0) {
        delete this.meals[date];
      }
    }
    
    this.render();
    this.saveData();
    
    this._showToast('Meal removed', 'info');
  }

  // ============================================================
  // FAVORITES
  // ============================================================

  showAddFavorite() {
    modal.show({
      title: '⭐ Add Favorite Meal',
      content: `
        <form id="favorite-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Meal Name *</label>
            <input type="text" name="name" required placeholder="e.g., Spaghetti Bolognese"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Add Favorite',
          primary: true,
          onClick: () => {
            const form = document.getElementById('favorite-form');
            const formData = new FormData(form);
            const name = formData.get('name')?.trim();
            
            if (!name) {
              this._showToast('Name is required', 'error');
              return;
            }
            
            if (this.favorites.some(f => f.name.toLowerCase() === name.toLowerCase())) {
              this._showToast('Already in favorites', 'warning');
              return;
            }
            
            this.favorites.push({
              id: this.generateId(),
              name,
              addedAt: new Date().toISOString()
            });
            
            this.render();
            this.saveData();
            this._showToast('Favorite added!', 'success');
            
            modal.close();
          }
        }
      ]
    });
  }

  deleteFavorite(id) {
    this.favorites = this.favorites.filter(f => f.id !== id);
    this.render();
    this.saveData();
    this._showToast('Favorite removed', 'info');
  }

  // ============================================================
  // SHOPPING LIST
  // ============================================================

  addShoppingItem() {
    const input = document.getElementById('shopping-input');
    const name = input.value.trim();
    
    if (!name) return;
    
    if (this.shoppingList.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      this._showToast('Already on list', 'warning');
      return;
    }
    
    this.shoppingList.push({
      id: this.generateId(),
      name,
      checked: false
    });
    
    input.value = '';
    this.renderShoppingList();
    this.saveData();
  }

  toggleShoppingItem(id) {
    const item = this.shoppingList.find(s => s.id === id);
    if (item) {
      item.checked = !item.checked;
      this.renderShoppingList();
      this.saveData();
    }
  }

  deleteShoppingItem(id) {
    this.shoppingList = this.shoppingList.filter(s => s.id !== id);
    this.renderShoppingList();
    this.saveData();
  }

  clearShoppingList() {
    modal.confirm('Clear all items from shopping list?', 'Clear Shopping List').then(confirmed => {
      if (!confirmed) return;
      
      this.shoppingList = [];
      this.renderShoppingList();
      this.saveData();
      this._showToast('Shopping list cleared', 'info');
    });
  }

  // ============================================================
  // RENDERING
  // ============================================================

  render() {
    this.renderWeekHeader();
    this.renderMealGrid();
    this.renderFavorites();
    this.renderShoppingList();
    this.renderStats();
  }

  renderWeekHeader() {
    const dates = this.getWeekDates();
    const today = new Date().toISOString().split('T')[0];
    
    // Update week display
    document.getElementById('week-display').textContent = 
      `${this.formatDate(dates[0])} - ${this.formatDate(dates[6])}`;
    
    // Update day headers
    for (let i = 0; i < 7; i++) {
      const header = document.getElementById(`day-${i}`);
      if (header) {
        const isToday = dates[i] === today;
        header.textContent = this.formatDateShort(dates[i]);
        header.className = `p-3 text-center text-sm font-semibold border-b min-w-[120px] ${isToday ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700'}`;
      }
    }
  }

  renderMealGrid() {
    const container = document.getElementById('meal-grid');
    const dates = this.getWeekDates();
    const today = new Date().toISOString().split('T')[0];
    
    container.innerHTML = this.mealTypes.map(mealType => `
      <tr>
        <td class="p-3 border-b bg-gray-50 font-medium text-gray-700">${mealType}</td>
        ${dates.map(date => {
          const meal = this.meals[date]?.[mealType];
          const isToday = date === today;
          
          return `
            <td class="p-2 border-b meal-cell ${isToday ? 'today-column' : ''}" 
                onclick="app.showMealEditor('${date}', '${mealType}')">
              ${meal ? `
                <div class="text-sm">
                  <div class="font-medium text-gray-800">${this.escapeHtml(meal.name)}</div>
                  ${meal.notes ? `<div class="text-gray-500 text-xs truncate">${this.escapeHtml(meal.notes)}</div>` : ''}
                  ${meal.isFavorite ? '<span class="text-xs">⭐</span>' : ''}
                </div>
              ` : `
                <div class="text-gray-300 text-sm text-center">+ Add</div>
              `}
            </td>
          `;
        }).join('')}
      </tr>
    `).join('');
  }

  renderFavorites() {
    const container = document.getElementById('favorites-container');
    
    if (this.favorites.length === 0) {
      container.innerHTML = `<span class="text-gray-400 text-sm">No favorites yet. Save meals as favorites for quick access!</span>`;
      return;
    }
    
    container.innerHTML = this.favorites.map(fav => `
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
        ${this.escapeHtml(fav.name)}
        <button onclick="app.deleteFavorite('${fav.id}')" class="hover:text-red-600 ml-1">&times;</button>
      </span>
    `).join('');
  }

  renderShoppingList() {
    const container = document.getElementById('shopping-list');
    
    if (this.shoppingList.length === 0) {
      container.innerHTML = `<span class="text-gray-400 text-sm">No items yet. Add ingredients while planning meals!</span>`;
      return;
    }
    
    // Sort: unchecked first
    const sorted = [...this.shoppingList].sort((a, b) => a.checked - b.checked);
    
    container.innerHTML = sorted.map(item => `
      <div class="flex items-center gap-3 p-2 ${item.checked ? 'bg-gray-50 text-gray-400' : 'bg-white'} rounded-lg">
        <input type="checkbox" ${item.checked ? 'checked' : ''} 
          onchange="app.toggleShoppingItem('${item.id}')"
          class="w-5 h-5 text-emerald-600 rounded">
        <span class="flex-1 ${item.checked ? 'line-through' : ''}">${this.escapeHtml(item.name)}</span>
        <button onclick="app.deleteShoppingItem('${item.id}')" 
          class="text-gray-400 hover:text-red-600 transition">&times;</button>
      </div>
    `).join('');
  }

  renderStats() {
    // Count meals for current week
    const dates = this.getWeekDates();
    let weekMeals = 0;
    dates.forEach(date => {
      if (this.meals[date]) {
        weekMeals += Object.keys(this.meals[date]).length;
      }
    });
    
    // Count total meals
    let totalMeals = 0;
    Object.values(this.meals).forEach(day => {
      totalMeals += Object.keys(day).length;
    });
    
    document.getElementById('stat-planned').textContent = weekMeals;
    document.getElementById('stat-total').textContent = totalMeals;
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
  app = new MealPlannerApp();
  await app.init();
});
