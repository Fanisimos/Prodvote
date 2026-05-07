import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { supabase } from './supabase';

const REVENUECAT_API_KEY_IOS = 'appl_lxPVqeQCAiilJdIIYJZSQmgyYrZ';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

let isConfigured = false;
let configurePromise: Promise<void> | null = null;

export async function initRevenueCat(userId?: string) {
  if (Platform.OS === 'web') return;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  if (!apiKey) return;

  try {
    if (!isConfigured) {
      Purchases.configure({ apiKey });
      isConfigured = true;
    }
    if (userId) {
      const { customerInfo } = await Purchases.logIn(userId);
      console.log('[revenue] logIn →', userId, 'rcAppUserId=', await Purchases.getAppUserID());
      await syncTierFromCustomerInfo(customerInfo);
    }
  } catch (e) {
    console.error('RevenueCat configure error:', e);
  }
}

export async function logOutRevenueCat() {
  if (Platform.OS === 'web' || !isConfigured) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn('RevenueCat logOut error:', e);
  }
}

async function ensureConfigured(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  if (!apiKey) return false;

  if (!isConfigured) {
    if (configurePromise) {
      await configurePromise;
    } else {
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
    }
  }

  // Make sure RC's App User ID matches the current Supabase user so purchases
  // land on the right customer profile.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const currentRcId = await Purchases.getAppUserID();
      if (currentRcId !== session.user.id) {
        console.log('[revenue] identity mismatch, logging in', session.user.id, 'was', currentRcId);
        await Purchases.logIn(session.user.id);
      }
    }
  } catch (e) {
    console.warn('[revenue] identity sync failed:', e);
  }

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

function extractLatestTxnId(customerInfo: CustomerInfo, productId: string): string | null {
  // RC exposes consumable/non-subscription purchases via nonSubscriptionTransactions
  const txns = (customerInfo as any).nonSubscriptionTransactions as
    | Array<{ transactionIdentifier: string; productIdentifier: string; purchaseDate: string }>
    | undefined;
  if (!txns || txns.length === 0) return null;
  const matching = txns.filter(t => t.productIdentifier === productId);
  if (matching.length === 0) return null;
  matching.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  return matching[0].transactionIdentifier;
}

export async function purchasePackage(pkg: PurchasesPackage) {
  await ensureConfigured();
  try {
    console.log('[revenue] purchasePackage →', pkg.product.identifier);
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    await syncTierFromCustomerInfo(customerInfo);
    const txnId = extractLatestTxnId(customerInfo, pkg.product.identifier);
    console.log('[revenue] purchase ok, txnId=', txnId, 'nonSubCount=',
      (customerInfo as any).nonSubscriptionTransactions?.length ?? 0);
    return { success: true, customerInfo, transactionId: txnId };
  } catch (e: any) {
    console.log('[revenue] purchasePackage error:', e?.code, e?.message, 'cancelled=', !!e.userCancelled);
    if (e.userCancelled) return { success: false, cancelled: true };
    return { success: false, error: e.message };
  }
}

export async function purchaseByProductId(productId: string) {
  const ready = await ensureConfigured();
  if (!ready) return { success: false, error: 'RevenueCat not configured' };
  try {
    console.log('[revenue] purchaseByProductId →', productId);
    const products = await Purchases.getProducts([productId]);
    if (!products || products.length === 0) {
      return { success: false, error: `Product ${productId} not found in App Store` };
    }
    const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
    await syncTierFromCustomerInfo(customerInfo);
    const txnId = extractLatestTxnId(customerInfo, productId);
    console.log('[revenue] purchase ok, txnId=', txnId);
    return { success: true, customerInfo, transactionId: txnId };
  } catch (e: any) {
    console.log('[revenue] purchaseByProductId error:', e?.code, e?.message);
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
  let rcTier: 'free' | 'pro' | 'ultra' | 'legendary' = 'free';

  if (entitlements['legendary']) {
    rcTier = 'legendary';
  } else if (entitlements['ultra']) {
    rcTier = 'ultra';
  } else if (entitlements['pro']) {
    rcTier = 'pro';
  }

  // Never downgrade from sync — RC reporting "no entitlement" is ambiguous
  // (could mean: never paid, or admin granted manually, or a transient
  // restore failure). Only the server-side webhook should downgrade after
  // confirmed expiry. Local sync only ever upgrades.
  if (rcTier === 'free') return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const tierRank = { free: 0, pro: 1, ultra: 2, legendary: 3 } as const;
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', session.user.id)
    .single();
  const currentTier = (profileRow?.tier as keyof typeof tierRank) || 'free';
  if (tierRank[rcTier] <= tierRank[currentTier]) return;

  await supabase.from('profiles').update({ tier: rcTier }).eq('id', session.user.id);
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
