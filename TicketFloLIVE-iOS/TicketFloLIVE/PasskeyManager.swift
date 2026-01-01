import Foundation
import AuthenticationServices
import UIKit

// MARK: - Passkey Manager for iOS
/// Handles WebAuthn/Passkey authentication using ASAuthorizationController
class PasskeyManager: NSObject, ObservableObject {
    static let shared = PasskeyManager()

    // Supabase configuration - must match SupabaseService
    private let supabaseUrl = "https://yoxsewbpoqxscsutqlcb.supabase.co"
    private let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k"

    // Relying Party ID - must match your domain
    private let rpID = "ticketflo.org"

    @Published var isLoading = false
    @Published var error: String?
    @Published var isSupported: Bool = false

    // Completion handlers
    private var authenticationCompletion: ((Result<AuthenticationResult, PasskeyError>) -> Void)?
    private var registrationCompletion: ((Result<Void, PasskeyError>) -> Void)?

    // Stored data for verification
    private var pendingEmail: String?
    private var pendingChallenge: String?

    // Reference to presenting window
    private weak var presentationAnchor: ASPresentationAnchor?

    override init() {
        super.init()
        checkSupport()
    }

    // MARK: - Support Check
    func checkSupport() {
        // Passkeys require iOS 16+
        if #available(iOS 16.0, *) {
            isSupported = true
        } else {
            isSupported = false
        }
        print("🔐 Passkey support: \(isSupported)")
    }

    // MARK: - Check if user has passkeys registered
    func checkPasskeyStatus(email: String) async -> (hasPasskeys: Bool, count: Int) {
        guard !email.isEmpty else {
            return (false, 0)
        }

        do {
            let url = URL(string: "\(supabaseUrl)/functions/v1/check-passkey-status")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
            request.httpBody = try JSONEncoder().encode(["email": email])

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                return (false, 0)
            }

            let result = try JSONDecoder().decode(PasskeyStatusResponse.self, from: data)
            print("🔐 Passkey status for \(email): hasPasskeys=\(result.hasPasskeys), count=\(result.passkeyCount)")
            return (result.hasPasskeys, result.passkeyCount)
        } catch {
            print("❌ Error checking passkey status: \(error)")
            return (false, 0)
        }
    }

    // MARK: - Authenticate with Passkey
    @available(iOS 16.0, *)
    func authenticateWithPasskey(email: String, anchor: ASPresentationAnchor) async -> Result<AuthenticationResult, PasskeyError> {
        guard isSupported else {
            return .failure(.notSupported)
        }

        await MainActor.run {
            isLoading = true
            error = nil
        }

        // Store email and anchor for later
        pendingEmail = email
        presentationAnchor = anchor

        do {
            // Step 1: Get authentication options from server
            let options = try await getAuthenticationOptions(email: email)

            // Step 2: Create credential provider and request
            let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpID)

            // Convert challenge from base64url to Data
            let challengeData = base64urlToData(options.challenge)

            let assertionRequest = provider.createCredentialAssertionRequest(challenge: challengeData)

            // Add allowed credentials if provided
            if let allowCredentials = options.allowCredentials, !allowCredentials.isEmpty {
                assertionRequest.allowedCredentials = allowCredentials.compactMap { cred in
                    let credIdData = base64urlToData(cred.id)
                    guard !credIdData.isEmpty else { return nil }
                    return ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: credIdData)
                }
            }

            // Step 3: Perform authorization
            let authController = ASAuthorizationController(authorizationRequests: [assertionRequest])

            return await withCheckedContinuation { continuation in
                self.authenticationCompletion = { result in
                    continuation.resume(returning: result)
                }

                authController.delegate = self
                authController.presentationContextProvider = self
                authController.performRequests()
            }

        } catch let passkeyError as PasskeyError {
            await MainActor.run {
                isLoading = false
                error = passkeyError.localizedDescription
            }
            return .failure(passkeyError)
        } catch {
            await MainActor.run {
                isLoading = false
                self.error = error.localizedDescription
            }
            return .failure(.unknown(error.localizedDescription))
        }
    }

    // MARK: - Register Passkey (for logged-in users)
    @available(iOS 16.0, *)
    func registerPasskey(accessToken: String, credentialName: String = "iPhone Passkey", anchor: ASPresentationAnchor) async -> Result<Void, PasskeyError> {
        guard isSupported else {
            return .failure(.notSupported)
        }

        await MainActor.run {
            isLoading = true
            error = nil
        }

        presentationAnchor = anchor

        do {
            // Step 1: Get registration options from server
            let options = try await getRegistrationOptions(accessToken: accessToken)

            // Step 2: Create credential provider and request
            let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpID)

            // Convert challenge from base64url to Data
            let challengeData = base64urlToData(options.challenge)

            // Convert user ID from base64url to Data
            let decodedUserIdData = base64urlToData(options.user.id)
            let userIdData = decodedUserIdData.isEmpty ? Data(options.user.id.utf8) : decodedUserIdData

            let registrationRequest = provider.createCredentialRegistrationRequest(
                challenge: challengeData,
                name: options.user.name,
                userID: userIdData
            )

            // Step 3: Perform authorization
            let authController = ASAuthorizationController(authorizationRequests: [registrationRequest])

            return await withCheckedContinuation { continuation in
                self.registrationCompletion = { result in
                    Task {
                        switch result {
                        case .success:
                            continuation.resume(returning: .success(()))
                        case .failure(let error):
                            continuation.resume(returning: .failure(error))
                        }
                    }
                }

                authController.delegate = self
                authController.presentationContextProvider = self
                authController.performRequests()
            }

        } catch let passkeyError as PasskeyError {
            await MainActor.run {
                isLoading = false
                error = passkeyError.localizedDescription
            }
            return .failure(passkeyError)
        } catch {
            await MainActor.run {
                isLoading = false
                self.error = error.localizedDescription
            }
            return .failure(.unknown(error.localizedDescription))
        }
    }

    // MARK: - Private API Methods

    private func getAuthenticationOptions(email: String) async throws -> AuthenticationOptions {
        let url = URL(string: "\(supabaseUrl)/functions/v1/webauthn-authentication-options")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(["email": email])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw PasskeyError.networkError
        }

        if httpResponse.statusCode != 200 {
            if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                if errorResponse.error.contains("not available") {
                    throw PasskeyError.noPasskeysRegistered
                }
                throw PasskeyError.serverError(errorResponse.error)
            }
            throw PasskeyError.serverError("HTTP \(httpResponse.statusCode)")
        }

        let options = try JSONDecoder().decode(AuthenticationOptions.self, from: data)
        pendingChallenge = options.challenge
        print("🔐 Got authentication options, challenge: \(options.challenge.prefix(20))...")
        return options
    }

    private func getRegistrationOptions(accessToken: String) async throws -> RegistrationOptions {
        let url = URL(string: "\(supabaseUrl)/functions/v1/webauthn-registration-options")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw PasskeyError.networkError
        }

        if httpResponse.statusCode != 200 {
            if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                throw PasskeyError.serverError(errorResponse.error)
            }
            throw PasskeyError.serverError("HTTP \(httpResponse.statusCode)")
        }

        let options = try JSONDecoder().decode(RegistrationOptions.self, from: data)
        pendingChallenge = options.challenge
        print("🔐 Got registration options, challenge: \(options.challenge.prefix(20))...")
        return options
    }

    private func verifyAuthentication(email: String, credential: ASAuthorizationPlatformPublicKeyCredentialAssertion) async throws -> AuthenticationResult {
        // Build the credential response to send to server
        let credentialResponse = AuthenticationCredentialResponse(
            id: dataToBase64url(credential.credentialID),
            rawId: dataToBase64url(credential.credentialID),
            type: "public-key",
            response: AuthenticatorAssertionResponse(
                clientDataJSON: dataToBase64url(credential.rawClientDataJSON),
                authenticatorData: dataToBase64url(credential.rawAuthenticatorData),
                signature: dataToBase64url(credential.signature),
                userHandle: credential.userID != nil ? dataToBase64url(credential.userID!) : nil
            ),
            authenticatorAttachment: "platform"
        )

        let requestBody = AuthenticationVerifyRequest(
            email: email,
            credential: credentialResponse
        )

        let url = URL(string: "\(supabaseUrl)/functions/v1/webauthn-authentication-verify")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(requestBody)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw PasskeyError.networkError
        }

        if httpResponse.statusCode != 200 {
            if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                throw PasskeyError.verificationFailed(errorResponse.error)
            }
            throw PasskeyError.verificationFailed("HTTP \(httpResponse.statusCode)")
        }

        let verifyResult = try JSONDecoder().decode(AuthenticationVerifyResponse.self, from: data)

        guard verifyResult.verified else {
            throw PasskeyError.verificationFailed("Server rejected credential")
        }

        print("✅ Passkey authentication verified!")

        return AuthenticationResult(
            email: verifyResult.email,
            token: verifyResult.token
        )
    }

    private func verifyRegistration(accessToken: String, credential: ASAuthorizationPlatformPublicKeyCredentialRegistration, credentialName: String) async throws {
        // Build the credential response to send to server
        let credentialResponse = RegistrationCredentialResponse(
            id: dataToBase64url(credential.credentialID),
            rawId: dataToBase64url(credential.credentialID),
            type: "public-key",
            response: AuthenticatorAttestationResponse(
                clientDataJSON: dataToBase64url(credential.rawClientDataJSON),
                attestationObject: dataToBase64url(credential.rawAttestationObject!)
            ),
            authenticatorAttachment: "platform"
        )

        let requestBody = RegistrationVerifyRequest(
            credential: credentialResponse,
            credentialName: credentialName
        )

        let url = URL(string: "\(supabaseUrl)/functions/v1/webauthn-registration-verify")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(requestBody)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw PasskeyError.networkError
        }

        if httpResponse.statusCode != 200 {
            if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                throw PasskeyError.verificationFailed(errorResponse.error)
            }
            throw PasskeyError.verificationFailed("HTTP \(httpResponse.statusCode)")
        }

        let verifyResult = try JSONDecoder().decode(RegistrationVerifyResponse.self, from: data)

        guard verifyResult.verified else {
            throw PasskeyError.verificationFailed("Server rejected registration")
        }

        print("✅ Passkey registration verified!")
    }

    // MARK: - Base64URL Helpers

    private func base64urlToData(_ base64url: String) -> Data {
        var base64 = base64url
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Add padding if needed
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        return Data(base64Encoded: base64) ?? Data()
    }

    private func dataToBase64url(_ data: Data) -> String {
        return data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

// MARK: - ASAuthorizationControllerDelegate
extension PasskeyManager: ASAuthorizationControllerDelegate {
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        Task {
            await MainActor.run {
                isLoading = false
            }

            if let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion {
                // Authentication flow
                do {
                    guard let email = pendingEmail else {
                        authenticationCompletion?(.failure(.unknown("Missing email")))
                        return
                    }

                    let result = try await verifyAuthentication(email: email, credential: credential)
                    authenticationCompletion?(.success(result))
                } catch let error as PasskeyError {
                    authenticationCompletion?(.failure(error))
                } catch {
                    authenticationCompletion?(.failure(.unknown(error.localizedDescription)))
                }
            } else if let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration {
                // Registration flow
                do {
                    // Note: We need the access token for registration verification
                    // This is handled in the registerPasskey method
                    guard let accessToken = SupabaseService.shared.userAccessToken else {
                        registrationCompletion?(.failure(.notAuthenticated))
                        return
                    }

                    try await verifyRegistration(accessToken: accessToken, credential: credential, credentialName: "iPhone Passkey")
                    registrationCompletion?(.success(()))
                } catch let error as PasskeyError {
                    registrationCompletion?(.failure(error))
                } catch {
                    registrationCompletion?(.failure(.unknown(error.localizedDescription)))
                }
            }
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        Task {
            await MainActor.run {
                isLoading = false
            }

            let passkeyError: PasskeyError

            if let authError = error as? ASAuthorizationError {
                switch authError.code {
                case .canceled:
                    passkeyError = .cancelled
                case .failed:
                    passkeyError = .failed(authError.localizedDescription)
                case .invalidResponse:
                    passkeyError = .invalidResponse
                case .notHandled:
                    passkeyError = .notHandled
                case .notInteractive:
                    passkeyError = .notInteractive
                case .unknown:
                    passkeyError = .unknown(authError.localizedDescription)
                case .matchedExcludedCredential:
                    passkeyError = .failed("Credential already registered")
                @unknown default:
                    passkeyError = .unknown(authError.localizedDescription)
                }
            } else {
                passkeyError = .unknown(error.localizedDescription)
            }

            await MainActor.run {
                self.error = passkeyError.localizedDescription
            }

            authenticationCompletion?(.failure(passkeyError))
            registrationCompletion?(.failure(passkeyError))
        }
    }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding
extension PasskeyManager: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return presentationAnchor ?? UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? UIWindow()
    }
}

