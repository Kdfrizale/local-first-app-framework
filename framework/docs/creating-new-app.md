# Creating a New App

This guide will walk you through creating a new app using the framework.

## Quick Start (5 minutes)

### 1. Copy the Template

```bash
cd framework/examples
cp -r ../templates my-new-app
cd my-new-app
```

### 2. Customize the HTML

Open `index.html` and update:

```html
<!-- Change the title -->
<title>My New App - Local First</title>

<!-- Change the theme color -->
<meta name="theme-color" content="#10B981">

<!-- Update the navigation -->
<h1 class="text-xl font-bold text-white">My New App</h1>

<!-- Customize the main content area -->
<div id="app-container">
  <!-- Your app UI goes here -->
</div>
```

### 3. Customize the JavaScript

Open `app.js` and update the configuration:

```javascript
const CONFIG = {
  appName: 'my-new-app',
  github: {
    owner: 'your-username',
    repo: 'family-data',
    branch: 'main',
    dataPath: 'apps/my-new-app/data.json'
  }
};
```

### 4. Define Your Data Structure

Decide what data your app needs. For example:

```javascript
// Example: Todo app
const data = {
  todos: [
    {
      id: '1',
      title: 'Buy groceries',
      completed: false,
      createdAt: '2024-01-01T00:00:00.000Z'
    }
  ]
};

// Example: Expense tracker
const data = {
  expenses: [
    {
      id: '1',
      amount: 50.00,
      category: 'groceries',
      date: '2024-01-01',
      description: 'Weekly shopping'
    }
  ],
  categories: ['groceries', 'utilities', 'entertainment']
};
```

### 5. Implement Your Features

Update the `renderItems()` function to display your data:

```javascript
function renderItems() {
  const items = appState.get('items');
  const container = document.getElementById('app-container');
  
  // Use the ListHelper to render your items
  ListHelper.render(
    items,
    (item, index) => {
      return `
        <div class="bg-white p-4 rounded-lg shadow mb-4">
          <h3 class="font-semibold">${item.title}</h3>
          <p class="text-gray-600">${item.description}</p>
        </div>
      `;
    },
    container,
    { emptyMessage: 'No items yet' }
  );
}
```

### 6. Add Forms for User Input

Use modals to collect user input:

```javascript
function showAddItemModal() {
  modal.show({
    title: 'Add New Item',
    content: `
      <form id="add-form">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input 
            type="text" 
            name="title" 
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea 
            name="description" 
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>
      </form>
    `,
    buttons: [
      { text: 'Cancel', onClick: () => modal.close() },
      {
        text: 'Add',
        primary: true,
        onClick: async () => {
          const form = document.getElementById('add-form');
          const data = FormHelper.getData(form);
          
          // Add to state
          const items = appState.get('items') || [];
          items.push({
            id: Date.now().toString(),
            ...data,
            createdAt: new Date().toISOString()
          });
          appState.set('items', items);
          
          // Save and sync
          await saveData();
          
          toast.success('Item added!');
          modal.close();
        }
      }
    ]
  });
}
```

### 7. Test Your App

1. Open `index.html` in your browser
2. Configure GitHub sync
3. Add some test data
4. Verify it syncs to GitHub
5. Open on another device to confirm sync works

## Framework APIs

### State Management

```javascript
// Get state
const items = appState.get('items');

// Set state
appState.set('items', newItems);

// Set multiple values
appState.set({
  items: newItems,
  filter: 'all'
});

// Subscribe to changes
appState.subscribe('items', (newValue) => {
  console.log('Items changed:', newValue);
  renderItems();
});

// Computed properties
appState.computed('itemCount', (state) => state.items.length, ['items']);
```

### Local Storage

```javascript
// Save data
await storage.save('myData', data, {
  synced: false,
  githubPath: 'apps/my-app/data.json'
});

// Load data
const data = await storage.load('myData');

// Get record with metadata
const record = await storage.loadRecord('myData');

// Save settings
storage.saveSetting('theme', 'dark');

// Load setting
const theme = storage.loadSetting('theme', 'light');
```

### GitHub Sync

```javascript
// Read file from GitHub
const result = await github.readFile('apps/my-app/data.json');

// Write file to GitHub
await github.writeFile(
  'apps/my-app/data.json',
  data,
  currentSha,
  'Update data'
);

// List files in directory
const files = await github.listFiles('apps/my-app');
```

### Sync Controller

```javascript
// Manual sync
await syncController.sync();

// Download from GitHub
await syncController.downloadFromGitHub(
  'apps/my-app/data.json',
  'localKey'
);

// Upload to GitHub
await syncController.uploadToGitHub(
  'localKey',
  'apps/my-app/data.json'
);

// Listen to events
syncController.on('syncComplete', (results) => {
  console.log('Sync done:', results);
});
```

