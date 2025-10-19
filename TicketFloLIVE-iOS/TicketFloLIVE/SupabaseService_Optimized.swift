import Foundation
import Combine

// MARK: - Performance Optimizations for SupabaseService

extension SupabaseService {

    // MARK: - Caching Layer
    private static var guestCache: [String: (guests: [SupabaseGuest], timestamp: Date)] = [:]
    private static let cacheExpiry: TimeInterval = 30 // 30 seconds

    /// Optimized fetchGuests with caching and better performance
    func fetchGuestsOptimized(for eventId: String? = nil, forceRefresh: Bool = false) async {
        print("🚀 Starting OPTIMIZED fetchGuests for eventId: \(eventId ?? "all events")")

        // Check cache first (unless force refresh)
        if !forceRefresh, let eventId = eventId,
           let cached = Self.guestCache[eventId],
           Date().timeIntervalSince(cached.timestamp) < Self.cacheExpiry {
            print("⚡️ Using cached guest data (age: \(Date().timeIntervalSince(cached.timestamp))s)")
            await MainActor.run {
                self.guests = cached.guests
                self.isLoading = false
            }
            return
        }

        await MainActor.run {
            isLoading = true
            error = nil
        }

        // Security check
        guard let _ = userOrganizationId else {
            await MainActor.run {
                self.error = "No organization ID available"
                self.isLoading = false
            }
            return
        }

        do {
            // Build optimized query - only fetch needed fields
            var urlString = "\(supabaseURL)/rest/v1/tickets"
            urlString += "?select=id,ticket_code,checked_in,used_at"
            urlString += ",order_items!inner(orders!inner(customer_name,customer_email,event_id))"

            if let eventId = eventId {
                urlString += "&order_items.orders.event_id=eq.\(eventId)"
            }

            // Ensure we have complete order data
            urlString += "&order_items.orders.customer_name=not.is.null"
            urlString += "&order_items.orders.customer_email=not.is.null"

            print("🌐 Optimized Query: \(urlString)")

            let url = URL(string: urlString)!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            request.cachePolicy = .reloadIgnoringLocalCacheData // Don't use stale cache
            request.timeoutInterval = 15 // 15 second timeout

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse {
                print("✅ Response Status: \(httpResponse.statusCode)")

                guard httpResponse.statusCode == 200 else {
                    throw NSError(domain: "SupabaseService", code: httpResponse.statusCode,
                                userInfo: [NSLocalizedDescriptionKey: "Server returned status \(httpResponse.statusCode)"])
                }
            }

            // Parse on background thread for better performance
            let parsedGuests = try await parseGuestsData(data)

            // Cache the results
            if let eventId = eventId {
                Self.guestCache[eventId] = (guests: parsedGuests, timestamp: Date())
            }

            print("✅ Fetched and parsed \(parsedGuests.count) guests")

            // Update UI on main thread
            await MainActor.run {
                self.guests = parsedGuests
                self.isLoading = false
            }

        } catch {
            print("❌ Error: \(error.localizedDescription)")
            await MainActor.run {
                self.error = "Failed to fetch guests: \(error.localizedDescription)"
                self.isLoading = false
            }
        }
    }

    /// Parse guest data on background thread
    private func parseGuestsData(_ data: Data) async throws -> [SupabaseGuest] {
        return try await withCheckedThrowingContinuation { continuation in
            // Parse on background thread
            Task.detached(priority: .userInitiated) {
                do {
                    guard let ticketData = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                        throw NSError(domain: "SupabaseService", code: -1,
                                    userInfo: [NSLocalizedDescriptionKey: "Invalid JSON format"])
                    }

                    var guests: [SupabaseGuest] = []
                    guests.reserveCapacity(ticketData.count) // Pre-allocate for performance

                    for ticketDict in ticketData {
                        // Fast extraction with guard
                        guard let ticketId = ticketDict["id"] as? String,
                              let ticketCode = ticketDict["ticket_code"] as? String else {
                            continue
                        }

                        let checkedIn = ticketDict["checked_in"] as? Bool ?? false
                        let checkedInAt = ticketDict["used_at"] as? String

                        // Extract customer info
                        var customerName: String?
                        var customerEmail: String?

                        if let orderItemData = ticketDict["order_items"] as? [String: Any],
                           let ordersData = orderItemData["orders"] as? [String: Any] {
                            customerName = ordersData["customer_name"] as? String
                            customerEmail = ordersData["customer_email"] as? String
                        }

                        // Only create guest if we have valid customer data
                        guard let name = customerName, !name.isEmpty,
                              let email = customerEmail, !email.isEmpty else {
                            print("⚠️ Skipping ticket \(ticketCode) - missing customer data")
                            continue
                        }

                        let guest = SupabaseGuest(
                            id: ticketId,
                            name: name,
                            email: email,
                            ticketCode: ticketCode,
                            checkedIn: checkedIn,
                            checkedInAt: checkedInAt
                        )

                        guests.append(guest)
                    }

                    continuation.resume(returning: guests)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    /// Optimized check-in that doesn't refetch all data
    func checkInGuestOptimized(ticketCode: String, currentEventId: String?) async -> Bool {
        print("🎫 OPTIMIZED check-in for: \(ticketCode)")

        do {
            let url = URL(string: "\(supabaseURL)/functions/v1/check-in-guest")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = 10 // Faster timeout

            let checkInData: [String: Any] = [
                "ticketCode": ticketCode,
                "staffId": userEmail ?? "ios-app",
                "notes": "iOS app check-in"
            ]

            request.httpBody = try JSONSerialization.data(withJSONObject: checkInData)

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200,
               let responseJSON = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let success = responseJSON["success"] as? Bool,
               success {

                // OPTIMIZATION: Update local cache instead of refetching
                await updateLocalGuestCheckIn(ticketCode: ticketCode)

                // Invalidate cache for next fetch
                if let eventId = currentEventId {
                    Self.guestCache.removeValue(forKey: eventId)
                }

                return true
            }

            return false

        } catch {
            print("❌ Check-in error: \(error)")
            return false
        }
    }

    /// Update local guest state without refetching
    private func updateLocalGuestCheckIn(ticketCode: String) async {
        await MainActor.run {
            if let index = self.guests.firstIndex(where: { $0.ticketCode == ticketCode }) {
                var updatedGuest = self.guests[index]
                // Create new guest with updated check-in status
                let newGuest = SupabaseGuest(
                    id: updatedGuest.id,
                    name: updatedGuest.name,
                    email: updatedGuest.email,
                    ticketCode: updatedGuest.ticketCode,
                    checkedIn: true,
                    checkedInAt: ISO8601DateFormatter().string(from: Date())
                )
                self.guests[index] = newGuest
            }
        }
    }

    /// Clear all caches
    func clearCaches() {
        Self.guestCache.removeAll()
        print("🗑️ Caches cleared")
    }

    /// Prefetch data for better UX
    func prefetchEventData(eventId: String) async {
        async let guests = fetchGuestsOptimized(for: eventId)
        async let ticketTypes = fetchTicketTypes(for: eventId)
        async let merchandise = fetchMerchandise(for: eventId)

        // Wait for all to complete
        _ = await (guests, ticketTypes, merchandise)
        print("✅ Prefetch complete for event: \(eventId)")
    }
}

// MARK: - Performance Monitoring
extension SupabaseService {
    func measurePerformance<T>(_ operation: String, block: () async throws -> T) async rethrows -> T {
        let start = Date()
        let result = try await block()
        let duration = Date().timeIntervalSince(start)
        print("⏱️ \(operation) took \(String(format: "%.2f", duration))s")
        return result
    }
}
