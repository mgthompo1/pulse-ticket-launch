import Foundation
import Combine
import StripeTerminal

// MARK: - Stripe Terminal Service
// This service handles Tap to Pay on iPhone functionality using Stripe Terminal SDK
@available(iOS 16.0, *)
class StripeTerminalService: NSObject, ObservableObject, DiscoveryDelegate, TapToPayReaderDelegate {

    // MARK: - Published Properties
    static let shared = StripeTerminalService()

    @Published var isInitialized = false
    @Published var isPaymentInProgress = false
    @Published var lastPaymentResult: PaymentResult?
    @Published var currentStatus: String = ""
    @Published var error: String?

    // MARK: - Private Properties
    private var reader: Reader?
    private var cancelable: Cancelable?
    private var paymentIntentClientSecret: String?
    private var currentLocationId: String?
    private var connectionPromise: ((Result<Void, Error>) -> Void)?
    private var cachedLocationId: String? // Cache location to skip reconnection

    // Merchant display name for Apple TOS and payment prompts (set during initialization)
    private var merchantDisplayName: String = "TicketFlo"

    // Connected Stripe account ID for Stripe Connect (optional)
    private var connectedAccountId: String?

    // Supabase configuration - from SupabaseService
    private let supabaseURL = "https://yoxsewbpoqxscsutqlcb.supabase.co"
    private let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k"

    private override init() {
        super.init()
        print("🔵 StripeTerminalService initialized")
    }

    // MARK: - Configuration
    /// Configure merchant details for Apple TOS and payment display
    /// Call this before processing payments to set the merchant name and Stripe Connect account
    func configure(merchantName: String, stripeConnectAccountId: String? = nil) {
        self.merchantDisplayName = merchantName
        self.connectedAccountId = stripeConnectAccountId
        print("🔵 Configured merchant: \(merchantName)")
        if let accountId = stripeConnectAccountId {
            print("🔗 Stripe Connect account: \(accountId)")
        }
    }

