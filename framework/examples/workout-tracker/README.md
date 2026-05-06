# Workout Tracker App

A Progressive Web App (PWA) for tracking workout routines, exercises, and progress.

## Features

### Exercise Library
- Pre-loaded with 8 example exercises (Push-ups, Pull-ups, Squats, Plank, Resistance Band Rows, Dumbbell Curls, Lunges, Burpees)
- Add custom exercises with:
  - Name
  - Image URL (cached for offline use)
  - Video URL (online only, e.g., YouTube links)
  - Custom tracking fields (reps, weight, duration, band color, etc.)
- Edit and delete exercises
- View progress charts per exercise

### Routines
- Create workout routines by selecting exercises from library
- Add same exercise multiple times in a routine (with unique instances)
- Edit and delete routines
- Quick "Start Workout" button

### Workout Tracking
- Start a routine and log exercise data
- Shows previous workout data in gray text for reference
- Flexible tracking - supports whatever units/fields you defined in exercises
- List view - see all completed workouts sorted by date
- Calendar view - visual calendar showing workout dates

### Progress Charts
- Per-exercise progress charts using Chart.js
- Tracks all custom fields over time
- Multiple datasets on same chart

### Offline Support
- Works completely offline after first load
- Service worker caches:
  - Tailwind CSS CDN
  - Chart.js CDN
  - Exercise images (cache-first strategy)
- LocalStorage for data persistence
- Optional GitHub sync for backup/multi-device sync

## Files

- `index.html` (265 lines) - Main HTML structure with 3-tab navigation
- `app.js` (1073 lines) - Complete application logic extending App base class
- `manifest.json` (21 lines) - PWA manifest
- `sw.js` (48 lines) - Service worker for offline support
- `icon-192.png`, `icon-512.png` - App icons

## Usage

1. **Start a local server:**
   ```bash
   python3 -m http.server 8080
   ```

2. **Open in browser:**
   Navigate to `http://localhost:8080`

3. **Optional GitHub Sync:**
   - Click Settings
   - Enter GitHub token (with `repo` scope), username, and repo name
   - Data syncs automatically

## Architecture

- Extends `App` base class from `../../core/App.js`
- State management via localStorage
- GitHub sync for multi-device support
- Service worker for offline-first experience
- Chart.js for progress visualization
- Tailwind CSS for styling

## Data Models

**Exercise:**
```javascript
{
  id: string,
  name: string,
  imageUrl: string,
  videoUrl: string,
  trackingFields: [
    { id: string, name: string, type: 'number'|'text', unit: string }
  ]
}
```

**Routine:**
```javascript
{
  id: string,
  name: string,
  exercises: [
    { exerciseId: string, exerciseName: string, instanceId: string }
  ]
}
```

**Workout:**
```javascript
{
  id: string,
  routineId: string,
  routineName: string,
  date: ISO string,
  exercises: [
    {
      exerciseId: string,
      exerciseName: string,
      instanceId: string,
      values: [{ fieldId: string, value: string }]
    }
  ]
}
```

## Created: May 6, 2026
