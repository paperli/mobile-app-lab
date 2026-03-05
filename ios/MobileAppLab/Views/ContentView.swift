import SwiftUI

/// Wrapper to make room code identifiable for fullScreenCover
struct RoomCodeItem: Identifiable {
    let id = UUID()
    let code: String
    let sourceURL: URL?
}

/// Root navigation view that handles deep links and shows pairing or controller
struct ContentView: View {
    @EnvironmentObject var deepLinkHandler: DeepLinkHandler
    @State private var activeRoomCode: RoomCodeItem?

    var body: some View {
        PairingView(
            onCodeEntered: { code, sourceURL in
                // Using item-based fullScreenCover ensures the code is captured atomically
                activeRoomCode = RoomCodeItem(code: code, sourceURL: sourceURL)
            },
            onScanTapped: {
                // Scanner will call onCodeEntered when it finds a code
            }
        )
        .fullScreenCover(item: $activeRoomCode) { item in
            ControllerModalView(
                roomCode: item.code,
                sourceURL: item.sourceURL,
                onDismiss: {
                    activeRoomCode = nil
                }
            )
        }
        .onChange(of: deepLinkHandler.hasDeepLink) { hasLink in
            if hasLink, let code = deepLinkHandler.pendingRoomCode {
                activeRoomCode = RoomCodeItem(code: code, sourceURL: nil)
                deepLinkHandler.clearDeepLink()
            }
        }
        .onAppear {
            // Check for pending deep link on app launch
            if let code = deepLinkHandler.pendingRoomCode {
                activeRoomCode = RoomCodeItem(code: code, sourceURL: nil)
                deepLinkHandler.clearDeepLink()
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(DeepLinkHandler())
}
