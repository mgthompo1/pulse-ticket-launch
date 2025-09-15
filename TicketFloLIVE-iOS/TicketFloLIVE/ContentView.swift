import SwiftUI

// MARK: - Brand Colors
extension Color {
    static let ticketFloOrange = Color(red: 1.0, green: 0.302, blue: 0.0) // #ff4d00
}

// MARK: - Legacy Auth Service Stub
// This is kept for compatibility with existing views that reference AuthService
// All authentication is now handled by SupabaseService
class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = false

    private let supabaseService = SupabaseService.shared

    init() {
        // Sync with SupabaseService authentication state
        supabaseService.$isAuthenticated
            .assign(to: &$isAuthenticated)
        supabaseService.$isLoading
            .assign(to: &$isLoading)
    }

    func signIn() {
        // Demo mode - use a real organization ID from the logs
        Task {
            await MainActor.run {
                supabaseService.isAuthenticated = true
                // Use a real organization ID from the user's logs
                supabaseService.userOrganizationId = "a0fb92a2-2cd1-48e2-93b1-1b6294a9da13"
                supabaseService.userEmail = "demo@example.com"
            }
        }
    }

    func signInWithCredentials(email: String, password: String) {
        Task {
            let success = await supabaseService.signIn(email: email, password: password)
            if !success {
                print("Authentication failed")
            }
        }
    }

    func signOut() {
        supabaseService.signOut()
    }
}

// MARK: - Models
struct Guest: Identifiable {
    let id = UUID()
    let name: String
    let email: String
    let checkedIn: Bool

    var initials: String {
        let components = name.components(separatedBy: " ")
        return components.compactMap { $0.first?.uppercased() }.joined()
    }
}

struct Product: Identifiable {
    let id = UUID()
    let name: String
    let price: Double
    let stock: Int
}

// MARK: - Sample Data
let sampleGuests = [
    Guest(name: "John Smith", email: "john@example.com", checkedIn: true),
    Guest(name: "Sarah Johnson", email: "sarah@example.com", checkedIn: true),
    Guest(name: "Mike Wilson", email: "mike@example.com", checkedIn: false),
    Guest(name: "Emily Davis", email: "emily@example.com", checkedIn: false),
    Guest(name: "David Brown", email: "david@example.com", checkedIn: true)
]

let sampleProducts = [
    Product(name: "T-Shirt", price: 25.00, stock: 50),
    Product(name: "Poster", price: 15.00, stock: 25),
    Product(name: "Drink", price: 5.00, stock: 100),
    Product(name: "Snack", price: 3.50, stock: 75)
]

// MARK: - Main Views
struct ContentView: View {
    @EnvironmentObject var authService: AuthService

    var body: some View {
        NavigationView {
            if authService.isAuthenticated {
                EventSelectionView()
                    .environmentObject(authService)
            } else {
                LoginView()
            }
        }
    }
}

// MARK: - Login View
struct LoginView: View {
    @EnvironmentObject var authService: AuthService
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ZStack {
            // Black background to match brand
            Color.black
                .ignoresSafeArea()

            VStack(spacing: 40) {
                Spacer()

                VStack(spacing: 24) {
                    // TicketFlo logo in brand orange
                    VStack(spacing: 16) {
                        Image(systemName: "ticket.fill")
                            .font(.system(size: 80, weight: .medium))
                            .foregroundColor(.ticketFloOrange)

                        Text("TicketFlo")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundColor(.ticketFloOrange)

                        Text("LIVE")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.white)
                            .tracking(2)
                    }

                    Text("Event Management")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundColor(.white.opacity(0.8))
                }

                VStack(spacing: 24) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Email")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)

                        TextField("Enter your email", text: $email)
                            .font(.system(size: 16))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 16)
                            .background(Color.white.opacity(0.1))
                            .cornerRadius(12)
                            .foregroundColor(.white)
                            .autocapitalization(.none)
                            .keyboardType(.emailAddress)
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Password")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)