// MARK: - Models

struct AuthenticationResult {
    let email: String
    let token: String
}

enum PasskeyError: LocalizedError {
    case notSupported
    case noPasskeysRegistered
    case networkError
    case serverError(String)
    case verificationFailed(String)
    case cancelled
    case failed(String)
    case invalidResponse
    case notHandled
    case notInteractive
    case notAuthenticated
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .notSupported:
            return "Passkeys are not supported on this device. iOS 16+ is required."
        case .noPasskeysRegistered:
            return "No passkeys registered for this account."
        case .networkError:
            return "Network error. Please check your connection."
        case .serverError(let message):
            return "Server error: \(message)"
        case .verificationFailed(let message):
            return "Verification failed: \(message)"
        case .cancelled:
            return "Authentication was cancelled."
        case .failed(let message):
            return "Authentication failed: \(message)"
        case .invalidResponse:
            return "Invalid response from authenticator."
        case .notHandled:
            return "Request was not handled."
        case .notInteractive:
            return "Cannot show passkey prompt."
        case .notAuthenticated:
            return "You must be signed in to register a passkey."
        case .unknown(let message):
            return "Unknown error: \(message)"
        }
    }
}

// MARK: - API Response Models

private struct PasskeyStatusResponse: Codable {
    let hasPasskeys: Bool
    let passkeyCount: Int
}

