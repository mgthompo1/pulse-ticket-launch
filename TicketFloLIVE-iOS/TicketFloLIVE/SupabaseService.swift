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

    private init() {}

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
                    // Parse auth response to get user ID
                    if let authResponse = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let user = authResponse["user"] as? [String: Any],
                       let userId = user["id"] as? String,
                       let userEmail = user["email"] as? String {

                        // Get user's organization ID
                        let orgId = await fetchUserOrganizationId(userId: userId)

                        await MainActor.run {
                            self.isAuthenticated = true
                            self.userEmail = userEmail
                            self.userOrganizationId = orgId
                            self.isLoading = false
                        }

                        if orgId == nil {
                            await MainActor.run {
                                self.error = "User is not associated with any organization. Please contact support."
                            }
                            print("⚠️ User \(userEmail) authenticated but has no organization association")
                        }

                        return true
                    }
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
        // First try organization_users table
        do {
            let url = URL(string: "\(supabaseURL)/rest/v1/organization_users?select=organization_id&user_id=eq.\(userId)")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("Organization users lookup API Response Status: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("Organization users lookup API Response: \(responseString)")
                }

                if httpResponse.statusCode == 200,
                   let orgUsers = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
                   !orgUsers.isEmpty,
                   let firstOrgUser = orgUsers.first,
                   let organizationId = firstOrgUser["organization_id"] as? String {
                    print("✅ Found organization ID via organization_users: \(organizationId) for user: \(userId)")
                    return organizationId
                }
            }
        } catch {
            print("❌ Error fetching organization ID from organization_users: \(error)")
        }

        // Fallback: Try organizations table (user_id = owner)
        do {
            let url = URL(string: "\(supabaseURL)/rest/v1/organizations?select=id&user_id=eq.\(userId)")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("Organizations lookup API Response Status: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("Organizations lookup API Response: \(responseString)")
                }

                if httpResponse.statusCode == 200,
                   let orgs = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
                   !orgs.isEmpty,
                   let firstOrg = orgs.first,
                   let organizationId = firstOrg["id"] as? String {
                    print("✅ Found organization ID via organizations table: \(organizationId) for user: \(userId)")
                    return organizationId
                }
            }
        } catch {
            print("❌ Error fetching organization ID from organizations: \(error)")
        }

        print("❌ No organization found for user ID: \(userId)")
        return nil
    }

    func signOut() {
        isAuthenticated = false
        userOrganizationId = nil
        userEmail = nil
        events = []
        guests = []
        ticketTypes = []
        merchandise = []
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

        do {
            // Apply organization filter to prevent RLS violation
            let url = URL(string: "\(supabaseURL)/rest/v1/events?select=*&organization_id=eq.\(organizationId)")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
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

        do {
            // Build the URL with event filtering
            var urlString = "\(supabaseURL)/rest/v1/tickets?select=*,order_items(id,order_id,orders(customer_name,customer_email,event_id))"

            // Add event filter if provided
            if let eventId = eventId {
                urlString += "&order_items.orders.event_id=eq.\(eventId)"
            }

            print("🌐 Fetching guests from URL: \(urlString)")

            let ticketsURL = URL(string: urlString)!
            var request = URLRequest(url: ticketsURL)
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("🎫 Tickets API Response Status: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("🎫 Tickets API Response: \(responseString)")
                }
            }

            // Parse the real ticket data
            let ticketData = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []
            print("🎫 Found \(ticketData.count) tickets in response")

            var parsedGuests: [SupabaseGuest] = []

            for (index, ticketDict) in ticketData.enumerated() {
                print("🎫 Processing ticket \(index + 1)/\(ticketData.count)")

                // Extract ticket info
                guard let ticketId = ticketDict["id"] as? String,
                      let ticketCode = ticketDict["ticket_code"] as? String else {
                    print("❌ Ticket \(index + 1) missing required fields (id or ticket_code)")
                    continue
                }

                let checkedIn = ticketDict["checked_in"] as? Bool ?? false

                // Extract customer info from orders through order_items
                var customerName = "Unknown Guest" // Better fallback name
                var customerEmail = "guest@event.com" // Generic fallback email

                if let orderItemData = ticketDict["order_items"] as? [String: Any],
                   let ordersData = orderItemData["orders"] as? [String: Any] {
                    // Extract customer data with null checking
                    if let name = ordersData["customer_name"] as? String, !name.isEmpty {
                        customerName = name
                    }
                    if let email = ordersData["customer_email"] as? String, !email.isEmpty {
                        customerEmail = email
                    }
                    print("✅ Ticket \(index + 1): \(customerName) (\(customerEmail))")
                } else {
                    // If no order data, create a meaningful fallback based on ticket code
                    let ticketSuffix = String(ticketCode.suffix(6))
                    customerName = "Ticket #\(ticketSuffix)"
                    print("⚠️ Ticket \(index + 1): Using fallback data - \(customerName) (\(customerEmail))")
                }

                let checkedInAt = ticketDict["used_at"] as? String

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

            print("✅ Successfully parsed \(parsedGuests.count) guests")
            let finalGuests = parsedGuests
            await MainActor.run {
                self.guests = finalGuests
                self.isLoading = false
            }

        } catch {
            await MainActor.run {
                self.error = "Failed to fetch guests: \(error.localizedDescription)"
                self.isLoading = false
            }
            print("Error fetching guests: \(error)")
        }
    }

    // MARK: - Check In Guest
    func checkInGuest(ticketCode: String) async -> Bool {
        do {
            let url = URL(string: "\(supabaseURL)/rest/v1/tickets?ticket_code=eq.\(ticketCode)")!
            var request = URLRequest(url: url)
            request.httpMethod = "PATCH"
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("return=minimal", forHTTPHeaderField: "Prefer")

            let updateData: [String: Any] = [
                "checked_in": true,
                "used_at": ISO8601DateFormatter().string(from: Date())
            ]

            request.httpBody = try JSONSerialization.data(withJSONObject: updateData)

            let (_, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("Check-in API Response Status: \(httpResponse.statusCode)")
                return httpResponse.statusCode == 200 || httpResponse.statusCode == 204
            }

            return false
        } catch {
            print("Error checking in guest: \(error)")
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

        do {
            let url = URL(string: "\(supabaseURL)/rest/v1/ticket_types?select=*&event_id=eq.\(eventId)")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
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

            await MainActor.run {
                // Filter out ticket types with null/invalid data
                self.ticketTypes = ticketTypes.filter { ticketType in
                    // Basic validation
                    guard !ticketType.name.isEmpty,
                          ticketType.price >= 0,
                          ticketType.quantity_available > 0 else {
                        return false
                    }
                    return true
                }
                self.isLoading = false
            }

            print("✅ Successfully fetched \(ticketTypes.count) ticket types")

        } catch {
            await MainActor.run {
                self.error = "Failed to fetch ticket types: \(error.localizedDescription)"
                self.isLoading = false
            }
            print("❌ Error fetching ticket types: \(error)")
        }
    }

    // MARK: - Fetch Merchandise for Event
    func fetchMerchandise(for eventId: String) async {
        print("🛍️ Starting fetchMerchandise for eventId: \(eventId)")

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

        do {
            let url = URL(string: "\(supabaseURL)/rest/v1/merchandise?select=*&event_id=eq.\(eventId)")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
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

            await MainActor.run {
                // Filter out merchandise with null/invalid data and only show available items
                self.merchandise = merchandise.filter { item in
                    // Basic validation
                    guard !item.name.isEmpty,
                          item.price > 0,
                          item.isAvailable else {
                        return false
                    }
                    return true
                }
                self.isLoading = false
            }

            print("✅ Successfully fetched \(merchandise.count) merchandise items (\(self.merchandise.count) available)")

        } catch {
            await MainActor.run {
                self.error = "Failed to fetch merchandise: \(error.localizedDescription)"
                self.isLoading = false
            }
            print("❌ Error fetching merchandise: \(error)")
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

