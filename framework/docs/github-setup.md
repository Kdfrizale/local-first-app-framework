# GitHub Setup Guide

This guide will help you set up GitHub for syncing your local-first apps.

## Overview

The framework uses GitHub as a sync and backup mechanism. Your data is stored as JSON files in a GitHub repository, which provides:

- **Version control**: Full history of all changes
- **Backup**: Your data is safely stored on GitHub's servers
- **Sync**: Access your data from multiple devices
- **Human-readable**: View and edit data directly on GitHub
- **Free**: GitHub is free for personal use

## Step 1: Create a GitHub Account

If you don't have one already:

1. Go to [github.com](https://github.com)
2. Click "Sign up"
3. Follow the registration process
4. Verify your email address

## Step 2: Create a Data Repository

1. Log in to GitHub
2. Click the "+" icon in the top right → "New repository"
3. Repository settings:
   - **Name**: `family-data` (or any name you prefer)
   - **Description**: "Data storage for my local-first apps"
   - **Visibility**: 
     - **Private** (recommended) - only you can see it
     - **Public** - anyone can see it (not recommended for personal data)
   - **Initialize**: Leave unchecked (the app will create files automatically)
4. Click "Create repository"

Your repository URL will be: `https://github.com/your-username/family-data`

## Step 3: Create a Personal Access Token

GitHub requires authentication to access your repositories. We'll use a Personal Access Token (PAT).

### Creating the Token

1. Go to GitHub Settings:
   - Click your profile picture → Settings
   - Scroll down to "Developer settings" (bottom of left sidebar)
   - Click "Personal access tokens" → "Tokens (classic)"
   - Or visit directly: https://github.com/settings/tokens/new

2. Click "Generate new token (classic)"

3. Token settings:
   - **Note**: "Family Apps" (or any descriptive name)
   - **Expiration**: 
     - "No expiration" (most convenient)
     - Or set an expiration date (more secure, but you'll need to regenerate)
   - **Scopes**: Select `repo` (Full control of private repositories)
     - This includes: repo:status, repo_deployment, public_repo, repo:invite, security_events

4. Scroll down and click "Generate token"

5. **IMPORTANT**: Copy the token immediately!
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - You won't be able to see it again
   - Store it safely (we'll enter it in the app)

### Token Security Tips

- **Never share your token** - it gives full access to your repositories
- **Don't commit it to code** - keep it out of any files you might push to GitHub
- **Don't paste it in public places** - Discord, Slack, forums, etc.
- **Store it safely** - use a password manager if available
- **Regenerate if compromised** - if you accidentally share it, delete it and create a new one

## Step 4: Configure Apps to Use Your Repository

When you first open any app, you'll be prompted to enter:

1. **GitHub Personal Access Token**: Paste the token you just created
2. **GitHub Username**: Your GitHub username (not email)
3. **Repository Name**: The name of your data repo (e.g., `family-data`)

The app will:
- Verify the token works
- Check it can access the repository
- Save these settings in your browser's local storage
- Start syncing automatically

## Repository Structure

After using apps, your repository will have this structure:

```
family-data/
├── apps/
│   ├── reading-log/
│   │   ├── data.json         # Reading log data
│   │   └── metadata.json     # App metadata (optional)
│   ├── goal-tracker/
│   │   ├── goals.json        # Goals data
│   │   └── progress.json     # Progress tracking
│   └── meal-planner/
│       ├── meals.json        # Meals database
│       └── schedule.json     # Meal schedule
└── README.md                 # Optional readme
```

Each app creates its own folder and data files.

## Viewing Your Data

You can view and edit your data directly on GitHub:

1. Go to your repository on GitHub
2. Navigate to `apps/[app-name]/`
3. Click on a `.json` file
4. View the raw data or click "Edit" to modify it
5. Commit your changes
6. The apps will download the changes on next sync

**Example**: Manually add a book to your reading log by editing `apps/reading-log/data.json`

## Managing Multiple Devices

To use apps on multiple devices:

1. **Device 1**: Set up the app with your GitHub credentials
2. **Device 2**: Open the app and enter the same GitHub credentials
3. Both devices will sync to the same repository
4. Changes on either device will sync to the other

### Sync Behavior

- **Automatic**: Apps sync every 60 seconds when online
- **Manual**: Click the sync button anytime
- **Offline**: Changes are saved locally and sync when back online
- **Conflicts**: Last-write-wins (most recent change is kept)

## Troubleshooting

### "Authentication failed"

- Verify you copied the entire token (starts with `ghp_`)
- Make sure the token hasn't expired
- Check that the token has `repo` scope
- Try creating a new token

### "Cannot access repository"

- Verify the repository name is correct (case-sensitive)
- Make sure the repository exists
- Check that it's under your username (not an organization)
- Verify the token has access to the repository

### "Permission denied"

- The token needs `repo` scope
- If the repo is in an organization, you may need organization permissions
- Try creating the repo under your personal account

### "Rate limit exceeded"

- GitHub allows 5000 API requests per hour for authenticated users
- This is usually plenty for personal use
- Wait an hour or reduce sync frequency

### Token Expired

If your token expires:

1. Go to GitHub Settings → Personal access tokens
2. Delete the old token
3. Create a new token with the same settings
4. Update the token in your apps (Settings → Reconfigure)

## Security Best Practices

### 1. Use Fine-Grained Tokens (Alternative)

GitHub now offers fine-grained tokens with more specific permissions:

1. Go to Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Select specific repositories
4. Choose minimal permissions needed

### 2. Use Private Repositories

Always use private repositories for personal/family data.

### 3. Review Access Regularly

Check Settings → Applications to see what has access to your account.

### 4. Enable Two-Factor Authentication

Protect your GitHub account with 2FA:
- Settings → Password and authentication → Two-factor authentication

### 5. Rotate Tokens Periodically

Create new tokens and delete old ones every few months.

## Advanced: Using GitHub Organizations

For family collaboration:

1. Create a GitHub Organization (free for personal use)
2. Invite family members
3. Create the data repository under the organization
4. Each family member creates their own token
5. Everyone accesses the same shared repository

Benefits:
- Centralized data
- Individual access control
- Audit logs of who changed what

## Alternative: GitHub Gists

For simpler single-file apps, you could use GitHub Gists:

- Pros: Simpler API, good for small data
- Cons: Less organized, no folder structure

The current framework uses repositories for better organization.

## Backing Up Your Data

Your data is already backed up on GitHub, but you can also:

### Option 1: Download from GitHub
1. Go to your repository
2. Click "Code" → "Download ZIP"
3. Extract and save the data files

### Option 2: Clone the Repository
```bash
git clone https://github.com/your-username/family-data.git
```

### Option 3: Export from Apps
Some apps may include export features (CSV, PDF, etc.)

## Privacy Considerations

### What's Stored Where

- **GitHub**: Your data files (books, goals, etc.)
- **Browser Local Storage**: 
  - Your GitHub token
  - App settings
  - Cached data for offline use

### Who Can See Your Data

- **Private repository**: Only you (and people you invite)
- **Public repository**: Anyone on the internet
- **GitHub employees**: Have access to private repos (for maintenance), but have strict policies

### Deleting Your Data

To completely remove your data:

1. Delete the GitHub repository
2. Clear browser data for the app sites
3. Uninstall any PWAs

## Next Steps

- [Get started with your first app](getting-started.md)
- [Create your own custom app](creating-new-app.md)
- [Learn about the architecture](architecture.md)

## Resources

- [GitHub Personal Access Tokens Documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
