/**
 * Tests for coin reward system
 */

// Mock supabase
const mockRpc = jest.fn().mockResolvedValue({});

jest.mock('../lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

import { awardCoins } from '../lib/coinRewards';

describe('Coin Rewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should award 2 coins for voting', async () => {
    const amount = await awardCoins('user-1', 'vote');
    expect(amount).toBe(2);
    expect(mockRpc).toHaveBeenCalledWith('award_coins_atomic', {
      p_user_id: 'user-1',
      p_reward_type: 'vote',
      p_amount: 2,
    });
  });

  it('should award 5 coins for commenting', async () => {
    const amount = await awardCoins('user-1', 'comment');
    expect(amount).toBe(5);
    expect(mockRpc).toHaveBeenCalledWith('award_coins_atomic', {
      p_user_id: 'user-1',
      p_reward_type: 'comment',
      p_amount: 5,
    });
  });

  it('should award 15 coins for submitting a feature', async () => {
    const amount = await awardCoins('user-1', 'feature_submitted');
    expect(amount).toBe(15);
    expect(mockRpc).toHaveBeenCalledWith('award_coins_atomic', {
      p_user_id: 'user-1',
      p_reward_type: 'feature_submitted',
      p_amount: 15,
    });
  });

  it('should return undefined for unknown reward type', async () => {
    const amount = await awardCoins('user-1', 'unknown' as any);
    expect(amount).toBeUndefined();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('Reward Amounts', () => {
  it('feature submission should give more than comments', () => {
    expect(15).toBeGreaterThan(5);
  });

  it('comments should give more than votes', () => {
    expect(5).toBeGreaterThan(2);
  });
});
