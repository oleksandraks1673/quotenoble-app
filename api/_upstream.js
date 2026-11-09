'use strict';

// Preview deploys do not include the production company and document functions.
// Forward those calls to the live site so a signed-in account reads the same
// company and records. This file does not create, update, or delete rows itself.
const ORIGIN = 'https://www.quotenoble.com';

async function proxy(req, res, path) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({error: 'Use POST.'});
  }
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  const headers = {'content-type': 'application/json'};
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers['x-qn-company']) headers['x-qn-company'] = req.headers['x-qn-company'];
  const upstream = await fetch(ORIGIN + path, {method: 'POST', headers, body});
  const text = await upstream.text();
  res.status(upstream.status);
  const type = upstream.headers.get('content-type');
  if (type) res.setHeader('content-type', type);
  res.send(text);
}

module.exports = {proxy};