### UI Components

```javascript
// Toast notifications
toast.success('Saved!');
toast.error('Failed to save');
toast.info('Syncing...');
toast.warning('You are offline');

// Modal dialogs
modal.alert('Hello!', 'Title');

const confirmed = await modal.confirm('Are you sure?');

const value = await modal.prompt('Enter name:', 'Default');

modal.show({
  title: 'Custom Modal',
  content: '<p>HTML content</p>',
  buttons: [
    { text: 'Cancel', onClick: () => modal.close() },
    { text: 'OK', primary: true, onClick: () => {} }
  ]
});

// Form helpers
const data = FormHelper.getData('#my-form');
FormHelper.setData('#my-form', data);
const validation = FormHelper.validate('#my-form');

// List rendering
ListHelper.render(
  items,
  (item) => `<div>${item.name}</div>`,
  '#container'
);

// Filter items
const filtered = ListHelper.filter(items, 'query', ['name', 'description']);

// Sort items
const sorted = ListHelper.sort(items, 'name', 'asc');
```

### Router

```javascript
router.on('/', () => {
  // Home route
});

router.on('/items/:id', (params) => {
  const id = params.id;
  // Item detail route
});

router.navigate('/items/123');
```

## Best Practices

### 1. Keep Data Simple

Use flat structures when possible:

```javascript
// Good
{
  books: [
    { id: '1', title: 'Book 1', author: 'Author 1' }
  ]
}

// Avoid deep nesting
{
  users: {
    user1: {
      books: {
        book1: {
          chapters: {
            // Too deep!
          }
        }
      }
    }
  }
}
```

### 2. Use Timestamps

Always include timestamps for conflict resolution:

```javascript
{
  id: '1',
  title: 'My Item',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}
```

### 3. Generate Unique IDs

Use timestamps or UUIDs:

```javascript
// Simple timestamp-based ID
const id = Date.now().toString();

// Better: timestamp + random
const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

### 4. Handle Errors Gracefully

Always wrap async operations in try-catch:

```javascript
try {
  await saveData();
  toast.success('Saved!');
} catch (error) {
  console.error(error);
  toast.error('Failed to save');
}
```

### 5. Show Loading States

Provide feedback during async operations:

```javascript
appState.set('loading', true);

try {
  await syncController.sync();
  toast.success('Synced!');
} finally {
  appState.set('loading', false);
}
```

### 6. Validate Input

Use HTML5 validation attributes:

```html
<input type="email" required />
<input type="number" min="0" max="100" />
<input type="date" />
```

And check with FormHelper:

```javascript
const validation = FormHelper.validate('#my-form');
if (!validation.valid) {
  FormHelper.showErrors('#my-form', validation.errors);
  return;
}
```

## App Ideas

Here are some simple apps you could build:

- **Chore Tracker**: Assign and track household chores
- **Recipe Book**: Store and organize family recipes
- **Expense Splitter**: Track shared expenses and who owes what
- **Workout Log**: Track exercises and progress
- **Garden Planner**: Plan and track your garden
- **Pet Care Log**: Track feeding, vet visits, etc.
- **Memory Journal**: Store daily memories and photos
- **Gift Ideas**: Track gift ideas for family members
- **Password Hints**: Store password hints (not passwords!)
- **Movie/TV Watchlist**: Track what to watch next

## Tips for AI Agents

When prompting an AI agent to create a new app:

1. **Be specific about the data structure**: "The app should store books with title, author, and date finished"

2. **Describe the UI**: "Show books as cards with the ability to filter by reader"

3. **Reference the existing examples**: "Create an app similar to the reading log but for tracking exercises"

4. **Request specific features**: "Include search, filtering, and statistics dashboard"

Example prompt:
```
Create a workout log app similar to the reading log example. 
It should track exercises with fields: name, type (cardio/strength/flexibility), 
duration in minutes, date, and notes. Show statistics for total workouts this week 
and month. Include filtering by exercise type and search by name.
```

## Deploying Your App

### Option 1: GitHub Pages (Free)
1. Push your app to a GitHub repository
2. Go to Settings → Pages
3. Select your branch and `/framework/examples/your-app` folder
4. Your app will be at `https://username.github.io/repo/`

### Option 2: Netlify (Free)
1. Sign up at netlify.com
2. Drag and drop your app folder
3. Get an instant URL

### Option 3: Vercel (Free)
1. Sign up at vercel.com
2. Import your GitHub repository
3. Deploy with one click

All these options work great for static HTML/JS apps!

## Next Steps

- Explore the [Reading Log example](../examples/reading-log/app.js) for a complete implementation
- Check out the [Architecture documentation](architecture.md)
- Join the community and share your creations!
