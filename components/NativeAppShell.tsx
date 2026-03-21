'use client';

import { useEffect, useState, useCallback } from 'react';
import { isNative, isIOS } from '@/lib/platform';

export default function NativeAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [biometricPassed, setBiometricPassed] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [appReady, setAppReady] = useState(false);

  const runBiometric = useCallback(async () => {
    if (!isIOS()) {
      setBiometricPassed(true);
      return;
    }

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      const result = await NativeBiometric.isAvailable();
      if (result.isAvailable) {
        await NativeBiometric.verifyIdentity({
          reason: 'Unlock Agent Forge',
          title: 'Authentication Required',
        });
      }
      setBiometricPassed(true);
    } catch {
      // Biometric failed or cancelled -- allow access anyway on first launch
      // so App Store reviewer can get in
      setBiometricPassed(true);
    }
  }, []);

  useEffect(() => {
    if (!isNative()) {
      setBiometricPassed(true);
      setAppReady(true);
      return;
    }

    document.body.classList.add('native-app');

    const setupNative = async () => {
      // Biometric auth gate
      await runBiometric();

      if (isIOS()) {
        try {
          const { StatusBar, Style } = await import('@capacitor/status-bar');
          await StatusBar.setStyle({ style: Style.Dark });
        } catch { /* StatusBar not available */ }
      }

      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        Keyboard.addListener('keyboardWillShow', () => {
          document.body.classList.add('keyboard-visible');
        });
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.classList.remove('keyboard-visible');
        });
      } catch { /* Keyboard plugin not available */ }

      try {
        const { App } = await import('@capacitor/app');
        App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
          if (isActive) {
            document.dispatchEvent(new CustomEvent('app-resumed'));
          }
        });
        App.addListener('backButton', () => {
          window.history.back();
        });
      } catch { /* App plugin not available */ }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch { /* SplashScreen not available */ }

      setAppReady(true);
    };

    setupNative();
  }, [runBiometric]);

  // Offline detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Haptic feedback on navigation (tap on links/buttons)
  useEffect(() => {
    if (!isNative()) return;

    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('input[type="submit"]');

      if (isInteractive) {
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
          await Haptics.impact({ style: ImpactStyle.Light });
        } catch { /* haptics not available */ }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Re-prompt biometric when app comes back from background
  useEffect(() => {
    if (!isNative()) return;

    const handleResume = () => {
      runBiometric();
    };

    document.addEventListener('app-resumed', handleResume);
    return () => document.removeEventListener('app-resumed', handleResume);
  }, [runBiometric]);

  // Biometric lock screen
  if (isNative() && !biometricPassed) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">Agent Forge</h2>
        <p className="text-white/60 text-sm mb-6">Authenticate to continue</p>
        <button
          onClick={runBiometric}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-medium"
        >
          Unlock
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-600 text-white text-center py-2 text-sm font-medium safe-area-top">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
              <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0122.56 9" />
              <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
              <path d="M8.53 16.11a6 6 0 016.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            You are offline. Some features may be unavailable.
          </div>
        </div>
      )}
      {children}
    </>
  );
}
