import SwiftUI

/// Root navigation view that handles deep links and shows pairing or controller
struct ContentView: View {
    @EnvironmentObject var deepLinkHandler: DeepLinkHandler
    @State private var showController = false
    @State private var roomCode: String = ""

    var body: some View {
        PairingView(
            onCodeEntered: { code in
                roomCode = code
                showController = true
            },
            onScanTapped: {
                // Scanner will call onCodeEntered when it finds a code
            }
        )
        .fullScreenCover(isPresented: $showController) {
            ControllerModalView(
                roomCode: roomCode,
                onDismiss: {
                    showController = false
                    roomCode = ""
                }
            )
        }
        .onChange(of: deepLinkHandler.hasDeepLink) { hasLink in
            if hasLink, let code = deepLinkHandler.pendingRoomCode {
                roomCode = code
                showController = true
                deepLinkHandler.clearDeepLink()
            }
        }
        .onAppear {
            // Check for pending deep link on app launch
            if let code = deepLinkHandler.pendingRoomCode {
                roomCode = code
                showController = true
                deepLinkHandler.clearDeepLink()
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(DeepLinkHandler())
}
