import Capacitor
import UIKit

@objc(NativeChatPlugin)
public class NativeChatPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeChatPlugin"
    public let jsName = "NativeChat"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openChat", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getConversationHistory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveMessage", returnType: CAPPluginReturnPromise),
    ]

    @objc func openChat(_ call: CAPPluginCall) {
        let agentName = call.getString("agentName") ?? "AI Agent"
        let agentId = call.getString("agentId") ?? ""

        DispatchQueue.main.async {
            let chatVC = NativeChatViewController()
            chatVC.agentName = agentName
            chatVC.agentId = agentId
            chatVC.modalPresentationStyle = .fullScreen
            self.bridge?.viewController?.present(chatVC, animated: true)
        }

        call.resolve(["opened": true])
    }

    @objc func getConversationHistory(_ call: CAPPluginCall) {
        let agentId = call.getString("agentId") ?? ""
        let messages = ChatStorage.shared.getMessages(for: agentId)
        let mapped = messages.map { msg -> [String: Any] in
            return [
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp
            ]
        }
        call.resolve(["messages": mapped])
    }

    @objc func saveMessage(_ call: CAPPluginCall) {
        guard let agentId = call.getString("agentId"),
              let role = call.getString("role"),
              let content = call.getString("content") else {
            call.reject("Missing required parameters")
            return
        }

        let message = ChatMessage(
            id: UUID().uuidString,
            role: role,
            content: content,
            timestamp: ISO8601DateFormatter().string(from: Date())
        )
        ChatStorage.shared.saveMessage(message, for: agentId)
        call.resolve(["saved": true])
    }
}
