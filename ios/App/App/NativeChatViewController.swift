import UIKit

struct ChatMessage: Codable {
    let id: String
    let role: String
    let content: String
    let timestamp: String
}

class ChatStorage {
    static let shared = ChatStorage()
    private let defaults = UserDefaults.standard

    func getMessages(for agentId: String) -> [ChatMessage] {
        guard let data = defaults.data(forKey: "chat_\(agentId)"),
              let messages = try? JSONDecoder().decode([ChatMessage].self, from: data) else {
            return []
        }
        return messages
    }

    func saveMessage(_ message: ChatMessage, for agentId: String) {
        var messages = getMessages(for: agentId)
        messages.append(message)
        if let data = try? JSONEncoder().encode(messages) {
            defaults.set(data, forKey: "chat_\(agentId)")
        }
    }

    func clearMessages(for agentId: String) {
        defaults.removeObject(forKey: "chat_\(agentId)")
    }
}

class NativeChatViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UITextFieldDelegate {

    var agentName: String = "AI Agent"
    var agentId: String = ""

    private var messages: [ChatMessage] = []
    private let tableView = UITableView()
    private let inputContainer = UIView()
    private let textField = UITextField()
    private let sendButton = UIButton(type: .system)
    private let headerView = UIView()
    private let closeButton = UIButton(type: .system)
    private let titleLabel = UILabel()
    private let statusDot = UIView()
    private let statusLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.05, green: 0.05, blue: 0.08, alpha: 1.0)

        setupHeader()
        setupTableView()
        setupInputBar()
        loadMessages()

        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillShow), name: UIResponder.keyboardWillShowNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillHide), name: UIResponder.keyboardWillHideNotification, object: nil)
    }

    private func setupHeader() {
        headerView.backgroundColor = UIColor(red: 0.08, green: 0.08, blue: 0.12, alpha: 1.0)
        headerView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(headerView)

        closeButton.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeButton.tintColor = .white.withAlphaComponent(0.7)
        closeButton.addTarget(self, action: #selector(dismissChat), for: .touchUpInside)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(closeButton)

        titleLabel.text = agentName
        titleLabel.textColor = .white
        titleLabel.font = .boldSystemFont(ofSize: 18)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(titleLabel)

        statusDot.backgroundColor = UIColor(red: 0.2, green: 0.8, blue: 0.4, alpha: 1.0)
        statusDot.layer.cornerRadius = 5
        statusDot.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(statusDot)

        statusLabel.text = "Online"
        statusLabel.textColor = .white.withAlphaComponent(0.5)
        statusLabel.font = .systemFont(ofSize: 13)
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(statusLabel)

        NSLayoutConstraint.activate([
            headerView.topAnchor.constraint(equalTo: view.topAnchor),
            headerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            headerView.heightAnchor.constraint(equalToConstant: 100),

            closeButton.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 16),
            closeButton.bottomAnchor.constraint(equalTo: headerView.bottomAnchor, constant: -12),
            closeButton.widthAnchor.constraint(equalToConstant: 30),
            closeButton.heightAnchor.constraint(equalToConstant: 30),

            titleLabel.centerXAnchor.constraint(equalTo: headerView.centerXAnchor),
            titleLabel.bottomAnchor.constraint(equalTo: statusDot.topAnchor, constant: -4),

            statusDot.centerXAnchor.constraint(equalTo: headerView.centerXAnchor, constant: -25),
            statusDot.bottomAnchor.constraint(equalTo: headerView.bottomAnchor, constant: -14),
            statusDot.widthAnchor.constraint(equalToConstant: 10),
            statusDot.heightAnchor.constraint(equalToConstant: 10),

            statusLabel.leadingAnchor.constraint(equalTo: statusDot.trailingAnchor, constant: 6),
            statusLabel.centerYAnchor.constraint(equalTo: statusDot.centerYAnchor),
        ])
    }

    private func setupTableView() {
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.dataSource = self
        tableView.delegate = self
        tableView.register(ChatBubbleCell.self, forCellReuseIdentifier: "ChatBubbleCell")
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.keyboardDismissMode = .interactive
        view.addSubview(tableView)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: headerView.bottomAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }

    private func setupInputBar() {
        inputContainer.backgroundColor = UIColor(red: 0.08, green: 0.08, blue: 0.12, alpha: 1.0)
        inputContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(inputContainer)

        textField.backgroundColor = UIColor(red: 0.15, green: 0.15, blue: 0.2, alpha: 1.0)
        textField.textColor = .white
        textField.attributedPlaceholder = NSAttributedString(string: "Message \(agentName)...", attributes: [.foregroundColor: UIColor.white.withAlphaComponent(0.4)])
        textField.layer.cornerRadius = 20
        textField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 0))
        textField.leftViewMode = .always
        textField.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 0))
        textField.rightViewMode = .always
        textField.delegate = self
        textField.returnKeyType = .send
        textField.translatesAutoresizingMaskIntoConstraints = false
        inputContainer.addSubview(textField)

        sendButton.setImage(UIImage(systemName: "arrow.up.circle.fill"), for: .normal)
        sendButton.tintColor = UIColor(red: 0.97, green: 0.45, blue: 0.09, alpha: 1.0)
        sendButton.addTarget(self, action: #selector(sendMessage), for: .touchUpInside)
        sendButton.translatesAutoresizingMaskIntoConstraints = false
        inputContainer.addSubview(sendButton)

        NSLayoutConstraint.activate([
            tableView.bottomAnchor.constraint(equalTo: inputContainer.topAnchor),

            inputContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            inputContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            inputContainer.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            inputContainer.heightAnchor.constraint(equalToConstant: 60),

            textField.leadingAnchor.constraint(equalTo: inputContainer.leadingAnchor, constant: 16),
            textField.trailingAnchor.constraint(equalTo: sendButton.leadingAnchor, constant: -8),
            textField.centerYAnchor.constraint(equalTo: inputContainer.centerYAnchor),
            textField.heightAnchor.constraint(equalToConstant: 40),

            sendButton.trailingAnchor.constraint(equalTo: inputContainer.trailingAnchor, constant: -16),
            sendButton.centerYAnchor.constraint(equalTo: inputContainer.centerYAnchor),
            sendButton.widthAnchor.constraint(equalToConstant: 36),
            sendButton.heightAnchor.constraint(equalToConstant: 36),
        ])
    }

    private func loadMessages() {
        messages = ChatStorage.shared.getMessages(for: agentId)
        if messages.isEmpty {
            let welcome = ChatMessage(
                id: UUID().uuidString,
                role: "assistant",
                content: "Hi! I'm \(agentName). How can I help you today?",
                timestamp: ISO8601DateFormatter().string(from: Date())
            )
            messages.append(welcome)
            ChatStorage.shared.saveMessage(welcome, for: agentId)
        }
        tableView.reloadData()
        scrollToBottom()
    }

    @objc private func sendMessage() {
        guard let text = textField.text, !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }

        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()

        let userMessage = ChatMessage(id: UUID().uuidString, role: "user", content: text, timestamp: ISO8601DateFormatter().string(from: Date()))
        messages.append(userMessage)
        ChatStorage.shared.saveMessage(userMessage, for: agentId)
        textField.text = ""
        tableView.reloadData()
        scrollToBottom()

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            guard let self = self else { return }
            let responses = [
                "I understand your question. Let me help you with that.",
                "Great question! Here's what I can tell you...",
                "I've analyzed your request. Here's my recommendation:",
                "Thanks for reaching out! I'm processing your request now.",
                "That's a great point. Let me provide some insights on that.",
            ]
            let response = ChatMessage(
                id: UUID().uuidString,
                role: "assistant",
                content: responses.randomElement() ?? "I'm here to help!",
                timestamp: ISO8601DateFormatter().string(from: Date())
            )
            self.messages.append(response)
            ChatStorage.shared.saveMessage(response, for: self.agentId)

            let notif = UINotificationFeedbackGenerator()
            notif.notificationOccurred(.success)

            self.tableView.reloadData()
            self.scrollToBottom()
        }
    }

    private func scrollToBottom() {
        guard !messages.isEmpty else { return }
        let indexPath = IndexPath(row: messages.count - 1, section: 0)
        tableView.scrollToRow(at: indexPath, at: .bottom, animated: true)
    }

    @objc private func dismissChat() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        dismiss(animated: true)
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        sendMessage()
        return false
    }

    @objc private func keyboardWillShow(_ notification: Notification) {
        if let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect {
            let offset = keyboardFrame.height - view.safeAreaInsets.bottom
            UIView.animate(withDuration: 0.25) {
                self.view.frame.origin.y = -offset
            }
        }
    }

    @objc private func keyboardWillHide(_ notification: Notification) {
        UIView.animate(withDuration: 0.25) {
            self.view.frame.origin.y = 0
        }
    }

    // MARK: - UITableViewDataSource
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { messages.count }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "ChatBubbleCell", for: indexPath) as! ChatBubbleCell
        cell.configure(with: messages[indexPath.row])
        return cell
    }
}

