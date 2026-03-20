/**
 * Tests for purchases / subscription logic
 */
import { ENTITLEMENTS, PRODUCT_IDS } from '../lib/purchases';

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

// Mock react-native-purchases
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    setLogLevel: jest.fn(),
    configure: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(),
    getProducts: jest.fn(),
    purchaseStoreProduct: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
}));

// Mock supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }) },
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) }),
    }),
    rpc: jest.fn().mockResolvedValue({}),
  },
}));

describe('Entitlements', () => {
  it('should have correct entitlement IDs', () => {
    expect(ENTITLEMENTS.pro).toBe('pro');
    expect(ENTITLEMENTS.ultra).toBe('ultra');
    expect(ENTITLEMENTS.legendary).toBe('legendary');
  });
});

describe('Product IDs', () => {
  it('should have correct subscription product IDs', () => {
    expect(PRODUCT_IDS.pro_monthly).toBe('prodvote_pro_monthly');
    expect(PRODUCT_IDS.ultra_monthly).toBe('prodvote_ultra_monthly');
    expect(PRODUCT_IDS.legendary_monthly).toBe('prodvote_legendary_monthly');
  });

  it('should have correct coin pack product IDs', () => {
    expect(PRODUCT_IDS.coins_1000).toBe('prodvote_coins_1000');
    expect(PRODUCT_IDS.coins_2500).toBe('prodvote_coins_2500');
    expect(PRODUCT_IDS.coins_5000).toBe('prodvote_coins_5000');
  });
});

describe('syncTierFromPurchase', () => {
  const { syncTierFromPurchase } = require('../lib/purchases');

  it('should return "legendary" when legendary entitlement is active', async () => {
    const customerInfo = {
      entitlements: {
        active: { legendary: { isActive: true } },
      },
    };
    const tier = await syncTierFromPurchase(customerInfo);
    expect(tier).toBe('legendary');
  });

  it('should return "ultra" when ultra entitlement is active', async () => {
    const customerInfo = {
      entitlements: {
        active: { ultra: { isActive: true } },
      },
    };
    const tier = await syncTierFromPurchase(customerInfo);
    expect(tier).toBe('ultra');
  });

  it('should return "pro" when pro entitlement is active', async () => {
    const customerInfo = {
      entitlements: {
        active: { pro: { isActive: true } },
      },
    };
    const tier = await syncTierFromPurchase(customerInfo);
    expect(tier).toBe('pro');
  });

  it('should return "free" when no entitlements are active', async () => {
    const customerInfo = {
      entitlements: { active: {} },
    };
    const tier = await syncTierFromPurchase(customerInfo);
    expect(tier).toBe('free');
  });

  it('should prioritize legendary over ultra and pro', async () => {
    const customerInfo = {
      entitlements: {
        active: {
          pro: { isActive: true },
          ultra: { isActive: true },
          legendary: { isActive: true },
        },
      },
    };
    const tier = await syncTierFromPurchase(customerInfo);
    expect(tier).toBe('legendary');
  });
});

describe('Web platform guards', () => {
  it('should return null for getOfferings on web', async () => {
    const { getOfferings } = require('../lib/purchases');
    const result = await getOfferings();
    expect(result).toBeNull();
  });

  it('should return null for restorePurchases on web', async () => {
    const { restorePurchases } = require('../lib/purchases');
    const result = await restorePurchases();
    expect(result).toBeNull();
  });

  it('should return null for getCustomerInfo on web', async () => {
    const { getCustomerInfo } = require('../lib/purchases');
    const result = await getCustomerInfo();
    expect(result).toBeNull();
  });

  it('should return "free" for getCurrentTier on web', async () => {
    const { getCurrentTier } = require('../lib/purchases');
    const tier = await getCurrentTier();
    expect(tier).toBe('free');
  });

  it('should return error for purchaseCoinPack on web', async () => {
    const { purchaseCoinPack } = require('../lib/purchases');
    const result = await purchaseCoinPack('prodvote_coins_1000', 1000);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Purchases not available on web');
  });
});
