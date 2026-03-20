/**
 * Prota Community — Vercel Serverless Function
 * Proxy de verificação Cakto (substituição do verify.php)
 */

const crypto = require('crypto');

const CLIENT_ID     = 'sGhdc3NwKKKhH8dzK0uGzrl0yxcr28v8indAfnXL';
const CLIENT_SECRET = 'I0G2lvi8NPqWHd7VMB2AcbXJuca6P4hK8p5PJPYTxiyVgF6tcvWCitIrHKTMemI5aEflv14fLjJMEVfNClntnjIUH8YSXm1pN69ABhrFpaCDdk9LgD7TZqkT4WhaYY2i';
const CAKTO_API     = 'https://api.cakto.com.br';

// Rate limiting
const rateMap = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 300;

// Token cache
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

async function getToken() {
  // Use node-fetch compatible approach (https module as fallback)
  const https = require('https');
  const querystring = require('querystring');

  const postData = querystring.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'read orders'
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.cakto.com.br',
      path: '/public_api/token/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const data = JSON.parse(body);
            resolve(data.access_token || null);
          } else {
            console.error('[Prota] Token HTTP', res.statusCode, body);
            resolve(null);
          }
        } catch (e) {
          console.error('[Prota] Token parse error:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('[Prota] Token request error:', e.message);
      resolve(null);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

async function fetchOrders(token, email) {
  const https = require('https');
  const searchPath = '/public_api/orders/?status=paid&search=' + encodeURIComponent(email) + '&limit=100';

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.cakto.com.br',
      path: searchPath,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            resolve({ ok: true, data: JSON.parse(body) });
          } else {
            console.error('[Prota] Orders HTTP', res.statusCode, body.substring(0, 200));
            resolve({ ok: false, data: null });
          }
        } catch (e) {
          console.error('[Prota] Orders parse error:', e.message);
          resolve({ ok: false, data: null });
        }
      });
    });

    req.on('error', (e) => {
      console.error('[Prota] Orders request error:', e.message);
      resolve({ ok: false, data: null });
    });

    req.setTimeout(20000, () => {
      req.destroy();
      resolve({ ok: false, data: null });
    });

    req.end();
  });
}

module.exports = async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  const now = Math.floor(Date.now() / 1000);

  if (rateMap.has(ip)) {
    const entry = rateMap.get(ip);
    if (now - entry.start < WINDOW_SECONDS) {
      if (entry.count >= MAX_ATTEMPTS) {
        return res.status(429).json({ success: false, error: 'Muitas tentativas. Aguarde 5 minutos.' });
      }
      entry.count++;
    } else {
      rateMap.set(ip, { start: now, count: 1 });
    }
  } else {
    rateMap.set(ip, { start: now, count: 1 });
  }

  // Ler body
  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch (e) {
      return res.status(400).json({ success: false, error: 'JSON inválido no body.' });
    }
  }

  const email = (body.email || '').trim();
  const cpf = (body.cpf || '').replace(/[^0-9]/g, '').trim();

  if (!email || !cpf) {
    return res.status(400).json({ success: false, error: 'Email e CPF são obrigatórios.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Email inválido.' });
  }

  if (cpf.length !== 11) {
    return res.status(400).json({ success: false, error: 'CPF inválido. Use 11 dígitos.' });
  }

  if (!validarCPF(cpf)) {
    return res.status(400).json({ success: false, error: 'CPF inválido.' });
  }

  // Obter token
  let token = cachedToken;
  if (!token || Date.now() / 1000 >= tokenExpiresAt) {
    token = await getToken();
    if (!token) {
      return res.status(500).json({ success: false, error: 'Erro ao conectar com o sistema de pagamento.' });
    }
    cachedToken = token;
    tokenExpiresAt = Math.floor(Date.now() / 1000) + 32400;
  }

  // Buscar pedidos
  let orderResult = await fetchOrders(token, email);

  // Se falhou, renovar token
  if (!orderResult.ok) {
    cachedToken = null;
    token = await getToken();
    if (token) {
      cachedToken = token;
      tokenExpiresAt = Math.floor(Date.now() / 1000) + 32400;
      orderResult = await fetchOrders(token, email);
    }

    if (!orderResult.ok) {
      return res.status(500).json({ success: false, error: 'Erro ao verificar pagamento. Tente novamente.' });
    }
  }

  const data = orderResult.data;

  // Extrair resultados
  let results = [];
  if (data && data.results && Array.isArray(data.results)) {
    results = data.results;
  } else if (data && data.data && Array.isArray(data.data)) {
    results = data.data;
  } else if (data && data.items && Array.isArray(data.items)) {
    results = data.items;
  } else if (Array.isArray(data)) {
    results = data;
  }

  // Verificar pedido
  let found = false;
  let customerName = '';

  for (let i = 0; i < results.length; i++) {
    const order = results[i];
    const customer = order.customer || order.buyer || order.client || {};
    const cust = typeof customer === 'object' && customer !== null ? customer : {};

    const orderEmail = (
      cust.email || order.email || order.buyer_email || order.customer_email || ''
    ).toLowerCase().trim();

    const rawDoc = String(
      cust.docNumber || cust.document || cust.doc || cust.cpf || cust.tax_id ||
      order.docNumber || order.document || order.doc || order.cpf || order.buyer_document || ''
    );
    const orderDoc = rawDoc.replace(/[^0-9]/g, '');

    const orderStatus = (order.status || '').toLowerCase();

    if (
      orderEmail === email.toLowerCase() &&
      orderDoc === cpf &&
      ['paid', 'completed', 'approved', 'active', 'delivered'].indexOf(orderStatus) !== -1
    ) {
      found = true;
      customerName = cust.name || cust.full_name || order.buyer_name || '';
      break;
    }
  }

  if (found) {
    const today = new Date().toISOString().split('T')[0];
    const sessionToken = crypto
      .createHash('sha256')
      .update(email + cpf + today + 'prota_community_secret_key')
      .digest('hex');

    return res.status(200).json({ success: true, name: customerName, token: sessionToken });
  } else {
    return res.status(403).json({
      success: false,
      error: 'Nenhuma compra encontrada com esse email e CPF. Verifique os dados ou entre em contato com o suporte.'
    });
  }
};
