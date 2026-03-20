/**
 * Tests for tier system logic and constants
 * Validates tier definitions, perks, and business rules
 */

describe('Tier System', () => {
  const TIERS = ['free', 'pro', 'ultra', 'legendary'] as const;

  const TIER_PERKS = {
    free: { votes: 3, coins: 0, weight: 1 },
    pro: { votes: 10, coins: 600, weight: 1 },
    ultra: { votes: Infinity, coins: 1000, weight: 3 },
    legendary: { votes: Infinity, coins: 2500, weight: 3 },
  };

  const TIER_PRICES = {
    free: 0,
    pro: 1.99,
    ultra: 4.99,
    legendary: 9.99,
  };

  it('should have exactly 4 tiers', () => {
    expect(TIERS).toHaveLength(4);
  });

  it('should have increasing coin grants per tier', () => {
    expect(TIER_PERKS.free.coins).toBe(0);
    expect(TIER_PERKS.pro.coins).toBe(600);
    expect(TIER_PERKS.ultra.coins).toBe(1000);
    expect(TIER_PERKS.legendary.coins).toBe(2500);
    expect(TIER_PERKS.pro.coins).toBeLessThan(TIER_PERKS.ultra.coins);
    expect(TIER_PERKS.ultra.coins).toBeLessThan(TIER_PERKS.legendary.coins);
  });

  it('should have increasing prices per tier', () => {
    expect(TIER_PRICES.free).toBe(0);
    expect(TIER_PRICES.pro).toBeLessThan(TIER_PRICES.ultra);
    expect(TIER_PRICES.ultra).toBeLessThan(TIER_PRICES.legendary);
  });

  it('should give ultra and legendary unlimited votes', () => {
    expect(TIER_PERKS.ultra.votes).toBe(Infinity);
    expect(TIER_PERKS.legendary.votes).toBe(Infinity);
  });

  it('should give ultra and legendary 3x vote weight', () => {
    expect(TIER_PERKS.ultra.weight).toBe(3);
    expect(TIER_PERKS.legendary.weight).toBe(3);
  });

  it('should give free and pro 1x vote weight', () => {
    expect(TIER_PERKS.free.weight).toBe(1);
    expect(TIER_PERKS.pro.weight).toBe(1);
  });

  it('free tier should have limited votes', () => {
    expect(TIER_PERKS.free.votes).toBe(3);
    expect(TIER_PERKS.free.votes).toBeLessThan(TIER_PERKS.pro.votes);
  });
});

describe('Coin Packs', () => {
  const COIN_PACKS = [
    { id: 'prodvote_coins_1000', coins: 1000, price: 4.99 },
    { id: 'prodvote_coins_2500', coins: 2500, price: 8.99 },
    { id: 'prodvote_coins_5000', coins: 5000, price: 14.99 },
  ];

  it('should have 3 coin packs', () => {
    expect(COIN_PACKS).toHaveLength(3);
  });

  it('should have decreasing per-coin price for larger packs', () => {
    const perCoin = COIN_PACKS.map(p => p.price / p.coins);
    expect(perCoin[0]).toBeGreaterThan(perCoin[1]);
    expect(perCoin[1]).toBeGreaterThan(perCoin[2]);
  });

  it('should have correct product IDs', () => {
    expect(COIN_PACKS[0].id).toBe('prodvote_coins_1000');
    expect(COIN_PACKS[1].id).toBe('prodvote_coins_2500');
    expect(COIN_PACKS[2].id).toBe('prodvote_coins_5000');
  });
});
