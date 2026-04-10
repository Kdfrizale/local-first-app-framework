# Local-First Framework

A minimal, dependency-free framework for building local-first web applications with GitHub sync.

**Goals:**
- 20+ year maintainability (no npm, no build tools)
- Works offline, syncs when online
- User owns their data (stored in their GitHub repo)
- AI-agent friendly (consistent patterns, clear structure)

## 🚀 Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source: main branch**
3. Access at `https://username.github.io/repo-name/`

Apps available:
- `/examples/reading-log/` - Book tracking with ISBN lookup
- `/examples/goal-tracker/` - Goals with lag/lead measures  
- `/examples/meal-planner/` - Weekly meal planning

## Quick Start

1. Copy `templates/` to `examples/your-app/`
2. Rename `MyApp` class and update config in `app.js`
3. Implement `onDataLoaded()` and `getData()`
4. Open `index.html` in a browser

## Architecture

```
framework/
├── core/                    # Core modules
│   ├── App.js               # Base app class (extend this!)
│   ├── Storage.js           # IndexedDB with localStorage fallback
│   ├── GitHubSync.js        # GitHub API wrapper
│   ├── SyncController.js    # Sync orchestration
│   ├── State.js             # Reactive state management
│   └── ui/                  # UI components
│       ├── Toast.js         # Toast notifications
│       ├── Modal.js         # Modal dialogs
│       ├── Form.js          # Form helpers
│       └── List.js          # List rendering helpers
├── styles/
│   └── core.css             # Shared styles (toast, modal, etc.)
├── examples/
│   ├── reference-app/       # Full-featured example
│   ├── reading-log/         # Book tracking app
│   ├── goal-tracker/        # Goals with lead/lag measures
│   └── meal-planner/        # Weekly meal planning
├── templates/               # Starter template
└── tests/
    └── test-harness.html    # Browser-native tests
```

## Creating a New App

### 1. Extend the App Class

```javascript
class MyApp extends App {
  constructor() {
    super({
      appName: 'my-app',                    // Unique identifier
      dataPath: 'apps/my-app/data.json',    // Path in GitHub repo
      initialState: {
        items: []                            // Your app's initial state
      }
    });
  }

  // Called after initialization
  async onInit() {
    this.state.subscribe('items', () => this.render());
    this.setupEventHandlers();
  }

  // Called when data loads (local or remote)
  onDataLoaded(data, source) {
    this.state.set('items', data.items || []);
    this.render();
  }

  // Returns data to be saved
  getData() {
    return { items: this.state.get('items') };
  }
}
```

### 2. Initialize

```javascript
let app;
document.addEventListener('DOMContentLoaded', async () => {
  app = new MyApp();
  await app.init();
});
```

### 3. Save Data

```javascript
// Modify state
this.state.set('items', [...items, newItem]);

// Save and trigger sync
await this.saveData();
```

## Core API

### App (Base Class)

| Method | Description |
|--------|-------------|
| `init()` | Initialize app, load data, setup sync |
| `saveData()` | Save to local storage and sync |
| `sync()` | Manually trigger sync |
| `showSetupScreen()` | Show GitHub configuration UI |
| `showSettings()` | Show settings modal |

**Override these:**
- `onInit()` - Setup subscriptions and handlers
- `onDataLoaded(data, source)` - Handle loaded data
- `getData()` - Return data to save
- `onSyncComplete(results)` - Handle sync completion (optional)
- `onSyncError(error)` - Handle sync errors (optional)

### State

```javascript
// Get/set values
this.state.get('items')
this.state.set('items', [...])
this.state.set({ a: 1, b: 2 })

// Subscribe to changes
const unsubscribe = this.state.subscribe('items', (newValue) => {
  this.render();
});

// Update nested objects
this.state.update('config', { theme: 'dark' });
```

### Storage

```javascript
// Data operations
await storage.save('key', data, { synced: false, githubPath: 'path/to/file.json' });
await storage.load('key');
await storage.delete('key');

// Settings (localStorage, not synced)
storage.saveSetting('theme', 'dark');
storage.loadSetting('theme', 'light');

// Shared settings (shared across all apps)
storage.saveSharedSetting('githubToken', 'ghp_...');
storage.loadSharedSetting('githubToken');
```

### Toast

```javascript
toast.success('Saved!');
toast.error('Something went wrong');
toast.warning('Are you sure?');
toast.info('Syncing...');
```

### Modal

```javascript
// Custom modal
modal.show({
  title: 'My Modal',
  content: '<p>HTML content here</p>',
  buttons: [
    { text: 'Cancel', onClick: () => modal.close() },
    { text: 'Save', primary: true, onClick: () => { /* ... */ modal.close(); }}
  ]
});

// Confirm dialog
const confirmed = await modal.confirm('Delete this item?', 'Confirm');

// Alert
await modal.alert('Done!', 'Success');

// Prompt
const value = await modal.prompt('Enter name:', 'default');
```

### FormHelper

```javascript
// Get form data as object
const data = FormHelper.getData('#my-form');

// Set form values
FormHelper.setData('#my-form', { name: 'John', email: 'john@example.com' });

// Validate
const { valid, errors } = FormHelper.validate('#my-form');

// Reset
FormHelper.reset('#my-form');
```

## Sync Behavior

1. **On app open**: Loads local data first (instant), then fetches remote and merges
2. **On save**: Saves locally, then syncs to GitHub
3. **Conflict resolution**: Shows modal asking user to choose local, remote, or merge
4. **Offline**: Works fully offline, syncs when connection restored

## Testing

Open `tests/test-harness.html` in a browser. Click "Run All Tests".

To add tests:

```javascript
describe('MyFeature', () => {
  beforeEach(() => { /* setup */ });
  afterEach(() => { /* cleanup */ });

  it('does something', () => {
    expect.equal(actual, expected);
    expect.true(value);
    expect.deepEqual(obj1, obj2);
  });

  it('handles async', async () => {
    const result = await asyncFunction();
    expect.equal(result, expected);
  });
});
```

## File Structure for Apps

```
examples/my-app/
├── index.html      # HTML with script includes
├── app.js          # Your App class
├── manifest.json   # PWA manifest
└── sw.js           # Service worker for offline
```

## Design Principles

1. **No build step** - Just HTML, CSS, JS files
2. **No dependencies** - Everything is vanilla JS
3. **Offline-first** - App works without internet
4. **User data ownership** - Data stored in user's GitHub repo
5. **Minimal boilerplate** - App class handles common patterns
6. **Clear patterns** - AI agents can understand and extend

## Browser Support

Modern browsers with:
- ES6+ JavaScript
- IndexedDB
- Fetch API
- Service Workers (for offline)

## License

MIT
