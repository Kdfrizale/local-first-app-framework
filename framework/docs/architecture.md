# Framework Architecture

This document explains how the Local-First Family Apps Framework is designed and how the components work together.

## Design Philosophy

### 1. Zero Dependencies
- No npm packages, no build tools, no package.json
- Pure HTML, CSS, and JavaScript
- External dependencies only via CDN (Tailwind CSS)
- Built to last 20+ years without maintenance

### 2. Local-First
- Data stored locally in IndexedDB
- Apps work completely offline
- Sync to GitHub when online
- User always has their data

### 3. Progressive Enhancement
- Works in basic browsers without advanced features
- Enhanced experience with Service Workers and PWA features
- Graceful degradation when features unavailable

### 4. Convention over Configuration
- Standard file structure
- Predictable naming
- Easy for AI agents to understand and replicate

## Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Your App (app.js)                    │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │         State Management (state.js)      │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │         UI Components                     │   │  │
│  │  │  • Toast  • Modal  • Form  • List        │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                        │
│  ┌──────────────▼───────────────────────────────────┐  │
│  │         Sync Controller                          │  │
│  │  • Online/offline detection                      │  │
│  │  • Automatic sync scheduling                     │  │
│  │  • Conflict resolution                           │  │
│  └──────────────┬───────────────┬───────────────────┘  │
│                 │                │                       │
│  ┌──────────────▼─────────┐  ┌──▼──────────────────┐  │
│  │   Local Storage        │  │  GitHub Sync        │  │
│  │   • IndexedDB          │  │  • REST API         │  │
│  │   • localStorage       │  │  • Authentication   │  │
│  │   • Settings           │  │  • File operations  │  │
│  └────────────────────────┘  └──┬──────────────────┘  │
│                                  │                      │
└──────────────────────────────────┼──────────────────────┘
                                   │
                                   │ HTTPS
                                   │
                        ┌──────────▼──────────┐
                        │   GitHub API        │
                        │   (api.github.com)  │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Your Repository    │
                        │  (family-data)      │
                        │  • apps/            │
                        │    • reading-log/   │
                        │    • goal-tracker/  │
                        └─────────────────────┘
```

## Core Modules

### 1. GitHub Sync Engine (`github-sync.js`)

**Purpose**: Interface with GitHub REST API

**Key Features**:
- Token-based authentication
- Read/write files to repository
- ETag-based caching (avoid unnecessary downloads)
- Rate limit awareness
- Conflict detection

**API**:
```javascript
const github = new GitHubSync({
  token: 'ghp_...',
  owner: 'username',
  repo: 'family-data',
  branch: 'main'
});

// Read file
const result = await github.readFile('apps/reading-log/data.json');
// Returns: { content, sha, etag }

// Write file
await github.writeFile(
  'apps/reading-log/data.json',
  data,
  currentSha,
  'Update reading list'
);

// Test authentication
const auth = await github.testAuth();

// Validate repository access
const repo = await github.validateRepo();
```

**Error Handling**:
- 404: File not found (expected for new files)
- 409: Conflict (file modified on GitHub)
- 401/403: Authentication errors
- 429: Rate limit exceeded

### 2. Local Storage Manager (`local-storage.js`)

**Purpose**: Persistent local data storage

**Key Features**:
- IndexedDB for structured data
- localStorage for settings
- Automatic fallback if IndexedDB unavailable
- Metadata tracking (sync status, SHA, timestamps)

**Data Structure**:
```javascript
// Record in IndexedDB
{
  id: 'booksData',           // Primary key
  data: { books: [...] },    // Actual data
  timestamp: 1704067200000,  // Last modified
  synced: false,             // Sync status
  sha: 'abc123...',          // GitHub SHA
  githubPath: 'apps/...'     // GitHub file path
}
```

**API**:
```javascript
const storage = new LocalStorage('app-name');
await storage.init();

// Save data
await storage.save('key', data, {
  synced: false,
  sha: null,
  githubPath: 'apps/app/data.json'
});

// Load data
const data = await storage.load('key');

// Get full record
const record = await storage.loadRecord('key');

// Settings (always localStorage)
storage.saveSetting('theme', 'dark');
const theme = storage.loadSetting('theme', 'light');
```

### 3. Sync Controller (`sync-controller.js`)

**Purpose**: Orchestrate synchronization between local and remote

**Key Features**:
- Automatic sync on interval (default: 60 seconds)
- Manual sync on demand
- Online/offline detection
- Conflict resolution strategies
- Event system for UI updates

**Sync Flow**:
```
1. Check if online
2. Get all unsynced local records
3. For each record:
   a. Upload to GitHub
   b. Handle conflicts
   c. Update local SHA
   d. Mark as synced
4. Emit sync complete event
```

**Conflict Resolution**:
- **Last-Write-Wins** (default): Most recent change wins
- **Manual**: Emit event for app to handle
- Future: Three-way merge, custom strategies

**API**:
```javascript
const sync = new SyncController(storage, github, {
  autoSyncInterval: 60000,
  conflictStrategy: 'last-write-wins'
});

