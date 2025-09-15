import SwiftUI

// MARK: - Stats Cards View
struct StatsCardsView: View {
    var body: some View {
        HStack(spacing: 16) {
            StatCardModern(
                title: "Total Guests",
                value: "150",
                icon: "person.3.fill",
                color: .blue
            )

            StatCardModern(
                title: "Checked In",
                value: "95",
                icon: "checkmark.circle.fill",
                color: .green
            )

            StatCardModern(
                title: "Lanyards Printed",
                value: "87",
                icon: "printer.fill",
                color: .purple
            )
        }
    }
}

struct StatCardModern: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)

                Spacer()

                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(color)
            }

            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.primary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// MARK: - Tab Content View
struct TabContentView: View {
    let selectedTab: SidebarTab
    @Binding var showingScanner: Bool

    var body: some View {
        VStack(spacing: 20) {
            switch selectedTab {
            case .checkin:
                CheckinTabContent(showingScanner: $showingScanner)
            case .pointOfSale:
                PointOfSaleTabContent()
            case .guestStatus:
                GuestStatusTabContent()
            case .manageItems:
                ManageItemsTabContent()
            case .lanyardConfig:
                LanyardConfigTabContent()
            case .analytics:
                AnalyticsTabContent()
            }
        }
    }
}

// MARK: - Modern Tab Content Views
struct CheckinTabContent: View {
    @Binding var showingScanner: Bool
    @State private var ticketCode = ""
    @State private var searchQuery = ""

