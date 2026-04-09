/**
 * Toast Notification Component
 * Displays temporary messages to the user
 */

class Toast {
  constructor() {
    this.container = null;
    this._ensureContainer();
  }

  /**
   * Show a toast message
   * @param {string} message - Message to display
   * @param {string} type - Type: 'success', 'error', 'info', 'warning'
   * @param {number} duration - Duration in ms (0 = permanent)
   */
  show(message, type = 'info', duration = 3000) {
    const toast = this._createToast(message, type);
    this.container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove if duration > 0
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return toast;
  }

  /**
   * Show success toast
   */
  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  /**
   * Show error toast
   */
  error(message, duration = 5000) {
    return this.show(message, 'error', duration);
  }

  /**
   * Show info toast
   */
  info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  }

  /**
   * Show warning toast
   */
  warning(message, duration = 4000) {
    return this.show(message, 'warning', duration);
  }

  /**
   * Remove a toast
   */
  remove(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Create toast element
   */
  _createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.remove(toast);
    });

    return toast;
  }

  /**
   * Ensure container exists
   */
  _ensureContainer() {
    this.container = document.getElementById('toast-container');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  }
}

// Create global instance
const toast = new Toast();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Toast;
}
