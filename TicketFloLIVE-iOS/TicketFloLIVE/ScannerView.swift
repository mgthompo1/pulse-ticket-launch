import SwiftUI
import AVFoundation

struct ScannerView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var scanner = QRCodeScanner()
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var scannedCode: String?
    @State private var showingResult = false
    @State private var scanResult: ScanResult?
    @State private var isProcessing = false

    enum ScanResult {
        case success(String)
        case alreadyCheckedIn(String)
        case notFound
        case error(String)

        var title: String {
            switch self {
            case .success: return "Check-in Successful! ✅"
            case .alreadyCheckedIn: return "Already Checked In"
            case .notFound: return "Ticket Not Found"
            case .error: return "Error"
            }
        }

        var message: String {
            switch self {
            case .success(let name): return "\(name) has been checked in successfully"
            case .alreadyCheckedIn(let name): return "\(name) was already checked in"
            case .notFound: return "This ticket code was not found in the system"
            case .error(let message): return message
            }
        }

        var color: Color {
            switch self {
            case .success: return .green
            case .alreadyCheckedIn: return .orange
            case .notFound, .error: return .red
            }
        }

        var icon: String {
            switch self {
            case .success: return "checkmark.circle.fill"
            case .alreadyCheckedIn: return "exclamationmark.triangle.fill"
            case .notFound, .error: return "xmark.circle.fill"
            }
        }
    }

    var body: some View {
        NavigationView {
            ZStack {
                // Camera Preview
                QRCodeScannerView(scanner: scanner)
                    .ignoresSafeArea()
                    .onReceive(scanner.$scannedCode) { code in
                        if let code = code, !isProcessing {
                            handleScannedCode(code)
                        }
                    }

                // Overlay
                VStack {
                    // Header
                    HStack {
                        Button("Cancel") {
                            dismiss()
                        }
                        .foregroundColor(.white)
                        .fontWeight(.medium)

                        Spacer()

                        Text("Scan Ticket")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)

                        Spacer()

                        Button("Manual") {
                            // TODO: Add manual entry
                        }
                        .foregroundColor(.white)
                        .fontWeight(.medium)
                    }
                    .padding()
                    .background(Color.black.opacity(0.8))

                    Spacer()

                    // Scanning Frame
                    ZStack {
                        // Scanning reticle
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.white, lineWidth: 3)
                            .frame(width: 250, height: 250)

                        // Corner markers
                        VStack {
                            HStack {
                                CornerMarker()
                                Spacer()
                                CornerMarker()
                                    .rotationEffect(.degrees(90))
                            }
                            Spacer()
                            HStack {
                                CornerMarker()
                                    .rotationEffect(.degrees(-90))
                                Spacer()
                                CornerMarker()
                                    .rotationEffect(.degrees(180))
                            }
                        }
                        .frame(width: 250, height: 250)
                    }

                    Spacer()

                    // Instructions
                    VStack(spacing: 12) {
                        Text("Position the QR code within the frame")
                            .font(.headline)
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)

                        Text("The ticket will be automatically scanned and checked in")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.8))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 50)
                }

                // Processing Overlay
                if isProcessing {
                    Color.black.opacity(0.7)
                        .ignoresSafeArea()

                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.5)
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))

                        Text("Processing...")
                            .font(.headline)
                            .foregroundColor(.white)
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .alert("Scan Result", isPresented: $showingResult) {
            Button("OK") {
                if case .success = scanResult {
                    dismiss()
                } else {
                    scanner.startScanning()
                }
            }
        } message: {
            if let result = scanResult {
                Text(result.message)
            }
        }
    }

    private func handleScannedCode(_ code: String) {
        guard !isProcessing else { return }

        isProcessing = true
        scannedCode = code

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()

        Task {
            // Check if guest exists and check them in
            let success = await supabaseService.checkInGuest(ticketCode: code)

            await MainActor.run {
                isProcessing = false

                if success {
                    // Find the guest to get their name
                    if let guest = supabaseService.guests.first(where: { $0.ticketCode == code }) {
                        scanResult = .success(guest.name)
                    } else {
                        scanResult = .success("Guest")
                    }
                } else {
                    // Check if the ticket exists but is already checked in
                    if let guest = supabaseService.guests.first(where: { $0.ticketCode == code }) {
                        if guest.checkedIn {
                            scanResult = .alreadyCheckedIn(guest.name)
                        } else {
                            scanResult = .error("Failed to check in guest")
                        }
                    } else {
                        scanResult = .notFound
                    }
                }

                showingResult = true
            }
        }
    }
}

struct CornerMarker: View {
    var body: some View {
        VStack {
            Rectangle()
                .fill(Color.ticketFloOrange)
                .frame(width: 20, height: 4)
            Rectangle()
                .fill(Color.ticketFloOrange)
                .frame(width: 4, height: 20)
        }
    }
}

// MARK: - QR Code Scanner

class QRCodeScanner: NSObject, ObservableObject {
    @Published var scannedCode: String?
    @Published var isScanning = false

    private var captureSession: AVCaptureSession?
    private var isProcessingCode = false

    func startScanning() {
        isScanning = true
        isProcessingCode = false
        scannedCode = nil
    }

    func stopScanning() {
        isScanning = false
        captureSession?.stopRunning()
    }

    func setupCaptureSession() -> AVCaptureSession? {
        let session = AVCaptureSession()

        guard let videoCaptureDevice = AVCaptureDevice.default(for: .video) else { return nil }
        let videoInput: AVCaptureDeviceInput

        do {
            videoInput = try AVCaptureDeviceInput(device: videoCaptureDevice)
        } catch {
            return nil
        }

        if session.canAddInput(videoInput) {
            session.addInput(videoInput)
        } else {
            return nil
        }

        let metadataOutput = AVCaptureMetadataOutput()

        if session.canAddOutput(metadataOutput) {
            session.addOutput(metadataOutput)

            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = [.qr]
        } else {
            return nil
        }

        self.captureSession = session
        return session
    }
}

extension QRCodeScanner: AVCaptureMetadataOutputObjectsDelegate {
    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard !isProcessingCode,
              let metadataObject = metadataObjects.first,
              let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject,
              let stringValue = readableObject.stringValue else { return }

        isProcessingCode = true
        scannedCode = stringValue
        captureSession?.stopRunning()
    }
}

// MARK: - Camera View

struct QRCodeScannerView: UIViewRepresentable {
    let scanner: QRCodeScanner

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = UIColor.black

        guard let captureSession = scanner.setupCaptureSession() else {
            return view
        }

        let previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
        previewLayer.frame = view.layer.bounds
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)

        captureSession.startRunning()

        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        if let previewLayer = uiView.layer.sublayers?.first as? AVCaptureVideoPreviewLayer {
            previewLayer.frame = uiView.bounds
        }
    }

    static func dismantleUIView(_ uiView: UIView, coordinator: ()) {
        // Clean up capture session
    }
}

#Preview {
    ScannerView()
}