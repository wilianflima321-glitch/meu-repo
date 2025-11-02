const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Simple logger (could be replaced with pino or bunyan)
const logger = {
  info: (msg, ...args) => console.log('[INFO]', typeof msg === 'object' ? JSON.stringify(msg) : msg, ...args),
  warn: (msg, ...args) => console.warn('[WARN]', typeof msg === 'object' ? JSON.stringify(msg) : msg, ...args),
  error: (msg, ...args) => console.error('[ERROR]', typeof msg === 'object' ? JSON.stringify(msg) : msg, ...args),
};

// In-memory data store
const DATA = {
  providers: [],
  usage_events: [],
  billing_records: [],
  quotas: {},
  promos: [],
  redeemedPromos: {},
  telemetry: [],
  payments: [],
  paymentConfig: {},
  items: [],
};

const dataFilePath = path.join(__dirname, '..', 'data.json');

// Ensure default structure exists
function ensureDefaults() {
  if (!DATA.providers) DATA.providers = [];
  if (!DATA.usage_events) DATA.usage_events = [];
  if (!DATA.billing_records) DATA.billing_records = [];
  if (!DATA.quotas) DATA.quotas = {};
  if (!DATA.promos) DATA.promos = [];
  if (!DATA.redeemedPromos) DATA.redeemedPromos = {};
  if (!DATA.telemetry) DATA.telemetry = [];
  if (!DATA.payments) DATA.payments = [];
  if (!DATA.paymentConfig) DATA.paymentConfig = {};
  if (!DATA.items) DATA.items = [];
}

// Persist DATA to JSON file
function persist() {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(DATA, null, 2), 'utf8');
  } catch (e) {
    logger.error({ err: e }, 'persist failed');
  }
}

// Load DATA from JSON file if it exists
function load() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      Object.assign(DATA, parsed);
      logger.info('loaded data from data.json');
    } else {
      logger.info('no data.json found, starting with empty DATA');
    }
    ensureDefaults();
  } catch (e) {
    logger.error({ err: e }, 'load failed, using empty DATA');
    ensureDefaults();
  }
}

// Add a usage event to DATA and persist
function addUsageEvent(event) {
  ensureDefaults();
  DATA.usage_events.push(event);
  persist();
}

// Find a provider by ID
function findProvider(providerId) {
  ensureDefaults();
  return (DATA.providers || []).find(p => p.id === providerId) || null;
}

// Sum tokens from a usage event
function sumTokens(usageEvent) {
  return (usageEvent.tokensInput || 0) + (usageEvent.tokensOutput || 0);
}

// Filter billing records by query params
function filterBillingRecords(query) {
  const all = DATA.billing_records || [];
  let out = all.slice();
  if (!query) return out;
  const { userId, providerId, from, to, limit, offset } = query;
  if (userId) {
    out = out.filter(r => String(r.userId) === String(userId));
  }
  if (providerId) {
    out = out.filter(r => String(r.providerId) === String(providerId));
  }
  if (from) {
    const f = new Date(String(from));
    if (!isNaN(f.getTime())) out = out.filter(r => new Date(r.reconciledAt) >= f);
  }
  if (to) {
    const t = new Date(String(to));
    if (!isNaN(t.getTime())) out = out.filter(r => new Date(r.reconciledAt) <= t);
  }
  const lim = parseInt(limit) || null;
  const off = parseInt(offset) || 0;
  if (lim && lim > 0) {
    out = out.slice(off, off + lim);
  } else if (off && off > 0) {
    out = out.slice(off);
  }
  return out;
}

// Generate payment URL
function generatePaymentUrl(id) {
  const base = (DATA.paymentConfig && DATA.paymentConfig.basePaymentUrl) 
    ? DATA.paymentConfig.basePaymentUrl.replace(/\/$/, '') 
    : 'https://payments.example.com';
  return `${base}/pay/${id}`;
}

