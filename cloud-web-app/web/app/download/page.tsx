'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Icons
const SparklesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

const WindowsIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
  </svg>
)

const AppleIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

const LinuxIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.02 1.67.24.134.438.327.6.468-.034-.197-.038-.399-.006-.6.07-.466.201-.735.381-.934.202-.266.38-.534.313-.933-.034-.2-.09-.398-.134-.598-.046-.198-.06-.466.134-.599.19-.135.396-.07.59.003.18.066.377.135.554.064.224-.07.397-.334.3-.535a.444.444 0 00-.267-.198c-.088-.034-.15-.073-.185-.133a.473.473 0 00-.094-.27c-.106-.2-.262-.332-.386-.465-.127-.066-.242-.135-.334-.268-.064-.135-.078-.266-.09-.4-.012-.199.113-.37.176-.535-.067-.4-.02-.669-.033-.869-.073-.597-.165-.735-.4-.935-.268-.202-.387-.2-.653-.467-.134-.135-.23-.2-.307-.266-.048-.067-.095-.2-.143-.266-.06-.135-.115-.266-.115-.4a.888.888 0 00-.029-.198c-.12-.198-.253-.535-.312-.735-.056-.267-.059-.532.017-.8.026-.065.08-.262.023-.331-.04-.06-.106-.067-.157-.067h-.017zm-1.547.333c.038 0 .072.003.103.008.292.04.526.2.795.4.252.201.538.468.815.6.326.2.645.335.873.535.086.067.12.134.108.2-.022.136-.2.268-.468.335a5.166 5.166 0 01-1.05.198 4.652 4.652 0 01-1.136-.065c-.169-.034-.28-.078-.355-.198-.065-.135.008-.2.202-.334.368-.266.718-.6.936-.867a.95.95 0 00.17-.333c.002-.064-.05-.135-.139-.198a.89.89 0 00-.363-.138h-.009c-.055 0-.098.01-.135.033a.786.786 0 00-.174.133c-.072.067-.155.133-.238.133h-.007c-.086-.003-.147-.073-.233-.133a.627.627 0 00-.179-.066c-.064-.023-.121-.035-.183-.035h-.019a.567.567 0 00-.17.034.633.633 0 00-.178.066c-.082.067-.143.133-.228.2-.057.066-.133.066-.199.066h-.012c-.056 0-.111-.032-.177-.066a.656.656 0 00-.225-.133c-.058-.023-.117-.034-.179-.034h-.011c-.14 0-.255.08-.328.2-.082.134.01.268.188.465.178.198.4.334.68.534.274.132.602.2.938.267.324.067.656.067.955.067.332 0 .64-.034.91-.134.144-.068.28-.134.407-.202-.138.135-.264.27-.385.4-.17.2-.32.469-.437.735a1.41 1.41 0 00-.1.534c-.003.135.017.266.053.4a.956.956 0 00.152.333h-.002c.025.033.053.066.083.1a.91.91 0 00.323.197c.145.066.302.1.47.133h.006c.218.02.435.037.655.037.264 0 .527-.017.789-.067.26-.04.504-.111.742-.215.132-.066.263-.2.395-.268.13-.067.26-.135.388-.2l.14-.067c.02-.008.04-.018.06-.027-.024.066-.044.133-.066.2-.095.265-.12.467-.087.667.044.206.143.408.296.667.15.265.356.535.613.867a22.39 22.39 0 001.28 1.4c.073.068.141.202.209.333.07.201.1.335.04.535-.063.135-.16.268-.31.4-.226.2-.531.466-.825.667l-.03.023c-.26.2-.506.4-.72.533-.293.2-.52.268-.7.268h-.047c-.113-.02-.222-.067-.32-.134a3.52 3.52 0 01-.354-.267 4.897 4.897 0 00-.374-.267 1.2 1.2 0 00-.445-.134h-.013c-.124 0-.237.04-.343.133a1.167 1.167 0 00-.285.335c-.117.198-.197.4-.287.6-.09.198-.189.4-.325.532a.878.878 0 01-.457.266c-.155.036-.33.036-.518.036a5.56 5.56 0 01-.59-.04 8.73 8.73 0 01-.58-.066 1.88 1.88 0 01-.524-.202 1.11 1.11 0 01-.411-.4c-.047-.133-.067-.27-.067-.4-.003-.135.03-.267.094-.4.036-.068.09-.135.155-.202.071-.067.156-.135.23-.202l.04-.033c.172-.134.352-.273.504-.401a1.394 1.394 0 00.324-.4.92.92 0 00.115-.534c-.01-.133-.047-.268-.121-.4a1.076 1.076 0 00-.26-.335 7.55 7.55 0 00-.399-.333c-.08-.066-.152-.135-.22-.202a.69.69 0 01-.148-.267.563.563 0 01-.018-.333c.017-.135.07-.268.154-.4a.952.952 0 01.266-.267c.13-.067.258-.135.395-.2.139-.067.273-.135.392-.202.195-.133.372-.332.494-.6.127-.267.203-.534.235-.802.024-.268 0-.534-.043-.733-.053-.2-.12-.333-.184-.468h.008c.11.066.221.133.329.2.11.067.222.133.332.2.225.13.462.265.69.332a2.4 2.4 0 00.693.133h.007c.135 0 .263-.02.393-.066.26-.088.456-.265.59-.468.134-.2.217-.4.26-.6.046-.267.04-.467-.008-.666a2.003 2.003 0 00-.237-.6 2.19 2.19 0 00-.365-.468 3.31 3.31 0 00-.465-.4l-.036-.026c-.13-.095-.265-.194-.393-.332a2.203 2.203 0 01-.293-.4c-.092-.135-.166-.333-.209-.534-.06-.266-.06-.534-.037-.8.015-.2.044-.4.09-.6.074-.331.184-.666.324-.931.092-.2.187-.4.29-.534a.936.936 0 01.333-.268.57.57 0 01.27-.067zm3.17 1.936a1.62 1.62 0 00-.165.04c-.116.04-.217.132-.299.332a1.236 1.236 0 00-.08.534c.003.2.043.4.117.6.073.2.162.333.266.401a.46.46 0 00.262.065h.016c.137-.006.256-.072.365-.2.107-.133.182-.333.214-.6.027-.2.015-.4-.03-.535a.858.858 0 00-.145-.332.625.625 0 00-.223-.2.517.517 0 00-.282-.104h-.016zm-8.628.135c.068 0 .134.02.196.066.069.045.133.132.18.265.043.133.055.333.003.534a1.122 1.122 0 01-.21.467.69.69 0 01-.322.2c-.105.02-.212.02-.31-.033-.098-.06-.18-.165-.229-.332a1.28 1.28 0 01-.054-.534c.02-.2.072-.4.154-.534.084-.133.178-.2.28-.2.007 0 .032.002.04.002.062 0 .12.011.175.03.069.024.13.068.182.132a.697.697 0 01.08.168c-.048-.067-.086-.132-.085-.2v.002zm6.72 6.67h-.003c-.145 0-.3.068-.458.2a4.02 4.02 0 00-.471.467c-.166.2-.332.4-.485.6l-.022.032c-.045.068-.086.2-.12.333a1.012 1.012 0 00-.028.468.567.567 0 00.117.267.466.466 0 00.214.133c.072.027.15.04.236.04h.016a1.25 1.25 0 00.508-.135c.17-.072.33-.17.479-.3.146-.135.278-.267.393-.4.114-.135.208-.268.277-.4.062-.135.097-.268.1-.4a.49.49 0 00-.053-.267.556.556 0 00-.137-.2.605.605 0 00-.185-.134 1.028 1.028 0 00-.21-.067 1.204 1.204 0 00-.17-.017z"/>
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      file: 'aethel-engine-0.3.0-win-x64.exe',
      requirements: 'Windows 10+ (64-bit)',
    },
    mac: {
      name: 'macOS',
      icon: AppleIcon,
      version: '0.3.0',
      size: '~200 MB',
      file: 'aethel-engine-0.3.0-mac-universal.dmg',
      requirements: 'macOS 11+ (Intel & Apple Silicon)',
    },
    linux: {
      name: 'Linux',
      icon: LinuxIcon,
      version: '0.3.0',
      size: '~170 MB',
      file: 'aethel-engine-0.3.0-linux-x64.tar.gz',
      requirements: 'Ubuntu 20.04+, Debian 11+, Fedora 35+',
    },
  }

  const features = [
    'IDE completa com Monaco Editor',
    'AI Copilot multi-provider integrado',
    'Colaboração real-time (Yjs/WebRTC)',
    'Motor de física Rapier WASM',
    'Build para Web, Desktop e Mobile',
    'Marketplace de assets',
    'Atualizações automáticas',
    'Suporte offline',
  ]

  const current = platforms[selectedPlatform]
  const CurrentIcon = current.icon

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[150px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
              <SparklesIcon />
            </div>
            <span className="text-xl font-bold">Aethel</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="text-sm text-slate-400 hover:text-white transition-colors">
              Documentação
            </Link>
            <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
              Preços
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
            >
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-6">
            <DownloadIcon />
            Versão {current.version} disponível
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Download{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Aethel Engine
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            A plataforma completa para criar jogos, apps e experiências interativas com IA integrada.
          </p>
        </div>
      </section>

      {/* Platform Selector */}
      <section className="relative px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Platform Tabs */}
          <div className="flex justify-center gap-4 mb-8">
            {(Object.keys(platforms) as Platform[]).map((platform) => {
              const p = platforms[platform]
              const Icon = p.icon
              const isSelected = selectedPlatform === platform
              const isDetected = detectedPlatform === platform
              return (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`flex items-center gap-3 px-6 py-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-violet-500/10 border-violet-500/30 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon />
                  <div className="text-left">
                    <div className="font-medium">{p.name}</div>
                    {isDetected && (
                      <div className="text-xs text-violet-400">Detectado</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Download Card */}
          <div className="bg-slate-900/50 rounded-2xl border border-white/10 p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                    <CurrentIcon />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Aethel para {current.name}</h2>
                    <p className="text-slate-400">Versão {current.version} • {current.size}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  Requisitos: {current.requirements}
                </p>
                <a
                  href={`/downloads/${current.file}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl font-semibold text-lg transition-all"
                  download
                >
                  <DownloadIcon />
                  Download para {current.name}
                </a>
              </div>
              
              <div className="md:w-px md:h-32 md:bg-white/10" />
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Incluído:</h3>
                {features.slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckIcon />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Checksums */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              <a href="/downloads/checksums.txt" className="text-violet-400 hover:underline">
                Verificar checksums SHA-256
              </a>
              {' • '}
              <a href="/downloads/RELEASE_NOTES.md" className="text-violet-400 hover:underline">
                Notas de versão
              </a>
              {' • '}
              <Link href="/docs/getting-started" className="text-violet-400 hover:underline">
                Guia de instalação
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative px-6 py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Tudo que você precisa</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5"
              >
                <CheckIcon />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Web Version CTA */}
      <section className="relative px-6 py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Prefere usar no navegador?</h2>
          <p className="text-slate-400 mb-6">
            Acesse o Aethel Engine diretamente do seu navegador, sem instalar nada.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all"
          >
            Abrir Aethel Web
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-slate-500">
          <p>© 2026 Aethel Engine. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-white transition-colors">Termos</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
            <Link href="/status" className="hover:text-white transition-colors">Status</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}