import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { supabase } from './supabase';

// RevenueCat API keys (same key for now — add platform-specific keys when you set up Apple/Google)
const API_KEY = 'test_YjCoQxhYEpzwbjPASQGsKFJouqa';

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
};

let initialized = false;

export async function initPurchases(userId?: string) {
  if (Platform.OS === 'web') return; // RevenueCat doesn't work on web
  if (initialized) return;

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    if (Platform.OS === 'ios') {
      await Purchases.configure({ apiKey: API_KEY, appUserID: userId });
    } else if (Platform.OS === 'android') {
      await Purchases.configure({ apiKey: API_KEY, appUserID: userId });
    }

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

  // Update Supabase profile
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').update({ tier }).eq('id', user.id);
  }

  return tier;
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
