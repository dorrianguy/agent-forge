import { isIOS } from './platform';

// Product IDs must match App Store Connect configuration
export const IAP_PRODUCTS = {
  STARTER_MONTHLY: 'com.agentforge.app.starter.monthly',
  PRO_MONTHLY: 'com.agentforge.app.pro.monthly',
  SCALE_MONTHLY: 'com.agentforge.app.scale.monthly',
} as const;

export type IAPProductId = typeof IAP_PRODUCTS[keyof typeof IAP_PRODUCTS];

export interface IAPProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
}

interface CdvPurchaseStore {
  register: (products: Array<{ id: string; type: string; platform: string }>) => void;
  when: () => CdvStoreWhen;
  initialize: (platforms?: string[]) => Promise<void>;
  get: (id: string) => CdvProduct | null;
  order: (id: string) => Promise<void>;
  ready: (cb: () => void) => void;
  update: () => void;
}

interface CdvStoreWhen {
  approved: (cb: (transaction: CdvTransaction) => void) => CdvStoreWhen;
  verified: (cb: (receipt: CdvReceipt) => void) => CdvStoreWhen;
  finished: (cb: (transaction: CdvTransaction) => void) => CdvStoreWhen;
  productUpdated: (cb: (product: CdvProduct) => void) => CdvStoreWhen;
}

interface CdvTransaction {
  transactionId: string;
  verify: () => void;
}

interface CdvReceipt {
  finish: () => void;
}

interface CdvPricingPhase {
  price: string;
  priceMicros: number;
  currency: string;
}

interface CdvOffer {
  pricingPhases?: CdvPricingPhase[];
}

interface CdvProduct {
  id: string;
  title: string;
  description: string;
  price?: string;
  offers?: CdvOffer[];
}

export function shouldUseIAP(): boolean {
  return isIOS();
}

let store: CdvPurchaseStore | null = null;

const getStore = (): CdvPurchaseStore | null => {
  if (!isIOS()) return null;
  if (store) return store;
  const w = window as unknown as Record<string, unknown>;
  const cdv = w.CdvPurchase as { store?: CdvPurchaseStore } | undefined;
  if (cdv?.store) {
    store = cdv.store;
    return store;
  }
  return null;
};

export const initializeIAP = async (): Promise<void> => {
  const s = getStore();
  if (!s) return;

  const CdvPurchase = (window as unknown as Record<string, unknown>).CdvPurchase as {
    ProductType: { PAID_SUBSCRIPTION: string };
    Platform: { APPLE_APPSTORE: string };
  };

  s.register([
    { id: IAP_PRODUCTS.STARTER_MONTHLY, type: CdvPurchase.ProductType.PAID_SUBSCRIPTION, platform: CdvPurchase.Platform.APPLE_APPSTORE },
    { id: IAP_PRODUCTS.PRO_MONTHLY, type: CdvPurchase.ProductType.PAID_SUBSCRIPTION, platform: CdvPurchase.Platform.APPLE_APPSTORE },
    { id: IAP_PRODUCTS.SCALE_MONTHLY, type: CdvPurchase.ProductType.PAID_SUBSCRIPTION, platform: CdvPurchase.Platform.APPLE_APPSTORE },
  ]);

  s.when()
    .approved((transaction: CdvTransaction) => {
      transaction.verify();
    })
    .verified((receipt: CdvReceipt) => {
      receipt.finish();
      // TODO: Send receipt to backend to update user subscription
    })
    .finished((transaction: CdvTransaction) => {
      console.log('IAP transaction finished:', transaction.transactionId);
    });

  await s.initialize([CdvPurchase.Platform.APPLE_APPSTORE]);
};

export const getProducts = (): IAPProduct[] => {
  const s = getStore();
  if (!s) return [];

  return Object.values(IAP_PRODUCTS).map((id) => {
    const product = s.get(id);
    if (!product) return null;
    const offer = product.offers?.[0];
    const phase = offer?.pricingPhases?.[0];
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: phase?.price || product.price || 'N/A',
      priceAmount: phase?.priceMicros ? phase.priceMicros / 1000000 : 0,
      currency: phase?.currency || 'USD',
    };
  }).filter(Boolean) as IAPProduct[];
};

export const purchaseProduct = async (productId: IAPProductId): Promise<boolean> => {
  const s = getStore();
  if (!s) return false;

  try {
    await s.order(productId);
    return true;
  } catch (error) {
    console.error('IAP purchase error:', error);
    return false;
  }
};

export const restorePurchases = async (): Promise<void> => {
  const s = getStore();
  if (!s) return;
  s.update();
};
