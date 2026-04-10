import UIKit
import LocalAuthentication

class NativeSettingsViewController: UIViewController, UITableViewDataSource, UITableViewDelegate {

  private let tableView = UITableView(frame: .zero, style: .insetGrouped)

  private let accentColor = UIColor(red: 0.976, green: 0.451, blue: 0.086, alpha: 1.0)
  private let bgColor = UIColor(red: 0.039, green: 0.039, blue: 0.039, alpha: 1.0)
  private let cardColor = UIColor(red: 0.102, green: 0.102, blue: 0.102, alpha: 1.0)

  private let faceIDKey = "settings_faceid_enabled"
  private let notificationsKey = "settings_notifications_enabled"

  enum Section: Int, CaseIterable {
    case account
    case security
    case subscription
    case about
    case dangerZone
    case signOut
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = bgColor
    title = "Settings"

    setupNavBar()
    setupTableView()
  }

  private func setupNavBar() {
    navigationController?.navigationBar.prefersLargeTitles = true
    navigationController?.navigationBar.barTintColor = bgColor
    navigationController?.navigationBar.titleTextAttributes = [.foregroundColor: UIColor.white]
    navigationController?.navigationBar.largeTitleTextAttributes = [.foregroundColor: UIColor.white]
    navigationController?.navigationBar.barStyle = .black
  }

  private func setupTableView() {
    tableView.backgroundColor = .clear
    tableView.dataSource = self
    tableView.delegate = self
    tableView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(tableView)

    NSLayoutConstraint.activate([
      tableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
  }

  // MARK: - UITableViewDataSource

  func numberOfSections(in tableView: UITableView) -> Int {
    return Section.allCases.count
  }

  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    switch Section(rawValue: section)! {
    case .account: return 1
    case .security: return 2
    case .subscription: return 2
    case .about: return 1
    case .dangerZone: return 1
    case .signOut: return 1
    }
  }

  func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
    switch Section(rawValue: section)! {
    case .account: return "Account"
    case .security: return "Security"
    case .subscription: return "Subscription"
    case .about: return "About"
    case .dangerZone: return "Danger Zone"
    case .signOut: return nil
    }
  }

  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let section = Section(rawValue: indexPath.section)!

