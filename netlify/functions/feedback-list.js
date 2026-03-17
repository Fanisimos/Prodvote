const { getDb, respond, handleOptions, getUser } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'GET') return respond(405, { error: 'Method not allowed' });

  try {
    const sql = getDb();
    const user = getUser(event);
    const userId = user ? user.userId : null;

    const feedback = await sql`
      SELECT
        f.id,
        f.body,
        f.dev_hearted,
        f.created_at,
        u.username,
        u.is_admin AS author_is_admin,
        COUNT(fl.user_id)::int AS like_count,
        BOOL_OR(fl.user_id = ${userId}) AS user_liked
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN feedback_likes fl ON fl.feedback_id = f.id
      GROUP BY f.id, u.username, u.is_admin
      ORDER BY f.created_at DESC
      LIMIT 100
    `;

    return respond(200, { feedback });
  } catch (err) {
    console.error('List feedback error:', err);
    return respond(500, { error: 'Server error' });
  }
};
