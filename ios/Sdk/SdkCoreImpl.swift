import Foundation

/// Platform SDK logic, written in Swift. Knows nothing about React Native —
/// `RCTSdkCore.mm` adapts it to the codegen-generated `NativeSdkCoreSpec`.
@objc(SdkCoreImpl)
public final class SdkCoreImpl: NSObject {
  @objc public static let sdkName = "RNNewArchSample SDK"
  @objc public static let sdkVersion = "1.0.0"
  /// Key under which the machine-readable error code is stored in `NSError.userInfo`.
  @objc public static let errorCodeKey = "SdkErrorCode"

  private static let errorDomain = "com.rnnewarchsample.sdk"
  private static let supportedEnvironments: Set<String> = ["SANDBOX", "PROD"]
  private static let sessionTtl: TimeInterval = 15 * 60

  /// Emitted on every state transition. Called on an arbitrary queue.
  @objc public var onStatusChange: ((String) -> Void)?

  private let queue = DispatchQueue(label: "com.rnnewarchsample.sdk.core")
  private var environment: String?

  @objc(initializeWithEnv:appId:completion:)
  public func initialize(env: String, appId: String, completion: @escaping (NSError?) -> Void) {
    queue.async {
      guard Self.supportedEnvironments.contains(env) else {
        completion(Self.error("E_INVALID_CONFIG", "env must be SANDBOX or PROD, got '\(env)'"))
        return
      }
      guard !appId.trimmingCharacters(in: .whitespaces).isEmpty else {
        completion(Self.error("E_INVALID_CONFIG", "appId must not be empty"))
        return
      }
      self.environment = env
      self.onStatusChange?("INITIALIZED")
      completion(nil)
    }
  }

  @objc(createSessionWithAmount:currency:completion:)
  public func createSession(
    amount: Double,
    currency: String,
    completion: @escaping (NSDictionary?, NSError?) -> Void
  ) {
    queue.async {
      guard let env = self.environment else {
        completion(nil, Self.error("E_NOT_INITIALIZED", "Call initialize() before createSession()"))
        return
      }
      guard amount > 0, amount.isFinite else {
        completion(nil, Self.error("E_INVALID_AMOUNT", "amount must be > 0"))
        return
      }
      guard currency.count == 3 else {
        completion(nil, Self.error("E_INVALID_CURRENCY", "currency must be an ISO-4217 code"))
        return
      }
      self.onStatusChange?("CREATING_SESSION")
      // Simulated network latency — a real SDK would call its backend here.
      self.queue.asyncAfter(deadline: .now() + 0.6) {
        let prefix = env == "PROD" ? "prod" : "sbx"
        let session: NSDictionary = [
          "sessionId": "\(prefix)_\(UUID().uuidString.lowercased())",
          "expiresAt": (Date().timeIntervalSince1970 + Self.sessionTtl) * 1000,
        ]
        self.onStatusChange?("SESSION_CREATED")
        completion(session, nil)
      }
    }
  }

  private static func error(_ code: String, _ message: String) -> NSError {
    NSError(
      domain: errorDomain,
      code: 1,
      userInfo: [errorCodeKey: code, NSLocalizedDescriptionKey: message]
    )
  }
}
