'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'

import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'
import {
  ContactSalesAside,
  ContactSalesHero,
  ContactSalesSubmitted,
  PRIMARY_GOALS,
  TIMELINE_OPTIONS,
  sourceReasonLabel,
} from './contact-sales.parts'

type ContactSalesForm = {
  name: string
  email: string
  company: string
  role: string
  teamSize: string
  primaryGoal: string
  timeline: string
  message: string
}

type SelectOption = { value: string; label: string }

type FieldProps = {
  id: string
  label: string
  value: string
  required?: boolean
  placeholder?: string
  fieldClass: string
  onChange: (value: string) => void
}

const EMPTY_FORM: ContactSalesForm = {
  name: '',
  email: '',
  company: '',
  role: '',
  teamSize: '',
  primaryGoal: '',
  timeline: '',
  message: '',
}

const TEAM_SIZE_OPTIONS: SelectOption[] = ['', '1-10', '11-50', '51-200', '201-500', '500+'].map((value) => ({
  value,
  label: value || 'Select',
}))

const FORM_FIELD_CLASS =
  'h-12 w-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-4 text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]'

const TEXTAREA_CLASS =
  'w-full resize-none border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-4 py-3 text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]'

export default function ContactSalesContent({
  initialSource = '',
}: {
  initialSource?: string
}) {
  const source = initialSource.trim()
  const [formData, setFormData] = useState<ContactSalesForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiredReady = Boolean(
    formData.name.trim() &&
      formData.email.trim() &&
      formData.company.trim() &&
      formData.message.trim(),
  )

  const updateField = (key: keyof ContactSalesForm) => (value: string) => {
    setFormData((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requiredReady) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          reason: source ? `enterprise-sales:${source}` : 'enterprise-sales',
          message: buildBriefingMessage(formData, source),
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || 'Could not send your briefing right now.')
      }

      setSubmitted(true)
      setFormData(EMPTY_FORM)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not send your briefing right now.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return <ContactSalesSubmitted />

  return (
    <div
      data-contact-sales-surface="compact"
      className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]"
    >
      <PublicHeader />
      <main className="relative z-10 px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <ContactSalesHero />
          <section className="grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(300px,0.52fr)]">
            <div className="border-y border-[var(--aethel-border-primary)] bg-[var(--aethel-panel)] px-6 py-6 sm:px-8 sm:py-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <FormHeader />
                {source ? <SourceNotice source={source} /> : null}
                {error ? <FormNotice tone="error">{error}</FormNotice> : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="contact-sales-name"
                    label="Name"
                    value={formData.name}
                    required
                    placeholder="Your name"
                    fieldClass={FORM_FIELD_CLASS}
                    onChange={updateField('name')}
                  />
                  <TextField
                    id="contact-sales-email"
                    label="Work email"
                    value={formData.email}
                    required
                    placeholder="you@company.com"
                    fieldClass={FORM_FIELD_CLASS}
                    onChange={updateField('email')}
                  />
                </div>

                <TextField
                  id="contact-sales-company"
                  label="Company"
                  value={formData.company}
                  required
                  placeholder="Company name"
                  fieldClass={FORM_FIELD_CLASS}
                  onChange={updateField('company')}
                />

                <details className="border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] px-5 py-4">
                  <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                    Optional routing context
                  </summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <TextField
                      id="contact-sales-role"
                      label="Role"
                      value={formData.role}
                      placeholder="Your role"
                      fieldClass={FORM_FIELD_CLASS}
                      onChange={updateField('role')}
                    />
                    <SelectField
                      id="contact-sales-team-size"
                      label="Team size"
                      value={formData.teamSize}
                      options={TEAM_SIZE_OPTIONS}
                      fieldClass={FORM_FIELD_CLASS}
                      onChange={updateField('teamSize')}
                    />
                    <SelectField
                      id="contact-sales-primary-goal"
                      label="Primary goal"
                      value={formData.primaryGoal}
                      options={PRIMARY_GOALS}
                      fieldClass={FORM_FIELD_CLASS}
                      onChange={updateField('primaryGoal')}
                    />
                    <SelectField
                      id="contact-sales-timeline"
                      label="Timeline"
                      value={formData.timeline}
                      options={TIMELINE_OPTIONS}
                      fieldClass={FORM_FIELD_CLASS}
                      onChange={updateField('timeline')}
                    />
                  </div>
                </details>

                <label className="block" htmlFor="contact-sales-message">
                  <span className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
                    Context and requirements *
                  </span>
                  <textarea
                    id="contact-sales-message"
                    rows={6}
                    value={formData.message}
                    onChange={(event) => updateField('message')(event.target.value)}
                    className={TEXTAREA_CLASS}
                    placeholder="Example: evaluating SSO, billing, and security review for a 30-90 day rollout."
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={!requiredReady || loading}
                    className={`inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-sm font-semibold transition ${
                      requiredReady && !loading
                        ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] shadow-lg hover:brightness-110'
                        : 'cursor-not-allowed border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-quaternary)]'
                    }`}
                  >
                    {loading ? 'Sending briefing...' : 'Send briefing to sales'}
                    {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                  </button>
                  <Link
                    href="/docs/procurement-starter-pack"
                    className="inline-flex w-full items-center justify-center border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-6 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] hover:text-[var(--aethel-text-primary)]"
                  >
                    Read procurement pack
                  </Link>
                </div>

                {!requiredReady ? (
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    Fill in name, email, company, and context to send the briefing.
                  </p>
                ) : null}
              </form>
            </div>
            <ContactSalesAside />
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

function buildBriefingMessage(formData: ContactSalesForm, source: string) {
  return [
    formData.message.trim(),
    '',
    '--- briefing metadata ---',
    formData.role.trim() ? `Role: ${formData.role.trim()}` : null,
    formData.teamSize ? `Team size: ${formData.teamSize}` : null,
    formData.primaryGoal ? `Primary goal: ${optionLabel(PRIMARY_GOALS, formData.primaryGoal)}` : null,
    formData.timeline ? `Timeline: ${optionLabel(TIMELINE_OPTIONS, formData.timeline)}` : null,
    source ? `Journey source: ${sourceReasonLabel(source)}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function optionLabel(options: SelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

function FormHeader() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
          Commercial contact
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">
          Send the brief
        </h2>
      </div>
      <Mail className="mt-1 h-5 w-5 shrink-0 text-[var(--aethel-text-tertiary)]" />
    </div>
  )
}

function SourceNotice({ source }: { source: string }) {
  return (
    <FormNotice tone="info">
      Detected source:{' '}
      <span className="font-medium text-[var(--aethel-text-primary)]">
        {sourceReasonLabel(source)}
      </span>
    </FormNotice>
  )
}

function FormNotice({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'info' | 'error'
}) {
  const className =
    tone === 'error'
      ? 'border-[color-mix(in_srgb,var(--aethel-error)_46%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_14%,transparent)] text-[var(--aethel-error-light)]'
      : 'border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-secondary)]'

  return <div className={`border-l px-4 py-3 text-sm ${className}`}>{children}</div>
}

function TextField({ id, label, value, required, placeholder, fieldClass, onChange }: FieldProps) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
        {label}{required ? ' *' : ''}
      </span>
      <input
        id={id}
        type={id.includes('email') ? 'email' : 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
        placeholder={placeholder}
      />
    </label>
  )
}

function SelectField({
  id,
  label,
  value,
  options,
  fieldClass,
  onChange,
}: FieldProps & { options: SelectOption[] }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-medium text-[var(--aethel-text-secondary)]">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      >
        {options.map((option) => (
          <option
            key={option.value || 'blank'}
            value={option.value}
            className="bg-[var(--aethel-surface-primary)]"
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
