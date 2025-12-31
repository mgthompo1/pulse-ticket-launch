import SwiftUI

// MARK: - Web App Color Extensions
extension Color {
    // Matches the web app's primary color: hsl(217 91% 60%) = #3B82F6 (professional navy blue)
    static let webPrimary = Color(hue: 217/360, saturation: 0.91, brightness: 0.60)

    // Keep the orange for backwards compatibility
    static let ticketFloOrange = Color(red: 1.0, green: 0.5, blue: 0.0)
}

struct ModernDashboardView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var supabaseService = SupabaseService.shared
    @StateObject private var appSettings = AppSettings.shared
    @State private var showingScanner = false
    @State private var searchText = ""
    @State private var selectedFilter: GuestFilter = .all
    @State private var selectedTab: DashboardTab = .checkIn
    @Environment(\.dismiss) private var dismiss

    let selectedEvent: SupabaseEvent

    // Computed property for visible tabs based on settings
    var visibleTabs: [DashboardTab] {
        DashboardTab.allCases.filter { tab in
            if tab == .schedule {
                return appSettings.showEventSchedule
            }
            return true
        }
    }

    enum DashboardTab: String, CaseIterable {
        case checkIn = "Check-In"
        case schedule = "Schedule"
        case pointOfSale = "Point of Sale"
        case analytics = "Analytics"
        case settings = "Settings"

        var icon: String {
            switch self {
            case .checkIn: return "checkmark.circle"
            case .schedule: return "calendar.badge.clock"
            case .pointOfSale: return "creditcard"
            case .analytics: return "chart.bar"
            case .settings: return "gearshape"
            }
        }

        var displayName: String {
            switch self {
            case .checkIn: return "Check-In"
            case .schedule: return "Schedule"
            case .pointOfSale: return "Point of\nSale"
            case .analytics: return "Analytics"
            case .settings: return "Settings"
            }
        }
    }

    init(selectedEvent: SupabaseEvent) {
        self.selectedEvent = selectedEvent
        print("🚀 ModernDashboardView initialized for event: \(selectedEvent.name) (ID: \(selectedEvent.id))")
    }

    enum GuestFilter: String, CaseIterable {
        case all = "All"
        case checkedIn = "Checked In"
        case pending = "Pending"

        var icon: String {
            switch self {
            case .all: return "person.2"
            case .checkedIn: return "checkmark.circle.fill"
            case .pending: return "clock"
            }
        }
    }

    private var filteredGuests: [SupabaseGuest] {
        var guests = supabaseService.guests

        // Apply filter
        switch selectedFilter {
        case .all:
            break
        case .checkedIn:
            guests = guests.filter { $0.checkedIn }
        case .pending:
            guests = guests.filter { !$0.checkedIn }
        }

        // Apply search
        if !searchText.isEmpty {
            guests = guests.filter { guest in
                guest.name.localizedCaseInsensitiveContains(searchText) ||
                guest.email.localizedCaseInsensitiveContains(searchText) ||
                guest.ticketCode.localizedCaseInsensitiveContains(searchText)
            }
        }

        return guests
    }

    private var analytics: (total: Int, checkedIn: Int, pending: Int) {
        let total = supabaseService.guests.count
        let checkedIn = supabaseService.guests.filter { $0.checkedIn }.count
        let pending = total - checkedIn
        return (total: total, checkedIn: checkedIn, pending: pending)
    }

    var body: some View {
        print("📱 ModernDashboardView body rendering for event: \(selectedEvent.name)")
        return NavigationView {
            VStack(spacing: 0) {
                // Header
                ModernDashboardHeader(
                    event: selectedEvent,
                    analytics: analytics,
                    onBack: { dismiss() },
                    onScan: { showingScanner = true }
                )

                // Tab Content
                TabView(selection: $selectedTab) {
                    // Check-In Tab
                    CheckInTabView(
                        analytics: analytics,
                        filteredGuests: filteredGuests,
                        searchText: $searchText,
                        selectedFilter: $selectedFilter,
                        supabaseService: supabaseService,
                        selectedEvent: selectedEvent
                    )
                    .tag(DashboardTab.checkIn)

                    // Schedule Tab (conditionally shown)
                    if appSettings.showEventSchedule {
                        EventScheduleTabView(selectedEvent: selectedEvent)
                            .tag(DashboardTab.schedule)
                    }

                    // Point of Sale Tab
                    PointOfSaleTabView(selectedEvent: selectedEvent)
                        .tag(DashboardTab.pointOfSale)

                    // Analytics Tab
                    AnalyticsTabView(analytics: analytics, guests: supabaseService.guests, selectedEvent: selectedEvent)
                        .tag(DashboardTab.analytics)

                    // Settings Tab
                    SettingsTabView(selectedEvent: selectedEvent)
                        .environmentObject(authService)
                        .tag(DashboardTab.settings)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))

                // Custom Tab Bar
                CustomTabBar(selectedTab: $selectedTab, visibleTabs: visibleTabs)
            }
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(.systemBackground),
                        Color(.systemGroupedBackground).opacity(0.3)
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
        }
        .navigationBarHidden(true)
        .sheet(isPresented: $showingScanner) {
            ScannerView()
        }
        .task {
            print("📱 ModernDashboardView .task started - about to fetch guests for event: \(selectedEvent.id)")
            await supabaseService.fetchGuests(for: selectedEvent.id)
            print("📱 ModernDashboardView .task completed - guest fetching finished")

            // Connect to realtime for live multi-device sync
            supabaseService.connectRealtime(for: selectedEvent.id)

            // Sync any pending offline check-ins
            await supabaseService.syncPendingCheckIns()
        }
        .refreshable {
            await supabaseService.fetchGuests(for: selectedEvent.id)
            // Sync pending check-ins on manual refresh
            await supabaseService.syncPendingCheckIns()
        }
        .onDisappear {
            // Disconnect realtime when leaving the view
            supabaseService.disconnectRealtime()
        }
    }

    private func countForFilter(_ filter: GuestFilter) -> Int {
        switch filter {
        case .all:
            return supabaseService.guests.count
        case .checkedIn:
            return supabaseService.guests.filter { $0.checkedIn }.count
        case .pending:
            return supabaseService.guests.filter { !$0.checkedIn }.count
        }
    }
}

// MARK: - Header Component

struct ModernDashboardHeader: View {
    let event: SupabaseEvent
    let analytics: (total: Int, checkedIn: Int, pending: Int)
    let onBack: () -> Void
    let onScan: () -> Void
    @StateObject private var supabaseService = SupabaseService.shared
    @StateObject private var localPersistence = LocalPersistence.shared

    var body: some View {
        VStack(spacing: 16) {
            // Top row with back button and actions
            HStack {
                Button(action: onBack) {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .medium))
                        Text("Events")
                            .font(.body)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(.webPrimary)
                }

                Spacer()

                // Sync Status Indicator
                SyncStatusIndicator()

                Button(action: onScan) {
                    HStack(spacing: 6) {
                        Image(systemName: "qrcode.viewfinder")
                            .font(.system(size: 16, weight: .medium))
                        Text("Scan")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.webPrimary)
                    .cornerRadius(20)
                }
            }
            .padding(.horizontal, 20)

