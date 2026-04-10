/**
 * SyncController Unit Tests
 * Tests for sync orchestration and conflict handling
 */

describe('SyncController', () => {
  let syncController;
  let mockStorage;
  let mockGitHub;

  // --- Mock Storage ---
  function createMockStorage() {
    const data = new Map();
    
    return {
      data,
      
      async save(key, value, metadata = {}) {
        data.set(key, {
          id: key,
          data: value,
          synced: metadata.synced || false,
          sha: metadata.sha || null,
          githubPath: metadata.githubPath || null,
          timestamp: Date.now(),
          ...metadata
        });
        return data.get(key);
      },
      
      async load(key) {
        const record = data.get(key);
        return record ? record.data : null;
      },
      
      async loadRecord(key) {
        return data.get(key) || null;
      },
      
      async getAllRecords() {
        return Array.from(data.values());
      },
      
      async getUnsynced() {
        return Array.from(data.values()).filter(r => !r.synced);
      },
      
      async markSynced(key, sha) {
        const record = data.get(key);
        if (record) {
          record.synced = true;
          record.sha = sha;
          record.lastSyncTime = Date.now();
        }
      },
      
      async delete(key) {
        data.delete(key);
        return true;
      },
      
      async clear() {
        data.clear();
        return true;
      }
    };
  }

  // --- Mock GitHub ---
  function createMockGitHub() {
    const files = new Map();
    
    return {
      files,
      
      async readFile(path) {
        const file = files.get(path);
        if (!file) {
          return { notFound: true };
        }
        return {
          content: file.content,
          sha: file.sha,
          etag: file.etag
        };
      },
      
      async writeFile(path, content, sha, message) {
        const newSha = 'sha-' + Date.now();
        files.set(path, {
          content,
          sha: newSha,
          message
        });
        return {
          success: true,
          sha: newSha,
          commit: { sha: 'commit-' + Date.now() }
        };
      },
      
      async testAuth() {
        return { success: true, user: 'testuser' };
      }
    };
  }

  beforeEach(() => {
    mockStorage = createMockStorage();
    mockGitHub = createMockGitHub();
    syncController = new SyncController(mockStorage, mockGitHub, {
      autoSyncInterval: 60000,
      conflictStrategy: 'last-write-wins'
    });
  });

  // --- Basic Sync ---

  describe('sync status', () => {
    it('reports initial status correctly', () => {
      const status = syncController.getStatus();
      
      expect.false(status.isSyncing);
      expect.null(status.lastSyncTime);
      expect.false(status.autoSyncEnabled);
    });

    it('starts auto-sync on start()', () => {
      syncController.start();
      const status = syncController.getStatus();
      
      expect.true(status.autoSyncEnabled);
      
      syncController.stop();
    });

    it('stops auto-sync on stop()', () => {
      syncController.start();
      syncController.stop();
      
      const status = syncController.getStatus();
      expect.false(status.autoSyncEnabled);
    });
  });

  // --- Event Handling ---

  describe('events', () => {
    it('emits syncStart event', async () => {
      let started = false;
      syncController.on('syncStart', () => started = true);
      
      await syncController.sync();
      
      expect.true(started);
    });

    it('emits syncComplete event with results', async () => {
      let results = null;
      syncController.on('syncComplete', (r) => results = r);
      
      await syncController.sync();
      
      expect.notNull(results);
      expect.defined(results.uploaded);
      expect.defined(results.downloaded);
    });

    it('can unsubscribe from events', async () => {
      let callCount = 0;
      const handler = () => callCount++;
      
      syncController.on('syncStart', handler);
      await syncController.sync();
      expect.equal(callCount, 1);
      
      syncController.off('syncStart', handler);
      await syncController.sync();
      expect.equal(callCount, 1);
    });
  });

  // --- Upload ---

  describe('upload', () => {
    it('uploads unsynced records', async () => {
      await mockStorage.save('appData', { items: [1, 2, 3] }, {
        synced: false,
        githubPath: 'apps/test/data.json'
      });
      
      const result = await syncController.sync();
      
      expect.equal(result.status, 'success');
      expect.equal(result.results.uploaded, 1);
      
      // Check file was created on GitHub
      const file = mockGitHub.files.get('apps/test/data.json');
      expect.notNull(file);
      expect.deepEqual(file.content.items, [1, 2, 3]);
    });

    it('marks record as synced after upload', async () => {
      await mockStorage.save('appData', { test: true }, {
        synced: false,
        githubPath: 'apps/test/data.json'
      });
      
      await syncController.sync();
      
      const record = await mockStorage.loadRecord('appData');
      expect.true(record.synced);
      expect.notNull(record.sha);
    });
  });

  // --- Download ---

  describe('download', () => {
    it('downloads data from GitHub', async () => {
      mockGitHub.files.set('apps/test/data.json', {
        content: { items: ['from', 'github'] },
        sha: 'remote-sha'
      });
      
      const result = await syncController.downloadFromGitHub(
        'apps/test/data.json',
        'appData'
      );
      
      expect.equal(result.status, 'downloaded');
      
      const data = await mockStorage.load('appData');
      expect.deepEqual(data, { items: ['from', 'github'] });
    });

    it('returns not-found for missing files', async () => {
      const result = await syncController.downloadFromGitHub(
        'non-existent.json',
        'missing'
      );
      
      expect.equal(result.status, 'not-found');
    });
  });

  // --- Merge ---

  describe('mergeData', () => {
    it('merges non-overlapping keys', () => {
      const local = { a: 1, b: 2 };
      const remote = { c: 3, d: 4 };
      
      const merged = syncController.mergeData(local, remote);
      
      expect.equal(merged.a, 1);
      expect.equal(merged.b, 2);
      expect.equal(merged.c, 3);
      expect.equal(merged.d, 4);
    });

    it('prefers remote for primitive conflicts', () => {
      const local = { value: 'local' };
      const remote = { value: 'remote' };
      
      const merged = syncController.mergeData(local, remote);
      
      expect.equal(merged.value, 'remote');
    });

    it('merges arrays by ID', () => {
      const local = {
        items: [
          { id: '1', name: 'Local Item 1' },
          { id: '2', name: 'Only Local' }
        ]
      };
      
      const remote = {
        items: [
          { id: '1', name: 'Remote Item 1' },
          { id: '3', name: 'Only Remote' }
        ]
      };
      
      const merged = syncController.mergeData(local, remote);
      
      expect.length(merged.items, 3);
    });

    it('handles null/undefined inputs', () => {
      expect.deepEqual(syncController.mergeData(null, { a: 1 }), { a: 1 });
      expect.deepEqual(syncController.mergeData({ b: 2 }, null), { b: 2 });
    });
  });

  // --- Conflict Detection ---

  describe('conflict handling', () => {
    it('detects conflict when remote SHA differs', async () => {
      // Save local data with old SHA
      await mockStorage.save('appData', { local: true }, {
        synced: false,
        sha: 'old-sha',
        githubPath: 'apps/test/data.json'
      });
      
      // Remote has different SHA
      mockGitHub.files.set('apps/test/data.json', {
        content: { remote: true },
        sha: 'new-sha'
      });
      
      let conflictEmitted = false;
      syncController.on('conflictDetected', () => conflictEmitted = true);
      
      // With manual conflict strategy
      syncController.conflictStrategy = 'manual';
      await syncController.sync();
      
      expect.true(conflictEmitted);
    });
  });

  // --- Force Operations ---

  describe('force operations', () => {
    it('forceDownload overwrites local data', async () => {
      // Local data
      await mockStorage.save('appData', { local: 'data' }, { synced: true });
      
      // Different remote data
      mockGitHub.files.set('apps/test/data.json', {
        content: { remote: 'data' },
        sha: 'remote-sha'
      });
      
      await syncController.forceDownload('apps/test/data.json', 'appData');
      
      const data = await mockStorage.load('appData');
      expect.deepEqual(data, { remote: 'data' });
    });

    it('forceUpload overwrites remote data', async () => {
      // Existing remote data
      mockGitHub.files.set('apps/test/data.json', {
        content: { old: 'remote' },
        sha: 'old-sha'
      });
      
      // New local data
      await mockStorage.save('appData', { new: 'local' }, { synced: false });
      
      await syncController.forceUpload('appData', 'apps/test/data.json');
      
      const file = mockGitHub.files.get('apps/test/data.json');
      expect.deepEqual(file.content, { new: 'local' });
    });
  });

  // --- Offline Handling ---

  describe('offline handling', () => {
    it('returns offline status when not online', async () => {
      // Simulate offline
      syncController.isOnline = false;
      
      const result = await syncController.sync();
      
      expect.equal(result.status, 'offline');
    });

    it('prevents concurrent syncs', async () => {
      syncController.isSyncing = true;
      
      const result = await syncController.sync();
      
      expect.equal(result.status, 'already-syncing');
    });
  });
});
