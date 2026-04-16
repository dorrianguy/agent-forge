import UIKit
import WebKit

class WebViewController: UIViewController, WKNavigationDelegate {

  var urlString: String = "https://agent-forge.app"
  var pageTitle: String = "Agent Forge"

  private let webView = WKWebView()
  private let spinner = UIActivityIndicatorView(style: .medium)

  private let accentColor = UIColor(red: 0.976, green: 0.451, blue: 0.086, alpha: 1.0)
  private let bgColor = UIColor(red: 0.039, green: 0.039, blue: 0.039, alpha: 1.0)

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = bgColor
    title = pageTitle

    setupNavBar()
    setupWebView()
    injectAuthAndLoad()
  }

  private func setupNavBar() {
    navigationController?.navigationBar.barTintColor = bgColor
    navigationController?.navigationBar.titleTextAttributes = [.foregroundColor: UIColor.white]
    navigationController?.navigationBar.tintColor = accentColor
    navigationController?.navigationBar.barStyle = .black

    let closeButton = UIBarButtonItem(
      image: UIImage(systemName: "xmark.circle.fill"),
      style: .plain,
      target: self,
      action: #selector(closeTapped)
    )
    closeButton.tintColor = UIColor(white: 0.7, alpha: 1.0)
    navigationItem.leftBarButtonItem = closeButton
  }

  private func setupWebView() {
    webView.navigationDelegate = self
    webView.backgroundColor = bgColor
    webView.isOpaque = false
    webView.scrollView.backgroundColor = bgColor
    webView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(webView)

    spinner.color = accentColor
    spinner.translatesAutoresizingMaskIntoConstraints = false
    spinner.hidesWhenStopped = true
    view.addSubview(spinner)

    NSLayoutConstraint.activate([
      webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

      spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])
  }

  private func injectAuthAndLoad() {
    guard let url = URL(string: urlString) else { return }
    spinner.startAnimating()

    // Inject auth token as a cookie so the webview is logged in
    if let token = NativeAPIClient.shared.accessToken {
      let js = """
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        currentSession: {
          access_token: '\(token)',
          token_type: 'bearer'
        }
      }));
      """
      let script = WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true)
      webView.configuration.userContentController.addUserScript(script)
    }

    webView.load(URLRequest(url: url))
  }

  @objc private func closeTapped() {
    dismiss(animated: true)
  }

  // MARK: - WKNavigationDelegate

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    spinner.stopAnimating()
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    spinner.stopAnimating()
    showErrorState()
  }

  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    spinner.stopAnimating()
    showErrorState()
  }

  private func showErrorState() {
    let errorLabel = UILabel()
    errorLabel.text = "Unable to load content.\nPlease check your connection and try again."
    errorLabel.textColor = UIColor(white: 0.5, alpha: 1)
    errorLabel.font = .systemFont(ofSize: 16)
    errorLabel.numberOfLines = 0
    errorLabel.textAlignment = .center
    errorLabel.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(errorLabel)
    NSLayoutConstraint.activate([
      errorLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      errorLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      errorLabel.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 32),
    ])
  }
}