private struct ErrorResponse: Codable {
    let error: String
}

private struct AuthenticationOptions: Codable {
    let challenge: String
    let timeout: Int?
    let rpId: String?
    let allowCredentials: [AllowCredential]?
    let userVerification: String?
}

private struct AllowCredential: Codable {
    let id: String
    let type: String
    let transports: [String]?
}

private struct RegistrationOptions: Codable {
    let challenge: String
    let rp: RelyingParty
    let user: UserInfo
    let pubKeyCredParams: [PubKeyCredParam]?
    let timeout: Int?
    let attestation: String?
    let authenticatorSelection: AuthenticatorSelection?
}

private struct RelyingParty: Codable {
    let id: String
    let name: String
}

private struct UserInfo: Codable {
    let id: String
    let name: String
    let displayName: String
}

private struct PubKeyCredParam: Codable {
    let type: String
    let alg: Int
}

private struct AuthenticatorSelection: Codable {
    let authenticatorAttachment: String?
    let residentKey: String?
    let requireResidentKey: Bool?
    let userVerification: String?
}

private struct AuthenticationCredentialResponse: Codable {
    let id: String
    let rawId: String
    let type: String
    let response: AuthenticatorAssertionResponse
    let authenticatorAttachment: String?
}

private struct AuthenticatorAssertionResponse: Codable {
    let clientDataJSON: String
    let authenticatorData: String
    let signature: String
    let userHandle: String?
}

private struct AuthenticationVerifyRequest: Codable {
    let email: String
    let credential: AuthenticationCredentialResponse
}

private struct AuthenticationVerifyResponse: Codable {
    let verified: Bool
    let email: String
    let token: String
}

private struct RegistrationCredentialResponse: Codable {
    let id: String
    let rawId: String
    let type: String
    let response: AuthenticatorAttestationResponse
    let authenticatorAttachment: String?
}

private struct AuthenticatorAttestationResponse: Codable {
    let clientDataJSON: String
    let attestationObject: String
}

private struct RegistrationVerifyRequest: Codable {
    let credential: RegistrationCredentialResponse
    let credentialName: String
}

private struct RegistrationVerifyResponse: Codable {
    let verified: Bool
}
