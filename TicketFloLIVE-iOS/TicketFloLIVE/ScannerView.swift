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
    @State private var showManualEntry = false
    @State private var manualTicketCode = ""
    @State private var scanLineOffset: CGFloat = -100
    @State private var isAnimating = false
    @State private var flashEnabled = false

    enum ScanResult {
        case success(String, String) // name, ticketCode
        case alreadyCheckedIn(String, String?) // name, time
        case notFound
        case error(String)

        var title: String {
            switch self {
            case .success: return "Check-in Successful!"
            case .alreadyCheckedIn: return "Already Checked In"
            case .notFound: return "Ticket Not Found"
            case .error: return "Error"
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
        ZStack {
            // Camera Preview
            QRCodeScannerView(scanner: scanner)
                .ignoresSafeArea()
                .onReceive(scanner.$scannedCode) { code in
                    if let code = code, !isProcessing {
                        handleScannedCode(code)
                    }
                }

            // Dark overlay with cutout
            GeometryReader { geo in
                let scannerSize: CGFloat = min(geo.size.width - 80, 280)
                let centerX = geo.size.width / 2
                let centerY = geo.size.height / 2 - 40

                ZStack {
                    // Darkened areas around scanner
                    Color.black.opacity(0.6)
                        .ignoresSafeArea()

                    // Clear cutout for scanner
                    RoundedRectangle(cornerRadius: 24)
                        .frame(width: scannerSize, height: scannerSize)
                        .position(x: centerX, y: centerY)
                        .blendMode(.destinationOut)
                }
                .compositingGroup()

                // Scanner frame and decorations
                ZStack {
                    // Outer glow
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(Color.ticketFloOrange.opacity(0.3), lineWidth: 4)
                        .frame(width: scannerSize + 8, height: scannerSize + 8)
                        .blur(radius: 4)
                        .position(x: centerX, y: centerY)

                    // Main frame
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(Color.white.opacity(0.8), lineWidth: 2)
                        .frame(width: scannerSize, height: scannerSize)
                        .position(x: centerX, y: centerY)

                    // Corner markers
                    ForEach(0..<4, id: \.self) { index in
                        ScannerCornerMarker()
                            .rotationEffect(.degrees(Double(index) * 90))
                            .position(
                                x: centerX + (index == 0 || index == 3 ? -scannerSize/2 + 15 : scannerSize/2 - 15),
                                y: centerY + (index < 2 ? -scannerSize/2 + 15 : scannerSize/2 - 15)
                            )
                    }

                    // Scanning line animation
                    if !isProcessing {
                        Rectangle()
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color.ticketFloOrange.opacity(0),
                                        Color.ticketFloOrange.opacity(0.8),
                                        Color.ticketFloOrange.opacity(0)
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: scannerSize - 40, height: 3)
                            .position(x: centerX, y: centerY + scanLineOffset)
                            .shadow(color: Color.ticketFloOrange, radius: 8)
                    }
                }
            }

            // UI Overlay
            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: { dismiss() }) {
                        HStack(spacing: 6) {
                            Image(systemName: "xmark")
                                .font(.system(size: 14, weight: .bold))
                            Text("Close")
                                .font(.system(size: 15, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.15))
                        .cornerRadius(20)
                    }

                    Spacer()

                    // Torch toggle
                    Button(action: toggleFlash) {
                        Image(systemName: flashEnabled ? "bolt.fill" : "bolt.slash.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.white.opacity(flashEnabled ? 0.3 : 0.15))
                            .cornerRadius(20)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 60)

                Spacer()

                // Instructions
                VStack(spacing: 24) {
                    VStack(spacing: 8) {
                        Text("Scan Ticket QR Code")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)

                        Text("Position the QR code within the frame")
                            .font(.system(size: 15))
                            .foregroundColor(.white.opacity(0.7))
                    }

                    // Stats row
                    HStack(spacing: 24) {
                        ScannerStatBadge(
                            icon: "person.fill.checkmark",
                            value: "\(supabaseService.guests.filter { $0.checkedIn }.count)",
                            label: "Checked In"
                        )

                        ScannerStatBadge(
                            icon: "person.2.fill",
                            value: "\(supabaseService.guests.count)",
                            label: "Total"
                        )
                    }

                    // Manual entry button
                    Button(action: { showManualEntry = true }) {
                        HStack(spacing: 8) {
                            Image(systemName: "keyboard")
                                .font(.system(size: 16))
                            Text("Enter Code Manually")
                                .font(.system(size: 15, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 14)
                        .background(Color.ticketFloOrange)
                        .cornerRadius(25)
                        .shadow(color: Color.ticketFloOrange.opacity(0.4), radius: 10, x: 0, y: 5)
                    }
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 60)
            }

            // Processing Overlay
            if isProcessing {
                Color.black.opacity(0.8)
                    .ignoresSafeArea()

                VStack(spacing: 20) {
                    ZStack {
                        Circle()
                            .stroke(Color.white.opacity(0.2), lineWidth: 4)
                            .frame(width: 60, height: 60)

                        Circle()
                            .trim(from: 0, to: 0.7)
                            .stroke(Color.ticketFloOrange, lineWidth: 4)
                            .frame(width: 60, height: 60)
                            .rotationEffect(.degrees(isAnimating ? 360 : 0))
                            .animation(.linear(duration: 1).repeatForever(autoreverses: false), value: isAnimating)
                    }

                    Text("Checking In...")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)

                    if let code = scannedCode {
                        Text(code)
                            .font(.system(size: 14, design: .monospaced))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
            }
        }
        .onAppear {
            startScanLineAnimation()
            isAnimating = true
        }
        .sheet(isPresented: $showingResult) {
            ScanResultSheet(result: scanResult, onDismiss: {
                showingResult = false
                if case .success = scanResult {
                    dismiss()
                } else {
                    scanner.startScanning()
                }
            })
            .presentationDetents([.height(350)])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showManualEntry) {
            ManualEntrySheet(
                ticketCode: $manualTicketCode,
                onSubmit: {
                    showManualEntry = false
                    if !manualTicketCode.isEmpty {
                        handleScannedCode(manualTicketCode)
                        manualTicketCode = ""
                    }
                },
                onCancel: {
                    showManualEntry = false
                    manualTicketCode = ""
                }
            )
            .presentationDetents([.height(280)])
            .presentationDragIndicator(.visible)
        }
    }

    private func startScanLineAnimation() {
        withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
            scanLineOffset = 100
        }
    }

    private func toggleFlash() {
        guard let device = AVCaptureDevice.default(for: .video), device.hasTorch else { return }

        do {
            try device.lockForConfiguration()
            flashEnabled.toggle()
            device.torchMode = flashEnabled ? .on : .off
            device.unlockForConfiguration()
        } catch {
            print("Flash toggle failed: \(error)")
        }
    }

    private func handleScannedCode(_ code: String) {
        guard !isProcessing else { return }

        isProcessing = true
        scannedCode = code

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .heavy)
        impactFeedback.impactOccurred()

        Task {
            // Check if guest exists and check them in
            let success = await supabaseService.checkInGuest(ticketCode: code)

            await MainActor.run {
                isProcessing = false

                if success {
                    // Success haptic
                    let notificationFeedback = UINotificationFeedbackGenerator()
                    notificationFeedback.notificationOccurred(.success)

                    // Find the guest to get their name
                    if let guest = supabaseService.guests.first(where: { $0.ticketCode == code }) {
                        scanResult = .success(guest.name, code)
                    } else {
                        scanResult = .success("Guest", code)
                    }
                } else {
                    // Error haptic
                    let notificationFeedback = UINotificationFeedbackGenerator()
                    notificationFeedback.notificationOccurred(.error)

                    // Check if the ticket exists but is already checked in
                    if let guest = supabaseService.guests.first(where: { $0.ticketCode == code }) {
                        if guest.checkedIn {
                            scanResult = .alreadyCheckedIn(guest.name, guest.checkedInAt)
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

// MARK: - Scanner Corner Marker
struct ScannerCornerMarker: View {
    var body: some View {
        ZStack(alignment: .topLeading) {
            Rectangle()
                .fill(Color.ticketFloOrange)
                .frame(width: 30, height: 4)

            Rectangle()
                .fill(Color.ticketFloOrange)
                .frame(width: 4, height: 30)
        }
    }
}

// MARK: - Scanner Stat Badge
struct ScannerStatBadge: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(.ticketFloOrange)

            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                Text(label)
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.6))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Scan Result Sheet
struct ScanResultSheet: View {
    let result: ScannerView.ScanResult?
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            // Icon
            ZStack {
                Circle()
                    .fill(result?.color.opacity(0.15) ?? Color.gray.opacity(0.15))
                    .frame(width: 80, height: 80)

                Image(systemName: result?.icon ?? "questionmark.circle")
                    .font(.system(size: 40))
                    .foregroundColor(result?.color ?? .gray)
            }

            // Title and message
            VStack(spacing: 12) {
                Text(result?.title ?? "Unknown Result")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.primary)

                switch result {
                case .success(let name, let code):
                    VStack(spacing: 4) {
                        Text(name)
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.primary)
                        Text(code)
                            .font(.system(size: 14, design: .monospaced))
                            .foregroundColor(.secondary)
                    }
                case .alreadyCheckedIn(let name, let time):
                    VStack(spacing: 4) {
                        Text(name)
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.primary)
                        if let time = time {
                            Text("Checked in at \(formatTime(time))")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                    }
                case .notFound:
                    Text("This ticket code was not found in the system")
                        .font(.system(size: 15))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                case .error(let message):
                    Text(message)
                        .font(.system(size: 15))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                case .none:
                    EmptyView()
                }
            }

            Spacer()

            // Action button
            Button(action: onDismiss) {
                Text(result?.color == .green ? "Done" : "Try Again")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(result?.color ?? .gray)
                    .cornerRadius(12)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 16)
        }
        .padding(.top, 32)
    }

    private func formatTime(_ timeString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"

        if let date = formatter.date(from: timeString) {
            formatter.dateStyle = .none
            formatter.timeStyle = .short
            return formatter.string(from: date)
        }
        return timeString
    }
}

// MARK: - Manual Entry Sheet
struct ManualEntrySheet: View {
    @Binding var ticketCode: String
    let onSubmit: () -> Void
    let onCancel: () -> Void
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("Manual Entry")
                    .font(.system(size: 22, weight: .bold))

                Text("Enter the ticket code manually")
                    .font(.system(size: 15))
                    .foregroundColor(.secondary)
            }

            TextField("Ticket Code", text: $ticketCode)
                .font(.system(size: 18, design: .monospaced))
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .textInputAutocapitalization(.characters)
                .focused($isFocused)
                .padding(.horizontal)

            HStack(spacing: 16) {
                Button(action: onCancel) {
                    Text("Cancel")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.primary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color(.systemGray5))
                        .cornerRadius(12)
                }

                Button(action: onSubmit) {
                    Text("Check In")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(ticketCode.isEmpty ? Color.gray : Color.ticketFloOrange)
                        .cornerRadius(12)
                }
                .disabled(ticketCode.isEmpty)
            }
            .padding(.horizontal)
        }
        .padding(.top, 24)
        .onAppear {
            isFocused = true
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