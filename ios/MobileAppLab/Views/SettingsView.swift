import SwiftUI

// MARK: - App Mode

enum AppMode: String, CaseIterable {
    case dpad = "dpad"
    case game = "game"
    case theme = "theme"

    var displayName: String {
        switch self {
        case .dpad: return "System Controller"
        case .game: return "Game Modal"
        case .theme: return "Theme Switching"
        }
    }
}

// MARK: - Settings View

struct SettingsView: View {
    var webViewStore: WebViewStore?
    let onDismiss: () -> Void
    let onDisconnect: () -> Void

    @State private var showDisconnectConfirmation = false
    @State private var showModePicker = false
    @State private var currentMode: AppMode = .dpad

    var body: some View {
        ZStack {
            Color(hex: "00001f")
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                ZStack {
                    Text("Controller Settings")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)

                    HStack {
                        Button(action: {
                            HapticService.shared.trigger(.light)
                            onDismiss()
                        }) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                                .frame(width: 40, height: 40)
                                .background(Color.white.opacity(0.08))
                                .clipShape(Circle())
                        }

                        Spacer()
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 16)

                // Menu items
                VStack(spacing: 12) {
                    // Switch Mode
                    Button(action: {
                        HapticService.shared.trigger(.light)
                        showModePicker = true
                    }) {
                        HStack(spacing: 16) {
                            Image(systemName: "square.on.square")
                                .font(.system(size: 20))
                                .foregroundColor(.white.opacity(0.6))
                            Text("Switch Mode")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white)
                            Spacer()
                            Text(currentMode.displayName)
                                .font(.system(size: 14))
                                .foregroundColor(.white.opacity(0.4))
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.06))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                )
                        )
                    }

                    // Support
                    Button(action: {
                        HapticService.shared.trigger(.light)
                    }) {
                        HStack(spacing: 16) {
                            Image(systemName: "questionmark.circle")
                                .font(.system(size: 20))
                                .foregroundColor(.white.opacity(0.6))
                            Text("Support")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.06))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                )
                        )
                    }

                    // Disconnect Controller
                    Button(action: {
                        HapticService.shared.trigger(.light)
                        showDisconnectConfirmation = true
                    }) {
                        HStack(spacing: 16) {
                            Image(systemName: "xmark")
                                .font(.system(size: 20))
                                .foregroundColor(.red.opacity(0.8))
                            Text("Disconnect Controller")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.red.opacity(0.85))
                            Spacer()
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.06))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                )
                        )
                    }

                    Text("Version 1.0.0")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.3))
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, 8)
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)

                Spacer()

                // Footer
                Image("weekend-wordmark-yellow")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 140)
                    .padding(.bottom, 48)
            }

            // Disconnect confirmation modal
            if showDisconnectConfirmation {
                DisconnectConfirmationModal(
                    onConfirm: onDisconnect,
                    onCancel: { showDisconnectConfirmation = false }
                )
            }

            // Mode picker modal
            if showModePicker {
                ModePickerModal(
                    currentMode: currentMode,
                    onSelect: { mode in
                        currentMode = mode
                        webViewStore?.webView?.evaluateJavaScript(
                            "window.__setAppMode && window.__setAppMode('\(mode.rawValue)')"
                        )
                        showModePicker = false
                    },
                    onCancel: { showModePicker = false }
                )
            }
        }
        .statusBarHidden(true)
        .onAppear {
            fetchCurrentMode()
        }
    }

    private func fetchCurrentMode() {
        webViewStore?.webView?.evaluateJavaScript(
            "window.__getAppMode && window.__getAppMode()"
        ) { result, _ in
            if let modeString = result as? String,
               let mode = AppMode(rawValue: modeString) {
                DispatchQueue.main.async {
                    currentMode = mode
                }
            }
        }
    }
}

// MARK: - Mode Picker Modal

struct ModePickerModal: View {
    let currentMode: AppMode
    let onSelect: (AppMode) -> Void
    let onCancel: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.6)
                .ignoresSafeArea()
                .onTapGesture { onCancel() }

            VStack(spacing: 0) {
                Text("Switch Mode")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.top, 28)
                    .padding(.bottom, 20)

                VStack(spacing: 8) {
                    ForEach(AppMode.allCases, id: \.self) { mode in
                        Button(action: {
                            HapticService.shared.trigger(.light)
                            onSelect(mode)
                        }) {
                            HStack {
                                Text(mode.displayName)
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.white)
                                Spacer()
                                if mode == currentMode {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(.white)
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(mode == currentMode
                                          ? Color.white.opacity(0.12)
                                          : Color.white.opacity(0.04))
                            )
                        }
                    }
                }
                .padding(.horizontal, 20)

                Button(action: {
                    HapticService.shared.trigger(.light)
                    onCancel()
                }) {
                    Text("Cancel")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.1))
                        )
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 24)
            }
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color(hex: "1e1e32").opacity(0.95))
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
            .padding(.horizontal, 32)
        }
    }
}

// MARK: - Disconnect Confirmation Modal

struct DisconnectConfirmationModal: View {
    let onConfirm: () -> Void
    let onCancel: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.6)
                .ignoresSafeArea()
                .onTapGesture { onCancel() }

            VStack(spacing: 0) {
                Text("Disconnect your controller?")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding(.top, 32)
                    .padding(.horizontal, 24)

                Text("Your controller will disconnect from the game and you'll return to the mobile app.")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.top, 8)
                    .padding(.horizontal, 24)

                VStack(spacing: 12) {
                    Button(action: {
                        HapticService.shared.trigger(.medium)
                        onConfirm()
                    }) {
                        Text("Disconnect")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color.red.opacity(0.8))
                            )
                    }

                    Button(action: {
                        HapticService.shared.trigger(.light)
                        onCancel()
                    }) {
                        Text("Cancel")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color.white.opacity(0.1))
                            )
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 32)
                .padding(.bottom, 32)
            }
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color(hex: "1e1e32").opacity(0.95))
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
            .padding(.horizontal, 32)
        }
    }
}

#Preview {
    SettingsView(
        onDismiss: {},
        onDisconnect: {}
    )
}
