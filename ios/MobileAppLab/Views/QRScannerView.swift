import SwiftUI
import AVFoundation

/// Native QR code scanner using AVFoundation
struct QRScannerView: View {
    let onCodeScanned: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @StateObject private var scanner = QRScannerController()
    @State private var hasPermission = false
    @State private var showPermissionDenied = false

    var body: some View {
        NavigationView {
            ZStack {
                if hasPermission {
                    // Camera preview
                    CameraPreviewView(session: scanner.session)
                        .ignoresSafeArea()

                    // Scanning overlay
                    ScannerOverlay()

                    // Instructions
                    VStack {
                        Spacer()

                        Text("Point at the QR code on your TV")
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                            .padding()
                            .background(
                                Capsule()
                                    .fill(Color.black.opacity(0.6))
                            )
                            .padding(.bottom, 100)
                    }
                } else if showPermissionDenied {
                    PermissionDeniedView()
                } else {
                    // Loading state
                    Color.black
                        .ignoresSafeArea()
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                }
            }
            .navigationTitle("Scan QR Code")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
            }
            .modifier(HiddenNavigationBarModifier())
            .onAppear {
                checkPermissionAndStart()
            }
            .onDisappear {
                scanner.stop()
            }
            .onChange(of: scanner.scannedCode) { code in
                if let code = code {
                    HapticService.shared.trigger(.success)
                    onCodeScanned(code)
                }
            }
        }
    }

    private func checkPermissionAndStart() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            hasPermission = true
            scanner.start()

        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    hasPermission = granted
                    showPermissionDenied = !granted
                    if granted {
                        scanner.start()
                    }
                }
            }

        case .denied, .restricted:
            showPermissionDenied = true

        @unknown default:
            showPermissionDenied = true
        }
    }
}

// MARK: - Scanner Controller

class QRScannerController: NSObject, ObservableObject, AVCaptureMetadataOutputObjectsDelegate {
    let session = AVCaptureSession()
    @Published var scannedCode: String?

    private var isConfigured = false

    func start() {
        guard !isConfigured else {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                self?.session.startRunning()
            }
            return
        }

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.configureSession()
        }
    }

    func stop() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.stopRunning()
        }
    }

    private func configureSession() {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            return
        }

        session.beginConfiguration()

        if session.canAddInput(input) {
            session.addInput(input)
        }

        let output = AVCaptureMetadataOutput()
        if session.canAddOutput(output) {
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: .main)
            output.metadataObjectTypes = [.qr]
        }

        session.commitConfiguration()
        isConfigured = true
        session.startRunning()
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard scannedCode == nil,
              let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let stringValue = object.stringValue else {
            return
        }

        // Parse the code from the URL
        if let url = URL(string: stringValue),
           let code = AppConfig.parseDeepLink(url) {
            scannedCode = code
            stop()
        }
    }
}

// MARK: - Camera Preview

struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
        context.coordinator.previewLayer = previewLayer
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        context.coordinator.previewLayer?.frame = uiView.bounds
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator {
        var previewLayer: AVCaptureVideoPreviewLayer?
    }
}

// MARK: - Scanner Overlay

struct ScannerOverlay: View {
    var body: some View {
        GeometryReader { geometry in
            let size = min(geometry.size.width, geometry.size.height) * 0.7
            let rect = CGRect(
                x: (geometry.size.width - size) / 2,
                y: (geometry.size.height - size) / 2,
                width: size,
                height: size
            )

            ZStack {
                // Dimmed background with cutout
                Rectangle()
                    .fill(Color.black.opacity(0.5))
                    .mask(
                        Rectangle()
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .frame(width: size, height: size)
                                    .blendMode(.destinationOut)
                            )
                    )
                    .ignoresSafeArea()

                // Corner brackets
                ScannerBrackets()
                    .stroke(Color(hex: "e94560"), lineWidth: 4)
                    .frame(width: size, height: size)
                    .position(x: rect.midX, y: rect.midY)
            }
        }
    }
}

// MARK: - Scanner Brackets

struct ScannerBrackets: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let cornerLength: CGFloat = 30
        let cornerRadius: CGFloat = 20

        // Top-left corner
        path.move(to: CGPoint(x: 0, y: cornerLength))
        path.addLine(to: CGPoint(x: 0, y: cornerRadius))
        path.addQuadCurve(to: CGPoint(x: cornerRadius, y: 0), control: CGPoint(x: 0, y: 0))
        path.addLine(to: CGPoint(x: cornerLength, y: 0))

        // Top-right corner
        path.move(to: CGPoint(x: rect.width - cornerLength, y: 0))
        path.addLine(to: CGPoint(x: rect.width - cornerRadius, y: 0))
        path.addQuadCurve(to: CGPoint(x: rect.width, y: cornerRadius), control: CGPoint(x: rect.width, y: 0))
        path.addLine(to: CGPoint(x: rect.width, y: cornerLength))

        // Bottom-right corner
        path.move(to: CGPoint(x: rect.width, y: rect.height - cornerLength))
        path.addLine(to: CGPoint(x: rect.width, y: rect.height - cornerRadius))
        path.addQuadCurve(to: CGPoint(x: rect.width - cornerRadius, y: rect.height), control: CGPoint(x: rect.width, y: rect.height))
        path.addLine(to: CGPoint(x: rect.width - cornerLength, y: rect.height))

        // Bottom-left corner
        path.move(to: CGPoint(x: cornerLength, y: rect.height))
        path.addLine(to: CGPoint(x: cornerRadius, y: rect.height))
        path.addQuadCurve(to: CGPoint(x: 0, y: rect.height - cornerRadius), control: CGPoint(x: 0, y: rect.height))
        path.addLine(to: CGPoint(x: 0, y: rect.height - cornerLength))

        return path
    }
}

// MARK: - Permission Denied View

struct PermissionDeniedView: View {
    var body: some View {
        ZStack {
            Color(hex: "1a1a2e")
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 48))
                    .foregroundColor(Color(hex: "e94560"))

                Text("Camera Access Required")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(.white)

                Text("Please enable camera access in Settings to scan QR codes.")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.top, 16)
            }
        }
    }
}

// MARK: - Hidden Navigation Bar Modifier

struct HiddenNavigationBarModifier: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 16.0, *) {
            content.toolbarBackground(.hidden, for: .navigationBar)
        } else {
            content
        }
    }
}

#Preview {
    QRScannerView { code in
        print("Scanned: \(code)")
    }
}
