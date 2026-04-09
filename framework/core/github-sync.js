/**
 * GitHub Sync Engine
 * Handles all interactions with GitHub API for data synchronization
 */

class GitHubSync {
  constructor(config) {
    this.token = config.token;
    this.owner = config.owner;
    this.repo = config.repo;
    this.branch = config.branch || 'main';
    this.apiBase = 'https://api.github.com';
    
    // Rate limiting
    this.rateLimit = {
      remaining: 5000,
      reset: null
    };
    
    // Cache for ETags
    this.etagCache = new Map();
  }

  /**
   * Test authentication and get user info
   */
  async testAuth() {
    try {
      console.log('[GitHubSync] Testing authentication...');
      const response = await this._request('/user');
      console.log('[GitHubSync] Auth successful:', response.login);
      return {
        success: true,
        user: response.login,
        name: response.name
      };
    } catch (error) {
      console.error('[GitHubSync] Auth failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Read a file from the repository
   * @param {string} path - File path in repo (e.g., 'apps/reading-log/data.json')
   * @returns {Object} - { content, sha, etag }
   */
  async readFile(path) {
    try {
      const url = `/repos/${this.owner}/${this.repo}/contents/${path}`;
      const etag = this.etagCache.get(path);
      
      const response = await this._request(url, {
        headers: etag ? { 'If-None-Match': etag } : {}
      });

      // 304 Not Modified - content hasn't changed
      if (response.status === 304) {
        return { cached: true };
      }

      // Decode base64 content
      const content = JSON.parse(atob(response.content));
      
      // Store ETag for future requests
      if (response.etag) {
        this.etagCache.set(path, response.etag);
      }

      return {
        content,
        sha: response.sha,
        etag: response.etag,
        cached: false
      };
    } catch (error) {
      if (error.status === 404) {
        // File doesn't exist yet - this is okay for new files
        return {
          content: null,
          sha: null,
          notFound: true
        };
      }
      throw error;
    }
  }

  /**
   * Write a file to the repository
   * @param {string} path - File path in repo
   * @param {Object|string} content - Content to write
   * @param {string} sha - Current file SHA (required for updates)
   * @param {string} message - Commit message
   */
  async writeFile(path, content, sha = null, message = 'Update data') {
    try {
      const url = `/repos/${this.owner}/${this.repo}/contents/${path}`;
      
      // Convert content to base64
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      const base64Content = btoa(unescape(encodeURIComponent(contentStr)));

      const body = {
        message,
        content: base64Content,
        branch: this.branch
      };

      // Include SHA for updates (not for new files)
      if (sha) {
        body.sha = sha;
      }

      const response = await this._request(url, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      // Clear ETag cache for this file
      this.etagCache.delete(path);

      return {
        success: true,
        sha: response.content.sha,
        commit: response.commit.sha
      };
    } catch (error) {
      // 409 means there's a conflict (file was modified)
      if (error.status === 409) {
        throw new Error('Conflict: File was modified on GitHub. Please sync and try again.');
      }
      throw error;
    }
  }

  /**
   * List files in a directory
   * @param {string} path - Directory path
   */
  async listFiles(path) {
    try {
      const url = `/repos/${this.owner}/${this.repo}/contents/${path}`;
      const response = await this._request(url);
      
      return response.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type,
        sha: item.sha,
        size: item.size
      }));
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Create a directory (by creating a .gitkeep file)
   * @param {string} path - Directory path
   */
  async createDirectory(path) {
    const keepPath = `${path}/.gitkeep`;
    return this.writeFile(keepPath, '', null, `Create directory ${path}`);
  }

  /**
   * Delete a file
   * @param {string} path - File path
   * @param {string} sha - Current file SHA
   * @param {string} message - Commit message
   */
  async deleteFile(path, sha, message = 'Delete file') {
    try {
      const url = `/repos/${this.owner}/${this.repo}/contents/${path}`;
      
      await this._request(url, {
        method: 'DELETE',
        body: JSON.stringify({
          message,
          sha,
          branch: this.branch
        })
      });

      this.etagCache.delete(path);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get rate limit status
   */
  async getRateLimit() {
    try {
      const response = await this._request('/rate_limit');
      return response.resources.core;
    } catch (error) {
      return this.rateLimit;
    }
  }

  /**
   * Internal: Make authenticated request to GitHub API
   */
  async _request(endpoint, options = {}) {
    const url = `${this.apiBase}${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers
    };

    const fetchOptions = {
      ...options,
      headers
    };

    const response = await fetch(url, fetchOptions);

    // Log response for debugging
    console.log(`[GitHubSync] ${fetchOptions.method || 'GET'} ${endpoint} -> ${response.status}`);

    // Update rate limit info
    if (response.headers.get('x-ratelimit-remaining')) {
      this.rateLimit.remaining = parseInt(response.headers.get('x-ratelimit-remaining'));
      this.rateLimit.reset = new Date(parseInt(response.headers.get('x-ratelimit-reset')) * 1000);
    }

    // Handle 304 Not Modified
    if (response.status === 304) {
      return { status: 304 };
    }

    // Handle errors
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error(`[GitHubSync] API Error ${response.status}:`, errorBody);
      const error = new Error(`GitHub API error: ${response.status} - ${errorBody.message || response.statusText}`);
      error.status = response.status;
      error.response = errorBody;
      throw error;
    }

    // Return JSON response with ETag
    const data = await response.json();
    if (response.headers.get('etag')) {
      data.etag = response.headers.get('etag');
    }
    
    return data;
  }

  /**
   * Validate repository access
   */
  async validateRepo() {
    try {
      console.log(`[GitHubSync] Validating repo: ${this.owner}/${this.repo}`);
      const url = `/repos/${this.owner}/${this.repo}`;
      const response = await this._request(url);
      console.log('[GitHubSync] Repo validation successful:', response.name);
      return {
        success: true,
        name: response.name,
        private: response.private,
        permissions: response.permissions
      };
    } catch (error) {
      console.error('[GitHubSync] Repo validation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitHubSync;
}
