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
  is_admin: boolean;
  bio: string | null;
  active_badge_id: number | null;
  active_frame_id: number | null;
  active_badge?: Badge | null;
  active_frame?: AvatarFrame | null;
  push_token: string | null;
  login_streak: number;
  last_daily_reward_at: string | null;
  last_login_date: string | null;
  accepted_terms_at: string | null;
  subscription_started_at: string | null;
  last_monthly_grant_at: string | null;
  last_vote_reset_at: string | null;
  referral_code: string | null;
  referred_by: string | null;
  has_been_prompted_rating: boolean;
  created_at: string;
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
  is_priority: boolean;
  dev_response: string | null;
  created_at: string;
  shipped_at: string | null;
  author_username?: string;
  author_avatar?: string | null;
  author_tier?: Tier;
  author_frame_animation?: string | null;
  author_frame_color?: string | null;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  boost_count?: number;
  user_has_voted?: boolean;
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
  created_at: string;
  username?: string;
  avatar_url?: string | null;
  tier?: Tier;
}

export interface Badge {
  id: number;
  name: string;
  emoji: string;
  color: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface AvatarFrame {
  id: number;
  name: string;
  description: string | null;
  animation_type: string;
  price: number;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: number;
  acquired_at: string;
  badge?: Badge;
}

export interface UserAvatarFrame {
  id: string;
  user_id: string;
  frame_id: number;
  purchased_at: string;
  frame?: AvatarFrame;
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  color: string;
  is_locked: boolean;
  sort_order: number;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
  tier?: Tier;
  active_badge_emoji?: string | null;
  frame_animation?: string | null;
  frame_color?: string | null;
}

export interface CoinReward {
  id: string;
  user_id: string;
  reward_type: string;
  amount: number;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  streak: number;
  last_completed_at: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  calendar_event_id: string | null;
  created_at: string;
}

export interface KanbanBoard {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  cards?: KanbanCard[];
}

export interface KanbanCard {
  id: string;
  board_id: string;
  title: string;
  column_name: string;
  position: number;
  created_at: string;
}

export interface AwardType {
  id: number;
  name: string;
  emoji: string;
  description: string;
  coin_cost: number;
  animation: string;
  color: string;
  sort_order: number;
}

export interface FeatureAward {
  id: string;
  feature_id: string;
  award_type_id: number;
  giver_user_id: string;
  created_at: string;
  award_type?: AwardType;
}

export interface FeatureAwardCount {
  feature_id: string;
  award_type_id: number;
  name: string;
  emoji: string;
  animation: string;
  color: string;
  count: number;
}

export interface CommentAward {
  id: string;
  comment_id: string;
  badge_id: number;
  giver_user_id: string;
  created_at: string;
  badge?: Badge;
}