            // Event title and info
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(event.name)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.primary)

                        if let venue = event.venue, !venue.isEmpty {
                            Text(venue)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    Spacer()
                }

                // Quick progress indicator
                HStack(spacing: 8) {
                    Text("\(analytics.checkedIn) of \(analytics.total) checked in")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Spacer()

                    if analytics.total > 0 {
                        Text("\(Int((Double(analytics.checkedIn) / Double(analytics.total)) * 100))%")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.webPrimary)
                    }
                }
            }
            .padding(.horizontal, 20)
        }
        .padding(.top, 8)
        .padding(.bottom, 16)
        .background(Color(.systemBackground))
    }
}

// MARK: - Sync Status Indicator
struct SyncStatusIndicator: View {
    @StateObject private var supabaseService = SupabaseService.shared
    @StateObject private var localPersistence = LocalPersistence.shared

    var body: some View {
        HStack(spacing: 6) {
            // Realtime connection indicator
            if supabaseService.isSyncing {
                ProgressView()
                    .scaleEffect(0.7)
            } else if supabaseService.isRealtimeConnected {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.green)
            } else {
                Image(systemName: "bolt.slash")
                    .font(.system(size: 12))
                    .foregroundColor(.orange)
            }

            // Pending check-ins badge
            if localPersistence.pendingCheckInsCount > 0 {
                HStack(spacing: 3) {
                    Image(systemName: "arrow.up.circle")
                        .font(.system(size: 10))
                    Text("\(localPersistence.pendingCheckInsCount)")
                        .font(.system(size: 10, weight: .medium))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color.orange)
                .cornerRadius(8)
            }
        }
        .padding(.trailing, 8)
    }
}

// MARK: - Quick Stats Component

struct QuickStatsView: View {
    let analytics: (total: Int, checkedIn: Int, pending: Int)

    var body: some View {
        HStack(spacing: 16) {
            StatCard(
                title: "Total",
                value: "\(analytics.total)",
                icon: "person.2.fill",
                color: .blue
            )

            StatCard(
                title: "Checked In",
                value: "\(analytics.checkedIn)",
                icon: "checkmark.circle.fill",
                color: .green
            )

            StatCard(
                title: "Pending",
                value: "\(analytics.pending)",
                icon: "clock.fill",
                color: .orange
            )
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(color)
                Spacer()
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Filter Chip Component

struct FilterChip: View {
    let filter: ModernDashboardView.GuestFilter
    let isSelected: Bool
    let count: Int
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                Image(systemName: filter.icon)
                    .font(.caption)
                Text(filter.rawValue)
                    .font(.caption)
                    .fontWeight(.medium)
                Text("(\(count))")
                    .font(.caption)
                    .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)
            }
            .foregroundColor(isSelected ? .white : .primary)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.ticketFloOrange : Color(.secondarySystemFill))
            .cornerRadius(16)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Guest List Component

struct ModernGuestList: View {
    let guests: [SupabaseGuest]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 1) {
                ForEach(guests) { guest in
                    ModernGuestRow(guest: guest)
                }
            }
            .padding(.horizontal, 20)
        }
        .background(Color(.systemGroupedBackground).opacity(0.3))
    }
}

struct ModernGuestRow: View {
    let guest: SupabaseGuest
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var isCheckingIn = false
    @State private var showingDetail = false

