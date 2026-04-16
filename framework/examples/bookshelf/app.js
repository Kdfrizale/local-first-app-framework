/**
 * Bookshelf App
 * Track books you own
 */

class BookshelfApp extends App {
  constructor() {
    super({
      appName: 'bookshelf',
      dataPath: 'apps/bookshelf/data.json'
    });
    
    this.books = [];
    
    // Filters
    this.searchQuery = '';
    this.sortBy = 'added-desc';
    this.filterRead = 'all'; // all, read, unread
    this.filterGenre = ''; // empty = all
  }

  async onInit() {
    this.setupEventHandlers();
    this.setupISBNLookup();
  }

  onDataLoaded(data, source) {
    console.log('[Bookshelf] Data loaded from:', source);
    this.books = data.books || [];
    this.render();
    this.updateStats();
    this.updateGenreFilter();
  }

  getData() {
    return {
      books: this.books
    };
  }

  // ============================================================
  // SETUP
  // ============================================================

  setupEventHandlers() {
    // Sync & Settings
    document.getElementById('sync-btn').addEventListener('click', () => this.sync());
    document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
    
    // Add book form
    document.getElementById('add-book-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addBook(e.target);
    });
    
    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.render();
    });
    
    // Sort
    document.getElementById('sort-select').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render();
    });
    
    // Filter by read status
    document.getElementById('filter-read').addEventListener('change', (e) => {
      this.filterRead = e.target.value;
      this.render();
    });
    
    // Filter by genre
    document.getElementById('filter-genre').addEventListener('change', (e) => {
      this.filterGenre = e.target.value;
      this.render();
    });
  }

  // ============================================================
  // ISBN LOOKUP
  // ============================================================

  setupISBNLookup() {
    const btn = document.getElementById('isbn-lookup-btn');
    const input = document.getElementById('isbn-input');
    
    // Button click: lookup but don't auto-submit (manual mode)
    btn.addEventListener('click', () => this.lookupISBN(false));
    
    // Enter key: lookup AND auto-submit (scan mode)
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.lookupISBN(true);
      }
    });
  }

  async lookupISBN(autoSubmit = true) {
    const input = document.getElementById('isbn-input');
    const btn = document.getElementById('isbn-lookup-btn');
    const icon = document.getElementById('isbn-lookup-icon');
    
    // Clean ISBN (remove dashes and spaces)
    const isbn = input.value.replace(/[-\s]/g, '').trim();
    
    if (!isbn) {
      this._showToast('Please enter an ISBN', 'warning');
      return;
    }
    
    // Basic ISBN validation (10 or 13 digits)
    if (!/^\d{10}(\d{3})?$/.test(isbn) && !/^\d{9}[Xx]$/.test(isbn)) {
      this._showToast('Invalid ISBN format', 'error');
      return;
    }
    
    // Show loading state
    btn.disabled = true;
    icon.innerHTML = '<span class="animate-spin">⏳</span>';
    
    try {
      // Use Open Library API (free, no key required)
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch book data');
      }
      
      const data = await response.json();
      const bookData = data[`ISBN:${isbn}`];
      
      if (!bookData) {
        this._showToast('Book not found. Try entering manually.', 'warning');
        btn.disabled = false;
        icon.textContent = '🔍';
        return;
      }
      
      // Fill in the form fields
      document.getElementById('title-input').value = bookData.title || '';
      
      // Get authors
      const authors = bookData.authors?.map(a => a.name).join(', ') || '';
      document.getElementById('author-input').value = authors;
      
      // Get genre/subjects (use smart selection from subjects array)
      const genre = this.selectBestGenre(bookData.subjects);
      document.getElementById('genre-input').value = genre;
      
      // Get cover image URL (prefer medium size)
      const coverUrl = bookData.cover?.medium || bookData.cover?.large || bookData.cover?.small || '';
      if (coverUrl) {
        this.showCoverPreview(coverUrl);
      } else {
        this.clearCoverPreview();
      }
      
      // Store ISBN for reference
      document.getElementById('isbn-input').dataset.resolvedIsbn = isbn;
      
      // Auto-submit if enabled (when triggered by Enter key)
      if (autoSubmit) {
        // Small delay to ensure form fields are populated
        setTimeout(() => {
          const form = document.getElementById('add-book-form');
          this.addBook(form);
          
          // Reset focus to ISBN input for next scan
          setTimeout(() => {
            input.focus();
          }, 50);
        }, 50);
      } else {
        this._showToast('Book found! Review and add.', 'success');
      }
      
    } catch (error) {
      console.error('[ISBN Lookup] Error:', error);
      this._showToast('Lookup failed. Try again or enter manually.', 'error');
    } finally {
      btn.disabled = false;
      icon.textContent = '🔍';
    }
  }

  showCoverPreview(url) {
    const preview = document.getElementById('cover-preview');
    const img = document.getElementById('cover-image');
    const hiddenInput = document.getElementById('cover-image-input');
    
    img.src = url;
    hiddenInput.value = url;
    preview.classList.remove('hidden');
  }

  clearCoverPreview() {
    const preview = document.getElementById('cover-preview');
    const hiddenInput = document.getElementById('cover-image-input');
    
    preview.classList.add('hidden');
    hiddenInput.value = '';
  }

  // ============================================================
  // BOOK OPERATIONS
  // ============================================================

  addBook(form) {
    const formData = new FormData(form);
    const isbnInput = document.getElementById('isbn-input');
    
    const book = {
      id: this.generateId(),
      title: formData.get('title').trim(),
      author: formData.get('author')?.trim() || '',
      isbn: isbnInput.dataset.resolvedIsbn || isbnInput.value.replace(/[-\s]/g, '').trim() || '',
      genre: formData.get('genre')?.trim() || '',
      isRead: formData.get('isRead') === 'on',
      coverImage: formData.get('coverImage') || '',
      notes: formData.get('notes')?.trim() || '',
      createdAt: new Date().toISOString()
    };
    
    this.books.unshift(book);
    
    // Reset form
    form.reset();
    this.clearCoverPreview();
    delete isbnInput.dataset.resolvedIsbn;
    
    this.render();
    this.updateStats();
    this.updateGenreFilter();
    this.saveData();
    
    this._showToast('Book added!', 'success');
  }

  editBook(id) {
    const book = this.books.find(b => b.id === id);
    if (!book) return;
    
    modal.show({
      title: '✏️ Edit Book',
      content: `
        <form id="edit-book-form" class="space-y-4">
          <div class="flex gap-4">
            <div class="flex-shrink-0">
              ${book.coverImage ? `
                <img id="edit-cover-preview" src="${book.coverImage}" alt="Cover" class="w-16 h-24 object-cover rounded shadow">
              ` : `
                <div id="edit-cover-preview" class="w-16 h-24 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-2xl">📚</div>
              `}
              <input type="hidden" name="coverImage" id="edit-cover-input" value="${book.coverImage || ''}">
            </div>
            <div class="flex-1 space-y-2">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" name="title" required value="${this.escapeHtml(book.title)}"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                <div class="flex flex-wrap gap-2">
                  <input type="text" name="isbn" id="edit-isbn-input" value="${this.escapeHtml(book.isbn || '')}"
                    class="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Optional">
                  <button type="button" id="edit-isbn-lookup-btn" class="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 sm:flex-none">🔍 Lookup</button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Author</label>
            <input type="text" name="author" id="edit-author-input" value="${this.escapeHtml(book.author || '')}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Genre</label>
            <input type="text" name="genre" id="edit-genre-input" value="${this.escapeHtml(book.genre || '')}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Fiction, Science, History">
          </div>
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isRead" ${book.isRead ? 'checked' : ''}
                class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500">
              <span class="text-sm font-medium text-gray-700">Mark as read</span>
            </label>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${this.escapeHtml(book.notes || '')}</textarea>
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', onClick: () => modal.close() },
        {
          text: 'Save Changes',
          primary: true,
          onClick: () => {
            const form = document.getElementById('edit-book-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }
            
            const formData = new FormData(form);
            
            const idx = this.books.findIndex(b => b.id === id);
            if (idx !== -1) {
              this.books[idx] = {
                ...this.books[idx],
                title: formData.get('title').trim(),
                author: formData.get('author')?.trim() || '',
                isbn: formData.get('isbn')?.replace(/[-\s]/g, '').trim() || '',
                genre: formData.get('genre')?.trim() || '',
                isRead: formData.get('isRead') === 'on',
                coverImage: formData.get('coverImage') || '',
                notes: formData.get('notes')?.trim() || '',
                updatedAt: new Date().toISOString()
              };
              
              this.render();
              this.updateStats();
              this.updateGenreFilter();
              this.saveData();
              this._showToast('Book updated!', 'success');
            }
            
            modal.close();
          }
        }
      ]
    });
    
    // Setup ISBN lookup in edit modal
    setTimeout(() => {
      const btn = document.getElementById('edit-isbn-lookup-btn');
      const input = document.getElementById('edit-isbn-input');
      if (btn) {
        btn.addEventListener('click', () => this.lookupISBNInEditModal());
      }
      // Enter key in edit modal
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.lookupISBNInEditModal();
          }
        });
      }
    }, 100);
  }

  async lookupISBNInEditModal() {
    const input = document.getElementById('edit-isbn-input');
    const btn = document.getElementById('edit-isbn-lookup-btn');
    
    const isbn = input.value.replace(/[-\s]/g, '').trim();
    
    if (!isbn) {
      this._showToast('Please enter an ISBN', 'warning');
      return;
    }
    
    btn.disabled = true;
    btn.textContent = '⏳';
    
    try {
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const data = await response.json();
      const bookData = data[`ISBN:${isbn}`];
      
      if (!bookData) {
        this._showToast('Book not found', 'warning');
        return;
      }
      
      // Update title if empty
      const titleInput = document.querySelector('#edit-book-form input[name="title"]');
      if (!titleInput.value && bookData.title) {
        titleInput.value = bookData.title;
      }
      
      // Update author if empty
      const authorInput = document.getElementById('edit-author-input');
      if (!authorInput.value && bookData.authors) {
        authorInput.value = bookData.authors.map(a => a.name).join(', ');
      }
      
      // Update genre if available (use smart selection)
      const genreInput = document.getElementById('edit-genre-input');
      if (genreInput && !genreInput.value && bookData.subjects) {
        genreInput.value = this.selectBestGenre(bookData.subjects);
      }
      
      // Update cover URL
      const coverUrl = bookData.cover?.medium || bookData.cover?.large || bookData.cover?.small || '';
      if (coverUrl) {
        const preview = document.getElementById('edit-cover-preview');
        const hiddenInput = document.getElementById('edit-cover-input');
        
        // Replace placeholder div with img if needed
        if (preview.tagName === 'DIV') {
          const img = document.createElement('img');
          img.id = 'edit-cover-preview';
          img.src = coverUrl;
          img.alt = 'Cover';
          img.className = 'w-16 h-24 object-cover rounded shadow';
          preview.replaceWith(img);
        } else {
          preview.src = coverUrl;
        }
        
        hiddenInput.value = coverUrl;
      }
      
      this._showToast('Book data updated!', 'success');
      
    } catch (error) {
      console.error('[ISBN Lookup] Error:', error);
      this._showToast('Lookup failed', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🔍 Lookup';
    }
  }

  deleteBook(id) {
    modal.confirm('Delete this book from your bookshelf?', 'Delete Book').then(confirmed => {
      if (!confirmed) return;
      
      this.books = this.books.filter(b => b.id !== id);
      this.render();
      this.updateStats();
      this.saveData();
      
      this._showToast('Book deleted', 'info');
    });
  }

  // ============================================================
  // RENDERING
  // ============================================================

  render() {
    const list = document.getElementById('books-list');
    
    // Start with all books
    let filteredBooks = [...this.books];
    
    // Apply search filter
    if (this.searchQuery) {
      filteredBooks = filteredBooks.filter(book => 
        book.title.toLowerCase().includes(this.searchQuery) ||
        (book.author || '').toLowerCase().includes(this.searchQuery) ||
        (book.genre || '').toLowerCase().includes(this.searchQuery) ||
        (book.notes || '').toLowerCase().includes(this.searchQuery) ||
        (book.isbn || '').includes(this.searchQuery)
      );
    }
    
    // Apply read status filter
    if (this.filterRead !== 'all') {
      filteredBooks = filteredBooks.filter(book => {
        if (this.filterRead === 'read') return book.isRead;
        if (this.filterRead === 'unread') return !book.isRead;
        return true;
      });
    }
    
    // Apply genre filter
    if (this.filterGenre) {
      filteredBooks = filteredBooks.filter(book => 
        (book.genre || '').toLowerCase() === this.filterGenre.toLowerCase()
      );
    }
    
    // Apply sorting
    filteredBooks.sort((a, b) => {
      switch (this.sortBy) {
        case 'added-desc':
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        case 'added-asc':
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'author-asc':
          return (a.author || '').localeCompare(b.author || '');
        case 'author-desc':
          return (b.author || '').localeCompare(a.author || '');
        case 'genre-asc':
          return (a.genre || '').localeCompare(b.genre || '');
        case 'genre-desc':
          return (b.genre || '').localeCompare(a.genre || '');
        default:
          return 0;
      }
    });
    
    if (filteredBooks.length === 0) {
      list.innerHTML = `<div class="p-8 text-center text-gray-400">
        ${this.searchQuery || this.filterRead !== 'all' || this.filterGenre ? 'No books match your filters.' : 'No books yet. Add your first book above!'}
      </div>`;
      return;
    }
    
    list.innerHTML = filteredBooks.map(book => `
      <div class="p-4 hover:bg-gray-50 transition border-b border-gray-100 last:border-0">
        <div class="flex justify-between items-start">
          <div class="flex gap-4 flex-1">
            ${book.coverImage ? `
              <img src="${book.coverImage}" alt="Cover" class="w-12 h-18 object-cover rounded shadow flex-shrink-0">
            ` : `
              <div class="w-12 h-18 bg-gray-200 rounded flex items-center justify-center text-gray-400 flex-shrink-0 text-2xl">📚</div>
            `}
            <div class="flex-1 min-w-0">
              <div class="flex items-start gap-2">
                <h3 class="font-semibold text-gray-900 flex-1">${this.escapeHtml(book.title)}</h3>
                ${book.isRead ? '<span class="text-green-600 text-sm">✓ Read</span>' : '<span class="text-gray-400 text-sm">○ Unread</span>'}
              </div>
              ${book.author ? `<p class="text-sm text-gray-600">by ${this.escapeHtml(book.author)}</p>` : ''}
              
              <div class="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                ${book.genre ? `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">${this.escapeHtml(book.genre)}</span>` : ''}
                ${book.isbn ? `<span class="text-xs text-gray-400">ISBN: ${book.isbn}</span>` : ''}
              </div>
              
              ${book.notes ? `
                <p class="mt-2 text-sm text-gray-600 italic">"${this.escapeHtml(book.notes)}"</p>
              ` : ''}
            </div>
          </div>
          
          <div class="flex gap-1 ml-4 flex-shrink-0">
            <button onclick="app.toggleRead('${book.id}')" 
              class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
              title="${book.isRead ? 'Mark as unread' : 'Mark as read'}">${book.isRead ? '✓' : '○'}</button>
            <button onclick="app.editBook('${book.id}')" 
              class="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition"
              title="Edit">✏️</button>
            <button onclick="app.deleteBook('${book.id}')" 
              class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
              title="Delete">🗑️</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  updateStats() {
    const readCount = this.books.filter(b => b.isRead).length;
    document.getElementById('stat-total').textContent = this.books.length;
    document.getElementById('stat-read').textContent = readCount;
    document.getElementById('stat-unread').textContent = this.books.length - readCount;
  }

  updateGenreFilter() {
    const select = document.getElementById('filter-genre');
    const genres = new Set();
    
    this.books.forEach(book => {
      if (book.genre) genres.add(book.genre);
    });
    
    const sortedGenres = Array.from(genres).sort();
    
    select.innerHTML = '<option value="">All Genres</option>' + 
      sortedGenres.map(g => `<option value="${this.escapeHtml(g)}">${this.escapeHtml(g)}</option>`).join('');
  }

  toggleRead(id) {
    const book = this.books.find(b => b.id === id);
    if (!book) return;
    
    book.isRead = !book.isRead;
    this.render();
    this.updateStats();
    this.saveData();
    
    this._showToast(book.isRead ? 'Marked as read!' : 'Marked as unread', 'success');
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  normalizeGenre(genreName) {
    if (!genreName) return '';
    
    // Replace underscores and dashes with spaces
    let normalized = genreName.replace(/[_-]/g, ' ');
    
    // Remove extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    // Convert to Title Case (capitalize first letter of each word)
    normalized = normalized
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return normalized;
  }

  selectBestGenre(subjects) {
    // Common book genres to prioritize
    const commonGenres = [
      'Fiction', 'Nonfiction', 'Science Fiction', 'Fantasy', 'Mystery', 
      'Thriller', 'Romance', 'Historical Fiction', 'Biography', 'Autobiography',
      'History', 'Science', 'Self-Help', 'Business', 'Philosophy',
      'Psychology', 'Poetry', 'Drama', 'Horror', 'Adventure',
      'Young Adult', 'Children', 'Graphic Novel', 'Comedy', 'Humor',
      'Crime', 'Detective', 'Literary Fiction', 'Contemporary Fiction',
      'Classic Literature', 'Religion', 'Spirituality', 'Travel',
      'Cookbook', 'Art', 'Music', 'Sports', 'True Crime',
      'Memoir', 'Essay', 'Short Stories', 'Education', 'Politics'
    ];
    
    if (!subjects || !Array.isArray(subjects)) return '';
    
    // First pass: Look for exact matches with common genres
    for (const genre of commonGenres) {
      const found = subjects.find(s => {
        if (!s.name) return false;
        const normalized = this.normalizeGenre(s.name);
        return normalized.toLowerCase() === genre.toLowerCase();
      });
      if (found) return this.normalizeGenre(found.name);
    }
    
    // Second pass: Look for partial matches
    for (const genre of commonGenres) {
      const found = subjects.find(s => {
        if (!s.name) return false;
        const normalized = this.normalizeGenre(s.name);
        return normalized.toLowerCase().includes(genre.toLowerCase());
      });
      if (found) return this.normalizeGenre(found.name);
    }
    
    // Third pass: Skip translation/technical subjects, get first reasonable subject
    const skipPatterns = ['translation', 'language', 'open library', 'staff picks', 'philology'];
    for (const subject of subjects) {
      const name = subject.name || '';
      const normalized = this.normalizeGenre(name);
      const isSkippable = skipPatterns.some(pattern => 
        normalized.toLowerCase().includes(pattern)
      );
      if (!isSkippable && normalized) return normalized;
    }
    
    // Fallback: Return first subject if available, normalized
    return this.normalizeGenre(subjects[0]?.name || '');
  }

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
  app = new BookshelfApp();
  await app.init();
});
