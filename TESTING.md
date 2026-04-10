# Testing Guide

This guide explains how to test the Local-First Framework and your apps built with it.

## Overview

The framework includes two types of testing approaches:
1. **Automated tests** using Vitest (for future development)
2. **Browser-based manual tests** for immediate validation

## Browser-Based Testing

### Test Runner
Open `/test-runner.html` in your browser to run basic framework tests:

```bash
# From project root, start a web server
python3 -m http.server 8000

# Then open: http://localhost:8000/test-runner.html
```

The test runner includes:
- Module loading tests (all core modules)
- State management tests
- Toast notification tests
- Basic integration tests

### Example Apps Testing

Each example app (`reading-log`, `meal-planner`, `goal-tracker`) should be manually tested for:

1. **Offline Functionality**
   - Open app in browser
   - Stop the web server
   - Verify app still works (add/edit/delete items)
   - Data should persist in IndexedDB
   - Toast should NOT show sync errors when offline

2. **GitHub Sync**
   - Start with fresh IndexedDB (clear in DevTools → Application → IndexedDB)
   - Enter GitHub credentials
   - Add data locally
   - Click sync - should upload to GitHub
   - Verify data appears in GitHub repo
   - Toast should show "Sync complete!"

3. **Error Handling**
   Test these error scenarios and verify appropriate toasts appear:

   **Authentication Errors (401/403)**
   - Use invalid GitHub token
   - Expected: Red error toast "Sync failed: Bad credentials"

   **Network Errors**
   - Open DevTools → Network tab → Throttling → Offline
   - Try to sync
   - Expected: Red error toast with network error message

   **Partial Sync Failures**
   - Modify sync-controller to simulate partial failures
   - Expected: Orange warning toast "Sync completed with X error(s)"

   **File Conflicts**
   - Edit same file in GitHub directly
   - Make different changes in app
   - Sync
   - Expected: Last-write-wins, no error (by design)

## Automated Testing (Future)

### Setup
```bash
npm install
```

### Run Tests
```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### Test Structure
```
framework/tests/
├── unit/           # Unit tests for individual modules
├── integration/    # Integration tests across modules
└── setup.js        # Test environment setup
```

### Writing Tests

Tests use Vitest with the happy-dom environment:

```javascript
import { describe, it, expect, beforeEach } from 'vitest'

describe('Component Name', () => {
  let component;

  beforeEach(() => {
    component = new Component();
  });

  it('should do something', () => {
    expect(component.method()).toBe(expected);
  });
});
```

## Manual Test Checklist

Use this checklist when testing a new app:

### Initial Setup
- [ ] App loads without errors
- [ ] Settings screen appears for first-time users
- [ ] GitHub credentials can be entered and saved
- [ ] Authentication succeeds with valid token
- [ ] Authentication fails gracefully with invalid token

### Data Operations
- [ ] Can create new items
- [ ] Can edit existing items
- [ ] Can delete items
- [ ] Changes persist after page reload
- [ ] IndexedDB stores data correctly

### Sync Functionality
- [ ] Manual sync button works
- [ ] Automatic sync works (if enabled)
- [ ] Upload to GitHub succeeds
- [ ] Download from GitHub succeeds
- [ ] Sync conflicts handled (last-write-wins)

### Error Handling & Toasts
- [ ] Success toast shows on successful sync (green, 3s)
- [ ] Error toast shows on sync failure (red, 5s)
- [ ] Warning toast shows on partial sync failure (orange, 5s)
- [ ] Toast appears briefly and doesn't block interaction
- [ ] No toast spam (one toast per sync operation)
- [ ] Console logs provide debugging info

### Offline Support
- [ ] Service worker registers successfully
- [ ] App works offline after first load
- [ ] Data can be modified offline
- [ ] Sync queue works when back online
- [ ] No error toasts when offline (expected state)

### UI/UX
- [ ] Responsive on mobile (test 375px, 768px, 1024px widths)
- [ ] Touch targets are large enough (44x44px minimum)
- [ ] Loading states show during operations
- [ ] Sync button shows spinning icon when syncing
- [ ] Empty states have helpful messages

### Performance
- [ ] App loads in < 2 seconds
- [ ] Sync completes in reasonable time (< 5s for typical data)
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] Service worker cache size reasonable (< 5MB)

## Debugging Tests

### Browser DevTools
- **Console**: Check for errors and log messages
- **Network**: Verify GitHub API calls
- **Application**: 
  - Check IndexedDB contents
  - Check localStorage settings
  - Check Service Worker status
  - Clear cache/storage to reset

### Common Issues

**"Module not found" errors**
- Ensure web server is running from project root
- Check script paths are relative to server root

**Tests fail with IndexedDB errors**
- Clear IndexedDB in DevTools
- Try in incognito/private window
- Check browser supports IndexedDB

**Sync fails silently**
- Check console for GitHub API errors
- Verify token has correct permissions
- Check repo name and owner are correct

**Toasts don't appear**
- Check toast container exists in DOM
- Verify Toast class is loaded
- Check for JavaScript errors

## Coverage Goals

Aim for these coverage targets:

- **Core Modules**: 80%+ coverage
  - github-sync.js
  - local-storage.js
  - sync-controller.js
  - state.js
  - router.js

- **Components**: 70%+ coverage
  - toast.js
  - modal.js
  - form.js
  - list.js

- **Example Apps**: Manual testing only
  - Focus on integration and user workflows

## Security Testing

Always test for:
- XSS in user input (especially toast messages)
- Token storage security (localStorage)
- GitHub API token never logged
- No sensitive data in console.log
- CORS policy compliance

## Accessibility Testing

- Test with screen reader (NVDA, JAWS, VoiceOver)
- Test keyboard navigation (no mouse)
- Test with high contrast mode
- Test with zoom at 200%
- Run Lighthouse accessibility audit

## Performance Testing

- Use Chrome DevTools Lighthouse
- Aim for Performance score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- No layout shifts (CLS = 0)

## Contributing Tests

When adding new features:
1. Write tests FIRST (TDD approach recommended)
2. Ensure all tests pass before submitting PR
3. Maintain or improve coverage
4. Document any new testing requirements
5. Update this guide if testing process changes