// Attach payment link to billing record if needed
function attachPaymentLinkIfNeeded(billingRecord) {
  if (!billingRecord) return null;
  // Only create payment link for user-billed items with amount > 0
  if (billingRecord.billedTo !== 'user') return null;
  if (!billingRecord.amount || billingRecord.amount <= 0) return null;
  ensureDefaults();
  if (billingRecord.paymentLinkId) {
    return DATA.payments.find(p => p.id === billingRecord.paymentLinkId) || null;
  }
  const pid = uuidv4();
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

// Reconcile usage events into billing records
function reconcileOnce() {
  const newRecords = [];
  for (const u of DATA.usage_events) {
    const already = DATA.billing_records.find(b => b.usageEventId === u.id);
    if (already) continue;
    const provider = findProvider(u.providerId);
    const tokens = sumTokens(u);
    // apply redeemed promo freeTokens if any
    let freeTokensUsed = 0;
    if (u.userId && DATA.redeemedPromos && Array.isArray(DATA.redeemedPromos[u.userId])) {
      for (const red of DATA.redeemedPromos[u.userId]) {
        if (!red.remainingFreeTokens || red.remainingFreeTokens <= 0) continue;
        const use = Math.min(red.remainingFreeTokens, tokens - freeTokensUsed);
        if (use > 0) {
          red.remainingFreeTokens -= use;
          freeTokensUsed += use;
        }
        if (freeTokensUsed >= tokens) break;
      }
    }
    const billedTokens = Math.max(0, tokens - freeTokensUsed);
    const providerRate = (provider && provider.rateCard && provider.rateCard.pricePerToken) 
      ? provider.rateCard.pricePerToken : 0;
    const providerCost = +(providerRate * billedTokens);
    const infra = +(0.00001 * billedTokens); // tiny infra cost per token for mock
    const maintenance = +(0.05 * providerCost);
    const margin = +((providerCost + infra + maintenance) * 0.2);
    const amount = +(providerCost + infra + maintenance + margin);
    const billedTo = (u.billingMode === 'platform') 
      ? 'platform' 
      : (u.billingMode === 'self') ? 'user' : 'sponsor';
    const rec = {
      id: uuidv4(),
      usageEventId: u.id,
      providerId: u.providerId,
      userId: u.userId,
      orgId: u.orgId,
      tokens,
      freeTokensUsed,
      billedTokens,
      providerCost,
      infra,
      maintenance,
      margin,
      amount,
      currency: (provider && provider.rateCard && provider.rateCard.currency) 
        ? provider.rateCard.currency : 'USD',
      billedTo,
      reconciledAt: new Date().toISOString()
    };
    DATA.billing_records.push(rec);
    newRecords.push(rec);
  }
  if (newRecords.length) persist();
  if (newRecords.length) logger.info(`reconcileOnce created ${newRecords.length} records`);
  // after creating billing records, ensure payment links exist for billable user-charges
  for (const r of newRecords) {
    try {
      attachPaymentLinkIfNeeded(r);
    } catch (e) {
      logger.error('attachPaymentLinkIfNeeded failed', e);
    }
  }
  return newRecords;
}

// Simple encryption/decryption for dev purposes (not production-grade)
function encryptEnvelope(plaintext, masterKeyBase64) {
  // For dev/mock purposes, just base64 encode with a prefix
  const encoded = Buffer.from(plaintext, 'utf8').toString('base64');
  return `envelope:${encoded}`;
}

function decryptEnvelope(encrypted, masterKeyBase64) {
  // For dev/mock purposes, just base64 decode
  if (!encrypted || !encrypted.startsWith('envelope:')) {
    throw new Error('invalid_envelope_format');
  }
  const encoded = encrypted.substring('envelope:'.length);
  return Buffer.from(encoded, 'base64').toString('utf8');
}

// Prometheus metrics (mock implementation)
const metricsRegister = {
  contentType: 'text/plain; version=0.0.4'
};

async function getMetrics() {
  // Return simple mock metrics
  ensureDefaults();
  const lines = [
    '# HELP llm_mock_providers_total Total number of providers',
    '# TYPE llm_mock_providers_total gauge',
    `llm_mock_providers_total ${DATA.providers.length}`,
    '# HELP llm_mock_usage_events_total Total number of usage events',
    '# TYPE llm_mock_usage_events_total counter',
    `llm_mock_usage_events_total ${DATA.usage_events.length}`,
    '# HELP llm_mock_billing_records_total Total number of billing records',
    '# TYPE llm_mock_billing_records_total counter',
    `llm_mock_billing_records_total ${DATA.billing_records.length}`,
  ];
  return lines.join('\n');
}

// Initialize on module load
load();

module.exports = {
  DATA,
  logger,
  ensureDefaults,
  persist,
  load,
  addUsageEvent,
  findProvider,
  sumTokens,
  filterBillingRecords,
  generatePaymentUrl,
  attachPaymentLinkIfNeeded,
  reconcileOnce,
  encryptEnvelope,
  decryptEnvelope,
  metricsRegister,
  getMetrics,
};
