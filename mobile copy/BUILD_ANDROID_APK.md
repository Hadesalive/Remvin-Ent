# Building Android APK

## Prerequisites
- Node.js installed
- Expo account (free at https://expo.dev)

## Quick Start

### Option A: Cloud Build (Currently Running)
**Time:** 10-15 minutes  
**Status:** Building in Expo's cloud servers

**Step 1: Login to Expo** (if not already logged in)
```bash
npx eas-cli login
```

**Step 2: Build the APK**
```bash
npm run build:android
```

This will:
- Build the APK in the cloud (no Android Studio needed)
- Take approximately 10-15 minutes
- Provide a download link when complete
- Create an APK file ready for installation

### Option B: Local Build (Faster - 2-5 minutes) ⚠️ REQUIRES SETUP
**Time:** 2-5 minutes  
**Status:** Android folder exists, but Android Studio/SDK not installed

**Current Status:**
- ✅ Android folder created (already done via `npx expo prebuild`)
- ❌ Android Studio/SDK not installed
- ❌ ANDROID_HOME not configured

**To Enable Local Builds:**

1. **Install Android Studio** (recommended):
   - Download: https://developer.android.com/studio
   - Install with Android SDK
   - SDK location: Usually `C:\Users\YourName\AppData\Local\Android\Sdk`

2. **Set Environment Variables:**
   ```powershell
   # Set ANDROID_HOME (replace with your actual SDK path)
   [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\alpha\AppData\Local\Android\Sdk', 'User')
   
   # Add to PATH
   $sdkPath = [System.Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User')
   $currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
   $newPath = "$currentPath;$sdkPath\platform-tools;$sdkPath\tools"
   [System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
   ```

3. **Restart Terminal** and build:
   ```bash
   npm run build:android:local
   ```

**APK Location after build:**
```
android/app/build/outputs/apk/release/app-release.apk
```

**See `SETUP_LOCAL_BUILD.md` for detailed setup instructions.**

**For Now:** Use the cloud build (already running - 10-15 minutes)

## Build Options

### Option 1: Cloud Build (Currently Running)
**Time:** 10-15 minutes  
**Status:** Building in Expo's cloud servers  
**Output:** Download link provided when complete

### Option 2: Local Build (Faster - 2-5 minutes)
**Time:** 2-5 minutes  
**Requires:** Android Studio installed  
**Output:** APK file in `android/app/build/outputs/apk/release/`

### Preview Build (APK for testing - Cloud)
```bash
npm run build:android
```

### Production Build (APK for release - Cloud)
```bash
npm run build:android:production
```

### Local Build (Requires Android Studio)
If you have Android Studio installed and want to build locally:
```bash
npm run build:android:local
```

## What Happens During Build

1. **EAS CLI** will prompt you to configure the build (if first time)
2. **Build starts** in Expo's cloud servers
3. **Progress** is shown in the terminal
4. **Download link** is provided when build completes
5. **APK file** can be downloaded and installed on Android devices

## Troubleshooting

### Not logged in
Run: `npx eas-cli login`

### Build fails
- Check your internet connection
- Ensure all dependencies are installed: `npm install`
- Check for any TypeScript/compilation errors

### Need help?
- Expo docs: https://docs.expo.dev/build/introduction/
- EAS Build docs: https://docs.expo.dev/build/building-on-ci/

## Notes

- The APK will be signed with Expo's default certificate
- For production releases, consider setting up your own signing key
- The build configuration is in `eas.json`
- App configuration is in `app.json`
