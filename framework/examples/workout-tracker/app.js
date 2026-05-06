/**
 * Workout Tracker App
 */

class WorkoutTrackerApp extends App {
  constructor() {
    super({
      appName: 'workout-tracker',
      dataPath: 'apps/workout-tracker/data.json'
    });
    
    this.exercises = [];
    this.routines = [];
    this.workouts = [];
    this.activeTab = 'library';
    this.activeWorkout = null;
    this.historyView = 'list';
    this.charts = {};
  }

  async onInit() {
    this.setupEventHandlers();
  }

  onDataLoaded(data, source) {
    console.log('[WorkoutTracker] Data loaded from:', source);
    this.exercises = data.exercises || this.getInitialExercises();
    this.routines = data.routines || [];
    this.workouts = data.workouts || [];
    this.render();
  }

  getData() {
    return {
      exercises: this.exercises,
      routines: this.routines,
      workouts: this.workouts
    };
  }


  getInitialExercises() {
    return [
      {
        id: 'ex-pushups',
        name: 'Push-ups',
        imageUrl: 'https://cdn.shopify.com/s/files/1/1876/4703/files/shutterstock_1676033716_1.jpg',
        videoUrl: '',
        trackingFields: [{ id: 'reps', name: 'Reps', type: 'number', unit: '' }]
      },
      {
        id: 'ex-pullups',
        name: 'Pull-ups',
        imageUrl: 'https://hips.hearstapps.com/hmg-prod/images/workouts/2016/03/pullup-1457038876.jpg',
        videoUrl: '',
        trackingFields: [{ id: 'reps', name: 'Reps', type: 'number', unit: '' }]
      },
      {
        id: 'ex-squats',
        name: 'Squats',
        imageUrl: 'https://www.inspireusafoundation.org/wp-content/uploads/2022/03/barbell-squat-benefits-1024x731.jpg',
        videoUrl: '',
        trackingFields: [
          { id: 'reps', name: 'Reps', type: 'number', unit: '' },
          { id: 'weight', name: 'Weight', type: 'number', unit: 'lbs' }
        ]
      },
      {
        id: 'ex-plank',
        name: 'Plank',
        imageUrl: 'https://hips.hearstapps.com/hmg-prod/images/workouts/2016/03/plank-1457038850.jpg',
        videoUrl: '',
        trackingFields: [{ id: 'duration', name: 'Duration', type: 'number', unit: 'seconds' }]
      },
      {
        id: 'ex-band-rows',
        name: 'Resistance Band Rows',
        imageUrl: 'https://www.inspireusafoundation.org/wp-content/uploads/2022/08/resistance-band-bent-over-row.gif',
        videoUrl: '',
        trackingFields: [
          { id: 'reps', name: 'Reps', type: 'number', unit: '' },
          { id: 'band', name: 'Band Color', type: 'text', unit: '' }
        ]
      },
      {
        id: 'ex-curls',
        name: 'Dumbbell Curls',
        imageUrl: 'https://www.inspireusafoundation.org/wp-content/uploads/2022/02/standing-dumbbell-curl.gif',
        videoUrl: '',
        trackingFields: [
          { id: 'reps', name: 'Reps', type: 'number', unit: '' },
          { id: 'weight', name: 'Weight', type: 'number', unit: 'lbs' }
        ]
      },
      {
        id: 'ex-lunges',
        name: 'Lunges',
        imageUrl: 'https://www.inspireusafoundation.org/wp-content/uploads/2021/10/bodyweight-lunge.gif',
        videoUrl: '',
        trackingFields: [{ id: 'reps', name: 'Reps per leg', type: 'number', unit: '' }]
      },
      {
        id: 'ex-burpees',
        name: 'Burpees',
        imageUrl: 'https://www.inspireusafoundation.org/wp-content/uploads/2022/01/burpee.gif',
        videoUrl: '',
        trackingFields: [{ id: 'reps', name: 'Reps', type: 'number', unit: '' }]
      }
    ];
  }



