'use client';

import { useState } from 'react';
import { 
  MessageCircle, 
  Book, 
  Video, 
  Mail, 
  HelpCircle,
  ExternalLink,
  Search,
  ChevronRight,
  Headphones,
  Users,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { AETHEL_COLORS } from '@/lib/design/aethel-design-system';

const supportCategories = [
  {
    icon: Book,
    title: 'Documentation',
    description: 'Browse our comprehensive documentation and guides',
    link: '/docs',
    color: AETHEL_COLORS.accent.primary[500],
  },
  {
    icon: Video,
    title: 'Video Tutorials',
    description: 'Watch step-by-step video tutorials',
    link: '/docs?tab=tutorials',
    color: AETHEL_COLORS.accent.secondary[500],
  },
  {
    icon: MessageCircle,
    title: 'Community Forum',
    description: 'Connect with other developers and get help',
    link: 'https://community.aethel.io',
    external: true,
    color: AETHEL_COLORS.accent.tertiary[500],
  },
  {
    icon: Headphones,
    title: 'Live Support',
    description: 'Chat with our support team in real-time',
    link: '#live-chat',
    color: AETHEL_COLORS.accent.success[500],
  },
];

const quickLinks = [
  { title: 'Getting Started Guide', link: '/docs/getting-started' },
  { title: 'API Reference', link: '/docs/api' },
  { title: 'Keyboard Shortcuts', link: '/docs/shortcuts' },
  { title: 'Troubleshooting', link: '/docs/troubleshooting' },
  { title: 'Release Notes', link: '/docs/changelog' },
  { title: 'FAQ', link: '/docs/faq' },
];

const faqItems = [
  {
    question: 'How do I reset my password?',
    answer: 'Go to Settings > Security > Change Password. You can also use the "Forgot Password" link on the login page.',
  },
  {
    question: 'What file formats are supported for import?',
    answer: 'Aethel Engine supports FBX, OBJ, GLTF/GLB, USD, and many more. See our documentation for the full list.',
  },
  {
    question: 'How do I collaborate with my team?',
    answer: 'Use the Team menu to invite members. Real-time collaboration is available on Pro plans and above.',
  },
  {
    question: 'Where are my project files stored?',
    answer: 'Projects are stored securely in the cloud. You can export them anytime from the Export menu.',
  },
];

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div style={{
      minHeight: '100vh',
      background: AETHEL_COLORS.bg.deep,
      color: AETHEL_COLORS.text.primary,
    }}>
      {/* Header */}
      <header style={{
        borderBottom: `1px solid ${AETHEL_COLORS.border.default}`,
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: AETHEL_COLORS.text.secondary, textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>
            Support Center
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: AETHEL_COLORS.text.secondary, fontSize: '14px' }}>
            <Clock size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Support available 24/7
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '64px 32px',
        textAlign: 'center',
        background: `linear-gradient(180deg, ${AETHEL_COLORS.bg.elevated} 0%, ${AETHEL_COLORS.bg.deep} 100%)`,
      }}>
        <h2 style={{ fontSize: '40px', fontWeight: 700, marginBottom: '16px' }}>
          How can we help you?
        </h2>
        <p style={{ color: AETHEL_COLORS.text.secondary, marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
          Search our knowledge base or browse categories below
        </p>
        
        {/* Search Box */}
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          position: 'relative',
        }}>
          <Search 
            size={20} 
            style={{ 
              position: 'absolute', 
              left: '16px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: AETHEL_COLORS.text.tertiary,
            }} 
          />
          <input
            type="text"
            placeholder="Search documentation, tutorials, FAQ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              fontSize: '16px',
              background: AETHEL_COLORS.bg.surface,
              border: `1px solid ${AETHEL_COLORS.border.default}`,
              borderRadius: '12px',
              color: AETHEL_COLORS.text.primary,
              outline: 'none',
            }}
          />
        </div>
      </section>

      {/* Support Categories */}
      <section style={{ padding: '48px 32px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          {supportCategories.map((category) => (
            <Link
              key={category.title}
              href={category.link}
              target={category.external ? '_blank' : undefined}
              style={{
                padding: '24px',
                background: AETHEL_COLORS.bg.elevated,
                border: `1px solid ${AETHEL_COLORS.border.default}`,
                borderRadius: '12px',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `${category.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <category.icon size={24} style={{ color: category.color }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {category.title}
                  {category.external && <ExternalLink size={14} />}
                </h3>
                <p style={{ color: AETHEL_COLORS.text.secondary, margin: 0, fontSize: '14px' }}>
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Links & FAQ */}
      <section style={{ padding: '48px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '48px' }}>
          {/* Quick Links */}
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
              Quick Links
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quickLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.link}
                  style={{
                    padding: '12px 16px',
                    background: AETHEL_COLORS.bg.elevated,
                    border: `1px solid ${AETHEL_COLORS.border.default}`,
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: AETHEL_COLORS.text.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                  }}
                >
                  {link.title}
                  <ChevronRight size={16} style={{ color: AETHEL_COLORS.text.tertiary }} />
                </Link>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
              Frequently Asked Questions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {faqItems.map((faq, index) => (
                <div
                  key={index}
                  style={{
                    background: AETHEL_COLORS.bg.elevated,
                    border: `1px solid ${AETHEL_COLORS.border.default}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'none',
                      border: 'none',
                      color: AETHEL_COLORS.text.primary,
                      fontSize: '15px',
                      fontWeight: 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    {faq.question}
                    <ChevronRight 
                      size={16} 
                      style={{ 
                        transform: expandedFaq === index ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s ease',
                        color: AETHEL_COLORS.text.tertiary,
                      }} 
                    />
                  </button>
                  {expandedFaq === index && (
                    <div style={{
                      padding: '0 16px 16px',
                      color: AETHEL_COLORS.text.secondary,
                      fontSize: '14px',
                      lineHeight: '1.6',
                    }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section style={{
        padding: '64px 32px',
        background: AETHEL_COLORS.bg.elevated,
        marginTop: '48px',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '16px' }}>
            Still need help?
          </h3>
          <p style={{ color: AETHEL_COLORS.text.secondary, marginBottom: '32px' }}>
            Our support team is ready to assist you
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="mailto:support@aethel.io"
              style={{
                padding: '12px 24px',
                background: AETHEL_COLORS.accent.primary[500],
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Mail size={18} />
              Email Support
            </Link>
            <Link
              href="/contact-sales"
              style={{
                padding: '12px 24px',
                background: AETHEL_COLORS.bg.surface,
                color: AETHEL_COLORS.text.primary,
                border: `1px solid ${AETHEL_COLORS.border.default}`,
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Users size={18} />
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
