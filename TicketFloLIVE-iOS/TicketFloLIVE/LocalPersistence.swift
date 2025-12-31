import Foundation
import Combine

// MARK: - Offline Check-In Queue Item
struct OfflineCheckIn: Codable, Identifiable {
    let id: String
    let ticketCode: String
    let guestName: String
    let timestamp: Date
    var synced: Bool = false
    var syncAttempts: Int = 0
    var lastSyncError: String?

    init(ticketCode: String, guestName: String) {
        self.id = UUID().uuidString
        self.ticketCode = ticketCode
        self.guestName = guestName
        self.timestamp = Date()
    }
}

// MARK: - Cached Guest (for offline access)
struct CachedGuest: Codable, Identifiable {
    let id: String
    let name: String
    let email: String
    let ticketCode: String
    var checkedIn: Bool
    var checkedInAt: String?
    var notes: String?
    let cachedAt: Date

    init(from guest: SupabaseGuest) {
        self.id = guest.id
        self.name = guest.name
        self.email = guest.email
        self.ticketCode = guest.ticketCode
        self.checkedIn = guest.checkedIn
        self.checkedInAt = guest.checkedInAt
        self.notes = guest.notes
        self.cachedAt = Date()
    }

    func toSupabaseGuest() -> SupabaseGuest {
        return SupabaseGuest(
            id: id,
            name: name,
            email: email,
            ticketCode: ticketCode,
            checkedIn: checkedIn,
            checkedInAt: checkedInAt,
            notes: notes
        )
    }
}

// MARK: - Cached POS Sale
struct CachedPOSSale: Codable, Identifiable {
    let id: String
    let eventId: String
    let itemName: String
    let itemType: String
    let quantity: Int
    let unitPrice: Double
    let totalAmount: Double
    let customerName: String
    let timestamp: Date
    var synced: Bool

    init(from sale: POSSale, synced: Bool = false) {
        self.id = sale.id
        self.eventId = sale.eventId
        self.itemName = sale.itemName
        self.itemType = sale.itemType
        self.quantity = sale.quantity
        self.unitPrice = sale.unitPrice
        self.totalAmount = sale.totalAmount
        self.customerName = sale.customerName
        self.timestamp = sale.timestamp
        self.synced = synced
    }

    func toPOSSale() -> POSSale {
        return POSSale(
            id: id,
            eventId: eventId,
            itemName: itemName,
            itemType: itemType,
            quantity: quantity,
            unitPrice: unitPrice,
            totalAmount: totalAmount,
            customerName: customerName,
            timestamp: timestamp
        )
    }
}

// MARK: - Local Cache Data
struct LocalCacheData: Codable {
    var guests: [String: [CachedGuest]] = [:] // eventId -> guests
    var posSales: [CachedPOSSale] = []
    var offlineCheckIns: [OfflineCheckIn] = []
    var lastSyncTime: Date?
}

// MARK: - Local Persistence Manager
class LocalPersistence: ObservableObject {
    static let shared = LocalPersistence()

    @Published var isOfflineMode = false
    @Published var pendingCheckInsCount = 0
    @Published var pendingSalesCount = 0

    private var cacheData = LocalCacheData()
    private let cacheFileName = "ticketflo_cache.json"
    private let fileManager = FileManager.default
    private var saveDebounceTask: Task<Void, Never>?

    private init() {
        loadFromDisk()
        updatePendingCounts()
    }

    // MARK: - File Path
    private var cacheFilePath: URL {
        let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return documentsPath.appendingPathComponent(cacheFileName)
    }

    // MARK: - Load/Save
    private func loadFromDisk() {
        guard fileManager.fileExists(atPath: cacheFilePath.path) else {
            print("📂 No cache file found, starting fresh")
            return
        }

        do {
            let data = try Data(contentsOf: cacheFilePath)
            cacheData = try JSONDecoder().decode(LocalCacheData.self, from: data)
            print("✅ Loaded cache: \(cacheData.guests.values.flatMap { $0 }.count) guests, \(cacheData.posSales.count) sales, \(cacheData.offlineCheckIns.count) pending check-ins")
        } catch {
            print("❌ Failed to load cache: \(error)")
        }
    }

    private func saveToDisk() {
        // Debounce saves to avoid excessive disk writes
        saveDebounceTask?.cancel()
        saveDebounceTask = Task {
            try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 second debounce
            guard !Task.isCancelled else { return }

            do {
                let data = try JSONEncoder().encode(cacheData)
                try data.write(to: cacheFilePath)
                print("💾 Cache saved to disk")
            } catch {
                print("❌ Failed to save cache: \(error)")
            }
        }
    }

    private func updatePendingCounts() {
        pendingCheckInsCount = cacheData.offlineCheckIns.filter { !$0.synced }.count
        pendingSalesCount = cacheData.posSales.filter { !$0.synced }.count
    }

    // MARK: - Guest Cache
    func cacheGuests(_ guests: [SupabaseGuest], for eventId: String) {
        let cachedGuests = guests.map { CachedGuest(from: $0) }
        cacheData.guests[eventId] = cachedGuests
        saveToDisk()
        print("📦 Cached \(guests.count) guests for event \(eventId)")
    }