  setupEventHandlers() {
    document.getElementById('sync-btn').addEventListener('click', () => this.sync());
    document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
    
    // Tab switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeTab = e.target.dataset.tab;
        this.render();
      });
    });
    
    // Add exercise button
    document.getElementById('add-exercise-btn').addEventListener('click', () => this.showAddExercise());
    
    // Add routine button
    document.getElementById('add-routine-btn').addEventListener('click', () => this.showAddRoutine());
    
    // History view toggle
    document.getElementById('history-list-btn').addEventListener('click', () => {
      this.historyView = 'list';
      this.render();
    });
    document.getElementById('history-calendar-btn').addEventListener('click', () => {
      this.historyView = 'calendar';
      this.render();
    });
  }



  render() {
    this.renderTabs();
    
    if (this.activeTab === 'library') {
      this.renderLibrary();
    } else if (this.activeTab === 'routines') {
      this.renderRoutines();
    } else if (this.activeTab === 'workouts') {
      this.renderWorkouts();
    }
  }


  generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  // ============================================================
  // RENDER TABS
  // ============================================================

  renderTabs() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      if (btn.dataset.tab === this.activeTab) {
        btn.classList.add('border-red-500', 'text-red-600');
        btn.classList.remove('border-transparent', 'text-gray-500');
      } else {
        btn.classList.remove('border-red-500', 'text-red-600');
        btn.classList.add('border-transparent', 'text-gray-500');
      }
    });
    
    document.querySelectorAll('[data-tab-content]').forEach(content => {
      content.style.display = content.dataset.tabContent === this.activeTab ? 'block' : 'none';
    });
  }

  // ============================================================
  // LIBRARY RENDERING
  // ============================================================

  renderLibrary() {
    const container = document.getElementById('exercises-list');
    if (!container) return;
    
    if (this.exercises.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-500">
          <p>No exercises yet</p>
          <p class="text-sm">Click + to add your first exercise</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.exercises.map(ex => `
      <div class="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
        <div class="flex gap-4">
          ${ex.imageUrl ? `
            <img src="${ex.imageUrl}" alt="${this.escapeHtml(ex.name)}" 
              class="exercise-image w-24 h-24 object-cover rounded">
          ` : `
            <div class="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-gray-400">
              No Image
            </div>
          `}
          <div class="flex-1">
            <h3 class="font-semibold text-lg">${this.escapeHtml(ex.name)}</h3>
            <div class="text-sm text-gray-600 mt-1">
              Tracks: ${ex.trackingFields.map(f => f.name + (f.unit ? ` (${f.unit})` : '')).join(', ')}
            </div>
            ${ex.videoUrl ? `
              <a href="${this.escapeHtml(ex.videoUrl)}" target="_blank" 
                class="text-sm text-blue-600 hover:underline mt-1 inline-block">
                📹 Video
              </a>
            ` : ''}
          </div>
          <div class="flex flex-col gap-2">
            <button onclick="app.editExercise('${ex.id}')" 
              class="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
              Edit
            </button>
            <button onclick="app.viewExerciseProgress('${ex.id}')" 
              class="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded">
              Progress
            </button>
            <button onclick="app.deleteExercise('${ex.id}')" 
              class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ============================================================
  // ROUTINES RENDERING
  // ============================================================

  renderRoutines() {
    const container = document.getElementById('routines-list');
    if (!container) return;
    
    if (this.routines.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-500">
          <p>No routines yet</p>
          <p class="text-sm">Click + to create your first routine</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.routines.map(routine => {
      const exerciseCount = routine.exercises.length;
      return `
        <div class="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="font-semibold text-lg">${this.escapeHtml(routine.name)}</h3>
              <p class="text-sm text-gray-600 mt-1">${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}</p>
              <div class="mt-2 space-y-1">
                ${routine.exercises.map((ex, idx) => `
                  <div class="text-sm text-gray-500">
                    ${idx + 1}. ${this.escapeHtml(ex.exerciseName)}
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <button onclick="app.startWorkout('${routine.id}')" 
                class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                Start
              </button>
              <button onclick="app.editRoutine('${routine.id}')" 
                class="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                Edit
              </button>
              <button onclick="app.deleteRoutine('${routine.id}')" 
                class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
                Delete
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ============================================================
  // WORKOUTS RENDERING
  // ============================================================

  renderWorkouts() {
    // Sub-tabs for history views
    const listBtn = document.getElementById('history-list-btn');
    const calBtn = document.getElementById('history-calendar-btn');
    const listView = document.getElementById('workouts-list-view');
    const calView = document.getElementById('workouts-calendar-view');
    
    if (this.historyView === 'list') {
      listBtn.classList.add('bg-red-100', 'text-red-700');
      listBtn.classList.remove('text-gray-600', 'bg-gray-100');
      calBtn.classList.remove('bg-red-100', 'text-red-700');
      calBtn.classList.add('text-gray-600', 'bg-gray-100');
      
      if (listView) listView.classList.remove('hidden');
      if (calView) calView.classList.add('hidden');
      
      this.renderWorkoutsList();
    } else {
      calBtn.classList.add('bg-red-100', 'text-red-700');
      calBtn.classList.remove('text-gray-600', 'bg-gray-100');
      listBtn.classList.remove('bg-red-100', 'text-red-700');
      listBtn.classList.add('text-gray-600', 'bg-gray-100');
      
      if (listView) listView.classList.add('hidden');
      if (calView) calView.classList.remove('hidden');
      
      this.renderWorkoutsCalendar();
    }
  }

  renderWorkoutsList() {
    const container = document.getElementById('workouts-list');
    if (!container) return;
    
    if (this.workouts.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-500">
          <p>No workouts logged yet</p>
          <p class="text-sm">Go to Routines tab and start a workout</p>
        </div>
      `;
      return;
    }
    
    const sorted = [...this.workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sorted.map(workout => {
      const date = new Date(workout.date);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return `
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold">${this.escapeHtml(workout.routineName)}</h3>
              <p class="text-sm text-gray-500">${dateStr} at ${timeStr}</p>
              <p class="text-sm text-gray-600 mt-1">${workout.exercises.length} exercises completed</p>
            </div>
            <button onclick="app.viewWorkoutDetails('${workout.id}')" 
              class="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
              View
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderWorkoutsCalendar() {
    const container = document.getElementById('workouts-calendar');
    if (!container) return;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    
    const workoutDates = new Set(
      this.workouts.map(w => new Date(w.date).toISOString().split('T')[0])
    );
    
    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    let calendarHTML = `
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-semibold text-center mb-4">${monthName}</h3>
        <div class="grid grid-cols-7 gap-1 text-center">
          <div class="text-xs font-medium text-gray-500">Sun</div>
          <div class="text-xs font-medium text-gray-500">Mon</div>
          <div class="text-xs font-medium text-gray-500">Tue</div>
          <div class="text-xs font-medium text-gray-500">Wed</div>
          <div class="text-xs font-medium text-gray-500">Thu</div>
          <div class="text-xs font-medium text-gray-500">Fri</div>
          <div class="text-xs font-medium text-gray-500">Sat</div>
    `;
    
    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
      calendarHTML += '<div class="p-2"></div>';
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasWorkout = workoutDates.has(dateStr);
      const isToday = day === now.getDate() && month === now.getMonth();
      
      let classes = 'p-2 rounded';
      if (isToday) classes += ' border-2 border-red-500';
      if (hasWorkout) classes += ' bg-green-100 font-semibold';
      
      calendarHTML += `<div class="${classes}">${day}</div>`;
    }
    
    calendarHTML += `
        </div>
      </div>
    `;
    
    container.innerHTML = calendarHTML;
  }

  // ============================================================
  // EXERCISE CRUD
  // ============================================================

  showAddExercise() {
    modal.show({
      title: '➕ Add Exercise',
      content: `
        <form id="add-exercise-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Exercise Name *</label>
            <input type="text" name="name" required class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Image URL</label>
            <input type="url" name="imageUrl" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Video URL</label>
            <input type="url" name="videoUrl" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Tracking Fields</label>
            <div id="tracking-fields-container" class="space-y-2">
              <div class="tracking-field flex gap-2">
                <input type="text" placeholder="Field name" class="flex-1 px-3 py-2 border rounded" data-field-name>
                <select class="px-3 py-2 border rounded" data-field-type>
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                </select>
                <input type="text" placeholder="Unit (optional)" class="w-24 px-3 py-2 border rounded" data-field-unit>
              </div>
            </div>
            <button type="button" onclick="app.addTrackingField()" 
              class="mt-2 text-sm text-blue-600 hover:underline">
              + Add Field
            </button>
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Add Exercise',
          primary: true,
          onClick: () => {
            const form = document.getElementById('add-exercise-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }
            this.saveExercise(form);
            modal.close();
          }
        }
      ]
    });
  }

  addTrackingField() {
    const container = document.getElementById('tracking-fields-container');
    const fieldHTML = `
      <div class="tracking-field flex gap-2">
        <input type="text" placeholder="Field name" class="flex-1 px-3 py-2 border rounded" data-field-name>
        <select class="px-3 py-2 border rounded" data-field-type>
          <option value="number">Number</option>
          <option value="text">Text</option>
        </select>
        <input type="text" placeholder="Unit (optional)" class="w-24 px-3 py-2 border rounded" data-field-unit>
        <button type="button" onclick="this.parentElement.remove()" class="px-2 text-red-600">×</button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', fieldHTML);
  }

  saveExercise(form, exerciseId = null) {
    const formData = new FormData(form);
    
    const trackingFields = [];
    document.querySelectorAll('.tracking-field').forEach((field, idx) => {
      const name = field.querySelector('[data-field-name]').value.trim();
      if (name) {
        trackingFields.push({
          id: 'field-' + idx,
          name: name,
          type: field.querySelector('[data-field-type]').value,
          unit: field.querySelector('[data-field-unit]').value.trim()
        });
      }
    });
    
    if (trackingFields.length === 0) {
      this._showToast('Add at least one tracking field', 'error');
      return;
    }
    
    if (exerciseId) {
      const exercise = this.exercises.find(ex => ex.id === exerciseId);
      if (exercise) {
        exercise.name = formData.get('name').trim();
        exercise.imageUrl = formData.get('imageUrl').trim();
        exercise.videoUrl = formData.get('videoUrl').trim();
        exercise.trackingFields = trackingFields;
      }
      this._showToast('Exercise updated!', 'success');
    } else {
      const exercise = {
        id: this.generateId(),
        name: formData.get('name').trim(),
        imageUrl: formData.get('imageUrl').trim(),
        videoUrl: formData.get('videoUrl').trim(),
        trackingFields: trackingFields
      };
      this.exercises.push(exercise);
      this._showToast('Exercise added!', 'success');
    }
    
    this.render();
    this.saveData();
  }

  editExercise(id) {
    const exercise = this.exercises.find(ex => ex.id === id);
    if (!exercise) return;
    
    const fieldsHTML = exercise.trackingFields.map((field, idx) => `
      <div class="tracking-field flex gap-2">
        <input type="text" placeholder="Field name" value="${this.escapeHtml(field.name)}" 
          class="flex-1 px-3 py-2 border rounded" data-field-name>
        <select class="px-3 py-2 border rounded" data-field-type>
          <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
          <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
        </select>
        <input type="text" placeholder="Unit (optional)" value="${this.escapeHtml(field.unit || '')}"
          class="w-24 px-3 py-2 border rounded" data-field-unit>
        ${idx > 0 ? '<button type="button" onclick="this.parentElement.remove()" class="px-2 text-red-600">×</button>' : ''}
      </div>
    `).join('');
    
    modal.show({
      title: '✏️ Edit Exercise',
      content: `
        <form id="edit-exercise-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Exercise Name *</label>
            <input type="text" name="name" required value="${this.escapeHtml(exercise.name)}"
              class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Image URL</label>
            <input type="url" name="imageUrl" value="${this.escapeHtml(exercise.imageUrl || '')}"
              class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Video URL</label>
            <input type="url" name="videoUrl" value="${this.escapeHtml(exercise.videoUrl || '')}"
              class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Tracking Fields</label>
            <div id="tracking-fields-container" class="space-y-2">
              ${fieldsHTML}
            </div>
            <button type="button" onclick="app.addTrackingField()" 
              class="mt-2 text-sm text-blue-600 hover:underline">
              + Add Field
            </button>
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Save',
          primary: true,
          onClick: () => {
            const form = document.getElementById('edit-exercise-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }
            this.saveExercise(form, id);
            modal.close();
          }
        }
      ]
    });
  }

  deleteExercise(id) {
    const exercise = this.exercises.find(ex => ex.id === id);
    if (!exercise) return;
    
    if (!confirm(`Delete "${exercise.name}"?`)) return;
    
    this.exercises = this.exercises.filter(ex => ex.id !== id);
    this.render();
    this.saveData();
    this._showToast('Exercise deleted', 'success');
  }

  viewExerciseProgress(id) {
    const exercise = this.exercises.find(ex => ex.id === id);
    if (!exercise) return;
    
    // Get all workouts containing this exercise
    const exerciseWorkouts = this.workouts
      .filter(w => w.exercises.some(ex => ex.exerciseId === id))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (exerciseWorkouts.length === 0) {
      this._showToast('No workout data for this exercise yet', 'info');
      return;
    }
    
    // Build datasets for each tracking field (only number fields)
    const datasets = exercise.trackingFields
      .filter(field => field.type === 'number')  // Only show number fields
      .map((field, idx) => {
        const data = exerciseWorkouts.map(workout => {
          const exerciseData = workout.exercises.find(ex => ex.exerciseId === id);
          const value = exerciseData?.values.find(v => v.fieldId === field.id);
          return {
            x: new Date(workout.date),
            y: value ? (parseFloat(value.value) || 0) : 0
          };
        });
        
        const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
        const color = colors[idx % colors.length];
        
        return {
          label: field.name + (field.unit ? ` (${field.unit})` : ''),
          data: data,
          borderColor: color,
          backgroundColor: color + '20',
          tension: 0.1
        };
      });
    
    if (datasets.length === 0) {
      this._showToast('No numeric tracking fields to chart', 'info');
      return;
    }
    
    modal.show({
      title: `📊 Progress: ${exercise.name}`,
      content: `
        <div>
          <canvas id="progress-chart" style="max-height: 300px;"></canvas>
        </div>
      `,
      buttons: [
        { text: 'Close', primary: true, onClick: () => modal.close() }
      ]
    });
    
    // Render chart after modal is visible
    setTimeout(() => {
      const ctx = document.getElementById('progress-chart');
      if (ctx) {
        new Chart(ctx, {
          type: 'line',
          data: { datasets: datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                type: 'time',
                time: {
                  unit: 'day',
                  displayFormats: {
                    day: 'MMM d'
                  }
                },
                title: {
                  display: true,
                  text: 'Date'
                }
              },
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Value'
                }
              }
            }
          }
        });
      }
    }, 100);
  }

  // ============================================================
  // ROUTINE CRUD
  // ============================================================

  showAddRoutine() {
    modal.show({
      title: '➕ Create Routine',
      content: `
        <form id="add-routine-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Routine Name *</label>
            <input type="text" name="name" required class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Exercises</label>
            <div id="routine-exercises-container" class="space-y-2 max-h-60 overflow-y-auto">
              ${this.exercises.length === 0 ? '<p class="text-sm text-gray-500">No exercises available. Add exercises first.</p>' : ''}
            </div>
            ${this.exercises.length > 0 ? `
              <select id="exercise-select" class="w-full px-3 py-2 border rounded mt-2">
                <option value="">Select exercise to add...</option>
                ${this.exercises.map(ex => `<option value="${ex.id}">${this.escapeHtml(ex.name)}</option>`).join('')}
              </select>
              <button type="button" onclick="app.addExerciseToRoutine()" 
                class="mt-2 text-sm text-blue-600 hover:underline">
                + Add to Routine
              </button>
            ` : ''}
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Create Routine',
          primary: true,
          onClick: () => {
            const form = document.getElementById('add-routine-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }
            this.saveRoutine(form);
            modal.close();
          }
        }
      ]
    });
  }

  addExerciseToRoutine() {
    const select = document.getElementById('exercise-select');
    const exerciseId = select.value;
    if (!exerciseId) return;
    
    const exercise = this.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;
    
    const container = document.getElementById('routine-exercises-container');
    const instanceId = exerciseId + '-' + Date.now();
    
    // Build target inputs for each tracking field
    const targetInputs = exercise.trackingFields.map(field => {
      const inputType = field.type === 'number' ? 'number' : 'text';
      const step = field.type === 'number' ? 'step="any"' : '';
      return `
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-600 w-20">${this.escapeHtml(field.name)}${field.unit ? ` (${field.unit})` : ''}:</label>
          <input type="${inputType}" ${step} 
            class="flex-1 px-2 py-1 text-sm border rounded" 
            placeholder="Target"
            data-field-id="${field.id}" 
            data-instance-id="${instanceId}">
        </div>
      `;
    }).join('');
    
    const exerciseHTML = `
      <div class="routine-exercise p-3 bg-gray-50 rounded border border-gray-200" data-exercise-id="${exerciseId}" data-instance-id="${instanceId}">
        <div class="flex items-start gap-2 mb-2">
          <span class="flex-1 font-medium">${this.escapeHtml(exercise.name)}</span>
          <button type="button" onclick="this.closest('.routine-exercise').remove()" class="px-2 py-0.5 text-red-600 hover:bg-red-50 rounded">×</button>
        </div>
        <div class="space-y-1 pl-2">
          ${targetInputs}
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', exerciseHTML);
    select.value = '';
  }

  saveRoutine(form, routineId = null) {
    const formData = new FormData(form);
    const name = formData.get('name').trim();
    
    const exercises = [];
    document.querySelectorAll('.routine-exercise').forEach(elem => {
      const exerciseId = elem.dataset.exerciseId;
      const instanceId = elem.dataset.instanceId;
      const exercise = this.exercises.find(ex => ex.id === exerciseId);
      
      if (exercise) {
        // Collect target values for each tracking field
        const targets = {};
        elem.querySelectorAll('[data-field-id]').forEach(input => {
          const fieldId = input.dataset.fieldId;
          const value = input.value.trim();
          if (value) {
            targets[fieldId] = value;
          }
        });
        
        exercises.push({
          exerciseId: exerciseId,
          exerciseName: exercise.name,
          instanceId: instanceId,
          targets: targets  // Store target values
        });
      }
    });
    
    if (exercises.length === 0) {
      this._showToast('Add at least one exercise', 'error');
      return;
    }
    
    if (routineId) {
      const routine = this.routines.find(r => r.id === routineId);
      if (routine) {
        routine.name = name;
        routine.exercises = exercises;
      }
      this._showToast('Routine updated!', 'success');
    } else {
      const routine = {
        id: this.generateId(),
        name: name,
        exercises: exercises
      };
      this.routines.push(routine);
      this._showToast('Routine created!', 'success');
    }
    
    this.render();
    this.saveData();
  }

  editRoutine(id) {
    const routine = this.routines.find(r => r.id === id);
    if (!routine) return;
    
    const exercisesHTML = routine.exercises.map(ex => {
      const exercise = this.exercises.find(e => e.id === ex.exerciseId);
      if (!exercise) return '';
      
      const targetInputs = exercise.trackingFields.map(field => {
        const inputType = field.type === 'number' ? 'number' : 'text';
        const step = field.type === 'number' ? 'step="any"' : '';
        const value = ex.targets && ex.targets[field.id] ? ex.targets[field.id] : '';
        return `
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 w-20">${this.escapeHtml(field.name)}${field.unit ? ` (${field.unit})` : ''}:</label>
            <input type="${inputType}" ${step} 
              class="flex-1 px-2 py-1 text-sm border rounded" 
              placeholder="Target"
              value="${this.escapeHtml(value)}"
              data-field-id="${field.id}" 
              data-instance-id="${ex.instanceId}">
          </div>
        `;
      }).join('');
      
      return `
        <div class="routine-exercise p-3 bg-gray-50 rounded border border-gray-200" data-exercise-id="${ex.exerciseId}" data-instance-id="${ex.instanceId}">
          <div class="flex items-start gap-2 mb-2">
            <span class="flex-1 font-medium">${this.escapeHtml(ex.exerciseName)}</span>
            <button type="button" onclick="this.closest('.routine-exercise').remove()" class="px-2 py-0.5 text-red-600 hover:bg-red-50 rounded">×</button>
          </div>
          <div class="space-y-1 pl-2">
            ${targetInputs}
          </div>
        </div>
      `;
    }).join('');
    
    modal.show({
      title: '✏️ Edit Routine',
      content: `
        <form id="edit-routine-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Routine Name *</label>
            <input type="text" name="name" required value="${this.escapeHtml(routine.name)}"
              class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Exercises</label>
            <div id="routine-exercises-container" class="space-y-2 max-h-60 overflow-y-auto">
              ${exercisesHTML}
            </div>
            <select id="exercise-select" class="w-full px-3 py-2 border rounded mt-2">
              <option value="">Select exercise to add...</option>
              ${this.exercises.map(ex => `<option value="${ex.id}">${this.escapeHtml(ex.name)}</option>`).join('')}
            </select>
            <button type="button" onclick="app.addExerciseToRoutine()" 
              class="mt-2 text-sm text-blue-600 hover:underline">
              + Add to Routine
            </button>
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Save',
          primary: true,
          onClick: () => {
            const form = document.getElementById('edit-routine-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }
            this.saveRoutine(form, id);
            modal.close();
          }
        }
      ]
    });
  }

  deleteRoutine(id) {
    const routine = this.routines.find(r => r.id === id);
    if (!routine) return;
    
    if (!confirm(`Delete routine "${routine.name}"?`)) return;
    
    this.routines = this.routines.filter(r => r.id !== id);
    this.render();
    this.saveData();
    this._showToast('Routine deleted', 'success');
  }

  // ============================================================
  // WORKOUT TRACKING
  // ============================================================

  startWorkout(routineId) {
    const routine = this.routines.find(r => r.id === routineId);
    if (!routine) return;
    
    this.activeWorkout = {
      routineId: routine.id,
      routineName: routine.name,
      exercises: routine.exercises.map(ex => {
        const exercise = this.exercises.find(e => e.id === ex.exerciseId);
        return {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          instanceId: ex.instanceId,
          trackingFields: exercise ? exercise.trackingFields : [],
          targets: ex.targets || {},  // Include targets from routine
          values: []
        };
      })
    };
    
    this.renderActiveWorkout();
  }

  renderActiveWorkout() {
    if (!this.activeWorkout) return;
    
    const exercisesHTML = this.activeWorkout.exercises.map((ex, idx) => {
      const exercise = this.exercises.find(e => e.id === ex.exerciseId);
      const prevWorkout = this.getPreviousWorkoutData(ex.exerciseId);
      
      const fieldsHTML = ex.trackingFields.map(field => {
        const prevValue = prevWorkout?.values.find(v => v.fieldId === field.id);
        const prevText = prevValue ? `Last: ${prevValue.value}${field.unit ? ' ' + field.unit : ''}` : 'No previous data';
        const targetValue = ex.targets[field.id] || '';
        const targetText = targetValue ? `Target: ${targetValue}${field.unit ? ' ' + field.unit : ''}` : '';
        
        return `
          <div class="mb-2">
            <label class="block text-sm font-medium mb-1">${field.name}${field.unit ? ` (${field.unit})` : ''}</label>
            ${field.type === 'number' ? 
              `<input type="number" step="any" placeholder="${targetValue ? targetValue : ''}" class="w-full px-3 py-2 border rounded" data-field-id="${field.id}" data-exercise-instance="${ex.instanceId}">` :
              `<input type="text" placeholder="${targetValue ? targetValue : ''}" class="w-full px-3 py-2 border rounded" data-field-id="${field.id}" data-exercise-instance="${ex.instanceId}">`
            }
            <div class="flex justify-between text-xs mt-1">
              <span class="text-gray-400">${prevText}</span>
              ${targetText ? `<span class="text-blue-500">${targetText}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');
      
      return `
        <div class="bg-gray-50 p-4 rounded mb-3">
          <div class="flex gap-3 mb-3">
            ${exercise && exercise.imageUrl ? `
              <img src="${exercise.imageUrl}" alt="${this.escapeHtml(ex.exerciseName)}" 
                class="exercise-image w-20 h-20 object-cover rounded flex-shrink-0">
            ` : `
              <div class="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-400 flex-shrink-0 text-xs">
                No Image
              </div>
            `}
            <div class="flex-1">
              <h4 class="font-semibold mb-1">${idx + 1}. ${this.escapeHtml(ex.exerciseName)}</h4>
              ${exercise && exercise.videoUrl ? `
                <a href="${this.escapeHtml(exercise.videoUrl)}" target="_blank" 
                  class="text-sm text-blue-600 hover:underline inline-block">
                  📹 Video Demo
                </a>
              ` : ''}
            </div>
          </div>
          ${fieldsHTML}
        </div>
      `;
    }).join('');
    
    modal.show({
      title: `🏋️ ${this.activeWorkout.routineName}`,
      content: `
        <div class="max-h-96 overflow-y-auto">
          ${exercisesHTML}
        </div>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => { this.activeWorkout = null; modal.close(); } },
        {
          text: 'Complete Workout',
          primary: true,
          onClick: () => this.completeWorkout()
        }
      ]
    });
  }

  getPreviousWorkoutData(exerciseId) {
    // Find most recent workout containing this exercise
    const sorted = [...this.workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const workout of sorted) {
      const exerciseData = workout.exercises.find(ex => ex.exerciseId === exerciseId);
      if (exerciseData) return exerciseData;
    }
    return null;
  }

  completeWorkout() {
    const exercises = this.activeWorkout.exercises.map(ex => {
      const values = [];
      ex.trackingFields.forEach(field => {
        const input = document.querySelector(`[data-field-id="${field.id}"][data-exercise-instance="${ex.instanceId}"]`);
        if (input && input.value.trim()) {
          values.push({
            fieldId: field.id,
            value: input.value.trim()
          });
        }
      });
      
      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        instanceId: ex.instanceId,
        values: values
      };
    });
    
    const workout = {
      id: this.generateId(),
      routineId: this.activeWorkout.routineId,
      routineName: this.activeWorkout.routineName,
      date: new Date().toISOString(),
      exercises: exercises
    };
    
    this.workouts.push(workout);
    this.activeWorkout = null;
    
    modal.close();
    this.activeTab = 'workouts';
    this.render();
    this.saveData();
    this._showToast('Workout completed! 💪', 'success');
  }

  viewWorkoutDetails(id) {
    const workout = this.workouts.find(w => w.id === id);
    if (!workout) return;
    
    const date = new Date(workout.date);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const exercisesHTML = workout.exercises.map((ex, idx) => {
      const valuesHTML = ex.values.map(v => {
        const exercise = this.exercises.find(e => e.id === ex.exerciseId);
        const field = exercise?.trackingFields.find(f => f.id === v.fieldId);
        const label = field ? field.name : v.fieldId;
        const unit = field?.unit || '';
        return `<div class="text-sm">${label}: ${v.value}${unit ? ' ' + unit : ''}</div>`;
      }).join('');
      
      return `
        <div class="mb-3 pb-3 border-b last:border-b-0">
          <div class="font-medium">${idx + 1}. ${this.escapeHtml(ex.exerciseName)}</div>
          <div class="mt-1 text-gray-600">
            ${valuesHTML || '<div class="text-sm text-gray-400">No data recorded</div>'}
          </div>
        </div>
      `;
    }).join('');
    
    modal.show({
      title: `Workout Details`,
      content: `
        <div class="mb-4">
          <h3 class="font-semibold text-lg">${this.escapeHtml(workout.routineName)}</h3>
          <p class="text-sm text-gray-500">${dateStr} at ${timeStr}</p>
        </div>
        <div>
          ${exercisesHTML}
        </div>
      `,
      buttons: [
        { text: 'Close', primary: true, onClick: () => modal.close() }
      ]
    });
  }
}


// Initialize app
let app;
document.addEventListener('DOMContentLoaded', async () => {
  app = await new WorkoutTrackerApp().init();
});
