# Bundle ID Setup Guide for TicketFloLIVE

## 🎯 **Current Status**
- ✅ Bundle ID already configured: `com.ticketflo.live`
- ✅ Apple Developer Team ID: `DA3U3FH5FZ`
- ⚠️ Need to configure development team in Xcode

## 📋 **Step-by-Step Setup**

### **Step 1: Create Bundle ID in Apple Developer Console**

1. **Go to**: https://developer.apple.com/account/resources/identifiers/list
2. **Click "+" button** → App IDs → App
3. **Configure**:
   ```
   Description: TicketFloLIVE
   Bundle ID: com.ticketflo.live
   Type: Explicit
   ```

4. **Enable Capabilities**:
   - ✅ Associated Domains
   - ✅ Push Notifications
   - ✅ NFC Tag Reading
   - ✅ Tap to Pay on iPhone (if approved)

### **Step 2: Configure Xcode Project**

#### **Option A: Using Xcode GUI (Recommended)**

1. **Open** `TicketFloLIVE.xcodeproj` in Xcode
2. **Select** the project in the navigator
3. **Select** the "TicketFloLIVE" target
4. **Go to** "Signing & Capabilities" tab
5. **Configure**:
   ```
   Team: Mitchell Thompson (DA3U3FH5FZ)
   Bundle Identifier: com.ticketflo.live
   ✅ Automatically manage signing
   ```

#### **Option B: Command Line Setup**

Run these commands to configure automatically:

```bash
# Navigate to project
cd /Users/mitchellthompson/Desktop/pulse-ticket-launch/TicketFloLIVE-iOS

# Set development team
xcodebuild -project TicketFloLIVE.xcodeproj \
  -target TicketFloLIVE \
  -configuration Debug \
  DEVELOPMENT_TEAM=DA3U3FH5FZ \
  build
```

### **Step 3: Add Entitlements (for Tap to Pay)**

Create `TicketFloLIVE.entitlements` file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:ticketflo.org</string>
    </array>
    <key>com.apple.developer.nfc.readersession.formats</key>
    <array>
        <string>NDEF</string>
        <string>TAG</string>
    </array>
    <!-- When Tap to Pay is approved: -->
    <!--
    <key>com.apple.developer.tap-to-pay.apple-pay</key>
    <true/>
    -->
</dict>
</plist>
```

### **Step 4: Test Build**

```bash
# Clean and build
cd /Users/mitchellthompson/Desktop/pulse-ticket-launch/TicketFloLIVE-iOS
xcodebuild clean -project TicketFloLIVE.xcodeproj -scheme TicketFloLIVE
xcodebuild -project TicketFloLIVE.xcodeproj -scheme TicketFloLIVE -destination 'platform=iOS Simulator,name=iPhone 16'
```

## 🚀 **TestFlight Deployment**

### **Step 1: Archive for Distribution**

```bash
# Archive the app
xcodebuild \
  -project TicketFloLIVE.xcodeproj \
  -scheme TicketFloLIVE \
  -archivePath TicketFloLIVE.xcarchive \
  -destination 'generic/platform=iOS' \
  archive
```

### **Step 2: Export for App Store**

Create `ExportOptions.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>DA3U3FH5FZ</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
```

### **Step 3: Export and Upload**

```bash
# Export IPA
xcodebuild \
  -exportArchive \
  -archivePath TicketFloLIVE.xcarchive \
  -exportPath . \
  -exportOptionsPlist ExportOptions.plist

# Upload to App Store Connect
xcrun altool \
  --upload-app \
  --type ios \
  --file TicketFloLIVE.ipa \
  --username your-apple-id@email.com \
  --password your-app-specific-password
```

## 🔧 **Troubleshooting**

### **Common Issues**

1. **"No signing identity found"**
   - Solution: Add development team in Xcode
   - Go to Preferences → Accounts → Add Apple ID

2. **"Bundle ID not found"**
   - Solution: Create bundle ID in Apple Developer Console first

3. **"Provisioning profile doesn't match"**
   - Solution: Enable "Automatically manage signing" in Xcode

4. **"Missing entitlements"**
   - Solution: Add capabilities in Apple Developer Console and Xcode

### **Build Configuration Check**

```bash
# Check current configuration
xcodebuild -project TicketFloLIVE.xcodeproj -target TicketFloLIVE -showBuildSettings | grep -E "(PRODUCT_BUNDLE_IDENTIFIER|DEVELOPMENT_TEAM|CODE_SIGN)"
```

## 📱 **Next Steps After Setup**

1. **Test on Simulator** ✅ (already working)
2. **Create TestFlight build**
3. **Test on physical device**
4. **Submit Tap to Pay entitlement request**
5. **Deploy to App Store** (required for Tap to Pay)

## 🎯 **Ready to Use Commands**

Once everything is configured, use these for quick deployment:

```bash
# Quick build test
xcodebuild -project TicketFloLIVE.xcodeproj -scheme TicketFloLIVE -destination 'platform=iOS Simulator,name=iPhone 16'

# Archive for TestFlight
xcodebuild -project TicketFloLIVE.xcodeproj -scheme TicketFloLIVE -archivePath TicketFloLIVE.xcarchive -destination 'generic/platform=iOS' archive
```

Your app is ready to go once you complete the Xcode team configuration! 🚀