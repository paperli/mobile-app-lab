# CLAUDE.md - Mobile App Lab Project Guide

This document provides comprehensive context for Claude Code (or any AI assistant) working on this project.

## Project Overview

**Mobile App Lab** is a real-time testbed for mobile-to-TV game connection patterns. It allows a mobile phone to act as a controller for a TV interface using WebSocket communication. The project includes both a web-based mobile controller and a native iOS shell app.

### Key Use Cases
- Test mobile controller UX patterns (D-pad, joystick, trackpad)
- Experiment with haptic feedback on mobile devices
- Prototype TV game hub navigation
- Test real-time WebSocket communication

## Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐     WebSocket      ┌─────────────┐
│   Mobile    │ ←───────────────→  │   Server    │ ←───────────────→  │     TV      │
│  (React)    │                    │  (Express)  │                    │  (React)    │
│  Port 5174  │                    │  Port 3000  │                    │  Port 5173  │
└─────────────┘                    └─────────────┘                    └─────────────┘
```

### Communication Flow
1. TV creates a room and displays a 6-digit code
2. Mobile joins the room using the code (or QR scan)
3. Mobile sends navigation events via WebSocket
4. Server forwards events to the TV
5. TV updates the UI based on navigation

## Project Structure

```
mobile-app-lab/
├── ios/                 # Native iOS app (SwiftUI)
│   ├── MobileAppLab.xcodeproj/
│   └── MobileAppLab/
│       ├── App/                 # App entry point
│       ├── Views/               # SwiftUI views (Pairing, QR Scanner, Controller)
│       ├── WebView/             # WKWebView wrapper + JS bridge
│       ├── Services/            # Haptics, deep link handling
│       ├── Config/              # App configuration
│       └── Resources/           # Assets, Info.plist
│
├── packages/
│   ├── shared/          # Shared TypeScript types & constants
│   │   └── src/
│   │       ├── types.ts      # NavigationEvent, GameData, RoomInfo, etc.
│   │       └── constants.ts  # Socket events, port config, placeholder games
│   │
│   ├── server/          # WebSocket server (Express + Socket.io)
│   │   └── src/
│   │       ├── index.ts         # Server entry, HTTPS setup, CORS
│   │       ├── room-manager.ts  # Room creation, joining, cleanup
│   │       └── socket-handler.ts # Socket event handlers
│   │
│   ├── tv/              # TV interface (React + Vite)
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── components/
│   │       │   ├── GameHub.tsx      # Main game selection screen
│   │       │   ├── GameTile.tsx     # Individual game tiles
│   │       │   ├── FocusFrame.tsx   # Animated selection frame
│   │       │   └── GamePreview.tsx  # Background preview
│   │       ├── hooks/
│   │       │   ├── useSocket.ts     # WebSocket connection
│   │       │   └── useKeyboardNav.ts # Keyboard navigation
│   │       └── utils/
│   │           ├── sounds.ts        # Audio feedback
│   │           └── getMobileUrl.ts  # Dynamic URL detection
│   │
│   └── mobile/          # Mobile controller (React + Vite)
│       └── src/
│           ├── App.tsx
│           ├── components/
│           │   ├── PairingScreen.tsx      # Room code entry
│           │   ├── ControllerSelector.tsx # Layout picker (hidden by default)
│           │   ├── SquareController.tsx   # Default controller (Square layout)
│           │   ├── DPadController.tsx     # Traditional D-pad
│           │   ├── JoystickController.tsx # Swipe-based joystick
│           │   ├── TrackpadController.tsx # Trackpad-style
│           │   ├── GamepadController.tsx  # Gamepad-style with A/B buttons
│           │   └── VoiceGlow.tsx          # Voice visualization effect
│           ├── hooks/
│           │   ├── useSocket.ts           # WebSocket connection
│           │   ├── useSwipeGestures.ts    # Touch gesture detection
│           │   └── useVoiceInput.ts       # Microphone access
│           ├── utils/
│           │   ├── haptics.ts             # Haptic feedback (native bridge + web)
│           │   └── isNativeApp.ts         # Native app detection
│           └── types/
│               └── native-bridge.d.ts     # TypeScript declarations for iOS bridge
│
├── setup-https.sh       # HTTPS certificate setup (auto-updates .env files)
├── render.yaml          # Render.com deployment config
└── package.json         # Workspace root
```

## Quick Start

### First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Install mkcert (for HTTPS)
brew install mkcert  # macOS

# 3. Run HTTPS setup (generates certs AND updates .env files)
./setup-https.sh

# 4. Start all services
npm run dev
```

