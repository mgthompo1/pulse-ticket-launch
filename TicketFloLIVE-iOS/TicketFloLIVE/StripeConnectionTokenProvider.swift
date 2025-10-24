import Foundation
import StripeTerminal

/// Provides connection tokens for Stripe Terminal SDK
/// Fetches tokens from the backend Supabase edge function
class StripeConnectionTokenProvider: NSObject, ConnectionTokenProvider {

    private let supabaseURL: String
    private let supabaseAnonKey: String
    private let organizationId: String

    init(supabaseURL: String, supabaseAnonKey: String, organizationId: String) {
        self.supabaseURL = supabaseURL
        self.supabaseAnonKey = supabaseAnonKey
        self.organizationId = organizationId
        super.init()
    }

    /// Fetch connection token from backend
    func fetchConnectionToken(_ completion: @escaping ConnectionTokenCompletionBlock) {
        // For iOS app, we'll use service role access or pass auth through the request
        // In production, you should use authenticated user sessions

        let url = URL(string: "\(supabaseURL)/functions/v1/stripe-connection-token")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")

        // Add organization_id to request body
        let body: [String: Any] = ["organization_id": organizationId]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ Connection token fetch error: \(error.localizedDescription)")
                completion(nil, error)
                return
            }

            guard let data = data else {
                print("❌ No data received from connection token endpoint")
                completion(nil, NSError(domain: "StripeConnectionToken", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"]))
                return
            }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let secret = json["secret"] as? String {
                    print("✅ Connection token fetched successfully")
                    completion(secret, nil)
                } else {
                    print("❌ Invalid response format from connection token endpoint")
                    if let responseString = String(data: data, encoding: .utf8) {
                        print("Response: \(responseString)")
                    }
                    completion(nil, NSError(domain: "StripeConnectionToken", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid response format"]))
                }
            } catch {
                print("❌ JSON parsing error: \(error.localizedDescription)")
                completion(nil, error)
            }
        }

        task.resume()
    }
}