                        SecureField("Enter your password", text: $password)
                            .font(.system(size: 16))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 16)
                            .background(Color.white.opacity(0.1))
                            .cornerRadius(12)
                            .foregroundColor(.white)
                    }

                    Button(action: {
                        if !email.isEmpty && !password.isEmpty {
                            authService.signInWithCredentials(email: email, password: password)
                        } else {
                            authService.signIn()
                        }
                    }) {
                        HStack {
                            if authService.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .scaleEffect(0.8)
                            } else {
                                Text("Sign In")
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Color.ticketFloOrange)
                        .cornerRadius(12)
                    }
                    .disabled(authService.isLoading)
                    .opacity(authService.isLoading ? 0.8 : 1.0)

                    Button(action: { authService.signIn() }) {
                        Text("Try Demo Mode")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                            .underline()
                    }
                    .padding(.top, 8)
                }
                .padding(.horizontal, 30)

                Spacer()
            }
        }
    }
}

// MARK: - Dashboard View
struct DashboardView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var selectedTab: SidebarTab = .checkin
    @State private var showingScanner = false

    var body: some View {
        TabView(selection: $selectedTab) {
            // Check-in Tab
            NavigationView {
                VStack(spacing: 0) {
                    // Stats Header
                    StatsHeaderView(supabaseService: supabaseService, authService: authService)

                    // Content
                    ScrollView {
                        CheckinContent(showingScanner: $showingScanner, supabaseService: supabaseService)
                            .padding()
                    }
                    .background(Color(.systemGroupedBackground))
                }
                .navigationTitle("Check-in")
                .navigationBarTitleDisplayMode(.inline)
            }
            .tabItem {
                Image(systemName: "qrcode.viewfinder")
                Text("Check-in")
            }
            .tag(SidebarTab.checkin)

            // Guest Status Tab
            NavigationView {
                VStack(spacing: 0) {
                    StatsHeaderView(supabaseService: supabaseService, authService: authService)

                    ScrollView {
                        GuestStatusContent(supabaseService: supabaseService)
                            .padding()
                    }
                    .background(Color(.systemGroupedBackground))
                }
                .navigationTitle("Guests")
                .navigationBarTitleDisplayMode(.inline)
            }
            .tabItem {
                Image(systemName: "person.3.fill")
                Text("Guests")
            }
            .tag(SidebarTab.guestStatus)

            // Analytics Tab
            NavigationView {
                VStack(spacing: 0) {
                    StatsHeaderView(supabaseService: supabaseService, authService: authService)

                    ScrollView {
                        AnalyticsContent(supabaseService: supabaseService)
                            .padding()
                    }
                    .background(Color(.systemGroupedBackground))
                }
                .navigationTitle("Analytics")
                .navigationBarTitleDisplayMode(.inline)
            }
            .tabItem {
                Image(systemName: "chart.bar.fill")
                Text("Analytics")
            }
            .tag(SidebarTab.analytics)

            // Point of Sale Tab
            NavigationView {
                VStack(spacing: 0) {
                    StatsHeaderView(supabaseService: supabaseService, authService: authService)

                    ScrollView {
                        PointOfSaleContent()
                            .padding()
                    }
                    .background(Color(.systemGroupedBackground))
                }
                .navigationTitle("Point of Sale")
                .navigationBarTitleDisplayMode(.inline)
            }
            .tabItem {
                Image(systemName: "creditcard.fill")
                Text("Sales")
            }
            .tag(SidebarTab.pointOfSale)

            // Settings Tab
            NavigationView {
                ScrollView {
                    VStack(spacing: 20) {
                        // Stats at top
                        HStack(spacing: 12) {
                            let analytics = supabaseService.getAnalytics()
                            StatCard(title: "Total", value: "\(analytics.totalGuests)", icon: "person.3.fill", color: .blue)
                            StatCard(title: "Checked In", value: "\(analytics.checkedIn)", icon: "checkmark.circle.fill", color: .green)
                            StatCard(title: "Pending", value: "\(analytics.pendingCheckIn)", icon: "clock.fill", color: .orange)
                        }
                        .padding(.horizontal)

                        // Quick actions
                        VStack(spacing: 16) {
                            Button(action: {
                                Task {
                                    await supabaseService.fetchEvents()
                                    await supabaseService.fetchGuests()
                                }
                            }) {
                                HStack {
                                    Image(systemName: "arrow.clockwise")
                                    Text("Refresh Data")
                                    Spacer()
                                }
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(10)
                            }
                            .foregroundColor(.primary)

                            Button(action: { authService.signOut() }) {
                                HStack {
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                    Text("Sign Out")
                                    Spacer()
                                }
                                .padding()
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(10)
                            }
                            .foregroundColor(.red)
                        }
                        .padding()
                    }
                }
                .navigationTitle("Settings")
                .navigationBarTitleDisplayMode(.inline)
            }
            .tabItem {
                Image(systemName: "gearshape.fill")
                Text("Settings")
            }
            .tag(SidebarTab.manageItems)
        }
        .accentColor(Color.ticketFloOrange)
        .sheet(isPresented: $showingScanner) {
            ScannerView()
        }
        .onAppear {
            Task {
                await supabaseService.fetchEvents()
                await supabaseService.fetchGuests()
            }
        }
    }
}

