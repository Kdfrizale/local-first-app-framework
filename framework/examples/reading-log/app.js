/**
 * Reading Log App
 * Track books read by family members
 */

class ReadingLogApp extends App {
  constructor() {
    super({
      appName: 'reading-log',
      dataPath: 'apps/reading-log/data.json'
    });
    
    this.books = [];
    this.readers = [];
    this.selectedReaders = [];
    
    // Filters
    this.searchQuery = '';
    this.filterReader = '';
    this.sortBy = 'date-desc';
  }

  async onInit() {
    this.setDefaultDate();
    this.setupEventHandlers();
    this.setupISBNLookup();
  }

  onDataLoaded(data, source) {
    console.log('[ReadingLog] Data loaded from:', source);
    this.books = data.books || [];
    this.readers = data.readers || [];
    
    // Also extract readers from books (in case readers array is incomplete)
    this.books.forEach(book => {
      (book.readers || []).forEach(r => {
        if (r && !this.readers.includes(r)) {
          this.readers.push(r);
        }
      });
    });
    
    this.updateReaderSelect();
    this.updateFilterReaderSelect();
    this.render();
    this.updateStats();
  }

  getData() {
    return {
      books: this.books,
      readers: this.readers
    };
  }

  // ============================================================
  // SETUP
  // ============================================================

  setDefaultDate() {
    const dateInput = document.getElementById('date-read-input');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  }

  setupEventHandlers() {
    // Sync & Settings
    document.getElementById('sync-btn').addEventListener('click', () => this.sync());
    document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
    
    // Add book form
    document.getElementById('add-book-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addBook(e.target);
    });
    
