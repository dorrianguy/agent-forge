import UIKit
import AuthenticationServices
import SafariServices

class NativeLoginViewController: UIViewController {

  private let scrollView = UIScrollView()
  private let contentView = UIView()
  private let logoLabel = UILabel()
  private let subtitleLabel = UILabel()
  private let emailField = UITextField()
  private let passwordField = UITextField()
  private let signInButton = UIButton(type: .system)
  private let appleSignInButton = ASAuthorizationAppleIDButton(type: .signIn, style: .white)
  private let dividerLabel = UILabel()
  private let createAccountButton = UIButton(type: .system)
  private let errorLabel = UILabel()
  private let spinner = UIActivityIndicatorView(style: .medium)

  private let accentColor = UIColor(red: 0.976, green: 0.451, blue: 0.086, alpha: 1.0) // #f97316
  private let bgColor = UIColor(red: 0.039, green: 0.039, blue: 0.039, alpha: 1.0) // #0a0a0a
  private let cardColor = UIColor(red: 0.102, green: 0.102, blue: 0.102, alpha: 1.0) // #1a1a1a
  private let borderColor = UIColor(red: 0.165, green: 0.165, blue: 0.165, alpha: 1.0) // #2a2a2a

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = bgColor
    navigationController?.setNavigationBarHidden(true, animated: false)
    setupUI()

    let tap = UITapGestureRecognizer(target: view, action: #selector(UIView.endEditing))
    view.addGestureRecognizer(tap)
  }

  override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

  private func setupUI() {
    scrollView.translatesAutoresizingMaskIntoConstraints = false
    contentView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(scrollView)
    scrollView.addSubview(contentView)

    NSLayoutConstraint.activate([
      scrollView.topAnchor.constraint(equalTo: view.topAnchor),
      scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

      contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
      contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
      contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
      contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
      contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
    ])

    // Logo
    logoLabel.text = "Agent Forge"
    logoLabel.textColor = .white
    logoLabel.font = .systemFont(ofSize: 32, weight: .bold)
    logoLabel.textAlignment = .center
    logoLabel.translatesAutoresizingMaskIntoConstraints = false
    contentView.addSubview(logoLabel)

    // Subtitle
    subtitleLabel.text = "Build and deploy AI agents"
    subtitleLabel.textColor = UIColor(white: 0.53, alpha: 1.0)
    subtitleLabel.font = .systemFont(ofSize: 16)
    subtitleLabel.textAlignment = .center
    subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
    contentView.addSubview(subtitleLabel)

    // Email field
    configureTextField(emailField, placeholder: "Email", keyboardType: .emailAddress)
    emailField.autocapitalizationType = .none
    emailField.textContentType = .emailAddress
    contentView.addSubview(emailField)

    // Password field
    configureTextField(passwordField, placeholder: "Password", keyboardType: .default)
    passwordField.isSecureTextEntry = true
    passwordField.textContentType = .password
    contentView.addSubview(passwordField)

    // Error label
    errorLabel.textColor = UIColor(red: 1, green: 0.3, blue: 0.3, alpha: 1)
    errorLabel.font = .systemFont(ofSize: 14)
    errorLabel.textAlignment = .center
    errorLabel.numberOfLines = 0
    errorLabel.isHidden = true
    errorLabel.translatesAutoresizingMaskIntoConstraints = false
    contentView.addSubview(errorLabel)

    // Sign In button
    signInButton.setTitle("Sign In", for: .normal)
    signInButton.setTitleColor(.white, for: .normal)
    signInButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
    signInButton.backgroundColor = accentColor
    signInButton.layer.cornerRadius = 8
    signInButton.translatesAutoresizingMaskIntoConstraints = false
    signInButton.addTarget(self, action: #selector(signInTapped), for: .touchUpInside)
    contentView.addSubview(signInButton)

    // Spinner
    spinner.color = .white
    spinner.translatesAutoresizingMaskIntoConstraints = false
    spinner.hidesWhenStopped = true
    contentView.addSubview(spinner)

    // Divider
    dividerLabel.text = "or"
    dividerLabel.textColor = UIColor(white: 0.53, alpha: 1.0)
    dividerLabel.font = .systemFont(ofSize: 14)
    dividerLabel.textAlignment = .center
    dividerLabel.translatesAutoresizingMaskIntoConstraints = false
    contentView.addSubview(dividerLabel)

    // Apple Sign In
    appleSignInButton.translatesAutoresizingMaskIntoConstraints = false
    appleSignInButton.cornerRadius = 8
    appleSignInButton.addTarget(self, action: #selector(appleSignInTapped), for: .touchUpInside)
    contentView.addSubview(appleSignInButton)

    // Create Account
    createAccountButton.setTitle("Don't have an account? Create one", for: .normal)
    createAccountButton.setTitleColor(accentColor, for: .normal)
    createAccountButton.titleLabel?.font = .systemFont(ofSize: 15)
    createAccountButton.translatesAutoresizingMaskIntoConstraints = false
    createAccountButton.addTarget(self, action: #selector(createAccountTapped), for: .touchUpInside)
    contentView.addSubview(createAccountButton)

    NSLayoutConstraint.activate([
      logoLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 120),
      logoLabel.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),

      subtitleLabel.topAnchor.constraint(equalTo: logoLabel.bottomAnchor, constant: 8),
      subtitleLabel.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),

      emailField.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 48),
      emailField.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 32),
      emailField.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -32),
      emailField.heightAnchor.constraint(equalToConstant: 50),

