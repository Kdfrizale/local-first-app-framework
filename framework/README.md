# Framework Core

This directory contains the core modules that power all local-first apps.

## Core Modules

### `core/github-sync.js`
Handles all GitHub API interactions:
- Authentication with Personal Access Token
- Reading/writing files to repository
- Rate limiting and error handling
- ETag-based conditional requests

### `core/local-storage.js`
Local data persistence:
- IndexedDB wrapper for structured data
- localStorage for settings and tokens
- Automatic serialization/deserialization
- Data migration utilities

### `core/sync-controller.js`
Orchestrates synchronization:
- Online/offline detection
- Background sync scheduling
- Conflict detection and resolution
- Sync queue management

### `core/router.js`
Client-side routing:
- Hash-based navigation
- Route parameter extraction
- Navigation guards
- History management

### `core/state.js`
State management:
- Simple reactive state
- Event-driven updates
- Computed properties
- State persistence

### `core/components/`
Reusable UI components:
- **form.js** - Form helpers and validation
- **list.js** - List rendering and filtering
- **modal.js** - Modal dialogs
- **toast.js** - Toast notifications

## Using the Framework

Import the modules you need in your app:

```html
<script src="../../framework/core/github-sync.js"></script>
<script src="../../framework/core/local-storage.js"></script>
<script src="../../framework/core/sync-controller.js"></script>
<script src="../../framework/core/state.js"></script>
<script src="../../framework/core/router.js"></script>
```

Then use them in your app logic:

```javascript
// Initialize storage
const storage = new LocalStorage('my-app');

// Setup GitHub sync
const github = new GitHubSync({
  token: userToken,
  repo: 'username/family-data',
  path: 'apps/my-app/data.json'
});

// Create sync controller
const sync = new SyncController(storage, github);

// Start syncing
sync.start();
```

See example apps for complete implementations.