// MARK: - Stats Header Component
struct StatsHeaderView: View {
    @ObservedObject var supabaseService: SupabaseService
    @ObservedObject var authService: AuthService

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Event Management")
                        .font(.title2)
                        .fontWeight(.semibold)
                    Text("Real-time operations")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Button(action: { authService.signOut() }) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundColor(.red)
                }
            }
            .padding()
            .background(Color(.systemBackground))

            // Stats Cards
            HStack(spacing: 12) {
                let analytics = supabaseService.getAnalytics()
                StatCard(title: "Total", value: "\(analytics.totalGuests)", icon: "person.3.fill", color: .blue)
                StatCard(title: "Checked In", value: "\(analytics.checkedIn)", icon: "checkmark.circle.fill", color: .green)
                StatCard(title: "Pending", value: "\(analytics.pendingCheckIn)", icon: "clock.fill", color: .orange)
            }
            .padding()
            .background(Color(.systemBackground))
        }
    }
}

// MARK: - Analytics Content
struct AnalyticsContent: View {
    @ObservedObject var supabaseService: SupabaseService

    var body: some View {
        VStack(spacing: 20) {
            // Detailed Analytics
            let analytics = supabaseService.getAnalytics()

            VStack(spacing: 16) {
                Text("Event Statistics")
                    .font(.title2)
                    .fontWeight(.semibold)

                // Attendance Rate
                VStack {
                    HStack {
                        Text("Attendance Rate")
                        Spacer()
                        Text("\(analytics.totalGuests > 0 ? Int(Double(analytics.checkedIn) / Double(analytics.totalGuests) * 100) : 0)%")
                            .fontWeight(.semibold)
                    }

                    ProgressView(value: Double(analytics.checkedIn), total: Double(max(analytics.totalGuests, 1)))
                        .progressViewStyle(LinearProgressViewStyle(tint: .green))
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)

                // Quick Stats Grid
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 16) {
                    StatCard(title: "Events", value: "\(supabaseService.events.count)", icon: "calendar", color: .purple)
                    StatCard(title: "Total Guests", value: "\(analytics.totalGuests)", icon: "person.3.fill", color: .blue)
                    StatCard(title: "Checked In", value: "\(analytics.checkedIn)", icon: "checkmark.circle.fill", color: .green)
                    StatCard(title: "Remaining", value: "\(analytics.pendingCheckIn)", icon: "clock.fill", color: .orange)
                }
            }

            Spacer()
        }
    }
}

