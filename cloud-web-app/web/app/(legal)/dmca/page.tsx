import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DMCA Policy — Aethel Engine',
  description: 'DMCA Takedown Policy for Aethel Engine Marketplace.',
};

export default function DMCAPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--aethel-neon-cyan)]">Legal</p>
          <h1 className="text-3xl font-bold">DMCA Policy</h1>
          <p className="mt-3 text-sm text-[var(--aethel-text-tertiary)]">Effective: June 27, 2026</p>
        </header>

        <div className="space-y-10 text-sm leading-7 text-[var(--aethel-text-secondary)]">
          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">Reporting Copyright Infringement</h2>
            <p>If you believe a Marketplace asset or generated content infringes your copyright, submit a DMCA takedown notice to our designated agent:</p>
            <div className="mt-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
              <p className="font-semibold text-[var(--aethel-text-primary)]">DMCA Agent</p>
              <p className="mt-1">Email: <a href="mailto:dmca@aethel.gg" className="text-[var(--aethel-neon-cyan)] underline underline-offset-2">dmca@aethel.gg</a></p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">Required Notice Elements (17 U.S.C. § 512(c)(3))</h2>
            <p>Your notice must include:</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>Identification of the copyrighted work you claim has been infringed</li>
              <li>Identification of the infringing material and its URL on our platform</li>
              <li>Your contact information (name, address, phone, email)</li>
              <li>A statement that you have a good faith belief the use is not authorised</li>
              <li>A statement under penalty of perjury that the information is accurate and you are authorised to act</li>
              <li>Your physical or electronic signature</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">Our Process</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>We will respond to valid notices within <strong>5 business days</strong></li>
              <li>The reported asset will be immediately restricted from public distribution pending review</li>
              <li>The asset creator will be notified and may submit a counter-notice</li>
              <li>Repeat infringers will have their accounts terminated</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-primary)]">Counter-Notice</h2>
            <p>If you believe your content was removed in error, submit a counter-notice to <a href="mailto:dmca@aethel.gg" className="text-[var(--aethel-neon-cyan)] underline underline-offset-2">dmca@aethel.gg</a> including your identification, identification of the removed material, a statement under penalty of perjury that the removal was a mistake, and your consent to jurisdiction.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
