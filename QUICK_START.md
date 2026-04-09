# 🚀 Quick Start Guide

Get started with your local-first family apps framework in 5 minutes!

## Step 1: Test the Reading Log (2 minutes)

Open a terminal and run:

```bash
cd /home/kyle/local_app_sandbox
python3 -m http.server 8000
```

Then open your browser to: **http://localhost:8000/framework/examples/reading-log/**

## Step 2: Set Up GitHub (3 minutes)

### A. Create Data Repository
1. Go to https://github.com/new
2. Name it `family-data` (or any name you like)
3. Make it **Private**
4. Click "Create repository"

### B. Create Personal Access Token
1. Go to https://github.com/settings/tokens/new
2. Name it "Family Apps"
3. Check the `repo` checkbox (full control)
4. Click "Generate token"
5. **Copy the token** (starts with `ghp_...`)

### C. Configure the App
1. In the app (http://localhost:8000), you'll see a setup screen
2. Paste your token
3. Enter your GitHub username
4. Enter your repository name (`family-data`)
5. Click "Connect to GitHub"

## Step 3: Start Using! (30 seconds)

Click "Add Book" and track your first book!

- ✅ Works offline
- ✅ Auto-syncs to GitHub
- ✅ Access from any device

## What You Just Built

You now have:
- ✅ A working reading log app
- ✅ Offline-first functionality
- ✅ Automatic GitHub backup
- ✅ Multi-device sync
- ✅ Zero dependencies

## Next: Create Your Own App

Want to track something else? Use the template:

```bash
cd /home/kyle/local_app_sandbox/framework/examples
cp -r ../templates my-workout-tracker
cd my-workout-tracker
# Edit index.html and app.js
python3 -m http.server 8001
# Open http://localhost:8001
```

Follow the guide in `framework/docs/creating-new-app.md` for detailed instructions.

## Common Use Cases

**Personal Tracking**:
- Exercise logs
- Meal tracking
- Daily habits
- Goals & metrics

**Family Apps**:
- Chore assignments
- Recipe collection
- Pet care schedules
- Memory journals

**Home Management**:
- Maintenance tasks
- Expense tracking
- Garden planning
- Home inventory

## Key Files to Know

- **Your code**: `/home/kyle/local_app_sandbox/`
- **Framework core**: `framework/core/*.js`
- **Templates**: `framework/templates/`
- **Examples**: `framework/examples/`
- **Docs**: `framework/docs/`

## Helpful Commands

```bash
# Run any app
cd /home/kyle/local_app_sandbox
python3 -m http.server 8000
# Then open http://localhost:8000/framework/examples/[app-name]/

# Create new app
cp -r framework/templates framework/examples/my-app

# View your data on GitHub
# Open: https://github.com/YOUR-USERNAME/family-data

# Check browser console for errors
# Press F12 in browser → Console tab
```

## Troubleshooting

**"Cannot access repository"**
- Check your token has `repo` scope
- Verify repository name is correct
- Make sure token hasn't expired

**"Offline" indicator won't go away**
- Check your internet connection
- Try refreshing the page

**Data not syncing**
- Click the Sync button manually
- Check browser console (F12) for errors
- Verify GitHub credentials in Settings

## Documentation

- **Getting Started**: `framework/docs/getting-started.md`
- **Creating Apps**: `framework/docs/creating-new-app.md`
- **GitHub Setup**: `framework/docs/github-setup.md`
- **Architecture**: `framework/docs/architecture.md`
- **Full Summary**: `IMPLEMENTATION_SUMMARY.md`

## Deploy Your App

### Free Hosting Options:

**GitHub Pages** (Easiest):
1. Push your code to GitHub
2. Settings → Pages
3. Select your branch
4. Done! URL: `https://username.github.io/repo`

**Netlify**:
1. Sign up at netlify.com
2. Drag & drop your app folder
3. Get instant URL

**Vercel**:
1. Sign up at vercel.com
2. Import your GitHub repo
3. One-click deploy

All options work perfectly with static HTML/JS apps!

## What Makes This Special

Unlike other frameworks:
- ✅ No `npm install`
- ✅ No build step
- ✅ No dependencies to manage
- ✅ Works in 2044 without changes
- ✅ You own your data
- ✅ Works offline
- ✅ Simple enough for AI to generate apps

## Your Data

All your data is stored:
- **Locally**: In your browser's IndexedDB (instant access)
- **GitHub**: In your private repository (backup & sync)

**You own it. You control it. You can view/edit/export it anytime.**

## Need Help?

1. Check the browser console (F12 → Console)
2. Read the docs in `framework/docs/`
3. Look at the reading log example code
4. Check the GitHub API docs if needed

## Have Fun Building! 🎉

The framework is complete and ready to use. Create apps for anything you want to track:
- Fitness goals
- Books read
- Meals planned
- Chores completed
- Expenses shared
- Movies watched
- And much more!

**Remember**: Keep it simple. That's the point. 😊

---

**Now go test the reading log and start tracking your family's books!**

```bash
cd /home/kyle/local_app_sandbox
python3 -m http.server 8000
# Open http://localhost:8000/framework/examples/reading-log/
```
