# PLANEJAMENTO ESTRATÉGICO DE NEGÓCIO E CUSTOS: AETHEL ENGINE 2026

**Autor:** GitHub Copilot (Perfil: Dono/CEO & CTO)
**Data:** 07 de Janeiro de 2026
**Objetivo:** Alinhar a arquitetura técnica AAA com a viabilidade financeira. Evitar a falência por custos de nuvem descontrolados.

---

## 1. A FILOSOFIA "LUCRO PRIMEIRO" (LOCAL-FIRST)

Nossa análise técnica (`ANALISE_ESCALABILIDADE_INFRA_AAA.md`) propôs soluções caras (Clusters K8s, Redis, S3, Build Farms). Se oferecermos isso indiscriminadamente na Web de graça ou barato, **vamos falir**.

**A Regra de Ouro:** O Aethel Engine deve ser uma plataforma **híbrida**.
*   **Web IDE:** É para *onboarding*, colaboração rápida e uso em dispositivos móveis (iPad/Chromebook). O custo é nosso. **Limites rígidos aplicam-se.**
*   **Desktop IDE (Local):** É para produção pesada. O custo de CPU/GPU/RAM/Build é do usuário. **Liberdade total.**

---

## 2. ESTRUTURA DE CUSTOS E RISCOS ("ONDE SANGRARIA DINHEIRO")

| Recurso Técnico | Quem Paga na Web? | Quem Paga no Desktop? | Risco de Prejuízo | Solução de Controle |
| :--- | :--- | :--- | :--- | :--- |
| **Renderização 3D** | Cliente (Browser) | Cliente (PC) | Baixo | - |
| **Armazenamento (S3)** | **Aethel (AWS/R2)** | Cliente (HD Local) | **Alto** | Limite de GB por plano + Política de Exclusão (TTL) |
| **Compilação (Build)**| **Aethel (Workers)**| Cliente (CPU Local) | **Extremo** | Cotas de "Build Minutes" na nuvem. |
| **Multiplayer (WS)** | **Aethel (Servidores)**| N/A (P2P via Relay)| Médio | Desconectar inativos após 10min. |
| **IA (Tokens)** | **Aethel (OpenAI/Anthropic)**| Cliente (Chave Própria ou Cota)| **Alto** | Sistema de Créditos de IA. Acabou, comprou mais. |

---

## 3. DEFINIÇÃO DOS PRODUTOS E PLANOS

### A. Aethel Desktop (O "Cash Cow")
*   **Descrição:** Aplicativo Electron instalado no PC do usuário.
*   **Custo para nós:** Perto de zero (apenas autenticação e sync de metadados).
*   **Liberdade:** Tamanho de projeto ilimitado, builds ilimitados (usa a CPU dele), plugins ilimitados.
*   **Vantagem IA:** Usuário pode inserir a PRÓPRIA chave OpenAI (BYOK) e ter uso Ilimitado sem nos custar nada.
*   **Estratégia:** Queremos *empurrar* os usuários pesados para cá.
*   **Monetização:**
    *   **Versão Community:** Grátis. IA Limitada a modelos básicos (4o-mini). Splash screen no jogo final.
    *   **Versão Pro:** Assinatura mensal. IA Avançada (Claude 3.5 Sonnet / GPT-4o) via nossos proxies optimizados.

### B. Aethel Cloud (A Vitrine Premium)
*   **Descrição:** A IDE completa no navegador, rodando na nossa infraestrutura K8s.
*   **Custo para nós:** Alto (Egress, Storage, CPU de Build + IA Tokens).
*   **Estratégia:** Funciona como "trial de luxo" e ferramenta de colaboração para times.

**Tabela de Planos Cloud (Preços em USD para garantir margem sobre infraestrutura):**

**Tabela de Planos Cloud (Otimizada para Alta Margem de Lucro):**

| Recurso | **Free (Hobby)** | **Indie (Pro)** | **Studio (Business)** | **Enterprise** |
| :--- | :--- | :--- | :--- | :--- |
| **Preço** | **$0.00** | **$19.00/mês** | **$99.00/usuário** | **Sob Consulta** |
| **Projetos Ativos** | 1 (Max 500MB) | 10 (Max 10GB) | Ilimitado (1TB Shared) | Ilimitado |
| **Cloud Builds** | **0** (Baixe o Desktop) | 10 builds/mês | 100 builds/nó/mês | Servidor Dedicado |
| **Multiplayer Colab** | Apenas Leitura | Sync (2 users) | Realtime (10 users) | Ilimitado |
| **Aethel AI Squad** | 1 Agente (Junior) | 500 Créditos | 5.000 Créditos | Cota Personalizada |
| **Storage Frio** | 7 dias inativo | 6 meses | Nunca | Nunca |

