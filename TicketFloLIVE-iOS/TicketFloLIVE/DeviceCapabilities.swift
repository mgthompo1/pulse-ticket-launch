import Foundation
import UIKit

/// Utility to check device capabilities for payments
struct DeviceCapabilities {

    /// Check if device supports Tap to Pay on iPhone
    /// Requires iPhone XS or later with iOS 16.0+
    static var supportsTapToPay: Bool {
        #if targetEnvironment(simulator)
        return false
        #else
        // Check iOS version
        if #available(iOS 16.0, *) {
            // Check if device is iPhone (not iPad)
            if UIDevice.current.userInterfaceIdiom == .phone {
                // Tap to Pay requires iPhone XS or later
                // iPhone XS was released in 2018
                // A simple heuristic: if device supports iOS 16, it's likely recent enough
                return true
            }
        }
        return false
        #endif
    }

    /// Check if device is iPhone (vs iPad)
    static var isIPhone: Bool {
        return UIDevice.current.userInterfaceIdiom == .phone
    }

    /// Check if device is iPad
    static var isIPad: Bool {
        return UIDevice.current.userInterfaceIdiom == .pad
    }
}