    var body: some View {
        Button(action: { showingDetail = true }) {
            HStack(spacing: 16) {
                // Avatar/Status
                ZStack {
                    Circle()
                        .fill(guest.checkedIn ? Color.green.opacity(0.1) : Color.gray.opacity(0.1))
                        .frame(width: 50, height: 50)

                    if guest.checkedIn {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.green)
                    } else {
                        Text(guest.initials)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.secondary)
                    }
                }

                // Guest Info
                VStack(alignment: .leading, spacing: 6) {
                    Text(guest.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.primary)

                    Text(guest.email)
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                        .lineLimit(1)

                    HStack(spacing: 8) {
                        HStack(spacing: 6) {
                            Image(systemName: "ticket.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.ticketFloOrange)
                            Text(guest.ticketCode)
                                .font(.system(size: 12, weight: .medium, design: .monospaced))
                                .foregroundColor(.ticketFloOrange)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.ticketFloOrange.opacity(0.1))
                        .cornerRadius(6)

                        // Notes indicator
                        if let notes = guest.notes, !notes.isEmpty {
                            HStack(spacing: 4) {
                                Image(systemName: "note.text")
                                    .font(.system(size: 10))
                                    .foregroundColor(.webPrimary)
                            }
                            .padding(.horizontal, 6)
                            .padding(.vertical, 4)
                            .background(Color.webPrimary.opacity(0.1))
                            .cornerRadius(6)
                        }
                    }
                }

                Spacer()

                // Status/Action
                VStack(alignment: .trailing, spacing: 4) {
                    if guest.checkedIn {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 12))
                            Text("Checked In")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundColor(.green)

                        if let checkedInAt = guest.checkedInAt {
                            Text(formatCheckInTime(checkedInAt))
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)
                        }
                    } else {
                        HStack(spacing: 4) {
                            Image(systemName: "clock.fill")
                                .font(.system(size: 12))
                            Text("Pending")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundColor(.orange)
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.secondary.opacity(0.5))
                }
            }
            .padding(16)
            .background(Color(.systemBackground))
            .cornerRadius(14)
            .shadow(color: .black.opacity(0.04), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
        .sheet(isPresented: $showingDetail) {
            GuestDetailSheet(
                guest: guest,
                isCheckingIn: $isCheckingIn,
                onCheckIn: checkInGuest,
                onSaveNotes: saveGuestNotes
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
    }

    private func saveGuestNotes(_ notes: String) {
        Task {
            let success = await supabaseService.updateGuestNotes(ticketId: guest.id, notes: notes)
            if success {
                let notificationFeedback = UINotificationFeedbackGenerator()
                notificationFeedback.notificationOccurred(.success)
            }
        }
    }

    private func checkInGuest() {
        guard !isCheckingIn else { return }

        isCheckingIn = true

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()

        Task {
            let success = await supabaseService.checkInGuest(ticketCode: guest.ticketCode)
            await MainActor.run {
                isCheckingIn = false
                if success {
                    // Success haptic
                    let notificationFeedback = UINotificationFeedbackGenerator()
                    notificationFeedback.notificationOccurred(.success)

                    // Close the sheet
                    showingDetail = false

                    // Refresh the guest list
                    Task {
                        await supabaseService.fetchGuests()
                    }
                } else {
                    // Error haptic
                    let notificationFeedback = UINotificationFeedbackGenerator()
                    notificationFeedback.notificationOccurred(.error)
                }
            }
        }
    }

    private func formatCheckInTime(_ timeString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"

        if let date = formatter.date(from: timeString) {
            formatter.dateStyle = .none
            formatter.timeStyle = .short
            return formatter.string(from: date)
        }
        return timeString
    }
}

// MARK: - Guest Detail Sheet
struct GuestDetailSheet: View {
    let guest: SupabaseGuest
    @Binding var isCheckingIn: Bool
    let onCheckIn: () -> Void
    let onSaveNotes: (String) -> Void

    @State private var notesText: String = ""
    @State private var isEditingNotes = false
    @State private var isSavingNotes = false
    @FocusState private var isNotesFocused: Bool

    init(guest: SupabaseGuest, isCheckingIn: Binding<Bool>, onCheckIn: @escaping () -> Void, onSaveNotes: @escaping (String) -> Void = { _ in }) {
        self.guest = guest
        self._isCheckingIn = isCheckingIn
        self.onCheckIn = onCheckIn
        self.onSaveNotes = onSaveNotes
        self._notesText = State(initialValue: guest.notes ?? "")
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    // Avatar
                    ZStack {
                        Circle()
                            .fill(guest.checkedIn ? Color.green.opacity(0.15) : Color.ticketFloOrange.opacity(0.15))
                            .frame(width: 80, height: 80)

                        if guest.checkedIn {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 44))
                                .foregroundColor(.green)
                        } else {
                            Text(guest.initials)
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.ticketFloOrange)
                        }
                    }

                    VStack(spacing: 4) {
                        Text(guest.name)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.primary)

                        Text(guest.email)
                            .font(.system(size: 15))
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.top, 24)

                // Ticket Code
                VStack(spacing: 8) {
                    Text("TICKET CODE")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.secondary)
                        .tracking(1)

                    HStack(spacing: 8) {
                        Image(systemName: "ticket.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.ticketFloOrange)

                        Text(guest.ticketCode)
                            .font(.system(size: 20, weight: .bold, design: .monospaced))
                            .foregroundColor(.primary)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                .padding(.top, 24)

                // Status
                HStack(spacing: 12) {
                    Image(systemName: guest.checkedIn ? "checkmark.circle.fill" : "clock.fill")
                        .font(.system(size: 20))
                        .foregroundColor(guest.checkedIn ? .green : .orange)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(guest.checkedIn ? "Checked In" : "Pending Check-in")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(guest.checkedIn ? .green : .orange)

                        if guest.checkedIn, let checkedInAt = guest.checkedInAt {
                            Text("at \(formatCheckInTime(checkedInAt))")
                                .font(.system(size: 13))
                                .foregroundColor(.secondary)
                        }
                    }

                    Spacer()
                }
                .padding(16)
                .background(guest.checkedIn ? Color.green.opacity(0.1) : Color.orange.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal, 24)
                .padding(.top, 20)

                // Notes Section
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "note.text")
                            .font(.system(size: 16))
                            .foregroundColor(.webPrimary)
                        Text("Notes")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.primary)
                        Spacer()

                        if !notesText.isEmpty && notesText != (guest.notes ?? "") {
                            Button(action: saveNotes) {
                                if isSavingNotes {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                } else {
                                    Text("Save")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.webPrimary)
                                }
                            }
                            .disabled(isSavingNotes)
                        }
                    }

                    TextEditor(text: $notesText)
                        .font(.system(size: 15))
                        .frame(minHeight: 80)
                        .padding(12)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        .focused($isNotesFocused)
                        .overlay(
                            Group {
                                if notesText.isEmpty && !isNotesFocused {
                                    Text("Add notes about this guest...")
                                        .font(.system(size: 15))
                                        .foregroundColor(.secondary)
                                        .padding(.leading, 16)
                                        .padding(.top, 20)
                                        .allowsHitTesting(false)
                                }
                            },
                            alignment: .topLeading
                        )
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)

                Spacer(minLength: 20)

                // Action Button
                if !guest.checkedIn {
                    Button(action: onCheckIn) {
                        HStack(spacing: 10) {
                            if isCheckingIn {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .scaleEffect(0.9)
                            } else {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 20))
                                Text("Check In Now")
                                    .font(.system(size: 18, weight: .semibold))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.ticketFloOrange, Color.ticketFloOrange.opacity(0.85)]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(14)
                        .shadow(color: Color.ticketFloOrange.opacity(0.4), radius: 10, x: 0, y: 5)
                    }
                    .disabled(isCheckingIn)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                } else {
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.green)
                        Text("Already Checked In")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.green)
                    }
                    .padding(.bottom, 32)
                }
            }
        }
        .onTapGesture {
            isNotesFocused = false
        }
    }

    private func saveNotes() {
        isSavingNotes = true
        isNotesFocused = false
        onSaveNotes(notesText)

        // Reset saving state after a delay (the actual save is handled by the parent)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            isSavingNotes = false
        }
    }

    private func formatCheckInTime(_ timeString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"

        if let date = formatter.date(from: timeString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "h:mm a"
            return displayFormatter.string(from: date)
        }
        return timeString
    }
}

// MARK: - Empty States

