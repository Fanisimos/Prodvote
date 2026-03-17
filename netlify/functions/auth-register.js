const bcrypt = require('bcryptjs');
const { getDb, respond, handleOptions, generateToken } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  try {
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return respond(400, { error: 'Username and password required' });
    }

    if (username.length < 2 || username.length > 30) {
      return respond(400, { error: 'Username must be 2-30 characters' });
    }

    if (password.length < 4) {
      return respond(400, { error: 'Password must be at least 4 characters' });
    }

    // Only allow alphanumeric and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return respond(400, { error: 'Username can only contain letters, numbers, and underscores' });
    }

    const sql = getDb();
    const existing = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username})`;
    if (existing.length > 0) {
      return respond(409, { error: 'Username already taken' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await sql`
      INSERT INTO users (username, password_hash)
      VALUES (${username}, ${hash})
      RETURNING id, username, is_admin
    `;

    const user = result[0];
    const token = generateToken(user.id, user.username);

    return respond(200, {
      token,
      user: { id: user.id, username: user.username, is_admin: user.is_admin }
    });
  } catch (err) {
    console.error('Register error:', err);
    return respond(500, { error: 'Server error' });
  }
};
