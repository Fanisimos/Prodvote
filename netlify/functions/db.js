const { neon } = require('@neondatabase/serverless');

let sql;

function getDb() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body),
  };
}

function handleOptions() {
  return { statusCode: 204, headers: corsHeaders(), body: '' };
}

// Simple token: base64(userId:username:timestamp:secret)
function generateToken(userId, username) {
  const secret = process.env.TOKEN_SECRET || 'eisenhower-default-secret';
  const payload = `${userId}:${username}:${Date.now()}:${secret}`;
  return Buffer.from(payload).toString('base64');
}

function verifyToken(token) {
  try {
    const secret = process.env.TOKEN_SECRET || 'eisenhower-default-secret';
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 4) return null;
    if (parts[3] !== secret) return null;
    return { userId: parseInt(parts[0]), username: parts[1] };
  } catch {
    return null;
  }
}

function getUser(event) {
  const auth = event.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

module.exports = { getDb, respond, handleOptions, generateToken, verifyToken, getUser };
