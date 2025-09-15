import SwiftUI

// MARK: - Models
struct Event: Identifiable {
    let id = UUID()
    let name: String
    let date: String
    let location: String
    let status: String
}

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

// MARK: - Point of Sale Models
struct Product: Identifiable {
    let id = UUID()
    let name: String
    let price: Double
    let stock: Int
}

struct CartItem: Identifiable {
    let id = UUID()
    let product: Product
    var quantity: Int
}

// MARK: - Auth Service
class AuthService: ObservableObject {
    @Published var isAuthenticated = false

    func signIn() {
        isAuthenticated = true
    }

    func signOut() {
        isAuthenticated = false
    }
}

// MARK: - Supporting Views
struct ProductCardModern: View {
    let product: Product
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                Rectangle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(height: 60)
                    .overlay(
                        Image(systemName: "bag.fill")
                            .font(.title2)
                            .foregroundColor(.blue)
                    )
                    .cornerRadius(8)

                VStack(spacing: 4) {
                    Text(product.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)

                    Text("$\(product.price, specifier: "%.2f")")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)

                    Text("Stock: \(product.stock)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(12)
            .background(Color(.systemGray6))
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct LanyardPreviewSimple: View {
    let template: String

    var body: some View {
        ZStack {
            // Background
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: template == "VIP" ? [.purple, .blue] :
                               template == "Premium" ? [.blue, .cyan] :
                               [.gray.opacity(0.3), .gray.opacity(0.1)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .cornerRadius(12)

            VStack(spacing: 12) {
                // Logo
                Image(systemName: "ticket.fill")
                    .font(.title)
                    .foregroundColor(.white)

                // Event info
                Text("TicketFlo Event")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                Text("Sample Guest")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))

                // QR Code
                Rectangle()
                    .fill(Color.white)
                    .frame(width: 60, height: 60)
                    .overlay(
                        Image(systemName: "qrcode")
                            .foregroundColor(.black)
                    )
                    .cornerRadius(8)
            }
        }
    }
}


// MARK: - Sample Data
let sampleEvents = [
    Event(name: "Summer Music Festival", date: "Sep 15, 2024", location: "Central Park", status: "Live"),
    Event(name: "Tech Conference 2024", date: "Sep 20, 2024", location: "Convention Center", status: "Upcoming"),
    Event(name: "Food & Wine Expo", date: "Sep 25, 2024", location: "Harbor View", status: "Upcoming"),
    Event(name: "Charity Gala", date: "Oct 1, 2024", location: "Grand Hotel", status: "Upcoming")
]

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
    Product(name: "Snack", price: 3.50, stock: 75),
    Product(name: "Program", price: 10.00, stock: 30),
    Product(name: "Lanyard", price: 8.00, stock: 20)
]