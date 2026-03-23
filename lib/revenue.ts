import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { supabase } from './supabase';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

export async function initRevenueCat(userId?: string) {
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  if (!apiKey) return;

  await Purchases.configure({ apiKey });
  if (userId) {
    await Purchases.logIn(userId);
  }
}

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    await syncTierFromCustomerInfo(customerInfo);
    return { success: true, customerInfo };
  } catch (e: any) {
    if (e.userCancelled) return { success: false, cancelled: true };
    return { success: false, error: e.message };
  }
}

export async function restorePurchases() {
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

  // Tier change trigger in DB handles vote reset and coin grants automatically
  await supabase.from('profiles').update({ tier }).eq('id', session.user.id);
}

export async function checkSubscriptionStatus() {
  try {
    const info = await Purchases.getCustomerInfo();
    await syncTierFromCustomerInfo(info);
    return info;
  } catch {
    return null;
  }
}
