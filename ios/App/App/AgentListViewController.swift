import UIKit

class AgentListViewController: UIViewController, UITableViewDataSource, UITableViewDelegate {

  private let tableView = UITableView(frame: .zero, style: .plain)
  private let refreshControl = UIRefreshControl()
  private let emptyLabel = UILabel()
  private var agents: [Agent] = []

  private let accentColor = UIColor(red: 0.976, green: 0.451, blue: 0.086, alpha: 1.0)
  private let bgColor = UIColor(red: 0.039, green: 0.039, blue: 0.039, alpha: 1.0)

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = bgColor
    title = "My Agents"

    setupNavBar()
    setupTableView()
    setupEmptyState()
    loadAgents()
  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    loadAgents()
  }

  private func setupNavBar() {
    navigationController?.navigationBar.prefersLargeTitles = true
    navigationController?.navigationBar.barTintColor = bgColor
    navigationController?.navigationBar.titleTextAttributes = [.foregroundColor: UIColor.white]
    navigationController?.navigationBar.largeTitleTextAttributes = [.foregroundColor: UIColor.white]
    navigationController?.navigationBar.isTranslucent = false
    navigationController?.navigationBar.barStyle = .black

    let addButton = UIBarButtonItem(
      image: UIImage(systemName: "plus.circle.fill"),
      style: .plain,
      target: self,
      action: #selector(buildAgentTapped)
    )
    addButton.tintColor = accentColor
    navigationItem.rightBarButtonItem = addButton
  }

  private func setupTableView() {
    tableView.backgroundColor = .clear
    tableView.separatorStyle = .none
    tableView.dataSource = self
    tableView.delegate = self
    tableView.register(AgentCell.self, forCellReuseIdentifier: AgentCell.reuseID)
    tableView.translatesAutoresizingMaskIntoConstraints = false
    tableView.contentInset = UIEdgeInsets(top: 8, left: 0, bottom: 8, right: 0)
    view.addSubview(tableView)

    refreshControl.tintColor = accentColor
    refreshControl.addTarget(self, action: #selector(refreshAgents), for: .valueChanged)
    tableView.refreshControl = refreshControl

    NSLayoutConstraint.activate([
      tableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
  }

  private func setupEmptyState() {
    emptyLabel.text = "No agents yet.\nTap + to build your first agent."
    emptyLabel.textColor = UIColor(white: 0.53, alpha: 1.0)
    emptyLabel.font = .systemFont(ofSize: 16)
    emptyLabel.textAlignment = .center
    emptyLabel.numberOfLines = 0
    emptyLabel.isHidden = true
    emptyLabel.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(emptyLabel)

    NSLayoutConstraint.activate([
      emptyLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      emptyLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      emptyLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 40),
      emptyLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -40),
    ])
  }

  private func loadAgents() {
    // Show cached first
    if let cached = NativeAPIClient.shared.loadCachedAgents(), !cached.isEmpty {
      agents = cached
      tableView.reloadData()
      emptyLabel.isHidden = true
    }

    NativeAPIClient.shared.listAgents { [weak self] result in
      self?.refreshControl.endRefreshing()
      switch result {
      case .success(let agents):
        self?.agents = agents
        self?.tableView.reloadData()
        self?.emptyLabel.isHidden = !agents.isEmpty
      case .failure(let error):
        if self?.agents.isEmpty == true {
          self?.emptyLabel.isHidden = false
        }
        if case .unauthorized = error {
          self?.handleUnauthorized()
        }
      }
    }
  }

  @objc private func refreshAgents() {
    loadAgents()
  }

  @objc private func buildAgentTapped() {
    let webVC = WebViewController()
    webVC.urlString = "https://agent-forge.app/dashboard/agents/new"
    webVC.pageTitle = "Build Agent"
    let nav = UINavigationController(rootViewController: webVC)
    nav.modalPresentationStyle = .fullScreen
    present(nav, animated: true)
  }

  private func handleUnauthorized() {
    NativeAPIClient.shared.refreshToken { [weak self] result in
      switch result {
      case .success:
        self?.loadAgents()
      case .failure:
        NativeAPIClient.shared.signOut()
        let login = NativeLoginViewController()
        let nav = UINavigationController(rootViewController: login)
        nav.modalPresentationStyle = .fullScreen
        if let window = self?.view.window {
          UIView.transition(with: window, duration: 0.3, options: .transitionCrossDissolve) {
            window.rootViewController = nav
          }
        }
      }
    }
  }

  // MARK: - UITableViewDataSource

  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return agents.count
  }

  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: AgentCell.reuseID, for: indexPath) as! AgentCell
    cell.configure(with: agents[indexPath.row])
    return cell
  }

  // MARK: - UITableViewDelegate

  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    tableView.deselectRow(at: indexPath, animated: true)
    let agent = agents[indexPath.row]

    let generator = UIImpactFeedbackGenerator(style: .light)
    generator.impactOccurred()

    let chatVC = NativeChatViewController()
    chatVC.agentName = agent.name
    chatVC.agentId = agent.id
    chatVC.modalPresentationStyle = .fullScreen
    present(chatVC, animated: true)
  }
}

