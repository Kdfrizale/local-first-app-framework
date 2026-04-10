/**
 * Storage Unit Tests
 * Tests for the Storage class (IndexedDB with localStorage fallback)
 */

describe('Storage', () => {
  let storage;
  const testAppName = 'test-storage-' + Date.now();

  beforeEach(async () => {
    storage = new Storage(testAppName);
    await storage.init();
  });

  afterEach(async () => {
    await storage.clear();
    storage.clearSettings();
  });

  // --- Basic Operations ---

  describe('save and load', () => {
    it('saves and loads simple data', async () => {
      await storage.save('test-key', { foo: 'bar' });
      const result = await storage.load('test-key');
      expect.deepEqual(result, { foo: 'bar' });
    });

    it('saves and loads arrays', async () => {
      const data = [1, 2, 3, 'four', { five: 5 }];
      await storage.save('array-key', data);
      const result = await storage.load('array-key');
      expect.deepEqual(result, data);
    });

    it('saves and loads nested objects', async () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      };
      await storage.save('nested-key', data);
      const result = await storage.load('nested-key');
      expect.deepEqual(result, data);
    });

    it('returns null for non-existent key', async () => {
      const result = await storage.load('non-existent-key');
      expect.null(result);
    });

    it('overwrites existing data', async () => {
      await storage.save('overwrite-key', { version: 1 });
      await storage.save('overwrite-key', { version: 2 });
      const result = await storage.load('overwrite-key');
      expect.deepEqual(result, { version: 2 });
    });
  });

  // --- Record Operations ---

  describe('loadRecord', () => {
    it('returns full record with metadata', async () => {
      await storage.save('record-key', { data: 'test' }, { synced: true, sha: 'abc123' });
      const record = await storage.loadRecord('record-key');
      
      expect.notNull(record);
      expect.deepEqual(record.data, { data: 'test' });
      expect.equal(record.synced, true);
      expect.equal(record.sha, 'abc123');
      expect.defined(record.timestamp);
    });

    it('returns null for non-existent record', async () => {
      const record = await storage.loadRecord('non-existent');
      expect.null(record);
    });
  });

  describe('getAllRecords', () => {
    it('returns all stored records', async () => {
      await storage.save('key1', { name: 'one' });
      await storage.save('key2', { name: 'two' });
      await storage.save('key3', { name: 'three' });
      
      const records = await storage.getAllRecords();
      expect.length(records, 3);
    });

    it('returns empty array when no data', async () => {
      const records = await storage.getAllRecords();
      expect.length(records, 0);
    });
  });

  describe('getAllKeys', () => {
    it('returns all keys', async () => {
      await storage.save('alpha', { a: 1 });
      await storage.save('beta', { b: 2 });
      
      const keys = await storage.getAllKeys();
      expect.length(keys, 2);
      expect.contains(keys, 'alpha');
      expect.contains(keys, 'beta');
    });
  });

  // --- Delete Operations ---

  describe('delete', () => {
    it('deletes a record', async () => {
      await storage.save('delete-me', { temp: true });
      await storage.delete('delete-me');
      const result = await storage.load('delete-me');
      expect.null(result);
    });

    it('succeeds silently for non-existent key', async () => {
      const result = await storage.delete('non-existent');
      expect.true(result);
    });
  });

  describe('clear', () => {
    it('removes all data', async () => {
      await storage.save('key1', { a: 1 });
      await storage.save('key2', { b: 2 });
      await storage.clear();
      
      const records = await storage.getAllRecords();
      expect.length(records, 0);
    });
  });

  // --- Sync Status ---

  describe('getUnsynced', () => {
    it('returns only unsynced records', async () => {
      await storage.save('synced', { data: 1 }, { synced: true });
      await storage.save('unsynced1', { data: 2 }, { synced: false });
      await storage.save('unsynced2', { data: 3 }, { synced: false });
      
      const unsynced = await storage.getUnsynced();
      expect.length(unsynced, 2);
    });

    it('returns empty array when all synced', async () => {
      await storage.save('synced1', { data: 1 }, { synced: true });
      await storage.save('synced2', { data: 2 }, { synced: true });
      
      const unsynced = await storage.getUnsynced();
      expect.length(unsynced, 0);
    });
  });

  describe('markSynced', () => {
    it('marks a record as synced with SHA', async () => {
      await storage.save('to-sync', { data: 'test' }, { synced: false });
      await storage.markSynced('to-sync', 'sha-abc123');
      
      const record = await storage.loadRecord('to-sync');
      expect.true(record.synced);
      expect.equal(record.sha, 'sha-abc123');
      expect.defined(record.lastSyncTime);
    });
  });

  // --- Settings ---

  describe('settings', () => {
    it('saves and loads a setting', () => {
      storage.saveSetting('theme', 'dark');
      const result = storage.loadSetting('theme');
      expect.equal(result, 'dark');
    });

    it('returns default for missing setting', () => {
      const result = storage.loadSetting('missing', 'default-value');
      expect.equal(result, 'default-value');
    });

    it('returns null if no default provided', () => {
      const result = storage.loadSetting('missing');
      expect.null(result);
    });

    it('loadSettings returns all settings', () => {
      storage.saveSetting('setting1', 'value1');
      storage.saveSetting('setting2', 'value2');
      
      const settings = storage.loadSettings();
      expect.equal(settings.setting1, 'value1');
      expect.equal(settings.setting2, 'value2');
    });

    it('clearSettings removes all settings', () => {
      storage.saveSetting('temp', 'value');
      storage.clearSettings();
      const result = storage.loadSetting('temp');
      expect.null(result);
    });
  });

  // --- Shared Settings ---

  describe('shared settings', () => {
    it('saves and loads shared settings', () => {
      storage.saveSharedSetting('githubToken', 'test-token');
      const result = storage.loadSharedSetting('githubToken');
      expect.equal(result, 'test-token');
    });

    it('shared settings work across instances', () => {
      const storage2 = new Storage('different-app');
      
      storage.saveSharedSetting('shared-key', 'shared-value');
      const result = storage2.loadSharedSetting('shared-key');
      expect.equal(result, 'shared-value');
      
      // Cleanup
      storage.saveSharedSetting('shared-key', null);
    });
  });
});
