const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataFilePath = path.join(__dirname, '..', 'data.json');

function makeDefaultData() {
  return {
    providers: [],
    usage_events: [],
    telemetry: [],
    quotas: {},
    promos: [],
    redeemedPromos: {},
    billing_records: [],
    payments: [],
    paymentConfig: { basePaymentUrl: null },
    items: []
  };
}

function loadData() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      return Object.assign(makeDefaultData(), parsed || {});
    }
  } catch (e) {
    // fall through to defaults
  }
  return makeDefaultData();
}

// IMPORTANT: keep DATA as a stable object reference (server.js holds `const DATA = core.DATA`).
const DATA = loadData();

function ensureDefaults() {
  if (!DATA.providers) DATA.providers = [];
  if (!Array.isArray(DATA.providers)) DATA.providers = [];

  if (!DATA.usage_events) DATA.usage_events = [];
  if (!Array.isArray(DATA.usage_events)) DATA.usage_events = [];

  if (!DATA.telemetry) DATA.telemetry = [];
  if (!Array.isArray(DATA.telemetry)) DATA.telemetry = [];

  if (!DATA.quotas || typeof DATA.quotas !== 'object' || Array.isArray(DATA.quotas)) DATA.quotas = {};
  if (!DATA.promos) DATA.promos = [];
  if (!Array.isArray(DATA.promos)) DATA.promos = [];

  if (!DATA.redeemedPromos || typeof DATA.redeemedPromos !== 'object' || Array.isArray(DATA.redeemedPromos)) DATA.redeemedPromos = {};

  if (!DATA.billing_records) DATA.billing_records = [];
  if (!Array.isArray(DATA.billing_records)) DATA.billing_records = [];

  if (!DATA.payments) DATA.payments = [];
  if (!Array.isArray(DATA.payments)) DATA.payments = [];

  if (!DATA.paymentConfig || typeof DATA.paymentConfig !== 'object') DATA.paymentConfig = { basePaymentUrl: null };
  if (!Object.prototype.hasOwnProperty.call(DATA.paymentConfig, 'basePaymentUrl')) DATA.paymentConfig.basePaymentUrl = null;

  if (!DATA.items) DATA.items = [];
  if (!Array.isArray(DATA.items)) DATA.items = [];
}

function persist() {
  ensureDefaults();
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(DATA, null, 2));
  } catch (e) {
    logger.error({ err: e }, 'persist failed');
  }
}

