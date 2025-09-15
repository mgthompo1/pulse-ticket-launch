import SwiftUI

struct EventSelectionView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var selectedEvent: SupabaseEvent? {
        didSet {
            print("🔥 selectedEvent changed: \(selectedEvent?.name ?? "nil")")
        }
    }
    @State private var showingDashboard = false {
        didSet {
            print("🔥 showingDashboard changed: \(showingDashboard)")
        }
    }
    @State private var searchText = ""

    private var filteredEvents: [SupabaseEvent] {
        if searchText.isEmpty {
            return supabaseService.events
        } else {
            return supabaseService.events.filter { event in
                event.name.localizedCaseInsensitiveContains(searchText) ||
                (event.venue?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
    }

    var body: some View {
        NavigationView {
            GeometryReader { geometry in
                ZStack {
                    // Background
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(.systemBackground),
                            Color(.systemGroupedBackground).opacity(0.3)
                        ]),
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .ignoresSafeArea()

                    VStack(spacing: 0) {
                        // Modern Header
                        VStack(spacing: 0) {
                            // Top Header
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Events")
                                        .font(.largeTitle)
                                        .fontWeight(.bold)
                                        .foregroundColor(.primary)

                                    if !supabaseService.events.isEmpty {
                                        Text("\(supabaseService.events.count) events available")
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                    }
                                }

                                Spacer()

                                // Profile/Settings Button
                                Menu {
                                    Button("Sign Out", role: .destructive) {
                                        authService.signOut()
                                    }
                                } label: {
                                    Circle()
                                        .fill(Color.ticketFloOrange.opacity(0.15))
                                        .frame(width: 40, height: 40)
                                        .overlay(
                                            Text("TF")
                                                .font(.caption)
                                                .fontWeight(.semibold)
                                                .foregroundColor(.ticketFloOrange)
                                        )
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, 8)
                            .padding(.bottom, 16)

                            // Search Bar
                            if !supabaseService.events.isEmpty {
                                HStack(spacing: 12) {
                                    HStack(spacing: 8) {
                                        Image(systemName: "magnifyingglass")
                                            .foregroundColor(.secondary)
                                        TextField("Search events...", text: $searchText)
                                            .textFieldStyle(PlainTextFieldStyle())
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 10)
                                    .background(Color(.tertiarySystemFill))
                                    .cornerRadius(10)
                                }
                                .padding(.horizontal, 20)
                                .padding(.bottom, 16)
                            }
                        }
                        .background(Color(.systemBackground))

                        // Content
                        if supabaseService.isLoading {
                            LoadingView()
                        } else if supabaseService.events.isEmpty {
                            EmptyEventsView()
                        } else if let error = supabaseService.error {
                            ErrorView(error: error) {
                                Task {
                                    await supabaseService.fetchEvents()
                                }
                            }
                        } else {
                            EventListView(
                                events: filteredEvents,
                                selectedEvent: $selectedEvent,
                                showingDashboard: $showingDashboard,
                                geometry: geometry
                            )
                        }
                    }
                }
            }
        }
        .fullScreenCover(isPresented: $showingDashboard) {
            if let event = selectedEvent {
                ModernDashboardView(selectedEvent: event)
                    .environmentObject(authService)
                    .onAppear {
                        print("🚀🚀🚀 FULLSCREEN COVER APPEARED - ModernDashboardView shown for: \(event.name)")
                    }
            } else {
                Text("No event selected")
                    .onAppear {
                        print("❌❌❌ SELECTED EVENT IS NIL in fullScreenCover")
                    }
            }
        }
        .onChange(of: showingDashboard) { showing in
            print("🚀🚀🚀 FULLSCREEN COVER STATE CHANGED - showingDashboard: \(showing)")
            if showing {
                print("🚀🚀🚀 About to present dashboard for: \(selectedEvent?.name ?? "nil")")
            }
        }
        .task {
            await supabaseService.fetchEvents()
        }
        .refreshable {
            await supabaseService.fetchEvents()
        }
    }
}

// MARK: - Supporting Views

struct LoadingView: View {
    var body: some View {
        VStack(spacing: 24) {
            ProgressView()
                .scaleEffect(1.2)
                .progressViewStyle(CircularProgressViewStyle(tint: .ticketFloOrange))

            VStack(spacing: 8) {
                Text("Loading Events")
                    .font(.headline)
                    .fontWeight(.medium)
                Text("Fetching your events...")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground).opacity(0.3))
    }
}

