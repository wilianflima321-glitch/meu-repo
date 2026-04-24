import {
  Head,
  Html,
  Main,
  NextScript,
} from 'next/document'

export default function LegacyDocument() {
  return (
    <Html lang="pt-BR" className="dark">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
