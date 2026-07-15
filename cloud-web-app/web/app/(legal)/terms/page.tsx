import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Aethel Engine',
  description: 'Terms of Service for Aethel Engine generative world creation platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--aethel-neon-cyan)]">Legal</p>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="mt-3 text-sm text-[var(--aethel-text-tertiary)]">Effective: June 27, 2026 · Version 1.0</p>
        </header>

        <div className="space-y-10 text-sm leading-7 text-[var(--aethel-text-secondary)]">
          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">1. Acceptance</h2>
            <p>By accessing or using Aethel Engine ("Service"), you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">2. AI-Generated Content Ownership</h2>
            <p>You retain ownership of content you create using the Service, subject to the following:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Aethel Engine may use aggregated, anonymised generation telemetry to improve model quality.</li>
              <li>You must not use the Service to generate content that infringes third-party intellectual property rights.</li>
              <li>AI-generated outputs are licensed to you under the <a href="/ai-content-license" className="text-[var(--aethel-neon-cyan)] underline underline-offset-2">Aethel AI Content License</a>.</li>
              <li>You are solely responsible for ensuring generated content complies with applicable law in your jurisdiction.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">3. Prohibited Use</h2>
            <p>You may not use the Service to generate, distribute, or publish:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Content that exploits or harms minors (CSAM or equivalent)</li>
              <li>Content that incites violence, hatred, or discrimination</li>
              <li>Malware, exploits, or content designed to circumvent security systems</li>
              <li>Content that infringes copyright, trademark, or trade secrets of third parties</li>
            </ul>
            <p className="mt-2">Violations will result in immediate account suspension and referral to relevant authorities where required by law.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">4. Marketplace & Creator Earnings</h2>
            <p>Creators who publish assets on the Aethel Marketplace agree to a 70/30 revenue split (70% to creator, 30% to Aethel). Aethel reserves the right to remove any asset at any time for policy violations. Payouts are subject to KYC verification and applicable tax withholding.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">5. Privacy</h2>
            <p>Your use of the Service is also governed by our <a href="/privacy" className="text-[var(--aethel-neon-cyan)] underline underline-offset-2">Privacy Policy</a>. By using the Service you consent to the data practices described therein.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">6. DMCA / IP Infringement</h2>
            <p>To report copyright infringement, see our <a href="/dmca" className="text-[var(--aethel-neon-cyan)] underline underline-offset-2">DMCA Policy</a>. We will respond to valid takedown notices within 5 business days.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">7. Disclaimers & Limitation of Liability</h2>
            <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, AETHEL ENGINE SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">8. Changes</h2>
            <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">9. Contact</h2>
            <p>Questions about these Terms: <a href="mailto:legal@aethel.gg" className="text-[var(--aethel-neon-cyan)] underline underline-offset-2">legal@aethel.gg</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