    switch section {
    case .account:
      let cell = makeCell()
      cell.textLabel?.text = NativeAPIClient.shared.currentUserEmail ?? "Not signed in"
      cell.textLabel?.textColor = .white
      cell.imageView?.image = UIImage(systemName: "person.circle")
      cell.imageView?.tintColor = accentColor
      cell.selectionStyle = .none
      return cell

    case .security:
      if indexPath.row == 0 {
        let cell = makeCell()
        cell.textLabel?.text = "Face ID Lock"
        cell.textLabel?.textColor = .white
        cell.imageView?.image = UIImage(systemName: "faceid")
        cell.imageView?.tintColor = accentColor
        let toggle = UISwitch()
        toggle.isOn = UserDefaults.standard.bool(forKey: faceIDKey)
        toggle.onTintColor = accentColor
        toggle.tag = 0
        toggle.addTarget(self, action: #selector(toggleChanged(_:)), for: .valueChanged)
        cell.accessoryView = toggle
        cell.selectionStyle = .none
        return cell
      } else {
        let cell = makeCell()
        cell.textLabel?.text = "Notifications"
        cell.textLabel?.textColor = .white
        cell.imageView?.image = UIImage(systemName: "bell.fill")
        cell.imageView?.tintColor = accentColor
        let toggle = UISwitch()
        toggle.isOn = UserDefaults.standard.bool(forKey: notificationsKey)
        toggle.onTintColor = accentColor
        toggle.tag = 1
        toggle.addTarget(self, action: #selector(toggleChanged(_:)), for: .valueChanged)
        cell.accessoryView = toggle
        cell.selectionStyle = .none
        return cell
      }

    case .subscription:
      if indexPath.row == 0 {
        let cell = makeCell()
        cell.textLabel?.text = "Current Plan"
        cell.textLabel?.textColor = .white
        cell.imageView?.image = UIImage(systemName: "creditcard")
        cell.imageView?.tintColor = accentColor
        let planLabel = UILabel()
        planLabel.text = "Free"
        planLabel.textColor = UIColor(white: 0.53, alpha: 1.0)
        planLabel.font = .systemFont(ofSize: 15)
        planLabel.sizeToFit()
        cell.accessoryView = planLabel
        cell.selectionStyle = .none
        return cell
      } else {
        let cell = makeCell()
        cell.textLabel?.text = "Manage Subscription"
        cell.textLabel?.textColor = accentColor
        cell.imageView?.image = UIImage(systemName: "arrow.up.right.square")
        cell.imageView?.tintColor = accentColor
        return cell
      }

    case .about:
      let cell = makeCell()
      cell.textLabel?.text = "Version"
      cell.textLabel?.textColor = .white
      cell.imageView?.image = UIImage(systemName: "info.circle")
      cell.imageView?.tintColor = accentColor
      let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
      let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "7"
      let versionLabel = UILabel()
      versionLabel.text = "\(version) (\(build))"
      versionLabel.textColor = UIColor(white: 0.53, alpha: 1.0)
      versionLabel.font = .systemFont(ofSize: 15)
      versionLabel.sizeToFit()
      cell.accessoryView = versionLabel
      cell.selectionStyle = .none
      return cell

    case .dangerZone:
      let cell = makeCell()
      cell.textLabel?.text = "Delete Account"
      cell.textLabel?.textColor = UIColor(red: 1, green: 0.3, blue: 0.3, alpha: 1)
      cell.imageView?.image = UIImage(systemName: "trash")
      cell.imageView?.tintColor = UIColor(red: 1, green: 0.3, blue: 0.3, alpha: 1)
      return cell

    case .signOut:
      let cell = makeCell()
      cell.textLabel?.text = "Sign Out"
      cell.textLabel?.textColor = UIColor(red: 1, green: 0.3, blue: 0.3, alpha: 1)
      cell.textLabel?.textAlignment = .center
      cell.imageView?.image = UIImage(systemName: "rectangle.portrait.and.arrow.right")
      cell.imageView?.tintColor = UIColor(red: 1, green: 0.3, blue: 0.3, alpha: 1)
      return cell
    }
  }

  // MARK: - UITableViewDelegate

  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    tableView.deselectRow(at: indexPath, animated: true)
    let section = Section(rawValue: indexPath.section)!

    switch section {
    case .subscription where indexPath.row == 1:
      if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
        UIApplication.shared.open(url)
      }
    case .dangerZone:
      confirmDeleteAccount()
    case .signOut:
      confirmSignOut()
    default:
      break
    }
  }

  func tableView(_ tableView: UITableView, willDisplayHeaderView view: UIView, forSection section: Int) {
    if let header = view as? UITableViewHeaderFooterView {
      header.textLabel?.textColor = UIColor(white: 0.53, alpha: 1.0)
    }
  }

  // MARK: - Helpers

  private func makeCell() -> UITableViewCell {
    let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
    cell.backgroundColor = cardColor
    return cell
  }

  @objc private func toggleChanged(_ sender: UISwitch) {
    if sender.tag == 0 {
      // Face ID toggle
      if sender.isOn {
        let context = LAContext()
        var error: NSError?
        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
          context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Enable Face ID lock") { success, _ in
            DispatchQueue.main.async {
              if success {
                UserDefaults.standard.set(true, forKey: self.faceIDKey)
              } else {
                sender.setOn(false, animated: true)
              }
            }
          }
        } else {
          sender.setOn(false, animated: true)
          let alert = UIAlertController(title: "Unavailable", message: "Biometric authentication is not available on this device.", preferredStyle: .alert)
          alert.addAction(UIAlertAction(title: "OK", style: .default))
          present(alert, animated: true)
        }
      } else {
        UserDefaults.standard.set(false, forKey: faceIDKey)
      }
    } else {
      // Notifications toggle
      UserDefaults.standard.set(sender.isOn, forKey: notificationsKey)
      if sender.isOn {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
          DispatchQueue.main.async {
            if !granted {
              sender.setOn(false, animated: true)
              UserDefaults.standard.set(false, forKey: self.notificationsKey)
            }
          }
        }
      }
    }
  }

  private func confirmDeleteAccount() {
    let alert = UIAlertController(
      title: "Delete Account",
      message: "Are you sure? This will permanently delete your account and all data. This action cannot be undone.",
      preferredStyle: .alert
    )
    alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
    alert.addAction(UIAlertAction(title: "Delete Account", style: .destructive) { [weak self] _ in
      self?.performAccountDeletion()
    })
    present(alert, animated: true)
  }

  private func performAccountDeletion() {
    let spinner = UIActivityIndicatorView(style: .medium)
    spinner.color = .white
    spinner.startAnimating()
    navigationItem.rightBarButtonItem = UIBarButtonItem(customView: spinner)

    NativeAPIClient.shared.deleteAccount { [weak self] result in
      spinner.stopAnimating()
      self?.navigationItem.rightBarButtonItem = nil

      switch result {
      case .success:
        let login = NativeLoginViewController()
        let nav = UINavigationController(rootViewController: login)
        if let window = self?.view.window {
          UIView.transition(with: window, duration: 0.3, options: .transitionCrossDissolve) {
            window.rootViewController = nav
          }
        }
      case .failure(let error):
        let message: String
        switch error {
        case .networkError:
          message = "Network error. Please check your connection and try again."
        case .unauthorized:
          message = "Your session has expired. Please sign in again."
        default:
          message = "Failed to delete account. Please try again later."
        }
        let errorAlert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        errorAlert.addAction(UIAlertAction(title: "OK", style: .default))
        self?.present(errorAlert, animated: true)
      }
    }
  }

  private func confirmSignOut() {
    let alert = UIAlertController(title: "Sign Out", message: "Are you sure you want to sign out?", preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
    alert.addAction(UIAlertAction(title: "Sign Out", style: .destructive) { [weak self] _ in
      NativeAPIClient.shared.signOut()
      let login = NativeLoginViewController()
      let nav = UINavigationController(rootViewController: login)
      if let window = self?.view.window {
        UIView.transition(with: window, duration: 0.3, options: .transitionCrossDissolve) {
          window.rootViewController = nav
        }
      }
    })
    present(alert, animated: true)
  }
}
