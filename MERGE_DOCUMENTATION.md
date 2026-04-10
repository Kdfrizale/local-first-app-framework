# Multi-Device Sync & Merge Behavior

## Overview

The framework supports intelligent merging of data from multiple devices. When you use the same app on your phone and computer, or when multiple family members use the same app, changes are automatically merged during sync.

## How Merging Works

### Sync Process
1. **Local changes** are stored in IndexedDB
2. When syncing, the app **downloads latest from GitHub**
3. **Merge logic** combines local and remote changes
4. **Merged result** is uploaded to GitHub
5. **Local storage** is updated with merged data

### Merge Strategies

The framework uses different strategies based on the type of data:

#### 1. Arrays of Records (books, goals, meals)
**Strategy**: Combine by ID, use timestamp for conflicts

```javascript
// Device 1 adds Book A and B
Local: [
  {id: '1', title: 'Book A', updatedAt: '10:00'},
  {id: '2', title: 'Book B', updatedAt: '10:05'}
]

// Device 2 adds Book A and C
Remote: [
  {id: '1', title: 'Book A', updatedAt: '10:00'},
  {id: '3', title: 'Book C', updatedAt: '10:10'}
]

// Merged result: All three books
Merged: [
  {id: '1', title: 'Book A', updatedAt: '10:00'},
  {id: '2', title: 'Book B', updatedAt: '10:05'},
  {id: '3', title: 'Book C', updatedAt: '10:10'}
]
```

#### 2. Same Record Updated on Both Devices
**Strategy**: Newer timestamp wins

```javascript
// Device 1 edits Book A at 10:00
Local: {
  id: '1', 
  title: 'Book A (edited on phone)', 
  updatedAt: '2026-04-10T10:00:00Z'
}

// Device 2 edits Book A at 11:00
Remote: {
  id: '1', 
  title: 'Book A (edited on computer)', 
  updatedAt: '2026-04-10T11:00:00Z'
}

// Merged: Remote wins (newer timestamp)
Merged: {
  id: '1', 
  title: 'Book A (edited on computer)', 
  updatedAt: '2026-04-10T11:00:00Z'
}
```

#### 3. Simple Arrays (readers, tags)
**Strategy**: Union merge (combine unique values)

```javascript
// Device 1 has Alice and Bob
Local: ['Alice', 'Bob']

// Device 2 has Bob and Charlie
Remote: ['Bob', 'Charlie']

// Merged: All unique values
Merged: ['Alice', 'Bob', 'Charlie']
```

## Timestamps

All records must have timestamps for proper conflict resolution:

- **`createdAt`**: Set when record is created (never changes)
- **`updatedAt`**: Updated every time record is modified

The merge logic uses these timestamps to determine which version is newer.

### Example: Adding a Book
```javascript
const now = new Date().toISOString();
const newBook = {
  id: Date.now().toString(),
  title: 'My Book',
  author: 'Author Name',
  createdAt: now,
  updatedAt: now  // Required for merge
};
```

### Example: Updating a Book
```javascript
const updatedBook = {
  ...existingBook,
  title: 'Updated Title',
  updatedAt: new Date().toISOString()  // Update timestamp!
};
```

## Merge Notifications

When data is merged during sync, the app shows a notification:

- 🟢 **"Sync complete!"** - No merge needed (just uploaded)
- 🔵 **"Sync complete! Merged X change(s) from other devices"** - Data was merged
- 🟠 **"Sync completed with X error(s)"** - Partial sync failure
- 🔴 **"Sync failed: [error]"** - Complete sync failure

## Common Scenarios

### Scenario 1: Adding Records on Two Devices
**What happens**: Both records are kept (different IDs)

```
Phone adds: Book A (id: 12345)
Computer adds: Book B (id: 67890)

After sync: Both books appear on both devices ✓
```

### Scenario 2: Editing Same Record on Two Devices
**What happens**: Newer edit wins

```
Phone edits Book A at 10:00 AM → title: "Great Book"
Computer edits Book A at 11:00 AM → title: "Amazing Book"

After sync: Title is "Amazing Book" on both devices ✓
Reason: Computer edit was newer (11:00 > 10:00)
```