// MARK: - Sidebar Components
enum SidebarTab: String, CaseIterable {
    case checkin = "Check-in"
    case pointOfSale = "Point of Sale"
    case guestStatus = "Guest Status"
    case manageItems = "Manage Items"
    case lanyardConfig = "Lanyard Config"
    case analytics = "Analytics"

    var icon: String {
        switch self {
        case .checkin: return "qrcode.viewfinder"
        case .pointOfSale: return "creditcard.fill"
        case .guestStatus: return "person.3.fill"
        case .manageItems: return "square.grid.2x2.fill"
        case .lanyardConfig: return "tag.fill"
        case .analytics: return "chart.bar.fill"
        }
    }
}

struct SidebarButton: View {
    let tab: SidebarTab
    let isSelected: Bool
    let isExpanded: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: tab.icon)
                    .font(.title3)
                    .foregroundColor(isSelected ? .white : .gray)
                    .frame(width: 24, height: 24)

                if isExpanded {
                    Text(tab.rawValue)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundColor(isSelected ? .white : .gray)
                    Spacer()
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(isSelected ? Color.blue : Color.clear)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .padding(.horizontal, 8)
    }
}

// MARK: - Supporting Views

struct TabContentView: View {
    let selectedTab: SidebarTab
    @Binding var showingScanner: Bool
    @ObservedObject var supabaseService: SupabaseService

    var body: some View {
        VStack(spacing: 20) {
            switch selectedTab {
            case .checkin:
                CheckinContent(showingScanner: $showingScanner, supabaseService: supabaseService)
            case .pointOfSale:
                PointOfSaleContent()
            case .guestStatus:
                GuestStatusContent(supabaseService: supabaseService)
            case .manageItems:
                ManageItemsContent()
            case .lanyardConfig:
                LanyardConfigContent()
            case .analytics:
                AnalyticsContent(supabaseService: supabaseService)
            }
        }
    }
}

struct CheckinContent: View {
    @Binding var showingScanner: Bool
    @ObservedObject var supabaseService: SupabaseService

