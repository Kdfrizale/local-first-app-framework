/**
 * Modal Dialog Component
 * Displays modal dialogs
 */

class Modal {
  constructor() {
    this.activeModal = null;
  }

  /**
   * Show a modal
   * @param {Object} options - Modal options
   * @param {string} options.title - Modal title
   * @param {string} options.content - Modal content (HTML)
   * @param {Array} options.buttons - Array of button configs
   * @param {Function} options.onClose - Callback when modal closes
   * @param {boolean} options.closeOnEscape - Close on ESC key (default: true)
   * @param {boolean} options.closeOnBackdrop - Close on backdrop click (default: true)
   */
  show(options) {
    // Close existing modal
    if (this.activeModal) {
      this.close();
    }

    const {
      title = '',
      content = '',
      buttons = [{ text: 'OK', primary: true }],
      onClose = null,
      closeOnEscape = true,
      closeOnBackdrop = true
    } = options;

    // Create modal
    const modal = this._createModal(title, content, buttons, onClose);
    document.body.appendChild(modal);
    this.activeModal = modal;

    // Setup event listeners
    if (closeOnEscape) {
      this._escapeListener = (e) => {
        if (e.key === 'Escape') {
          this.close();
        }
      };
      document.addEventListener('keydown', this._escapeListener);
    }

    if (closeOnBackdrop) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.close();
        }
      });
    }

    // Show modal with animation
    setTimeout(() => modal.classList.add('show'), 10);

    return modal;
  }

  /**
   * Show confirmation dialog
   * @param {string} message - Message to display
   * @param {string} title - Dialog title
   * @returns {Promise<boolean>} - Resolves to true if confirmed
   */
  confirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
      this.show({
        title,
        content: `<p>${message}</p>`,
        buttons: [
          {
            text: 'Cancel',
            onClick: () => {
              this.close();
              resolve(false);
            }
          },
          {
            text: 'OK',
            primary: true,
            onClick: () => {
              this.close();
              resolve(true);
            }
          }
        ]
      });
    });
  }

  /**
   * Show alert dialog
   * @param {string} message - Message to display
   * @param {string} title - Dialog title
   */
  alert(message, title = 'Alert') {
    return new Promise((resolve) => {
      this.show({
        title,
        content: `<p>${message}</p>`,
        buttons: [
          {
            text: 'OK',
            primary: true,
            onClick: () => {
              this.close();
              resolve();
            }
          }
        ]
      });
    });
  }

  /**
   * Show prompt dialog
   * @param {string} message - Message to display
   * @param {string} defaultValue - Default input value
   * @param {string} title - Dialog title
   */
  prompt(message, defaultValue = '', title = 'Input') {
    return new Promise((resolve) => {
      const inputId = 'modal-prompt-input';
      
      this.show({
        title,
        content: `
          <p>${message}</p>
          <input type="text" id="${inputId}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="${defaultValue}" />
        `,
        buttons: [
          {
            text: 'Cancel',
            onClick: () => {
              this.close();
              resolve(null);
            }
          },
          {
            text: 'OK',
            primary: true,
            onClick: () => {
              const input = document.getElementById(inputId);
              const value = input ? input.value : defaultValue;
              this.close();
              resolve(value);
            }
          }
        ]
      });

      // Focus input
      setTimeout(() => {
        const input = document.getElementById(inputId);
        if (input) input.focus();
      }, 100);
    });
  }

  /**
   * Close active modal
   */
  close() {
    if (!this.activeModal) return;

    this.activeModal.classList.remove('show');
    
    setTimeout(() => {
      if (this.activeModal && this.activeModal.parentNode) {
        this.activeModal.parentNode.removeChild(this.activeModal);
      }
      this.activeModal = null;
    }, 300);

    if (this._escapeListener) {
      document.removeEventListener('keydown', this._escapeListener);
      this._escapeListener = null;
    }
  }

  /**
   * Create modal element
   */
  _createModal(title, content, buttons, onClose) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    
    // Generate button HTML with proper classes
    const buttonsHtml = buttons.map((btn, index) => {
      const classes = btn.primary 
        ? 'modal-button px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
        : 'modal-button px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400';
      
      return `<button class="${classes} ${btn.className || ''}" data-action="${btn.text}" data-index="${index}">${btn.text}</button>`;
    }).join('');

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close-btn" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${buttonsHtml}
        </div>
      </div>
    `;

    // Setup button click listeners
    const buttonElements = modal.querySelectorAll('.modal-button');
    buttonElements.forEach((buttonEl) => {
      const index = parseInt(buttonEl.dataset.index, 10);
      const btn = buttons[index];
      if (btn && btn.onClick) {
        buttonEl.addEventListener('click', btn.onClick);
      }
    });

    // Close button
    modal.querySelector('.modal-close-btn').addEventListener('click', () => {
      if (onClose) onClose();
      this.close();
    });

    return modal;
  }
}

// Create global instance
const modal = new Modal();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Modal;
}
