import UIKit

class MainTabBarController: UITabBarController {

  private let accentColor = UIColor(red: 0.976, green: 0.451, blue: 0.086, alpha: 1.0)
  private let bgColor = UIColor(red: 0.039, green: 0.039, blue: 0.039, alpha: 1.0)

  override func viewDidLoad() {
    super.viewDidLoad()

    let appearance = UITabBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = UIColor(red: 0.06, green: 0.06, blue: 0.06, alpha: 1.0)

    appearance.stackedLayoutAppearance.normal.iconColor = UIColor(white: 0.4, alpha: 1.0)
    appearance.stackedLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: UIColor(white: 0.4, alpha: 1.0)]
    appearance.stackedLayoutAppearance.selected.iconColor = accentColor
    appearance.stackedLayoutAppearance.selected.titleTextAttributes = [.foregroundColor: accentColor]

    tabBar.standardAppearance = appearance
    tabBar.scrollEdgeAppearance = appearance

    let agentsNav = UINavigationController(rootViewController: AgentListViewController())
    agentsNav.tabBarItem = UITabBarItem(title: "Agents", image: UIImage(systemName: "cpu"), selectedImage: UIImage(systemName: "cpu.fill"))

    let dashboardVC = DashboardWebViewController()
    dashboardVC.tabBarItem = UITabBarItem(title: "Dashboard", image: UIImage(systemName: "square.grid.2x2"), selectedImage: UIImage(systemName: "square.grid.2x2.fill"))

    let settingsNav = UINavigationController(rootViewController: NativeSettingsViewController())
    settingsNav.tabBarItem = UITabBarItem(title: "Settings", image: UIImage(systemName: "gearshape"), selectedImage: UIImage(systemName: "gearshape.fill"))

    viewControllers = [agentsNav, dashboardVC, settingsNav]
  }
}

// A lightweight dashboard tab that opens the webview for the full dashboard
class DashboardWebViewController: UIViewController {

  private let accentColor = UIColor(red: 0.976, green: 0.451, blue: 0.086, alpha: 1.0)
  private let bgColor = UIColor(red: 0.039, green: 0.039, blue: 0.039, alpha: 1.0)

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = bgColor

    let label = UILabel()
    label.text = "Dashboard"
    label.textColor = .white
    label.font = .systemFont(ofSize: 28, weight: .bold)
    label.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(label)

    let subtitleLabel = UILabel()
    subtitleLabel.text = "Manage your agents, analytics, and more"
    subtitleLabel.textColor = UIColor(white: 0.53, alpha: 1.0)
    subtitleLabel.font = .systemFont(ofSize: 15)
    subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(subtitleLabel)

    let openButton = UIButton(type: .system)
    openButton.setTitle("Open Full Dashboard", for: .normal)
    openButton.setTitleColor(.white, for: .normal)
    openButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
    openButton.backgroundColor = accentColor
    openButton.layer.cornerRadius = 8
    openButton.translatesAutoresizingMaskIntoConstraints = false
    openButton.addTarget(self, action: #selector(openDashboard), for: .touchUpInside)
    view.addSubview(openButton)

    NSLayoutConstraint.activate([
      label.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 32),
      label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),

      subtitleLabel.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 8),
      subtitleLabel.leadingAnchor.constraint(equalTo: label.leadingAnchor),

      openButton.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 32),
      openButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
      openButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
      openButton.heightAnchor.constraint(equalToConstant: 50),
    ])
  }

  @objc private func openDashboard() {
    // Switch to the My Agents tab (index 0) which shows agent list natively
    selectedIndex = 0
  }
}
