import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Aethel Engine',
  description: 'Privacy Policy for Aethel Engine.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--aethel-neon-cyan)]">Legal</p>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-3 text-sm text-[var(--aethel-text-tertiary)]">Effective: June 27, 2026 · Version 1.0</p>
        </header>

        <div className="space-y-10 text-sm leading-7 text-[var(--aethel-text-secondary)]">
          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">1. Data We Collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Account data:</strong> email address, username, OAuth tokens</li>
              <li><strong>Generation data:</strong> text prompts, style embeddings, generated asset metadata (NOT the raw API keys you supply via BYOK)</li>
              <li><strong>Usage data:</strong> feature usage, session duration, error logs</li>
              <li><strong>Payment data:</strong> handled by Stripe; Aethel does not store card numbers</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">2. How We Use Your Data</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Provide and improve the Service</li>
              <li>Enforce our Terms of Service and content moderation policies</li>
              <li>Aggregate, anonymised telemetry to improve AI generation quality</li>
              <li>Send transactional emails (account verification, payout confirmations)</li>
            </ul>
            <p className="mt-2">We do not sell personal data to third parties.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">3. Sub-processors</h2>
            <p>We use the following third-party services to operate the platform:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Vercel / Cloudflare — hosting and CDN</li>
              <li>Stripe — payment processing and KYC</li>
              <li>AWS S3 / CloudFront — asset storage and delivery</li>
              <li>OpenTelemetry Collector — anonymous performance telemetry</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">4. BYOK (Bring Your Own Key) Data</h2>
            <p>API keys stored via the BYOK Vault are encrypted client-side using AES-256-GCM before storage. Aethel servers never receive or store your plaintext API keys. Keys are never logged or transmitted to Aethel infrastructure.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">5. Data Retention</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Account data: retained until account deletion request</li>
              <li>Generated assets: retained for 180 days after last access</li>
              <li>Style embeddings and prompts: deleted on GDPR right-to-be-forgotten request</li>
              <li>Payment records: retained for 7 years for tax compliance</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">6. Your Rights (GDPR / CCPA)</h2>
            <p>You have the right to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Access a copy of your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data (right to be forgotten)</li>
              <li>Object to processing for marketing purposes</li>
              <li>Port your data in machine-readable format</li>
            </ul>
            <p className="mt-2">Submit a data request at <a href="/settings/privacy" className="text-[var(--aethel-neon-cyan)] underline underline-offset-2">Settings → Privacy</a> or email <a href="mailto:privacy@aethel.gg" className="text-[var(--aethel-neon-cyan)] underline underline-offset-2">privacy@aethel.gg</a>.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">7. Cookies</h2>
            <p>We use strictly necessary session cookies for authentication. We do not use third-party tracking cookies or advertising pixels.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">8. Contact</h2>
            <p>Data Protection Officer: <a href="mailto:privacy@aethel.gg" className="text-[var(--aethel-neon-cyan)] underline underline-offset-2">privacy@aethel.gg</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
