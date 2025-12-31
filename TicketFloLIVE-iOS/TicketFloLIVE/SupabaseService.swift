import Foundation
import Combine

// MARK: - Supabase Models
struct SupabaseEvent: Identifiable, Codable {
    let id: String
    let name: String
    let description: String?
    let event_date: String
    let venue: String?
    let capacity: Int
    let status: String
    let organization_id: String
    let created_at: String
    let updated_at: String
}

struct SupabaseTicket: Identifiable, Codable {
    let id: String
    let ticket_code: String
    let checked_in: Bool?
    let status: String
    let order_item_id: String
    let created_at: String
    let used_at: String?
}

struct SupabaseOrderItem: Identifiable, Codable {
    let id: String
    let order_id: String
    let ticket_type_id: String
    let quantity: Int
    let unit_price: Decimal
    let customer_name: String?
    let customer_email: String?
}

// MARK: - Point of Sale Models
struct SupabaseTicketType: Identifiable, Codable {
    let id: String
    let event_id: String
    let name: String
    let description: String?
    let price: Double
    let quantity_available: Int
    let quantity_sold: Int
    let sale_start_date: String?
    let sale_end_date: String?
    let created_at: String
    let updated_at: String

    var isAvailable: Bool {
        let remaining = quantity_available - quantity_sold
        return remaining > 0
    }

    var remainingQuantity: Int {
        return quantity_available - quantity_sold
    }
}

struct SupabaseMerchandise: Identifiable, Codable {
    let id: String
    let event_id: String
    let name: String
    let description: String?
    let price: Double
    let image_url: String?
    let stock_quantity: Int?
    let category: String?
    let size_options: [String]?
    let color_options: [String]?
    let is_active: Bool?
    let created_at: String
    let updated_at: String

    var isAvailable: Bool {
        guard let stock = stock_quantity, let active = is_active else { return false }
        return active && stock > 0
    }

    var stockDisplay: String {
        guard let stock = stock_quantity else { return "N/A" }
        return "\(stock) in stock"
    }
}

// MARK: - POS Sale Model for Analytics
struct POSSale: Identifiable {
    let id: String
    let eventId: String
    let itemName: String
    let itemType: String // "ticket" or "merchandise"
    let quantity: Int
    let unitPrice: Double
    let totalAmount: Double
    let customerName: String
    let timestamp: Date

    var total: Double {
        return Double(quantity) * unitPrice
    }
}

// MARK: - Combined Guest Model for UI
struct SupabaseGuest: Identifiable {
    let id: String
    let name: String
    let email: String
    let ticketCode: String
    let checkedIn: Bool
    let checkedInAt: String?
    var notes: String?

    var initials: String {
        let components = name.components(separatedBy: " ")
        return components.compactMap { $0.first?.uppercased() }.joined()
    }
}

// MARK: - Realtime Message Types
struct RealtimePayload: Codable {
    let type: String
    let event: String?
    let topic: String?
    let payload: RealtimeData?
    let ref: String?
}

struct RealtimeData: Codable {
    let data: RealtimeRecord?
    let errors: [String]?
}

struct RealtimeRecord: Codable {
    let id: String?
    let ticket_code: String?
    let checked_in: Bool?
    let used_at: String?
}