// Start automatic syncing
sync.start();

// Manual sync
await sync.sync();

// Listen to events
sync.on('syncStart', () => {});
sync.on('syncComplete', (results) => {});
sync.on('syncError', (error) => {});
sync.on('conflictDetected', (conflict) => {});
sync.on('onlineStatusChange', (isOnline) => {});

// Force operations
await sync.forceDownload(path, localKey);
await sync.forceUpload(localKey, path);
```

### 4. State Management (`state.js`)

**Purpose**: Reactive state for UI updates

**Key Features**:
- Simple observable pattern
- Automatic UI updates on state changes
- Computed properties
- Two-way data binding

**Pattern**:
```javascript
const state = new State({
  items: [],
  filter: 'all',
  loading: false
});

// Subscribe to changes
state.subscribe('items', (newItems) => {
  renderItems(newItems);
});

// Update state
state.set('items', newItems);

// Multiple updates
state.set({
  items: newItems,
  loading: false
});

// Computed properties
state.computed('itemCount', 
  (state) => state.items.length, 
  ['items']
);

// Bind to DOM
state.bindTo('itemCount', '#count-display');

// Two-way input binding
state.bindInput('searchQuery', '#search-input');
```

### 5. Router (`router.js`)

**Purpose**: Client-side navigation

**Key Features**:
- Hash-based routing (no server required)
- Parameter extraction
- Simple API

**Usage**:
```javascript
const router = new Router();

router.on('/', () => {
  showHome();
});

router.on('/items/:id', (params) => {
  showItem(params.id);
});

router.on('/category/:category/item/:id', (params) => {
  showCategoryItem(params.category, params.id);
});

// Navigate
router.navigate('/items/123');
```

### 6. UI Components

#### Toast Notifications (`components/toast.js`)
```javascript
toast.success('Saved!');
toast.error('Failed');
toast.info('Syncing...');
toast.warning('Offline');

// Custom
toast.show('Message', 'info', 3000);
```

#### Modal Dialogs (`components/modal.js`)
```javascript
// Alert
await modal.alert('Hello!', 'Title');

// Confirm
const confirmed = await modal.confirm('Are you sure?');

// Prompt
const name = await modal.prompt('Enter name:', 'Default');

// Custom
modal.show({
  title: 'Title',
  content: '<p>HTML content</p>',
  buttons: [...]
});
```

#### Form Helpers (`components/form.js`)
```javascript
// Get form data
const data = FormHelper.getData('#my-form');

// Set form data
FormHelper.setData('#my-form', data);

// Validate
const validation = FormHelper.validate('#my-form');
if (!validation.valid) {
  FormHelper.showErrors('#my-form', validation.errors);
}

// Submit handler
FormHelper.onSubmit('#my-form', async (data) => {
  // Handle submit
});
```

#### List Rendering (`components/list.js`)
```javascript
// Render list
ListHelper.render(
  items,
  (item) => `<div>${item.name}</div>`,
  '#container',
  { emptyMessage: 'No items' }
);

// Render table
ListHelper.renderTable(
  items,
  [
    { key: 'name', label: 'Name' },
    { key: 'date', label: 'Date' }
  ],
  '#container'
);

// Filter
const filtered = ListHelper.filter(items, query, ['name', 'email']);

// Sort
const sorted = ListHelper.sort(items, 'name', 'asc');

// Paginate
const page = ListHelper.paginate(items, 1, 10);
```

## Data Flow

### Adding a New Item

```
1. User fills form and clicks submit
   ↓
2. FormHelper.getData() extracts form data
   ↓
3. App creates new item object with ID
   ↓
4. State.set('items', [...items, newItem])
   ↓
5. State subscriber triggers UI update
   ↓
6. storage.save('items', data, { synced: false })
   ↓
7. Data saved to IndexedDB
   ↓
8. SyncController detects unsynced data
   ↓
9. github.writeFile() uploads to GitHub
   ↓
10. storage.markSynced() updates local record
```

### Loading Data on Startup

```
1. App initializes
   ↓
2. storage.load('items') checks IndexedDB
   ↓
3. If found: Load local data
   ↓
4. State.set('items', localData)
   ↓
5. UI renders with local data
   ↓
6. If online: syncController.sync()
   ↓
7. github.readFile() checks for updates
   ↓
8. If newer: Download and update local
   ↓
9. State.set('items', remoteData)
   ↓
10. UI re-renders with latest data
```

### Offline → Online Transition

```
1. User makes changes while offline
   ↓
2. Changes saved to IndexedDB
   ↓
3. Network comes back online
   ↓
4. Browser fires 'online' event
   ↓
5. SyncController detects online status
   ↓
6. Automatic sync triggered
   ↓
7. Unsynced records uploaded to GitHub
   ↓
