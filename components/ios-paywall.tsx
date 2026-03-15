'use client';

import { useState, useEffect } from 'react';
import { isIOS } from '@/lib/platform';
import {
  initializeIAP,
  getProducts,
  purchaseProduct,
  restorePurchases,
  IAP_PRODUCTS,
  type IAPProduct,
  type IAPProductId,
} from '@/lib/iap';
import { hapticFeedback, hapticNotification } from '@/lib/native-features';

const FALLBACK_PLANS = [
  {
    id: IAP_PRODUCTS.STARTER_MONTHLY,
    name: 'Starter',
    price: '$39.99/mo',
    features: ['1 AI Agent', '100 voice minutes', 'Basic analytics', 'Email support'],
  },
  {
    id: IAP_PRODUCTS.PRO_MONTHLY,
    name: 'Pro',
    price: '$99.99/mo',
    features: ['5 AI Agents', '500 voice minutes', 'Advanced analytics', 'Priority support', 'API access'],
    popular: true,
  },
  {
    id: IAP_PRODUCTS.SCALE_MONTHLY,
    name: 'Scale',
    price: '$299.99/mo',
    features: ['Unlimited Agents', '2,000 voice minutes', '20 concurrent calls', 'Team collaboration'],
  },
];

export default function IOSPaywall({ onClose }: { onClose: () => void }) {
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (isIOS()) {
        await initializeIAP();
        const loaded = getProducts();
        if (loaded.length > 0) {
          setProducts(loaded);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const handlePurchase = async (productId: string) => {
    setPurchasing(productId);
    await hapticFeedback('medium');

    const success = await purchaseProduct(productId as IAPProductId);
    if (success) {
      await hapticNotification('success');
    } else {
      await hapticNotification('error');
    }
    setPurchasing(null);
  };

  const handleRestore = async () => {
    await hapticFeedback('light');
    await restorePurchases();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Upgrade Your Plan</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>

          <p className="text-gray-400 mb-6">
            Unlock the full power of Agent Forge with a subscription.
          </p>

          <div className="space-y-4">
            {FALLBACK_PLANS.map((plan) => {
              const iapProduct = products.find(p => p.id === plan.id);
              return (
                <div
                  key={plan.id}
                  className={`border rounded-xl p-4 ${
                    plan.popular
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  {plan.popular && (
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      Most Popular
                    </span>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <span className="text-lg font-bold text-white">
                      {iapProduct?.price || plan.price}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {plan.features.map((f) => (
                      <li key={f} className="text-sm text-gray-300 flex items-center gap-2">
                        <span className="text-green-400">&#10003;</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePurchase(plan.id)}
                    disabled={purchasing !== null}
                    className={`w-full mt-4 py-2.5 rounded-lg font-medium transition-colors ${
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    } ${purchasing === plan.id ? 'opacity-50' : ''}`}
                  >
                    {purchasing === plan.id ? 'Processing...' : 'Subscribe'}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleRestore}
            className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Restore Purchases
          </button>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Payment will be charged to your Apple ID account. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
          </p>
        </div>
      </div>
    </div>
  );
}
