/**
 * Meal Planner App
 * A local-first weekly meal planning application
 * 
 * Refactored to use the App base class
 */

class MealPlannerApp extends App {
  constructor() {
    super({
      appName: 'meal-planner',
      dataPath: 'apps/meal-planner/data.json',
      initialState: {
        currentWeekStart: this.getWeekStart(new Date()),
        meals: {},     // { "2026-04-07": { "Breakfast": {...}, "Lunch": {...}, ... } }
        favorites: [],
        mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
      }
    });
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toISOString().split('T')[0];
  }

  async onInit() {
    this.state.subscribe('currentWeekStart', () => this.renderWeek());
    this.state.subscribe('meals', () => this.renderMealGrid());
    this.state.subscribe('favorites', () => this.renderFavorites());
    this.setupEventHandlers();
  }

  onDataLoaded(data, source) {
    this.state.set({
      meals: data.meals || {},
      favorites: data.favorites || []
    });
    this.renderWeek();
    this.renderMealGrid();
    this.renderFavorites();
    this.renderStats();
  }

  getData() {
    return {
      meals: this.state.get('meals'),
      favorites: this.state.get('favorites')
    };
  }

  setupEventHandlers() {
    document.getElementById('sync-btn')?.addEventListener('click', () => this.sync());
    document.getElementById('settings-btn')?.addEventListener('click', () => this.showSettings());
    document.getElementById('prev-week')?.addEventListener('click', () => this.changeWeek(-1));
    document.getElementById('next-week')?.addEventListener('click', () => this.changeWeek(1));
    document.getElementById('today-btn')?.addEventListener('click', () => this.goToToday());
  }

  // --- Week Navigation ---

  changeWeek(delta) {
    const current = new Date(this.state.get('currentWeekStart'));
    current.setDate(current.getDate() + (delta * 7));
    this.state.set('currentWeekStart', current.toISOString().split('T')[0]);
  }

  goToToday() {
    this.state.set('currentWeekStart', this.getWeekStart(new Date()));
  }

