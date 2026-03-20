import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { supabase } from './supabase';

// RevenueCat API keys — loaded from environment variables
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!;
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;

// Entitlement IDs — these must match what you set up in RevenueCat dashboard
export const ENTITLEMENTS = {
  pro: 'pro',
  ultra: 'ultra',
  legendary: 'legendary',
};

// Product IDs — set these up in RevenueCat > Products
export const PRODUCT_IDS = {
  pro_monthly: 'prodvote_pro_monthly',
  ultra_monthly: 'prodvote_ultra_monthly',
  legendary_monthly: 'prodvote_legendary_monthly',
  coins_1000: 'prodvote_coins_1000',
  coins_2500: 'prodvote_coins_2500',
  coins_5000: 'prodvote_coins_5000',
};

let initialized = false;

export async function initPurchases(userId?: string) {
  if (Platform.OS === 'web') return; // RevenueCat doesn't work on web
  if (initialized) return;

  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
    await Purchases.configure({ apiKey, appUserID: userId });

    initialized = true;
  } catch (e) {
    console.log('RevenueCat init error:', e);
  }
}

export async function getOfferings() {
  if (Platform.OS === 'web') return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (e) {
    console.log('Error fetching offerings:', e);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    await syncTierFromPurchase(customerInfo);
    return { success: true, customerInfo };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false, cancelled: true };
    }
    console.log('Purchase error:', e);
    return { success: false, error: e.message };
  }
}

export async function restorePurchases() {
  if (Platform.OS === 'web') return null;
  try {
    const customerInfo = await Purchases.restorePurchases();
    await syncTierFromPurchase(customerInfo);
    return customerInfo;
  } catch (e) {
    console.log('Restore error:', e);
    return null;
  }
}

export async function getCustomerInfo() {
  if (Platform.OS === 'web') return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    return null;
  }
}

// Sync RevenueCat entitlements → Supabase profile tier
export async function syncTierFromPurchase(customerInfo: CustomerInfo) {
  let tier = 'free';

  if (customerInfo.entitlements.active[ENTITLEMENTS.legendary]) {
    tier = 'legendary';
  } else if (customerInfo.entitlements.active[ENTITLEMENTS.ultra]) {
    tier = 'ultra';
  } else if (customerInfo.entitlements.active[ENTITLEMENTS.pro]) {
    tier = 'pro';
  }

  // Update Supabase profile — tier change trigger handles coins/votes/subscription dates
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').update({ tier }).eq('id', user.id);
  }

  return tier;
}

// Purchase a coin pack (consumable IAP)
export async function purchaseCoinPack(productId: string, coinsAmount: number) {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Purchases not available on web' };
  }
  try {
    const { customerInfo } = await Purchases.purchaseStoreProduct(
      await Purchases.getProducts([productId]).then(p => p[0])
    );

    // Grant coins in Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc('grant_coin_pack', { p_user_id: user.id, p_amount: coinsAmount });
    }

    return { success: true, customerInfo };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false, cancelled: true };
    }
    console.log('Coin pack purchase error:', e);
    return { success: false, error: e.message };
  }
}

// Check current tier from RevenueCat
export async function getCurrentTier(): Promise<string> {
  if (Platform.OS === 'web') return 'free';
  try {
    const info = await Purchases.getCustomerInfo();
    if (info.entitlements.active[ENTITLEMENTS.legendary]) return 'legendary';
    if (info.entitlements.active[ENTITLEMENTS.ultra]) return 'ultra';
    if (info.entitlements.active[ENTITLEMENTS.pro]) return 'pro';
    return 'free';
  } catch {
    return 'free';
  }
}
