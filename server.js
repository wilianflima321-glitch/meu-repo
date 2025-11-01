const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const core = require('./lib/mock-core');
const DATA = core.DATA;
const verifier = require('./lib/verifier');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/api/llm/providers', (req, res) => {
  res.json(DATA.providers.map(r => ({ ...r, config: r.config || undefined })));
});

app.post('/api/llm/providers', (req, res) => {
  const body = req.body || {};
  const id = body.id || `prov-${Date.now()}`;
  const now = new Date().toISOString();
  const rec = { 
    id,
    name: body.name || id,
    type: body.type || 'custom',
    config: body.config || {},
    ownerId: body.ownerId || null,
    billingMode: body.billingMode || 'self',
    rateCard: { pricePerToken: (body.rateCard && body.rateCard.pricePerToken) || 0, currency: (body.rateCard && body.rateCard.currency) || 'USD' },
    // ensemble-specific optional fields
    providerIds: Array.isArray(body.providerIds) ? body.providerIds : (body.providerIds ? [body.providerIds] : []),
    mode: body.mode || undefined,
    timeoutMs: body.timeoutMs || undefined,
    verificationMode: body.verificationMode || 'strict',
    constraints: Array.isArray(body.constraints) ? body.constraints : (body.constraints ? [body.constraints] : []),
    createdBy: body.createdBy || 'mock',
    createdAt: now
  };
  // replace existing
  DATA.providers = DATA.providers.filter(p => p.id !== id).concat([rec]);
  core.persist();
  res.status(201).json({ id, createdAt: now });
});

// Allow deleting a provider (dev/testing)
app.delete('/api/llm/providers/:id', (req, res) => {
  try {
    const id = req.params.id;
    const before = (DATA.providers || []).length;
    DATA.providers = (DATA.providers || []).filter(p => p.id !== id);
    const after = (DATA.providers || []).length;
    if (before === after) return res.status(404).json({ error: 'not_found' });
    core.persist();
    return res.status(204).end();
  } catch (e) {
    core.logger.error({ err: e, id: req && req.params && req.params.id }, 'delete provider failed');
    return res.status(500).json({ error: 'delete_failed' });
  }
});

// Telemetry ingestion (dev) - stores minimal events for debugging/observability
app.post('/api/llm/telemetry', (req, res) => {
  try {
    core.ensureDefaults();
    const ev = req.body || {};
    const now = new Date().toISOString();
    const rec = { id: uuidv4(), event: ev.event || 'unknown', payload: ev.payload || {}, createdAt: now };
    DATA.telemetry = DATA.telemetry || [];
    DATA.telemetry.push(rec);
    core.persist();
    core.logger.info({ telemetry: rec }, 'telemetry ingested');
    res.status(202).json({ id: rec.id, createdAt: now });
  } catch (e) {
    core.logger.error({ err: e }, 'telemetry ingestion failed');
    res.status(500).json({ error: 'telemetry_failed' });
  }
});

app.put('/api/llm/providers/default', (req, res) => {
  // mock: just accept
  res.status(204).end();
});

