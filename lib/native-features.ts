import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { PushNotifications } from '@capacitor/push-notifications';
import { isNative } from './platform';

export const hapticFeedback = async (
  style: 'light' | 'medium' | 'heavy' = 'medium',
): Promise<void> => {
  if (!isNative()) return;
  const map = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  };
  await Haptics.impact({ style: map[style] });
};

export const hapticNotification = async (
  type: 'success' | 'warning' | 'error' = 'success',
): Promise<void> => {
  if (!isNative()) return;
  const map = {
    success: NotificationType.Success,
    warning: NotificationType.Warning,
    error: NotificationType.Error,
  };
  await Haptics.notification({ type: map[type] });
};

export const shareContent = async (
  title: string,
  text: string,
  url?: string,
): Promise<void> => {
  if (!isNative()) {
    if (navigator.share) {
      await navigator.share({ title, text, url });
    }
    return;
  }
  await Share.share({ title, text, url, dialogTitle: 'Share from Agent Forge' });
};

export const registerPushNotifications = async (): Promise<void> => {
  if (!isNative()) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }

  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration token:', token.value);
    // TODO: Send token to backend for push notification targeting
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push notification action:', notification);
  });
};
