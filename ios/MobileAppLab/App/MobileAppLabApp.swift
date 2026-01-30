import SwiftUI

@main
struct MobileAppLabApp: App {
    @StateObject private var deepLinkHandler = DeepLinkHandler()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(deepLinkHandler)
                .onOpenURL { url in
                    deepLinkHandler.handle(url: url)
                }
        }
    }
}
