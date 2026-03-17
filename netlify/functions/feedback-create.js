const { getDb, respond, handleOptions, getUser } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  const user = getUser(event);
  if (!user) return respond(401, { error: 'Login required' });

  try {
    const { body } = JSON.parse(event.body);

    if (!body || body.trim().length < 3) {
      return respond(400, { error: 'Feedback must be at least 3 characters' });
    }

    if (body.length > 500) {
      return respond(400, { error: 'Feedback must be under 500 characters' });
    }

    const sql = getDb();

    // Check if banned
    const userRow = await sql`SELECT is_banned FROM users WHERE id = ${user.userId}`;
    if (userRow.length === 0 || userRow[0].is_banned) {
      return respond(403, { error: 'Account banned' });
    }

    // Rate limit: max 5 feedback per hour
    const recent = await sql`
      SELECT COUNT(*)::int AS count FROM feedback
      WHERE user_id = ${user.userId}
      AND created_at > NOW() - INTERVAL '1 hour'
    `;
    if (recent[0].count >= 5) {
      return respond(429, { error: 'Too many posts. Try again later.' });
    }

    const result = await sql`
      INSERT INTO feedback (user_id, body)
      VALUES (${user.userId}, ${body.trim()})
      RETURNING id, body, dev_hearted, created_at
    `;

    return respond(201, {
      feedback: { ...result[0], username: user.username, like_count: 0, user_liked: false }
    });
  } catch (err) {
    console.error('Create feedback error:', err);
    return respond(500, { error: 'Server error' });
  }
};