function isDebugEnabled() {
  const v = process.env.MOCK_DEBUG;
  if (!v) return false;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

const logger = {
  level: isDebugEnabled() ? 'debug' : 'info',
  info(meta, msg) {
    if (typeof meta === 'string' && msg === undefined) {
      console.log(meta);
      return;
    }
    if (msg) console.log(msg);
  },
  debug(meta, msg) {
    if (logger.level !== 'debug') return;
    if (typeof meta === 'string' && msg === undefined) {
      console.log(meta);
      return;
    }
    if (msg) console.log(msg);
  },
  error(meta, msg) {
    if (typeof meta === 'string' && msg === undefined) {
      console.error(meta);
      return;
    }
    if (msg) console.error(msg);
  }
};

function addUsageEvent(ev) {
  ensureDefaults();
  DATA.usage_events.push(ev);
  persist();
}

function sumTokens(u) {
  return (u && (u.tokensInput || 0)) + (u && (u.tokensOutput || 0));
}

function findProvider(providerId) {
  ensureDefaults();
  return (DATA.providers || []).find(p => p && String(p.id) === String(providerId)) || null;
}

function filterBillingRecords(query) {
  ensureDefaults();
  const all = DATA.billing_records || [];
  let out = all.slice();
  if (!query) return out;

  const { userId, providerId, from, to, limit, offset } = query;
  if (userId) out = out.filter(r => String(r.userId) === String(userId));
  if (providerId) out = out.filter(r => String(r.providerId) === String(providerId));

  if (from) {
    const f = new Date(String(from));
    if (!isNaN(f.getTime())) out = out.filter(r => r.reconciledAt && new Date(r.reconciledAt) >= f);
  }
  if (to) {
    const t = new Date(String(to));
    if (!isNaN(t.getTime())) out = out.filter(r => r.reconciledAt && new Date(r.reconciledAt) <= t);
  }

  const lim = parseInt(limit) || null;
  const off = parseInt(offset) || 0;
  if (lim && lim > 0) out = out.slice(off, off + lim);
  else if (off && off > 0) out = out.slice(off);

  return out;
}

function generatePaymentUrl(id) {
  ensureDefaults();
  const base = (DATA.paymentConfig && DATA.paymentConfig.basePaymentUrl)
    ? String(DATA.paymentConfig.basePaymentUrl).replace(/\/$/, '')
    : 'https://payments.example.com';
  return `${base}/pay/${id}`;
}

function attachPaymentLinkIfNeeded(billingRecord) {
  if (!billingRecord) return null;
  ensureDefaults();

  if (billingRecord.billedTo !== 'user') return null;
  if (!billingRecord.amount || billingRecord.amount <= 0) return null;
  if (billingRecord.paymentLinkId) {
    return (DATA.payments || []).find(p => p.id === billingRecord.paymentLinkId) || null;
  }

  const pid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const url = generatePaymentUrl(pid);
  const payment = {
    id: pid,
    billingRecordId: billingRecord.id,
    userId: billingRecord.userId,
    amount: billingRecord.amount,
    currency: billingRecord.currency || 'USD',
    status: 'pending',
    url,
    createdAt: new Date().toISOString()
  };
  DATA.payments.push(payment);
  billingRecord.paymentLinkId = pid;
  persist();
  return payment;
}

function reconcileOnce() {
  ensureDefaults();
  const created = [];

  for (const u of DATA.usage_events) {
    if (!u || !u.id) continue;
    const already = (DATA.billing_records || []).find(b => b && b.usageEventId === u.id);
    if (already) continue;

    const provider = findProvider(u.providerId);
    const tokens = sumTokens(u);
    const providerRate = (provider && provider.rateCard && provider.rateCard.pricePerToken) ? provider.rateCard.pricePerToken : 0;
    const providerCost = +(providerRate * tokens);
    const amount = +providerCost;
    const billedTo = (u.billingMode === 'platform') ? 'platform' : (u.billingMode === 'self') ? 'user' : 'sponsor';

    const rec = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      usageEventId: u.id,
      providerId: u.providerId,
      userId: u.userId || null,
      orgId: u.orgId || null,
      tokens,
      freeTokensUsed: 0,
      billedTokens: tokens,
      providerCost,
      infra: 0,
      maintenance: 0,
      margin: 0,
      amount,
      currency: (provider && provider.rateCard && provider.rateCard.currency) ? provider.rateCard.currency : 'USD',
      billedTo,
      reconciledAt: new Date().toISOString()
    };

    DATA.billing_records.push(rec);
    created.push(rec);

    try {
      attachPaymentLinkIfNeeded(rec);
    } catch (e) {
      logger.debug({ err: e }, 'attachPaymentLinkIfNeeded failed');
    }
  }

  if (created.length) persist();
  return created;
}

function encryptEnvelope(plainText, masterKeyB64) {
  const key = Buffer.from(String(masterKeyB64), 'base64');
  if (key.length !== 32) throw new Error('masterKey must be 32 bytes (base64)');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

function decryptEnvelope(payload, masterKeyB64) {
  const key = Buffer.from(String(masterKeyB64), 'base64');
  if (key.length !== 32) throw new Error('masterKey must be 32 bytes (base64)');
  const parts = String(payload).split('.');
  if (parts.length !== 3) throw new Error('invalid payload');
  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const enc = Buffer.from(parts[2], 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
  return plain.toString('utf8');
}

const metricsRegister = {
  contentType: 'text/plain; version=0.0.4; charset=utf-8'
};

async function getMetrics() {
  ensureDefaults();
  const providers = (DATA.providers || []).length;
  const usage = (DATA.usage_events || []).length;
  const billing = (DATA.billing_records || []).length;
  return [
    '# HELP llm_mock_providers_count Number of providers in mock',
    '# TYPE llm_mock_providers_count gauge',
    `llm_mock_providers_count ${providers}`,
    '# HELP llm_mock_usage_events_count Number of usage events in mock',
    '# TYPE llm_mock_usage_events_count gauge',
    `llm_mock_usage_events_count ${usage}`,
    '# HELP llm_mock_billing_records_count Number of billing records in mock',
    '# TYPE llm_mock_billing_records_count gauge',
    `llm_mock_billing_records_count ${billing}`
  ].join('\n') + '\n';
}

module.exports = {
  DATA,
  logger,
  ensureDefaults,
  persist,
  addUsageEvent,
  filterBillingRecords,
  reconcileOnce,
  generatePaymentUrl,
  attachPaymentLinkIfNeeded,
  encryptEnvelope,
  decryptEnvelope,
  metricsRegister,
  getMetrics
};
