import { isIOS, isNative } from './native';

export const IAP_PRODUCTS = {
  starter: 'com.agentforge.starter_monthly',
  professional: 'com.agentforge.professional_monthly',
  scale: 'com.agentforge.scale_monthly',
} as const;

export function shouldUseIAP(): boolean {
  return isNative && isIOS;
}
