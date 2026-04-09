# Local-First Family Apps Framework

A zero-dependency framework for building simple, beautiful, long-lasting web applications for personal and family use.

## 🎯 Philosophy

- **Simple**: Vanilla HTML/CSS/JavaScript - no frameworks, no build tools
- **Durable**: Built on web standards to last 20+ years without maintenance
- **Local-First**: Works offline, syncs via GitHub when online
- **Beautiful**: Tailwind CSS for modern, responsive UIs
- **AI-Friendly**: Consistent patterns make it easy for AI agents to generate new apps

## 🚀 Quick Start

1. **Clone or download this framework**
2. **Set up a GitHub repo for your data** (see [GitHub Setup Guide](framework/docs/github-setup.md))
3. **Start the development server**:
   ```bash
   cd /home/kyle/local_app_sandbox
   python3 -m http.server 8000
   # Or use the helper script:
   ./run-server.sh
   ```
4. **Open the reading log example**: http://localhost:8000/framework/examples/reading-log/
5. **Enter your GitHub Personal Access Token** when prompted
6. **Start tracking your data!**

## 📱 Example Apps

- **Reading Log** (`framework/examples/reading-log/`) - Track books read by family members
- **Goal Tracker** (`framework/examples/goal-tracker/`) - WIG scoreboard for personal goals
- **Meal Planner** (`framework/examples/meal-planner/`) - Plan meals and generate shopping lists

## 🏗️ Architecture

### Core Modules
- **github-sync.js** - GitHub API integration for data sync
- **local-storage.js** - IndexedDB/localStorage for offline data
- **sync-controller.js** - Orchestrates sync between local and remote
- **router.js** - Hash-based routing for single-page apps
- **state.js** - Simple reactive state management
- **components/** - Reusable UI components

### How It Works
1. Data stored locally in IndexedDB
2. Apps work completely offline
3. When online, data syncs to GitHub repo
4. Conflict resolution with last-write-wins strategy
5. All data is human-readable JSON/Markdown on GitHub

## 📖 Documentation

- [Getting Started](framework/docs/getting-started.md)
- [Creating a New App](framework/docs/creating-new-app.md)
- [GitHub Setup](framework/docs/github-setup.md)
- [Architecture Details](framework/docs/architecture.md)

## 🛠️ Technology Stack

- **UI**: Vanilla HTML/CSS/JavaScript
- **Styling**: Tailwind CSS (CDN)
- **Local Storage**: IndexedDB (with localStorage fallback)
- **Remote Storage**: GitHub API
- **Auth**: GitHub Personal Access Token

## ✨ Key Features

- ✅ Zero build process - just open HTML files
- ✅ Works offline completely
- ✅ Automatic background sync
- ✅ Mobile-responsive design
- ✅ PWA capabilities (installable)
- ✅ No dependencies to manage
- ✅ Data viewable/editable on GitHub
- ✅ Fast and lightweight

## 🎨 Creating New Apps

Creating a new app is simple:

1. Copy the app template
2. Define your data schema
3. Customize the UI
4. Test locally
5. Deploy (GitHub Pages, Netlify, or file://)

See [Creating a New App](framework/docs/creating-new-app.md) for detailed instructions.

## 🔒 Security

- GitHub Personal Access Token stored locally (never shared)
- All operations client-side
- No backend server required
- GitHub handles access control

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile: iOS Safari, Chrome Mobile

Requires: IndexedDB, Service Workers, ES6+ JavaScript

## 📄 License

MIT License - Use freely for personal or commercial projects

## 🤝 Contributing

This is a personal framework, but feel free to fork and adapt for your needs!

---

**Built with ❤️ for families who want simple, lasting solutions**
