import Foundation
import Security

// MARK: - Keychain Helper

final class KeychainHelper {
  static let shared = KeychainHelper()
  private init() {}

  private let service = "com.agentforge.app"

  func save(_ data: Data, for key: String) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
    ]
    SecItemDelete(query as CFDictionary)

    var addQuery = query
    addQuery[kSecValueData as String] = data
    SecItemAdd(addQuery as CFDictionary, nil)
  }

  func save(_ string: String, for key: String) {
    guard let data = string.data(using: .utf8) else { return }
    save(data, for: key)
  }

  func load(key: String) -> Data? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var result: AnyObject?
    SecItemCopyMatching(query as CFDictionary, &result)
    return result as? Data
  }

  func loadString(key: String) -> String? {
    guard let data = load(key: key) else { return nil }
    return String(data: data, encoding: .utf8)
  }

  func delete(key: String) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
    ]
    SecItemDelete(query as CFDictionary)
  }
}

// MARK: - API Error

enum APIError: Error {
  case invalidURL
  case noData
  case decodingError
  case unauthorized
  case serverError(Int, String)
  case networkError(Error)
}

// MARK: - Models

struct AuthResponse: Codable {
  let access_token: String
  let refresh_token: String
  let token_type: String
  let expires_in: Int
  let user: SupabaseUser
}

struct SupabaseUser: Codable {
  let id: String
  let email: String?
}

struct Agent: Codable {
  let id: String
  let name: String
  let description: String?
  let status: String?
  let user_id: String?
  let created_at: String?
  let updated_at: String?
  let model: String?
  let system_prompt: String?
}

struct AgentMessage: Codable {
  let id: String?
  let agent_id: String
  let role: String
  let content: String
  let created_at: String?
}

// MARK: - API Client

final class NativeAPIClient {
  static let shared = NativeAPIClient()
  private init() {}

  private let supabaseURL = "https://dsmdouamcbaizcsobngq.supabase.co"
  private let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbWRvdWFtY2JhaXpjc29ibmdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MTE3NTQsImV4cCI6MjA4MTE4Nzc1NH0.W8zMxkVlGVcQSeBPDdjhuLoDye8OuuVIyiiqcEwQSZ4"

  private let keychainAccessToken = "supabase_access_token"
  private let keychainRefreshToken = "supabase_refresh_token"
  private let keychainUserID = "supabase_user_id"
  private let keychainUserEmail = "supabase_user_email"

  private let cachedAgentsKey = "cached_agents"

  // MARK: - Auth State

  var isLoggedIn: Bool {
    return KeychainHelper.shared.loadString(key: keychainAccessToken) != nil
  }

  var accessToken: String? {
    return KeychainHelper.shared.loadString(key: keychainAccessToken)
  }

  var currentUserEmail: String? {
    return KeychainHelper.shared.loadString(key: keychainUserEmail)
  }

  var currentUserID: String? {
    return KeychainHelper.shared.loadString(key: keychainUserID)
  }

  // MARK: - Auth

