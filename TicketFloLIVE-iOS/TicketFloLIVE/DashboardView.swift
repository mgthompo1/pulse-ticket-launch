import SwiftUI

// MARK: - Dashboard View with Modern Layout
struct DashboardView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var selectedTab: SidebarTab = .checkin
    @State private var showingScanner = false
    @State private var isSidebarExpanded = false

    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 0) {
                // Dark Sidebar
                VStack(spacing: 0) {
                    // Sidebar Header
                    HStack {
                        if isSidebarExpanded {
                            Text("TicketFlo LIVE")
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .transition(.opacity)
                        }

                        Spacer()

                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                isSidebarExpanded.toggle()
                            }
                        }) {
                            Image(systemName: "line.3.horizontal")
                                .font(.title2)
                                .foregroundColor(.white)
                        }
                    }
                    .padding()
                    .background(Color.black.opacity(0.9))

                    // Navigation Items
                    VStack(spacing: 2) {
                        ForEach(SidebarTab.allCases, id: \.rawValue) { tab in
                            SidebarButton(
                                tab: tab,
                                isSelected: selectedTab == tab,
                                isExpanded: isSidebarExpanded
                            ) {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    selectedTab = tab
                                }
                            }
                        }
                    }
                    .padding(.top, 8)

                    Spacer()

                    // Sign Out Button
                    Button(action: { authService.signOut() }) {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .font(.title3)
                                .foregroundColor(.red)
                            if isSidebarExpanded {
                                Text("Sign Out")
                                    .foregroundColor(.red)
                                    .transition(.opacity)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                    .padding(.bottom, 20)
                }
                .frame(width: isSidebarExpanded ? 240 : 80)
                .background(Color.black.opacity(0.95))

                // Main Content Area
                VStack(spacing: 0) {
                    // Header with Stats
                    VStack(spacing: 0) {
                        // Modern Header
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Event Management")
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)
                                Text("Real-time event operations")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            // Search Bar
                            HStack {
                                Image(systemName: "magnifyingglass")
                                    .foregroundColor(.secondary)
                                Text("Search guests, tickets...")
                                    .foregroundColor(.secondary)
                                    .font(.caption)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                        }
                        .padding()
                        .background(Color(.systemBackground))

                        // Stats Cards
                        StatsCardsView()
                            .padding(.horizontal)
                            .padding(.bottom)
                            .background(Color(.systemBackground))
                    }

                    // Tab Content
                    ScrollView {
                        TabContentView(selectedTab: selectedTab, showingScanner: $showingScanner, supabaseService: supabaseService)
                            .padding()
                    }
                    .background(Color(.systemGroupedBackground))
                }
            }
        }
        .sheet(isPresented: $showingScanner) {
            ScannerView()
        }
    }
}