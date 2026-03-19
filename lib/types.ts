export type Tier = 'free' | 'pro' | 'ultra' | 'legendary';

export type FeatureStatus = 'open' | 'under_review' | 'planned' | 'in_progress' | 'shipped' | 'declined';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  tier: Tier;
  votes_remaining: number;
  boosts_remaining: number;
  coins: number;
  is_banned: boolean;
  created_at: string;
  last_login_date: string | null;
  login_streak: number;
  active_badge_id: number | null;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface Feature {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category_id: number;
  status: FeatureStatus;
  score: number;
  vote_count: number;
  comment_count: number;
  is_boosted: boolean;
  dev_response: string | null;
  dev_hearted: boolean;
  created_at: string;
  shipped_at: string | null;
  // Joined fields
  author_username?: string;
  author_avatar?: string | null;
  author_tier?: Tier;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  boost_count?: number;
  // Client-side
  user_has_voted?: boolean;
  awards?: { emoji: string; name: string; color: string; count: number }[];
}

export interface Vote {
  id: string;
  user_id: string;
  feature_id: string;
  weight: number;
  created_at: string;
}

export interface Comment {
  id: string;
  feature_id: string;
  user_id: string;
  body: string;
  is_dev_reply: boolean;
  dev_hearted: boolean;
  badge_id: number | null;
  created_at: string;
  // Joined
  username?: string;
  avatar_url?: string | null;
  tier?: Tier;
  badge_emoji?: string;
  badge_name?: string;
  badge_color?: string;
  // Awards given to this comment
  awards?: { emoji: string; name: string; color: string; count: number }[];
}

export interface Badge {
  id: number;
  name: string;
  emoji: string;
  description: string;
  price: number;
  color: string;
  is_active: boolean;
  owned?: boolean;
}
