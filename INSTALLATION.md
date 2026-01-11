# Installation Guide

## Installing Node.js on macOS

You need to install Node.js (which includes npm) before you can run this app. Here are the easiest methods:

### Option 1: Download from Official Website (Recommended for beginners)

1. **Visit the Node.js website**: https://nodejs.org/
2. **Download the LTS (Long Term Support) version** - this is the most stable version
3. **Run the installer** (.pkg file) and follow the installation wizard
4. **Restart your terminal** after installation
5. **Verify installation** by running:
   ```bash
   node --version
   npm --version
   ```

### Option 2: Install using Homebrew (If you have it or want to install it)

**First, install Homebrew** (if you don't have it):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Then install Node.js**:
```bash
brew install node
```

**Verify installation**:
```bash
node --version
npm --version
```

### Option 3: Using nvm (Node Version Manager) - For advanced users

If you want to manage multiple Node.js versions:

1. **Install nvm**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   ```

2. **Restart your terminal** or run:
   ```bash
   source ~/.zshrc
   ```

3. **Install Node.js**:
   ```bash
   nvm install --lts
   nvm use --lts
   ```

## After Installing Node.js

Once Node.js is installed, you can proceed with setting up the Geese Poop Spotter app:

1. **Navigate to the project directory** (if not already there):
   ```bash
   cd "/Users/georgina/Documents/Geese Poop Spotter"
   ```

2. **Install all dependencies**:
   ```bash
   npm run install-all
   ```

3. **Start the development servers**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and go to: `http://localhost:3000`

## Troubleshooting

### If `npm` command is still not found after installation:

1. **Close and reopen your terminal** - this refreshes your PATH
2. **Check your PATH**:
   ```bash
   echo $PATH
   ```
   You should see `/usr/local/bin` or similar Node.js paths

3. **If needed, add Node.js to your PATH manually**:
   ```bash
   echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

### If you get permission errors:

You may need to use `sudo` for some commands, but this is usually not necessary with the official Node.js installer.

## Need Help?

- Node.js official docs: https://nodejs.org/en/docs/
- Check Node.js installation: https://nodejs.org/en/download/package-manager/
