# 📱 Mobile App Guide - Geese Poop Spotter

This guide will help you build and deploy the Geese Poop Spotter app for iOS and Android devices.

## 🎯 Overview

The app has been converted to a native mobile app using **Capacitor**, which allows the React web app to run as a native iOS and Android app with access to device features like:
- 📷 Native camera for taking photos
- 📍 GPS location services
- 📱 Native app experience

## 📋 Prerequisites

### For iOS Development:
- **macOS** (required for iOS development)
- **Xcode** (latest version from Mac App Store)
- **CocoaPods** (`sudo gem install cocoapods`)
- **Apple Developer Account** (free for development, $99/year for App Store distribution)

### For Android Development:
- **Android Studio** (download from [developer.android.com](https://developer.android.com/studio))
- **Java Development Kit (JDK)** 11 or higher
- **Android SDK** (installed via Android Studio)
- **Google Play Developer Account** ($25 one-time fee for App Store distribution)

## 🚀 Quick Start

### 1. Build the Web App

First, build the React web app:

```bash
cd client
npm run build
```

### 2. Sync with Native Platforms

Sync the web build with iOS and Android:

```bash
cd client
npm run cap:sync
```

Or from the root directory:

```bash
npm run mobile:build
```

## 📱 iOS Development

### Opening in Xcode

```bash
cd client
npm run cap:ios
```

Or from root:

```bash
npm run mobile:ios
```

This will open the project in Xcode.

### Building for iOS Simulator

1. Open the project in Xcode
2. **Device dropdown**: In the **top-left toolbar** of the Xcode window, you’ll see a control that shows something like “App > iPhone 14 Pro” (or another device). Click it to open the **device/simulator menu**. Under “iOS Simulators”, pick a simulator (e.g., iPhone 14 Pro, iPhone 15).
3. Click the **Play** button (▶) in that same toolbar, or press **Cmd + R**
4. The app will launch in the simulator

### Building for Physical Device

1. Connect your iPhone via USB
2. In the **top-left toolbar** of Xcode, click the device dropdown and select your connected iPhone (it appears under “iOS Device” or by name)
3. You may need to:
   - Sign in with your Apple ID in Xcode preferences
   - Trust your developer certificate on your iPhone (Settings > General > VPN & Device Management)
4. Click the Play button to build and install

### App Store Distribution

1. In Xcode, select "Any iOS Device" as the target
2. Go to **Product > Archive**
3. Once archived, click **Distribute App**
4. Follow the App Store Connect wizard
5. Submit for review

## 🤖 Android Development

### Opening in Android Studio

```bash
cd client
npm run cap:android
```

Or from root:

```bash
npm run mobile:android
```

This will open the project in Android Studio.

### Building for Android Emulator

1. Open the project in Android Studio
2. Create/start an Android Virtual Device (AVD) from the AVD Manager
3. Click the Run button or press `Shift + F10`
4. The app will launch in the emulator

### Building for Physical Device

1. Enable **Developer Options** on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging** in Developer Options
3. Connect your device via USB
4. In Android Studio, select your device from the device dropdown
5. Click Run to build and install

### Google Play Distribution

1. In Android Studio, go to **Build > Generate Signed Bundle / APK**
2. Choose **Android App Bundle**
3. Create a keystore (save it securely!)
4. Build the release bundle
5. Upload to Google Play Console
6. Submit for review

## 🔄 Development Workflow

### Making Changes

1. **Edit React code** in `client/src/`
2. **Build the web app:**
   ```bash
   cd client
   npm run build
   ```
3. **Sync with native platforms:**
   ```bash
   npm run cap:sync
   ```
4. **Test in Xcode/Android Studio**

### Adding Native Plugins

If you need additional native features:

```bash
cd client
npm install @capacitor/[plugin-name]
npx cap sync
```

## 📝 Configuration

### App Information

Edit `client/capacitor.config.ts` to change:
- App name
- App ID (bundle identifier)
- Server URL (for development)

### Permissions

Permissions are configured in `capacitor.config.ts`:
- **Camera**: For taking photos
- **Location**: For GPS coordinates

These will be requested automatically when the app first uses these features.

## 🎨 Mobile-Specific Features

The app automatically detects when running on mobile and provides:

1. **Native Camera**: Tap "Take Photo" to use the device camera
2. **Photo Gallery**: Tap "Choose from Gallery" to select existing photos
3. **GPS Location**: Tap "Use My Current Location" to get precise coordinates
4. **Touch-Optimized UI**: Larger buttons and touch-friendly interface

## 🐛 Troubleshooting

### iOS Issues

**"No signing certificate found"**
- Sign in to Xcode with your Apple ID
- Go to Xcode > Preferences > Accounts
- Add your Apple ID and select a team

**"Unable to install app"**
- Trust the developer on your device: Settings > General > VPN & Device Management

**Build fails**
- Clean build folder: Product > Clean Build Folder (Shift + Cmd + K)
- Delete DerivedData folder

### Android Issues

**Gradle sync fails**
- Open Android Studio
- Go to File > Invalidate Caches / Restart
- Click "Invalidate and Restart"

**"SDK location not found"**
- Open Android Studio
- Go to File > Project Structure > SDK Location
- Set the Android SDK location

**App crashes on launch**
- Check Logcat in Android Studio for error messages
- Ensure all permissions are granted in device settings

### General Issues

**Changes not appearing**
- Make sure you ran `npm run build` after making changes
- Run `npx cap sync` to copy files to native projects
- Clean and rebuild in Xcode/Android Studio

**API calls fail**
- In development, ensure the backend server is running
- For production, update the API URL in `capacitor.config.ts`

## 📦 Building Release Versions

### iOS Release Build

1. Open in Xcode
2. Select "Any iOS Device" as target
3. Product > Archive
4. Distribute App > App Store Connect

### Android Release Build

1. Open in Android Studio
2. Build > Generate Signed Bundle / APK
3. Choose Android App Bundle
4. Follow the signing wizard
5. Upload to Google Play Console

## 🔐 Security Notes

- **API Keys**: Never commit API keys or secrets to version control
- **Signing Certificates**: Keep your signing certificates and keystores secure
- **Permissions**: Only request permissions you actually need

## 📚 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Development Guide](https://developer.apple.com/ios/)
- [Android Development Guide](https://developer.android.com/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

## 🆘 Getting Help

If you encounter issues:
1. Check the Capacitor documentation
2. Review error messages in Xcode/Android Studio
3. Check device logs (Logcat for Android, Console for iOS)
4. Ensure all dependencies are installed: `npm install`

---

**Happy Building! 🦢💩📱**
