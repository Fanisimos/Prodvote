/**
 * Tests for input validation logic
 * Username, feature submission, chat messages
 */

describe('Username Validation', () => {
  const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

  function validateUsername(value: string): string | null {
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 20) return 'Username must be 20 characters or less';
    if (!USERNAME_REGEX.test(value)) return 'Only letters, numbers, and underscores allowed';
    return null;
  }

  it('should accept valid usernames', () => {
    expect(validateUsername('Fanisimos')).toBeNull();
    expect(validateUsername('user_123')).toBeNull();
    expect(validateUsername('abc')).toBeNull();
    expect(validateUsername('A_B_C')).toBeNull();
    expect(validateUsername('12345678901234567890')).toBeNull(); // 20 chars
  });

  it('should reject too short usernames', () => {
    expect(validateUsername('ab')).toBe('Username must be at least 3 characters');
    expect(validateUsername('a')).toBe('Username must be at least 3 characters');
    expect(validateUsername('')).toBe('Username must be at least 3 characters');
  });

  it('should reject too long usernames', () => {
    expect(validateUsername('a'.repeat(21))).toBe('Username must be 20 characters or less');
    expect(validateUsername('a'.repeat(50))).toBe('Username must be 20 characters or less');
  });

  it('should reject special characters', () => {
    expect(validateUsername('user name')).toBe('Only letters, numbers, and underscores allowed');
    expect(validateUsername('user@name')).toBe('Only letters, numbers, and underscores allowed');
    expect(validateUsername('user.name')).toBe('Only letters, numbers, and underscores allowed');
    expect(validateUsername('user-name')).toBe('Only letters, numbers, and underscores allowed');
    expect(validateUsername('user!name')).toBe('Only letters, numbers, and underscores allowed');
  });
});

describe('Feature Submission Validation', () => {
  function validateFeature(title: string, description: string): string | null {
    if (!title.trim()) return 'Title is required';
    if (title.trim().length < 5) return 'Title must be at least 5 characters';
    if (title.trim().length > 100) return 'Title must be 100 characters or less';
    if (!description.trim()) return 'Description is required';
    if (description.trim().length < 10) return 'Description must be at least 10 characters';
    return null;
  }

  it('should accept valid feature submissions', () => {
    expect(validateFeature('Add dark mode', 'Would be great to have a dark theme option')).toBeNull();
    expect(validateFeature('Fix login bug', 'Login fails when using special characters in email')).toBeNull();
  });

  it('should reject empty title', () => {
    expect(validateFeature('', 'Some description here')).toBe('Title is required');
    expect(validateFeature('   ', 'Some description here')).toBe('Title is required');
  });

  it('should reject short title', () => {
    expect(validateFeature('Hi', 'Some description here')).toBe('Title must be at least 5 characters');
  });

  it('should reject empty description', () => {
    expect(validateFeature('Valid Title', '')).toBe('Description is required');
  });

  it('should reject short description', () => {
    expect(validateFeature('Valid Title', 'Short')).toBe('Description must be at least 10 characters');
  });
});

describe('Chat Message Validation', () => {
  function validateMessage(text: string): boolean {
    return text.trim().length > 0 && text.length <= 500;
  }

  it('should accept valid messages', () => {
    expect(validateMessage('Hello everyone!')).toBe(true);
    expect(validateMessage('a')).toBe(true);
    expect(validateMessage('x'.repeat(500))).toBe(true);
  });

  it('should reject empty messages', () => {
    expect(validateMessage('')).toBe(false);
    expect(validateMessage('   ')).toBe(false);
  });

  it('should reject messages over 500 characters', () => {
    expect(validateMessage('x'.repeat(501))).toBe(false);
  });
});