    var body: some View {
        VStack(spacing: 20) {
            VStack(alignment: .leading, spacing: 16) {
                Text("Guest Check-In")
                    .font(.headline)
                    .fontWeight(.semibold)

                Button(action: { showingScanner = true }) {
                    HStack {
                        Image(systemName: "qrcode.viewfinder")
                        Text("Scan Ticket")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }

                if supabaseService.isLoading {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("Loading guest data...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                if let error = supabaseService.error {
                    Text("Error: \(error)")
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.top, 4)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)

            VStack(alignment: .leading, spacing: 16) {
                Text("Recent Check-ins")
                    .font(.headline)
                    .fontWeight(.semibold)

                if supabaseService.guests.isEmpty && !supabaseService.isLoading {
                    Text("No guests found. Check your internet connection.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding()
                } else {
                    ForEach(supabaseService.guests.filter { $0.checkedIn }.prefix(3)) { guest in
                        HStack {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 40, height: 40)
                                .overlay(
                                    Text(guest.initials)
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.white)
                                )

                            VStack(alignment: .leading) {
                                Text(guest.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text(guest.email)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            VStack(alignment: .trailing) {
                                Text("✓ Checked In")
                                    .font(.caption)
                                    .foregroundColor(.green)
                                if let checkedInAt = guest.checkedInAt {
                                    Text(formatDate(checkedInAt))
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
        .onAppear {
            Task {
                await supabaseService.fetchGuests()
            }
        }
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        return "Just now"
    }
}

struct PointOfSaleContent: View {
    var body: some View {
        VStack(spacing: 20) {
            VStack(alignment: .leading, spacing: 16) {
                Text("Point of Sale")
                    .font(.headline)
                    .fontWeight(.semibold)

                Text("Current Sale: $0.00")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.green)

                Button("Process Payment") {
                    // Payment logic
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.gray)
                .foregroundColor(.white)
                .cornerRadius(8)
                .disabled(true)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)

            VStack(alignment: .leading, spacing: 16) {
                Text("Products")
                    .font(.headline)
                    .fontWeight(.semibold)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(sampleProducts) { product in
                        VStack {
                            Image(systemName: "bag.fill")
                                .font(.title2)
                                .foregroundColor(.blue)
                            Text(product.name)
                                .font(.caption)
                            Text("$\(product.price, specifier: "%.2f")")
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }
}

struct GuestStatusContent: View {
    @ObservedObject var supabaseService: SupabaseService

    var body: some View {
        VStack(spacing: 20) {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Guest List")
                        .font(.headline)
                        .fontWeight(.semibold)

                    Spacer()

                    if supabaseService.isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Button("Refresh") {
                            Task {
                                await supabaseService.fetchGuests()
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(6)
                    }
                }

                if supabaseService.guests.isEmpty && !supabaseService.isLoading {
                    VStack(spacing: 12) {
                        Text("No guests found")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Text("Make sure you're connected to the internet and try refreshing.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    ForEach(supabaseService.guests) { guest in
                        HStack {
                            Circle()
                                .fill(guest.checkedIn ? Color.green : Color.gray)
                                .frame(width: 40, height: 40)
                                .overlay(
                                    Text(guest.initials)
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.white)
                                )

                            VStack(alignment: .leading, spacing: 2) {
                                Text(guest.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text(guest.email)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text("Ticket: \(guest.ticketCode)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                Text(guest.checkedIn ? "✓ Checked In" : "⏳ Pending")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(guest.checkedIn ? .green : .orange)

                                if guest.checkedIn, let checkedInAt = guest.checkedInAt {
                                    Text(formatDate(checkedInAt))
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 4)

                        if guest.id != supabaseService.guests.last?.id {
                            Divider()
                        }
                    }
                }

                if let error = supabaseService.error {
                    Text("Error: \(error)")
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.top, 8)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
        .onAppear {
            if supabaseService.guests.isEmpty {
                Task {
                    await supabaseService.fetchGuests()
                }
            }
        }
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .none
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        return "Unknown"
    }
}

struct ManageItemsContent: View {
    var body: some View {
        VStack(spacing: 20) {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Manage Items")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Spacer()
                    Button("Add Item") { }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }

                ForEach(sampleProducts) { product in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(product.name)
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Text("$\(product.price, specifier: "%.2f") • Stock: \(product.stock)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Button("Edit") { }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color(.systemGray6))
                            .cornerRadius(6)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }
}

struct LanyardConfigContent: View {
    @State private var selectedTemplate = "Standard"

    var body: some View {
        VStack(spacing: 20) {
            VStack(alignment: .leading, spacing: 16) {
                Text("Lanyard Configuration")
                    .font(.headline)
                    .fontWeight(.semibold)

                HStack(spacing: 12) {
                    ForEach(["Standard", "Premium", "VIP"], id: \.self) { template in
                        Button(template) {
                            selectedTemplate = template
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(selectedTemplate == template ? Color.blue : Color(.systemGray6))
                        .foregroundColor(selectedTemplate == template ? .white : .primary)
                        .cornerRadius(8)
                    }
                }

                Button("Save Configuration") { }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)

            VStack(alignment: .leading, spacing: 16) {
                Text("Preview")
                    .font(.headline)
                    .fontWeight(.semibold)

                Rectangle()
                    .fill(LinearGradient(
                        colors: selectedTemplate == "VIP" ? [.purple, .blue] :
                               selectedTemplate == "Premium" ? [.blue, .cyan] :
                               [.gray.opacity(0.3), .gray.opacity(0.1)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(height: 150)
                    .cornerRadius(12)
                    .overlay(
                        VStack {
                            Text("TicketFlo Event")
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                            Text("Sample Guest")
                                .foregroundColor(.white.opacity(0.8))
                        }
                    )
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }
}


#Preview {
    ContentView()
        .environmentObject(AuthService())
}