struct EmptyGuestView: View {
    var body: some View {
        VStack(spacing: 24) {
            Circle()
                .fill(Color.ticketFloOrange.opacity(0.1))
                .frame(width: 80, height: 80)
                .overlay(
                    Image(systemName: "person.2")
                        .font(.system(size: 32))
                        .foregroundColor(.webPrimary)
                )

            VStack(spacing: 8) {
                Text("No Guests Yet")
                    .font(.title2)
                    .fontWeight(.semibold)
                Text("Guests will appear here as tickets are purchased")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct NoResultsView: View {
    let searchText: String
    let filter: ModernDashboardView.GuestFilter

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            VStack(spacing: 8) {
                Text("No Results")
                    .font(.headline)
                    .fontWeight(.semibold)

                if !searchText.isEmpty {
                    Text("No guests found for '\(searchText)'")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                } else {
                    Text("No \(filter.rawValue.lowercased()) guests")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.horizontal, 32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct DashboardErrorView: View {
    let error: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 16) {
                Circle()
                    .fill(Color.red.opacity(0.1))
                    .frame(width: 80, height: 80)
                    .overlay(
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 32))
                            .foregroundColor(.red)
                    )

                VStack(spacing: 8) {
                    Text("Connection Error")
                        .font(.title2)
                        .fontWeight(.semibold)
                    Text(error)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }

            Button("Try Again") {
                onRetry()
            }
            .buttonStyle(.borderedProminent)
            .tint(.webPrimary)
        }
        .padding(.horizontal, 32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Tab Views

struct CheckInTabView: View {
    let analytics: (total: Int, checkedIn: Int, pending: Int)
    let filteredGuests: [SupabaseGuest]
    @Binding var searchText: String
    @Binding var selectedFilter: ModernDashboardView.GuestFilter
    let supabaseService: SupabaseService
    let selectedEvent: SupabaseEvent

    var body: some View {
        VStack(spacing: 0) {
            // Quick Stats
            QuickStatsView(analytics: analytics)
                .padding(.horizontal, 20)
                .padding(.bottom, 16)

            // Filters and Search
            VStack(spacing: 12) {
                // Filter Chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(ModernDashboardView.GuestFilter.allCases, id: \.rawValue) { filter in
                            FilterChip(
                                filter: filter,
                                isSelected: selectedFilter == filter,
                                count: countForFilter(filter)
                            ) {
                                selectedFilter = filter
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                }

                // Search Bar
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Search guests, emails, or ticket codes...", text: $searchText)
                        .textFieldStyle(PlainTextFieldStyle())

                    if !searchText.isEmpty {
                        Button("Clear") {
                            searchText = ""
                        }
                        .font(.caption)
                        .foregroundColor(.webPrimary)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color(.tertiarySystemFill))
                .cornerRadius(10)
                .padding(.horizontal, 20)
            }
            .padding(.bottom, 16)

            // Guest List
            if supabaseService.isLoading {
                LoadingView()
            } else if let error = supabaseService.error {
                DashboardErrorView(error: error) {
                    Task {
                        await supabaseService.fetchGuests(for: selectedEvent.id)
                    }
                }
            } else if filteredGuests.isEmpty && supabaseService.guests.isEmpty {
                EmptyGuestView()
            } else if filteredGuests.isEmpty {
                NoResultsView(searchText: searchText, filter: selectedFilter)
            } else {
                ModernGuestList(guests: filteredGuests)
            }
        }
    }

    private func countForFilter(_ filter: ModernDashboardView.GuestFilter) -> Int {
        switch filter {
        case .all:
            return supabaseService.guests.count
        case .checkedIn:
            return supabaseService.guests.filter { $0.checkedIn }.count
        case .pending:
            return supabaseService.guests.filter { !$0.checkedIn }.count
        }
    }
}

struct PointOfSaleTabView: View {
    @StateObject private var supabaseService = SupabaseService.shared
    @StateObject private var appSettings = AppSettings.shared
    @State private var selectedItems: [CartItem] = []
    @State private var customerName = ""
    @State private var customerEmail = ""
    @State private var isProcessingPayment = false
    @State private var showingPaymentSuccess = false
    @State private var showingTapToPay = false
    @State private var selectedSegment = 0 // 0 for tickets, 1 for merchandise

    let selectedEvent: SupabaseEvent

    struct CartItem: Identifiable {
        let id = UUID()
        let type: ItemType
        let itemId: String
        let name: String
        let price: Double
        var quantity: Int
        let description: String?

        enum ItemType {
            case ticket
            case merchandise
        }

        var total: Double {
            price * Double(quantity)
        }
    }

    var cartTotal: Double {
        selectedItems.reduce(0) { $0 + $1.total }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 8) {
                Image(systemName: "creditcard")
                    .font(.system(size: 48))
                    .foregroundColor(.webPrimary)

                Text("Point of Sale")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Sell tickets and merchandise")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 20)
            .padding(.bottom, 16)

            // Segmented Control
            Picker("Item Type", selection: $selectedSegment) {
                Text("Tickets").tag(0)
                Text("Merchandise").tag(1)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding(.horizontal, 20)
            .padding(.bottom, 16)

            ScrollView {
                VStack(spacing: 20) {
                    // Content based on selected segment
                    if selectedSegment == 0 {
                        ticketTypesSection
                    } else {
                        merchandiseSection
                    }

                    // Shopping Cart
                    if !selectedItems.isEmpty {
                        cartSection
                    }

                    // Customer Information
                    if !selectedItems.isEmpty {
                        customerInfoSection
                    }

                    // Process Payment Button
                    if !selectedItems.isEmpty && !customerName.isEmpty {
                        paymentButton
                    }

                    Spacer(minLength: 100)
                }
            }
        }
        .task {
            await loadPOSData()
        }
        .refreshable {
            await loadPOSData()
        }
        .alert("Payment Successful!", isPresented: $showingPaymentSuccess) {
            Button("OK") {
                resetForm()
            }
        } message: {
            Text("Transaction completed successfully.")
        }
        .sheet(isPresented: $showingTapToPay) {
            // Tap to Pay on iPhone using Stripe Terminal
            // Use organization's configured location ID, fallback to app settings default
            TapToPayView(
                items: selectedItems.map { item in
                    TapToPayCartItem(
                        name: item.name,
                        price: Int(item.total * 100), // Convert to cents
                        quantity: item.quantity
                    )
                },
                totalAmount: Int(cartTotal * 100), // Convert to cents
                organizationId: supabaseService.userOrganizationId ?? "",
                locationId: supabaseService.stripeTerminalLocationId ?? appSettings.stripeLocationId
            )
        }
    }

    // MARK: - Ticket Types Section
    private var ticketTypesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Available Ticket Types")
                .font(.headline)
                .fontWeight(.semibold)
                .padding(.horizontal, 20)

            if supabaseService.isLoading {
                ProgressView("Loading ticket types...")
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if supabaseService.ticketTypes.isEmpty {
                emptyTicketTypesView
            } else {
                ForEach(supabaseService.ticketTypes.filter { $0.isAvailable }) { ticketType in
                    POSTicketTypeCard(
                        ticketType: ticketType
                    ) { quantity in
                        addTicketToCart(ticketType, quantity: quantity)
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
    }

    // MARK: - Merchandise Section
    private var merchandiseSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Available Merchandise")
                .font(.headline)
                .fontWeight(.semibold)
                .padding(.horizontal, 20)

            if supabaseService.isLoading {
                ProgressView("Loading merchandise...")
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if supabaseService.merchandise.isEmpty {
                emptyMerchandiseView
            } else {
                ForEach(supabaseService.merchandise) { merchandise in
                    POSMerchandiseCard(
                        merchandise: merchandise
                    ) { quantity in
                        addMerchandiseToCart(merchandise, quantity: quantity)
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
    }

    // MARK: - Cart Section
    private var cartSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Shopping Cart")
                .font(.headline)
                .fontWeight(.semibold)
                .padding(.horizontal, 20)

            ForEach(selectedItems) { item in
                CartItemRow(item: item) { updatedQuantity in
                    updateCartItemQuantity(item, quantity: updatedQuantity)
                } onRemove: {
                    removeFromCart(item)
                }
                .padding(.horizontal, 20)
            }

            HStack {
                Text("Total:")
                    .font(.title2)
                    .fontWeight(.bold)
                Spacer()
                Text("$\(cartTotal, specifier: "%.2f")")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.webPrimary)
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
        }
        .padding(.vertical, 16)
        .background(Color(.systemGray6).opacity(0.3))
        .cornerRadius(12)
        .padding(.horizontal, 20)
    }

    // MARK: - Customer Info Section
    private var customerInfoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Customer Information")
                .font(.headline)
                .fontWeight(.semibold)

            VStack(spacing: 12) {
                TextField("Customer Name", text: $customerName)
                    .textFieldStyle(RoundedBorderTextFieldStyle())

                TextField("Email (optional)", text: $customerEmail)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
            }
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Payment Button
    private var paymentButton: some View {
        VStack(spacing: 12) {
            // Tap to Pay Button (if supported) - Placeholder for now
            #if !targetEnvironment(simulator)
            Button(action: { showingTapToPay = true }) {
                HStack {
                    Image(systemName: "iphone.and.arrow.forward")
                    Text("Tap to Pay - $\(cartTotal, specifier: "%.2f")")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.webPrimary)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isProcessingPayment)
            #endif

            // Traditional Payment Button
            Button(action: processPayment) {
                HStack {
                    if isProcessingPayment {
                        ProgressView()
                            .scaleEffect(0.8)
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Image(systemName: "creditcard.fill")
                        Text("Record Payment - $\(cartTotal, specifier: "%.2f")")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.ticketFloOrange)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isProcessingPayment)
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Empty States
    private var emptyTicketTypesView: some View {
        VStack(spacing: 16) {
            Image(systemName: "ticket")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            Text("No ticket types available")
                .font(.headline)
            Text("Configure ticket types in the web dashboard")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 32)
        .padding(.vertical, 24)
    }

    private var emptyMerchandiseView: some View {
        VStack(spacing: 16) {
            Image(systemName: "bag")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            Text("No merchandise available")
                .font(.headline)
            Text("Add merchandise items in the web dashboard")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 32)
        .padding(.vertical, 24)
    }

    // MARK: - Helper Methods
    private func loadPOSData() async {
        async let ticketTypesTask = supabaseService.fetchTicketTypes(for: selectedEvent.id)
        async let merchandiseTask = supabaseService.fetchMerchandise(for: selectedEvent.id)

        await ticketTypesTask
        await merchandiseTask
    }

    private func addTicketToCart(_ ticketType: SupabaseTicketType, quantity: Int) {
        let cartItem = CartItem(
            type: .ticket,
            itemId: ticketType.id,
            name: ticketType.name,
            price: ticketType.price,
            quantity: quantity,
            description: ticketType.description
        )
        selectedItems.append(cartItem)
    }

    private func addMerchandiseToCart(_ merchandise: SupabaseMerchandise, quantity: Int) {
        let cartItem = CartItem(
            type: .merchandise,
            itemId: merchandise.id,
            name: merchandise.name,
            price: merchandise.price,
            quantity: quantity,
            description: merchandise.description
        )
        selectedItems.append(cartItem)
    }

    private func updateCartItemQuantity(_ item: CartItem, quantity: Int) {
        if let index = selectedItems.firstIndex(where: { $0.id == item.id }) {
            selectedItems[index].quantity = quantity
        }
    }

    private func removeFromCart(_ item: CartItem) {
        selectedItems.removeAll { $0.id == item.id }
    }

    private func processPayment() {
        isProcessingPayment = true

        Task {
            let items = selectedItems.map { item in
                (type: item.type == .ticket ? "ticket" : "merchandise",
                 id: item.itemId,
                 quantity: item.quantity,
                 price: item.price)
            }

            let transactionId = await supabaseService.createPOSTransaction(
                eventId: selectedEvent.id,
                items: items,
                customerName: customerName,
                customerEmail: customerEmail,
                totalAmount: cartTotal
            )

            await MainActor.run {
                isProcessingPayment = false
                if transactionId != nil {
                    showingPaymentSuccess = true
                }
            }
        }
    }

    private func resetForm() {
        selectedItems = []
        customerName = ""
        customerEmail = ""
    }
}

// MARK: - POS Component Views

struct POSTicketTypeCard: View {
    let ticketType: SupabaseTicketType
    let onAddToCart: (Int) -> Void
    @State private var quantity = 1

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(ticketType.name)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)

                    if let description = ticketType.description {
                        Text(description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Text("\(ticketType.remainingQuantity) remaining")
                        .font(.caption)
                        .foregroundColor(.webPrimary)
                }

                Spacer()

                Text("$\(ticketType.price, specifier: "%.2f")")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.webPrimary)
            }

            HStack {
                // Quantity Selector
                HStack(spacing: 12) {
                    Button(action: {
                        if quantity > 1 { quantity -= 1 }
                    }) {
                        Image(systemName: "minus.circle.fill")
                            .foregroundColor(quantity > 1 ? .ticketFloOrange : .gray)
                    }
                    .disabled(quantity <= 1)

                    Text("\(quantity)")
                        .font(.headline)
                        .fontWeight(.medium)
                        .frame(minWidth: 30)

                    Button(action: {
                        if quantity < min(10, ticketType.remainingQuantity) { quantity += 1 }
                    }) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(quantity < min(10, ticketType.remainingQuantity) ? .ticketFloOrange : .gray)
                    }
                    .disabled(quantity >= min(10, ticketType.remainingQuantity))
                }

                Spacer()

                Button(action: {
                    onAddToCart(quantity)
                    quantity = 1
                }) {
                    Text("Add to Cart")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.webPrimary)
                        .cornerRadius(8)
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct POSMerchandiseCard: View {
    let merchandise: SupabaseMerchandise
    let onAddToCart: (Int) -> Void
    @State private var quantity = 1

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(merchandise.name)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)

                    if let description = merchandise.description {
                        Text(description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    if let category = merchandise.category {
                        Text(category.capitalized)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(4)
                    }

                    Text(merchandise.stockDisplay)
                        .font(.caption)
                        .foregroundColor(.webPrimary)
                }

                Spacer()

                Text("$\(merchandise.price, specifier: "%.2f")")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.webPrimary)
            }

            HStack {
                // Quantity Selector
                HStack(spacing: 12) {
                    Button(action: {
                        if quantity > 1 { quantity -= 1 }
                    }) {
                        Image(systemName: "minus.circle.fill")
                            .foregroundColor(quantity > 1 ? .ticketFloOrange : .gray)
                    }
                    .disabled(quantity <= 1)

                    Text("\(quantity)")
                        .font(.headline)
                        .fontWeight(.medium)
                        .frame(minWidth: 30)

                    Button(action: {
                        let maxQuantity = min(10, merchandise.stock_quantity ?? 0)
                        if quantity < maxQuantity { quantity += 1 }
                    }) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(quantity < min(10, merchandise.stock_quantity ?? 0) ? .ticketFloOrange : .gray)
                    }
                    .disabled(quantity >= min(10, merchandise.stock_quantity ?? 0))
                }

                Spacer()

                Button(action: {
                    onAddToCart(quantity)
                    quantity = 1
                }) {
                    Text("Add to Cart")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.webPrimary)
                        .cornerRadius(8)
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct CartItemRow: View {
    let item: PointOfSaleTabView.CartItem
    let onQuantityChange: (Int) -> Void
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(item.type == .ticket ? "Ticket" : "Merchandise")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text("$\(item.price, specifier: "%.2f") each")
                    .font(.caption)
                    .foregroundColor(.webPrimary)
            }

            Spacer()

            HStack(spacing: 8) {
                Button(action: {
                    if item.quantity > 1 {
                        onQuantityChange(item.quantity - 1)
                    }
                }) {
                    Image(systemName: "minus.circle")
                        .foregroundColor(item.quantity > 1 ? .ticketFloOrange : .gray)
                }
                .disabled(item.quantity <= 1)

                Text("\(item.quantity)")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .frame(minWidth: 20)

                Button(action: {
                    if item.quantity < 10 {
                        onQuantityChange(item.quantity + 1)
                    }
                }) {
                    Image(systemName: "plus.circle")
                        .foregroundColor(item.quantity < 10 ? .ticketFloOrange : .gray)
                }
                .disabled(item.quantity >= 10)

                Button(action: onRemove) {
                    Image(systemName: "trash")
                        .foregroundColor(.red)
                }
            }

            Text("$\(item.total, specifier: "%.2f")")
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundColor(.primary)
                .frame(minWidth: 60, alignment: .trailing)
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Settings Tab View

struct SettingsTabView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var supabaseService = SupabaseService.shared
    @StateObject private var appSettings = AppSettings.shared
    @StateObject private var localPersistence = LocalPersistence.shared
    @State private var showingLogoutConfirmation = false
    @Environment(\.dismiss) private var dismiss

    let selectedEvent: SupabaseEvent

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "gearshape")
                        .font(.system(size: 48))
                        .foregroundColor(.webPrimary)

                    Text("Settings")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Configure app preferences")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)

                // Sync Status Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Sync Status")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 20)

                    VStack(spacing: 0) {
                        // Realtime Connection
                        HStack(spacing: 16) {
                            Circle()
                                .fill(supabaseService.isRealtimeConnected ? Color.green.opacity(0.1) : Color.orange.opacity(0.1))
                                .frame(width: 40, height: 40)
                                .overlay(
                                    Image(systemName: supabaseService.isRealtimeConnected ? "bolt.fill" : "bolt.slash")
                                        .font(.system(size: 16))
                                        .foregroundColor(supabaseService.isRealtimeConnected ? .green : .orange)
                                )

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Live Sync")
                                    .font(.subheadline)
                                    .fontWeight(.medium)

                                Text(supabaseService.isRealtimeConnected ? "Connected - receiving updates" : "Disconnected")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            if supabaseService.isRealtimeConnected {
                                Text("Live")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(.green)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.green.opacity(0.1))
                                    .cornerRadius(8)
                            }
                        }
                        .padding(16)

                        Divider()
                            .padding(.leading, 72)

                        // Pending Check-ins
                        HStack(spacing: 16) {
                            Circle()
                                .fill(localPersistence.pendingCheckInsCount > 0 ? Color.orange.opacity(0.1) : Color.green.opacity(0.1))
                                .frame(width: 40, height: 40)
                                .overlay(
                                    Image(systemName: localPersistence.pendingCheckInsCount > 0 ? "arrow.up.circle" : "checkmark.circle.fill")
                                        .font(.system(size: 16))
                                        .foregroundColor(localPersistence.pendingCheckInsCount > 0 ? .orange : .green)
                                )

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Pending Check-ins")
                                    .font(.subheadline)
                                    .fontWeight(.medium)

                                Text(localPersistence.pendingCheckInsCount > 0
                                    ? "\(localPersistence.pendingCheckInsCount) check-in(s) waiting to sync"
                                    : "All check-ins synced")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            if localPersistence.pendingCheckInsCount > 0 {
                                Button(action: {
                                    Task {
                                        await supabaseService.syncPendingCheckIns()
                                    }
                                }) {
                                    if supabaseService.isSyncing {
                                        ProgressView()
                                            .scaleEffect(0.8)
                                    } else {
                                        Text("Sync")
                                            .font(.caption)
                                            .fontWeight(.medium)
                                    }
                                }
                                .foregroundColor(.webPrimary)
                                .disabled(supabaseService.isSyncing)
                            }
                        }
                        .padding(16)

                        Divider()
                            .padding(.leading, 72)

                        // Last Sync Time
                        HStack(spacing: 16) {
                            Circle()
                                .fill(Color.webPrimary.opacity(0.1))
                                .frame(width: 40, height: 40)
                                .overlay(
                                    Image(systemName: "clock")
                                        .font(.system(size: 16))
                                        .foregroundColor(.webPrimary)
                                )

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Last Sync")
                                    .font(.subheadline)
                                    .fontWeight(.medium)

                                if let lastSync = localPersistence.lastSyncTime {
                                    Text(formatLastSyncTime(lastSync))
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                } else {
                                    Text("Never synced")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }

                            Spacer()
                        }
                        .padding(16)
                    }
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
                    .padding(.horizontal, 20)
                }

                // Account Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Account")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 20)

                    VStack(spacing: 0) {
                        // User Info
                        HStack(spacing: 16) {
                            Circle()
                                .fill(Color.webPrimary.opacity(0.1))
                                .frame(width: 50, height: 50)
                                .overlay(
                                    Text(supabaseService.userEmail?.prefix(1).uppercased() ?? "U")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                        .foregroundColor(.webPrimary)
                                )

                            VStack(alignment: .leading, spacing: 4) {
                                Text(supabaseService.userEmail ?? "Unknown User")
                                    .font(.subheadline)
                                    .fontWeight(.medium)

                                if let orgId = supabaseService.userOrganizationId {
                                    Text("Organization: \(orgId.prefix(8))...")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }

                            Spacer()
                        }
                        .padding(16)
                        .background(Color(.systemBackground))
                    }
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
                    .padding(.horizontal, 20)
                }

                // Event Info Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Current Event")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 20)

                    VStack(spacing: 0) {
                        HStack(spacing: 16) {
                            Circle()
                                .fill(Color.ticketFloOrange.opacity(0.1))
                                .frame(width: 50, height: 50)
                                .overlay(
                                    Image(systemName: "calendar")
                                        .font(.title2)
                                        .foregroundColor(.ticketFloOrange)
                                )

                            VStack(alignment: .leading, spacing: 4) {
                                Text(selectedEvent.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)

                                if let venue = selectedEvent.venue {
                                    Text(venue)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                Text("Capacity: \(selectedEvent.capacity)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()
                        }
                        .padding(16)
                        .background(Color(.systemBackground))
                    }
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
                    .padding(.horizontal, 20)
                }

                // Preferences Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Preferences")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 20)

                    VStack(spacing: 0) {
                        Toggle(isOn: $appSettings.hapticFeedbackEnabled) {
                            HStack {
                                Image(systemName: "hand.tap")
                                    .foregroundColor(.webPrimary)
                                    .frame(width: 24)
                                Text("Haptic Feedback")
                            }
                        }
                        .padding(16)

                        Divider()
                            .padding(.leading, 56)

                        Toggle(isOn: $appSettings.autoRefreshEnabled) {
                            HStack {
                                Image(systemName: "arrow.clockwise")
                                    .foregroundColor(.webPrimary)
                                    .frame(width: 24)
                                Text("Auto-Refresh Data")
                            }
                        }
                        .padding(16)

                        Divider()
                            .padding(.leading, 56)

                        Toggle(isOn: $appSettings.showTicketCodes) {
                            HStack {
                                Image(systemName: "ticket")
                                    .foregroundColor(.webPrimary)
                                    .frame(width: 24)
                                Text("Show Ticket Codes")
                            }
                        }
                        .padding(16)

                        Divider()
                            .padding(.leading, 56)

                        Toggle(isOn: $appSettings.showEventSchedule) {
                            HStack {
                                Image(systemName: "calendar.badge.clock")
                                    .foregroundColor(.webPrimary)
                                    .frame(width: 24)
                                Text("Show Event Schedule")
                            }
                        }
                        .padding(16)
                    }
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
                    .padding(.horizontal, 20)
                }

                // App Info Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("About")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 20)

                    VStack(spacing: 0) {
                        HStack {
                            Image(systemName: "info.circle")
                                .foregroundColor(.webPrimary)
                                .frame(width: 24)
                            Text("Version")
                            Spacer()
                            Text("1.0.0")
                                .foregroundColor(.secondary)
                        }
                        .padding(16)

                        Divider()
                            .padding(.leading, 56)

                        HStack {
                            Image(systemName: "building.2")
                                .foregroundColor(.webPrimary)
                                .frame(width: 24)
                            Text("TicketFlo LIVE")
                            Spacer()
                            Text("Check-in App")
                                .foregroundColor(.secondary)
                        }
                        .padding(16)
                    }
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
                    .padding(.horizontal, 20)
                }

                // Logout Button
                Button(action: {
                    showingLogoutConfirmation = true
                }) {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Sign Out")
                    }
                    .foregroundColor(.red)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(12)
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)

                Spacer(minLength: 100)
            }
        }
        .alert("Sign Out?", isPresented: $showingLogoutConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Sign Out", role: .destructive) {
                authService.logout()
            }
        } message: {
            Text("Are you sure you want to sign out of TicketFlo LIVE?")
        }
    }

    private func formatLastSyncTime(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Event Schedule Tab View

struct EventScheduleTabView: View {
    let selectedEvent: SupabaseEvent
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var isLoading = false
    @State private var showingAddItem = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: 48))
                        .foregroundColor(.webPrimary)

                    Text("Event Schedule")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Timeline of activities")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)

                // Event Date & Venue
                VStack(spacing: 12) {
                    HStack(spacing: 16) {
                        Circle()
                            .fill(Color.webPrimary.opacity(0.1))
                            .frame(width: 44, height: 44)
                            .overlay(
                                Image(systemName: "calendar")
                                    .font(.system(size: 18))
                                    .foregroundColor(.webPrimary)
                            )

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Event Date")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(formatEventDate(selectedEvent.event_date))
                                .font(.subheadline)
                                .fontWeight(.medium)
                        }

                        Spacer()
                    }

                    if let venue = selectedEvent.venue, !venue.isEmpty {
                        HStack(spacing: 16) {
                            Circle()
                                .fill(Color.ticketFloOrange.opacity(0.1))
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Image(systemName: "mappin.circle")
                                        .font(.system(size: 18))
                                        .foregroundColor(.ticketFloOrange)
                                )

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Venue")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text(venue)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }

                            Spacer()
                        }
                    }
                }
                .padding(16)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
                .padding(.horizontal, 20)

