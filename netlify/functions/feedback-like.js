const { getDb, respond, handleOptions, getUser } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  const user = getUser(event);
  if (!user) return respond(401, { error: 'Login required' });

  try {
    const { feedback_id } = JSON.parse(event.body);
    if (!feedback_id) return respond(400, { error: 'feedback_id required' });

    const sql = getDb();

    // Check if already liked
    const existing = await sql`
      SELECT 1 FROM feedback_likes
      WHERE user_id = ${user.userId} AND feedback_id = ${feedback_id}
    `;

    if (existing.length > 0) {
      // Unlike
      await sql`
        DELETE FROM feedback_likes
        WHERE user_id = ${user.userId} AND feedback_id = ${feedback_id}
      `;
      return respond(200, { liked: false });
    } else {
      // Like
      await sql`
        INSERT INTO feedback_likes (user_id, feedback_id)
        VALUES (${user.userId}, ${feedback_id})
      `;
      return respond(200, { liked: true });
    }
  } catch (err) {
    console.error('Like error:', err);
    return respond(500, { error: 'Server error' });
  }
};
