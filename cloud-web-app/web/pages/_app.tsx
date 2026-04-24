import type { AppProps } from 'next/app'

export default function LegacyErrorApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
