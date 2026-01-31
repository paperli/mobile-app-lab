import SwiftUI

/// Initial screen with camera button and manual code entry
struct PairingView: View {
    let onCodeEntered: (String) -> Void
    let onScanTapped: () -> Void

    @State private var showScanner = false
    @State private var showCodeEntry = false
    @State private var pendingCode: String?

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
                Spacer()
            }
            .padding()
        }
        .sheet(isPresented: $showScanner, onDismiss: {
            // Process pending code after sheet is fully dismissed
            if let code = pendingCode {
                pendingCode = nil
                onCodeEntered(code)
            }
        }) {
            QRScannerView { code in
                // Store code and dismiss - onDismiss will process it
                pendingCode = code
                showScanner = false
            }
        }
        .sheet(isPresented: $showCodeEntry, onDismiss: {
            if let code = pendingCode {
                pendingCode = nil
                onCodeEntered(code)
            }
        }) {
            CodeEntryView { code in
                pendingCode = code
                showCodeEntry = false
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
        onCodeEntered: { _ in },
        onScanTapped: {}
    )
}
