# Getting Started

Welcome to the Local-First Family Apps Framework! This guide will help you get up and running quickly.

## What You'll Need

1. **A GitHub account** - for storing and syncing your data
2. **A GitHub repository** - to store app data (can be private)
3. **A GitHub Personal Access Token** - for authentication
4. **A modern web browser** - Chrome, Firefox, Safari, or Edge

## Step 1: Set Up Your Data Repository

1. Go to GitHub and create a new repository (e.g., `family-data`)
2. You can make it private if you want
3. No need to add any files yet - the apps will create them automatically

## Step 2: Create a Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Or visit: https://github.com/settings/tokens/new
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "Family Apps"
4. Select the `repo` scope (full control of private repositories)
5. Click "Generate token"
6. **IMPORTANT**: Copy the token immediately - you won't be able to see it again!

## Step 3: Choose an App

Navigate to one of the example apps:

- **Reading Log**: `framework/examples/reading-log/index.html`
- **Goal Tracker**: `framework/examples/goal-tracker/index.html`
- **Meal Planner**: `framework/examples/meal-planner/index.html`

## Step 4: Open the App

You can open the app in several ways:

### Option A: Direct File Access (Simplest)
Just double-click the `index.html` file and it will open in your default browser.

**Note**: Some browsers restrict certain features when opening files directly. For full functionality, use Option B or C.

### Option B: Local Web Server (Recommended)
Run the server from the **project root directory**:

```bash
# Navigate to the project root
cd /home/kyle/local_app_sandbox

# Start the server
python3 -m http.server 8000

# Or use the helper script
./run-server.sh
```

Then open in your browser:
- **Reading Log**: http://localhost:8000/framework/examples/reading-log/

**Important**: Always start the server from the project root, not from individual app folders. This ensures the relative paths to framework modules work correctly.

### Option C: VS Code Live Server
If you use VS Code, install the "Live Server" extension and right-click the HTML file → "Open with Live Server"

## Step 5: Configure GitHub Sync

When you first open an app, you'll see a setup screen:

1. **GitHub Personal Access Token**: Paste the token you created in Step 2
2. **GitHub Username**: Your GitHub username
3. **Repository Name**: The name of your data repository (e.g., `family-data`)
4. Click "Connect to GitHub"

The app will:
- Test the connection
- Verify it can access the repository
- Save your settings locally
- Start syncing automatically

## Step 6: Start Using the App!

That's it! You can now:
- Use the app offline (all data stored locally)
- Make changes that automatically sync to GitHub when online
- Access your data from any device by opening the app and logging in
- View/edit your data directly on GitHub if needed

## How Data Syncing Works

1. **Offline First**: All changes are saved locally immediately
2. **Automatic Sync**: When online, changes sync to GitHub automatically (every minute by default)
3. **Manual Sync**: Click the sync button anytime to sync immediately
4. **Conflict Resolution**: Uses "last-write-wins" strategy (the most recent change wins)
5. **Your Data**: All data is stored as JSON files in your GitHub repo under `apps/[app-name]/`

## Installing as a PWA (Progressive Web App)

Most modern browsers allow you to "install" these apps:

### On Desktop (Chrome/Edge):
1. Open the app
2. Look for the install icon (⊕) in the address bar
3. Click it and follow the prompts
4. The app will open in its own window like a native app

### On Mobile (iOS/Android):
1. Open the app in Safari (iOS) or Chrome (Android)
2. Tap the share/menu button
3. Select "Add to Home Screen"
4. The app will appear on your home screen like a native app

## Troubleshooting

### "Cannot access repository"
- Make sure your token has the `repo` scope
- Verify the repository name is correct
- Check that the repository exists and you have access

### "Sync failed"
- Check your internet connection
- Verify your token hasn't expired
- Make sure you haven't hit GitHub's rate limit (5000 requests/hour)

### "App not working offline"
- Clear your browser cache and reload
- Make sure Service Workers are enabled in your browser
- Try using a local web server instead of file:// access

### Data not syncing
- Check the offline indicator - you might be offline
- Click the sync button manually
- Check browser console for errors (F12 → Console tab)

## Next Steps

- [Create your own app](creating-new-app.md)
- [Learn about the architecture](architecture.md)
- [Explore the framework APIs](../README.md)

## Need Help?

- Check the browser console (F12) for error messages
- Verify your GitHub token and repository settings
- Make sure you're using a modern browser
- Try the app with a local web server

## Privacy & Security

- Your GitHub token is stored only in your browser's local storage
- It never leaves your device except to authenticate with GitHub
- All sync happens directly between your browser and GitHub
- No third-party servers involved
- You can view/backup/edit your data directly on GitHub anytime