    var body: some View {
        VStack(spacing: 20) {
            // Guest Check-In Card
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Guest Check-In")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Text("Search guests by email or scan ticket codes to check in")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                VStack(spacing: 16) {
                    // Search Section
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Search Guests")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        HStack {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(.secondary)
                            TextField("Search by name, email, or ticket code...", text: $searchQuery)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }

                    // Quick Scan Section
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Quick Scan/Check-In")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        HStack(spacing: 12) {
                            HStack {
                                Image(systemName: "qrcode")
                                    .foregroundColor(.secondary)
                                TextField("Scan or enter ticket code", text: $ticketCode)
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(8)

                            Button(action: { showingScanner = true }) {
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.caption)
                                    Text("Check In")
                                        .font(.caption)
                                        .fontWeight(.medium)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                            }
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            // Recent Check-ins Card
            VStack(alignment: .leading, spacing: 16) {
                Text("Recent Check-ins")
                    .font(.headline)
                    .fontWeight(.semibold)

                LazyVStack(spacing: 12) {
                    ForEach(sampleGuests.filter { $0.checkedIn }.prefix(5)) { guest in
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

                            VStack(alignment: .leading, spacing: 2) {
                                Text(guest.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text(guest.email)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                Text("✓ Checked In")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(.green)
                                Text("2 min ago")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 8)

                        if guest != sampleGuests.filter({ $0.checkedIn }).prefix(5).last {
                            Divider()
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            Spacer()
        }
    }
}

struct PointOfSaleTabContent: View {
    @State private var cartItems: [CartItem] = []
    @State private var showingPayment = false

    var body: some View {
        VStack(spacing: 20) {
            // Current Sale Card
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Current Sale")
                            .font(.headline)
                            .fontWeight(.semibold)
                        Text("Add items to cart and process payment")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Text("$\(cartTotal, specifier: "%.2f")")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }

                Button("Process Payment") {
                    showingPayment = true
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(cartItems.isEmpty ? Color.gray : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(8)
                .disabled(cartItems.isEmpty)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            // Products Card
            VStack(alignment: .leading, spacing: 16) {
                Text("Products")
                    .font(.headline)
                    .fontWeight(.semibold)

                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    ForEach(sampleProducts) { product in
                        ProductCardModern(product: product) {
                            addToCart(product)
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            Spacer()
        }
        .alert("Payment Processed", isPresented: $showingPayment) {
            Button("OK") {
                cartItems.removeAll()
            }
        } message: {
            Text("Sale completed successfully!")
        }
    }

    private var cartTotal: Double {
        cartItems.reduce(0) { $0 + ($1.product.price * Double($1.quantity)) }
    }

    private func addToCart(_ product: Product) {
        if let index = cartItems.firstIndex(where: { $0.product.id == product.id }) {
            cartItems[index].quantity += 1
        } else {
            cartItems.append(CartItem(product: product, quantity: 1))
        }
    }
}

struct GuestStatusTabContent: View {
    @State private var searchQuery = ""
    @State private var selectedFilter = "all"

    var body: some View {
        VStack(spacing: 20) {
            // Search and Filter Card
            VStack(alignment: .leading, spacing: 16) {
                Text("Guest Search & Filter")
                    .font(.headline)
                    .fontWeight(.semibold)

                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Search guests...", text: $searchQuery)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(8)

                HStack(spacing: 12) {
                    ForEach(["all", "checked-in", "pending"], id: \.self) { filter in
                        Button(filter.capitalized) {
                            selectedFilter = filter
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(selectedFilter == filter ? Color.blue : Color(.systemGray6))
                        .foregroundColor(selectedFilter == filter ? .white : .primary)
                        .cornerRadius(20)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            // Guest List Card
            VStack(alignment: .leading, spacing: 16) {
                Text("Guest List")
                    .font(.headline)
                    .fontWeight(.semibold)

                LazyVStack(spacing: 12) {
                    ForEach(sampleGuests) { guest in
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
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                Text(guest.checkedIn ? "✓ Checked In" : "⏳ Pending")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(guest.checkedIn ? .green : .orange)
                            }
                        }
                        .padding(.vertical, 8)

                        if guest != sampleGuests.last {
                            Divider()
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            Spacer()
        }
    }
}

struct ManageItemsTabContent: View {
    var body: some View {
        VStack(spacing: 20) {
            // Add Item Card
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Manage Items")
                        .font(.headline)
                        .fontWeight(.semibold)

                    Spacer()

                    Button("Add Item") {
                        // Add new item
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }

                Text("Manage your concession items and inventory")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            // Items List Card
            VStack(alignment: .leading, spacing: 16) {
                Text("Current Items")
                    .font(.headline)
                    .fontWeight(.semibold)

                LazyVStack(spacing: 12) {
                    ForEach(sampleProducts) { product in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(product.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text("$\(product.price, specifier: "%.2f")")
                                    .font(.caption)
                                    .foregroundColor(.green)
                                Text("Stock: \(product.stock)")
                                    .font(.caption)
                                    .foregroundColor(product.stock > 10 ? .blue : .red)
                            }

                            Spacer()

                            Button("Edit") {
                                // Edit product
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color(.systemGray6))
                            .cornerRadius(6)
                        }
                        .padding(.vertical, 8)

                        if product != sampleProducts.last {
                            Divider()
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            Spacer()
        }
    }
}

struct LanyardConfigTabContent: View {
    @State private var selectedTemplate = "Standard"

    var body: some View {
        VStack(spacing: 20) {
            // Configuration Card
            VStack(alignment: .leading, spacing: 16) {
                Text("Lanyard Configuration")
                    .font(.headline)
                    .fontWeight(.semibold)

                VStack(alignment: .leading, spacing: 12) {
                    Text("Template")
                        .font(.subheadline)
                        .fontWeight(.medium)

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
                }

                Button("Save Configuration") {
                    // Save config
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(8)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            // Preview Card
            VStack(alignment: .leading, spacing: 16) {
                Text("Preview")
                    .font(.headline)
                    .fontWeight(.semibold)

                LanyardPreviewSimple(template: selectedTemplate)
                    .frame(height: 200)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            Spacer()
        }
    }
}

struct AnalyticsTabContent: View {
    var body: some View {
        VStack(spacing: 20) {
            // Revenue Card
            VStack(alignment: .leading, spacing: 16) {
                Text("Revenue Analytics")
                    .font(.headline)
                    .fontWeight(.semibold)

                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Total Sales")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("$2,450")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Avg. Per Guest")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("$16.33")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                    }

                    Spacer()
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            // Check-in Progress Card
            VStack(alignment: .leading, spacing: 16) {
                Text("Check-in Progress")
                    .font(.headline)
                    .fontWeight(.semibold)

                VStack(spacing: 12) {
                    HStack {
                        Text("95 of 150 checked in")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("63%")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }

                    ProgressView(value: 0.63)
                        .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            // Top Items Card
            VStack(alignment: .leading, spacing: 16) {
                Text("Top Selling Items")
                    .font(.headline)
                    .fontWeight(.semibold)

                LazyVStack(spacing: 8) {
                    ForEach(sampleProducts.prefix(3)) { product in
                        HStack {
                            Text(product.name)
                                .font(.subheadline)
                            Spacer()
                            Text("$\(product.price * 5, specifier: "%.2f")")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.green)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            Spacer()
        }
    }
}