### Scenario 3: One Device Adds, Other Deletes
**What happens**: Deletion takes priority (not yet implemented)

```
Phone adds: Book C
Computer deletes: Book C (if it existed)

Currently: Book C appears (add wins)
Future: Could implement tombstone deletion tracking
```

### Scenario 4: Offline Usage
**What happens**: Changes queue locally, merge on next sync

```
Day 1: Phone offline, adds Books A, B, C
Day 2: Phone back online, syncs
Result: Books merged with any changes from other devices ✓
```

## Best Practices

### 1. Sync Frequently
- Enable automatic sync (syncs every minute by default)
- Manual sync before making important changes
- Sync after making changes when online

### 2. Avoid Simultaneous Edits
- Don't edit the same record on multiple devices at once
- If you must, the newer edit will win
- Consider using one device as "primary" for important edits

### 3. Check Merge Notifications
- Blue info toast means data was merged
- Review merged data to ensure it's correct
- Re-edit if the wrong version won (your new edit will be newer)

### 4. Use Descriptive Titles
- Makes it easier to spot duplicates
- Helps identify which version you want
- Example: "Meeting Notes - April 10 (updated)" vs "Meeting Notes"

### 5. Handle Edge Cases
- If you see duplicate records (shouldn't happen), delete the unwanted one
- Both devices will sync the deletion
- Use specific dates/times in titles to track versions

## Testing Merge Behavior

### Manual Test
1. Open app on Device 1, add a record
2. DON'T sync yet on Device 1
3. Open app on Device 2, add a different record
4. Sync on Device 2 (uploads to GitHub)
5. Sync on Device 1 (downloads from GitHub, merges, uploads)
6. Result: Both records appear on both devices

### Automated Test
Run the merge test page:
```bash
python3 -m http.server 8000
# Open: http://localhost:8000/test-merge-scenarios.html
```

## Technical Details

### Merge Function Location
`/framework/core/sync-controller.js` → `mergeData(local, remote)`

### Algorithm
1. Create empty merged object
2. Get all keys from both local and remote
3. For each key:
   - If only one side has it → use that value
   - If both have it → merge based on type:
     - **Array with IDs** → merge by ID, timestamp for conflicts
     - **Simple array** → union merge
     - **Object** → recursive merge
     - **Primitive** → use remote (GitHub is source of truth)
4. Set `lastUpdated` to now
5. Return merged result

### Conflict Detection
- Compare `updatedAt` timestamps
- Fallback to `createdAt` if `updatedAt` missing
- Fallback to 0 if both missing (remote wins)

## Limitations & Future Enhancements

### Current Limitations
1. **Deletions**: No tombstone tracking (deleted items reappear if added on other device)
2. **Field-level merge**: Whole record is replaced, not individual fields
3. **Manual conflict resolution**: No UI for choosing which version to keep

### Planned Enhancements
1. Tombstone deletion tracking (track deleted IDs)
2. Field-level merge for specific data types
3. Conflict resolution UI (show both versions, let user choose)
4. Merge history (see what was merged when)
5. Undo merge (revert to previous version)

## Troubleshooting

### "Data keeps reverting to old version"
- Check timestamps on both records
- Older device's clock might be wrong
- Solution: Update timestamps or fix device clock

### "Duplicate records appearing"
- Records have different IDs (not actually duplicates)
- Manually delete unwanted duplicate
- Sync to propagate deletion

### "Merge not happening"
- Check console for merge logs: `[SyncController] Merging data:`
- Ensure `updatedAt` timestamps exist
- Verify sync is actually running

### "Lost my changes after sync"
- Other device had newer timestamp
- Your changes were overwritten by newer version
- Solution: Re-make changes (will have newer timestamp now)

## Summary

The merge system ensures your data stays consistent across devices without losing changes. By using timestamps and smart merge strategies, multiple devices can work together seamlessly. Just remember to sync regularly and check merge notifications!
