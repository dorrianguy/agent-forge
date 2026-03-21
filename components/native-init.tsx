'use client';

import { useEffect } from 'react';
import { isNative, isIOS } from '@/lib/platform';
import { registerPushNotifications } from '@/lib/native-features';
import { initializeIAP } from '@/lib/iap';

export default function NativeInit() {
  useEffect(() => {
    if (!isNative()) return;

    const init = async () => {
      // Register for push notifications
      await registerPushNotifications();

      // Initialize In-App Purchases on iOS
      if (isIOS()) {
        try {
          await initializeIAP();
        } catch (error) {
          console.error('IAP initialization failed:', error);
        }
      }

      // Schedule a local notification for engagement
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const perms = await LocalNotifications.requestPermissions();
        if (perms.display === 'granted') {
          // Clear any pending notifications on launch
          const pending = await LocalNotifications.getPending();
          if (pending.notifications.length > 0) {
            await LocalNotifications.cancel(pending);
          }
        }
      } catch { /* notification permission not available */ }
    };

    init();
  }, []);

  return null;
}