// MARK: - Agent Cell

class AgentCell: UITableViewCell {
  static let reuseID = "AgentCell"

  private let cardView = UIView()
  private let nameLabel = UILabel()
  private let descLabel = UILabel()
  private let statusDot = UIView()
  private let statusLabel = UILabel()
  private let chevron = UIImageView()

  private let cardColor = UIColor(red: 0.102, green: 0.102, blue: 0.102, alpha: 1.0)
  private let borderColor = UIColor(red: 0.165, green: 0.165, blue: 0.165, alpha: 1.0)
  private let accentColor = UIColor(red: 0.976, green: 0.451, blue: 0.086, alpha: 1.0)

  override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
    super.init(style: style, reuseIdentifier: reuseIdentifier)
    backgroundColor = .clear
    selectionStyle = .none

    cardView.backgroundColor = cardColor
    cardView.layer.cornerRadius = 12
    cardView.layer.borderWidth = 1
    cardView.layer.borderColor = borderColor.cgColor
    cardView.translatesAutoresizingMaskIntoConstraints = false
    contentView.addSubview(cardView)

    nameLabel.textColor = .white
    nameLabel.font = .systemFont(ofSize: 17, weight: .semibold)
    nameLabel.translatesAutoresizingMaskIntoConstraints = false
    cardView.addSubview(nameLabel)

    descLabel.textColor = UIColor(white: 0.53, alpha: 1.0)
    descLabel.font = .systemFont(ofSize: 14)
    descLabel.numberOfLines = 2
    descLabel.translatesAutoresizingMaskIntoConstraints = false
    cardView.addSubview(descLabel)

    statusDot.layer.cornerRadius = 4
    statusDot.translatesAutoresizingMaskIntoConstraints = false
    cardView.addSubview(statusDot)

    statusLabel.font = .systemFont(ofSize: 12)
    statusLabel.translatesAutoresizingMaskIntoConstraints = false
    cardView.addSubview(statusLabel)

    chevron.image = UIImage(systemName: "chevron.right")
    chevron.tintColor = UIColor(white: 0.4, alpha: 1.0)
    chevron.translatesAutoresizingMaskIntoConstraints = false
    cardView.addSubview(chevron)

    NSLayoutConstraint.activate([
      cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
      cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
      cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
      cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),

      nameLabel.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 16),
      nameLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 16),
      nameLabel.trailingAnchor.constraint(equalTo: chevron.leadingAnchor, constant: -8),

      descLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 4),
      descLabel.leadingAnchor.constraint(equalTo: nameLabel.leadingAnchor),
      descLabel.trailingAnchor.constraint(equalTo: nameLabel.trailingAnchor),

      statusDot.topAnchor.constraint(equalTo: descLabel.bottomAnchor, constant: 10),
      statusDot.leadingAnchor.constraint(equalTo: nameLabel.leadingAnchor),
      statusDot.widthAnchor.constraint(equalToConstant: 8),
      statusDot.heightAnchor.constraint(equalToConstant: 8),
      statusDot.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -16),

      statusLabel.centerYAnchor.constraint(equalTo: statusDot.centerYAnchor),
      statusLabel.leadingAnchor.constraint(equalTo: statusDot.trailingAnchor, constant: 6),

      chevron.centerYAnchor.constraint(equalTo: cardView.centerYAnchor),
      chevron.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -16),
      chevron.widthAnchor.constraint(equalToConstant: 12),
      chevron.heightAnchor.constraint(equalToConstant: 16),
    ])
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  func configure(with agent: Agent) {
    nameLabel.text = agent.name
    descLabel.text = agent.description ?? "No description"

    let isActive = agent.status == "active" || agent.status == "deployed"
    statusDot.backgroundColor = isActive
      ? UIColor(red: 0.2, green: 0.8, blue: 0.4, alpha: 1.0)
      : UIColor(white: 0.4, alpha: 1.0)
    statusLabel.text = agent.status?.capitalized ?? "Draft"
    statusLabel.textColor = isActive
      ? UIColor(red: 0.2, green: 0.8, blue: 0.4, alpha: 1.0)
      : UIColor(white: 0.4, alpha: 1.0)
  }
}