### After Switching Machines/Networks

When your IP address changes (new network, new machine), just run:

```bash
./setup-https.sh
```

This will:
1. Detect your new IP address
2. Generate new SSL certificates
3. **Automatically update all .env files** with the new IP

### Mobile Device Testing

#### iOS (iPhone/iPad)

1. Copy the mkcert CA certificate to your device:
   ```bash
   # Find the certificate
   mkcert -CAROOT
   # Copy rootCA.pem to your device via AirDrop/email/cloud
   ```

2. Install on iOS:
   - Open the certificate file
   - Settings → Profile Downloaded → Install
   - Settings → General → About → Certificate Trust Settings → Enable trust

3. Access: `https://YOUR_IP:5174`

#### Android

1. Transfer `rootCA.pem` to your phone
2. Settings → Security → Install certificate → CA certificate
3. Access: `https://YOUR_IP:5174`
4. Alternative: In Chrome, tap Advanced → Proceed anyway (quicker for testing)

## Key Technical Decisions

### HTTPS Required
HTTPS is mandatory for:
- Microphone access (voice features)
- Secure WebSocket (wss://)
- Modern browser APIs

The project uses **mkcert** for trusted local certificates.

### Dynamic URL Detection
The TV app (`getMobileUrl.ts`) automatically detects the correct mobile URL:
- On Render.com: Uses `mobile-lab-mobile.onrender.com`
- On local network: Uses the same IP with port 5174
- On localhost: Uses `localhost:5174` or env var

This means QR codes always point to the correct URL without manual configuration.

### Socket Connection Logic
Both mobile and TV apps auto-detect protocol (http/https) from the page URL, ensuring socket connections match.

### Controller Layouts
Default is **Square** layout. Other layouts (D-Pad, Joystick, Trackpad, Gamepad, Hybrid) are available but hidden by default. To enable the selector, modify `ControllerSelector.tsx`.

### iOS Native App
The iOS app (`ios/`) is a SwiftUI shell that hosts the mobile web controller in a WKWebView. Key features:
- **Native Haptics**: Uses Core Haptics and UIFeedbackGenerator via JavaScript bridge
- **QR Scanner**: Native AVFoundation camera for scanning TV QR codes
- **Deep Linking**: Custom URL scheme `mobileapplab://pair?code=XXXXXX`
- **Bundle ID**: `studio.paperworks.mobileapplab`
- **Minimum iOS**: 15.0

The web app detects the native bridge via `window.NativeBridge` and uses native haptics when available.

## Environment Variables

### packages/server/.env
```env
PORT=3000
ALLOWED_ORIGINS=https://localhost:5173,https://localhost:5174,https://YOUR_IP:5173,https://YOUR_IP:5174
```

### packages/tv/.env
```env
VITE_SERVER_URL=https://localhost:3000
VITE_MOBILE_URL=https://YOUR_IP:5174  # For QR code
```

### packages/mobile/.env
```env
VITE_SERVER_URL=https://YOUR_IP:3000  # Must use IP for phone access
```

**Note:** The `setup-https.sh` script automatically updates all IP addresses in these files.

## Common Tasks

### Running the Dev Server
```bash
npm run dev              # All services
npm run dev:server       # Server only
npm run dev:tv           # TV only
npm run dev:mobile       # Mobile only
```

### Building for Production
```bash
npm run build            # All packages
npm run typecheck        # Type check all packages
```

### Deploying to Render.com
The `render.yaml` file configures automatic deployment. See `DEPLOYMENT.md` for details.

### Running the iOS App
```bash
# Open in Xcode
open ios/MobileAppLab.xcodeproj

# Or from command line
xcodebuild -project ios/MobileAppLab.xcodeproj -scheme MobileAppLab -destination 'platform=iOS Simulator,name=iPhone 15'
```

The iOS app will connect to the web server running on your development machine. Update `AppConfig.swift` with your IP if needed.

## Troubleshooting

### "Port 5174 is in use"
Another process is using the port. Either:
- Kill the process: `lsof -ti:5174 | xargs kill`
- Or restart all servers

### Mobile can't connect
1. Check you're using the IP address (not localhost)
2. Ensure phone is on the same WiFi network
3. Check certificate trust (see Mobile Device Testing above)
4. Try the Chrome "Proceed anyway" option

### Certificate errors
Re-run `./setup-https.sh` to regenerate certificates for your current IP.

### Room not found
The TV page was refreshed and created a new room. Get the new 6-digit code from the TV screen.

### CORS errors
Update `ALLOWED_ORIGINS` in `packages/server/.env` to include your IP address. The setup script does this automatically.

### iOS App Connection Issues

The iOS shell app requires specific configuration to connect to the development server. Here's a checklist:

**1. Network IP Configuration (not localhost)**
- Physical iOS devices cannot use `localhost` - it refers to the iPhone itself
- `AppConfig.swift` must use the Mac's network IP for physical devices
- The code uses `#if targetEnvironment(simulator)` to handle this automatically
- When your IP changes, update the IP in `AppConfig.swift`

**2. Server ALLOWED_ORIGINS**
- `packages/server/.env` must include the network IP in `ALLOWED_ORIGINS`
- Example: `ALLOWED_ORIGINS=https://localhost:5173,https://localhost:5174,...,https://192.168.50.72:5173,https://192.168.50.72:5174`

**3. Mobile Web App Server URL**
- `packages/mobile/.env` should NOT set `VITE_SERVER_URL` (leave it commented out)
- The web app auto-detects the server URL from `window.location.hostname`
- This allows it to work for both localhost (browser) and network IP (iOS device)

**4. WebView Duplicate Load Prevention**
- `WebViewContainer.swift` uses `loadURLIfNeeded()` to prevent multiple rapid `load()` calls
- SwiftUI's `updateUIView` can be called multiple times during state changes
- Without this protection, requests get cancelled with error -999 (NSURLErrorCancelled)

**5. App Transport Security (ATS)**
- `Info.plist` includes `NSAllowsArbitraryLoads` and `NSAllowsLocalNetworking` for development
- The WebView's SSL challenge handler accepts self-signed certs in DEBUG builds

**Quick Fix Checklist for iOS Connection:**
```bash
# 1. Get your current IP
ipconfig getifaddr en0

# 2. Update AppConfig.swift with your IP (for physical device section)
# 3. Update packages/server/.env ALLOWED_ORIGINS with your IP
# 4. Ensure packages/mobile/.env has VITE_SERVER_URL commented out
# 5. Restart servers: npm run dev
# 6. Rebuild iOS app in Xcode (Cmd+B, Cmd+R)
```

### SwiftUI State Management Patterns

These patterns were discovered while fixing QR scanner issues:

**1. Use `fullScreenCover(item:)` instead of `fullScreenCover(isPresented:)`**
- When presenting a modal that needs data (like a room code), use the item-based API
- With `isPresented` + separate state variables, race conditions can cause empty data
- With `item`, the data is captured atomically when the cover is presented
```swift
// BAD: Two separate states can get out of sync
@State private var showController = false
@State private var roomCode = ""
.fullScreenCover(isPresented: $showController) {
    ControllerView(roomCode: roomCode)  // roomCode might be empty!
}

// GOOD: Single state, data is guaranteed
@State private var activeRoom: RoomItem?
.fullScreenCover(item: $activeRoom) { room in
    ControllerView(roomCode: room.code)  // code is always valid
}
```

**2. Use sheet's `onDismiss` for state transitions**
- Don't call callbacks while a sheet is still dismissing
- Store pending data, dismiss the sheet, then process in `onDismiss`
```swift
@State private var pendingCode: String?
.sheet(isPresented: $showScanner, onDismiss: {
    if let code = pendingCode {
        pendingCode = nil
        onCodeEntered(code)  // Called after sheet is fully dismissed
    }
}) {
    ScannerView { code in
        pendingCode = code
        showScanner = false  // Just dismiss, don't process yet
    }
}
```

**3. UIViewRepresentable layout with preview layers**
- `AVCaptureVideoPreviewLayer` needs proper frame updates
- Use a custom UIView subclass that overrides `layoutSubviews()`
- Don't rely on `updateUIView` for frame updates
```swift
class CameraPreviewUIView: UIView {
    override func layoutSubviews() {
        super.layoutSubviews()
        previewLayer.frame = bounds  // Always updates correctly
    }
}
```

**4. Callback patterns over `onChange` for time-sensitive operations**
- SwiftUI's `onChange` may not fire immediately or reliably for fast operations
- For QR scanning, use direct callbacks instead of observing `@Published` values
```swift
// Set up callback before operation starts
scanner.onCodeScanned = { code in
    handleCode(code)
}
scanner.start()
```

## Project History (Key Commits)

| Date | Feature |
|------|---------|
| Initial | Basic mobile-to-TV connection with D-pad |
| +1 | Added Gamepad and Hybrid controller layouts |
| +2 | Multi-device support (up to 4 controllers) |
| +3 | Render.com deployment configuration |
| +4 | HTTPS setup for voice features |
| +5 | Voice-activated wave visualization |
| +6 | Square controller layout (now default) |
| +7 | QR code auto-connect |
| +8 | Focus frame animations and audio feedback |
| +9 | Dynamic mobile URL detection |
| +10 | Automated setup script with .env updates |
| +11 | Renamed to Mobile App Lab |
| +12 | iOS native shell app with haptics and QR scanner |
| +13 | Fix iOS WebView connection issues (network IP, CORS, ATS) |
| +14 | Fix QR scanner camera preview and first-scan reliability |

## Code Style

- TypeScript with strict mode
- React functional components with hooks
- Tailwind CSS for styling
- Pre-commit hooks run type checking (husky)

## Ports Reference

| Service | Port | URL (localhost) | URL (network) |
|---------|------|-----------------|---------------|
| Server  | 3000 | https://localhost:3000 | https://YOUR_IP:3000 |
| TV      | 5173 | https://localhost:5173 | https://YOUR_IP:5173 |
| Mobile  | 5174 | https://localhost:5174 | https://YOUR_IP:5174 |

## Files to Know

| File | Purpose |
|------|---------|
| `setup-https.sh` | **Run this when IP changes** - regenerates certs and updates .env |
| `packages/shared/src/types.ts` | All TypeScript interfaces |
| `packages/shared/src/constants.ts` | Socket events, port config |
| `packages/tv/src/components/FocusFrame.tsx` | Focus frame styling (margin: 0.5vw) |
| `packages/mobile/src/components/SquareController.tsx` | Main controller component |
| `packages/server/src/index.ts` | Server entry, HTTPS/CORS setup |
| `packages/mobile/src/utils/haptics.ts` | Haptic feedback (uses native bridge when available) |
| `packages/mobile/src/utils/isNativeApp.ts` | Detects if running in iOS shell app |
| `ios/MobileAppLab/Config/AppConfig.swift` | iOS app URL configuration |
| `ios/MobileAppLab/WebView/NativeBridgeHandler.swift` | JavaScript bridge for native features |
| `ios/MobileAppLab/Services/HapticService.swift` | iOS Core Haptics implementation |
