# Testing the Local-First Framework

## Quick Test

1. **Start the server** (from project root):
   ```bash
   cd /home/kyle/local_app_sandbox
   python3 -m http.server 8000
   ```

2. **Open the debug test page**:
   - http://localhost:8000/debug-test.html
   
3. **Step through the tests**:
   - Step 1 runs automatically - verifies all modules load
   - Step 2: Enter your GitHub credentials and test connection
   - Step 3: Test local storage
   - Step 4: Run full integration test

4. **If debug tests pass**, open the Reading Log app:
   - http://localhost:8000/framework/examples/reading-log/

## What Was Fixed

### 1. Bearer Token Authentication
The GitHub API now requires `Bearer` instead of `token` prefix for authentication:
```javascript
// Before (broken)
'Authorization': `token ${this.token}`

// After (fixed)
'Authorization': `Bearer ${this.token}`
```

### 2. Better Error Handling
Added detailed error logging to help diagnose issues:
- Console logs for all API requests
- Detailed error messages with HTTP status
- Debug output in the setup form

## Troubleshooting

### "GitHub authentication failed"
- Token format should start with `ghp_` or `github_pat_`
- Token must have `repo` scope
- Token must not be expired

### "Cannot access repository"
- Repository name must match exactly (case-sensitive)
- Repository must exist
- Your token must have access to the repo

### Checking Browser Console
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for `[GitHubSync]` log messages
4. Check for any red error messages

## Test Files Created

- `debug-test.html` - Comprehensive debug test page
- `test-github-api.html` - Standalone GitHub API test

## URLs

- Debug Test: http://localhost:8000/debug-test.html
- GitHub API Test: http://localhost:8000/test-github-api.html
- Reading Log App: http://localhost:8000/framework/examples/reading-log/

## If You Still Have Issues

Open the browser console and share the error messages. The logs now include:
- Request details (`[GitHubSync] GET /user -> 200`)
- Error responses with GitHub's error messages
- Setup process steps (`[Setup] Testing authentication...`)