                // Schedule Timeline
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Schedule")
                            .font(.headline)
                            .fontWeight(.semibold)

                        Spacer()

                        Button(action: { showingAddItem = true }) {
                            HStack(spacing: 4) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: 14))
                                Text("Add")
                                    .font(.caption)
                                    .fontWeight(.medium)
                            }
                            .foregroundColor(.webPrimary)
                        }
                    }
                    .padding(.horizontal, 20)

                    if isLoading {
                        ProgressView()
                            .padding(.vertical, 40)
                    } else if supabaseService.scheduleItems.isEmpty {
                        // Empty state
                        VStack(spacing: 16) {
                            Image(systemName: "calendar.badge.plus")
                                .font(.system(size: 48))
                                .foregroundColor(.secondary)

                            Text("No Schedule Items")
                                .font(.headline)
                                .foregroundColor(.primary)

                            Text("Add schedule items to display the event timeline to your team")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)

                            Button(action: { showingAddItem = true }) {
                                HStack {
                                    Image(systemName: "plus.circle.fill")
                                    Text("Add Schedule Item")
                                }
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(Color.webPrimary)
                                .cornerRadius(20)
                            }
                        }
                        .padding(.vertical, 40)
                        .frame(maxWidth: .infinity)
                    } else {
                        // Schedule items list
                        VStack(spacing: 0) {
                            ForEach(supabaseService.scheduleItems) { item in
                                ScheduleItemRow(item: item, onDelete: {
                                    Task {
                                        _ = await supabaseService.deleteScheduleItem(id: item.id)
                                    }
                                })
                            }
                        }
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
                        .padding(.horizontal, 20)
                    }
                }

                Spacer(minLength: 100)
            }
        }
        .onAppear {
            Task {
                isLoading = true
                await supabaseService.fetchScheduleItems(for: selectedEvent.id)
                isLoading = false
            }
        }
        .sheet(isPresented: $showingAddItem) {
            AddScheduleItemSheet(eventId: selectedEvent.id)
        }
    }

    private func formatEventDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"

        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "EEEE, MMMM d, yyyy 'at' h:mm a"
            return displayFormatter.string(from: date)
        }
        return dateString
    }
}

