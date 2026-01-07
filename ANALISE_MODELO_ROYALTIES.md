# ANÁLISE ESTRATÉGICA: MODELO DE ROYALTIES E "PUBLISHING" (AETHEL VS UNREAL)

**Data:** 07 de Janeiro de 2026
**Assunto:** Definição da estratégia de participação nos lucros (Revenue Share) dos jogos criados.

---

## 1. O BENCHMARK DE MERCADO (COMO OS GIGANTES COBRAM)

Para decidir nosso caminho, precisamos entender as regras atuais:

### A. Modelo Unreal Engine (Epic Games)
*   **A Regra:** Totalmente grátis para criar.
*   **O Royalty:** Cobram **5%** sobre a receita bruta (Gross Revenue) do jogo, mas **APENAS** se o jogo faturar mais de **$1 Milhão de USD**.
*   **Como recebem:** O desenvolvedor deve enviar relatórios trimestrais de faturamento e pagar via transferência bancária. É um sistema baseado em honra e auditoria.
*   **Por que funciona:** A Epic tem bilhões em caixa (Fortnite) e o custo para um usuário usar a Unreal é zero (roda local).

### B. Modelo Unity
*   **A Regra:** Assinatura mensal (Seat) por desenvolvedor (Pro/Enterprise).
*   **O Royalty:** Tentaram implementar a "Runtime Fee" (taxa por instalação) e foi um desastre de PR. Recuaram. Hoje focam em vender a ferramenta ("Pás e Picaretas").
*   **Como recebem:** Cartão de crédito recorrente (SaaS).

### C. Modelo Roblox
*   **A Regra:** Plataforma fechada. O jogo só roda dentro do Roblox.
*   **O Royalty:** Agressivo. O desenvolvedor fica com apenas ~25% a 30%. O Roblox fica com ~70% (cobrem hospedagem, descoberta, plataforma).
*   **Como recebem:** Retenção na fonte. O dinheiro entra no Roblox, eles descontam a parte deles e pagam o resto em "Robux/Dólar".

---

## 2. A REALIDADE DA AETHEL ENGINE

Não podemos copiar a Unreal 100% porque **nossa ferramenta tem custo de operação (COGS) alto**.
*   Se um usuário ficar 2 anos desenvolvendo um jogo usando nossa IA e Cloud Builds, e o jogo fracassar (faturar $0), **nós prejuízo de milhares de dólares** em OpenAI/AWS.
*   A Unreal não tem esse prejuízo (o custo é a eletricidade do usuário).

### O Veredito:
Precisamos do **Modelo Híbrido**.
1.  **Assinatura (Indie/Studio):** Cobre os custos operacionais (IA, Nuvem) e garante que não pagamos para o usuário trabalhar.
2.  **Royalties (O "Upside"):** Onde ganhamos dinheiro de verdade se um jogo estourar.

---

## 3. PROPOSTA DE MODELO DE ROYALTIES DA AETHEL

Sugerimos uma abordagem mais moderna que a Unreal, focada em **Serviços**, não apenas licença de código.

### Tabela de Revenue Share (Proposta)

| Canal de Venda | Taxa Aethel | Justificativa | Como Recebemos |
| :--- | :--- | :--- | :--- |
| **Steam / AppStore / Console** | **0% a 3%** | Se o jogo for publicado fora, cobramos pouco ou nada para não afugentar. | Contrato Legal (Invoice Trimestral). |
| **Aethel Games Store (Nossa Loja)** | **30%** | Nós damos a hospedagem, o multiplayer e processamos o pagamento. Igual Apple/Steam. | **Automático (Split Payment).** |
| **Jogo usando "Aethel Ads"** | **30%** | Se usarem nossa rede de anúncios in-game. | Retenção na fonte. |

**A Grande Sacada:**
Em vez de cobrar 5% sobre o jogo na Steam (difícil de fiscalizar), nós cobramos **taxas sobre transações dentro do jogo (Microtransações)** se eles usarem nosso sistema de Backend/Multiplayer.

---

## 4. COMO RECEBER O DINHEIRO (A MÁGICA TÉCNICA)

Como o dinheiro sai da mão do jogador e chega na nossa conta bancária?

### Cenário A: O Jogo é publicado na "Aethel Arcade" (Web/App)
Este é o cenário Roblox/AppStore. Nós controlamos o fluxo.

1.  **Tecnologia:** Usaremos **Stripe Connect**.
2.  **Fluxo:**
    *   Jogador compra uma "Espada de Diamante" por $10.00.
    *   O pagamento passa pelo Gateway da Aethel.
    *   O Stripe divide automaticamente:
        *   **$7.00** vai para a conta Stripe do Desenvolvedor (Criador).
        *   **$3.00** vai para a conta Stripe da Aethel (Plataforma).
    *   **Vantagem:** Risco zero de calote. O dinheiro já cai limpo para nós.

### Cenário B: O Jogo é publicado na Steam/PlayStation
Nesse caso, a Valve/Sony recebe o dinheiro primeiro. Eles pagam o desenvolvedor. O desenvolvedor nos paga.

1.  **O Contrato:** Ao exportar o jogo ("Build for Shipping"), o usuário aceita um EULA digital: *"Comprometo-me a pagar 3% de royalties se a receita bruta exceder $100k USD."*
2.  **A Fiscalização (Telemetry):**
    *   O Runtime da Aethel (o código C++/Rust que roda o jogo) envia um "ping" silencioso para nossos servidores a cada x horas de gameplay ou transação, com dados anonimizados de receita (se usarem nossa API de IAP).
    *   Se detectarmos um jogo com 100 mil jogadores simultâneos que declara faturamento zero, nosso jurídico é acionado (ou bloqueamos os serviços Cloud do estúdio).

---

## 5. CONCLUSÃO: VALE A PENA?

Sim, mas não como fonte primária de receita no início.

1.  **Curto Prazo (Ano 1-2):** A receita vêm das **Assinaturas ($19/$99)** e vendas de **Créditos de IA**. Isso mantém as luzes acesas.
2.  **Longo Prazo (Ano 3+):** Se um "Flappy Bird" ou "Among Us" for criado na Aethel, os 3% ou 30% desse jogo valerão mais que todas as assinaturas somadas. 

**Recomendação Final:**
Focar a infraestrutura de pagamentos no **Stripe Connect** para permitir que criadores vendam itens dentro dos jogos (IAP) facilmente, onde podemos morder nossa fatia automaticamente.
