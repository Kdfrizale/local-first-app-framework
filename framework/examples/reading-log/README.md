# Family Reading Log

A local-first app for tracking books read by family members.

## Quick Start

1. **Start the development server** from the project root:
   ```bash
   cd /home/kyle/local_app_sandbox
   python3 -m http.server 8000
   ```

2. **Open in your browser**: http://localhost:8000/framework/examples/reading-log/

3. **Configure GitHub sync** on first launch

4. **Start tracking books!**

## Features

- 📚 Add/edit/delete books
- 👥 Track multiple readers
- 🔍 Search and filter
- 📊 Statistics dashboard
- 📱 Mobile responsive
- 🔄 Automatic GitHub sync
- ✈️ Works offline

## Data Structure

Books are stored with:
- Title
- Author
- Reader (family member)
- Date finished
- Rating (1-5 stars)
- Notes

## Sync

All data automatically syncs to your GitHub repository at:
`apps/reading-log/data.json`

You can view and edit the data directly on GitHub if needed.

## Troubleshooting

**404 errors on script files?**
- Make sure you're running the server from the project root (`/home/kyle/local_app_sandbox/`), not from this directory
- The correct command is: `cd /home/kyle/local_app_sandbox && python3 -m http.server 8000`

**GitHub sync not working?**
- Check your Personal Access Token has `repo` scope
- Verify repository name is correct
- Check browser console (F12) for detailed errors

## Documentation

See the [main documentation](../../docs/) for more details.