// MARK: - Schedule Item Row
struct ScheduleItemRow: View {
    let item: SupabaseScheduleItem
    var onDelete: (() -> Void)?

    var body: some View {
        HStack(spacing: 16) {
            // Time column
            VStack(spacing: 4) {
                Text(item.time)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(item.is_highlight ? .ticketFloOrange : .webPrimary)

                Circle()
                    .fill(item.is_highlight ? Color.ticketFloOrange : Color.webPrimary)
                    .frame(width: 8, height: 8)
            }
            .frame(width: 60)

            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(item.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)

                if let description = item.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let location = item.location, !location.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin")
                            .font(.system(size: 10))
                        Text(location)
                            .font(.caption)
                    }
                    .foregroundColor(.secondary)
                }
            }

            Spacer()

            if item.is_highlight {
                Image(systemName: "star.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.ticketFloOrange)
            }

            // Delete button
            if let onDelete = onDelete {
                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .font(.system(size: 14))
                        .foregroundColor(.red.opacity(0.7))
                }
                .buttonStyle(BorderlessButtonStyle())
            }
        }
        .padding(16)
        .background(item.is_highlight ? Color.ticketFloOrange.opacity(0.05) : Color.clear)
    }
}

// MARK: - Add Schedule Item Sheet
struct AddScheduleItemSheet: View {
    let eventId: String
    @StateObject private var supabaseService = SupabaseService.shared
    @Environment(\.dismiss) private var dismiss