  func signIn(email: String, password: String, completion: @escaping (Result<AuthResponse, APIError>) -> Void) {
    guard let url = URL(string: "\(supabaseURL)/auth/v1/token?grant_type=password") else {
      completion(.failure(.invalidURL))
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")

    let body: [String: String] = ["email": email, "password": password]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    performRequest(request) { [weak self] (result: Result<AuthResponse, APIError>) in
      switch result {
      case .success(let auth):
        self?.storeAuth(auth)
        completion(.success(auth))
      case .failure(let error):
        completion(.failure(error))
      }
    }
  }

  func signUp(email: String, password: String, completion: @escaping (Result<AuthResponse, APIError>) -> Void) {
    guard let url = URL(string: "\(supabaseURL)/auth/v1/signup") else {
      completion(.failure(.invalidURL))
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")

    let body: [String: String] = ["email": email, "password": password]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    performRequest(request) { [weak self] (result: Result<AuthResponse, APIError>) in
      switch result {
      case .success(let auth):
        self?.storeAuth(auth)
        completion(.success(auth))
      case .failure(let error):
        completion(.failure(error))
      }
    }
  }

  func signInWithApple(identityToken: String, completion: @escaping (Result<AuthResponse, APIError>) -> Void) {
    guard let url = URL(string: "\(supabaseURL)/auth/v1/token?grant_type=id_token") else {
      completion(.failure(.invalidURL))
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")

    let body: [String: Any] = [
      "provider": "apple",
      "id_token": identityToken,
    ]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    performRequest(request) { [weak self] (result: Result<AuthResponse, APIError>) in
      switch result {
      case .success(let auth):
        self?.storeAuth(auth)
        completion(.success(auth))
      case .failure(let error):
        completion(.failure(error))
      }
    }
  }

  func refreshToken(completion: @escaping (Result<AuthResponse, APIError>) -> Void) {
    guard let refreshToken = KeychainHelper.shared.loadString(key: keychainRefreshToken) else {
      completion(.failure(.unauthorized))
      return
    }

    guard let url = URL(string: "\(supabaseURL)/auth/v1/token?grant_type=refresh_token") else {
      completion(.failure(.invalidURL))
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")

    let body: [String: String] = ["refresh_token": refreshToken]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    performRequest(request) { [weak self] (result: Result<AuthResponse, APIError>) in
      switch result {
      case .success(let auth):
        self?.storeAuth(auth)
        completion(.success(auth))
      case .failure(let error):
        self?.signOut()
        completion(.failure(error))
      }
    }
  }

  func signOut() {
    KeychainHelper.shared.delete(key: keychainAccessToken)
    KeychainHelper.shared.delete(key: keychainRefreshToken)
    KeychainHelper.shared.delete(key: keychainUserID)
    KeychainHelper.shared.delete(key: keychainUserEmail)
  }

  // MARK: - Agents

  func listAgents(completion: @escaping (Result<[Agent], APIError>) -> Void) {
    guard let token = accessToken else {
      completion(.failure(.unauthorized))
      return
    }

    guard let userID = currentUserID else {
      completion(.failure(.unauthorized))
      return
    }

    let urlString = "\(supabaseURL)/rest/v1/agents?user_id=eq.\(userID)&order=updated_at.desc"
    guard let url = URL(string: urlString) else {
      completion(.failure(.invalidURL))
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    performRequest(request) { [weak self] (result: Result<[Agent], APIError>) in
      switch result {
      case .success(let agents):
        self?.cacheAgents(agents)
        completion(.success(agents))
      case .failure(let error):
        if let cached = self?.loadCachedAgents(), !cached.isEmpty {
          completion(.success(cached))
        } else {
          completion(.failure(error))
        }
      }
    }
  }

  func getAgent(id: String, completion: @escaping (Result<Agent, APIError>) -> Void) {
    guard let token = accessToken else {
      completion(.failure(.unauthorized))
      return
    }

    let urlString = "\(supabaseURL)/rest/v1/agents?id=eq.\(id)"
    guard let url = URL(string: urlString) else {
      completion(.failure(.invalidURL))
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/vnd.pgrst.object+json", forHTTPHeaderField: "Accept")

    performRequest(request, completion: completion)
  }

  // MARK: - Messages

  func getMessages(agentId: String, completion: @escaping (Result<[AgentMessage], APIError>) -> Void) {
    guard let token = accessToken else {
      completion(.failure(.unauthorized))
      return
    }

    let urlString = "\(supabaseURL)/rest/v1/messages?agent_id=eq.\(agentId)&order=created_at.asc&limit=50"
    guard let url = URL(string: urlString) else {
      completion(.failure(.invalidURL))
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    performRequest(request, completion: completion)
  }

  func sendMessage(agentId: String, content: String, completion: @escaping (Result<AgentMessage, APIError>) -> Void) {
    guard let token = accessToken else {
      completion(.failure(.unauthorized))
      return
    }

    guard let url = URL(string: "\(supabaseURL)/rest/v1/messages") else {
      completion(.failure(.invalidURL))
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("return=representation", forHTTPHeaderField: "Prefer")

    let body: [String: String] = [
      "agent_id": agentId,
      "role": "user",
      "content": content,
    ]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    performRequest(request) { (result: Result<[AgentMessage], APIError>) in
      switch result {
      case .success(let messages):
        if let first = messages.first {
          completion(.success(first))
        } else {
          completion(.failure(.noData))
        }
      case .failure(let error):
        completion(.failure(error))
      }
    }
  }

  // MARK: - Private Helpers

  private func storeAuth(_ auth: AuthResponse) {
    KeychainHelper.shared.save(auth.access_token, for: keychainAccessToken)
    KeychainHelper.shared.save(auth.refresh_token, for: keychainRefreshToken)
    KeychainHelper.shared.save(auth.user.id, for: keychainUserID)
    if let email = auth.user.email {
      KeychainHelper.shared.save(email, for: keychainUserEmail)
    }
  }

  private func cacheAgents(_ agents: [Agent]) {
    if let data = try? JSONEncoder().encode(agents) {
      UserDefaults.standard.set(data, forKey: cachedAgentsKey)
    }
  }

  func loadCachedAgents() -> [Agent]? {
    guard let data = UserDefaults.standard.data(forKey: cachedAgentsKey),
          let agents = try? JSONDecoder().decode([Agent].self, from: data) else {
      return nil
    }
    return agents
  }

  private func performRequest<T: Decodable>(_ request: URLRequest, completion: @escaping (Result<T, APIError>) -> Void) {
    URLSession.shared.dataTask(with: request) { data, response, error in
      if let error = error {
        DispatchQueue.main.async { completion(.failure(.networkError(error))) }
        return
      }

      guard let httpResponse = response as? HTTPURLResponse else {
        DispatchQueue.main.async { completion(.failure(.noData)) }
        return
      }

      guard let data = data else {
        DispatchQueue.main.async { completion(.failure(.noData)) }
        return
      }

      if httpResponse.statusCode == 401 {
        DispatchQueue.main.async { completion(.failure(.unauthorized)) }
        return
      }

      guard (200...299).contains(httpResponse.statusCode) else {
        let body = String(data: data, encoding: .utf8) ?? "Unknown error"
        DispatchQueue.main.async { completion(.failure(.serverError(httpResponse.statusCode, body))) }
        return
      }

      do {
        let decoded = try JSONDecoder().decode(T.self, from: data)
        DispatchQueue.main.async { completion(.success(decoded)) }
      } catch {
        DispatchQueue.main.async { completion(.failure(.decodingError)) }
      }
    }.resume()
  }
}
