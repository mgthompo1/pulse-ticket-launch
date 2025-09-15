import SwiftUI

// MARK: - Sidebar Components
enum SidebarTab: String, CaseIterable, Identifiable {
    case checkin = "Check-in"
    case pointOfSale = "Point of Sale"
    case guestStatus = "Guest Status"
    case manageItems = "Manage Items"
    case lanyardConfig = "Lanyard Config"
    case analytics = "Analytics"

    var id: String { rawValue }

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

    var color: Color {
        switch self {
        case .checkin: return .blue
        case .pointOfSale: return .green
        case .guestStatus: return .purple
        case .manageItems: return .orange
        case .lanyardConfig: return .pink
        case .analytics: return .indigo
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
                        .transition(.opacity)

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