**Análise de Margem (Lucro Real Estimado):**
1.  **Indie ($19.00):**
    *   Custo Infra (S3 10GB + DB): ~$0.80
    *   Custo AI (500 créditos): ~$4.00 (Mix de modelos)
    *   Custo Build (10 x 5min): ~$0.80 (Spot Instances)
    *   **Lucro Bruto:** ~$13.40 (Margem de ~70%)
2.  **Studio ($99.00):**
    *   Custo Infra (1TB/User rateado): ~$15.00
    *   Custo AI (5000 créditos): ~$30.00 (Bulk Pricing API)
    *   Custo Build: ~$10.00
    *   **Lucro Bruto:** ~$44.00 (Margem de ~45%)

---

## 4. ORQUESTRAÇÃO DE IA: A "MINA DE OURO"

A funcionalidade de "Squads Inteiros" (Arquiteto + Engenheiro + QA) é onde está o valor real, não na hospedagem de arquivos.

### 4.1 Custo Real da Operação IA
*   **1 Task Simples:** "Crie um script de pulo" = $0.01 (GPT-4o-mini).
*   **1 Task Complexa (Squad):** "Planeje e crie um inventário RPG completo"
    *   Arquiteto (Raciocínio): $0.10
    *   Engenheiro (Código): $0.15
    *   QA (Review): $0.05
    *   **Total Custo:** ~$0.30

### 4.2 Estratégia de Preço dos Créditos
Para garantir o lucro, vendemos o crédito com mark-up agressivo.
*   **Pacote Avulso:** 1000 Créditos = **$20.00 USD**.
*   1000 Créditos permitem ~30 Tasks Complexas (Custo real: $9.00).
*   **Lucro Líquido:** $11.00 por recarga.

Isso transforma a IA de um "Custo" para um "Produto Revendido com Lucro".

### 4.3 Diferenciação por Plano

#### **Plano Free (O Isca)**
*   **Objetivo:** Viciar o usuário na facilidade.
*   **Limitador:** IA "Junior" (Modelos baratos/rápidos). Erra mais, exige correção manual.
*   **Upsell:** "Quer que a IA corrija isso sozinha? Assine o Indie."

#### **Plano Indie (O Padrão)**
*   **Perfil:** Freelancers e Estudantes sérios.
*   **Acesso:** Squad Standard (Arquiteto + Engenheiro).

#### **Plano Studio (A Vaca Leiteira)**
*   **Preço Aumentado ($49 -> $99):** Empresas compram produtividade. O valor de $99 p/ assento é padrão de indústria (Jira, Linear Enterprise).
*   **Feature Matadora:** **Voice Mode**. O Diretor de Arte fala, a IA executa. Isso vale ouro em reuniões de Brainstorming.
*   **Prioridade:** Fila de Build VIP (fura fila dos Indies).

*Acabaram os créditos? Venda packs adicionais.*

---

## 5. MECANISMOS TÉCNICOS DE PROTEÇÃO (STOP-LOSS)

Para garantir que o plano de negócio funcione, precisamos implementar estas travas no código agora (`cloud-web-app`):

### 5.1 O "Circuit Breaker" de Storage
*   No upload S3 (`api/upload`), verificar o tamanho total do projeto.
*   Se `User.Plan == Free` e `ProjectSize > 500MB`: **Bloquear Upload** e mostrar popup: *"Seu projeto cresceu demais para a nuvem grátis. Baixe o Aethel Desktop para continuar sem limites."*
*   **Resultado:** Convertemos custo em usuário instalado.

### 5.2 O "Build Token System"
*   Serviço de Build Farm (`infra/k8s/build-workers`) consome muito dinheiro.
*   Implementar contagem de minutos. Cada build consome créditos.
*   Acabaram os créditos? O botão "Build" muda para "Exportar Código Fonte" (para o usuário buildar na máquina dele).

### 5.3 O "AI Credit Wallet"
*   Cada usuário tem uma carteira de "Aethel Credits".
*   Chat Simples = 1 Crédito.
*   Squad Task = 20 Créditos.
*   Se os créditos do plano acabarem, a IA para e oferece recarga avulsa ou upgrade. (Essencial para não termos prejuízo com usuários hard-core).

### 5.4 Hibernação de Projetos (Cold Storage)
*   Armazenamento quente (SSD/S3 Standard) é caro. Armazenamento frio (Glacier) é barato.
*   Script automático: Projetos Free sem acesso há 30 dias são movidos para Glacier ou deletados (conforme termos de uso).
*   Ao tentar abrir, o usuário espera 5 minutos para "descongelar".

