'use client';

import { useEffect } from 'react';
import { isNative, isIOS } from '@/lib/native';

export default function NativeAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!isNative) return;

    document.body.classList.add('native-app');

    const setupNative = async () => {
      if (isIOS) {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
      }

      const { Keyboard } = await import('@capacitor/keyboard');
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-visible');
      });
      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-visible');
      });

      const { App } = await import('@capacitor/app');
      App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
        if (isActive) {
          document.dispatchEvent(new CustomEvent('app-resumed'));
        }
      });
      App.addListener('backButton', () => {
        window.history.back();
      });

      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide();
    };

    setupNative();
  }, []);

  return <>{children}</>;
}
