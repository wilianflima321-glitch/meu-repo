# DETALHAMENTO ESTRATÉGIO DE UX/UI: AETHEL ENGINE 2026
**Referência:** [ALINHAMENTO_PLANO_NEGOCIO_E_CUSTOS_2026.md](ALINHAMENTO_PLANO_NEGOCIO_E_CUSTOS_2026.md) - Capítulo 10
**Nível de Detalhe:** Studio Professional (Pronto para Implementação)

Este documento traduz as metas de negócio (conversão, retenção, justificativa de preço) em especificações técnicas e visuais concretas para a interface do usuário. Não é apenas "deixar bonito", é **Design Orientado a Receita**.

---

## 1. O "TIME-TO-FUN" (ONBOARDING DE 30 SEGUNDOS)

**Problema:** O usuário Free entra na plataforma para testar. Se ele vir uma tela preta vazia, ele fecha a aba. Ele não quer *configurar* uma engine, ele quer *ver um jogo rodando*.

### 1.1 O Wizard de Criação (Especificação)
Ao clicar em "Novo Projeto", em vez de um input de nome simples, apresentamos uma experiência visual imersiva.

**Fluxo de UX:**
1.  **Escolha de Gênero (Cards Grandes com Vídeo de Fundo):**
    *   [FPS Shooter] [RPG Top-Down] [Platformer 2D] [Racing] [Blank - *Expert Only*]
2.  **Escolha de Estilo Visual (Vibe):**
    *   [Pixel Art] [Low Poly 3D] [Realistic PBR - *Requer GPU*] [Sci-Fi Neon]
3.  **Ação Final:** Botão "Materializar Universo" (Não use "Criar").
4.  **Loading Screen (Fake mas útil):**
    *   Não mostre barra de progresso genérica.
    *   Mostre: *"Gerando Terreno..."*, *"Compilando Shaders..."*, *"Populando Inimigos..."*.
    *   *Realidade Técnica:* Estamos apenas clonando um repositório template em 2 segundos, mas a animação de 5 segundos valoriza o produto.

### 1.2 Implementação Técnica
*   **Backend:** Templates pré-aquecidos. Quando o usuário clica, fazemos um `git clone` superficial de um repo "template-fps-starter" para a pasta do usuário.
*   **Frontend:** Pré-visualização interativa. Ao passar o mouse no card "FPS", rodar um vídeo WebM pequeno mostrando o gameplay do template.

---

## 2. A ARTE DO "NÃO" (PAYWALLS ELEGANTES)

**Filosofia:** A interface nunca deve dizer "Você não pode". Ela deve dizer "Você *poderia* se...". O bloqueio deve gerar desejo, não frustração.

### 2.1 Componente `<PremiumLock />`
Criar um componente React wrapper para envolver recursos pagos.

```tsx
// Exemplo de uso no código
<PremiumLock plan="studio" feature="voice_mode">
  <Button onClick={activateVoiceMode}>
    <MicIcon /> Ativar Voz
  </Button>
</PremiumLock>
```

**Comportamento Visual:**
1.  **Estado Normal:** O botão aparece colorido e convidativo. Um pequeno cadeado dourado (ícone `Lock` do Lucide) fica no canto superior direito.
2.  **Estado Hover:** Tooltip: *"Disponível no Plano Studio"*.
3.  **Estado Click:**
    *   Não executa a ação.
    *   Abre modal centralizado (Blur no fundo).
    *   **Título:** "Comande a IA com sua Voz" (Venda o benefício, não a feature).
    *   **Vídeo:** Demonstração de 5s da feature em ação.
    *   **CTA:** "Upgrade para Studio ($49) - Cancele quando quiser".

---

## 3. ESTÉTICA INDUSTRIAL (FEELING PROFISSIONAL)

Para cobrar $99/mês, o software não pode parecer um "site Bootstrap". Ele deve parecer um cockpit de avião ou o painel de controle da SpaceX.

### 3.1 A "Brain Bar" (Barra de Status Rica)
A barra inferior (`StatusBar.tsx`) é onde o "power user" olha para sentir o pulso da máquina.

**Métricas a Exibir (Real-time):**
*   **WebGL:** `60 FPS` | `DC: 124` (Draw Calls) | `Tri: 45k` (Triângulos). Use cores (Verde/Amarelo/Vermelho) para saúde.
*   **Latência:** `Ping: 45ms` (Conexão com servidor). Se cair, mostre "Reconectando..." em laranja.
*   **Memória:** `VRAM: 1.2GB / 4GB`. Alerta de crash se encher.
*   **Créditos IA:** `450 CR` (Saldo). Clicar abre a carteira de recarga.

### 3.2 Skeletons e Loading States
*   **Banal:** Spinner girando no meio da tela. (Parece site lento).
*   **Profissional:** Skeleton UI.
    *   Ao abrir o *Content Browser*, desenhar retângulos cinza claro exatamente onde os assets vão aparecer.
    *   A transição é suave (fade-in), não brusca.
    *   Isso passa a sensação de que a estrutura já está lá, só falta o dado chegar.

---

## 4. TANGIBILIZAÇÃO DA IA (SQUAD VISUALIZATION)

O usuário pagou pelo "Squad". Se a resposta aparecer instantaneamente como texto, parece "Chatbot barato". Se mostrarmos o *trabalho*, parece "Consultoria".

### 4.1 O "Thinking Chain" Visual
Quando o usuário pede *"Crie um sistema de inventário"*, a UI de chat muda de estado:

**Fase 1: Planejamento (Avatar Roxo - Arquiteto)**
*   *Animação:* Ícone de "Cérebro" pulsando.
*   *Texto:* "Analisando estrutura atual do projeto...", "Verificando dependências...", "Criando blueprint do inventário...".
*   *Output:* Um bloco de Markdown com o plano: "1. Criar `Inventory.ts`, 2. Criar UI, 3. Ligar Input".

**Fase 2: Construção (Avatar Azul - Engenheiro)**
*   *Animação:* Ícone de "Martelo/Código" digitando rápido.
*   *Texto:* "Escrevendo `components/Inventory.tsx`...", "Gerando estilos...", "Compilando...".
*   *Visual:* Mostrar snippets de código surgindo em tempo real (Matrix style, mas legível).

**Fase 3: Validação (Avatar Verde - QA)**
*   *Animação:* Ícone de "Checklist".
*   *Texto:* "Rodando testes unitários...", "Verificando performance...", "Segurança ok.".
*   *Finalização:* "Pronto. Implementado em `/src/inventory`. Quer testar?"

**Por que isso importa?**
Psicologicamente, o usuário aceita esperar 40 segundos se ele estiver "assistindo o trabalho acontecer". Se for uma tela de loading estática de 40s, ele acha que travou. Além disso, ver os 3 agentes justifica o preço do plano Studio.

---

## 5. RESUMO DE IMPACTO NO CÓDIGO

Para atingir esse nível, precisaremos refatorar/criar:

1.  `components/dashboard/NewProjectWizard.tsx` (Novo componente complexo).
2.  `components/ui/PremiumLock.tsx` (Novo wrapper de controle de acesso).
3.  `components/layout/StatusBar.tsx` (Conexão real com WebGL info).
4.  `components/ai/SquadChat.tsx` (Substituir o chat simples por essa view de "Steps").

**Aprovação:**
Esta estratégia alinha a **Interface** com a **Estratégia de Negócio**. Cada pixel tem a função de reter o usuário ou convertê-lo para um plano pago.
