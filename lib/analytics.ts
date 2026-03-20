import { Platform } from 'react-native';
import { Mixpanel } from 'mixpanel-react-native';

// Analytics abstraction layer

const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || '';

let initialized = false;
let mixpanel: Mixpanel | null = null;

export async function initAnalytics(userId?: string) {
  if (!MIXPANEL_TOKEN) return;
  if (initialized) return;

  try {
    mixpanel = new Mixpanel(MIXPANEL_TOKEN, true);
    await mixpanel.init();

    if (userId) {
      mixpanel.identify(userId);
    }

    initialized = true;
  } catch {
    // Silently fail if Mixpanel can't initialize
  }
}

export function identify(userId: string, properties?: Record<string, any>) {
  if (!initialized || !mixpanel) return;
  try {
    mixpanel.identify(userId);
    if (properties) {
      mixpanel.getPeople().set(properties);
    }
  } catch {}
}

export function track(event: string, properties?: Record<string, any>) {
  if (!initialized || !mixpanel) return;
  try {
    mixpanel.track(event, properties);
  } catch {}
}

export function reset() {
  if (!initialized || !mixpanel) return;
  try {
    mixpanel.reset();
  } catch {}
}

// Pre-defined event helpers
export const Events = {
  signUp: (tier: string) => track('Sign Up', { tier }),
  signIn: () => track('Sign In'),
  signOut: () => { track('Sign Out'); reset(); },
  vote: (featureId: string) => track('Vote', { feature_id: featureId }),
  removeVote: (featureId: string) => track('Remove Vote', { feature_id: featureId }),
  submitFeature: (categoryId: number) => track('Submit Feature', { category_id: categoryId }),
  comment: (featureId: string) => track('Comment', { feature_id: featureId }),
  purchaseSubscription: (tier: string) => track('Purchase Subscription', { tier }),
  purchaseCoinPack: (productId: string, coins: number) => track('Purchase Coins', { product_id: productId, coins }),
  buyBadge: (badgeId: number) => track('Buy Badge', { badge_id: badgeId }),
  buyFrame: (frameId: number) => track('Buy Frame', { frame_id: frameId }),
  openChat: (channelId: string) => track('Open Chat', { channel_id: channelId }),
  sendMessage: (channelId: string) => track('Send Message', { channel_id: channelId }),
  viewFeature: (featureId: string) => track('View Feature', { feature_id: featureId }),
  reportUser: (reportedId: string) => track('Report User', { reported_id: reportedId }),
  blockUser: (blockedId: string) => track('Block User', { blocked_id: blockedId }),
};