struct EmptyEventsView: View {
    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 16) {
                Circle()
                    .fill(Color.ticketFloOrange.opacity(0.1))
                    .frame(width: 80, height: 80)
                    .overlay(
                        Image(systemName: "calendar.badge.plus")
                            .font(.system(size: 32))
                            .foregroundColor(.ticketFloOrange)
                    )

                VStack(spacing: 8) {
                    Text("No Events Yet")
                        .font(.title2)
                        .fontWeight(.semibold)
                    Text("Create your first event in the web dashboard to get started with ticket management")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }

            Button("Open Web Dashboard") {
                if let url = URL(string: "https://ticketflo.org") {
                    UIApplication.shared.open(url)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(.ticketFloOrange)
        }
        .padding(.horizontal, 32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground).opacity(0.3))
    }
}

struct ErrorView: View {
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
            .tint(.ticketFloOrange)
        }
        .padding(.horizontal, 32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground).opacity(0.3))
    }
}

struct EventListView: View {
    let events: [SupabaseEvent]
    @Binding var selectedEvent: SupabaseEvent?
    @Binding var showingDashboard: Bool
    let geometry: GeometryProxy

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(events) { event in
                    ModernEventCard(event: event) {
                        print("🔥 Event tapped: \(event.name) (ID: \(event.id))")
                        selectedEvent = event
                        print("🔥 selectedEvent set to: \(selectedEvent?.name ?? "nil")")
                        showingDashboard = true
                        print("🔥 showingDashboard set to: \(showingDashboard)")
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
        }
        .background(Color(.systemGroupedBackground).opacity(0.3))
    }
}

struct ModernEventCard: View {
    let event: SupabaseEvent
    let onTap: () -> Void
    @State private var isPressed = false

    private var eventDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"

        if let date = formatter.date(from: event.event_date) {
            let now = Date()
            let calendar = Calendar.current

            if calendar.isDate(date, inSameDayAs: now) {
                formatter.dateFormat = "'Today at' h:mm a"
            } else if calendar.isDate(date, inSameDayAs: calendar.date(byAdding: .day, value: 1, to: now) ?? now) {
                formatter.dateFormat = "'Tomorrow at' h:mm a"
            } else if date.timeIntervalSince(now) < 7 * 24 * 60 * 60 {
                formatter.dateFormat = "EEEE 'at' h:mm a"
            } else {
                formatter.dateFormat = "MMM d 'at' h:mm a"
            }
            return formatter.string(from: date)
        }
        return event.event_date
    }

    private var statusInfo: (color: Color, text: String) {
        switch event.status.lowercased() {
        case "active", "published":
            return (.green, "Live")
        case "draft":
            return (.orange, "Draft")
        case "cancelled":
            return (.red, "Cancelled")
        default:
            return (.secondary, event.status.capitalized)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header with gradient
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.ticketFloOrange.opacity(0.8),
                        Color.ticketFloOrange.opacity(0.6)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(event.name)
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .multilineTextAlignment(.leading)

                            if let venue = event.venue, !venue.isEmpty {
                                Text(venue)
                                    .font(.subheadline)
                                    .foregroundColor(.white.opacity(0.9))
                            }
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 4) {
                            Text(statusInfo.text)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.white.opacity(0.2))
                                .foregroundColor(.white)
                                .cornerRadius(8)

                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.8))
                        }
                    }
                }
                .padding(16)
            }
            .frame(height: 80)

            // Content
            VStack(spacing: 12) {
                if let description = event.description, !description.isEmpty {
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                VStack(spacing: 8) {
                    HStack {
                        Label(eventDate, systemImage: "calendar")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                    }

                    HStack {
                        Label("\(event.capacity) capacity", systemImage: "person.2")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Spacer()

                        Text("Tap to manage")
                            .font(.caption)
                            .foregroundColor(.ticketFloOrange)
                            .fontWeight(.medium)
                    }
                }
            }
            .padding(16)
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(
            color: isPressed ? .clear : .black.opacity(0.1),
            radius: isPressed ? 0 : 8,
            x: 0,
            y: isPressed ? 0 : 4
        )
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: isPressed)
        .onTapGesture {
            print("🔥🔥🔥 EVENT CARD TAPPED: \(event.name) (ID: \(event.id))")
            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
            impactFeedback.impactOccurred()
            onTap()
        }
        .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
            print("🔥 Pressing state changed: \(pressing)")
            isPressed = pressing
        }, perform: {})
    }
}

#Preview {
    EventSelectionView()
        .environmentObject(AuthService())
}