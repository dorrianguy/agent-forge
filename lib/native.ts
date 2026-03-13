import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';

export async function hapticFeedback(
  style: 'light' | 'medium' | 'heavy' = 'medium',
): Promise<void> {
  if (!isNative) return;
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  const styles = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  };
  await Haptics.impact({ style: styles[style] });
}

export async function shareContent(
  title: string,
  text: string,
  url?: string,
): Promise<void> {
  if (!isNative) return;
  const { Share } = await import('@capacitor/share');
  await Share.share({ title, text, url });
}

export async function scheduleNotification(
  title: string,
  body: string,
  id: number = 1,
): Promise<void> {
  if (!isNative) return;
  const { LocalNotifications } = await import(
    '@capacitor/local-notifications'
  );
  await LocalNotifications.schedule({
    notifications: [
      {
        title,
        body,
        id,
        schedule: { at: new Date(Date.now() + 1000) },
      },
    ],
  });
}