    // Reader multi-select
    document.getElementById('reader-select').addEventListener('change', (e) => {
      this.handleReaderSelect(e.target.value);
      e.target.value = '';
    });
    
    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.render();
    });
    
    // Filter by reader
    document.getElementById('filter-reader').addEventListener('change', (e) => {
      this.filterReader = e.target.value;
      this.render();
    });
    
    // Sort
    document.getElementById('sort-select').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render();
    });
  }

  // ============================================================
  // ISBN LOOKUP
  // ============================================================

  setupISBNLookup() {
    const btn = document.getElementById('isbn-lookup-btn');
    const input = document.getElementById('isbn-input');
    
    btn.addEventListener('click', () => this.lookupISBN());
    
    // Allow Enter key to trigger lookup
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.lookupISBN();
      }
    });
  }

  async lookupISBN() {
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
        return;
      }
      
      // Fill in the form fields
      document.getElementById('title-input').value = bookData.title || '';
      
      // Get authors
      const authors = bookData.authors?.map(a => a.name).join(', ') || '';
      document.getElementById('author-input').value = authors;
      
      // Get cover image URL (prefer medium size)
      const coverUrl = bookData.cover?.medium || bookData.cover?.large || bookData.cover?.small || '';
      if (coverUrl) {
        this.showCoverPreview(coverUrl);
      } else {
        this.clearCoverPreview();
      }
      
      // Store ISBN for reference
      document.getElementById('isbn-input').dataset.resolvedIsbn = isbn;
      
      this._showToast('Book found! Review and add.', 'success');
      
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
  // READER MULTI-SELECT
  // ============================================================

  updateReaderSelect() {
    const select = document.getElementById('reader-select');
    const options = ['<option value="">Select reader...</option>'];
    
    // Show ALL readers (sorted alphabetically)
    const sortedReaders = [...this.readers].sort((a, b) => a.localeCompare(b));
    sortedReaders.forEach(reader => {
      const selected = this.selectedReaders.includes(reader);
      options.push(`<option value="${this.escapeHtml(reader)}" ${selected ? 'disabled' : ''}>${this.escapeHtml(reader)}${selected ? ' ✓' : ''}</option>`);
    });
    
    options.push('<option value="__new__">+ Add new reader</option>');
    select.innerHTML = options.join('');
  }

  updateFilterReaderSelect() {
    const select = document.getElementById('filter-reader');
    const options = ['<option value="">All Readers</option>'];
    
    const sortedReaders = [...this.readers].sort((a, b) => a.localeCompare(b));
    sortedReaders.forEach(reader => {
      options.push(`<option value="${this.escapeHtml(reader)}">${this.escapeHtml(reader)}</option>`);
    });
    
    select.innerHTML = options.join('');
  }

  handleReaderSelect(value) {
    if (!value) return;
    
    if (value === '__new__') {
      this.promptNewReader();
    } else if (!this.selectedReaders.includes(value)) {
      this.selectedReaders.push(value);
      this.renderSelectedReaders();
      this.updateReaderSelect();
    }
  }

  async promptNewReader() {
    const name = await modal.prompt('Enter reader name:', '');
    if (name && name.trim()) {
      const readerName = name.trim();
      if (!this.readers.includes(readerName)) {
        this.readers.push(readerName);
      }
      if (!this.selectedReaders.includes(readerName)) {
        this.selectedReaders.push(readerName);
      }
      this.renderSelectedReaders();
      this.updateReaderSelect();
    }
  }

  renderSelectedReaders() {
    const container = document.getElementById('selected-readers');
    container.innerHTML = this.selectedReaders.map(reader => `
      <span class="reader-tag">
        ${this.escapeHtml(reader)}
        <button type="button" onclick="app.removeSelectedReader('${this.escapeHtml(reader)}')">&times;</button>
      </span>
    `).join('');
    
    document.getElementById('readers-input').value = JSON.stringify(this.selectedReaders);
  }

  removeSelectedReader(reader) {
    this.selectedReaders = this.selectedReaders.filter(r => r !== reader);
    this.renderSelectedReaders();
    this.updateReaderSelect();
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
      coverImage: formData.get('coverImage') || '', // Base64 cached cover
      readers: [...this.selectedReaders],
      dateRead: formData.get('dateRead') || new Date().toISOString().split('T')[0],
      rating: parseInt(formData.get('rating')) || 0,
      notes: formData.get('notes')?.trim() || '',
      createdAt: new Date().toISOString()
    };
    
    this.books.unshift(book);
    
    // Reset form
    form.reset();
    this.selectedReaders = [];
    this.renderSelectedReaders();
    this.clearCoverPreview();
    delete isbnInput.dataset.resolvedIsbn;
    this.setDefaultDate();
    
    this.render();
    this.updateStats();
    this.saveData();
    
    this._showToast('Book added!', 'success');
  }

  editBook(id) {
    const book = this.books.find(b => b.id === id);
    if (!book) return;
    
    const readersHtml = this.readers.map(r => 
      `<option value="${this.escapeHtml(r)}" ${(book.readers || []).includes(r) ? 'selected' : ''}>${this.escapeHtml(r)}</option>`
    ).join('');
    
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
            <label class="block text-sm font-medium text-gray-700 mb-1">Reader(s)</label>
            <select name="readers" multiple class="w-full px-3 py-2 border border-gray-300 rounded-lg" style="height: 100px;">
              ${readersHtml}
            </select>
            <p class="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Date Read</label>
              <input type="date" name="dateRead" value="${book.dateRead || ''}"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <select name="rating" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select...</option>
                ${[5,4,3,2,1].map(n => `<option value="${n}" ${book.rating === n ? 'selected' : ''}>${'⭐'.repeat(n)} (${n})</option>`).join('')}
              </select>
            </div>
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
            const selectedReaders = Array.from(form.querySelector('select[name="readers"]').selectedOptions).map(o => o.value);
            
            const idx = this.books.findIndex(b => b.id === id);
            if (idx !== -1) {
              this.books[idx] = {
                ...this.books[idx],
                title: formData.get('title').trim(),
                author: formData.get('author')?.trim() || '',
                isbn: formData.get('isbn')?.replace(/[-\s]/g, '').trim() || '',
                coverImage: formData.get('coverImage') || '',
                readers: selectedReaders,
                dateRead: formData.get('dateRead') || '',
                rating: parseInt(formData.get('rating')) || 0,
                notes: formData.get('notes')?.trim() || '',
                updatedAt: new Date().toISOString()
              };
              
              this.render();
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
      if (btn) {
        btn.addEventListener('click', () => this.lookupISBNInEditModal());
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
      btn.textContent = '🔍';
    }
  }

  deleteBook(id) {
    modal.confirm('Delete this book from your reading log?', 'Delete Book').then(confirmed => {
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
        (book.readers || []).some(r => r.toLowerCase().includes(this.searchQuery)) ||
        (book.notes || '').toLowerCase().includes(this.searchQuery)
      );
    }
    
    // Apply reader filter
    if (this.filterReader) {
      filteredBooks = filteredBooks.filter(book => 
        (book.readers || []).includes(this.filterReader)
      );
    }
    
    // Apply sorting
    filteredBooks.sort((a, b) => {
      switch (this.sortBy) {
        case 'date-desc':
          return (b.dateRead || '').localeCompare(a.dateRead || '');
        case 'date-asc':
          return (a.dateRead || '').localeCompare(b.dateRead || '');
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'rating-asc':
          return (a.rating || 0) - (b.rating || 0);
        default:
          return 0;
      }
    });
    
    if (filteredBooks.length === 0) {
      list.innerHTML = `<div class="p-8 text-center text-gray-400">
        ${this.searchQuery || this.filterReader ? 'No books match your filters.' : 'No books yet. Add your first book above!'}
      </div>`;
      return;
    }
    
    list.innerHTML = filteredBooks.map(book => `
      <div class="p-4 hover:bg-gray-50 transition">
        <div class="flex justify-between items-start">
          <div class="flex gap-4 flex-1">
            ${book.coverImage ? `
              <img src="${book.coverImage}" alt="Cover" class="w-12 h-18 object-cover rounded shadow flex-shrink-0">
            ` : `
              <div class="w-12 h-18 bg-gray-200 rounded flex items-center justify-center text-gray-400 flex-shrink-0 text-2xl">📚</div>
            `}
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900">${this.escapeHtml(book.title)}</h3>
              ${book.author ? `<p class="text-sm text-gray-600">by ${this.escapeHtml(book.author)}</p>` : ''}
              
              <div class="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                ${book.readers && book.readers.length ? `
                  <span class="flex items-center gap-1">
                    👤 ${book.readers.map(r => this.escapeHtml(r)).join(', ')}
                  </span>
                ` : ''}
                ${book.dateRead ? `<span>📅 ${book.dateRead}</span>` : ''}
                ${book.rating ? `<span>${'⭐'.repeat(book.rating)}</span>` : ''}
                ${book.isbn ? `<span class="text-xs text-gray-400">ISBN: ${book.isbn}</span>` : ''}
              </div>
              
              ${book.notes ? `
                <p class="mt-2 text-sm text-gray-600 italic">"${this.escapeHtml(book.notes)}"</p>
              ` : ''}
            </div>
          </div>
          
          <div class="flex gap-1 ml-4 flex-shrink-0">
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
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    
    const booksThisYear = this.books.filter(b => {
      if (!b.dateRead) return false;
      return new Date(b.dateRead).getFullYear() === thisYear;
    });
    
    const booksThisMonth = booksThisYear.filter(b => {
      return new Date(b.dateRead).getMonth() === thisMonth;
    });
    
    const uniqueReaders = new Set();
    this.books.forEach(b => (b.readers || []).forEach(r => uniqueReaders.add(r)));
    
    document.getElementById('stat-total').textContent = this.books.length;
    document.getElementById('stat-year').textContent = booksThisYear.length;
    document.getElementById('stat-month').textContent = booksThisMonth.length;
    document.getElementById('stat-readers').textContent = uniqueReaders.size;
  }

  // ============================================================
  // UTILITIES
  // ============================================================

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
  app = new ReadingLogApp();
  await app.init();
});