      passwordField.topAnchor.constraint(equalTo: emailField.bottomAnchor, constant: 16),
      passwordField.leadingAnchor.constraint(equalTo: emailField.leadingAnchor),
      passwordField.trailingAnchor.constraint(equalTo: emailField.trailingAnchor),
      passwordField.heightAnchor.constraint(equalToConstant: 50),

      errorLabel.topAnchor.constraint(equalTo: passwordField.bottomAnchor, constant: 12),
      errorLabel.leadingAnchor.constraint(equalTo: emailField.leadingAnchor),
      errorLabel.trailingAnchor.constraint(equalTo: emailField.trailingAnchor),

      signInButton.topAnchor.constraint(equalTo: errorLabel.bottomAnchor, constant: 12),
      signInButton.leadingAnchor.constraint(equalTo: emailField.leadingAnchor),
      signInButton.trailingAnchor.constraint(equalTo: emailField.trailingAnchor),
      signInButton.heightAnchor.constraint(equalToConstant: 50),

      spinner.centerXAnchor.constraint(equalTo: signInButton.centerXAnchor),
      spinner.centerYAnchor.constraint(equalTo: signInButton.centerYAnchor),

      dividerLabel.topAnchor.constraint(equalTo: signInButton.bottomAnchor, constant: 24),
      dividerLabel.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),

      appleSignInButton.topAnchor.constraint(equalTo: dividerLabel.bottomAnchor, constant: 24),
      appleSignInButton.leadingAnchor.constraint(equalTo: emailField.leadingAnchor),
      appleSignInButton.trailingAnchor.constraint(equalTo: emailField.trailingAnchor),
      appleSignInButton.heightAnchor.constraint(equalToConstant: 50),

      createAccountButton.topAnchor.constraint(equalTo: appleSignInButton.bottomAnchor, constant: 32),
      createAccountButton.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
      createAccountButton.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -40),
    ])
  }

  private func configureTextField(_ field: UITextField, placeholder: String, keyboardType: UIKeyboardType) {
    field.backgroundColor = cardColor
    field.textColor = .white
    field.keyboardType = keyboardType
    field.keyboardAppearance = .dark
    field.attributedPlaceholder = NSAttributedString(
      string: placeholder,
      attributes: [.foregroundColor: UIColor(white: 0.53, alpha: 1.0)]
    )
    field.layer.cornerRadius = 8
    field.layer.borderWidth = 1
    field.layer.borderColor = borderColor.cgColor
    field.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 0))
    field.leftViewMode = .always
    field.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 0))
    field.rightViewMode = .always
    field.translatesAutoresizingMaskIntoConstraints = false
  }

  private func setLoading(_ loading: Bool) {
    signInButton.isEnabled = !loading
    appleSignInButton.isEnabled = !loading
    if loading {
      signInButton.setTitle("", for: .normal)
      spinner.startAnimating()
    } else {
      signInButton.setTitle("Sign In", for: .normal)
      spinner.stopAnimating()
    }
  }

  private func showError(_ message: String) {
    errorLabel.text = message
    errorLabel.isHidden = false
  }

  // MARK: - Actions

  @objc private func signInTapped() {
    guard let email = emailField.text, !email.isEmpty,
          let password = passwordField.text, !password.isEmpty else {
      showError("Please enter your email and password.")
      return
    }

    errorLabel.isHidden = true
    setLoading(true)

    NativeAPIClient.shared.signIn(email: email, password: password) { [weak self] result in
      self?.setLoading(false)
      switch result {
      case .success:
        self?.navigateToAgentList()
      case .failure(let error):
        switch error {
        case .unauthorized:
          self?.showError("Invalid email or password.")
        case .serverError(_, let body):
          if body.contains("Invalid login") {
            self?.showError("Invalid email or password.")
          } else {
            self?.showError("Sign in failed. Please try again.")
          }
        case .networkError:
          self?.showError("Network error. Check your connection.")
        default:
          self?.showError("Sign in failed. Please try again.")
        }
      }
    }
  }

  @objc private func appleSignInTapped() {
    let provider = ASAuthorizationAppleIDProvider()
    let request = provider.createRequest()
    request.requestedScopes = [.email, .fullName]

    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self
    controller.performRequests()
  }

  @objc private func createAccountTapped() {
    guard let url = URL(string: "https://agent-forge.app/login") else { return }
    let safari = SFSafariViewController(url: url)
    safari.preferredBarTintColor = UIColor(red: 0.039, green: 0.039, blue: 0.039, alpha: 1.0)
    safari.preferredControlTintColor = accentColor
    present(safari, animated: true)
  }

  private func navigateToAgentList() {
    let tabBar = MainTabBarController()
    tabBar.modalPresentationStyle = .fullScreen
    if let window = view.window {
      UIView.transition(with: window, duration: 0.3, options: .transitionCrossDissolve) {
        window.rootViewController = tabBar
      }
    }
  }
}

// MARK: - ASAuthorizationControllerDelegate

extension NativeLoginViewController: ASAuthorizationControllerDelegate {
  func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
          let identityTokenData = credential.identityToken,
          let identityToken = String(data: identityTokenData, encoding: .utf8) else {
      showError("Failed to get Apple ID credentials.")
      return
    }

    setLoading(true)

    NativeAPIClient.shared.signInWithApple(identityToken: identityToken) { [weak self] result in
      self?.setLoading(false)
      switch result {
      case .success:
        self?.navigateToAgentList()
      case .failure:
        self?.showError("Apple Sign In failed. Please try again.")
      }
    }
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    if (error as? ASAuthorizationError)?.code == .canceled { return }
    showError("Apple Sign In was cancelled or failed.")
  }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding

extension NativeLoginViewController: ASAuthorizationControllerPresentationContextProviding {
  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    return view.window ?? UIWindow()
  }
}
