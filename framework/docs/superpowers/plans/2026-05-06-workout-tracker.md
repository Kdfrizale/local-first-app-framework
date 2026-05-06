# Workout Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA workout tracker with exercise library, routine management, workout logging with previous workout data display, and progress charts.

**Architecture:** Exercise-centric design with flexible tracking fields defined per exercise. Routines reference exercises by ID with instanceId for duplicate exercises. Workouts denormalize routine/exercise names. Service worker caches exercise images for offline use.

**Tech Stack:** Vanilla JS, App.js base class, Chart.js, localStorage + optional GitHub sync, service worker for offline images

---

### Task 1: Project Structure and Initial Files

**Files:**
- Create: `examples/workout-tracker/app.js`
- Create: `examples/workout-tracker/index.html`
- Create: `examples/workout-tracker/manifest.json`
- Create: `examples/workout-tracker/sw.js`
- Create: `examples/workout-tracker/icon-192.png` (placeholder)
- Create: `examples/workout-tracker/icon-512.png` (placeholder)

- [ ] **Step 1: Create app.js skeleton**

```javascript
import App from '../../core/App.js';

class WorkoutTrackerApp extends App {
    constructor() {
        super('workout-tracker');
        this.state = {
            exercises: [],      // Exercise library
            routines: [],       // Workout routines
            workouts: [],       // Completed workout logs
            activeTab: 'library', // 'library' | 'routines' | 'workouts'
            activeWorkout: null,  // Current workout in progress
            historyView: 'list'   // 'list' | 'calendar'
        };
    }

    render() {
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="workout-tracker">
                ${this.renderTabs()}
                ${this.renderTabContent()}
            </div>
        `;
        this.attachEventListeners();
    }

    renderTabs() {
        const tabs = ['library', 'routines', 'workouts'];
        return `
            <div class="tabs">
                ${tabs.map(tab => `
                    <button class="tab-btn ${this.state.activeTab === tab ? 'active' : ''}" 
                            data-tab="${tab}">
                        ${tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                `).join('')}
            </div>
        `;
    }

    renderTabContent() {
        switch (this.state.activeTab) {
            case 'library':
                return this.renderLibrary();
            case 'routines':
                return this.renderRoutines();
            case 'workouts':
                return this.renderWorkouts();
            default:
                return '';
        }
    }

    renderLibrary() {
        return '<div class="library"><p>Library tab (to be implemented)</p></div>';
    }

    renderRoutines() {
        return '<div class="routines"><p>Routines tab (to be implemented)</p></div>';
    }

    renderWorkouts() {
        return '<div class="workouts"><p>Workouts tab (to be implemented)</p></div>';
    }

    attachEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.state.activeTab = e.target.dataset.tab;
                this.render();
            });
        });
    }
}

const app = new WorkoutTrackerApp();
app.init();