    @State private var time = ""
    @State private var title = ""
    @State private var description = ""
    @State private var location = ""
    @State private var isHighlight = false
    @State private var isSaving = false

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Time")) {
                    TextField("e.g., 7:00 PM", text: $time)
                }

                Section(header: Text("Details")) {
                    TextField("Title", text: $title)
                    TextField("Description (optional)", text: $description)
                    TextField("Location (optional)", text: $location)
                }

                Section {
                    Toggle("Highlight Item", isOn: $isHighlight)
                }
            }
            .navigationTitle("Add Schedule Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button("Add") {
                            addItem()
                        }
                        .disabled(time.isEmpty || title.isEmpty)
                    }
                }
            }
        }
    }

    private func addItem() {
        isSaving = true

        let newItem = SupabaseScheduleItem(
            event_id: eventId,
            time: time,
            title: title,
            description: description.isEmpty ? nil : description,
            location: location.isEmpty ? nil : location,
            is_highlight: isHighlight,
            sort_order: supabaseService.scheduleItems.count
        )

        Task {
            let success = await supabaseService.addScheduleItem(newItem)
            await MainActor.run {
                isSaving = false
                if success {
                    dismiss()
                }
            }
        }
    }
}

struct AnalyticsTabView: View {
    let analytics: (total: Int, checkedIn: Int, pending: Int)
    let guests: [SupabaseGuest]
    let selectedEvent: SupabaseEvent
    @StateObject private var supabaseService = SupabaseService.shared

