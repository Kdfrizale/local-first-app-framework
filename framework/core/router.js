/**
 * Simple Hash-based Router
 * Handles client-side navigation without page reloads
 */

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.params = {};
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => this._handleRouteChange());
    
    // Handle initial route
    this._handleRouteChange();
  }

  /**
   * Register a route
   * @param {string} path - Route path (e.g., '/', '/books', '/books/:id')
   * @param {Function} handler - Route handler function
   */
  on(path, handler) {
    this.routes.set(path, handler);
  }

  /**
   * Navigate to a route
   * @param {string} path - Path to navigate to
   */
  navigate(path) {
    window.location.hash = path;
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Get current route
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Get route parameters
   */
  getParams() {
    return this.params;
  }

  /**
   * Internal: Handle route changes
   */
  _handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/';
    
    // Find matching route
    let matchedRoute = null;
    let matchedHandler = null;
    let params = {};

    for (const [routePath, handler] of this.routes.entries()) {
      const match = this._matchRoute(routePath, hash);
      if (match) {
        matchedRoute = routePath;
        matchedHandler = handler;
        params = match.params;
        break;
      }
    }

    if (matchedHandler) {
      this.currentRoute = hash;
      this.params = params;
      matchedHandler(params);
    } else {
      console.warn(`No route found for: ${hash}`);
    }
  }

  /**
   * Internal: Match route path with current hash
   */
  _matchRoute(routePath, hash) {
    const routeParts = routePath.split('/').filter(p => p);
    const hashParts = hash.split('/').filter(p => p);

    // Different number of parts = no match (unless route has wildcard)
    if (routeParts.length !== hashParts.length && !routePath.includes('*')) {
      return null;
    }

    const params = {};
    
    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const hashPart = hashParts[i];

      // Parameter (e.g., :id)
      if (routePart.startsWith(':')) {
        const paramName = routePart.slice(1);
        params[paramName] = hashPart;
      }
      // Wildcard
      else if (routePart === '*') {
        params.wildcard = hashParts.slice(i).join('/');
        break;
      }
      // Exact match required
      else if (routePart !== hashPart) {
        return null;
      }
    }

    return { params };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Router;
}
