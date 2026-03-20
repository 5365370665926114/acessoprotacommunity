/**
 * Prota Community — Netlify Serverless Function
 * Proxy de verificação Cakto
 */

const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

const CLIENT_ID     = 'sGhdc3NwKKKhH8dzK0uGzrl0yxcr28v8indAfnXL';
const CLIENT_SECRET = 'I0G2lvi8NPqWHd7VMB2AcbXJuca6P4hK8p5PJPYTxiyVgF6tcvWCitIrHKTMemI5aEflv14fLjJMEVfNClntnjIUH8YSXm1pN69ABhrFpaCDdk9LgD7TZqkT4WhaYY2i';
const CAKTO_API_HOST = 'api.cakto.com.br';

let cachedToken = null;
let tokenExpiresAt = 0;

function validarCPF(cpf) {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  for (let t = 9; t < 11; t++) {
    let d = 0;
    for (let c = 0; c < t; c++) {
      d += parseInt(cpf[c]) * ((t + 1) - c);
    }
    d = ((10 * d) % 11) % 10;
    if (parseInt(cpf[t]) !== d) return false;
  }
  return true;
}

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: body });
      });
    });
    req.on('error', (e) => reject(e));
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    if (postData) req.write(postData);
    req.end();
  });
}

async function getToken() {
  try {
    const postData = querystring.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'read orders'
    });
    const result = await httpsRequest({
      hostname: CAKTO_API_HOST,
      path: '/public_api/token/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    if (result.statusCode === 200) {
      const data = JSON.parse(result.body);
      return data.access_token || null;
    }
    console.error('[Prota] Token HTTP', result.statusCode);
    return null;
  } catch (e) {
    console.error('[Prota] Token error:', e.message);
    return null;
  }
}

async function fetchOrders(token, email) {
  try {
    const result = await httpsRequest({
      hostname: CAKTO_API_HOST,
      path: '/public_api/orders/?status=paid&search=' + encodeURIComponent(email) + '&limit=100',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });

    if (result.statusCode === 200) {
      return { ok: true, data: JSON.parse(result.body) };
    }
    return { ok: false, data: null };
  } catch (e) {
    console.error('[Prota] Orders error:', e.message);
    return { ok: false, data: null };
  }
}

// Netlify Function handler
exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Método não permitido' }) };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'JSON inválido.' }) };
  }

  const email = (body.email || '').trim();
  const cpf = (body.cpf || '').replace(/[^0-9]/g, '').trim();

  if (!email || !cpf) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Email e CPF são obrigatórios.' }) };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Email inválido.' }) };
  }

  if (cpf.length !== 11) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'CPF inválido. Use 11 dígitos.' }) };
  }

  if (!validarCPF(cpf)) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'CPF inválido.' }) };
  }

  // Get token
  let token = cachedToken;
  if (!token || Date.now() / 1000 >= tokenExpiresAt) {
    token = await getToken();
    if (!token) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Erro ao conectar com o sistema de pagamento.' }) };
    }
    cachedToken = token;
    tokenExpiresAt = Math.floor(Date.now() / 1000) + 32400;
  }

  // Fetch orders
  let orderResult = await fetchOrders(token, email);

  if (!orderResult.ok) {
    cachedToken = null;
    token = await getToken();
    if (token) {
      cachedToken = token;
      tokenExpiresAt = Math.floor(Date.now() / 1000) + 32400;
      orderResult = await fetchOrders(token, email);
    }
    if (!orderResult.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Erro ao verificar pagamento. Tente novamente.' }) };
    }
  }

  const data = orderResult.data;
  let results = [];
  if (data && data.results && Array.isArray(data.results)) results = data.results;
  else if (data && data.data && Array.isArray(data.data)) results = data.data;
  else if (data && data.items && Array.isArray(data.items)) results = data.items;
  else if (Array.isArray(data)) results = data;

  let found = false;
  let customerName = '';

  for (let i = 0; i < results.length; i++) {
    const order = results[i];
    const customer = order.customer || order.buyer || order.client || {};
    const cust = typeof customer === 'object' && customer !== null ? customer : {};

    const orderEmail = (cust.email || order.email || order.buyer_email || order.customer_email || '').toLowerCase().trim();
    const rawDoc = String(cust.docNumber || cust.document || cust.doc || cust.cpf || cust.tax_id || order.docNumber || order.document || order.doc || order.cpf || order.buyer_document || '');
    const orderDoc = rawDoc.replace(/[^0-9]/g, '');
    const orderStatus = (order.status || '').toLowerCase();

    if (orderEmail === email.toLowerCase() && orderDoc === cpf && ['paid', 'completed', 'approved', 'active', 'delivered'].indexOf(orderStatus) !== -1) {
      found = true;
      customerName = cust.name || cust.full_name || order.buyer_name || '';
      break;
    }
  }

  if (found) {
    const today = new Date().toISOString().split('T')[0];
    const sessionToken = crypto.createHash('sha256').update(email + cpf + today + 'prota_community_secret_key').digest('hex');
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, name: customerName, token: sessionToken }) };
  } else {
    return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Nenhuma compra encontrada com esse email e CPF. Verifique os dados ou entre em contato com o suporte.' }) };
  }
};