    // MARK: - Initialization
    /// Initialize Stripe Terminal SDK
    func initialize(organizationId: String) -> AnyPublisher<Bool, Error> {
        print("🔵 Initializing Stripe Terminal SDK...")

        return Future<Bool, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(TapToPayError.notInitialized))
                return
            }

            // Create token provider
            let tokenProvider = StripeConnectionTokenProvider(
                supabaseURL: self.supabaseURL,
                supabaseAnonKey: self.supabaseKey,
                organizationId: organizationId
            )

            // Set token provider for Terminal SDK
            Terminal.setTokenProvider(tokenProvider)

            // Initialize Terminal if needed - must update on main thread
            DispatchQueue.main.async {
                if Terminal.hasTokenProvider() {
                    print("✅ Stripe Terminal token provider set")
                    self.isInitialized = true
                    promise(.success(true))
                } else {
                    print("❌ Failed to set Stripe Terminal token provider")
                    promise(.failure(TapToPayError.notInitialized))
                }
            }
        }
        .receive(on: DispatchQueue.main)
        .eraseToAnyPublisher()
    }

    // MARK: - Reader Discovery & Connection
    /// Discover and connect to Tap to Pay on iPhone reader (optimized with caching)
    private func discoverAndConnectTapToPayReader(locationId: String) -> AnyPublisher<Void, Error> {
        return Future<Void, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(TapToPayError.notInitialized))
                return
            }

            // Check if already connected to a reader with the same location - FAST PATH
            if let connectedReader = Terminal.shared.connectedReader,
               self.cachedLocationId == locationId {
                print("✅ Reader already connected (cached): \(connectedReader.label ?? "iPhone")")
                promise(.success(()))
                return
            }

            // If connected but different location, cache the new location
            if Terminal.shared.connectedReader != nil {
                print("✅ Reader connected, updating location cache")
                self.cachedLocationId = locationId
                promise(.success(()))
                return
            }

            print("🔵 Discovering Tap to Pay reader...")

            // Store locationId for use when connecting
            self.currentLocationId = locationId

            // Create discovery configuration for Tap to Pay on iPhone using Builder pattern
            do {
                let discoveryConfig = try TapToPayDiscoveryConfigurationBuilder()
                    .setSimulated(false)
                    .build()

                // Store the promise to complete when connection finishes
                self.connectionPromise = { result in
                    switch result {
                    case .success:
                        promise(.success(()))
                    case .failure(let error):
                        promise(.failure(error))
                    }
                }

                // Reduced timeout to 5 seconds for faster failure detection
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
                    if let connectionPromise = self?.connectionPromise {
                        print("⚠️ Reader connection timeout after 5 seconds")
                        connectionPromise(.failure(TapToPayError.deviceNotSupported))
                        self?.connectionPromise = nil
                    }
                }

                // Start discovery
                self.cancelable = Terminal.shared.discoverReaders(discoveryConfig, delegate: self) { [weak self] error in
                    if let error = error {
                        print("❌ Tap to Pay discovery failed: \(error.localizedDescription)")
                        self?.connectionPromise = nil
                        promise(.failure(error))
                    }
                }
            } catch {
                print("❌ Failed to create discovery configuration: \(error.localizedDescription)")
                promise(.failure(error))
            }
        }.eraseToAnyPublisher()
    }

    // MARK: - DiscoveryDelegate
    func terminal(_ terminal: Terminal, didUpdateDiscoveredReaders readers: [Reader]) {
        print("🔵 Discovered \(readers.count) reader(s)")

        // Auto-connect to the Tap to Pay reader
        guard let reader = readers.first else {
            print("❌ No Tap to Pay readers found")
            return
        }

        print("🔵 Connecting to Tap to Pay reader: \(reader.label ?? "iPhone")")

        guard let locationId = currentLocationId else {
            print("❌ No location ID available for connection")
            currentStatus = "Connection failed: No location"
            return
        }

        do {
            // Create connection configuration with self as delegate
            // Include TOS acceptance and merchant display name for Apple compliance
            var configBuilder = try TapToPayConnectionConfigurationBuilder(delegate: self, locationId: locationId)
                .setMerchantDisplayName(merchantDisplayName)
                .setTosAcceptancePermitted(true) // Allow Apple TOS to be presented on first connection

            // Add connected account ID for Stripe Connect if available
            if let accountId = connectedAccountId {
                configBuilder = try configBuilder.setOnBehalfOf(accountId)
            }

            let connectionConfig = try configBuilder.build()

            Terminal.shared.connectReader(reader, connectionConfig: connectionConfig) { [weak self] connectedReader, error in
                if let error = error {
                    print("❌ Failed to connect Tap to Pay reader: \(error.localizedDescription)")
                    DispatchQueue.main.async {
                        self?.currentStatus = "Connection failed"
                    }
                    self?.connectionPromise?(.failure(error))
                    self?.connectionPromise = nil
                } else if let connectedReader = connectedReader {
                    print("✅ Connected to Tap to Pay reader: \(connectedReader.label ?? "iPhone")")
                    self?.reader = connectedReader
                    self?.cachedLocationId = locationId
                    DispatchQueue.main.async {
                        self?.currentStatus = "Reader ready"
                    }
                    self?.connectionPromise?(.success(()))
                    self?.connectionPromise = nil
                }
            }
        } catch {
            print("❌ Failed to create connection configuration: \(error.localizedDescription)")
            currentStatus = "Connection failed"
        }
    }

    // MARK: - TapToPayReaderDelegate
    func tapToPayReader(_ reader: Reader, didStartInstallingUpdate update: ReaderSoftwareUpdate, cancelable: Cancelable?) {
        print("🔵 Tap to Pay reader started installing update")
        DispatchQueue.main.async {
            self.currentStatus = "Updating reader..."
        }
    }

    func tapToPayReader(_ reader: Reader, didReportReaderSoftwareUpdateProgress progress: Float) {
        let progressPercent = Int(progress * 100)
        print("🔵 Tap to Pay reader update progress: \(progressPercent)%")
        DispatchQueue.main.async {
            self.currentStatus = "Updating reader: \(progressPercent)%"
        }
    }

    func tapToPayReader(_ reader: Reader, didFinishInstallingUpdate update: ReaderSoftwareUpdate?, error: Error?) {
        if let error = error {
            print("❌ Tap to Pay reader update failed: \(error.localizedDescription)")
            DispatchQueue.main.async {
                self.currentStatus = "Update failed"
            }
        } else {
            print("✅ Tap to Pay reader update completed successfully")
            DispatchQueue.main.async {
                self.currentStatus = "Update completed"
            }
        }
    }

    func tapToPayReader(_ reader: Reader, didRequestReaderInput inputOptions: ReaderInputOptions) {
        print("🔵 Reader requesting input: \(inputOptions)")
        DispatchQueue.main.async {
            self.currentStatus = "Waiting for input..."
        }
    }

    func tapToPayReader(_ reader: Reader, didRequestReaderDisplayMessage displayMessage: ReaderDisplayMessage) {
        print("🔵 Reader display message: \(displayMessage)")
        DispatchQueue.main.async {
            self.currentStatus = "Ready for payment"
        }
    }

    // MARK: - Payment Processing
    /// Process a payment using Tap to Pay on iPhone
    func processPayment(
        amount: Int,
        currency: String,
        description: String,
        locationId: String,
        organizationId: String
    ) -> AnyPublisher<PaymentResult, Error> {

        print("🔵 Processing Tap to Pay payment:")
        print("  - Amount: \(amount) cents")
        print("  - Currency: \(currency)")
        print("  - Description: \(description)")
        print("  - Location: \(locationId)")

        // Check if device supports Tap to Pay
        guard DeviceCapabilities.supportsTapToPay else {
            return Fail(error: TapToPayError.deviceNotSupported)
                .eraseToAnyPublisher()
        }

        // Check if initialized
        guard isInitialized else {
            return Fail(error: TapToPayError.notInitialized)
                .eraseToAnyPublisher()
        }

        DispatchQueue.main.async {
            self.isPaymentInProgress = true
            self.currentStatus = "Preparing reader..."
        }

        // Step 1: Discover and connect to Tap to Pay reader (iPhone itself)
        return discoverAndConnectTapToPayReader(locationId: locationId)
            .flatMap { [weak self] _ -> AnyPublisher<String, Error> in
                guard let self = self else {
                    return Fail(error: TapToPayError.notInitialized).eraseToAnyPublisher()
                }

                print("✅ Reader connected, creating payment intent...")
                DispatchQueue.main.async {
                    self.currentStatus = "Creating payment intent..."
                }

                // Step 2: Create PaymentIntent on backend
                return self.createPaymentIntent(amount: amount, currency: currency, description: description, organizationId: organizationId)
            }
            .flatMap { [weak self] clientSecret -> AnyPublisher<PaymentIntent, Error> in
                guard let self = self else {
                    return Fail(error: TapToPayError.notInitialized).eraseToAnyPublisher()
                }

                print("✅ Payment intent created, retrieving payment intent...")
                DispatchQueue.main.async {
                    self.currentStatus = "Preparing payment..."
                }
                self.paymentIntentClientSecret = clientSecret

                // Step 3: Retrieve PaymentIntent object from client secret
                return self.retrievePaymentIntent(clientSecret: clientSecret)
            }
            .flatMap { [weak self] paymentIntent -> AnyPublisher<PaymentIntent, Error> in
                guard let self = self else {
                    return Fail(error: TapToPayError.notInitialized).eraseToAnyPublisher()
                }

                print("✅ Payment intent retrieved, collecting payment...")
                DispatchQueue.main.async {
                    self.currentStatus = "Waiting for card..."
                }

                // Step 4: Collect payment method (reader connection is automatic for Tap to Pay)
                return self.collectPaymentMethod(paymentIntent: paymentIntent)
            }
            .flatMap { [weak self] paymentIntent -> AnyPublisher<PaymentIntent, Error> in
                guard let self = self else {
                    return Fail(error: TapToPayError.notInitialized).eraseToAnyPublisher()
                }

                print("✅ Payment method collected, processing...")
                DispatchQueue.main.async {
                    self.currentStatus = "Processing payment..."
                }

                // Step 5: Process payment
                return self.processPaymentIntent(paymentIntent: paymentIntent)
            }
            .flatMap { [weak self] paymentIntent -> AnyPublisher<PaymentIntent, Error> in
                guard let self = self else {
                    return Fail(error: TapToPayError.notInitialized).eraseToAnyPublisher()
                }

                print("✅ Payment processed, confirming...")
                DispatchQueue.main.async {
                    self.currentStatus = "Confirming payment..."
                }

                // Step 6: Confirm payment (capture)
                return self.capturePaymentIntent(paymentIntent: paymentIntent)
            }
            .map { [weak self] paymentIntent -> PaymentResult in
                print("✅ Payment completed successfully!")
                DispatchQueue.main.async {
                    self?.isPaymentInProgress = false
                    self?.currentStatus = ""
                }

                return PaymentResult(
                    success: true,
                    paymentIntentId: paymentIntent.stripeId ?? "",
                    amount: Int(paymentIntent.amount),
                    currency: paymentIntent.currency,
                    status: String(describing: paymentIntent.status),
                    errorMessage: nil
                )
            }
            .catch { [weak self] error -> AnyPublisher<PaymentResult, Error> in
                print("❌ Payment failed: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self?.isPaymentInProgress = false
                    self?.currentStatus = ""
                }

                return Fail(error: error).eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }

    /// Create PaymentIntent on backend using Terminal-specific endpoint with Stripe Connect support
    private func createPaymentIntent(amount: Int, currency: String, description: String, organizationId: String) -> AnyPublisher<String, Error> {
        return Future<String, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(TapToPayError.notInitialized))
                return
            }

            // Use the terminal-specific endpoint that handles Stripe Connect and platform fees
            let url = URL(string: "\(self.supabaseURL)/functions/v1/create-terminal-payment-intent")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue(self.supabaseKey, forHTTPHeaderField: "apikey")

            let body: [String: Any] = [
                "amount": amount,
                "currency": currency,
                "description": description,
                "organization_id": organizationId,
                "metadata": [
                    "source": "ticketflo_ios_tap_to_pay",
                    "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
                ]
            ]

            request.httpBody = try? JSONSerialization.data(withJSONObject: body)

            let task = URLSession.shared.dataTask(with: request) { data, response, error in
                if let error = error {
                    promise(.failure(error))
                    return
                }

                guard let data = data else {
                    promise(.failure(TapToPayError.paymentFailed("No data received")))
                    return
                }

                // Log the raw response for debugging
                if let responseString = String(data: data, encoding: .utf8) {
                    print("📥 Payment intent response: \(responseString)")
                }

                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        // Check for error response
                        if let error = json["error"] as? String {
                            print("❌ Edge function error: \(error)")
                            promise(.failure(TapToPayError.paymentFailed(error)))
                            return
                        }

                        // Check for success response
                        if let clientSecret = json["client_secret"] as? String {
                            print("✅ Got client secret: \(clientSecret.prefix(20))...")

                            // Log Connect mode info if available
                            if let mode = json["mode"] as? String {
                                print("💳 Payment mode: \(mode)")
                            }
                            if let platformFee = json["platform_fee"] as? Int, platformFee > 0 {
                                print("💰 Platform fee: \(platformFee) cents")
                            }

                            promise(.success(clientSecret))
                        } else {
                            print("❌ Response JSON: \(json)")
                            promise(.failure(TapToPayError.paymentFailed("Invalid response: missing client_secret")))
                        }
                    } else {
                        promise(.failure(TapToPayError.paymentFailed("Invalid JSON response")))
                    }
                } catch {
                    print("❌ JSON parsing error: \(error)")
                    promise(.failure(error))
                }
            }

            task.resume()
        }.eraseToAnyPublisher()
    }

    /// Retrieve PaymentIntent from client secret
    private func retrievePaymentIntent(clientSecret: String) -> AnyPublisher<PaymentIntent, Error> {
        return Future<PaymentIntent, Error> { promise in
            Terminal.shared.retrievePaymentIntent(clientSecret: clientSecret) { paymentIntent, error in
                if let error = error {
                    promise(.failure(error))
                    return
                }

                guard let paymentIntent = paymentIntent else {
                    promise(.failure(TapToPayError.paymentFailed("No payment intent returned")))
                    return
                }

                promise(.success(paymentIntent))
            }
        }.eraseToAnyPublisher()
    }

    /// Collect payment method from card
    private func collectPaymentMethod(paymentIntent: PaymentIntent) -> AnyPublisher<PaymentIntent, Error> {
        return Future<PaymentIntent, Error> { promise in
            Terminal.shared.collectPaymentMethod(paymentIntent) { collectedIntent, error in
                if let error = error {
                    promise(.failure(error))
                    return
                }

                guard let collectedIntent = collectedIntent else {
                    promise(.failure(TapToPayError.paymentFailed("No payment intent returned")))
                    return
                }

                promise(.success(collectedIntent))
            }
        }.eraseToAnyPublisher()
    }

    /// Process the payment
    private func processPaymentIntent(paymentIntent: PaymentIntent) -> AnyPublisher<PaymentIntent, Error> {
        return Future<PaymentIntent, Error> { promise in
            Terminal.shared.confirmPaymentIntent(paymentIntent) { processedIntent, error in
                if let error = error {
                    promise(.failure(error))
                    return
                }

                guard let processedIntent = processedIntent else {
                    promise(.failure(TapToPayError.paymentFailed("No processed intent returned")))
                    return
                }

                promise(.success(processedIntent))
            }
        }.eraseToAnyPublisher()
    }

    /// Capture the payment (for manual capture)
    private func capturePaymentIntent(paymentIntent: PaymentIntent) -> AnyPublisher<PaymentIntent, Error> {
        return Future<PaymentIntent, Error> { promise in
            // For Terminal SDK, the payment is automatically confirmed after processing
            // Just return the intent as-is
            promise(.success(paymentIntent))
        }.eraseToAnyPublisher()
    }

    // MARK: - Cancel Payment
    /// Cancel an in-progress payment
    func cancelPayment() {
        print("🔵 Cancelling Tap to Pay payment...")

        // Cancel any ongoing reader discovery
        if let cancelable = cancelable {
            cancelable.cancel { error in
                if let error = error {
                    print("❌ Failed to cancel discovery: \(error.localizedDescription)")
                } else {
                    print("✅ Discovery cancelled")
                }
            }
        }

        isPaymentInProgress = false
        currentStatus = ""
    }

    // MARK: - Device Support Check
    var supportsTapToPay: Bool {
        return DeviceCapabilities.supportsTapToPay
    }
}

// MARK: - Supporting Models
struct PaymentResult: Codable {
    let success: Bool
    let paymentIntentId: String
    let amount: Int
    let currency: String
    let status: String
    let errorMessage: String?

    init(success: Bool, paymentIntentId: String, amount: Int, currency: String, status: String, errorMessage: String? = nil) {
        self.success = success
        self.paymentIntentId = paymentIntentId
        self.amount = amount
        self.currency = currency
        self.status = status
        self.errorMessage = errorMessage
    }
}

// MARK: - Errors
enum TapToPayError: LocalizedError {
    case deviceNotSupported
    case notInitialized
    case locationNotSet
    case paymentFailed(String)
    case cancelled

    var errorDescription: String? {
        switch self {
        case .deviceNotSupported:
            return "This device doesn't support Tap to Pay on iPhone. Requires iPhone XS or later with iOS 16.0+"
        case .notInitialized:
            return "Stripe Terminal SDK not initialized"
        case .locationNotSet:
            return "Stripe Terminal location not configured"
        case .paymentFailed(let message):
            return "Payment failed: \(message)"
        case .cancelled:
            return "Payment cancelled"
        }
    }
}