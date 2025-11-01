const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const client = require('prom-client');

// If MOCK_DEBUG is truthy, enable debug-level logging regardless of LOG_LEVEL
const effectiveLogLevel = (process.env.MOCK_DEBUG && String(process.env.MOCK_DEBUG).toLowerCase() !== 'false') ? 'debug' : (process.env.LOG_LEVEL || 'info');
const logger = pino({ level: effectiveLogLevel });
// basic metrics
const register = new client.Registry();
const reconcileCounter = new client.Counter({ name: 'llm_mock_reconcile_runs_total', help: 'Number of reconcile runs', registers: [register] });
const billingRecordsCreated = new client.Counter({ name: 'llm_mock_billing_records_created_total', help: 'Number of billing records created', registers: [register] });

const DATA_FILE = path.join(__dirname, '..', 'data.json');
let DATA = { providers: [], usage_events: [], billing_records: [] };

// optional sqlite storage (require early so helpers can use it)
const storage = require('./storage-sqlite');
const DBPATH = path.join(__dirname, '..', 'data.sqlite');
try {
  storage.init(DBPATH);
  if (storage.available) logger.info({ db: DBPATH }, 'sqlite storage enabled');
} catch (e) { logger.error({ err: e }, 'storage init failed'); }
function ensureDefaults() {
  if (!Array.isArray(DATA.providers)) DATA.providers = [];
  if (!Array.isArray(DATA.usage_events)) DATA.usage_events = [];
  if (!Array.isArray(DATA.billing_records)) DATA.billing_records = [];
  if (!DATA.quotas || typeof DATA.quotas !== 'object') DATA.quotas = {};
  if (!Array.isArray(DATA.promos)) DATA.promos = [];
  if (!DATA.redeemedPromos || typeof DATA.redeemedPromos !== 'object') DATA.redeemedPromos = {};
  if (!Array.isArray(DATA.payments)) DATA.payments = [];
  if (!DATA.paymentConfig || typeof DATA.paymentConfig !== 'object') DATA.paymentConfig = { basePaymentUrl: null };
}
try {
  if (fs.existsSync(DATA_FILE)) {
    DATA = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || DATA;
    ensureDefaults();
  }
} catch (e) {
  console.warn('Failed to read data file, starting empty', e);
}
function persist() {
  try {
    // atomic write: write to temp and rename
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(DATA, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) { logger.error({ err: e }, 'persist error'); }
}

// Simple AES-GCM envelope encryption utilities (dev-only). The caller provides a base64 masterKey (32 bytes)
const crypto = require('crypto');
function encryptEnvelope(plaintext, base64Key) {
  const key = Buffer.from(base64Key, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}
function decryptEnvelope(envelopeB64, base64Key) {
  const raw = Buffer.from(envelopeB64, 'base64');
  const key = Buffer.from(base64Key, 'base64');
  const iv = raw.slice(0, 12);
  const tag = raw.slice(12, 28);
  const ct = raw.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

// If a master key is provided via env, try to auto-decrypt stored provider keys
function autoDecryptProvidersFromEnv() {
  const mk = process.env.MOCK_MASTER_KEY;
  if (!mk) return;
  try {
    ensureDefaults();
    for (const p of DATA.providers || []) {
      if (p.config && p.config._encryptedApiKey && !p.config.apiKey) {
        try {
          const plain = decryptEnvelope(p.config._encryptedApiKey, mk);
          p.config.apiKey = plain;
          logger.info({ providerId: p.id }, 'auto-decrypted provider api key from env');
        } catch (e) {
          logger.error({ err: e, providerId: p.id }, 'failed auto-decrypt provider');
        }
      }
    }
  } catch (e) {
    logger.error({ err: e }, 'autoDecryptProvidersFromEnv failed');
  }
}

function sumTokens(u) {
  return (u.tokensInput || 0) + (u.tokensOutput || 0);
}
function findProvider(providerId) {
  return DATA.providers.find(p => p.id === providerId);
}

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

function reconcileOnce() {
  ensureDefaults();
  reconcileCounter.inc();
  const newRecords = [];
  for (const u of DATA.usage_events) {
    const already = DATA.billing_records.find(b => b.usageEventId === u.id);
    if (already) continue;
    const provider = findProvider(u.providerId);
    const tokens = sumTokens(u);
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
    const providerRate = (provider && provider.rateCard && provider.rateCard.pricePerToken) ? provider.rateCard.pricePerToken : 0;
    const providerCost = +(providerRate * billedTokens);
    const infra = +(0.00001 * billedTokens);
    const maintenance = +(0.05 * providerCost);
    const margin = +((providerCost + infra + maintenance) * 0.2);
    const amount = +(providerCost + infra + maintenance + margin);
    const billedTo = (u.billingMode === 'platform') ? 'platform' : (u.billingMode === 'self') ? 'user' : 'sponsor';
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
      currency: (provider && provider.rateCard && provider.rateCard.currency) ? provider.rateCard.currency : 'USD',
      billedTo,
      reconciledAt: new Date().toISOString()
    };
    DATA.billing_records.push(rec);
    // persist to optional sqlite if enabled
    try {
      if (storage && storage.persistBillingRecord) storage.persistBillingRecord(rec);
    } catch (e) { logger.error({ err: e, recId: rec.id }, 'failed sqlite persist billing_record'); }
    newRecords.push(rec);
  }
  if (newRecords.length) persist();
  for (const r of newRecords) {
    try { attachPaymentLinkIfNeeded(r); } catch (e) { logger.error({ err: e }, 'attachPaymentLinkIfNeeded failed'); }
  }
  if (newRecords.length) billingRecordsCreated.inc(newRecords.length);
  return newRecords;
}

function generatePaymentUrl(id) {
  const base = (DATA.paymentConfig && DATA.paymentConfig.basePaymentUrl) ? DATA.paymentConfig.basePaymentUrl.replace(/\/$/, '') : 'https://payments.example.com';
  return `${base}/pay/${id}`;
}

function attachPaymentLinkIfNeeded(billingRecord) {
  if (!billingRecord) return null;
  if (billingRecord.billedTo !== 'user') return null;
  if (!billingRecord.amount || billingRecord.amount <= 0) return null;
  ensureDefaults();
  if (billingRecord.paymentLinkId) return DATA.payments.find(p => p.id === billingRecord.paymentLinkId) || null;
  const pid = uuidv4();
  const url = generatePaymentUrl(pid);
  const payment = { id: pid, billingRecordId: billingRecord.id, userId: billingRecord.userId, amount: billingRecord.amount, currency: billingRecord.currency || 'USD', status: 'pending', url, createdAt: new Date().toISOString() };
  DATA.payments.push(payment);
  billingRecord.paymentLinkId = pid;
  persist();
  // optionally persist billing record to sqlite as it has been updated with paymentLinkId
  try {
    if (storage && storage.persistBillingRecord) storage.persistBillingRecord(billingRecord);
  } catch (e) { logger.error({ err: e, recId: billingRecord && billingRecord.id }, 'failed sqlite persist billing_record after payment attach'); }
  logger.info({ paymentId: pid, billingRecordId: billingRecord.id, userId: billingRecord.userId }, 'payment created');
  return payment;
}

// Add a helper to centralize adding usage events so we can persist to optional sqlite
function addUsageEvent(rec) {
  ensureDefaults();
  DATA.usage_events.push(rec);
  try {
    persist();
  } catch (e) { logger.error({ err: e }, 'persist usage_events failed'); }
  try {
    if (storage && storage.persistUsageEvent) storage.persistUsageEvent(rec);
  } catch (e) { logger.error({ err: e, recId: rec && rec.id }, 'failed sqlite persist usage_event'); }
}

module.exports = {
  DATA,
  ensureDefaults,
  persist,
  filterBillingRecords,
  reconcileOnce,
  attachPaymentLinkIfNeeded,
  generatePaymentUrl
  ,
  addUsageEvent,
  logger,
  metricsRegister: register,
  getMetrics: async () => { return await register.metrics(); }
};