  getWeekDates(startDate) {
    const dates = [];
    const start = new Date(startDate + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // --- Rendering ---

  renderWeek() {
    const container = document.getElementById('week-header');
    if (!container) return;
    
    const weekStart = this.state.get('currentWeekStart');
    const weekDates = this.getWeekDates(weekStart);
    const today = new Date().toISOString().split('T')[0];
    
    container.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <button id="prev-week" class="btn btn-secondary">← Prev</button>
        <h2 class="text-xl font-bold">
          ${this.formatDate(weekDates[0])} - ${this.formatDate(weekDates[6])}
        </h2>
        <div class="flex gap-2">
          <button id="today-btn" class="btn btn-secondary">Today</button>
          <button id="next-week" class="btn btn-secondary">Next →</button>
        </div>
      </div>
    `;
    
    // Re-attach event handlers
    document.getElementById('prev-week')?.addEventListener('click', () => this.changeWeek(-1));
    document.getElementById('next-week')?.addEventListener('click', () => this.changeWeek(1));
    document.getElementById('today-btn')?.addEventListener('click', () => this.goToToday());
  }

  renderMealGrid() {
    const container = document.getElementById('meal-grid');
    if (!container) return;
    
    if (!this.state.get('isSetup')) {
      this.showSetupScreen();
      return;
    }
    
    const weekDates = this.getWeekDates(this.state.get('currentWeekStart'));
    const mealTypes = this.state.get('mealTypes');
    const meals = this.state.get('meals') || {};
    const today = new Date().toISOString().split('T')[0];
    
    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="p-2 border bg-gray-50 w-24"></th>
              ${weekDates.map(date => `
                <th class="p-2 border bg-gray-50 text-center ${date === today ? 'bg-emerald-50' : ''}">
                  ${this.formatDate(date)}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${mealTypes.map(type => `
              <tr>
                <td class="p-2 border bg-gray-50 font-medium">${type}</td>
                ${weekDates.map(date => {
                  const meal = meals[date]?.[type];
                  return `
                    <td class="p-2 border ${date === today ? 'bg-emerald-50' : ''} hover:bg-gray-50 cursor-pointer"
                        onclick="app.showMealEditor('${date}', '${type}')">
                      ${meal ? `
                        <div class="text-sm">
                          <div class="font-medium">${this.escapeHtml(meal.name)}</div>
                          ${meal.notes ? `<div class="text-gray-500 text-xs">${this.escapeHtml(meal.notes)}</div>` : ''}
                        </div>
                      ` : `
                        <div class="text-gray-400 text-sm">+ Add</div>
                      `}
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderFavorites() {
    const container = document.getElementById('favorites-container');
    if (!container) return;
    
    const favorites = this.state.get('favorites') || [];
    
    if (favorites.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-4">
          No favorite meals yet. Click ⭐ when adding a meal to save it!
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="flex flex-wrap gap-2">
        ${favorites.map(fav => `
          <button onclick="app.quickAddFavorite('${fav.id}')"
                  class="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm hover:bg-amber-200">
            ${this.escapeHtml(fav.name)}
          </button>
        `).join('')}
      </div>
    `;
  }

  renderStats() {
    const container = document.getElementById('stats-container');
    if (!container) return;
    
    const meals = this.state.get('meals') || {};
    const favorites = this.state.get('favorites') || [];
    
    let totalMeals = 0;
    Object.values(meals).forEach(day => {
      totalMeals += Object.keys(day).length;
    });
    
    container.innerHTML = `
      <div class="grid grid-cols-2 gap-4 text-center">
        <div class="bg-white rounded-lg p-4 shadow">
          <div class="text-2xl font-bold text-emerald-600">${totalMeals}</div>
          <div class="text-sm text-gray-500">Meals Planned</div>
        </div>
        <div class="bg-white rounded-lg p-4 shadow">
          <div class="text-2xl font-bold text-amber-600">${favorites.length}</div>
          <div class="text-sm text-gray-500">Favorites</div>
        </div>
      </div>
    `;
  }

  // --- Meal Operations ---

  showMealEditor(date, mealType) {
    const meals = this.state.get('meals') || {};
    const existing = meals[date]?.[mealType];
    const favorites = this.state.get('favorites') || [];
    
    modal.show({
      title: `${mealType} - ${this.formatDate(date)}`,
      content: `
        <form id="meal-form" class="space-y-4">
          <div>
            <label class="form-label">Meal Name</label>
            <input type="text" name="name" class="form-input" 
                   value="${this.escapeHtml(existing?.name || '')}"
                   placeholder="What are you having?">
          </div>
          <div>
            <label class="form-label">Notes</label>
            <textarea name="notes" class="form-input" rows="2" 
                      placeholder="Recipe link, ingredients...">${this.escapeHtml(existing?.notes || '')}</textarea>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" name="favorite" id="favorite-check" ${existing?.isFavorite ? 'checked' : ''}>
            <label for="favorite-check">⭐ Save to favorites</label>
          </div>
          ${favorites.length > 0 ? `
            <div>
              <label class="form-label">Or pick from favorites:</label>
              <select name="favoriteSelect" class="form-input" onchange="this.form.name.value = this.value; this.value = '';">
                <option value="">Choose...</option>
                ${favorites.map(f => `<option value="${this.escapeHtml(f.name)}">${this.escapeHtml(f.name)}</option>`).join('')}
              </select>
            </div>
          ` : ''}
        </form>
      `,
      buttons: [
        existing ? {
          text: 'Remove',
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
            const data = FormHelper.getData('#meal-form');
            if (data.name?.trim()) {
              this.saveMeal(date, mealType, data);
            }
            modal.close();
          }
        }
      ].filter(Boolean)
    });
  }

  saveMeal(date, mealType, data) {
    const meals = { ...this.state.get('meals') };
    
    if (!meals[date]) {
      meals[date] = {};
    }
    
    const meal = {
      name: data.name.trim(),
      notes: data.notes?.trim() || '',
      isFavorite: data.favorite === 'on',
      updatedAt: new Date().toISOString()
    };
    
    meals[date][mealType] = meal;
    this.state.set('meals', meals);
    
    // Add to favorites if checked
    if (meal.isFavorite) {
      this.addToFavorites(meal.name);
    }
    
    this.saveData();
    toast.success('Meal saved!');
  }

  removeMeal(date, mealType) {
    const meals = { ...this.state.get('meals') };
    
    if (meals[date]) {
      delete meals[date][mealType];
      if (Object.keys(meals[date]).length === 0) {
        delete meals[date];
      }
    }
    
    this.state.set('meals', meals);
    this.saveData();
    toast.success('Meal removed!');
  }

  addToFavorites(name) {
    const favorites = this.state.get('favorites') || [];
    
    // Check if already exists
    if (favorites.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      return;
    }
    
    const newFavorite = {
      id: this.generateId(),
      name: name,
      addedAt: new Date().toISOString()
    };
    
    this.state.set('favorites', [...favorites, newFavorite]);
  }

  quickAddFavorite(favoriteId) {
    const favorites = this.state.get('favorites') || [];
    const favorite = favorites.find(f => f.id === favoriteId);
    if (!favorite) return;
    
    // Add to today's dinner by default
    const today = new Date().toISOString().split('T')[0];
    this.saveMeal(today, 'Dinner', { name: favorite.name, notes: '' });
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
  app = new MealPlannerApp();
  await app.init();
});
