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

// MARK: - Combined Guest Model for UI
struct SupabaseGuest: Identifiable {
    let id: String
    let name: String
    let email: String
    let ticketCode: String
    let checkedIn: Bool
    let checkedInAt: String?

    var initials: String {
        let components = name.components(separatedBy: " ")
        return components.compactMap { $0.first?.uppercased() }.joined()
    }
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
    @Published var isLoading = false
    @Published var error: String?

    // CRITICAL: Track user authentication and organization
    @Published var isAuthenticated = false
    @Published var userOrganizationId: String?
    @Published var userEmail: String?
    @Published var userId: String?  // Store user UUID for API calls

    // Store the user's JWT access token for authenticated API calls
    private var userAccessToken: String?

    private init() {}

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

                    // Store access token and user ID first
                    self.userAccessToken = accessToken

                    // Get user's organization ID (use access token for this request)
                    let orgId = await fetchUserOrganizationId(userId: userId)

                    await MainActor.run {
                        self.isAuthenticated = true
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
            let url = URL(string: "\(supabaseURL)/rest/v1/organizations?select=id,name&user_id=eq.\(userId)")!
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
        userOrganizationId = nil
        userEmail = nil
        userId = nil  // Clear user ID on sign out
        userAccessToken = nil  // Clear access token on sign out
        events = []
        guests = []
        ticketTypes = []
        merchandise = []
        clearCaches()
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

                let guest = SupabaseGuest(
                    id: ticketId,
                    name: customerName,
                    email: customerEmail,
                    ticketCode: ticketCode,
                    checkedIn: checkedIn,
                    checkedInAt: checkedInAt
                )

                parsedGuests.append(guest)
            }

            print("✅ Successfully parsed \(parsedGuests.count) guests from RPC")
            return parsedGuests

        } catch {
            print("Error in performGuestFetch RPC: \(error)")
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

                        // ✅ Just update the local guest state instead of refetching
                        await updateLocalGuest(ticketCode: ticketCode, checkedIn: true)

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
            print("❌ Error checking in guest: \(error)")
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
            print("✅ POS transaction completed successfully: \(transactionId)")
            return transactionId

        } catch {
            print("❌ Error creating POS transaction: \(error)")
            return nil
        }
    }
}