    var posSalesTotal: Double {
        supabaseService.getPOSSalesTotal(for: selectedEvent.id)
    }

    var posSalesCount: Int {
        supabaseService.getPOSSalesCount(for: selectedEvent.id)
    }

    var ticketSalesTotal: Double {
        supabaseService.getTicketSalesTotal(for: selectedEvent.id)
    }

    var merchandiseSalesTotal: Double {
        supabaseService.getMerchandiseSalesTotal(for: selectedEvent.id)
    }

    var recentSales: [POSSale] {
        supabaseService.posSales
            .filter { $0.eventId == selectedEvent.id }
            .sorted { $0.timestamp > $1.timestamp }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "chart.bar")
                        .font(.system(size: 48))
                        .foregroundColor(.webPrimary)

                    Text("Event Analytics")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Real-time insights and metrics")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)

                // Quick Stats
                QuickStatsView(analytics: analytics)
                    .padding(.horizontal, 20)

                // POS Sales Summary
                VStack(alignment: .leading, spacing: 16) {
                    Text("Point of Sale")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 20)

                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 12) {
                        POSSalesCard(
                            title: "Total Sales",
                            value: String(format: "$%.2f", posSalesTotal),
                            icon: "dollarsign.circle.fill",
                            color: .green
                        )

                        POSSalesCard(
                            title: "Transactions",
                            value: "\(posSalesCount)",
                            icon: "creditcard.fill",
                            color: .webPrimary
                        )

                        POSSalesCard(
                            title: "Ticket Sales",
                            value: String(format: "$%.2f", ticketSalesTotal),
                            icon: "ticket.fill",
                            color: .ticketFloOrange
                        )

                        POSSalesCard(
                            title: "Merchandise",
                            value: String(format: "$%.2f", merchandiseSalesTotal),
                            icon: "bag.fill",
                            color: .purple
                        )
                    }
                    .padding(.horizontal, 20)

                    // Recent Sales
                    if !recentSales.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Recent Sales")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 20)

                            ForEach(recentSales.prefix(5)) { sale in
                                RecentSaleRow(sale: sale)
                            }
                            .padding(.horizontal, 20)
                        }
                    }
                }

                // Check-in Timeline
                VStack(alignment: .leading, spacing: 16) {
                    Text("Check-in Activity")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 20)

                    if !guests.filter({ $0.checkedIn }).isEmpty {
                        VStack(spacing: 8) {
                            ForEach(guests.filter({ $0.checkedIn }).prefix(10)) { guest in
                                RecentCheckInRow(guest: guest)
                            }
                        }
                        .padding(.horizontal, 20)
                    } else {
                        VStack(spacing: 16) {
                            Image(systemName: "clock")
                                .font(.system(size: 32))
                                .foregroundColor(.secondary)
                            Text("No check-ins yet")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 32)
                    }
                }

                // Performance Metrics
                VStack(spacing: 16) {
                    Text("Performance Metrics")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 20)

                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 16) {
                        AnalyticsMetricCard(title: "Check-in Rate", value: analytics.total > 0 ? "\(Int((Double(analytics.checkedIn) / Double(analytics.total)) * 100))%" : "0%", icon: "percent")
                        AnalyticsMetricCard(title: "Event Capacity", value: "\(selectedEvent.capacity)", icon: "building")
                        AnalyticsMetricCard(title: "Capacity Used", value: analytics.total > 0 ? "\(Int((Double(analytics.total) / Double(selectedEvent.capacity)) * 100))%" : "0%", icon: "chart.pie")
                        AnalyticsMetricCard(title: "Pending", value: "\(analytics.pending)", icon: "clock")
                    }
                    .padding(.horizontal, 20)
                }

                Spacer(minLength: 100)
            }
            .padding(.vertical, 20)
        }
    }
}

// MARK: - POS Sales Card
struct POSSalesCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(color)
                Spacer()
            }

            Text(value)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.primary)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Recent Sale Row
struct RecentSaleRow: View {
    let sale: POSSale

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(sale.itemType == "ticket" ? Color.ticketFloOrange.opacity(0.1) : Color.purple.opacity(0.1))
                .frame(width: 36, height: 36)
                .overlay(
                    Image(systemName: sale.itemType == "ticket" ? "ticket.fill" : "bag.fill")
                        .font(.system(size: 14))
                        .foregroundColor(sale.itemType == "ticket" ? .ticketFloOrange : .purple)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(sale.itemName)
                    .font(.subheadline)
                    .fontWeight(.medium)

                HStack(spacing: 4) {
                    Text("\(sale.quantity)x")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("•")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(sale.customerName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(String(format: "$%.2f", sale.totalAmount))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.green)

                Text(formatSaleTime(sale.timestamp))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(10)
        .shadow(color: .black.opacity(0.03), radius: 2, x: 0, y: 1)
    }

    private func formatSaleTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Supporting Components

struct RecentCheckInRow: View {
    let guest: SupabaseGuest

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color.green.opacity(0.1))
                .frame(width: 32, height: 32)
                .overlay(
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.green)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(guest.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                if let checkedInAt = guest.checkedInAt {
                    Text(formatCheckInTime(checkedInAt))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 16)
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }

    private func formatCheckInTime(_ timeString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"

        if let date = formatter.date(from: timeString) {
            formatter.dateStyle = .none
            formatter.timeStyle = .short
            return "Checked in at \(formatter.string(from: date))"
        }
        return timeString
    }
}

struct AnalyticsMetricCard: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.ticketFloOrange)

            VStack(spacing: 2) {
                Text(value)
                    .font(.headline)
                    .fontWeight(.bold)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct CustomTabBar: View {
    @Binding var selectedTab: ModernDashboardView.DashboardTab
    var visibleTabs: [ModernDashboardView.DashboardTab]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(visibleTabs, id: \.rawValue) { tab in
                Button(action: {
                    selectedTab = tab
                }) {
                    VStack(spacing: 3) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 16, weight: .medium))

                        Text(tab.displayName)
                            .font(.system(size: 9, weight: .medium))
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .foregroundColor(selectedTab == tab ? .webPrimary : .secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 2)
                }
            }
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 8)
        .background(
            Color(.systemBackground)
                .overlay(
                    Rectangle()
                        .fill(Color.webPrimary.opacity(0.1))
                        .frame(height: 1),
                    alignment: .top
                )
        )
        .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: -4)
    }
}

#Preview {
    ModernDashboardView(
        selectedEvent: SupabaseEvent(
            id: "1",
            name: "Sample Event",
            description: "This is a sample event",
            event_date: "2025-01-20T19:00:00",
            venue: "Sample Venue",
            capacity: 100,
            status: "active",
            organization_id: "org1",
            created_at: "2025-01-01T00:00:00",
            updated_at: "2025-01-01T00:00:00"
        )
    )
    .environmentObject(AuthService())
}