---

## 6. RESUMO PARA O DONO (VOCÊ)

1.  **Não tenha medo da Infra AAA:** Ela só será ativada para quem paga (Planos Indie/Studio). O usuário Grátis roda numa infraestrutura contida e limitada.
2.  **O Desktop é seu amigo:** Ele tira a carga dos nossos servidores. Toda feature nova deve funcionar primeiro no Desktop. A Nuvem é um "espelho" conveniente.
3.  **Monetize a Inteligência:** Assets e Código são commodities. A **Coordenação de Agentes (Squad)** é o valor premium. Venda o "Gerente de Projeto IA", dê o "Codificador Júnior" de graça.
4.  **Trava de Prejuízo:** Implemente o `AI Credit Wallet` junto com o Login. Nenhuma chamada de API sai sem verificar saldo antes.

**Ação Imediata:**
Ao implementar a "Lista de Assets" e "Uploads" (próximos passos técnicos), já inclua a verificação de **Cota de Disco**. Não deixe a porta aberta sem porteiro.

---

## 7. PROTOCOLO ANTICALOTE E SEGURANÇA DE RECEITA (SHIELD)

Para evitar prejuízos financeiros por má fé, fraudes de cartão ou abuso técnico, implementaremos o protocolo **Aethel Shield** em todas as camadas.

### 7.1 Blindagem Financeira (Billing)
*   **Prevenção de "Card Testing":** Não aceitar cadastro de cartão sem validação 3D Secure (Stripe). Isso evita que hackers usem nossa plataforma para testar cartões roubados (o que gera taxas de estorno para nós).
*   **Política de "Pague para Escalar":** Recursos caros (GPU Build, IA Squad) só são liberados após o sucesso da cobrança inicial. Nada de "Pague no fim do mês" para contas novas (Risco de calote alto).
*   **Saldo Negativo:** Se o pagamento falhar na renovação, o acesso ao Editor Cloud é bloqueado imediatamente (Grace Period de 3 dias apenas para download, não edição). O Desktop continua funcionando (custo zero).

### 7.2 Blindagem de Infraestrutura (Anti-Hijack)
*   **Mineração de Cripto:** Build Workers são alvos comuns.
    *   *Solução:* Container isolado com timeout de 30min e bloqueio de rede para portas não-essenciais (bloquear Stratum protocol). Monitor de CPU constante.
*   **DDoS Interno:** Um usuário malicioso pode tentar derrubar o banco com loops infinitos.
    *   *Solução:* Rate Limiting severo na API (100 req/min por usuário Free).

### 7.3 Blindagem de Interface (UX Anti-Estorno)
Muitos "calotes" são na verdade usuários furiosos com cobranças surpresa.
*   **Sem Cobrança Surpresa:** A UI nunca deve permitir exceder a cota e cobrar automático ("Overage").
*   **UI de Bloqueio:** Quando a cota acaba, a ação falha e um Modal de "Recarga Necessária" aparece. É melhor frustrar o usuário do que cobrar sem ele saber e levar um Chargeback.
*   **Visibilidade:** O "Saldo de Créditos" fica visível o tempo todo na StatusBar.

### 7.4 Propriedade Intelectual e Assets
*   **Proteção de Assets Pagos:** Se vendermos assets premium, o usuário só pode baixá-los "Cozinhados" (Cooked/Binary) ou criptografados para a Engine. O download do fonte (.FBX/.BLEND) só para contas Enterprise auditadas.
*   **Isolamento de Projetos:** Garantir no nível do Kernel (gVisor) que um usuário hacker não consiga acessar `/var/data` de outros projetos no mesmo servidor.

---

## 8. ECOSSISTEMA DE RECEITA ADICIONAL (ALÉM DA ASSINATURA)

Para maximizar o LTV (Lifetime Value) do usuário, criaremos fluxos de receita além da mensalidade.

### 8.1 Marketplace de Assets e Plugins
Criar um mercado onde criadores vendem para criadores (modelo Unity Asset Store).
*   **Comissão:** Aethel retém **30%** de todas as vendas.
*   **Requisito de Infra:** Vendedores pagam armazenamento dos assets? Não. Nós pagamos, pois ganhamos 30% na venda.
*   **Controle de Qualidade IA:** Agente "Asset Auditor" verifica automaticamente se o modelo 3D tem geometria limpa antes de publicar.

