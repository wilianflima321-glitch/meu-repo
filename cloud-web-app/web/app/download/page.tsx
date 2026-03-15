'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const WindowsIcon = () => (
  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
  </svg>
)

const AppleIcon = () => (
  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
)

const LinuxIcon = () => (
  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139z" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

const CheckIcon = () => (
  <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

type Platform = 'windows' | 'mac' | 'linux'

export default function DownloadPage() {
  const [detectedPlatform, setDetectedPlatform] = useState<Platform>('windows')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('windows')

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent
      if (/Windows/i.test(ua)) {
        setDetectedPlatform('windows')
        setSelectedPlatform('windows')
      } else if (/Mac OS X|Macintosh/i.test(ua)) {
        setDetectedPlatform('mac')
        setSelectedPlatform('mac')
      } else if (/Linux/i.test(ua) && !/Android/i.test(ua)) {
        setDetectedPlatform('linux')
        setSelectedPlatform('linux')
      }
    }
  }, [])

  const platforms = {
    windows: {
      name: 'Windows',
      icon: WindowsIcon,
      version: '0.3.0',
      size: '~180 MB',
      file: 'engine-0.3.0-win-x64.exe',
      requirements: 'Windows 10+ (64-bit)',
    },
    mac: {
      name: 'macOS',
      icon: AppleIcon,
      version: '0.3.0',
      size: '~200 MB',
      file: 'engine-0.3.0-mac-universal.dmg',
      requirements: 'macOS 11+ (Intel & Apple Silicon)',
    },
    linux: {
      name: 'Linux',
      icon: LinuxIcon,
      version: '0.3.0',
      size: '~170 MB',
      file: 'engine-0.3.0-linux-x64.tar.gz',
      requirements: 'Ubuntu 20.04+, Debian 11+, Fedora 35+',
    },
  }

  const features = [
    'IDE com Monaco Editor e terminal integrado',
    'Fluxo multi-agent com Architect, Engineer e Critic',
    'Preview unificado com status e readiness visiveis',
    'Templates e onboarding guiado para Apps e Research',
    'Audit trail e rollback deterministico por change set',
    'Sync com o web studio e handoff para deploy',
  ]

  const current = platforms[selectedPlatform]
  const CurrentIcon = current.icon

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-blue-600/[0.06] blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-sky-600/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-5xl px-6 pt-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-300">
            <DownloadIcon />
            Versao {current.version} disponivel
          </div>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">
            Download <span className="gradient-text">Aethel Studio</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            IDE e studio operacional para Apps e Research. Games e Films seguem em fase experimental.
          </p>
        </section>

        <section className="mx-auto mt-10 max-w-5xl px-6">
          <div className="flex flex-wrap justify-center gap-4">
            {(Object.keys(platforms) as Platform[]).map((platform) => {
              const p = platforms[platform]
              const Icon = p.icon
              const isSelected = selectedPlatform === platform
              const isDetected = detectedPlatform === platform
              return (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500/40 bg-blue-500/10 text-white'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
                  }`}
                >
                  <Icon />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    {isDetected && <div className="text-xs text-blue-300">Detectado</div>}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-sky-500/20">
                    <CurrentIcon />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Aethel para {current.name}</h2>
                    <p className="text-slate-400">Versao {current.version} ? {current.size}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-500">Requisitos: {current.requirements}</p>
                <a
                  href={`/downloads/${current.file}`}
                  className="aethel-button aethel-button-primary mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-semibold"
                  download
                >
                  <DownloadIcon />
                  Download para {current.name}
                </a>
              </div>

              <div className="md:w-px md:self-stretch md:bg-white/10" />

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Incluido</h3>
                {features.slice(0, 4).map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckIcon />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-slate-500">
            <a href="/downloads/checksums.txt" className="text-blue-400 hover:underline">
              Verificar checksums SHA-256
            </a>
            {' ? '}
            <a href="/downloads/RELEASE_NOTES.md" className="text-blue-400 hover:underline">
              Notas de versao
            </a>
            {' ? '}
            <Link href="/docs/getting-started" className="text-blue-400 hover:underline">
              Guia de instalacao
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-5xl px-6 pb-16">
          <h2 className="text-2xl font-bold text-center">Tudo o que voce precisa para iterar</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <CheckIcon />
                <span className="text-sm text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-20 text-center">
          <h2 className="text-2xl font-bold">Prefere usar no navegador?</h2>
          <p className="mt-3 text-slate-400">
            Abra o Aethel Studio diretamente no browser, com os mesmos recursos do desktop.
          </p>
          <Link
            href="/login"
            className="aethel-button aethel-button-secondary mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-semibold"
          >
            Abrir Aethel Web
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
