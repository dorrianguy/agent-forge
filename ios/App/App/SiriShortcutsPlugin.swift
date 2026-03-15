import Capacitor
import Intents
import UIKit

@objc(SiriShortcutsPlugin)
public class SiriShortcutsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SiriShortcutsPlugin"
    public let jsName = "SiriShortcuts"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "donate", returnType: CAPPluginReturnPromise),
    ]

    @objc func donate(_ call: CAPPluginCall) {
        let activityType = call.getString("activityType") ?? "com.agentforge.app.chat"
        let title = call.getString("title") ?? "Chat with Agent"
        let agentName = call.getString("agentName") ?? "AI Agent"

        let activity = NSUserActivity(activityType: activityType)
        activity.title = title
        activity.userInfo = ["agentName": agentName]
        activity.isEligibleForSearch = true
        activity.isEligibleForPrediction = true
        activity.suggestedInvocationPhrase = "Chat with \(agentName)"
        activity.persistentIdentifier = activityType

        DispatchQueue.main.async {
            self.bridge?.viewController?.userActivity = activity
            activity.becomeCurrent()
        }

        call.resolve(["donated": true])
    }
}