### 8.2 Game Analytics (Add-on)
Jogos online geram milhões de eventos (telemetria). Armazenar isso é caro.
*   **Produto:** "Aethel Analytics".
*   **Preço:** Grátis até 10k eventos/mês. Depois, $5/milhão de eventos.
*   **Infra:** ClickHouse ou ElasticSearch gerido. Lucro margem alta.

### 8.3 Hospedagem de Multiplayer Dedicado (Game Server Hosting)
Para jogos que precisam de servidor autoritativo (FPS, MOBA) e não apenas P2P.
*   **Modelo:** Revenda de Bare-metal (Agones K8s).
*   **Preço:** Custo AWS + 100% Markup. O usuário clica "Deploy Server" e nós subimos o container.

---

## 9. LACUNAS IDENTIFICADAS E SOLUÇÕES (GAP ANALYSIS)

Áreas que geram custo "invisível" e precisam ser limitadas nos Termos de Uso.

### 9.1 O "Buraco Negro" do Git LFS (Histórico de Versão)
*   **Problema:** Um projeto de 1GB pode ter 50GB de histórico `.git` se o usuário alterar texturas frequentemente.
*   **Solução por Plano:**
    *   **Free:** Sem histórico (Apenas Snapshot atual). O "Undo" funciona na sessão, mas não há `git checkout` de semana passada.
    *   **Indie:** Histórico dos últimos 30 dias ou 5GB LFS.
    *   **Studio:** Histórico Ilimitado (Cobrado Storage Excedente).

### 9.2 Bandwidth de Exportação (Egress)
*   **Problema:** Usuário cria um jogo popular e hospeda o `.zip` no nosso link público. 100k downloads = Conta gigantesca de AWS Egress.
*   **Solução:**
    *   Não somos CDN de distribuição de jogos.
    *   O link de "Publicar" gera uma página no `aethel.games` (Nossa loja) ou exporta para Itch.io/Steam.
    *   Bloquear "Hotlinking" direto dos assets (evitar que usem nosso S3 como CDN de site externo).

### 9.3 Suporte Técnico
*   **Problema:** Usuários Free abrem tickets exigindo ajuda de código.
*   **Solução:**
    *   **Free/Indie:** Suporte via Comunidade (Discord/Forum) e IA Bot. Sem email humano.
    *   **Studio:** Suporte Email prioridade (SLA 48h).
    *   **Enterprise:** Slack Connect direto com engenharia.

---

## 10. ESTRATÉGIA DE EXPERIÊNCIA DO USUÁRIO (UX PARA CONVERSÃO)

O sucesso do plano de negócios depende não apenas de "funcionar", mas do usuário *sentir* que a ferramenta é profissional e vale os $19/$99. Baseado na nossa auditoria de design (`PLANO_DE_ALINHAMENTO_UX_UI_2026`):

### 10.1 Onboarding "Time-to-Fun" (Foco no Free)
A prioridade zero é o usuário ter um jogo rodando em **< 30 segundos**. Se ele demorar para configurar, ele desiste.
*   **O que temos:** Templates básicos no backend.
*   **Ação UX:** Implementar um "Wizard" visual. "O que vamos criar hoje?" -> [FPS] [RPG] [Plataforma]. Clique -> Clone Instantâneo -> Editor Abre.
*   **Regra de Ouro:** NUNCA abrir um projeto vazio (Tela Azul) para um usuário novo. O "Blank Project" é só para pros.

### 10.2 UX de Limites (Paywalls Elegantes)
A forma como dizemos "não" define se o usuário faz upgrade ou churn.
*   **Errado:** Botão desabilitado ou erro "403 Forbidden" no console.
*   **Correto (Feature Teasing):** Botão habilitado com ícone de cadeado (🔒). Ao clicar, abre um Modal bonito: *"Builds de Console são exclusivos do Plano Studio. Desbloqueie agora."*
*   **Conceito:** "Preview Permitido, Execução Bloqueada". Deixe o usuário *ver* as opções avançadas de IA, mas peça o cartão para *executar*.

### 10.3 Feedback Visual de "Ferramenta Pesada"
Para competir com Unity/Unreal, a web não pode parecer um "site que carrega".
*   **Skeletons:** Ao abrir o `ContentBrowser`, mostrar retângulos cinzas pulsantes enquanto carrega do S3. Zero "flicker" branco.
*   **Toasts de Sistema:** Feedback para tudo. "Compilando Shaders...", "Autosave completo", "Conexão perdida - Tentando reconectar...".
*   **Status Bar Real:** Mostrar FPS, Latência, Uso de VRAM na barra inferior. Isso grita "Sou uma Engine Profissional", não um brinquedo.

