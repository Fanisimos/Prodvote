import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { supabase } from './supabase';

const REVENUECAT_API_KEY_IOS = 'appl_lxPVqeQCAiilJdIIYJZSQmgyYrZ';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

let isConfigured = false;
let configurePromise: Promise<void> | null = null;

export async function initRevenueCat(userId?: string) {
  if (Platform.OS === 'web') return;
  if (isConfigured) return;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  if (!apiKey) return;

  try {
    Purchases.configure({ apiKey });
    isConfigured = true;
    if (userId) {
      await Purchases.logIn(userId);
    }
  } catch (e) {
    console.error('RevenueCat configure error:', e);
  }
}

async function ensureConfigured(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (isConfigured) return true;

  // If someone else is already configuring, wait for them
  if (configurePromise) {
    await configurePromise;
    return isConfigured;
  }

  // Auto-configure without userId — RevenueCat works anonymously too
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  if (!apiKey) return false;

  configurePromise = (async () => {
    try {
      Purchases.configure({ apiKey });
      isConfigured = true;
    } catch (e) {
      console.error('RevenueCat auto-configure error:', e);
    }
  })();

  await configurePromise;
  configurePromise = null;
  return isConfigured;
}

export async function getOfferings() {
  const ready = await ensureConfigured();
  if (!ready) return null;
  try {
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) {
      console.warn('No current offering found in RevenueCat');
    }
    return offerings.current;
  } catch (e) {
    console.error('RevenueCat getOfferings error:', e);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage) {
  await ensureConfigured();
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    await syncTierFromCustomerInfo(customerInfo);
    return { success: true, customerInfo };
  } catch (e: any) {
    if (e.userCancelled) return { success: false, cancelled: true };
    return { success: false, error: e.message };
  }
}

export async function purchaseByProductId(productId: string) {
  const ready = await ensureConfigured();
  if (!ready) return { success: false, error: 'RevenueCat not configured' };
  try {
    const products = await Purchases.getProducts([productId]);
    if (!products || products.length === 0) {
      return { success: false, error: `Product ${productId} not found in App Store` };
    }
    const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
    await syncTierFromCustomerInfo(customerInfo);
    return { success: true, customerInfo };
  } catch (e: any) {
    if (e.userCancelled) return { success: false, cancelled: true };
    return { success: false, error: e.message };
  }
}

export async function restorePurchases() {
  await ensureConfigured();
  try {
    const customerInfo = await Purchases.restorePurchases();
    await syncTierFromCustomerInfo(customerInfo);
    return { success: true, customerInfo };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function syncTierFromCustomerInfo(info: CustomerInfo) {
  const entitlements = info.entitlements.active;
  let tier: 'free' | 'pro' | 'ultra' | 'legendary' = 'free';

  if (entitlements['legendary']) {
    tier = 'legendary';
  } else if (entitlements['ultra']) {
    tier = 'ultra';
  } else if (entitlements['pro']) {
    tier = 'pro';
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from('profiles').update({ tier }).eq('id', session.user.id);
}

export async function checkSubscriptionStatus() {
  const ready = await ensureConfigured();
  if (!ready) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    await syncTierFromCustomerInfo(info);
    return info;
  } catch {
    return null;
  }
}

export function isRevenueCatReady() {
  return isConfigured;
}
