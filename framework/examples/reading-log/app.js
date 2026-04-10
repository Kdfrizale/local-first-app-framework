/**
 * Reading Log App
 * Track books read by family members
 */

const CONFIG = {
  appName: 'reading-log',
  github: {
    owner: 'your-username',
    repo: 'family-data',
    branch: 'main',
    dataPath: 'apps/reading-log/data.json'
  }
};

let storage, github, syncController, router, appState;

/**
 * Initialize the application
 */
async function initApp() {
  storage = new LocalStorage(CONFIG.appName);
  await storage.init();
  
  appState = new State({
    isSetup: false,
    isSyncing: false,
    books: [],
    readers: [],
    searchQuery: '',
    readerFilter: '',
    sortBy: 'date-desc'
  });
  
  const token = storage.loadSetting('githubToken');
  const owner = storage.loadSetting('githubOwner') || CONFIG.github.owner;
  const repo = storage.loadSetting('githubRepo') || CONFIG.github.repo;
  
  if (token) {
    await setupGitHubSync(token, owner, repo);
    appState.set('isSetup', true);
    await loadData();
  } else {
    showSetupScreen();
  }
  
  setupEventListeners();
  setupOfflineIndicator();
  
  // Listen to state changes
  appState.subscribe('books', renderBooks);
  appState.subscribe('searchQuery', renderBooks);
  appState.subscribe('readerFilter', renderBooks);
  appState.subscribe('sortBy', renderBooks);
}

async function setupGitHubSync(token, owner, repo) {
  github = new GitHubSync({ token, owner, repo, branch: CONFIG.github.branch });
  syncController = new SyncController(storage, github);
  
  syncController.on('syncStart', () => {
    appState.set('isSyncing', true);
    updateSyncButton(true);
  });
  
  syncController.on('syncComplete', (results) => {
    appState.set('isSyncing', false);
    updateSyncButton(false);
    
    if (results.errors && results.errors.length > 0) {
      // Partial sync failure
      toast.warning(`Sync completed with ${results.errors.length} error(s)`, 5000);
    } else if (results.merged > 0) {
      // Data was merged with remote changes
      toast.info(`Sync complete! Merged ${results.merged} change(s) from other devices`, 4000);
    } else if (results.uploaded > 0 || results.downloaded > 0) {
      toast.success(`Sync complete!`);
    }
    
    loadData();
  });
  
  syncController.on('syncError', (error) => {
    appState.set('isSyncing', false);
    updateSyncButton(false);
    toast.error(`Sync failed: ${error.message}`);
  });
  
  syncController.start();
}

async function loadData() {
  const data = await storage.load('booksData');
  
  if (data) {
    appState.set({
      books: data.books || [],
      readers: data.readers || []
    });
    updateReadersFilter();
    renderBooks();
    renderStats();
  } else if (syncController) {
    try {
      const result = await syncController.downloadFromGitHub(CONFIG.github.dataPath, 'booksData');
      if (result.status === 'downloaded' && result.data) {
        appState.set({
          books: result.data.books || [],
          readers: result.data.readers || []
        });
        updateReadersFilter();
        renderBooks();
        renderStats();
      }
    } catch (error) {
      console.log('No data on GitHub yet');
      renderBooks();
      renderStats();
    }
  }
}

async function saveData() {
  const data = {
    books: appState.get('books'),
    readers: appState.get('readers'),
    lastUpdated: new Date().toISOString()
  };
  
  await storage.save('booksData', data, {
    synced: false,
    githubPath: CONFIG.github.dataPath
  });
  
  if (syncController && navigator.onLine) {
    setTimeout(() => syncController.sync(), 500);
  }
}