8. UI shows sync success notification
```

## Progressive Web App (PWA) Features

### Service Worker (`sw.js`)

**Purpose**: Enable offline functionality and caching

**Strategy**: Cache-First with Network Fallback
```javascript
1. Check cache first
2. If found: Return cached response
3. If not: Fetch from network
4. Cache the network response
5. Return network response
```

**Cached Assets**:
- HTML files
- JavaScript files
- CSS (via CDN, browser-cached)
- App manifest

**Not Cached**:
- API requests to GitHub (dynamic data)
- User-generated content (handled by IndexedDB)

### Manifest (`manifest.json`)

**Purpose**: Define PWA metadata for installation

**Contains**:
- App name and short name
- Icons (192x192, 512x512)
- Display mode (standalone)
- Theme colors
- Start URL

**Installation**:
- Desktop: Browser prompts to install
- Mobile: "Add to Home Screen"
- Appears like native app

## Security Considerations

### Token Storage
- Stored in localStorage (not ideal but pragmatic)
- Only accessible by same origin
- Cleared when browser data cleared
- Alternative: Could implement encryption

### GitHub API
- All requests over HTTPS
- Token never exposed in URL
- Rate limiting prevents abuse
- Repository permissions control access

### Data Privacy
- All data encrypted in transit (HTTPS)
- Data at rest encryption (GitHub's responsibility)
- Private repositories recommended
- No third-party services involved

### Potential Improvements
- Encrypt sensitive data before storing
- Use Web Crypto API for token encryption
- Implement token expiration checks
- Add biometric authentication for mobile

## Performance Considerations

### IndexedDB
- Asynchronous (non-blocking)
- Handles large datasets efficiently
- Indexed queries (fast lookups)
- Transactions prevent corruption

### GitHub API
- Rate limit: 5000 req/hour (sufficient for personal use)
- ETag caching reduces bandwidth
- Conditional requests (304 Not Modified)
- Batch operations where possible

### UI Rendering
- Virtual DOM not needed (small data sets)
- Direct DOM manipulation is fast enough
- State-driven updates minimize redraws
- Debounce search/filter inputs

### Caching Strategy
- Static assets cached by Service Worker
- API responses cached by browser
- GitHub data cached in IndexedDB
- Minimal redundancy

## Browser Compatibility

### Required Features
- ES6+ JavaScript
- IndexedDB
- LocalStorage
- Fetch API
- Promises/Async-Await
- Service Workers (for PWA)

### Supported Browsers
- Chrome 70+
- Firefox 65+
- Safari 13+
- Edge 79+
- Mobile: iOS Safari 13+, Chrome Mobile

### Fallbacks
- IndexedDB → localStorage (automatic)
- Service Worker → none (app still works)
- PWA features → none (still usable in browser)

## Scalability

### Data Limits
- **IndexedDB**: No fixed limit (usually 50% of available disk)
- **localStorage**: 5-10 MB
- **GitHub file size**: 100 MB recommended max
- **GitHub repo size**: 1 GB soft limit

### Performance at Scale
- Tested with 1000+ items
- Pagination recommended beyond 500 items
- Virtual scrolling for very long lists
- Consider chunking large datasets

### Multiple Apps
- Each app has own IndexedDB database
- Shared settings in separate database
- Independent sync schedules
- Isolated state management

## Extending the Framework

### Adding New Core Features
1. Create module in `framework/core/`
2. Export class or functions
3. Import in app templates
4. Document in this file

### Custom Components
1. Create in `framework/core/components/`
2. Follow existing patterns
3. Export for reuse
4. Add to template if widely useful

### Alternative Sync Backends
The Sync Controller is designed to be backend-agnostic:
- Implement interface: readFile, writeFile, listFiles
- Replace GitHubSync with custom sync class
- Examples: Dropbox, Google Drive, self-hosted

## Testing Strategy

### Manual Testing
- Test in multiple browsers
- Test offline functionality
- Test sync scenarios
- Test conflict resolution
- Test on mobile devices

### Automated Testing
- Not included in initial version
- Could add: Jest, Playwright, Cypress
- Trade-off: adds complexity and dependencies

### AI-Assisted Testing
- Use AI to generate test scenarios
- Prompt: "Test the reading log with 100 books"
- Verify UI remains responsive

## Future Enhancements

### Possible Additions
1. Real-time collaboration (WebRTC/WebSocket)
2. Image/file uploads (GitHub blobs)
3. End-to-end encryption
4. Export formats (CSV, PDF)
5. Dark mode toggle
6. Accessibility improvements (ARIA, keyboard nav)
7. i18n/localization
8. Undo/redo functionality
9. Advanced conflict resolution
10. Plugin system

### Maintaining Simplicity
Any additions should:
- Not require build tools
- Work offline
- Be optional enhancements
- Not break existing apps
- Stay true to "zero dependencies" philosophy

## Conclusion

This architecture prioritizes:
1. **Longevity**: No dependencies to break
2. **Simplicity**: Easy to understand and modify
3. **Reliability**: Works offline, syncs when online
4. **User Control**: Data owned by user, stored on GitHub
5. **AI-Friendly**: Consistent patterns easy to replicate

The framework is complete enough to build real apps, simple enough to maintain for decades.
