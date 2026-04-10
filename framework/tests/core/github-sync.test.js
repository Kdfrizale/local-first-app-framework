/**
 * GitHubSync Unit Tests
 * Tests for GitHub API interactions (with mocked fetch)
 */

describe('GitHubSync', () => {
  let github;
  let originalFetch;
  let mockResponses;

  // --- Mock Fetch Setup ---
  
  function setupMockFetch() {
    mockResponses = new Map();
    originalFetch = window.fetch;
    
    window.fetch = async (url, options = {}) => {
      const method = options.method || 'GET';
      const key = `${method} ${url}`;
      
      // Log for debugging
      console.log(`[MockFetch] ${key}`);
      
      // Check for specific mock
      let mockFn = mockResponses.get(key);
      
      // Check for pattern match
      if (!mockFn) {
        for (const [pattern, fn] of mockResponses.entries()) {
          if (url.includes(pattern.replace('GET ', '').replace('PUT ', '').replace('DELETE ', ''))) {
            mockFn = fn;
            break;
          }
        }
      }
      
      if (mockFn) {
        const result = await mockFn(url, options);
        return createMockResponse(result);
      }
      
      // Default: 404
      return createMockResponse({ status: 404, body: { message: 'Not Found' } });
    };
  }
  
  function createMockResponse({ status = 200, body = {}, headers = {} }) {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {
        get: (name) => headers[name.toLowerCase()] || null
      },
      json: async () => body,
      text: async () => JSON.stringify(body)
    };
  }
  
  function mockEndpoint(pattern, handler) {
    mockResponses.set(pattern, handler);
  }

  beforeEach(() => {
    setupMockFetch();
    
    github = new GitHubSync({
      token: 'test-token',
      owner: 'testowner',
      repo: 'testrepo',
      branch: 'main'
    });
  });

  afterEach(() => {
    window.fetch = originalFetch;
    mockResponses.clear();
  });

  // --- Authentication ---

  describe('testAuth', () => {
    it('returns success with valid token', async () => {
      mockEndpoint('/user', () => ({
        status: 200,
        body: { login: 'testuser', name: 'Test User' }
      }));
      
      const result = await github.testAuth();
      
      expect.true(result.success);
      expect.equal(result.user, 'testuser');
      expect.equal(result.name, 'Test User');
    });

    it('returns failure with invalid token', async () => {
      mockEndpoint('/user', () => ({
        status: 401,
        body: { message: 'Bad credentials' }
      }));
      
      const result = await github.testAuth();
      
      expect.false(result.success);
      expect.defined(result.error);
    });
  });

  // --- Repository Validation ---

  describe('validateRepo', () => {
    it('returns success for accessible repo', async () => {
      mockEndpoint('/repos/testowner/testrepo', () => ({
        status: 200,
        body: {
          name: 'testrepo',
          private: false,
          permissions: { push: true, pull: true }
        }
      }));
      
      const result = await github.validateRepo();
      
      expect.true(result.success);
      expect.equal(result.name, 'testrepo');
    });

    it('returns failure for inaccessible repo', async () => {
      mockEndpoint('/repos/testowner/testrepo', () => ({
        status: 404,
        body: { message: 'Not Found' }
      }));
      
      const result = await github.validateRepo();
      
      expect.false(result.success);
    });
  });

  // --- Read File ---

  describe('readFile', () => {
    it('reads and decodes file content', async () => {
      const content = { items: [1, 2, 3] };
      const base64Content = btoa(JSON.stringify(content));
      
      mockEndpoint('/contents/', () => ({
        status: 200,
        body: {
          content: base64Content,
          sha: 'abc123',
          encoding: 'base64'
        },
        headers: {
          etag: '"test-etag"'
        }
      }));
      
      const result = await github.readFile('apps/test/data.json');
      
      expect.deepEqual(result.content, content);
      expect.equal(result.sha, 'abc123');
    });

    it('returns notFound for missing files', async () => {
      mockEndpoint('/contents/', () => ({
        status: 404,
        body: { message: 'Not Found' }
      }));
      
      const result = await github.readFile('missing.json');
      
      expect.true(result.notFound);
    });

    it('handles 304 Not Modified', async () => {
      mockEndpoint('/contents/', () => ({
        status: 304,
        body: {}
      }));
      
      const result = await github.readFile('cached.json');
      
      expect.true(result.cached);
    });
  });

  // --- Write File ---

  describe('writeFile', () => {
    it('creates new file', async () => {
      mockEndpoint('PUT', () => ({
        status: 201,
        body: {
          content: { sha: 'new-sha' },
          commit: { sha: 'commit-sha' }
        }
      }));
      
      const result = await github.writeFile(
        'apps/test/new.json',
        { test: true },
        null,
        'Create new file'
      );
      
      expect.true(result.success);
      expect.equal(result.sha, 'new-sha');
    });

    it('updates existing file with SHA', async () => {
      mockEndpoint('PUT', (url, options) => {
        const body = JSON.parse(options.body);
        
        // Verify SHA is included
        if (body.sha !== 'old-sha') {
          return { status: 422, body: { message: 'SHA mismatch' } };
        }
        
        return {
          status: 200,
          body: {
            content: { sha: 'updated-sha' },
            commit: { sha: 'commit-sha' }
          }
        };
      });
      
      const result = await github.writeFile(
        'apps/test/existing.json',
        { updated: true },
        'old-sha',
        'Update file'
      );
      
      expect.true(result.success);
    });

    it('handles conflict (409)', async () => {
      mockEndpoint('PUT', () => ({
        status: 409,
        body: { message: 'Conflict' }
      }));
      
      try {
        await github.writeFile('conflict.json', {}, 'stale-sha');
        expect.true(false, 'Should have thrown');
      } catch (error) {
        expect.true(error.message.includes('Conflict'));
      }
    });
  });

  // --- List Files ---

  describe('listFiles', () => {
    it('lists directory contents', async () => {
      mockEndpoint('/contents/', () => ({
        status: 200,
        body: [
          { name: 'file1.json', path: 'apps/file1.json', type: 'file', sha: 'sha1', size: 100 },
          { name: 'file2.json', path: 'apps/file2.json', type: 'file', sha: 'sha2', size: 200 },
          { name: 'subdir', path: 'apps/subdir', type: 'dir', sha: 'sha3' }
        ]
      }));
      
      const files = await github.listFiles('apps');
      
      expect.length(files, 3);
      expect.equal(files[0].name, 'file1.json');
      expect.equal(files[2].type, 'dir');
    });

    it('returns empty array for missing directory', async () => {
      mockEndpoint('/contents/', () => ({
        status: 404,
        body: { message: 'Not Found' }
      }));
      
      const files = await github.listFiles('nonexistent');
      
      expect.length(files, 0);
    });
  });

  // --- Delete File ---

  describe('deleteFile', () => {
    it('deletes file with correct SHA', async () => {
      mockEndpoint('DELETE', () => ({
        status: 200,
        body: { commit: { sha: 'delete-commit' } }
      }));
      
      const result = await github.deleteFile('apps/delete-me.json', 'file-sha');
      
      expect.true(result.success);
    });
  });

  // --- Rate Limiting ---

  describe('rate limiting', () => {
    it('tracks rate limit from headers', async () => {
      mockEndpoint('/rate_limit', () => ({
        status: 200,
        body: {
          resources: {
            core: {
              limit: 5000,
              remaining: 4999,
              reset: Math.floor(Date.now() / 1000) + 3600
            }
          }
        }
      }));
      
      const rateLimit = await github.getRateLimit();
      
      expect.equal(rateLimit.limit, 5000);
      expect.equal(rateLimit.remaining, 4999);
    });
  });

  // --- Create Directory ---

  describe('createDirectory', () => {
    it('creates directory with .gitkeep', async () => {
      let createdPath = null;
      
      mockEndpoint('PUT', (url) => {
        createdPath = url;
        return {
          status: 201,
          body: {
            content: { sha: 'gitkeep-sha' },
            commit: { sha: 'commit-sha' }
          }
        };
      });
      
      await github.createDirectory('apps/newdir');
      
      expect.true(createdPath.includes('.gitkeep'));
    });
  });

  // --- Configuration ---

  describe('configuration', () => {
    it('uses provided branch', () => {
      const customGithub = new GitHubSync({
        token: 'token',
        owner: 'owner',
        repo: 'repo',
        branch: 'develop'
      });
      
      expect.equal(customGithub.branch, 'develop');
    });

    it('defaults to main branch', () => {
      const defaultGithub = new GitHubSync({
        token: 'token',
        owner: 'owner',
        repo: 'repo'
      });
      
      expect.equal(defaultGithub.branch, 'main');
    });
  });
});
