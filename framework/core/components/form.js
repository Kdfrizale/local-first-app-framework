/**
 * Form Helper Component
 * Utilities for working with forms
 */

class FormHelper {
  /**
   * Get form data as object
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   * @returns {Object} Form data
   */
  static getData(formOrSelector) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;

    if (!form) {
      console.warn('Form not found');
      return {};
    }

    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
      // Handle multiple values (checkboxes)
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    }

    return data;
  }

  /**
   * Set form data from object
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   * @param {Object} data - Data to set
   */
  static setData(formOrSelector, data) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;

    if (!form) {
      console.warn('Form not found');
      return;
    }

    for (const [key, value] of Object.entries(data)) {
      const elements = form.elements[key];
      
      if (!elements) continue;

      // Handle multiple elements (radio buttons, checkboxes)
      if (elements.length) {
        Array.from(elements).forEach(el => {
          if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = Array.isArray(value) 
              ? value.includes(el.value)
              : el.value === value;
          } else {
            el.value = value;
          }
        });
      } else {
        if (elements.type === 'checkbox') {
          elements.checked = !!value;
        } else {
          elements.value = value;
        }
      }
    }
  }

  /**
   * Reset form
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   */
  static reset(formOrSelector) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;

    if (form) {
      form.reset();
    }
  }

  /**
   * Validate form
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   * @returns {Object} { valid: boolean, errors: Array }
   */
  static validate(formOrSelector) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;

    if (!form) {
      return { valid: false, errors: ['Form not found'] };
    }

    const errors = [];

    // Use HTML5 validation
    if (!form.checkValidity()) {
      const elements = form.elements;
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        if (!element.checkValidity()) {
          errors.push({
            field: element.name,
            message: element.validationMessage,
            element: element
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Show validation errors
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   * @param {Array} errors - Array of error objects
   */
  static showErrors(formOrSelector, errors) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;

    if (!form) return;

    // Clear existing errors
    form.querySelectorAll('.error-message').forEach(el => el.remove());
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    // Show new errors
    errors.forEach(error => {
      const element = error.element || form.elements[error.field];
      
      if (element) {
        element.classList.add('error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message text-red-600 text-sm mt-1';
        errorDiv.textContent = error.message;
        
        element.parentNode.insertBefore(errorDiv, element.nextSibling);
      }
    });
  }

  /**
   * Clear validation errors
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   */
  static clearErrors(formOrSelector) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;

    if (!form) return;

    form.querySelectorAll('.error-message').forEach(el => el.remove());
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  }

  /**
   * Submit handler with validation
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   * @param {Function} onSubmit - Submit handler function
   */
  static onSubmit(formOrSelector, onSubmit) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const validation = FormHelper.validate(form);
      
      if (validation.valid) {
        FormHelper.clearErrors(form);
        const data = FormHelper.getData(form);
        await onSubmit(data, form);
      } else {
        FormHelper.showErrors(form, validation.errors);
      }
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormHelper;
}