class ChatBubbleCell: UITableViewCell {
    private let bubbleView = UIView()
    private let messageLabel = UILabel()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        backgroundColor = .clear
        selectionStyle = .none

        bubbleView.layer.cornerRadius = 16
        bubbleView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(bubbleView)

        messageLabel.numberOfLines = 0
        messageLabel.font = .systemFont(ofSize: 16)
        messageLabel.translatesAutoresizingMaskIntoConstraints = false
        bubbleView.addSubview(messageLabel)

        NSLayoutConstraint.activate([
            bubbleView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 4),
            bubbleView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -4),
            bubbleView.widthAnchor.constraint(lessThanOrEqualTo: contentView.widthAnchor, multiplier: 0.75),

            messageLabel.topAnchor.constraint(equalTo: bubbleView.topAnchor, constant: 10),
            messageLabel.bottomAnchor.constraint(equalTo: bubbleView.bottomAnchor, constant: -10),
            messageLabel.leadingAnchor.constraint(equalTo: bubbleView.leadingAnchor, constant: 14),
            messageLabel.trailingAnchor.constraint(equalTo: bubbleView.trailingAnchor, constant: -14),
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private var leadingConstraint: NSLayoutConstraint?
    private var trailingConstraint: NSLayoutConstraint?

    func configure(with message: ChatMessage) {
        messageLabel.text = message.content

        leadingConstraint?.isActive = false
        trailingConstraint?.isActive = false

        if message.role == "user" {
            bubbleView.backgroundColor = UIColor(red: 0.97, green: 0.45, blue: 0.09, alpha: 1.0)
            messageLabel.textColor = .white
            trailingConstraint = bubbleView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16)
            trailingConstraint?.isActive = true
        } else {
            bubbleView.backgroundColor = UIColor(red: 0.15, green: 0.15, blue: 0.2, alpha: 1.0)
            messageLabel.textColor = .white.withAlphaComponent(0.9)
            leadingConstraint = bubbleView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16)
            leadingConstraint?.isActive = true
        }
    }
}
