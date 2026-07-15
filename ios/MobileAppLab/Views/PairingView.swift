import SwiftUI

/// Initial screen with camera button and manual code entry
struct PairingView: View {
    let onCodeEntered: (String, URL?) -> Void
    let onScanTapped: () -> Void

    @State private var showScanner = false
    @State private var showCodeEntry = false
    @State private var showServerSettings = false
    @State private var pendingCode: String?
    @State private var pendingSourceURL: URL?

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color(hex: "1a1a2e"), Color(hex: "16213e")],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 40) {
                Spacer()

                // App title
                VStack(spacing: 8) {
                    Text("Mobile App Lab")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.white)

                    Text("Connect to your TV")
                        .font(.system(size: 16))
                        .foregroundColor(.gray)
                }

                Spacer()

                // Camera button (primary action)
                Button(action: {
                    showScanner = true
                }) {
                    VStack(spacing: 12) {
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 48))
                            .foregroundColor(.white)

                        Text("Scan QR Code")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                    }
                    .frame(width: 200, height: 160)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color(hex: "0f3460"))
                            .shadow(color: .black.opacity(0.3), radius: 10, y: 5)
                    )
                }
                .buttonStyle(ScaleButtonStyle())

                // Divider with "or"
                HStack {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 1)

                    Text("or")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                        .padding(.horizontal, 16)

                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 1)
                }
                .padding(.horizontal, 40)

                // Manual code entry button
                Button(action: {
                    showCodeEntry = true
                }) {
                    Text("Enter Code Manually")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(Color(hex: "e94560"))
                }

                Spacer()

                // Dev server configuration — set once per network (or auto-remembered
                // from a scanned QR), so a changing IP never needs an app rebuild.
                Button(action: { showServerSettings = true }) {
                    HStack(spacing: 6) {
                        Image(systemName: "server.rack")
                            .font(.system(size: 11))
                        Text(serverHostDisplay)
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(.gray.opacity(0.7))
                }
                .padding(.bottom, 8)
            }
            .padding()
        }
        .sheet(isPresented: $showScanner, onDismiss: {
            // Process pending code after sheet is fully dismissed
            if let code = pendingCode {
                let sourceURL = pendingSourceURL
                pendingCode = nil
                pendingSourceURL = nil
                onCodeEntered(code, sourceURL)
            }
        }) {
            QRScannerView { code, sourceURL in
                // Store code and source URL, dismiss - onDismiss will process it
                pendingCode = code
                pendingSourceURL = sourceURL
                showScanner = false
            }
        }
        .sheet(isPresented: $showCodeEntry, onDismiss: {
            if let code = pendingCode {
                pendingCode = nil
                onCodeEntered(code, nil)
            }
        }) {
            CodeEntryView { code in
                pendingCode = code
                showCodeEntry = false
            }
        }
        .sheet(isPresented: $showServerSettings) {
            ServerSettingsView()
        }
    }

    private var serverHostDisplay: String {
        if let comps = URLComponents(string: AppConfig.currentDevServerBaseURL), let host = comps.host {
            let port = comps.port.map { ":\($0)" } ?? ""
            return "Server: \(host)\(port)"
        }
        return "Server settings"
    }
}

// MARK: - Server Settings

/// Lets the user set the dev server host at runtime (no rebuild on IP change).
struct ServerSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var text: String = AppConfig.currentDevServerBaseURL

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "1a1a2e").ignoresSafeArea()

                VStack(alignment: .leading, spacing: 20) {
                    Text("Enter your Mac's address (IP or hostname). The port defaults to 5174.")
                        .font(.system(size: 15))
                        .foregroundColor(.gray)

                    TextField("https://192.168.1.20:5174", text: $text)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                        .keyboardType(.URL)
                        .font(.system(size: 17, design: .monospaced))
                        .foregroundColor(.white)
                        .padding(16)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(hex: "16213e"))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                )
                        )

                    Text("Tip: scanning a QR code sets this automatically.")
                        .font(.system(size: 13))
                        .foregroundColor(.gray.opacity(0.7))

                    Button(action: {
                        AppConfig.saveServerBaseURL(text)
                        HapticService.shared.trigger(.success)
                        dismiss()
                    }) {
                        Text("Save")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(RoundedRectangle(cornerRadius: 12).fill(Color(hex: "e94560")))
                    }

                    Button(action: {
                        AppConfig.saveServerBaseURL("")
                        text = AppConfig.currentDevServerBaseURL
                        HapticService.shared.trigger(.light)
                    }) {
                        Text("Reset to default")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.gray)
                            .frame(maxWidth: .infinity)
                    }

                    Spacer()
                }
                .padding(24)
            }
            .navigationTitle("Server")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(Color(hex: "e94560"))
                }
            }
        }
    }
}

// MARK: - Button Style

struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    PairingView(
        onCodeEntered: { _, _ in },
        onScanTapped: {}
    )
}
