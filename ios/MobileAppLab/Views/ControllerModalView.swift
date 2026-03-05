import SwiftUI

/// Full-screen modal that hosts the web controller
struct ControllerModalView: View {
    let roomCode: String
    let sourceURL: URL?
    let onDismiss: () -> Void

    @State private var isLoading = true
    @State private var loadError: Error?
    @State private var showExitConfirmation = false
    @StateObject private var webViewStore = WebViewStore()

    var body: some View {
        ZStack {
            // Background (matches web app)
            Color(hex: "1a1a2e")
                .ignoresSafeArea()

            // WebView — use scanned URL directly when available, otherwise fall back to AppConfig
            WebViewContainer(
                url: sourceURL.map { AppConfig.controllerURL(from: $0, roomCode: roomCode) }
                    ?? AppConfig.controllerURL(roomCode: roomCode),
                isLoading: $isLoading,
                loadError: $loadError,
                webViewStore: webViewStore
            )
            .ignoresSafeArea()

            // Shake-to-reload (debug only)
            #if DEBUG
            ShakeDetector {
                HapticService.shared.trigger(.light)
                webViewStore.reload()
            }
            .frame(width: 0, height: 0)
            #endif

            // Loading overlay
            if isLoading {
                LoadingOverlay()
            }

            // Error overlay
            if let error = loadError {
                ErrorOverlay(
                    error: error,
                    onRetry: {
                        loadError = nil
                        isLoading = true
                    },
                    onDismiss: onDismiss
                )
            }

            // Close button (top-right)
            VStack {
                HStack {
                    Spacer()

                    Button(action: {
                        HapticService.shared.trigger(.light)
                        showExitConfirmation = true
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white.opacity(0.7))
                            .background(
                                Circle()
                                    .fill(Color.black.opacity(0.3))
                            )
                    }
                    .padding(.trailing, 16)
                    .padding(.top, 16)
                }

                Spacer()
            }
        }
        .alert("Disconnect?", isPresented: $showExitConfirmation) {
            Button("Stay", role: .cancel) { }
            Button("Disconnect", role: .destructive) {
                onDismiss()
            }
        } message: {
            Text("Are you sure you want to disconnect from the TV?")
        }
        .statusBarHidden(true)
    }
}

// MARK: - Loading Overlay

struct LoadingOverlay: View {
    var body: some View {
        ZStack {
            Color(hex: "1a1a2e")
                .ignoresSafeArea()

            VStack(spacing: 16) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "e94560")))
                    .scaleEffect(1.5)

                Text("Connecting...")
                    .font(.system(size: 16))
                    .foregroundColor(.gray)
            }
        }
    }
}

// MARK: - Error Overlay

struct ErrorOverlay: View {
    let error: Error
    let onRetry: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            Color(hex: "1a1a2e")
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Image(systemName: "wifi.slash")
                    .font(.system(size: 48))
                    .foregroundColor(Color(hex: "e94560"))

                Text("Connection Failed")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(.white)

                Text(error.localizedDescription)
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                HStack(spacing: 16) {
                    Button("Go Back") {
                        onDismiss()
                    }
                    .buttonStyle(SecondaryButtonStyle())

                    Button("Retry") {
                        onRetry()
                    }
                    .buttonStyle(PrimaryButtonStyle())
                }
                .padding(.top, 16)
            }
        }
    }
}

// MARK: - Button Styles

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.white)
            .frame(width: 120, height: 48)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(hex: "e94560"))
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(Color(hex: "e94560"))
            .frame(width: 120, height: 48)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color(hex: "e94560"), lineWidth: 2)
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
    }
}

#Preview {
    ControllerModalView(
        roomCode: "123456",
        sourceURL: nil,
        onDismiss: {}
    )
}
