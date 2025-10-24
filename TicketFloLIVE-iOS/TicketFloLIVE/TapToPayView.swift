import SwiftUI
import Combine

struct TapToPayView: View {
    @ObservedObject private var stripeService = StripeTerminalService.shared
    @State private var amount: String = ""
    @State private var showingPaymentFlow = false
    @State private var paymentResult: PaymentResult?
    @Environment(\.dismiss) private var dismiss
    @State private var cancellables = Set<AnyCancellable>()

    let items: [TapToPayCartItem]
    let totalAmount: Int
    let organizationId: String
    let locationId: String

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "iphone.and.arrow.forward")
                        .font(.system(size: 48))
                        .foregroundColor(.ticketFloOrange)

                    Text("Tap to Pay on iPhone")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Accept contactless payments")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top)

                // Order Summary
                VStack(alignment: .leading, spacing: 16) {
                    Text("Order Summary")
                        .font(.headline)
                        .fontWeight(.semibold)

                    ForEach(items, id: \.id) { item in
                        HStack {
                            Text(item.name)
                            Spacer()
                            Text("$\(String(format: "%.2f", Double(item.price) / 100))")
                                .fontWeight(.medium)
                        }
                    }

                    Divider()

                    HStack {
                        Text("Total")
                            .font(.headline)
                            .fontWeight(.bold)
                        Spacer()
                        Text("$\(String(format: "%.2f", Double(totalAmount) / 100))")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.ticketFloOrange)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)

                // Device Support Status
                VStack(spacing: 12) {
                    HStack(spacing: 8) {
                        Image(systemName: stripeService.supportsTapToPay ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                            .foregroundColor(stripeService.supportsTapToPay ? .green : .orange)

                        Text(stripeService.supportsTapToPay ? "Device supports Tap to Pay" : "Tap to Pay not available on this device")
                            .font(.caption)
                            .foregroundColor(stripeService.supportsTapToPay ? .green : .orange)
                    }

                    if !stripeService.supportsTapToPay {
                        Text("Tap to Pay requires iPhone XS or later with iOS 15.4+")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                }

                Spacer()

                // Payment Buttons
                VStack(spacing: 16) {
                    if stripeService.supportsTapToPay {
                        Button(action: startPayment) {
                            HStack {
                                if stripeService.isPaymentInProgress {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "wave.3.right")
                                    Text("Start Tap to Pay")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(Color.ticketFloOrange)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(stripeService.isPaymentInProgress || totalAmount <= 0)
                    } else {
                        Text("Use physical iPhone device for Tap to Pay testing")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }

                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.secondary)
                }
                .padding(.bottom)
            }
            .padding(.horizontal, 20)
            .navigationTitle("Payment")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
        }
        .sheet(isPresented: $showingPaymentFlow) {
            PaymentProcessingView(
                amount: totalAmount,
                onComplete: handlePaymentResult,
                organizationId: organizationId,
                locationId: locationId
            )
        }
        .alert("Payment Result", isPresented: .constant(paymentResult != nil)) {
            Button("OK") {
                if paymentResult?.success == true {
                    dismiss()
                }
                paymentResult = nil
            }
        } message: {
            if let result = paymentResult {
                Text(result.success ? "Payment successful!" : "Payment failed: \(result.errorMessage ?? "Unknown error")")
            }
        }
        .onAppear {
            if !stripeService.isInitialized {
                stripeService.initialize(organizationId: organizationId)
                    .sink(
                        receiveCompletion: { completion in
                            if case .failure(let error) = completion {
                                print("❌ Failed to initialize Stripe Terminal: \(error)")
                            }
                        },
                        receiveValue: { success in
                            print("✅ Stripe Terminal initialized: \(success)")
                        }
                    )
                    .store(in: &cancellables)
            }
        }
    }

    private func startPayment() {
        showingPaymentFlow = true
    }

    private func handlePaymentResult(_ result: PaymentResult) {
        paymentResult = result
        showingPaymentFlow = false
    }
}

// MARK: - Payment Processing View
struct PaymentProcessingView: View {
    let amount: Int
    let onComplete: (PaymentResult) -> Void

    @ObservedObject private var stripeService = StripeTerminalService.shared
    @State private var processingStage = "Initializing..."
    @State private var cancellables = Set<AnyCancellable>()
    @Environment(\.dismiss) private var dismiss

    let organizationId: String
    let locationId: String

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Animation
            VStack(spacing: 24) {
                ZStack {
                    Circle()
                        .stroke(Color.ticketFloOrange.opacity(0.3), lineWidth: 4)
                        .frame(width: 120, height: 120)

                    Circle()
                        .trim(from: 0, to: 0.7)
                        .stroke(Color.ticketFloOrange, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                        .frame(width: 120, height: 120)
                        .rotationEffect(.degrees(-90))
                        .animation(.linear(duration: 2).repeatForever(autoreverses: false), value: processingStage)

                    Image(systemName: "wave.3.right")
                        .font(.system(size: 36))
                        .foregroundColor(.ticketFloOrange)
                }

                VStack(spacing: 8) {
                    Text("Tap to Pay")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text(processingStage)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }

            // Amount
            Text("$\(String(format: "%.2f", Double(amount) / 100))")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.ticketFloOrange)

            // Instructions
            Text("Hold the customer's contactless card or device near the top of your iPhone")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal, 32)

            Spacer()

            // Cancel Button
            Button("Cancel Payment") {
                stripeService.cancelPayment()
                dismiss()
            }
            .foregroundColor(.red)
            .padding(.bottom, 32)
        }
        .padding(.horizontal, 20)
        .onAppear {
            processPayment()
        }
    }

    private func processPayment() {
        processingStage = "Ready for payment..."

        // Wait a moment before starting
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            self.processingStage = "Waiting for card..."

            // Start the payment
            self.stripeService.processPayment(
                amount: self.amount,
                currency: "usd",
                description: "TicketFlo Purchase",
                locationId: self.locationId,
                organizationId: self.organizationId
            )
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        print("❌ Payment failed: \(error)")
                        let result = PaymentResult(
                            success: false,
                            paymentIntentId: "",
                            amount: self.amount,
                            currency: "usd",
                            status: "failed",
                            errorMessage: error.localizedDescription
                        )
                        self.onComplete(result)
                    }
                },
                receiveValue: { result in
                    print("✅ Payment successful: \(result)")
                    self.onComplete(result)
                }
            )
            .store(in: &self.cancellables)
        }
    }
}

// MARK: - Cart Item Model
struct TapToPayCartItem: Identifiable {
    let id = UUID()
    let name: String
    let price: Int // in cents
    let quantity: Int
}

// MARK: - Preview
#Preview {
    TapToPayView(
        items: [
            TapToPayCartItem(name: "Event Ticket", price: 2500, quantity: 1),
            TapToPayCartItem(name: "T-Shirt", price: 1500, quantity: 1)
        ],
        totalAmount: 4000,
        organizationId: "preview-org-id",
        locationId: "preview-location-id"
    )
}