### 10.4 A UX do "Squad AI" (Tangibilizar o Valor)
O usuário paga caro pelo "Time de IA". A interface precisa vender isso.
*   **Personificação Visual:** O chat não pode ser monótono. O "Arquiteto" tem avatar roxo, "Engenheiro" azul, "QA" verde.
*   **Visibilidade de Processo:** Não mostre apenas "Gerando...". Mostre os steps: *"Arquiteto está desenhando o plano..."* -> *"Engenheiro está criando os arquivos..."* -> *"QA está rodando testes..."*. Isso justifica o custo e o tempo de espera.
*   **Diff View Obrigatório:** Antes de a IA alterar o código do usuário, mostrar um "Diff Side-by-Side" (como no VS Code). O usuário profissional precisa *confiar* antes de aceitar.

---

## 11. ARQUITETURA DE MONETIZAÇÃO E ROYALTIES (PUBLISHING 2.0)

Para transformar a Aethel de "Ferramenta de Custo" em "Plataforma de Lucro", implementaremos um modelo financeiro híbrido, tecnicamente auditável e automatizado.

### 11.1 A Lógica Comercial (Benchmarking Ajustado)
Não podemos copiar a Unreal cegamente (que só cobra após $1M) pois nossos custos de Cloud são imediatos.
*   **Modelo Unity (SaaS):** Garante o pagamento da infraestrutura básica (Assinaturas $19/$99).
*   **Modelo Roblox (Platform):** Garante o "Upside" explosivo através de Revenue Share (30%) nas microtransações.
*   **Modelo Unreal (Royalty):** Garante participação em sucessos externos (3% sobre Steam/Console).

### 11.2 Ecossistema "Aethel Arcade" (Nossa Loja)
Quando o desenvolvedor publica o jogo na nossa plataforma Web/Mobile (`aethel.games`), nós controlamos a cadeia financeira.

**Arquitetura Técnica: Stripe Connect (Marketplace)**
Atuaremos como uma plataforma agenciadora. Isso resolve a complexidade fiscal e de pagamentos.
1.  **Onboarding (KYC/KYB):**
    *   No Dashboard, o Dev clica em "Ativar Monetização".
    *   Redirecionamos para o fluxo **Stripe Express**.
    *   O Dev envia documentos (CPF/CNPJ) direto para a Stripe. Aethel não armazena dados bancários sensíveis.
2.  **Split Payment (Divisão na Fonte):**
    *   Jogador compra "Espada de Fogo" ($10.00).
    *   O Checkout da Aethel processa o pagamento.
    *   A API instrui a Stripe: *"Envie $7.00 para a conta conectada do Dev e mantenha $3.00 na conta da Aethel"*.
    *   **Vantagem:** O dinheiro entra limpo. Não há risco de bitributação ou inadimplência do dev.

### 11.3 Ecossistema "External Publishing" (Steam/Consoles)
Quando o jogo roda fora da nossa infraestrutura, perdemos o controle do fluxo financeiro. Para garantir os royalties de 3% (acima de $100k):

**Protocolo de Auditoria: "Aethel Heartbeat"**
O Runtime da Engine (compilado em Rust/C++) conterá um módulo de telemetria obrigatório e ofuscado.
1.  **Coleta de Métricas:** O jogo envia periodicamente um pacote assinado criptograficamente contendo: `UniquePlayerID` (Hash), `SessionTime`, e `IAPEvents` (se usarem nossa API).
2.  **Análise de Discrepância:**
    *   Cruzamos os dados do **Heartbeat** (ex: 50.000 Jogadores/Dia) com os dados públicos da **SteamDB/SensorTower**.
    *   Se o jogo reporta Faturamento Zero mas tem métricas de "Unicorn", o sistema de Billing emite um alerta de "Auditoria Necessária".
3.  **Enforcement (Aplicação):**
    *   A violação dos termos de reporte resulta na **Revogação de Chaves de API** (quebrando Multiplayer e Cloud Saves do jogo) e medidas legais (DMCA).

### 11.4 Contratos Digitais e Travas (Legal Tech)
*   **EULA Dinâmico:** O botão "Build for Shipping" (Gerar Executável Final) dispara um Modal de EULA.
    *   *"Declaro que pagarei 3% de royalties se minha receita bruta exceder $100.000 USD."*
    *   A assinatura é registrada no Blockchain ou Log Imutável com Timestamp/IP.
*   **Watermark Hardcoded:**
    *   Jogos compilados na conta **Free** possuem uma Watermark "Powered by Aethel" inalterável no canto da tela e na Splash Screen.
    *   A única forma de remover é recompilando com uma licença **Indie/Studio** ativa. Hackear o binário para remover viola o DMCA.





