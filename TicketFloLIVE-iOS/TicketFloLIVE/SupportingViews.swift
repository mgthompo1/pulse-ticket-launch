import SwiftUI

// MARK: - Legacy Models (for backward compatibility with sample data)
// Note: Main models are in ContentView.swift and SupabaseService.swift

struct LegacyEvent: Identifiable {
    let id = UUID()
    let name: String
    let date: String
    let location: String
    let status: String
}

struct LegacyProduct: Identifiable {
    let id = UUID()
    let name: String
    let price: Double
    let stock: Int
}

struct LegacyCartItem: Identifiable {
    let id = UUID()
    let product: LegacyProduct
    var quantity: Int
}

// MARK: - Supporting Views
struct ProductCardModern: View {
    let product: LegacyProduct
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


// MARK: - Sample Data (Legacy - for testing only)
let legacySampleEvents = [
    LegacyEvent(name: "Summer Music Festival", date: "Sep 15, 2024", location: "Central Park", status: "Live"),
    LegacyEvent(name: "Tech Conference 2024", date: "Sep 20, 2024", location: "Convention Center", status: "Upcoming"),
    LegacyEvent(name: "Food & Wine Expo", date: "Sep 25, 2024", location: "Harbor View", status: "Upcoming"),
    LegacyEvent(name: "Charity Gala", date: "Oct 1, 2024", location: "Grand Hotel", status: "Upcoming")
]

let legacySampleProducts = [
    LegacyProduct(name: "T-Shirt", price: 25.00, stock: 50),
    LegacyProduct(name: "Poster", price: 15.00, stock: 25),
    LegacyProduct(name: "Drink", price: 5.00, stock: 100),
    LegacyProduct(name: "Snack", price: 3.50, stock: 75),
    LegacyProduct(name: "Program", price: 10.00, stock: 30),
    LegacyProduct(name: "Lanyard", price: 8.00, stock: 20)
]