function renderBooks() {
  let books = appState.get('books') || [];
  const searchQuery = appState.get('searchQuery');
  const readerFilter = appState.get('readerFilter');
  const sortBy = appState.get('sortBy');
  
  // Filter
  if (searchQuery) {
    books = ListHelper.filter(books, searchQuery, ['title', 'author', 'notes']);
  }
  
  if (readerFilter) {
    // Support both old format (single reader) and new format (readers array)
    books = books.filter(b => {
      const bookReaders = Array.isArray(b.readers) ? b.readers : (b.reader ? [b.reader] : []);
      return bookReaders.includes(readerFilter);
    });
  }
  
  // Sort
  const sortFns = {
    'date-desc': (a, b) => new Date(b.dateFinished) - new Date(a.dateFinished),
    'date-asc': (a, b) => new Date(a.dateFinished) - new Date(b.dateFinished),
    'title': (a, b) => a.title.localeCompare(b.title),
    'author': (a, b) => a.author.localeCompare(b.author)
  };
  
  books = [...books].sort(sortFns[sortBy] || sortFns['date-desc']);
  
  // Render
  const container = document.getElementById('books-container');
  
  if (books.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <span class="text-6xl mb-4 block">📚</span>
        <h2 class="text-2xl font-bold text-gray-900 mb-4">No books yet</h2>
        <p class="text-gray-600 mb-8">Start tracking your family's reading journey!</p>
        <button onclick="showAddBookModal()" class="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700">
          Add Your First Book
        </button>
      </div>
    `;
  } else {
    ListHelper.render(
      books,
      (book) => {
        const date = new Date(book.dateFinished).toLocaleDateString();
        // Handle both old format (single reader) and new format (readers array)
        const bookReaders = Array.isArray(book.readers) ? book.readers : (book.reader ? [book.reader] : []);
        const readersDisplay = bookReaders.length > 0 
          ? bookReaders.map(r => `<span class="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">${r}</span>`).join(' ')
          : '<span class="text-gray-400">No reader</span>';
        
        return `
          <div class="book-card bg-white rounded-lg shadow p-6 mb-4">
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1">
                <h3 class="text-xl font-bold text-gray-900 mb-1">${book.title}</h3>
                <p class="text-gray-600">by ${book.author}</p>
              </div>
              <div class="flex space-x-2">
                <button onclick="editBook('${book.id}')" class="text-purple-600 hover:text-purple-800">✏️</button>
                <button onclick="deleteBook('${book.id}')" class="text-red-600 hover:text-red-800">🗑️</button>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-3">
              <span class="flex items-center gap-1">👤 ${readersDisplay}</span>
              <span>📅 ${date}</span>
              ${book.rating ? `<span>⭐ ${book.rating}/5</span>` : ''}
            </div>
            ${book.notes ? `<p class="text-gray-700 text-sm mt-3 border-t pt-3">${book.notes}</p>` : ''}
          </div>
        `;
      },
      container,
      { emptyMessage: 'No books found' }
    );
  }
}

function renderStats() {
  const books = appState.get('books') || [];
  const readers = appState.get('readers') || [];
  
  const totalBooks = books.length;
  const totalReaders = readers.length;
  const thisMonth = books.filter(b => {
    const date = new Date(b.dateFinished);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  
  const avgRating = books.filter(b => b.rating).length > 0
    ? (books.filter(b => b.rating).reduce((sum, b) => sum + parseFloat(b.rating), 0) / books.filter(b => b.rating).length).toFixed(1)
    : 'N/A';
  
  const container = document.getElementById('stats-container');
  container.innerHTML = `
    <div class="bg-white rounded-lg shadow p-4">
      <p class="text-gray-500 text-sm mb-1">Total Books</p>
      <p class="text-3xl font-bold text-purple-600">${totalBooks}</p>
    </div>
    <div class="bg-white rounded-lg shadow p-4">
      <p class="text-gray-500 text-sm mb-1">This Month</p>
      <p class="text-3xl font-bold text-indigo-600">${thisMonth}</p>
    </div>
    <div class="bg-white rounded-lg shadow p-4">
      <p class="text-gray-500 text-sm mb-1">Readers</p>
      <p class="text-3xl font-bold text-pink-600">${totalReaders}</p>
    </div>
    <div class="bg-white rounded-lg shadow p-4">
      <p class="text-gray-500 text-sm mb-1">Avg Rating</p>
      <p class="text-3xl font-bold text-amber-600">${avgRating}</p>
    </div>
  `;
}

function updateReadersFilter() {
  const readers = appState.get('readers') || [];
  const select = document.getElementById('reader-filter');
  
  select.innerHTML = '<option value="">All readers</option>';
  readers.forEach(reader => {
    select.innerHTML += `<option value="${reader}">${reader}</option>`;
  });
}

function showAddBookModal() {
  const readers = appState.get('readers') || [];
  
  const readerCheckboxes = readers.map(r => `
    <label class="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
      <input type="checkbox" name="readers" value="${r}" class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" />
      <span class="text-gray-700">${r}</span>
    </label>
  `).join('');
  
  modal.show({
    title: '📚 Add New Book',
    content: `
      <form id="add-book-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Book Title *</label>
          <input type="text" name="title" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Author *</label>
          <input type="text" name="author" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Readers * <span class="font-normal text-gray-500">(select who read this book)</span></label>
          <div class="border border-gray-300 rounded-md p-2 max-h-32 overflow-y-auto bg-white">
            ${readerCheckboxes || '<p class="text-gray-400 text-sm p-2">No readers yet. Add one below.</p>'}
          </div>
          <div class="mt-2 flex space-x-2">
            <input type="text" id="new-reader-input" placeholder="Add new reader..." class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            <button type="button" onclick="addReaderToForm()" class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">+ Add</button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Date Finished *</label>
          <input type="date" name="dateFinished" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Rating (1-5)</label>
          <input type="number" name="rating" min="1" max="5" step="0.5" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea name="notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
        </div>
      </form>
    `,
    buttons: [
      { text: 'Cancel', onClick: () => modal.close() },
      {
        text: 'Add Book',
        primary: true,
        onClick: async () => {
          const form = document.getElementById('add-book-form');
          const validation = FormHelper.validate(form);
          
          // Get selected readers
          const selectedReaders = Array.from(form.querySelectorAll('input[name="readers"]:checked'))
            .map(cb => cb.value);
          
          if (selectedReaders.length === 0) {
            toast.error('Please select at least one reader');
            return;
          }
          
          if (validation.valid) {
            const data = FormHelper.getData(form);
            delete data.readers; // Remove from form data, we handle it separately
            
            const now = new Date().toISOString();
            const newBook = {
              id: Date.now().toString(),
              ...data,
              readers: selectedReaders, // Store as array
              createdAt: now,
              updatedAt: now  // Add updatedAt timestamp
            };
            
            // Create new array to trigger state change notification
            const books = [...(appState.get('books') || []), newBook];
            appState.set('books', books);
            
            // Add any new readers to the global readers list
            const currentReaders = appState.get('readers') || [];
            const newReaders = selectedReaders.filter(r => !currentReaders.includes(r));
            if (newReaders.length > 0) {
              appState.set('readers', [...currentReaders, ...newReaders]);
              updateReadersFilter();
            }
            
            await saveData();
            renderStats();
            
            toast.success(`"${data.title}" added!`);
            modal.close();
          }
        }
      }
    ]
  });
}

// Helper to add a new reader in the add/edit form
window.addReaderToForm = function() {
  const input = document.getElementById('new-reader-input');
  const name = input.value.trim();
  
  if (!name) return;
  
  // Find the checkbox container
  const container = input.closest('div').previousElementSibling;
  
  // Remove "no readers" message if present
  const emptyMsg = container.querySelector('p');
  if (emptyMsg) emptyMsg.remove();
  
  // Check if reader already exists
  const existingCheckboxes = container.querySelectorAll('input[name="readers"]');
  for (const cb of existingCheckboxes) {
    if (cb.value.toLowerCase() === name.toLowerCase()) {
      cb.checked = true;
      input.value = '';
      return;
    }
  }
  
  // Add new checkbox
  const label = document.createElement('label');
  label.className = 'flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer';
  label.innerHTML = `
    <input type="checkbox" name="readers" value="${name}" checked class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" />
    <span class="text-gray-700">${name}</span>
  `;
  container.appendChild(label);
  
  // Clear input
  input.value = '';
  
  // Add to global readers list
  const readers = appState.get('readers') || [];
  if (!readers.includes(name)) {
    appState.set('readers', [...readers, name]);
    updateReadersFilter();
  }
};

window.editBook = function(id) {
  const books = appState.get('books') || [];
  const book = books.find(b => b.id === id);
  
  if (!book) return;
  
  // Handle both old format (single reader) and new format (readers array)
  const bookReaders = Array.isArray(book.readers) ? book.readers : (book.reader ? [book.reader] : []);
  
  const allReaders = appState.get('readers') || [];
  const readerCheckboxes = allReaders.map(r => `
    <label class="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
      <input type="checkbox" name="readers" value="${r}" ${bookReaders.includes(r) ? 'checked' : ''} class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" />
      <span class="text-gray-700">${r}</span>
    </label>
  `).join('');
  
  modal.show({
    title: '✏️ Edit Book',
    content: `
      <form id="edit-book-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Book Title *</label>
          <input type="text" name="title" required value="${book.title}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Author *</label>
          <input type="text" name="author" required value="${book.author}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Readers * <span class="font-normal text-gray-500">(select who read this book)</span></label>
          <div class="border border-gray-300 rounded-md p-2 max-h-32 overflow-y-auto bg-white">
            ${readerCheckboxes || '<p class="text-gray-400 text-sm p-2">No readers yet. Add one below.</p>'}
          </div>
          <div class="mt-2 flex space-x-2">
            <input type="text" id="new-reader-input" placeholder="Add new reader..." class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            <button type="button" onclick="addReaderToForm()" class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">+ Add</button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Date Finished *</label>
          <input type="date" name="dateFinished" required value="${book.dateFinished}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Rating (1-5)</label>
          <input type="number" name="rating" min="1" max="5" step="0.5" value="${book.rating || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea name="notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">${book.notes || ''}</textarea>
        </div>
      </form>
    `,
    buttons: [
      { text: 'Cancel', onClick: () => modal.close() },
      {
        text: 'Save Changes',
        primary: true,
        onClick: async () => {
          const form = document.getElementById('edit-book-form');
          const validation = FormHelper.validate(form);
          
          // Get selected readers
          const selectedReaders = Array.from(form.querySelectorAll('input[name="readers"]:checked'))
            .map(cb => cb.value);
          
          if (selectedReaders.length === 0) {
            toast.error('Please select at least one reader');
            return;
          }
          
          if (validation.valid) {
            const data = FormHelper.getData(form);
            delete data.readers; // Remove from form data
            
            const books = appState.get('books') || [];
            const index = books.findIndex(b => b.id === id);
            
            if (index !== -1) {
              // Create new array to trigger state change notification
              const updatedBooks = books.map((b, i) => 
                i === index ? { ...b, ...data, readers: selectedReaders, updatedAt: new Date().toISOString() } : b
              );
              appState.set('books', updatedBooks);
              
              // Add any new readers to the global readers list
              const currentReaders = appState.get('readers') || [];
              const newReaders = selectedReaders.filter(r => !currentReaders.includes(r));
              if (newReaders.length > 0) {
                appState.set('readers', [...currentReaders, ...newReaders]);
                updateReadersFilter();
              }
              
              await saveData();
              renderStats();
              
              toast.success('Book updated!');
              modal.close();
            }
          }
        }
      }
    ]
  });
};

window.deleteBook = async function(id) {
  const books = appState.get('books') || [];
  const book = books.find(b => b.id === id);
  
  if (!book) return;
  
  const confirmed = await modal.confirm(
    `Are you sure you want to delete "${book.title}"?`,
    'Delete Book'
  );
  
  if (confirmed) {
    const filtered = books.filter(b => b.id !== id);
    appState.set('books', filtered);
    await saveData();
    renderStats();
    toast.success('Book deleted');
  }
};

function showSetupScreen() {
  const container = document.querySelector('main');
  container.innerHTML = `
    <div class="max-w-md mx-auto">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Setup GitHub Sync</h2>
        <p class="text-gray-600 mb-6">Enter your GitHub details to enable data synchronization.</p>
        
        <form id="setup-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">GitHub Personal Access Token</label>
            <input type="password" name="token" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="ghp_..." />
            <p class="text-xs text-gray-500 mt-1">
              <a href="https://github.com/settings/tokens/new" target="_blank" class="text-purple-600 hover:underline">Create a token</a> with 'repo' scope
            </p>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">GitHub Username</label>
            <input type="text" name="owner" required value="${CONFIG.github.owner}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Repository Name</label>
            <input type="text" name="repo" required value="${CONFIG.github.repo}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <button type="submit" class="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
            Connect to GitHub
          </button>
        </form>
      </div>
    </div>
  `;
  
  FormHelper.onSubmit('#setup-form', async (data) => {
    try {
      console.log('[Setup] Starting GitHub connection test...');
      console.log('[Setup] Owner:', data.owner);
      console.log('[Setup] Repo:', data.repo);
      console.log('[Setup] Token length:', data.token ? data.token.length : 0);
      
      const testGithub = new GitHubSync({ token: data.token, owner: data.owner, repo: data.repo });
      
      const authTest = await testGithub.testAuth();
      console.log('[Setup] Auth test result:', authTest);
      
      if (!authTest.success) {
        toast.error(`GitHub authentication failed: ${authTest.error}`);
        return;
      }
      
      const repoTest = await testGithub.validateRepo();
      console.log('[Setup] Repo test result:', repoTest);
      
      if (!repoTest.success) {
        toast.error(`Cannot access repository: ${repoTest.error}`);
        return;
      }
      
      storage.saveSetting('githubToken', data.token);
      storage.saveSetting('githubOwner', data.owner);
      storage.saveSetting('githubRepo', data.repo);
      
      await setupGitHubSync(data.token, data.owner, data.repo);
      appState.set('isSetup', true);
      
      toast.success('GitHub sync configured!');
      
      // Reload page to show main interface
      location.reload();
      
    } catch (error) {
      console.error('[Setup] Error:', error);
      toast.error(`Setup failed: ${error.message}`);
    }
  });
}

function setupEventListeners() {
  document.getElementById('add-book-btn').addEventListener('click', showAddBookModal);
  
  document.getElementById('sync-btn').addEventListener('click', async () => {
    if (syncController) {
      await syncController.sync();
    } else {
      toast.warning('GitHub sync not configured');
    }
  });
  
  document.getElementById('settings-btn').addEventListener('click', showSettings);
  
  document.getElementById('search-input').addEventListener('input', (e) => {
    appState.set('searchQuery', e.target.value);
  });
  
  document.getElementById('reader-filter').addEventListener('change', (e) => {
    appState.set('readerFilter', e.target.value);
  });
  
  document.getElementById('sort-select').addEventListener('change', (e) => {
    appState.set('sortBy', e.target.value);
  });
}

function showSettings() {
  const token = storage.loadSetting('githubToken');
  const owner = storage.loadSetting('githubOwner');
  const repo = storage.loadSetting('githubRepo');
  
  modal.show({
    title: 'Settings',
    content: `
      <div class="space-y-4">
        <div>
          <p class="text-sm font-medium text-gray-700">GitHub Owner</p>
          <p class="text-gray-900">${owner || 'Not configured'}</p>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-700">Repository</p>
          <p class="text-gray-900">${repo || 'Not configured'}</p>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-700">Token</p>
          <p class="text-gray-900">${token ? '••••••••' : 'Not configured'}</p>
        </div>
        ${syncController ? `
        <div>
          <p class="text-sm font-medium text-gray-700">Last Sync</p>
          <p class="text-gray-900">${syncController.lastSyncTime ? syncController.lastSyncTime.toLocaleString() : 'Never'}</p>
        </div>
        ` : ''}
      </div>
    `,
    buttons: [
      {
        text: 'Reconfigure',
        onClick: () => {
          modal.close();
          storage.clearSettings();
          location.reload();
        }
      },
      { text: 'Close', primary: true, onClick: () => modal.close() }
    ]
  });
}

function updateSyncButton(syncing) {
  const btn = document.getElementById('sync-btn');
  const icon = document.getElementById('sync-icon');
  const text = document.getElementById('sync-text');
  
  if (syncing) {
    btn.disabled = true;
    icon.textContent = '⏳';
    text.textContent = 'Syncing...';
  } else {
    btn.disabled = false;
    icon.textContent = '🔄';
    text.textContent = 'Sync';
  }
}

function setupOfflineIndicator() {
  const indicator = document.getElementById('offline-indicator');
  
  function updateOnlineStatus() {
    indicator.classList.toggle('show', !navigator.onLine);
  }
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
