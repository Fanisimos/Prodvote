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

    const sql = getDb();
    const result = await sql`
      SELECT id, username, password_hash, is_admin, is_banned
      FROM users WHERE LOWER(username) = LOWER(${username})
    `;

    if (result.length === 0) {
      return respond(401, { error: 'Invalid username or password' });
    }

    const user = result[0];

    if (user.is_banned) {
      return respond(403, { error: 'Account has been banned' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return respond(401, { error: 'Invalid username or password' });
    }

    const token = generateToken(user.id, user.username);

    return respond(200, {
      token,
      user: { id: user.id, username: user.username, is_admin: user.is_admin }
    });
  } catch (err) {
    console.error('Login error:', err);
    return respond(500, { error: 'Server error' });
  }
};
