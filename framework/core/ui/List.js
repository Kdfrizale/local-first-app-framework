/**
 * List Component
 * Utilities for rendering and managing lists
 */

class ListHelper {
  /**
   * Render a list
   * @param {Array} items - Array of items to render
   * @param {Function} renderItem - Function to render each item
   * @param {HTMLElement|string} containerOrSelector - Container element or selector
   * @param {Object} options - Options
   */
  static render(items, renderItem, containerOrSelector, options = {}) {
    const container = typeof containerOrSelector === 'string'
      ? document.querySelector(containerOrSelector)
      : containerOrSelector;

    if (!container) {
      console.warn('Container not found');
      return;
    }

    const {
      emptyMessage = 'No items to display',
      className = '',
      sortBy = null,
      filterFn = null
    } = options;

    // Filter items
    let filteredItems = items;
    if (filterFn) {
      filteredItems = items.filter(filterFn);
    }

    // Sort items
    if (sortBy) {
      filteredItems = [...filteredItems].sort((a, b) => {
        const aVal = typeof sortBy === 'function' ? sortBy(a) : a[sortBy];
        const bVal = typeof sortBy === 'function' ? sortBy(b) : b[sortBy];
        return aVal > bVal ? 1 : -1;
      });
    }

    // Clear container
    container.innerHTML = '';

    // Show empty message
    if (filteredItems.length === 0) {
      container.innerHTML = `<div class="empty-message text-gray-500 text-center py-8">${emptyMessage}</div>`;
      return;
    }

    // Render items
    const listEl = document.createElement('div');
    listEl.className = className;

    filteredItems.forEach((item, index) => {
      const itemEl = renderItem(item, index);
      
      if (typeof itemEl === 'string') {
        const div = document.createElement('div');
        div.innerHTML = itemEl;
        listEl.appendChild(div.firstElementChild);
      } else {
        listEl.appendChild(itemEl);
      }
    });

    container.appendChild(listEl);
  }

  /**
   * Create a table
   * @param {Array} items - Array of items
   * @param {Array} columns - Column definitions
   * @param {HTMLElement|string} containerOrSelector - Container element or selector
   * @param {Object} options - Options
   */
  static renderTable(items, columns, containerOrSelector, options = {}) {
    const container = typeof containerOrSelector === 'string'
      ? document.querySelector(containerOrSelector)
      : containerOrSelector;

    if (!container) {
      console.warn('Container not found');
      return;
    }

    const {
      emptyMessage = 'No items to display',
      className = 'min-w-full divide-y divide-gray-200',
      sortable = false,
      onRowClick = null
    } = options;

    // Clear container
    container.innerHTML = '';

    // Show empty message
    if (items.length === 0) {
      container.innerHTML = `<div class="empty-message text-gray-500 text-center py-8">${emptyMessage}</div>`;
      return;
    }

    // Create table
    const table = document.createElement('table');
    table.className = className;

    // Create header
    const thead = document.createElement('thead');
    thead.className = 'bg-gray-50';
    const headerRow = document.createElement('tr');
    
    columns.forEach(col => {
      const th = document.createElement('th');
      th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
      th.textContent = col.label || col.key;
      
      if (sortable && col.sortable !== false) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
          // Emit sort event (you can implement sorting logic)
          console.log('Sort by:', col.key);
        });
      }
      
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200';

    items.forEach((item, index) => {
      const row = document.createElement('tr');
      row.className = onRowClick ? 'hover:bg-gray-50 cursor-pointer' : '';
      
      if (onRowClick) {
        row.addEventListener('click', () => onRowClick(item, index));
      }

      columns.forEach(col => {
        const td = document.createElement('td');
        td.className = 'px-6 py-4 whitespace-nowrap';
        
        const value = col.render 
          ? col.render(item, index)
          : item[col.key];
        
        if (typeof value === 'string') {
          td.innerHTML = value;
        } else {
          td.appendChild(value);
        }
        
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  /**
   * Filter items based on search query
   * @param {Array} items - Array of items
   * @param {string} query - Search query
   * @param {Array|Function} searchFields - Fields to search or custom search function
   */
  static filter(items, query, searchFields) {
    if (!query) return items;

    const lowerQuery = query.toLowerCase();

    return items.filter(item => {
      if (typeof searchFields === 'function') {
        return searchFields(item, lowerQuery);
      }

      return searchFields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(lowerQuery);
      });
    });
  }

  /**
   * Sort items
   * @param {Array} items - Array of items
   * @param {string|Function} sortBy - Field name or sort function
   * @param {string} direction - 'asc' or 'desc'
   */
  static sort(items, sortBy, direction = 'asc') {
    const sorted = [...items].sort((a, b) => {
      const aVal = typeof sortBy === 'function' ? sortBy(a) : a[sortBy];
      const bVal = typeof sortBy === 'function' ? sortBy(b) : b[sortBy];
      
      if (aVal === bVal) return 0;
      
      const comparison = aVal > bVal ? 1 : -1;
      return direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Paginate items
   * @param {Array} items - Array of items
   * @param {number} page - Current page (1-indexed)
   * @param {number} perPage - Items per page
   */
  static paginate(items, page = 1, perPage = 10) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    
    return {
      items: items.slice(start, end),
      page,
      perPage,
      total: items.length,
      totalPages: Math.ceil(items.length / perPage),
      hasNext: end < items.length,
      hasPrev: page > 1
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ListHelper;
}