// MARK: - Supabase Service
class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    // Use the same credentials as your web app
    private let supabaseURL = "https://yoxsewbpoqxscsutqlcb.supabase.co"
    private let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k"

    @Published var events: [SupabaseEvent] = []
    @Published var guests: [SupabaseGuest] = []
    @Published var ticketTypes: [SupabaseTicketType] = []
    @Published var merchandise: [SupabaseMerchandise] = []
    @Published var posSales: [POSSale] = []  // Track POS sales for analytics
    @Published var isLoading = false
    @Published var error: String?

    // CRITICAL: Track user authentication and organization
    @Published var isAuthenticated = false
    @Published var userOrganizationId: String?
    @Published var userEmail: String?
    @Published var userId: String?  // Store user UUID for API calls
    @Published var sessionExpired = false  // Notify UI when session expires
    @Published var stripeTerminalLocationId: String?  // Stripe Terminal location for Tap to Pay

    // Realtime sync status
    @Published var isRealtimeConnected = false
    @Published var isSyncing = false
    @Published var lastRealtimeUpdate: Date?

    // Store the user's JWT access token for authenticated API calls
    private var userAccessToken: String?
    private var refreshToken: String?
    private var tokenExpiresAt: Date?

    // Realtime WebSocket
    private var realtimeTask: URLSessionWebSocketTask?
    private var realtimeSession: URLSession?
    private var heartbeatTimer: Timer?
    private var currentRealtimeEventId: String?

    private init() {
        // Load persisted POS sales on init
        loadPersistedSales()
    }

    private func loadPersistedSales() {
        let persistedSales = LocalPersistence.shared.getAllPOSSales()
        if !persistedSales.isEmpty {
            posSales = persistedSales
            print("📦 Loaded \(persistedSales.count) persisted POS sales")
        }
    }

    // MARK: - Token Management
    private func isTokenExpired() -> Bool {
        guard let expiresAt = tokenExpiresAt else { return true }
        // Consider token expired 60 seconds before actual expiry to avoid edge cases
        return Date().addingTimeInterval(60) >= expiresAt
    }

    func refreshAccessToken() async -> Bool {
        guard let refreshToken = refreshToken else {
            print("❌ No refresh token available")
            await handleSessionExpiry()
            return false
        }

        print("🔄 Refreshing access token...")

        do {
            let url = URL(string: "\(supabaseURL)/auth/v1/token?grant_type=refresh_token")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let body: [String: Any] = ["refresh_token": refreshToken]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let newAccessToken = json["access_token"] as? String,
                   let newRefreshToken = json["refresh_token"] as? String,
                   let expiresIn = json["expires_in"] as? Int {

                    await MainActor.run {
                        self.userAccessToken = newAccessToken
                        self.refreshToken = newRefreshToken
                        self.tokenExpiresAt = Date().addingTimeInterval(TimeInterval(expiresIn))
                        self.sessionExpired = false
                    }
                    print("✅ Access token refreshed successfully")
                    return true
                }
            }

            print("❌ Token refresh failed")
            await handleSessionExpiry()
            return false

        } catch {
            print("❌ Token refresh error: \(error)")
            await handleSessionExpiry()
            return false
        }
    }

    private func handleSessionExpiry() async {
        await MainActor.run {
            self.sessionExpired = true
            self.isAuthenticated = false
            self.userAccessToken = nil
            self.refreshToken = nil
            self.tokenExpiresAt = nil
            self.error = "Your session has expired. Please sign in again."
        }
    }

    /// Ensures we have a valid access token, refreshing if needed
    func ensureValidToken() async -> String? {
        if isTokenExpired() {
            let refreshed = await refreshAccessToken()
            if !refreshed {
                return nil
            }
        }
        return userAccessToken
    }

    // MARK: - Caching
    private var guestCache: [String: (guests: [SupabaseGuest], timestamp: Date)] = [:]
    private var ticketTypesCache: [String: (types: [SupabaseTicketType], timestamp: Date)] = [:]
    private var merchandiseCache: [String: (items: [SupabaseMerchandise], timestamp: Date)] = [:]

    private let guestCacheExpiry: TimeInterval = 30 // 30 seconds for dynamic guest data
    private let staticDataCacheExpiry: TimeInterval = 300 // 5 minutes for ticket types & merchandise

    // MARK: - Request Deduplication
    private var ongoingGuestFetches: [String: Task<[SupabaseGuest], Error>] = [:]
    private var ongoingTicketTypeFetches: [String: Task<[SupabaseTicketType], Error>] = [:]
    private var ongoingMerchandiseFetches: [String: Task<[SupabaseMerchandise], Error>] = [:]

    func shouldUseCache(for eventId: String) -> Bool {
        guard let cached = guestCache[eventId] else { return false }
        return Date().timeIntervalSince(cached.timestamp) < guestCacheExpiry
    }

    private func shouldUseTicketTypesCache(for eventId: String) -> Bool {
        guard let cached = ticketTypesCache[eventId] else { return false }
        return Date().timeIntervalSince(cached.timestamp) < staticDataCacheExpiry
    }

    private func shouldUseMerchandiseCache(for eventId: String) -> Bool {
        guard let cached = merchandiseCache[eventId] else { return false }
        return Date().timeIntervalSince(cached.timestamp) < staticDataCacheExpiry
    }

    // MARK: - Authentication
    func signIn(email: String, password: String) async -> Bool {
        await MainActor.run {
            isLoading = true
            error = nil
        }

        do {
            // Supabase authentication endpoint
            let url = URL(string: "\(supabaseURL)/auth/v1/token?grant_type=password")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let authData: [String: Any] = [
                "email": email,
                "password": password
            ]

            request.httpBody = try JSONSerialization.data(withJSONObject: authData)

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("Auth API Response Status: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("Auth API Response: \(responseString)")
                }

                if httpResponse.statusCode == 200 {
                    // Parse auth response to get user ID and access token
                    guard let authResponse = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                        print("❌ Failed to parse auth response as JSON")
                        await MainActor.run {
                            self.error = "Failed to parse login response"
                            self.isLoading = false
                        }
                        return false
                    }

                    print("📦 Auth response keys: \(authResponse.keys)")

                    guard let user = authResponse["user"] as? [String: Any] else {
                        print("❌ No 'user' object in auth response")
                        await MainActor.run {
                            self.error = "Invalid login response - no user data"
                            self.isLoading = false
                        }
                        return false
                    }

                    guard let userId = user["id"] as? String else {
                        print("❌ No user ID in response")
                        await MainActor.run {
                            self.error = "Invalid login response - no user ID"
                            self.isLoading = false
                        }
                        return false
                    }

                    let userEmail = user["email"] as? String ?? "unknown"

                    // Get access token - this is critical for authenticated API calls
                    guard let accessToken = authResponse["access_token"] as? String else {
                        print("❌ No access_token in auth response")
                        print("📦 Available keys: \(authResponse.keys)")
                        await MainActor.run {
                            self.error = "Login succeeded but no access token received"
                            self.isLoading = false
                        }
                        return false
                    }

                    print("✅ Got access token from login response (length: \(accessToken.count))")

                    // Store access token, refresh token, and expiry
                    self.userAccessToken = accessToken
                    self.refreshToken = authResponse["refresh_token"] as? String
                    if let expiresIn = authResponse["expires_in"] as? Int {
                        self.tokenExpiresAt = Date().addingTimeInterval(TimeInterval(expiresIn))
                        print("📅 Token expires at: \(self.tokenExpiresAt?.description ?? "unknown")")
                    }

                    // Get user's organization ID (use access token for this request)
                    let orgId = await fetchUserOrganizationId(userId: userId)

                    await MainActor.run {
                        self.isAuthenticated = true
                        self.sessionExpired = false
                        self.userEmail = userEmail
                        self.userId = userId  // Store user UUID for check-in API
                        self.userOrganizationId = orgId
                        self.isLoading = false
                    }

                    if orgId == nil {
                        await MainActor.run {
                            self.error = "User is not associated with any organization. Please contact support."
                        }
                        print("⚠️ User \(userEmail) authenticated but has no organization association")
                    }

                    print("✅ Login successful for user: \(userEmail)")
                    return true
                }
            }

            await MainActor.run {
                self.error = "Authentication failed"
                self.isLoading = false
            }
            return false

        } catch {
            await MainActor.run {
                self.error = "Authentication error: \(error.localizedDescription)"
                self.isLoading = false
            }
            print("Auth error: \(error)")
            return false
        }
    }

    private func fetchUserOrganizationId(userId: String) async -> String? {
        // Use the stored access token for authenticated requests
        let authToken = userAccessToken ?? supabaseKey

        // FIRST: Check organizations table (where user is OWNER) - prioritize this
        do {
            let url = URL(string: "\(supabaseURL)/rest/v1/organizations?select=id,name,stripe_terminal_location_id&user_id=eq.\(userId)")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("🏢 Organizations (owned) lookup API Response Status: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("🏢 Organizations (owned) lookup API Response: \(responseString)")
                }

                if httpResponse.statusCode == 200,
                   let orgs = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
                   !orgs.isEmpty,
                   let firstOrg = orgs.first,
                   let organizationId = firstOrg["id"] as? String {
                    let orgName = firstOrg["name"] as? String ?? "Unknown"
                    print("✅ Found OWNED organization: \(orgName) (ID: \(organizationId)) for user: \(userId)")

                    // Store Stripe Terminal location ID if configured
                    if let terminalLocationId = firstOrg["stripe_terminal_location_id"] as? String {
                        await MainActor.run {
                            self.stripeTerminalLocationId = terminalLocationId
                        }
                        print("💳 Found Stripe Terminal Location ID: \(terminalLocationId)")
                    } else {
                        print("⚠️ No Stripe Terminal Location ID configured for this organization")
                    }

                    return organizationId
                }
            }
        } catch {
            print("❌ Error fetching owned organizations: \(error)")
        }

        // FALLBACK: Try organization_users table (where user is member but not owner)
        do {
            let url = URL(string: "\(supabaseURL)/rest/v1/organization_users?select=organization_id&user_id=eq.\(userId)")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("👥 Organization users lookup API Response Status: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("👥 Organization users lookup API Response: \(responseString)")
                }

                if httpResponse.statusCode == 200,
                   let orgUsers = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
                   !orgUsers.isEmpty,
                   let firstOrgUser = orgUsers.first,
                   let organizationId = firstOrgUser["organization_id"] as? String {
                    print("✅ Found organization ID via organization_users (member): \(organizationId) for user: \(userId)")
                    return organizationId
                }
            }
        } catch {
            print("❌ Error fetching organization ID from organization_users: \(error)")
        }

        print("❌ No organization found for user ID: \(userId)")
        return nil
    }

    func signOut() {
        isAuthenticated = false
        sessionExpired = false
        userOrganizationId = nil
        userEmail = nil
        userId = nil  // Clear user ID on sign out
        userAccessToken = nil  // Clear access token on sign out
        refreshToken = nil  // Clear refresh token
        tokenExpiresAt = nil  // Clear token expiry
        events = []
        guests = []
        ticketTypes = []
        merchandise = []
        posSales = []  // Clear POS sales on sign out
        disconnectRealtime()
        clearCaches()
    }

    // MARK: - Realtime Subscriptions
    func connectRealtime(for eventId: String) {
        // Disconnect existing connection if any
        disconnectRealtime()

        currentRealtimeEventId = eventId
        print("🔌 Connecting to Supabase Realtime for event: \(eventId)")

        // Build WebSocket URL for Supabase Realtime
        // Format: wss://<project>.supabase.co/realtime/v1/websocket?apikey=<key>&vsn=1.0.0
        let wsURLString = supabaseURL
            .replacingOccurrences(of: "https://", with: "wss://")
            + "/realtime/v1/websocket?apikey=\(supabaseKey)&vsn=1.0.0"

        guard let wsURL = URL(string: wsURLString) else {
            print("❌ Invalid WebSocket URL")
            return
        }

        realtimeSession = URLSession(configuration: .default)
        realtimeTask = realtimeSession?.webSocketTask(with: wsURL)
        realtimeTask?.resume()

        // Start receiving messages
        receiveRealtimeMessage()

        // Send initial join message after a short delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.joinTicketsChannel(eventId: eventId)
        }

        // Start heartbeat to keep connection alive
        startHeartbeat()

        DispatchQueue.main.async {
            self.isRealtimeConnected = true
        }
    }

    private func joinTicketsChannel(eventId: String) {
        // Subscribe to ticket updates for this event
        // Topic format: realtime:public:tickets
        let joinPayload: [String: Any] = [
            "topic": "realtime:public:tickets",
            "event": "phx_join",
            "payload": [
                "config": [
                    "broadcast": ["self": false],
                    "presence": ["key": ""],
                    "postgres_changes": [
                        [
                            "event": "UPDATE",
                            "schema": "public",
                            "table": "tickets",
                            "filter": ""  // We'll filter client-side
                        ]
                    ]
                ]
            ],
            "ref": "1"
        ]

        sendRealtimeMessage(joinPayload)
        print("📡 Joined tickets realtime channel")
    }

    private func sendRealtimeMessage(_ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let jsonString = String(data: data, encoding: .utf8) else {
            print("❌ Failed to serialize realtime message")
            return
        }

        realtimeTask?.send(.string(jsonString)) { error in
            if let error = error {
                print("❌ Failed to send realtime message: \(error)")
            }
        }
    }

    private func receiveRealtimeMessage() {
        realtimeTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleRealtimeMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self?.handleRealtimeMessage(text)
                    }
                @unknown default:
                    break
                }
                // Continue receiving
                self?.receiveRealtimeMessage()

            case .failure(let error):
                print("❌ Realtime receive error: \(error)")
                DispatchQueue.main.async {
                    self?.isRealtimeConnected = false
                }
                // Try to reconnect after a delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
                    if let eventId = self?.currentRealtimeEventId {
                        self?.connectRealtime(for: eventId)
                    }
                }
            }
        }
    }

    private func handleRealtimeMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        // Parse the message
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return
        }

        let event = json["event"] as? String ?? ""

        // Handle different event types
        switch event {
        case "phx_reply":
            // Join acknowledgment
            if let payload = json["payload"] as? [String: Any],
               let status = payload["status"] as? String,
               status == "ok" {
                print("✅ Successfully joined realtime channel")
            }

        case "postgres_changes":
            // Database change event
            if let payload = json["payload"] as? [String: Any],
               let changeData = payload["data"] as? [String: Any] {
                handleTicketUpdate(changeData)
            }

        case "phx_error":
            print("❌ Realtime channel error")

        default:
            break
        }
    }

    private func handleTicketUpdate(_ data: [String: Any]) {
        guard let record = data["record"] as? [String: Any],
              let ticketCode = record["ticket_code"] as? String,
              let checkedIn = record["checked_in"] as? Bool else {
            return
        }

        print("📡 Received realtime update: ticket \(ticketCode) checked_in=\(checkedIn)")

        // Update local guest state
        Task { @MainActor in
            if let index = guests.firstIndex(where: { $0.ticketCode == ticketCode }) {
                let oldGuest = guests[index]
                // Only update if state actually changed
                if oldGuest.checkedIn != checkedIn {
                    let updatedGuest = SupabaseGuest(
                        id: oldGuest.id,
                        name: oldGuest.name,
                        email: oldGuest.email,
                        ticketCode: oldGuest.ticketCode,
                        checkedIn: checkedIn,
                        checkedInAt: checkedIn ? (record["used_at"] as? String ?? ISO8601DateFormatter().string(from: Date())) : nil,
                        notes: oldGuest.notes
                    )
                    guests[index] = updatedGuest
                    lastRealtimeUpdate = Date()
                    print("✅ Updated guest \(oldGuest.name) via realtime sync")

                    // Update cache as well
                    if let eventId = currentRealtimeEventId {
                        LocalPersistence.shared.updateCachedGuestCheckIn(ticketCode: ticketCode, eventId: eventId)
                    }
                }
            }
        }
    }

    private func startHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            let heartbeat: [String: Any] = [
                "topic": "phoenix",
                "event": "heartbeat",
                "payload": [:],
                "ref": String(Int.random(in: 1000...9999))
            ]
            self?.sendRealtimeMessage(heartbeat)
        }
    }

    func disconnectRealtime() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
        realtimeTask?.cancel(with: .goingAway, reason: nil)
        realtimeTask = nil
        realtimeSession = nil
        currentRealtimeEventId = nil
        DispatchQueue.main.async {
            self.isRealtimeConnected = false
        }
        print("🔌 Disconnected from Supabase Realtime")
    }

    // MARK: - Sync Pending Offline Check-Ins
    func syncPendingCheckIns() async {
        let pendingCheckIns = LocalPersistence.shared.getPendingCheckIns()

        guard !pendingCheckIns.isEmpty else {
            print("📤 No pending check-ins to sync")
            return
        }

        print("📤 Syncing \(pendingCheckIns.count) pending offline check-ins...")

        await MainActor.run {
            isSyncing = true
        }

        for checkIn in pendingCheckIns {
            // Attempt to sync each check-in
            let success = await syncSingleCheckIn(checkIn)

            if success {
                LocalPersistence.shared.markCheckInSynced(id: checkIn.id)
                print("✅ Synced offline check-in: \(checkIn.guestName)")
            } else {
                LocalPersistence.shared.markCheckInFailed(id: checkIn.id, error: "Sync failed")
                print("❌ Failed to sync check-in: \(checkIn.guestName)")
            }
        }

        await MainActor.run {
            isSyncing = false
        }

        LocalPersistence.shared.updateLastSyncTime()
        print("📤 Sync complete")
    }

    private func syncSingleCheckIn(_ checkIn: OfflineCheckIn) async -> Bool {
        guard let accessToken = userAccessToken else {
            return false
        }

        do {
            let url = URL(string: "\(supabaseURL)/functions/v1/check-in-guest")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let checkInData: [String: Any] = [
                "ticketCode": checkIn.ticketCode,
                "staffId": userId ?? "",
                "notes": "Checked in offline via iOS app at \(checkIn.timestamp)"
            ]

            request.httpBody = try JSONSerialization.data(withJSONObject: checkInData)

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200 {
                if let responseJSON = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let success = responseJSON["success"] as? Bool {
                    return success
                }
            }

            return false

        } catch {
            print("❌ Error syncing check-in: \(error)")
            return false
        }
    }

    // MARK: - Clear Caches
    func clearCaches() {
        guestCache.removeAll()
        print("🗑️ Caches cleared")
    }

    // MARK: - Fetch Events
    func fetchEvents() async {
        await MainActor.run {
            isLoading = true
            error = nil
        }

        // CRITICAL SECURITY: Only fetch events for the user's organization
        guard let organizationId = userOrganizationId else {
            await MainActor.run {
                self.error = "No organization ID available. Please authenticate first."
                self.isLoading = false
            }
            return
        }

        // Use access token for authenticated requests
        let authToken = userAccessToken ?? supabaseKey

        do {
            // Apply organization filter to prevent RLS violation
            let url = URL(string: "\(supabaseURL)/rest/v1/events?select=*&organization_id=eq.\(organizationId)")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("Events API Response Status: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("Events API Response: \(responseString)")
                }
            }

            let events = try JSONDecoder().decode([SupabaseEvent].self, from: data)

            await MainActor.run {
                self.events = events
                self.isLoading = false
            }

        } catch {
            await MainActor.run {
                self.error = "Failed to fetch events: \(error.localizedDescription)"
                self.isLoading = false
            }
            print("Error fetching events: \(error)")
        }
    }

    // MARK: - Fetch Guests (Combined tickets + order_items + orders data)
    func fetchGuests(for eventId: String? = nil) async {
        print("🎫 Starting fetchGuests for eventId: \(eventId ?? "all events")")

        // ✅ Check cache first
        if let eventId = eventId, shouldUseCache(for: eventId) {
            print("⚡️ Using cached guest data")
            await MainActor.run {
                self.guests = guestCache[eventId]!.guests
                self.isLoading = false
            }
            return
        }

        // ✅ Request deduplication - if there's already an ongoing fetch, wait for it
        let cacheKey = eventId ?? "all"
        if let ongoingTask = ongoingGuestFetches[cacheKey] {
            print("⏳ Waiting for ongoing guest fetch to complete")
            do {
                let guests = try await ongoingTask.value
                await MainActor.run {
                    self.guests = guests
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = "Failed to fetch guests: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
            return
        }

        await MainActor.run {
            isLoading = true
            error = nil
        }

        // Security check: only fetch guests if user has an organization
        guard let _ = userOrganizationId else {
            await MainActor.run {
                self.error = "No organization ID available for fetching guests"
                self.isLoading = false
            }
            print("❌ No organization ID available for fetching guests")
            return
        }

        // ✅ Create a new task and store it for deduplication
        let fetchTask = Task<[SupabaseGuest], Error> {
            return try await performGuestFetch(for: eventId)
        }
        ongoingGuestFetches[cacheKey] = fetchTask

        do {
            let guests = try await fetchTask.value

            // ✅ Store in cache
            if let eventId = eventId {
                guestCache[eventId] = (guests: guests, timestamp: Date())
            }

            await MainActor.run {
                self.guests = guests
                self.isLoading = false
            }
            print("✅ Successfully parsed \(guests.count) guests")
        } catch {
            await MainActor.run {
                self.error = "Failed to fetch guests: \(error.localizedDescription)"
                self.isLoading = false
            }
            print("Error fetching guests: \(error)")
        }

        // ✅ Clean up the ongoing task
        ongoingGuestFetches.removeValue(forKey: cacheKey)
    }

    // MARK: - Actual Fetch Logic (using RPC function like web app)
    private func performGuestFetch(for eventId: String?) async throws -> [SupabaseGuest] {
        guard let eventId = eventId else {
            print("❌ No eventId provided for guest fetch")
            return []
        }

        // Store current event ID for caching
        currentEventId = eventId

        do {
            // Use the same RPC function as the web app for consistency
            let urlString = "\(supabaseURL)/rest/v1/rpc/get_guest_status_for_event"
            print("🌐 Fetching guests via RPC: \(urlString)")

            // CRITICAL: Use user's access token for authenticated RPC calls
            guard let accessToken = userAccessToken else {
                print("❌ No access token available - user needs to re-authenticate")
                return []
            }

            let rpcURL = URL(string: urlString)!
            var request = URLRequest(url: rpcURL)
            request.httpMethod = "POST"
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            // RPC body with event ID parameter
            let body: [String: Any] = ["p_event_id": eventId]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("🎫 RPC Response Status: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    let preview = responseString.prefix(500)
                    print("🎫 RPC Response Preview: \(preview)...")
                }
            }

            // Parse the RPC response
            let guestData = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []
            print("🎫 Found \(guestData.count) guests in RPC response")

            var parsedGuests: [SupabaseGuest] = []

            for (index, guestDict) in guestData.enumerated() {
                // RPC returns: ticket_id, ticket_code, customer_name, customer_email, checked_in, ticket_type, price, quantity, etc.
                guard let ticketId = guestDict["ticket_id"] as? String,
                      let ticketCode = guestDict["ticket_code"] as? String else {
                    print("❌ Guest \(index + 1) missing required fields")
                    continue
                }

                let customerName = guestDict["customer_name"] as? String ?? "Unknown"
                let customerEmail = guestDict["customer_email"] as? String ?? ""
                let checkedIn = guestDict["checked_in"] as? Bool ?? false
                let checkedInAt = guestDict["checked_in_at"] as? String
                let notes = guestDict["notes"] as? String

                let guest = SupabaseGuest(
                    id: ticketId,
                    name: customerName,
                    email: customerEmail,
                    ticketCode: ticketCode,
                    checkedIn: checkedIn,
                    checkedInAt: checkedInAt,
                    notes: notes
                )

                parsedGuests.append(guest)
            }

            print("✅ Successfully parsed \(parsedGuests.count) guests from RPC")

            // Cache guests for offline access
            LocalPersistence.shared.cacheGuests(parsedGuests, for: eventId)
            LocalPersistence.shared.updateLastSyncTime()

            return parsedGuests

        } catch {
            print("Error in performGuestFetch RPC: \(error)")

            // Try to return cached guests if available
            if let cachedGuests = LocalPersistence.shared.getCachedGuests(for: eventId) {
                print("📦 Returning cached guests due to network error")
                return cachedGuests
            }

            throw error
        }
    }

    // MARK: - Update Local Guest State
    private func updateLocalGuest(ticketCode: String, checkedIn: Bool) async {
        await MainActor.run {
            if let index = self.guests.firstIndex(where: { $0.ticketCode == ticketCode }) {
                let updatedGuest = SupabaseGuest(
                    id: self.guests[index].id,
                    name: self.guests[index].name,
                    email: self.guests[index].email,
                    ticketCode: self.guests[index].ticketCode,
                    checkedIn: checkedIn,
                    checkedInAt: checkedIn ? ISO8601DateFormatter().string(from: Date()) : nil
                )
                self.guests[index] = updatedGuest
                print("✅ Updated local state for ticket: \(ticketCode)")
            }
        }
    }

    // MARK: - Check In Guest
    func checkInGuest(ticketCode: String) async -> Bool {
        print("🎫 Starting check-in for ticket code: \(ticketCode)")

        // Get guest name for offline queue
        let guestName = guests.first(where: { $0.ticketCode == ticketCode })?.name ?? "Guest"
        let currentEventId = currentEventId

        // CRITICAL: Use user's access token for authenticated calls
        guard let accessToken = userAccessToken else {
            print("❌ No access token available for check-in - user needs to re-authenticate")
            return false
        }

        do {
            // Use the edge function for check-in to ensure proper validation and logging
            let url = URL(string: "\(supabaseURL)/functions/v1/check-in-guest")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let checkInData: [String: Any] = [
                "ticketCode": ticketCode,
                "staffId": userId ?? "", // Use logged in user UUID (required by edge function)
                "notes": "Checked in via iOS app"
            ]

            request.httpBody = try JSONSerialization.data(withJSONObject: checkInData)

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("✅ Check-in API Response Status: \(httpResponse.statusCode)")

                if let responseString = String(data: data, encoding: .utf8) {
                    print("📄 Check-in API Response: \(responseString)")
                }

                if httpResponse.statusCode == 200 {
                    // Parse the response to get guest info
                    if let responseJSON = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let success = responseJSON["success"] as? Bool {

                        // ✅ Update local guest state and cache
                        await updateLocalGuest(ticketCode: ticketCode, checkedIn: true)
                        if let eventId = currentEventId {
                            LocalPersistence.shared.updateCachedGuestCheckIn(ticketCode: ticketCode, eventId: eventId)
                        }

                        return success
                    }
                }

                // Handle specific error cases
                if httpResponse.statusCode == 400 {
                    if let responseJSON = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let errorMessage = responseJSON["error"] as? String {
                        print("⚠️ Check-in validation failed: \(errorMessage)")
                    }
                }
            }

            return false

        } catch {
            // Network error - queue for offline sync
            print("❌ Network error checking in guest: \(error)")
            print("📤 Queueing check-in for offline sync...")

            LocalPersistence.shared.queueOfflineCheckIn(ticketCode: ticketCode, guestName: guestName)

            // Update local state optimistically
            await updateLocalGuest(ticketCode: ticketCode, checkedIn: true)
            if let eventId = currentEventId {
                LocalPersistence.shared.updateCachedGuestCheckIn(ticketCode: ticketCode, eventId: eventId)
            }

            return true // Return true for optimistic UI update
        }
    }

    // Track current event for caching
    private var currentEventId: String?

    // MARK: - Update Guest Notes
    func updateGuestNotes(ticketId: String, notes: String) async -> Bool {
        print("📝 Updating notes for ticket ID: \(ticketId)")

        guard let accessToken = userAccessToken else {
            print("❌ No access token available for notes update")
            return false
        }

        do {
            // Update the ticket's notes field directly via REST API
            let url = URL(string: "\(supabaseURL)/rest/v1/tickets?id=eq.\(ticketId)")!
            var request = URLRequest(url: url)
            request.httpMethod = "PATCH"
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("return=minimal", forHTTPHeaderField: "Prefer")

            let updateData: [String: Any] = ["notes": notes]
            request.httpBody = try JSONSerialization.data(withJSONObject: updateData)

            let (_, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("📝 Notes update response status: \(httpResponse.statusCode)")

                if httpResponse.statusCode == 204 || httpResponse.statusCode == 200 {
                    // Update local guest state
                    await MainActor.run {
                        if let index = guests.firstIndex(where: { $0.id == ticketId }) {
                            guests[index].notes = notes
                        }
                    }
                    print("✅ Notes updated successfully")
                    return true
                }
            }

            return false

        } catch {
            print("❌ Error updating notes: \(error)")
            return false
        }
    }

    // MARK: - Get Analytics Data
    func getAnalytics() -> (totalGuests: Int, checkedIn: Int, pendingCheckIn: Int) {
        let total = guests.count
        let checkedIn = guests.filter { $0.checkedIn }.count
        let pending = total - checkedIn

        return (totalGuests: total, checkedIn: checkedIn, pendingCheckIn: pending)
    }

    // MARK: - Fetch Ticket Types for Event
    func fetchTicketTypes(for eventId: String) async {
        print("🎫 Starting fetchTicketTypes for eventId: \(eventId)")

        // ✅ Check cache first
        if shouldUseTicketTypesCache(for: eventId) {
            print("⚡️ Using cached ticket types data")
            await MainActor.run {
                self.ticketTypes = ticketTypesCache[eventId]!.types
                self.isLoading = false
            }
            return
        }

        // ✅ Request deduplication
        if let ongoingTask = ongoingTicketTypeFetches[eventId] {
            print("⏳ Waiting for ongoing ticket types fetch to complete")
            do {
                let types = try await ongoingTask.value
                await MainActor.run {
                    self.ticketTypes = types
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = "Failed to fetch ticket types: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
            return
        }

        await MainActor.run {
            isLoading = true
            error = nil
        }

        // Security check: only fetch ticket types if user has an organization
        guard let _ = userOrganizationId else {
            await MainActor.run {
                self.error = "No organization ID available for fetching ticket types"
                self.isLoading = false
            }
            print("❌ No organization ID available for fetching ticket types")
            return
        }

        // ✅ Create task for deduplication
        let fetchTask = Task<[SupabaseTicketType], Error> {
            return try await performTicketTypesFetch(for: eventId)
        }
        ongoingTicketTypeFetches[eventId] = fetchTask

        do {
            let types = try await fetchTask.value

            // ✅ Store in cache
            ticketTypesCache[eventId] = (types: types, timestamp: Date())

            await MainActor.run {
                self.ticketTypes = types
                self.isLoading = false
            }
            print("✅ Successfully fetched \(types.count) ticket types")
        } catch {
            await MainActor.run {
                self.error = "Failed to fetch ticket types: \(error.localizedDescription)"
                self.isLoading = false
            }
            print("❌ Error fetching ticket types: \(error)")
        }

        // ✅ Clean up
        ongoingTicketTypeFetches.removeValue(forKey: eventId)
    }

    private func performTicketTypesFetch(for eventId: String) async throws -> [SupabaseTicketType] {
        // Use access token for authenticated requests
        let authToken = userAccessToken ?? supabaseKey

        do {
            let url = URL(string: "\(supabaseURL)/rest/v1/ticket_types?select=*&event_id=eq.\(eventId)")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("🎫 Ticket Types API Response Status: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("🎫 Ticket Types API Response: \(responseString)")
                }
            }

            let ticketTypes = try JSONDecoder().decode([SupabaseTicketType].self, from: data)

            // Filter out ticket types with null/invalid data
            let validTypes = ticketTypes.filter { ticketType in
                // Basic validation
                guard !ticketType.name.isEmpty,
                      ticketType.price >= 0,
                      ticketType.quantity_available > 0 else {
                    return false
                }
                return true
            }

            return validTypes

        } catch {
            print("❌ Error in performTicketTypesFetch: \(error)")
            throw error
        }
    }

    // MARK: - Fetch Merchandise for Event
    func fetchMerchandise(for eventId: String) async {
        print("🛍️ Starting fetchMerchandise for eventId: \(eventId)")

        // ✅ Check cache first
        if shouldUseMerchandiseCache(for: eventId) {
            print("⚡️ Using cached merchandise data")
            await MainActor.run {
                self.merchandise = merchandiseCache[eventId]!.items
                self.isLoading = false
            }
            return
        }

        // ✅ Request deduplication
        if let ongoingTask = ongoingMerchandiseFetches[eventId] {
            print("⏳ Waiting for ongoing merchandise fetch to complete")
            do {
                let items = try await ongoingTask.value
                await MainActor.run {
                    self.merchandise = items
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = "Failed to fetch merchandise: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
            return
        }

        await MainActor.run {
            isLoading = true
            error = nil
        }

        // Security check: only fetch merchandise if user has an organization
        guard let _ = userOrganizationId else {
            await MainActor.run {
                self.error = "No organization ID available for fetching merchandise"
                self.isLoading = false
            }
            print("❌ No organization ID available for fetching merchandise")
            return
        }

        // ✅ Create task for deduplication
        let fetchTask = Task<[SupabaseMerchandise], Error> {
            return try await performMerchandiseFetch(for: eventId)
        }
        ongoingMerchandiseFetches[eventId] = fetchTask

        do {
            let items = try await fetchTask.value

            // ✅ Store in cache
            merchandiseCache[eventId] = (items: items, timestamp: Date())

            await MainActor.run {
                self.merchandise = items
                self.isLoading = false
            }
            print("✅ Successfully fetched \(items.count) merchandise items")
        } catch {
            await MainActor.run {
                self.error = "Failed to fetch merchandise: \(error.localizedDescription)"
                self.isLoading = false
            }
            print("❌ Error fetching merchandise: \(error)")
        }

        // ✅ Clean up
        ongoingMerchandiseFetches.removeValue(forKey: eventId)
    }

    private func performMerchandiseFetch(for eventId: String) async throws -> [SupabaseMerchandise] {
        // Use access token for authenticated requests
        let authToken = userAccessToken ?? supabaseKey

        do {
            let url = URL(string: "\(supabaseURL)/rest/v1/merchandise?select=*&event_id=eq.\(eventId)")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("🛍️ Merchandise API Response Status: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("🛍️ Merchandise API Response: \(responseString)")
                }
            }

            let merchandise = try JSONDecoder().decode([SupabaseMerchandise].self, from: data)

            // Filter out merchandise with null/invalid data and only show available items
            let validItems = merchandise.filter { item in
                // Basic validation
                guard !item.name.isEmpty,
                      item.price > 0,
                      item.isAvailable else {
                    return false
                }
                return true
            }

            return validItems

        } catch {
            print("❌ Error in performMerchandiseFetch: \(error)")
            throw error
        }
    }

    // MARK: - Create POS Transaction
    func createPOSTransaction(
        eventId: String,
        items: [(type: String, id: String, quantity: Int, price: Double)],
        customerName: String,
        customerEmail: String,
        totalAmount: Double
    ) async -> String? {
        print("💳 Creating POS transaction for \(items.count) items, total: $\(totalAmount)")

        do {
            // For now, simulate a successful transaction
            // In a real implementation, you would:
            // 1. Create a payment intent with Stripe Terminal
            // 2. Process the payment
            // 3. Create order records in Supabase
            // 4. Generate tickets for ticket purchases
            // 5. Update stock quantities for merchandise

            // Simulate payment processing delay
            try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds

            let transactionId = UUID().uuidString

            // Record sales for analytics and persist locally
            await MainActor.run {
                for item in items {
                    // Find item name from ticket types or merchandise
                    var itemName = "Unknown Item"
                    if item.type == "ticket" {
                        itemName = ticketTypes.first(where: { $0.id == item.id })?.name ?? "Ticket"
                    } else {
                        itemName = merchandise.first(where: { $0.id == item.id })?.name ?? "Merchandise"
                    }

                    let sale = POSSale(
                        id: UUID().uuidString,
                        eventId: eventId,
                        itemName: itemName,
                        itemType: item.type,
                        quantity: item.quantity,
                        unitPrice: item.price,
                        totalAmount: item.price * Double(item.quantity),
                        customerName: customerName,
                        timestamp: Date()
                    )
                    posSales.append(sale)

                    // Persist sale locally
                    LocalPersistence.shared.savePOSSale(sale, synced: true)
                }
            }

            print("✅ POS transaction completed successfully: \(transactionId)")
            return transactionId

        } catch {
            print("❌ Error creating POS transaction: \(error)")
            return nil
        }
    }

    // MARK: - POS Analytics Helpers
    func getPOSSalesTotal(for eventId: String) -> Double {
        return posSales.filter { $0.eventId == eventId }.reduce(0) { $0 + $1.totalAmount }
    }

    func getPOSSalesCount(for eventId: String) -> Int {
        return posSales.filter { $0.eventId == eventId }.count
    }

    func getTicketSalesTotal(for eventId: String) -> Double {
        return posSales.filter { $0.eventId == eventId && $0.itemType == "ticket" }.reduce(0) { $0 + $1.totalAmount }
    }

    func getMerchandiseSalesTotal(for eventId: String) -> Double {
        return posSales.filter { $0.eventId == eventId && $0.itemType == "merchandise" }.reduce(0) { $0 + $1.totalAmount }
    }
}

