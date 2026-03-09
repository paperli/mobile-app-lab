import SwiftUI

struct SettingsView: View {
    let onDismiss: () -> Void
    let onDisconnect: () -> Void

    @State private var showDisconnectConfirmation = false

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
        }
        .statusBarHidden(true)
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
