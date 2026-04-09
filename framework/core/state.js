/**
 * Simple Reactive State Management
 * Provides observable state with automatic UI updates
 */

class State {
  constructor(initialState = {}) {
    this._state = { ...initialState };
    this._listeners = new Map();
    this._computed = new Map();
  }

  /**
   * Get state value
   * @param {string} key - State key
   */
  get(key) {
    // Check if it's a computed property
    if (this._computed.has(key)) {
      const computeFn = this._computed.get(key);
      return computeFn(this._state);
    }
    
    return this._state[key];
  }

  /**
   * Get entire state
   */
  getAll() {
    return { ...this._state };
  }

  /**
   * Set state value
   * @param {string|Object} keyOrObj - State key or object of key-value pairs
   * @param {any} value - Value (if key is string)
   */
  set(keyOrObj, value) {
    const updates = typeof keyOrObj === 'string' 
      ? { [keyOrObj]: value }
      : keyOrObj;

    const changedKeys = [];

    for (const [key, val] of Object.entries(updates)) {
      if (this._state[key] !== val) {
        this._state[key] = val;
        changedKeys.push(key);
      }
    }

    // Notify listeners
    changedKeys.forEach(key => this._notify(key));
  }

  /**
   * Update state by merging with existing value
   * @param {string} key - State key
   * @param {Object} updates - Updates to merge
   */
  update(key, updates) {
    const current = this._state[key];
    
    if (typeof current === 'object' && !Array.isArray(current)) {
      this.set(key, { ...current, ...updates });
    } else {
      console.warn(`Cannot update non-object state: ${key}`);
    }
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, []);
    }
    
    this._listeners.get(key).push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this._listeners.get(key);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Define computed property
   * @param {string} key - Computed property name
   * @param {Function} computeFn - Function that computes the value
   * @param {Array} dependencies - State keys this depends on
   */
  computed(key, computeFn, dependencies = []) {
    this._computed.set(key, computeFn);

    // Subscribe to dependencies and recompute
    dependencies.forEach(dep => {
      this.subscribe(dep, () => {
        this._notify(key);
      });
    });
  }

  /**
   * Internal: Notify listeners of state change
   */
  _notify(key) {
    const listeners = this._listeners.get(key);
    if (listeners) {
      const value = this.get(key);
      listeners.forEach(callback => callback(value, key));
    }
  }

  /**
   * Bind state to DOM element
   * @param {string} key - State key
   * @param {HTMLElement|string} elementOrSelector - Element or selector
   * @param {string} property - Element property to update ('textContent', 'value', 'innerHTML')
   */
  bindTo(key, elementOrSelector, property = 'textContent') {
    const element = typeof elementOrSelector === 'string'
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;

    if (!element) {
      console.warn(`Element not found: ${elementOrSelector}`);
      return;
    }

    // Initial update
    const value = this.get(key);
    element[property] = value;

    // Subscribe to changes
    this.subscribe(key, (newValue) => {
      element[property] = newValue;
    });
  }

  /**
   * Bind element to state (two-way binding for inputs)
   * @param {string} key - State key
   * @param {HTMLElement|string} elementOrSelector - Input element or selector
   */
  bindInput(key, elementOrSelector) {
    const element = typeof elementOrSelector === 'string'
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;

    if (!element) {
      console.warn(`Element not found: ${elementOrSelector}`);
      return;
    }

    // Set initial value
    element.value = this.get(key) || '';

    // Update state when input changes
    element.addEventListener('input', (e) => {
      this.set(key, e.target.value);
    });

    // Update input when state changes
    this.subscribe(key, (newValue) => {
      if (element.value !== newValue) {
        element.value = newValue || '';
      }
    });
  }

  /**
   * Reset state to initial or provided values
   * @param {Object} newState - Optional new state
   */
  reset(newState = {}) {
    this._state = { ...newState };
    
    // Notify all listeners
    for (const key of this._listeners.keys()) {
      this._notify(key);
    }
  }

  /**
   * Remove a state property
   * @param {string} key - State key
   */
  remove(key) {
    delete this._state[key];
    this._notify(key);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = State;
}
