// Executable UX market checks for qa:ux-market-standard.
// Split so the gate remains maintainable under the large-file ratchet.
export const PUBLIC_UX_CHECKS = [
  {
    id: 'public-chrome-no-inline-style',
    description:
      'Public chrome must use the design-system class grammar, not inline style blocks.',
    files: ['components/ui/PublicHeader.tsx', 'components/ui/PublicFooter.tsx'],
    test: (content) => (content.match(/\bstyle=\{/g) ?? []).length,
    limit: 0,
  },
  {
    id: 'public-chrome-mobile-nav',
    description:
      'Public header must expose mobile navigation and active-route affordances.',
    files: ['components/ui/PublicHeader.tsx'],
    test: (content) =>
      Number(
        !content.includes('aria-expanded') ||
          !content.includes('usePathname') ||
          !content.includes('aria-current'),
      ),
    limit: 0,
  },
  {
    id: 'auth-three-tier-visible',
    description:
      'Login must expose passkey, magic link, OAuth, and password fallback because the backend already supports governed passwordless auth.',
    files: ['app/(auth)/login/login-v2.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'startAuthentication',
        'Continue with passkey',
        'Send magic link',
        'startOAuth',
        'Use password fallback',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'public-entry-no-inline-style',
    description:
      'Auth, help, and status entry points must stay on canonical classes so the UI does not collapse into ad hoc spacing and browser defaults.',
    files: [
      'app/(auth)/login/login-v2.tsx',
      'app/(auth)/register/register-v2.tsx',
      'components/auth/AuthExperiencePanel.tsx',
      'app/help/_components/HelpPageClient.tsx',
      'app/help/_components/HelpFaqSections.tsx',
      'app/help/_components/HelpQuickLinks.tsx',
      'app/status/_components/StatusPageClient.tsx',
    ],
    test: (content) => (content.match(/\bstyle=\{/g) ?? []).length,
    limit: 0,
  },
  {
    id: 'landing-copy-language-drift',
    description:
      'Landing surfaces must avoid mixed Portuguese/English hardcoded product copy until locale routing owns translation.',
    files: [
      'app/landing-v3.tsx',
      'app/landing-v3-mission-box.tsx',
      'app/landing-v3-studio-proof.tsx',
    ],
    test: (content) =>
      (
        content.match(
          /\b(missao|poluicao|aprovacao|aprovacoes|decisoes|dominio|automacoes|colecao|ja|estao|nao|so)\b/gi,
        ) ?? []
      ).length,
    limit: 0,
  },
  {
    id: 'public-buyer-language-drift',
    description:
      'Public buyer pages must not mix Portuguese into the premium English procurement, comparison, and pricing experience.',
    files: [
      'app/compare/page.tsx',
      'app/compare/comparison-content.ts',
      'app/pricing/page.tsx',
      'app/pricing/_components/PricingHero.tsx',
      'app/trust/page.tsx',
      'app/trust/trustContent.ts',
      'app/security/page.tsx',
      'app/security/securityContent.ts',
      'app/security/trust-center-shared.tsx',
      'app/compliance/page.tsx',
      'app/compliance/complianceContent.ts',
      'app/reliability/page.tsx',
      'app/reliability/reliabilityContent.ts',
    ],
    test: (content) =>
      (
        content.match(
          /\b(Comparativo|pagina|tecnico|tecnicos|voce|Escolha|Nao|criterio|superficies|Seguranca|publico|Clientes|Decisao|Ferramenta|referencia|gargalo|produto|Abrir|Testar|Pesquisa|estao|lideres)\b/gi,
        ) ?? []
      ).length,
    limit: 0,
  },
  {
    id: 'public-support-language-drift',
    description:
      'Docs, contact, sales, and reset-password surfaces must avoid mixed Portuguese/English copy and broken placeholders.',
    files: [
      'app/contact-sales/contact-sales-content.tsx',
      'app/contact-sales/contact-sales.parts.tsx',
      'app/docs/docs-content.tsx',
      'app/docs/docs-directory-client.tsx',
      'app/docs/docs-content.data.ts',
      'app/docs/docs-resource-page.tsx',
      'app/docs/page.tsx',
      'app/docs/community/page.tsx',
      'app/docs/changelog/page.tsx',
      'app/docs/support/page.tsx',
      'app/privacy/page.tsx',
      'app/security-policy/page.tsx',
      'app/page.tsx',
      'app/reset-password/reset-password-content.tsx',
    ],
    test: (content) =>
      (
        content.match(
          /\b(Documentacao|Politica|privacidade|Coletamos|informacoes|Acesso|rapido|busca|Primeiros|Suporte|Comunidade|Leituras|Name da empresa|Briefing enviado|Revisar|Conversa|Contact comercial|Origem|dias|seguranca|publico|publica|direcao|superficie|modulo|secoes|Nenhum|Tente|Limpar|Abrir|empresa|avaliacao|proximo|voce|Nao|Basico|Estudio|repositorio|codigo|historico|execucao|mudancas|pagina|publicas|produto|Ajuda|Como pedir|equipe|evidencias|ambiente)\b|\u00c3\u0192|\u00c3|\u00e2|\?\?\?\?/gi,
        ) ?? []
      ).length,
    limit: 0,
  },
  {
    id: 'public-contact-no-fake-proof',
    description:
      'Contact surfaces must not show placeholder phone numbers, fake addresses, or broken password placeholders.',
    files: [
      'app/reset-password/reset-password-content.tsx',
    ],
    test: (content) =>
      (content.match(/4000-0000|Av\. Paulista|\?\?\?\?/g) ?? []).length,
    limit: 0,
  },
  {
    id: 'shared-product-language-drift',
    description:
      'Shared product primitives used by IDE, Studio, and admin must not leak Portuguese placeholders or mojibake into premium surfaces.',
    files: [
      'components/ui/Select.tsx',
      'components/viewport/SceneViewportInspector.tsx',
      'components/visual-scripting/VisualScriptEditor.tsx',
      'components/visual-scripting/visual-node-catalog.ts',
      'app/settings/page.tsx',
      'components/assets/AssetPreviewPanel.tsx',
      'components/media/MediaStudioPanels.tsx',
      'components/scene-editor/ScenePropertiesPanel.tsx',
      'components/editor/CodeEditor.tsx',
      'components/editor/InlineEditModal.tsx',
    ],
    test: (content) =>
      (
        content.match(
          /\b(Selecione|Caminho da pasta|Search nos|Search no terminal|exemplo\.com|usuario@|pasta|recente|Gerenciar|Fechar|Limpar|Aplicar|Gerar|Comandos|Usar|codigo|voce|Nao|Resultado anterior|sugestao|edicao|Documentacao)\b|\u00c3|\u00e2/gi,
        ) ?? []
      ).length,
    limit: 0,
  },
  {
    id: 'authenticated-account-language-drift',
    description:
      'Account, billing, settings, and onboarding surfaces must use a consistent English product shell until locale routing owns translation.',
    files: [
      'app/profile/page.tsx',
      'app/profile/page.parts.tsx',
      'app/profile/page.types.ts',
      'app/profile/profile-delete-dialog.tsx',
      'app/profile/profile-primitives.tsx',
      'app/profile/profile-shell.tsx',
      'app/profile/profile-tabs.tsx',
      'app/settings/page.tsx',
      'app/settings/_components/SettingsCommandCenter.tsx',
      'components/settings/UserAuditLogPanel.tsx',
      'components/settings/TwoFactorSecurityPanel.tsx',
      'components/billing/PremiumLock.tsx',
      'components/billing/LowBalanceModal.tsx',
      'components/billing/CreditWallet.tsx',
      'components/billing/BillingIntegration.tsx',
      'components/onboarding/WelcomeWizard.tsx',
      'components/onboarding/OnboardingWizard.tsx',
    ],
    test: (content) =>
      (
        content.match(
          /\b(voce|Voce|Nao|nao|codigo|seguranca|configuracao|configuracoes|perfil|Preferencias|preferencias|Basico|Estudio|Empresarial|Inicial|Proximo|Abrir|Limpar|Redefinir|codigos|recuperacao|autenticador|Escaneie|Guarde|cofre|geracao|repositorios|sugestoes|Search configuracoes|Pagina|pagina|activedo|desactivedo|Alteracoes)\b|Ã|â/gi,
        ) ?? []
      ).length,
    limit: 0,
  },
  {
    id: 'public-docs-deep-routes',
    description:
      'Docs support, community, and changelog are real pages and must not redirect back to anchors on /docs.',
    files: ['next.config.js'],
    test: (content) =>
      (
        content.match(
          /\/docs#(support|community|changelog)|\/docs\/(support|community|changelog)['"],\s*['"]\/docs#/g,
        ) ?? []
      ).length,
    limit: 0,
  },
  {
    id: 'public-buyer-no-decorative-gradients',
    description:
      'Pricing and comparison pages must stay closer to Linear/Vercel restraint: no fixed blur or gradient backdrops in the buyer scan path.',
    files: [
      'app/compare/page.tsx',
      'app/pricing/page.tsx',
      'app/pricing/_components/PricingPlansGrid.tsx',
      'app/pricing/_components/PricingEnterpriseCard.tsx',
      'app/pricing/_components/PricingComparisonTable.tsx',
      'app/security/trust-center-shared.tsx',
      'app/trust/page.tsx',
      'app/security/page.tsx',
      'app/compliance/page.tsx',
      'app/reliability/page.tsx',
      'app/marketplace/page.tsx',
      'app/marketplace/MarketplaceHero.tsx',
      'app/marketplace/MarketplaceCard.tsx',
      'app/marketplace/MarketplaceInstallReview.tsx',
      'app/docs/docs-resource-page.tsx',
      'app/privacy/page.tsx',
    ],
    test: (content) =>
      (
        content.match(
          /bg-\[(linear|radial)-gradient|bg-gradient-to-|blur-\[/g,
        ) ?? []
      ).length,
    limit: 0,
  },
  {
    id: 'marketplace-trust-grammar',
    description:
      'Marketplace must show verified/community tabs, permissions, provenance, risk, rollback, and a review-first install decision.',
    files: [
      'app/marketplace/page.tsx',
      'app/marketplace/MarketplaceHero.tsx',
      'app/marketplace/MarketplaceCard.tsx',
      'app/marketplace/MarketplaceInstallReview.tsx',
      'app/marketplace/marketplace-page.data.ts',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'trustFilter',
        'Permissions',
        'Provenance',
        'Risk',
        'Rollback',
        'Install preview',
        'Request review',
        'verified',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'marketplace-public-runtime-isolation',
    description:
      'Marketplace is a public product surface and must not mount authenticated Studio runtime providers that can break public navigation.',
    files: ['app/marketplace/layout.tsx'],
    test: (content, { read } = {}) => {
      const required = ['return <>{children}</>']
      const forbidden = [
        'StudioRuntimeRouteLayout',
        'StudioRuntimeProviders',
        'CoreUiProviders',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbidden.filter((token) => content.includes(token)).length
      )
    },
    limit: 0,
  },
  {
    id: 'public-screenshot-billboard',
    description:
      'Public entry surfaces must not use raw screenshot billboards as the primary proof.',
    files: [
      'app/landing-v3.tsx',
      'app/pricing/page.tsx',
      'app/marketplace/page.tsx',
      'components/ui/PublicHeader.tsx',
      'components/ui/PublicFooter.tsx',
    ],
    test: (content) => (content.match(/\/screenshots\//g) ?? []).length,
    limit: 0,
  },
]
