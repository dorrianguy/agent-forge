'use client';

import { useEffect } from 'react';
import { isNative } from '@/lib/platform';
import { registerPushNotifications } from '@/lib/native-features';

export default function NativeInit() {
  useEffect(() => {
    if (isNative()) {
      registerPushNotifications();
    }
  }, []);

  return null;
}
