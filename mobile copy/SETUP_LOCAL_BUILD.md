# Setting Up Local Android Build

## Issue: Android SDK Not Found

The local build requires Android SDK to be installed and configured.

## Solution Options

### Option 1: Install Android Studio (Recommended - Easiest)

1. **Download Android Studio**
   - Visit: https://developer.android.com/studio
   - Download and install Android Studio

2. **During Installation:**
   - Make sure to install Android SDK
   - Note the SDK location (usually `C:\Users\YourName\AppData\Local\Android\Sdk`)

3. **Set Environment Variables:**
   ```powershell
   # Set ANDROID_HOME (replace with your actual SDK path)
   [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\alpha\AppData\Local\Android\Sdk', 'User')
   
   # Add to PATH
   $currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
   $newPath = "$currentPath;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
   [System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
   ```

4. **Restart Terminal** and try building again:
   ```bash
   npm run build:android:local
   ```

### Option 2: Use Cloud Build (No Setup Required)

Since the cloud build is already running, you can:
- Wait for it to complete (10-15 minutes)
- Get the APK download link
- No Android Studio needed!

### Option 3: Install Android SDK Command Line Tools Only

If you don't want full Android Studio:

1. **Download SDK Command Line Tools**
   - Visit: https://developer.android.com/studio#command-tools
   - Download "Command line tools only"

2. **Extract and Set Up**
   ```powershell
   # Extract to a folder like C:\Android\Sdk
   # Then set environment variables as shown in Option 1
   ```

## Quick Check Commands

```powershell
# Check if Android SDK exists
Test-Path "$env:LOCALAPPDATA\Android\Sdk"

# Check if adb is available
adb version

# Check current ANDROID_HOME
echo $env:ANDROID_HOME
```

## After Setup

Once Android SDK is configured, you can build locally:
```bash
npm run build:android:local
```

The APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Recommendation

**For now:** Wait for the cloud build to finish (already running)
**For future:** Install Android Studio for faster local builds
