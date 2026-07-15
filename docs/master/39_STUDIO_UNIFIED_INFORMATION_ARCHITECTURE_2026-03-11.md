# 39_STUDIO_UNIFIED_INFORMATION_ARCHITECTURE_2026-03-11
Status: ACTIVE
Date: 2026-03-11
Owner: Product + UX + Platform

## 1) Objetivo
Consolidar a experiencia do Aethel em um fluxo unico de Studio, reduzindo navegacao fragmentada entre superfices criticas (billing, settings, profile, dashboard, ide, nexus).

## Reality Correction (2026-03-25)
This document remains active for navigation normalization and shell consistency, but it is no longer the highest-precedence interface authority.

Canonical precedence for current interface decisions is:
1. `docs/master/65_STUDIO_PRODUCT_BLUEPRINT_2026-03-24.md`
2. `docs/master/66_AI_OPERATIONAL_EXPERIENCE_BLUEPRINT_2026-03-24.md`
3. `AETHEL_INTERFACE_BLUEPRINTS/00_INDEX.md`
4. `AETHEL_INTERFACE_BLUEPRINTS/06_STUDIO_HOME.md`
5. `AETHEL_INTERFACE_BLUEPRINTS/07_PROJECTS.md`
6. `AETHEL_INTERFACE_BLUEPRINTS/08_WORKBENCH.md`

### Current limitation of this document
- it still lists `/nexus` as part of the Studio core route family at the same conceptual level as `/dashboard` and `/ide`
- it predates the stronger decision that `Workbench` is the main production surface and `Nexus` should not compete with it as a parallel product center
- it was written before the interface blueprint set became the implementation-grade UX authority

Use this document for navigation consistency and historical shell consolidation context, not as the final authority on product-center hierarchy.

## 2) Fluxo Canonico de Superfices
1. Public web: `/`, `/pricing`, `/docs`, `/status`, `/contact-sales`
2. Auth: `/login`, `/register`
3. Studio core: `/dashboard`, `/ide`, `/nexus`, `/billing`, `/settings`, `/profile`
4. Admin: `/admin/*` (area separada por permissao)

## 3) Contrato de Navegacao Unificada
Fonte unica de links:
- `cloud-web-app/web/lib/navigation/surfaces.ts`

Conjuntos canonicos:
- `PUBLIC_NAV_LINKS`
- `STUDIO_PRIMARY_LINKS`
- `STUDIO_SECONDARY_LINKS`

Regra de estado ativo:
- `isNavLinkActive(pathname, link)` deve ser usada para evitar regras divergentes por pagina.

## 4) Shell Unico do Studio
Componente central:
- `cloud-web-app/web/components/studio/StudioGlobalNav.tsx`

Uso obrigatorio nas superfices core que nao rodam dentro do shell IDE:
- `/billing`
- `/settings`
- `/profile`

Objetivo de UX:
- contexto consistente do usuario (onde estou, para onde posso ir, estado ativo claro)
- reducao de headers custom por pagina
- menor custo de manutencao para mudancas de IA e navegacao

## 5) Unificacao de Toast Context
Problema anterior:
- dois providers (`Toast.tsx` e `ToastProvider.tsx`) com risco de contexto divergente.

Decisao canonica:
- provider unico em `cloud-web-app/web/components/ui/Toast.tsx`
- `ToastProvider.tsx` passa a ser compatibilidade/re-export.
- barrel `cloud-web-app/web/components/ui/index.ts` exporta `ToastProvider` e `useToast` de `Toast.tsx`.

## 6) Estado Atual (2026-03-11)
- Navegacao publica centralizada: ACTIVE
- Navegacao studio core centralizada: PARTIAL
- Billing com shell unificado: ACTIVE
- Settings com shell unificado: ACTIVE
- Profile com shell unificado: ACTIVE
- Nexus com shell/rail unificado: ACTIVE (hibrido com layout de produtividade proprio)
- Dashboard/IDE shell: PARTIAL (consistencia visual ainda depende de workbench)
- Toast provider unificado: ACTIVE

## 7) Pendencias para Fechar UX Studio 9.0+
1. Harmonizar `/nexus` com o mesmo contrato de navegacao sem quebrar layout de produtividade.
2. Criar layout compartilhado de Studio para reduzir repeticao de wrappers por pagina.
3. Padronizar empty states/loading states em todas as superfices de entrada.
4. Fechar contraste/light-theme em auditoria WCAG AA runtime.
5. Conectar o shell unificado com telemetria de first-value e drop-off por superficie.

## 8) Criterios de Aceite
- Usuario autenticado consegue navegar entre dashboard/ide/nexus/billing/settings/profile sem mudanca abrupta de header/padrao.
- Estado ativo da navegacao bate com rota atual em 100% das superfices cobertas.
- Nao existe mais provider de toast concorrente em runtime.
- Mudanca de links de Studio ocorre em um unico arquivo (`surfaces.ts`).

## 9) Referencias
- `docs/master/35_L4_L5_COMPLETION_MAP_2026-03-05.md`
- `docs/master/36_QUALITY_90_EXECUTION_MAP_2026-03-08.md`
- `docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md`
- `docs/master/DUPLICATIONS_AND_CONFLICTS.md`