app.post('/api/llm/usage', (req, res) => {
  const body = req.body || {};
  const requestId = body.requestId || uuidv4();
  const providerId = body.providerId || 'unknown';
  const now = new Date().toISOString();
  try {
    // quota enforcement: compute tokens used this month for user/org
    const callerUser = body.userId || null;
    const callerOrg = body.orgId || null;
    const incomingTokens = (body.tokensInput || 0) + (body.tokensOutput || 0);
    if (callerUser) {
      const nowDate = new Date();
      const monthKey = `${nowDate.getUTCFullYear()}-${String(nowDate.getUTCMonth()+1).padStart(2,'0')}`;
      const usedThisMonth = DATA.usage_events.filter(u => u.userId === callerUser && u.createdAt && u.createdAt.startsWith(monthKey.substring(0,4))).reduce((s, u) => s + ((u.tokensInput||0) + (u.tokensOutput||0)), 0);
      const quota = (DATA.quotas && DATA.quotas[callerUser] && DATA.quotas[callerUser].monthlyTokens) ? DATA.quotas[callerUser].monthlyTokens : null;
      if (quota !== null && quota !== undefined) {
        if (usedThisMonth + incomingTokens > quota) {
          res.status(429).json({ error: 'quota_exceeded', userId: callerUser, quota, usedThisMonth, incomingTokens });
          return;
        }
      }
    }
    // dedup check
    const existing = DATA.usage_events.find(u => u.providerId === providerId && u.requestId === requestId);
    if (existing) {
      return res.json({ requestId, billed: true, chargeTarget: 'dedup', billingRecordId: existing.id });
    }
  const id = uuidv4();
  const rec = { id, requestId, providerId, userId: body.userId || null, orgId: body.orgId || null, model: body.model || null, tokensInput: body.tokensInput || 0, tokensOutput: body.tokensOutput || 0, estimatedProviderCost: body.estimatedProviderCost || 0, billingMode: body.billingMode || 'self', status: body.status || 0, createdAt: now };
  // central helper will persist to JSON and optional sqlite
  core.addUsageEvent(rec);
    let chargeTarget = 'none';
    if (body.billingMode === 'platform') chargeTarget = 'platform';
    else if (body.billingMode === 'self') chargeTarget = 'providerOwner';
    else if (body.billingMode === 'sponsored') chargeTarget = 'sponsor';
    res.json({ requestId, billed: chargeTarget !== 'none', chargeTarget, billingRecordId: id });
  } catch (e) {
    console.error('usage error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// Dev: list usage events (filterable)
app.get('/api/llm/usage', (req, res) => {
  try {
    core.ensureDefaults();
    const q = req.query || {};
    let out = (core.DATA && core.DATA.usage_events) ? core.DATA.usage_events.slice() : [];
    if (q.requestId) out = out.filter(u => String(u.requestId) === String(q.requestId));
    if (q.providerId) out = out.filter(u => String(u.providerId) === String(q.providerId));
    res.json(out);
  } catch (e) {
    core.logger.error({ err: e }, 'list usage failed');
    res.status(500).json({ error: 'list_usage_failed' });
  }
});

// Dev: simulate running an ensemble provider by creating usage events for each member provider
app.post('/api/llm/dev/run-ensemble/:id', (req, res) => {
  try {
    core.ensureDefaults();
    const id = req.params.id;
    const body = req.body || {};
    const ensemble = (core.DATA.providers || []).find(p => p.id === id);
    if (!ensemble) return res.status(404).json({ error: 'provider_not_found' });
    if (ensemble.type !== 'ensemble') return res.status(400).json({ error: 'not_ensemble' });
    const providerIds = Array.isArray(ensemble.providerIds) ? ensemble.providerIds : [];
    const requestId = body.requestId || `req-${Date.now()}`;
    const userId = body.userId || null;
    const model = body.model || null;
    const tokensInput = body.tokensInput || 0;
    const tokensOutput = body.tokensOutput || 0;
    // verify scene constraints if provided or if ensemble defines constraints
    const scene = body.scene || null;
    const constraints = (ensemble && Array.isArray(ensemble.constraints)) ? ensemble.constraints : (body.constraints || (scene && scene.constraints) || []);
    if (scene && constraints && constraints.length) {
      const errors = verifier.verifyScene(scene, constraints);
      if (errors && errors.length) {
        // if ensemble is in soft verification mode, don't block — return warnings but proceed
        if (ensemble.verificationMode === 'soft') {
          const created = [];
          for (const pid of providerIds) {
            const ev = {
              id: uuidv4(),
              requestId,
              providerId: pid,
              userId,
              orgId: body.orgId || null,
              model,
              tokensInput: tokensInput,
              tokensOutput: tokensOutput,
              estimatedProviderCost: 0,
              billingMode: ensemble.billingMode || 'self',
              status: 0,
              createdAt: new Date().toISOString()
            };
            core.addUsageEvent(ev);
            created.push({ id: ev.id, providerId: pid });
          }
          return res.status(202).json({ requestId, created, warnings: errors });
        }
        return res.status(422).json({ ok: false, errors });
      }
    }
    const created = [];
    for (const pid of providerIds) {
      const ev = {
        id: uuidv4(),
        requestId,
        providerId: pid,
        userId,
        orgId: body.orgId || null,
        model,
        tokensInput: tokensInput,
        tokensOutput: tokensOutput,
        estimatedProviderCost: 0,
        billingMode: ensemble.billingMode || 'self',
        status: 0,
        createdAt: new Date().toISOString()
      };
      core.addUsageEvent(ev);
      created.push({ id: ev.id, providerId: pid });
    }
    res.status(202).json({ requestId, created });
  } catch (e) {
    core.logger.error({ err: e }, 'run-ensemble failed');
    res.status(500).json({ error: 'run_ensemble_failed' });
  }
});



// Dev: verify a structured scene/plan against simple constraints (no_weapons, no_smoke, etc.)
app.post('/api/llm/dev/verify-scene', (req, res) => {
  try {
    const body = req.body || {};
    const scene = body.scene || {};
    const constraints = body.constraints || scene.constraints || [];
  const errors = verifier.verifyScene(scene, constraints);
    if (errors.length) return res.status(422).json({ ok: false, errors });
    return res.json({ ok: true });
  } catch (e) {
    core.logger.error({ err: e }, 'verify-scene failed');
    res.status(500).json({ error: 'verify_scene_failed' });
  }
});



// Quotas endpoints
app.get('/api/llm/quotas/:userId', (req, res) => {
  const userId = req.params.userId;
  const q = DATA.quotas[userId] || null;
  res.json({ userId, quota: q });
});

app.put('/api/llm/quotas/:userId', (req, res) => {
  const userId = req.params.userId;
  const body = req.body || {};
  DATA.quotas[userId] = { monthlyTokens: body.monthlyTokens || 0 };
  persist();
  res.status(204).end();
});

// Promo endpoints
app.get('/api/llm/promos', (req, res) => {
  res.json(DATA.promos || []);
});

app.post('/api/llm/promos', (req, res) => {
  const body = req.body || {};
  const id = body.id || `promo-${Date.now()}`;
  const rec = { id, code: body.code || `CODE-${id}`, discountPercent: body.discountPercent || 0, freeTokens: body.freeTokens || 0, expiry: body.expiry || null, scope: body.scope || 'global', budgetRemaining: body.freeTokens || 0, createdBy: body.createdBy || 'admin' };
  DATA.promos = DATA.promos.filter(p => p.id !== id).concat([rec]);
  core.persist();
  res.status(201).json(rec);
});

app.post('/api/llm/promos/redeem', (req, res) => {
  const body = req.body || {};
  const userId = body.userId;
  const code = body.code;
  const promo = (DATA.promos || []).find(p => p.code === code);
  if (!promo) return res.status(404).json({ error: 'promo_not_found' });
  if (promo.expiry && new Date(promo.expiry) < new Date()) return res.status(400).json({ error: 'promo_expired' });
  // assign a redemption record with remainingFreeTokens
  if (!DATA.redeemedPromos[userId]) DATA.redeemedPromos[userId] = [];
  const existing = DATA.redeemedPromos[userId].find(r => r.promoId === promo.id);
  if (existing) return res.status(400).json({ error: 'already_redeemed' });
  const redemption = { promoId: promo.id, remainingFreeTokens: promo.freeTokens || 0 };
  DATA.redeemedPromos[userId].push(redemption);
  core.persist();
  res.status(201).json({ userId, promoId: promo.id, remainingFreeTokens: redemption.remainingFreeTokens });
});

// billing records endpoints
app.get('/api/llm/billing/records', (req, res) => {
  try {
    core.ensureDefaults();
    const results = core.filterBillingRecords(req.query);
    res.json(results);
  } catch (e) {
    core.logger.error({ err: e }, 'billing records error');
    res.status(500).json({ error: 'server_error' });
  }
});

// Payment configuration endpoints
app.get('/api/llm/payments/config', (req, res) => {
  core.ensureDefaults();
  res.json(DATA.paymentConfig || { basePaymentUrl: null });
});

app.post('/api/llm/payments/config', (req, res) => {
  const body = req.body || {};
  DATA.paymentConfig = DATA.paymentConfig || {};
  DATA.paymentConfig.basePaymentUrl = body.basePaymentUrl || null;
  core.persist();
  // regenerate payment URLs for existing payments and ensure payments exist for billing records
  core.ensureDefaults();
  // update existing payments' urls
  for (const p of DATA.payments || []) {
    p.url = core.generatePaymentUrl(p.id);
  }
  // create payment entries for billing records that need them
  for (const r of DATA.billing_records || []) {
    try {
      core.attachPaymentLinkIfNeeded(r);
    } catch (e) {
      core.logger.error({ err: e, record: r && r.id }, 'failed to attach payment for record');
    }
  }
  core.persist();
  res.status(204).end();
});

// DEV: encrypt provider api keys with an envelope master key (base64)
app.post('/api/llm/secrets/encrypt', (req, res) => {
  if (process.env.DEV_MODE !== 'true') return res.status(403).json({ error: 'forbidden' });
  const body = req.body || {};
  const masterKey = body.masterKey; // base64
  if (!masterKey) return res.status(400).json({ error: 'masterKey required (base64)' });
  try {
    core.ensureDefaults();
    for (const p of DATA.providers || []) {
      if (p.config && p.config.apiKey) {
        p.config._encryptedApiKey = core.encryptEnvelope(p.config.apiKey, masterKey);
        delete p.config.apiKey;
      }
    }
    core.persist();
    res.status(204).end();
  } catch (e) {
    core.logger.error({ err: e }, 'encrypt secrets failed');
    res.status(500).json({ error: 'encrypt_failed' });
  }
});

// DEV: decrypt a provider apiKey for testing only (requires masterKey query param)
app.get('/api/llm/secrets/decrypt', (req, res) => {
  if (process.env.DEV_MODE !== 'true') return res.status(403).json({ error: 'forbidden' });
  const providerId = req.query.providerId;
  const key = req.query.masterKey;
  if (!providerId || !key) return res.status(400).json({ error: 'providerId and masterKey are required (masterKey base64 in query)' });
  try {
    const p = (DATA.providers || []).find(x => x.id === String(providerId));
    if (!p) return res.status(404).json({ error: 'provider_not_found' });
    if (!p.config || !p.config._encryptedApiKey) return res.status(404).json({ error: 'no_encrypted_key' });
    const plain = core.decryptEnvelope(p.config._encryptedApiKey, String(key));
    res.json({ providerId, apiKey: plain });
  } catch (e) {
    core.logger.error({ err: e }, 'decrypt failed');
    res.status(500).json({ error: 'decrypt_failed' });
  }
});

app.get('/api/llm/payments', (req, res) => {
  core.ensureDefaults();
  res.json(DATA.payments || []);
});

app.get('/api/llm/payments/:id', (req, res) => {
  const id = req.params.id;
  const p = (DATA.payments || []).find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  res.json(p);
});

app.post('/api/llm/reconcile', (req, res) => {
  try {
    core.logger.info('reconcile endpoint called');
    core.ensureDefaults();
    const result = core.reconcileOnce();
    core.logger.info({ count: result.length }, 'reconcile endpoint created records');
    res.status(202).json({ created: result.length, records: result.map(r => ({ id: r.id, usageEventId: r.usageEventId })) });
  } catch (e) {
    core.logger.error({ err: e }, 'reconcile endpoint error');
    res.status(500).json({ error: 'reconcile_failed', message: String(e && e.message) });
  }
});

// CSV export for billing records
app.get('/api/llm/billing/export', (req, res) => {
  try {
    core.ensureDefaults();
    const rows = core.filterBillingRecords(req.query);
  const headers = ['id','usageEventId','providerId','userId','orgId','tokens','freeTokensUsed','billedTokens','providerCost','infra','maintenance','margin','amount','currency','billedTo','paymentLinkId','paymentUrl','reconciledAt'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    const vals = headers.map(h => {
      let v = r[h];
      if (h === 'paymentUrl') {
        if (r.paymentLinkId && Array.isArray(DATA.payments)) {
          const p = DATA.payments.find(x => x.id === r.paymentLinkId);
          v = p ? p.url : '';
        } else {
          v = '';
        }
      }
      if (v === undefined || v === null) return '';
      return String(v).replace(/"/g,'""');
    });
    lines.push(vals.join(','));
  }
  res.setHeader('Content-Type','text/csv');
  res.send(lines.join('\n'));
  } catch (e) {
    core.logger.error({ err: e }, 'billing export error');
    res.status(500).send('export_error');
  }
});

// Helper: apply query filters and pagination to billing_records
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

// Automatic periodic reconciliation (every 60 seconds) to ease dev testing
// Reconcile function used by both manual endpoint and periodic run. Returns created records.
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
    const providerRate = (provider && provider.rateCard && provider.rateCard.pricePerToken) ? provider.rateCard.pricePerToken : 0;
    const providerCost = +(providerRate * billedTokens);
    const infra = +(0.00001 * billedTokens); // tiny infra cost per token for mock
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
    newRecords.push(rec);
  }
  if (newRecords.length) persist();
  if (newRecords.length) console.log(`reconcileOnce created ${newRecords.length} records`);
  // after creating billing records, ensure payment links exist for billable user-charges
  for (const r of newRecords) {
    try {
      attachPaymentLinkIfNeeded(r);
    } catch (e) {
      console.error('attachPaymentLinkIfNeeded failed', e);
    }
  }
  return newRecords;
}

function generatePaymentUrl(id) {
  const base = (DATA.paymentConfig && DATA.paymentConfig.basePaymentUrl) ? DATA.paymentConfig.basePaymentUrl.replace(/\/$/, '') : 'https://payments.example.com';
  // simple tokenized path
  return `${base}/pay/${id}`;
}

function attachPaymentLinkIfNeeded(billingRecord) {
  if (!billingRecord) return null;
  // Only create payment link for user-billed items with amount > 0
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
  return payment;
}

// Periodic reconciliation (every 60 seconds)
setInterval(() => {
  try {
    const created = core.reconcileOnce();
    if (created.length) core.logger.info({ created: created.length }, 'periodic reconcile created billing records');
  } catch (e) {
    core.logger.error({ err: e }, 'periodic reconcile failed');
  }
}, 60 * 1000);

const port = process.env.PORT || 8010;
app.listen(port, () => core.logger.info(`LLM mock listening on http://localhost:${port}`));

// Prometheus metrics scrape endpoint
app.get('/metrics', async (req, res) => {
  try {
    const m = await core.getMetrics();
    res.set('Content-Type', core.metricsRegister.contentType);
    res.send(m);
  } catch (e) {
    core.logger.error({ err: e }, 'metrics scrape failed');
    res.status(500).send('metrics_error');
  }
});

// Health endpoint reporting JSON persistence and optional sqlite status
app.get('/health', (req, res) => {
  try {
    // check sqlite availability via optional storage module
    let sqliteAvailable = false;
    try {
      const storage = require('./lib/storage-sqlite');
      sqliteAvailable = !!(storage && storage.available);
    } catch (e) {
      sqliteAvailable = false;
    }
    const dataFileExists = fs.existsSync(path.join(__dirname, 'data.json'));
    // Keep backward-compatible shape expected by tests/frameworks
    res.json({ status: 'ok', ok: true, sqliteAvailable, dataFileExists });
  } catch (e) {
    core.logger.error({ err: e }, 'health check failed');
    res.status(500).json({ ok: false, error: String(e && e.message) });
  }
});

// Root status for simple UI checks
app.get('/', (req, res) => {
  res.type('text/plain').send('Dev mock backend running');
});

// Simple items list endpoint used by some tests
app.get('/api/items', (req, res) => {
  try {
    core.ensureDefaults();
    const items = (core.DATA && core.DATA.items) ? core.DATA.items : [];
    res.json({ items });
  } catch (e) {
    core.logger.error({ err: e }, 'items list failed');
    res.status(500).json({ error: 'items_failed' });
  }
});

// Simple echo endpoint for testing POST handling
app.post('/api/echo', (req, res) => {
  try {
    res.json({ echo: req.body || {} });
  } catch (e) {
    core.logger.error({ err: e }, 'echo failed');
    res.status(500).json({ error: 'echo_failed' });
  }
});
