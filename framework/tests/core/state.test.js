/**
 * State Unit Tests
 * Tests for the reactive state management class
 */

describe('State', () => {
  let state;

  beforeEach(() => {
    state = new State();
  });

  // --- Basic Get/Set ---

  describe('get and set', () => {
    it('sets and gets a value', () => {
      state.set('name', 'Alice');
      expect.equal(state.get('name'), 'Alice');
    });

    it('returns undefined for missing key', () => {
      expect.undefined(state.get('missing'));
    });

    it('sets multiple values at once', () => {
      state.set({
        name: 'Bob',
        age: 30,
        active: true
      });
      
      expect.equal(state.get('name'), 'Bob');
      expect.equal(state.get('age'), 30);
      expect.true(state.get('active'));
    });

    it('overwrites existing values', () => {
      state.set('count', 1);
      state.set('count', 2);
      expect.equal(state.get('count'), 2);
    });
  });

  // --- getAll ---

  describe('getAll', () => {
    it('returns all state values', () => {
      state.set({ a: 1, b: 2 });
      const all = state.getAll();
      expect.deepEqual(all, { a: 1, b: 2 });
    });

    it('returns a copy (not the internal state)', () => {
      state.set('key', 'value');
      const all = state.getAll();
      all.key = 'modified';
      expect.equal(state.get('key'), 'value');
    });
  });

  // --- Update ---

  describe('update', () => {
    it('merges updates into object state', () => {
      state.set('user', { name: 'Alice', age: 25 });
      state.update('user', { age: 26 });
      
      const user = state.get('user');
      expect.equal(user.name, 'Alice');
      expect.equal(user.age, 26);
    });

    it('adds new properties to object', () => {
      state.set('config', { theme: 'dark' });
      state.update('config', { fontSize: 14 });
      
      const config = state.get('config');
      expect.equal(config.theme, 'dark');
      expect.equal(config.fontSize, 14);
    });
  });

  // --- Subscribe ---

  describe('subscribe', () => {
    it('notifies on value change', () => {
      let notified = false;
      let receivedValue = null;
      
      state.subscribe('counter', (value) => {
        notified = true;
        receivedValue = value;
      });
      
      state.set('counter', 42);
      
      expect.true(notified);
      expect.equal(receivedValue, 42);
    });

    it('does not notify if value unchanged', () => {
      let callCount = 0;
      
      state.set('fixed', 'value');
      state.subscribe('fixed', () => callCount++);
      
      state.set('fixed', 'value'); // Same value
      
      expect.equal(callCount, 0);
    });

    it('notifies multiple subscribers', () => {
      let count1 = 0, count2 = 0;
      
      state.subscribe('shared', () => count1++);
      state.subscribe('shared', () => count2++);
      
      state.set('shared', 'new-value');
      
      expect.equal(count1, 1);
      expect.equal(count2, 1);
    });

    it('returns unsubscribe function', () => {
      let callCount = 0;
      
      const unsubscribe = state.subscribe('key', () => callCount++);
      
      state.set('key', 'value1');
      expect.equal(callCount, 1);
      
      unsubscribe();
      
      state.set('key', 'value2');
      expect.equal(callCount, 1); // Should not increase
    });
  });

  // --- Computed Properties ---

  describe('computed', () => {
    it('computes value from state', () => {
      state.set({ firstName: 'John', lastName: 'Doe' });
      
      state.computed('fullName', (s) => `${s.firstName} ${s.lastName}`, ['firstName', 'lastName']);
      
      expect.equal(state.get('fullName'), 'John Doe');
    });

    it('recomputes when dependency changes', () => {
      let computeCount = 0;
      
      state.set('base', 10);
      state.computed('doubled', (s) => {
        computeCount++;
        return s.base * 2;
      }, ['base']);
      
      expect.equal(state.get('doubled'), 20);
      
      state.set('base', 15);
      expect.equal(state.get('doubled'), 30);
    });
  });

  // --- Reset ---

  describe('reset', () => {
    it('clears all state', () => {
      state.set({ a: 1, b: 2, c: 3 });
      state.reset();
      
      const all = state.getAll();
      expect.deepEqual(all, {});
    });

    it('resets to new state', () => {
      state.set({ old: 'value' });
      state.reset({ new: 'value' });
      
      expect.undefined(state.get('old'));
      expect.equal(state.get('new'), 'value');
    });

    it('notifies subscribers after reset', () => {
      let notified = false;
      
      state.set('key', 'original');
      state.subscribe('key', () => notified = true);
      state.reset({ key: 'reset' });
      
      expect.true(notified);
    });
  });

  // --- Remove ---

  describe('remove', () => {
    it('removes a state key', () => {
      state.set('toRemove', 'value');
      state.remove('toRemove');
      
      expect.undefined(state.get('toRemove'));
    });

    it('notifies subscribers on remove', () => {
      let receivedValue = 'not-called';
      
      state.set('key', 'value');
      state.subscribe('key', (val) => receivedValue = val);
      state.remove('key');
      
      expect.undefined(receivedValue);
    });
  });

  // --- Initial State ---

  describe('initial state', () => {
    it('accepts initial state in constructor', () => {
      const stateWithInitial = new State({
        count: 0,
        name: 'Initial'
      });
      
      expect.equal(stateWithInitial.get('count'), 0);
      expect.equal(stateWithInitial.get('name'), 'Initial');
    });
  });
});
