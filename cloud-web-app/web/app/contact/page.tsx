import type { Metadata } from 'next'

import ContactContent from './contact-content'

export const metadata: Metadata = {
  title: 'Contact | Aethel Studio',
  description:
    'Contact the Aethel Studio team for support, sales, partnerships, and enterprise conversations.',
}

export default function ContactPage() {
  return <ContactContent />
}
