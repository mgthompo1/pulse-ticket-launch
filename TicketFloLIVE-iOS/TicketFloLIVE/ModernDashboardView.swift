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
    @State private var showingScanner = false
    @State private var searchText = ""
    @State private var selectedFilter: GuestFilter = .all
    @State private var selectedTab: DashboardTab = .checkIn
    @Environment(\.dismiss) private var dismiss

    let selectedEvent: SupabaseEvent

    enum DashboardTab: String, CaseIterable {
        case checkIn = "Check-In"
        case pointOfSale = "Point of Sale"
        case guestStatus = "Guest Status"
        case manageItems = "Manage Items"
        case analytics = "Analytics"

        var icon: String {
            switch self {
            case .checkIn: return "checkmark.circle"
            case .pointOfSale: return "creditcard"
            case .guestStatus: return "person.2"
            case .manageItems: return "list.bullet"
            case .analytics: return "chart.bar"
            }
        }

        var displayName: String {
            switch self {
            case .checkIn: return "Check-In"
            case .pointOfSale: return "Point of\nSale"
            case .guestStatus: return "Guest\nStatus"
            case .manageItems: return "Manage\nItems"
            case .analytics: return "Analytics"
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

                    // Point of Sale Tab
                    PointOfSaleTabView(selectedEvent: selectedEvent)
                        .tag(DashboardTab.pointOfSale)

                    // Guest Status Tab
                    GuestStatusTabView(analytics: analytics, guests: supabaseService.guests)
                        .tag(DashboardTab.guestStatus)

                    // Manage Items Tab
                    ManageItemsTabView(selectedEvent: selectedEvent)
                        .tag(DashboardTab.manageItems)

                    // Analytics Tab
                    AnalyticsTabView(analytics: analytics, guests: supabaseService.guests, selectedEvent: selectedEvent)
                        .tag(DashboardTab.analytics)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))

                // Custom Tab Bar
                CustomTabBar(selectedTab: $selectedTab)
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
        }
        .refreshable {
            await supabaseService.fetchGuests(for: selectedEvent.id)
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

    var body: some View {
        HStack(spacing: 16) {
            // Avatar/Status
            ZStack {
                Circle()
                    .fill(guest.checkedIn ? Color.green.opacity(0.1) : Color.gray.opacity(0.1))
                    .frame(width: 44, height: 44)

                if guest.checkedIn {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.green)
                } else {
                    Text(guest.initials)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                }
            }

            // Guest Info
            VStack(alignment: .leading, spacing: 4) {
                Text(guest.name)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)

                Text(guest.email)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(guest.ticketCode)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.webPrimary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.ticketFloOrange.opacity(0.1))
                    .cornerRadius(4)
            }

            Spacer()

            // Action Button
            if guest.checkedIn {
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Checked In")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.green)

                    if let checkedInAt = guest.checkedInAt {
                        Text(formatCheckInTime(checkedInAt))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            } else {
                Button(action: {
                    checkInGuest()
                }) {
                    if isCheckingIn {
                        ProgressView()
                            .scaleEffect(0.8)
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Check In")
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                }
                .foregroundColor(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.ticketFloOrange)
                .cornerRadius(16)
                .disabled(isCheckingIn)
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 2, x: 0, y: 1)
    }

    private func checkInGuest() {
        guard !isCheckingIn else { return }

        isCheckingIn = true
        Task {
            let success = await supabaseService.checkInGuest(ticketCode: guest.ticketCode)
            await MainActor.run {
                isCheckingIn = false
                if success {
                    // Refresh the guest list
                    Task {
                        await supabaseService.fetchGuests()
                    }
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
    @State private var selectedItems: [CartItem] = []
    @State private var customerName = ""
    @State private var customerEmail = ""
    @State private var isProcessingPayment = false
    @State private var showingPaymentSuccess = false
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
        Button(action: processPayment) {
            HStack {
                if isProcessingPayment {
                    ProgressView()
                        .scaleEffect(0.8)
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Image(systemName: "creditcard.fill")
                    Text("Process Payment - $\(cartTotal, specifier: "%.2f")")
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

struct GuestStatusTabView: View {
    let analytics: (total: Int, checkedIn: Int, pending: Int)
    let guests: [SupabaseGuest]

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Summary Cards
                VStack(spacing: 16) {
                    HStack(spacing: 16) {
                        GuestStatusCard(
                            title: "Total Guests",
                            value: "\(analytics.total)",
                            icon: "person.2.fill",
                            color: .blue
                        )

                        GuestStatusCard(
                            title: "Checked In",
                            value: "\(analytics.checkedIn)",
                            icon: "checkmark.circle.fill",
                            color: .green
                        )
                    }

                    HStack(spacing: 16) {
                        GuestStatusCard(
                            title: "Pending",
                            value: "\(analytics.pending)",
                            icon: "clock.fill",
                            color: .orange
                        )

                        GuestStatusCard(
                            title: "Check-in Rate",
                            value: analytics.total > 0 ? "\(Int((Double(analytics.checkedIn) / Double(analytics.total)) * 100))%" : "0%",
                            icon: "chart.bar.fill",
                            color: .purple
                        )
                    }
                }
                .padding(.horizontal, 20)

                // Recent Check-ins
                if !guests.filter({ $0.checkedIn }).isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Check-ins")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .padding(.horizontal, 20)

                        ForEach(guests.filter({ $0.checkedIn }).prefix(5)) { guest in
                            RecentCheckInRow(guest: guest)
                        }
                        .padding(.horizontal, 20)
                    }
                }
            }
            .padding(.vertical, 20)
        }
    }
}

struct ManageItemsTabView: View {
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var selectedSegment = 0 // 0 for tickets, 1 for merchandise
    @State private var showingEditAlert = false
    @State private var editingTicketType: SupabaseTicketType?
    @State private var editingMerchandise: SupabaseMerchandise?

    let selectedEvent: SupabaseEvent

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 8) {
                Image(systemName: "list.bullet")
                    .font(.system(size: 48))
                    .foregroundColor(.webPrimary)

                Text("Manage Items")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("View and monitor ticket types & merchandise")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 20)
            .padding(.bottom, 16)

            // Segmented Control
            Picker("Item Type", selection: $selectedSegment) {
                Text("Ticket Types").tag(0)
                Text("Merchandise").tag(1)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding(.horizontal, 20)
            .padding(.bottom, 16)

            ScrollView {
                VStack(spacing: 16) {
                    if selectedSegment == 0 {
                        ticketTypesSection
                    } else {
                        merchandiseSection
                    }
                }
                .padding(.bottom, 100)
            }
        }
        .task {
            await loadItemsData()
        }
        .refreshable {
            await loadItemsData()
        }
        .alert("Editing Not Available", isPresented: $showingEditAlert) {
            Button("OK") { }
        } message: {
            Text("Item editing is available in the web dashboard. This view is for monitoring only.")
        }
    }

    // MARK: - Ticket Types Section
    private var ticketTypesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Ticket Types")
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
                ForEach(supabaseService.ticketTypes) { ticketType in
                    ManageTicketTypeCard(ticketType: ticketType) {
                        editingTicketType = ticketType
                        showingEditAlert = true
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
    }

    // MARK: - Merchandise Section
    private var merchandiseSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Merchandise")
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
                    ManageMerchandiseCard(merchandise: merchandise) {
                        editingMerchandise = merchandise
                        showingEditAlert = true
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
    }

    // MARK: - Empty States
    private var emptyTicketTypesView: some View {
        VStack(spacing: 16) {
            Image(systemName: "ticket")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            Text("No ticket types configured")
                .font(.headline)
            Text("Add ticket types in the web dashboard")
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
            Text("No merchandise configured")
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
    private func loadItemsData() async {
        async let ticketTypesTask = supabaseService.fetchTicketTypes(for: selectedEvent.id)
        async let merchandiseTask = supabaseService.fetchMerchandise(for: selectedEvent.id)

        await ticketTypesTask
        await merchandiseTask
    }
}

// MARK: - Manage Items Component Views

struct ManageTicketTypeCard: View {
    let ticketType: SupabaseTicketType
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
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
                    }

                    Spacer()

                    Text("$\(ticketType.price, specifier: "%.2f")")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.webPrimary)
                }

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Available")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("\(ticketType.remainingQuantity)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(ticketType.remainingQuantity > 0 ? .green : .red)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Sold")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("\(ticketType.quantity_sold)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Total")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("\(ticketType.quantity_available)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Sales Progress")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        let progress = Double(ticketType.quantity_sold) / Double(ticketType.quantity_available)
                        Text("\(Int(progress * 100))%")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(.webPrimary)
                    }
                }
            }
            .padding(16)
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct ManageMerchandiseCard: View {
    let merchandise: SupabaseMerchandise
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
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
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 4) {
                        Text("$\(merchandise.price, specifier: "%.2f")")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.webPrimary)

                        if let active = merchandise.is_active {
                            Text(active ? "Active" : "Inactive")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(active ? .green : .red)
                        }
                    }
                }

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Stock")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        if let stock = merchandise.stock_quantity {
                            Text("\(stock)")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(stock > 0 ? .green : .red)
                        } else {
                            Text("N/A")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                        }
                    }

                    if let sizeOptions = merchandise.size_options, !sizeOptions.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Sizes")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(sizeOptions.joined(separator: ", "))
                                .font(.caption)
                                .foregroundColor(.primary)
                        }
                    }

                    Spacer()
                }
            }
            .padding(16)
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct AnalyticsTabView: View {
    let analytics: (total: Int, checkedIn: Int, pending: Int)
    let guests: [SupabaseGuest]
    let selectedEvent: SupabaseEvent

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

// MARK: - Supporting Components

struct GuestStatusCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
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

    var body: some View {
        HStack(spacing: 0) {
            ForEach(ModernDashboardView.DashboardTab.allCases, id: \.rawValue) { tab in
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