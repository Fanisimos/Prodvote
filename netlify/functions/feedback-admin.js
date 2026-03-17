const { getDb, respond, handleOptions, getUser } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  const user = getUser(event);
  if (!user) return respond(401, { error: 'Login required' });

  try {
    const sql = getDb();

    // Verify admin
    const adminCheck = await sql`SELECT is_admin FROM users WHERE id = ${user.userId}`;
    if (adminCheck.length === 0 || !adminCheck[0].is_admin) {
      return respond(403, { error: 'Admin access required' });
    }

    const { action, feedback_id, target_user_id } = JSON.parse(event.body);

    switch (action) {
      case 'delete': {
        if (!feedback_id) return respond(400, { error: 'feedback_id required' });
        await sql`DELETE FROM feedback WHERE id = ${feedback_id}`;
        return respond(200, { message: 'Feedback deleted' });
      }

      case 'dev_heart': {
        if (!feedback_id) return respond(400, { error: 'feedback_id required' });
        const result = await sql`
          UPDATE feedback SET dev_hearted = NOT dev_hearted
          WHERE id = ${feedback_id}
          RETURNING dev_hearted
        `;
        return respond(200, { dev_hearted: result[0]?.dev_hearted || false });
      }

      case 'ban_user': {
        if (!target_user_id) return respond(400, { error: 'target_user_id required' });
        // Don't let admin ban themselves
        if (target_user_id === user.userId) {
          return respond(400, { error: 'Cannot ban yourself' });
        }
        await sql`UPDATE users SET is_banned = TRUE WHERE id = ${target_user_id}`;
        return respond(200, { message: 'User banned' });
      }

      case 'unban_user': {
        if (!target_user_id) return respond(400, { error: 'target_user_id required' });
        await sql`UPDATE users SET is_banned = FALSE WHERE id = ${target_user_id}`;
        return respond(200, { message: 'User unbanned' });
      }

      default:
        return respond(400, { error: 'Invalid action. Use: delete, dev_heart, ban_user, unban_user' });
    }
  } catch (err) {
    console.error('Admin error:', err);
    return respond(500, { error: 'Server error' });
  }
};
