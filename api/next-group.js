const groupsConfig = require('../groups-v2.json');

// Namespace exclusivo desta LP (mesmo Redis compartilhado não colide com outros clientes)
const REDIS_KEY = 'lp-wk:v2:whatsapp-group:seq';

function getGroups() {
  const fromEnv = (process.env.WK_GROUP_URLS || '')
    .split(/[\n,]+/)
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
  if (fromEnv.length) return fromEnv;
  const fromFile = groupsConfig && Array.isArray(groupsConfig.groups) ? groupsConfig.groups : [];
  return fromFile.filter(Boolean);
}

async function redisIncr(key) {
  var url = process.env.UPSTASH_REDIS_REST_URL;
  var token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('missing_upstash_env');

  var endpoint = url.replace(/\/$/, '') + '/incr/' + encodeURIComponent(key);
  var res = await fetch(endpoint, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('upstash_' + res.status);
  var data = await res.json();
  if (typeof data.result !== 'number') throw new Error('upstash_bad_result');
  return data.result;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.json({ error: 'method_not_allowed' });
  }

  var groups = getGroups();
  if (!groups.length) {
    res.statusCode = 500;
    return res.json({ error: 'no_groups_configured' });
  }

  try {
    var seq = await redisIncr(REDIS_KEY);
    var index = (seq - 1) % groups.length;
    return res.status(200).json({
      url: groups[index],
      index: index,
      total: groups.length,
      seq: seq,
      source: 'redis',
    });
  } catch (err) {
    // Fallback: não quebra o CTA se Redis falhar
    return res.status(200).json({
      url: groups[0],
      index: 0,
      total: groups.length,
      seq: null,
      source: 'fallback',
      warning: String(err && err.message ? err.message : err),
    });
  }
};
