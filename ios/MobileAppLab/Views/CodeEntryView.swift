import SwiftUI

/// Manual 6-digit code entry view
struct CodeEntryView: View {
    let onCodeEntered: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var code: String = ""
    @FocusState private var isFocused: Bool

    private let codeLength = 6

    var body: some View {
        NavigationView {
            ZStack {
                // Background
                Color(hex: "1a1a2e")
                    .ignoresSafeArea()

                VStack(spacing: 32) {
                    // Instructions
                    Text("Enter the 6-digit code\nshown on your TV")
                        .font(.system(size: 18))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.top, 40)

                    // Code display boxes
                    HStack(spacing: 12) {
                        ForEach(0..<codeLength, id: \.self) { index in
                            CodeDigitBox(
                                digit: digit(at: index),
                                isActive: index == code.count
                            )
                        }
                    }
                    .onTapGesture {
                        isFocused = true
                    }

                    // Hidden text field for keyboard input
                    TextField("", text: $code)
                        .keyboardType(.numberPad)
                        .focused($isFocused)
                        .opacity(0)
                        .frame(width: 1, height: 1)
                        .onChange(of: code) { newValue in
                            // Filter to digits only and limit length
                            let filtered = newValue.filter { $0.isNumber }
                            if filtered != newValue {
                                code = filtered
                            }
                            if filtered.count > codeLength {
                                code = String(filtered.prefix(codeLength))
                            }

                            // Auto-submit when complete
                            if code.count == codeLength {
                                HapticService.shared.trigger(.success)
                                onCodeEntered(code)
                            }
                        }

                    Spacer()

                    // Connect button (for accessibility - auto-submits anyway)
                    Button(action: {
                        if code.count == codeLength {
                            onCodeEntered(code)
                        }
                    }) {
                        Text("Connect")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(code.count == codeLength ? Color(hex: "e94560") : Color.gray.opacity(0.3))
                            )
                    }
                    .disabled(code.count != codeLength)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Enter Code")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(Color(hex: "e94560"))
                }
            }
            .onAppear {
                // Auto-focus the keyboard
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    isFocused = true
                }
            }
        }
    }

    private func digit(at index: Int) -> String? {
        guard index < code.count else { return nil }
        let stringIndex = code.index(code.startIndex, offsetBy: index)
        return String(code[stringIndex])
    }
}

// MARK: - Code Digit Box

struct CodeDigitBox: View {
    let digit: String?
    let isActive: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .stroke(isActive ? Color(hex: "e94560") : Color.gray.opacity(0.3), lineWidth: 2)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(hex: "16213e"))
                )
                .frame(width: 48, height: 64)

            if let digit = digit {
                Text(digit)
                    .font(.system(size: 28, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
            }
        }
    }
}

#Preview {
    CodeEntryView { code in
        print("Entered code: \(code)")
    }
}
