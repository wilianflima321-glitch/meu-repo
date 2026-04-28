import type { Metadata } from 'next'

import ContactContent from './contact-content'

export const metadata: Metadata = {
  title: 'Contact | Aethel Studio',
  description:
    'Entre em contato com o time do Aethel Studio para suporte, vendas, parcerias e conversas enterprise.',
}

export default function ContactPage() {
  return <ContactContent />
}
