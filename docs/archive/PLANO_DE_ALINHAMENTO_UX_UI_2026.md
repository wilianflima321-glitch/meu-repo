# PLANO DE ALINHAMENTO DE INTERFACE E EXPERIÊNCIA (UX/UI) 2026
**Status:** Análise de Coerência Visual e Funcional
**Objetivo:** Elevar o padrão visual de "Protótipo Funcional" para "Produto Comercial AAA" (Nível Unreal Engine / Linear / VS Code).

---

## 1. Diagnóstico de Fratura Visual (Design System Decay)
Identifiquei que, embora tenhamos um Design System robusto (`components/ui`), os componentes mais complexos e recentes estão "desviando" do padrão, criando inconsistência visual e dificuldade de manutenção (temas, acessibilidade).

### 1.1 O Caso `ContentBrowser.tsx`
*   **Problema:** O arquivo define um objeto local `const colors = { bg: '#0f0f14', ... }`.
*   **Impacto:**
    *   Ignora o tema global (Tailwind `dark:` classes).
    *   Se mudarmos a cor da marca no `tailwind.config.ts`, o navegador de assets não muda.
    *   Sensação de "ferramenta colada" em vez de nativa.
*   **Ação de Correção:**
    *   Substituir `#0f0f14` por `bg-background` ou `bg-zinc-950`.
    *   Substituir `#6366f1` (Indigo puro) por `text-primary`.
    *   Substituir bordas manuais por `border-border`.

### 1.2 Componentes "Órfãos" (Hardcoded Styles)
A varredura detectou estilos inline em componentes críticos:
*   `SceneEditor/SceneEditor.tsx`: Estilos de canvas e overlays manuais.
*   `Terminal/XTerminal.tsx`: Configuração de cores do xterm.js hardcoded, desconectada do tema da IDE.
*   **Meta:** Centralizar tokens de design (Cores, Espaçamentos, Fontes) variáveis CSS globais.

---

## 2. Lacunas de Micro-Interações "Enterprise"
Para o usuário sentir confiança na ferramenta, o software precisa comunicar estado de forma constante e elegante. Faltam os seguintes padrões:

### 2.1 Padrão de Estado Vazio (Empty States)
*   **Onde falta:** `ContentBrowser` (quando s/ arquivos), `GitPanel` (antes do init), `ProblemsPanel` (sem erros).
*   **Solução:** Padronizar uso do componente `components/ui/EmptyState.tsx`.
    *   *Exemplo:* Em vez de texto simples "No assets", mostrar ícone de caixa aberta + Botão "Importar Primeiro Asset".

### 2.2 Padrão de Carregamento (Skeletons)
*   **Onde falta:** Ao trocar de pastas no Browser, ao carregar branches no Git, ao trocar de cena.
*   **Problema Atual:** "Flicker" (pisca branco) ou UI travada.
*   **Solução:** Usar `components/ui/Skeleton.tsx` para desenhar grades cinzas pulsantes que mimetizam o conteúdo final. Isso reduz a *percepção* de latência.

### 2.3 Feedback de Operação Longa (Toasts & Progress)
*   **Cenário:** O usuário clica em "Build Project".
*   **Estado Atual:** Provavelmente logs no console ou terminal.
*   **Alvo:** Barra de progresso global no `StatusBar` e Toasts (`sonner` ou similar) para sucesso/erro. "Build completado em 4s".

---

## 3. Acessibilidade para Humanos e IAs (Semantic UI)
Se queremos que Agentes de IA operem a interface, ela precisa ser "legível" por código.

### 3.1 Data-TestIDs para Automação
Os componentes complexos são `<div>` genéricas.
*   **Ação:** Adicionar atributos semânticos.
    *   `<div className="asset-card">` -> `<div role="button" aria-label="Asset Crate.fbx" data-testid="asset-item-crate-fbx">`
*   **Benefício:** Permite que o Agente de Teste e o Agente Operador (Librarian) localizem elementos na tela inequivocamente ("Clique na textura de grama").

### 3.2 Navegação por Teclado (Power User)
*   **Meta:** O usuário deve conseguir fazer tudo sem mouse (como no VS Code).
*   **Falta:** Focus trap nos modais, navegação por setas no Grid de Assets (`ContentBrowser`).

---

## 4. Unificação da Barra de Status (The Brain Bar)
A `StatusBar.tsx` atual é tímida. Ela deve ser o painel de instrumentos do piloto.

### 4.1 O que adicionar na Barra Inferior:
1.  **Contexto WebGL:** "Draw Calls: 124 | Tris: 45k | VRAM: 1.2GB" (Vital para devs de jogos).
2.  **Estado da IA:** Ícone pulsante quando o Copilot está gerando código ou assets em background.
3.  **Conexão:** Ping do WebSocket / Status do Container ("Conectado - us-east-1").
4.  **Seleção:** Caminho do objeto selecionado na cena ("World > Level 1 > Hero > Mesh").

---

## 5. Roteiro de Refatoração de Interface (Checklist Prática)

### Semana 1: Higiene Visual
- [ ] Refatorar `ContentBrowser.tsx` para usar Tailwind classes (`bg-background`, `border-border`).
- [ ] Substituir ícones manuais por `lucide-react` padronizados (já parcialmente feito, mas unificar tamanhos).
- [ ] Implementar `EmptyState` em todas as listas vazias.

### Semana 2: Fluidez e Feedback
- [ ] Criar componente wrapper `<AsyncView isLoading={...} error={...}>` que gerencia Skeletons e Erros automaticamente.
- [ ] Conectar `StatusBar` ao store de performance (`usePerformanceStore`).

### Semana 3: Preparação para IA
- [ ] Auditoria de `aria-labels` nos painéis principais.
- [ ] Criar mapa de navegação por teclado (Shortcuts) unificado no `KeybindingsPanel`.

---
**Conclusão alinhada:**
A interface está 80% pronta em estrutura, mas 40% pronta em acabamento. Esses ajustes não exigem lógica complexa, mas mudam drasticamente a percepção de valor do produto. **Não deixe o ContentBrowser ser um "corpo estranho" no seu Design System.**
