import SwiftUI


// MARK: - Legacy Auth Service Stub
// This is kept for compatibility with existing views that reference AuthService
// All authentication is now handled by SupabaseService
class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var sessionExpired = false

    private let supabaseService = SupabaseService.shared

    init() {
        // Sync with SupabaseService authentication state
        supabaseService.$isAuthenticated
            .assign(to: &$isAuthenticated)
        supabaseService.$isLoading
            .assign(to: &$isLoading)
        supabaseService.$error
            .assign(to: &$errorMessage)
        supabaseService.$sessionExpired
            .assign(to: &$sessionExpired)
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
        print("🔐 Starting sign in for: \(email)")
        Task {
            let success = await supabaseService.signIn(email: email, password: password)
            if !success {
                print("❌ Authentication failed")
            } else {
                print("✅ Authentication succeeded")
            }
        }
    }

    func logout() {
        supabaseService.signOut()
    }

    func signOut() {
        supabaseService.signOut()
    }

    /// Attempt to refresh the access token
    func refreshSession() {
        Task {
            let success = await supabaseService.refreshAccessToken()
            if !success {
                print("❌ Session refresh failed - user needs to sign in again")
            }
        }
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
    @StateObject private var passkeyManager = PasskeyManager.shared
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var isAnimating = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var hasPasskeys = false
    @State private var isCheckingPasskeys = false
    @FocusState private var focusedField: Field?

    enum Field {
        case email, password
    }

    var body: some View {
        ZStack {
            // Gradient background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.05, green: 0.05, blue: 0.1),
                    Color.black
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            // Animated background circles
            GeometryReader { geo in
                Circle()
                    .fill(Color.ticketFloOrange.opacity(0.1))
                    .frame(width: 300, height: 300)
                    .blur(radius: 60)
                    .offset(x: isAnimating ? geo.size.width * 0.3 : geo.size.width * 0.1,
                            y: isAnimating ? geo.size.height * 0.1 : geo.size.height * 0.2)
                    .animation(.easeInOut(duration: 8).repeatForever(autoreverses: true), value: isAnimating)

                Circle()
                    .fill(Color.blue.opacity(0.08))
                    .frame(width: 250, height: 250)
                    .blur(radius: 50)
                    .offset(x: isAnimating ? geo.size.width * 0.5 : geo.size.width * 0.7,
                            y: isAnimating ? geo.size.height * 0.6 : geo.size.height * 0.5)
                    .animation(.easeInOut(duration: 6).repeatForever(autoreverses: true), value: isAnimating)
            }
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    Spacer().frame(height: 60)

                    // Logo and branding
                    VStack(spacing: 20) {
                        // Animated logo
                        ZStack {
                            // Glow effect
                            Circle()
                                .fill(Color.ticketFloOrange.opacity(0.3))
                                .frame(width: 120, height: 120)
                                .blur(radius: 20)

                            // Icon background
                            Circle()
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color.ticketFloOrange,
                                            Color.ticketFloOrange.opacity(0.8)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 100, height: 100)
                                .shadow(color: Color.ticketFloOrange.opacity(0.5), radius: 20, x: 0, y: 10)

                            Image(systemName: "ticket.fill")
                                .font(.system(size: 48, weight: .medium))
                                .foregroundColor(.white)
                                .rotationEffect(.degrees(isAnimating ? -10 : 10))
                                .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: isAnimating)
                        }

                        VStack(spacing: 8) {
                            Text("TicketFlo")
                                .font(.system(size: 40, weight: .bold, design: .rounded))
                                .foregroundColor(.white)

                            HStack(spacing: 8) {
                                Rectangle()
                                    .fill(Color.ticketFloOrange)
                                    .frame(width: 20, height: 2)

                                Text("LIVE")
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundColor(.ticketFloOrange)
                                    .tracking(4)

                                Rectangle()
                                    .fill(Color.ticketFloOrange)
                                    .frame(width: 20, height: 2)
                            }
                        }

                        Text("Check-In & Event Management")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .padding(.bottom, 20)

                    // Login form
                    VStack(spacing: 20) {
                        // Email field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white.opacity(0.8))

                            HStack(spacing: 12) {
                                Image(systemName: "envelope.fill")
                                    .foregroundColor(.white.opacity(0.5))
                                    .frame(width: 20)

                                TextField("", text: $email)
                                    .placeholder(when: email.isEmpty) {
                                        Text("Enter your email").foregroundColor(.white.opacity(0.3))
                                    }
                                    .font(.system(size: 16))
                                    .foregroundColor(.white)
                                    .autocapitalization(.none)
                                    .keyboardType(.emailAddress)
                                    .textContentType(.emailAddress)
                                    .focused($focusedField, equals: .email)
                                    .submitLabel(.next)
                                    .onSubmit { focusedField = .password }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 16)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.white.opacity(0.08))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(focusedField == .email ? Color.ticketFloOrange : Color.white.opacity(0.1), lineWidth: 1)
                                    )
                            )
                        }

                        // Password field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white.opacity(0.8))

                            HStack(spacing: 12) {
                                Image(systemName: "lock.fill")
                                    .foregroundColor(.white.opacity(0.5))
                                    .frame(width: 20)

                                Group {
                                    if showPassword {
                                        TextField("", text: $password)
                                            .placeholder(when: password.isEmpty) {
                                                Text("Enter your password").foregroundColor(.white.opacity(0.3))
                                            }
                                    } else {
                                        SecureField("", text: $password)
                                            .placeholder(when: password.isEmpty) {
                                                Text("Enter your password").foregroundColor(.white.opacity(0.3))
                                            }
                                    }
                                }
                                .font(.system(size: 16))
                                .foregroundColor(.white)
                                .focused($focusedField, equals: .password)
                                .submitLabel(.go)
                                .onSubmit { signIn() }

                                Button(action: { showPassword.toggle() }) {
                                    Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                                        .foregroundColor(.white.opacity(0.5))
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 16)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.white.opacity(0.08))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(focusedField == .password ? Color.ticketFloOrange : Color.white.opacity(0.1), lineWidth: 1)
                                    )
                            )
                        }

                        // Sign In button
                        Button(action: signIn) {
                            HStack(spacing: 12) {
                                if authService.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.9)
                                } else {
                                    Image(systemName: "arrow.right.circle.fill")
                                        .font(.system(size: 20))
                                    Text("Sign In")
                                        .font(.system(size: 18, weight: .semibold))
                                }
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color.ticketFloOrange,
                                        Color.ticketFloOrange.opacity(0.85)
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(14)
                            .shadow(color: Color.ticketFloOrange.opacity(0.4), radius: 10, x: 0, y: 5)
                        }
                        .disabled(authService.isLoading)
                        .opacity(authService.isLoading ? 0.7 : 1.0)
                        .padding(.top, 8)

                        // Passkey Sign In button (iOS 16+)
                        if #available(iOS 16.0, *), passkeyManager.isSupported {
                            Button(action: signInWithPasskey) {
                                HStack(spacing: 12) {
                                    if passkeyManager.isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                            .scaleEffect(0.9)
                                    } else {
                                        Image(systemName: "person.badge.key.fill")
                                            .font(.system(size: 20))
                                        Text(hasPasskeys ? "Sign In with Passkey" : "Sign In with Passkey")
                                            .font(.system(size: 18, weight: .semibold))
                                    }
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                                .background(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color.blue,
                                            Color.blue.opacity(0.85)
                                        ]),
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .cornerRadius(14)
                                .shadow(color: Color.blue.opacity(0.4), radius: 10, x: 0, y: 5)
                            }
                            .disabled(passkeyManager.isLoading || email.isEmpty)
                            .opacity((passkeyManager.isLoading || email.isEmpty) ? 0.5 : 1.0)

                            // Show passkey status hint
                            if !email.isEmpty {
                                HStack(spacing: 6) {
                                    if isCheckingPasskeys {
                                        ProgressView()
                                            .scaleEffect(0.7)
                                    } else if hasPasskeys {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.green)
                                            .font(.system(size: 12))
                                        Text("Passkey available for this account")
                                            .font(.system(size: 12))
                                            .foregroundColor(.green.opacity(0.8))
                                    }
                                }
                                .frame(height: 20)
                            }
                        }

                        // Divider
                        HStack {
                            Rectangle()
                                .fill(Color.white.opacity(0.2))
                                .frame(height: 1)
                            Text("OR")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.white.opacity(0.4))
                                .padding(.horizontal, 16)
                            Rectangle()
                                .fill(Color.white.opacity(0.2))
                                .frame(height: 1)
                        }
                        .padding(.vertical, 8)

                        // Demo mode button
                        Button(action: { authService.signIn() }) {
                            HStack(spacing: 8) {
                                Image(systemName: "play.circle.fill")
                                    .font(.system(size: 18))
                                Text("Try Demo Mode")
                                    .font(.system(size: 16, weight: .medium))
                            }
                            .foregroundColor(.ticketFloOrange)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(Color.ticketFloOrange.opacity(0.5), lineWidth: 1.5)
                            )
                        }
                    }
                    .padding(.horizontal, 28)

                    Spacer().frame(height: 40)

                    // Footer
                    VStack(spacing: 8) {
                        Text("Powered by TicketFlo")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.3))

                        Text("v1.0")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.2))
                    }
                    .padding(.bottom, 30)
                }
            }
        }
        .onAppear {
            isAnimating = true
        }
        .alert("Sign In Error", isPresented: $showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(errorMessage)
        }
        .onChange(of: authService.errorMessage) { newError in
            if let error = newError, !error.isEmpty {
                errorMessage = error
                showError = true
            }
        }
        .onChange(of: email) { newEmail in
            // Debounce passkey status check
            if newEmail.contains("@") && newEmail.contains(".") {
                checkPasskeyStatus()
            } else {
                hasPasskeys = false
            }
        }
    }

    private func signIn() {
        focusedField = nil
        if !email.isEmpty && !password.isEmpty {
            authService.signInWithCredentials(email: email, password: password)
        } else if email.isEmpty && password.isEmpty {
            authService.signIn()
        } else {
            showError = true
            errorMessage = "Please enter both email and password, or use Demo Mode."
        }
    }

    @available(iOS 16.0, *)
    private func signInWithPasskey() {
        focusedField = nil
        guard !email.isEmpty else {
            showError = true
            errorMessage = "Please enter your email to sign in with passkey."
            return
        }

        Task {
            // Get the key window for presentation
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let window = windowScene.windows.first(where: { $0.isKeyWindow }) else {
                await MainActor.run {
                    showError = true
                    errorMessage = "Unable to present passkey prompt."
                }
                return
            }

            let result = await passkeyManager.authenticateWithPasskey(email: email, anchor: window)

            await MainActor.run {
                switch result {
                case .success(let authResult):
                    // Use the magic link token to establish session
                    print("✅ Passkey authentication successful for: \(authResult.email)")
                    Task {
                        let success = await SupabaseService.shared.verifyPasskeyToken(
                            email: authResult.email,
                            token: authResult.token
                        )
                        if !success {
                            showError = true
                            errorMessage = "Failed to establish session after passkey authentication."
                        }
                    }

                case .failure(let error):
                    if case .cancelled = error {
                        // User cancelled, don't show error
                        print("🔐 Passkey authentication cancelled by user")
                    } else {
                        showError = true
                        errorMessage = error.localizedDescription
                    }
                }
            }
        }
    }

    private func checkPasskeyStatus() {
        guard !email.isEmpty, email.contains("@") else {
            hasPasskeys = false
            return
        }

        isCheckingPasskeys = true
        Task {
            let status = await passkeyManager.checkPasskeyStatus(email: email)
            await MainActor.run {
                hasPasskeys = status.hasPasskeys
                isCheckingPasskeys = false
            }
        }
    }
}

// Extension to show auth errors
extension LoginView {
    var hasAuthError: Bool {
        authService.errorMessage != nil && !authService.errorMessage!.isEmpty
    }
}

// MARK: - Placeholder Extension
extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .leading,
        @ViewBuilder placeholder: () -> Content
    ) -> some View {
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
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