    func getCachedGuests(for eventId: String) -> [SupabaseGuest]? {
        guard let cached = cacheData.guests[eventId] else { return nil }

        // Check if cache is still valid (1 hour expiry for offline use)
        let maxAge: TimeInterval = 3600 // 1 hour
        if let oldestGuest = cached.first, Date().timeIntervalSince(oldestGuest.cachedAt) > maxAge {
            print("⚠️ Guest cache expired for event \(eventId)")
            return nil
        }

        print("📦 Returning \(cached.count) cached guests for event \(eventId)")
        return cached.map { $0.toSupabaseGuest() }
    }

    func updateCachedGuestCheckIn(ticketCode: String, eventId: String) {
        guard var guests = cacheData.guests[eventId] else { return }
        if let index = guests.firstIndex(where: { $0.ticketCode == ticketCode }) {
            guests[index].checkedIn = true
            guests[index].checkedInAt = ISO8601DateFormatter().string(from: Date())
            cacheData.guests[eventId] = guests
            saveToDisk()
        }
    }

    // MARK: - Offline Check-In Queue
    func queueOfflineCheckIn(ticketCode: String, guestName: String) {
        let checkIn = OfflineCheckIn(ticketCode: ticketCode, guestName: guestName)
        cacheData.offlineCheckIns.append(checkIn)
        saveToDisk()
        updatePendingCounts()
        print("📤 Queued offline check-in for \(guestName) (\(ticketCode))")
    }

    func getPendingCheckIns() -> [OfflineCheckIn] {
        return cacheData.offlineCheckIns.filter { !$0.synced }
    }

    func markCheckInSynced(id: String) {
        if let index = cacheData.offlineCheckIns.firstIndex(where: { $0.id == id }) {
            cacheData.offlineCheckIns[index].synced = true
            saveToDisk()
            updatePendingCounts()
        }
    }

    func markCheckInFailed(id: String, error: String) {
        if let index = cacheData.offlineCheckIns.firstIndex(where: { $0.id == id }) {
            cacheData.offlineCheckIns[index].syncAttempts += 1
            cacheData.offlineCheckIns[index].lastSyncError = error
            saveToDisk()
        }
    }

    // MARK: - POS Sales Persistence
    func savePOSSale(_ sale: POSSale, synced: Bool = false) {
        let cachedSale = CachedPOSSale(from: sale, synced: synced)
        cacheData.posSales.append(cachedSale)
        saveToDisk()
        updatePendingCounts()
        print("💳 Saved POS sale: \(sale.itemName) - $\(sale.totalAmount)")
    }

    func getPOSSales(for eventId: String) -> [POSSale] {
        return cacheData.posSales
            .filter { $0.eventId == eventId }
            .map { $0.toPOSSale() }
    }

    func getAllPOSSales() -> [POSSale] {
        return cacheData.posSales.map { $0.toPOSSale() }
    }

    func getPendingSales() -> [CachedPOSSale] {
        return cacheData.posSales.filter { !$0.synced }
    }

    func markSaleSynced(id: String) {
        if let index = cacheData.posSales.firstIndex(where: { $0.id == id }) {
            cacheData.posSales[index].synced = true
            saveToDisk()
            updatePendingCounts()
        }
    }

    // MARK: - Sync Status
    func updateLastSyncTime() {
        cacheData.lastSyncTime = Date()
        saveToDisk()
    }

    var lastSyncTime: Date? {
        return cacheData.lastSyncTime
    }

    // MARK: - Clear Cache
    func clearCache() {
        cacheData = LocalCacheData()
        saveToDisk()
        updatePendingCounts()
        print("🗑️ Local cache cleared")
    }

    func clearEventCache(eventId: String) {
        cacheData.guests.removeValue(forKey: eventId)
        saveToDisk()
    }
}

// MARK: - Network Reachability Observer
class NetworkMonitor: ObservableObject {
    static let shared = NetworkMonitor()

    @Published var isConnected = true

    private init() {
        // In a real app, use NWPathMonitor here
        // For now, we'll check connectivity on API calls
        startMonitoring()
    }

    func startMonitoring() {
        // Simplified connectivity check
        // In production, use NWPathMonitor from Network framework
        Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.checkConnectivity()
        }
    }

    private func checkConnectivity() {
        guard let url = URL(string: "https://www.apple.com") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "HEAD"
        request.timeoutInterval = 5

        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            DispatchQueue.main.async {
                let wasConnected = self?.isConnected ?? true
                self?.isConnected = error == nil && (response as? HTTPURLResponse)?.statusCode == 200

                if wasConnected && !(self?.isConnected ?? true) {
                    print("📡 Network disconnected - switching to offline mode")
                    LocalPersistence.shared.isOfflineMode = true
                } else if !wasConnected && (self?.isConnected ?? false) {
                    print("📡 Network reconnected - syncing pending items")
                    LocalPersistence.shared.isOfflineMode = false

                    // Trigger sync of pending check-ins when connectivity is restored
                    Task {
                        await SupabaseService.shared.syncPendingCheckIns()
                    }
                }
            }
        }.resume()
    }

    func forceCheck() {
        checkConnectivity()
    }
}
