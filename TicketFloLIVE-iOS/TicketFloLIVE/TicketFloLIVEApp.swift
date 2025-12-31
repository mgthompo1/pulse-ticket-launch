import SwiftUI

// MARK: - App Settings (Persisted with UserDefaults)
class AppSettings: ObservableObject {
    static let shared = AppSettings()

    @AppStorage("hapticFeedbackEnabled") var hapticFeedbackEnabled: Bool = true
    @AppStorage("autoRefreshEnabled") var autoRefreshEnabled: Bool = true
    @AppStorage("showTicketCodes") var showTicketCodes: Bool = true
    @AppStorage("lastSelectedEventId") var lastSelectedEventId: String = ""
    @AppStorage("stripeLocationId") var stripeLocationId: String = "tml_FOaDYKjqAd0mIM"

    private init() {}
}

@main
struct TicketFloLIVEApp: App {
    @StateObject private var authService = AuthService()
    @StateObject private var appSettings = AppSettings.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
                .environmentObject(appSettings)
        }
    }
}