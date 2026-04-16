import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.overrideUserInterfaceStyle = .dark

        if NativeAPIClient.shared.isLoggedIn {
            window?.rootViewController = MainTabBarController()
        } else {
            let loginVC = NativeLoginViewController()
            window?.rootViewController = UINavigationController(rootViewController: loginVC)
        }

        window?.makeKeyAndVisible()

        // Handle deep links from launch
        if let urlContext = connectionOptions.urlContexts.first {
            handleDeepLink(urlContext.url)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        handleDeepLink(url)
    }

    // MARK: - Lifecycle

    func sceneWillResignActive(_ scene: UIScene) {}

    func sceneDidEnterBackground(_ scene: UIScene) {}

    func sceneWillEnterForeground(_ scene: UIScene) {}

    func sceneDidBecomeActive(_ scene: UIScene) {}

    // MARK: - Deep Linking

    private func handleDeepLink(_ url: URL) {
        NotificationCenter.default.post(
            name: Notification.Name("deepLinkReceived"),
            object: url
        )
    }
}
