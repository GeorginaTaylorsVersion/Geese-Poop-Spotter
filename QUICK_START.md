# 🚀 Quick Start Guide

## Step 1: Install Node.js (REQUIRED - Do this first!)

You **must** install Node.js before you can run this app. Follow these steps:

### ✅ Installation Steps:

1. **Open your web browser** and go to: **https://nodejs.org/**

2. **Click the big green button** that says "Download Node.js (LTS)" 
   - LTS = Long Term Support (most stable version)
   - This will download a `.pkg` file for macOS

3. **Find the downloaded file** (usually in your Downloads folder)
   - It will be named something like: `node-v20.x.x.pkg`

4. **Double-click the `.pkg` file** to open the installer

5. **Follow the installation wizard**:
   - Click "Continue" through the screens
   - Accept the license agreement
   - Click "Install" (you may need to enter your Mac password)
   - Wait for installation to complete
   - Click "Close" when done

6. **IMPORTANT: Close your terminal completely** and open a new one
   - This refreshes your PATH so it can find Node.js
   - Or you can run: `source ~/.zshrc` in your current terminal

7. **Verify installation** by running these commands in your terminal:
   ```bash
   node --version
   npm --version
   ```
   
   You should see version numbers (like `v20.10.0` and `10.2.3`)

### ⚠️ If you still see "command not found":

- Make sure you **closed and reopened your terminal** after installation
- Try logging out and back into your Mac
- Check the INSTALLATION.md file for troubleshooting tips

---

## Step 2: Install App Dependencies

Once Node.js is installed, run:

```bash
cd "/Users/georgina/Documents/Geese Poop Spotter"
npm run install-all
```

This will install all required packages for both the frontend and backend.

---

## Step 3: Start the App

Run this command:

```bash
npm run dev
```

This starts both:
- **Backend server** on `http://localhost:5000`
- **Frontend app** on `http://localhost:3000`

---

## Step 4: Open in Browser

Open your web browser and go to:

**http://localhost:3000**

You should see the Geese Poop Spotter app! 🦢💩

---

## Need Help?

- Check `INSTALLATION.md` for detailed installation instructions
- Check `README.md` for full documentation
- Make sure Node.js is installed: `node --version` should show a version number
