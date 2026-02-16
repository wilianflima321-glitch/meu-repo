/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config')
const enableStandalone = process.env.NEXT_STANDALONE === '1'

// Some local environments inject string literals ("undefined"/"null") into IPC vars.
// Next treats non-empty strings as enabled and attempts revalidateTag IPC with invalid URL.
;['__NEXT_INCREMENTAL_CACHE_IPC_PORT', '__NEXT_INCREMENTAL_CACHE_IPC_KEY'].forEach((key) => {
  const value = process.env[key]
  if (!value) return
  const normalized = String(value).trim().toLowerCase()
  if (!normalized || normalized === 'undefined' || normalized === 'null') {
    delete process.env[key]
  }
})

const nextConfig = {
  ...(enableStandalone ? { output: 'standalone' } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    cpus: 1,
    workerThreads: true,
    webpackBuildWorker: false,
  },
  i18n,
}

module.exports = nextConfig
