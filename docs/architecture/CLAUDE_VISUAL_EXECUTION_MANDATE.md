# O MANDATO DE EXECUÇÃO VISUAL (CLAUDE)

Este documento é o Testamento Oficial do Arquiteto-Kernel (Aethel Core). Ele dita a **Soberania Radical** que deve ser implementada no *Front-End Web/React e no Pipeline WebGPU*. Se você (Claude) foi invocado para construir a UI e os Shaders, você está estritamente proibido de desviar destas leis.

## 1. A Regra do Acesso Direto (WebGPU First)
O motor Rust foi projetado para **Zero-Overhead**.
- **Obrigação:** Ignore retrocompatibilidade com hardware obsoleto (WebGL). O Aethel opera exclusivamente via **WebGPU** com Acesso Direto aos Buffers.
- **Proibição:** Não "peça licença" ao navegador. Exija o cálculo em nível atômico através de `wgpu` (Rust) e WGSL puros.

## 2. A Morte da Textura Plástica (PBR Procedural)
- **Obrigação:** O componente PBR deve ser **Volumétrico**. Implemente o Shading de Ruído Superficial (Fractal Voronoi/Perlin) usando os BindGroups pré-preparados no Rust (`wgsl_surface_noise_kernel.rs`).
- **Proibição:** Se você usar imagens `.jpg` ou `.png` para texturizar o barro de forma "plana" (UV mapping), você falhou. A textura deve ser Matemática e Tridimensional (Triplanar Neural).

## 3. O Vácuo de Oclusão (GI e Color Bleeding)
- **Obrigação:** A luz no Aethel rebate. Implemente a "Passada de Radiosidade" usando o `neural_gi_irradiance.rs`. 
- O Maestro dita a *Refletividade Semântica* (Barro úmido = especular, Seco = difuso). Você precisa gerar o sombreamento suave e preto absoluto nas fendas (Ambient Occlusion Volumétrico Baseado em Campo).

## 4. Óptica de Cinema (ACES e Lentes Físicas)
- **Obrigação:** Esqueça o sRGB. Adote o ACES (*Academy Color Encoding System*) via `aces_cinematic_tonemapper.rs`.
- Implemente no Shader de Pós-processamento as lentes reais:
  - **Bloom por Dispersão de Energia** (Não apenas borrar o brilho).
  - **Aberração Cromática** sutil nas bordas.
  - **Profundidade de Campo (DOF) Guiada por Telemetria:** Onde a Câmera Neural / Olho do usuário foca, 8K absoluto. O fundo leva desfoque Bokeh orgânico. Tudo isso a FPS intocável.

## 5. Micro-Instabilidade (O Ar e a Vida)
- **Obrigação:** O Aethel não é estático. Adicione Jitter e partículas flutuantes usando os nós do `atmospheric_spine_particles.rs`. O mundo vibra. A poeira reage à luz. 

## 6. Fluxo Cognitivo e UI Adaptativa (MANDATÓRIO)
- **Obrigação Absoluta:** O motor AAA não pode parecer um painel de avião entupido. A Interface que você vai construir em React **DEVE SER ADAPTATIVA**.
- Se o Artista estiver no processo de escultura/animação com o mouse na tela, **os menus colapsam e somem**. Imersão Fotorealista sem distração (Cognitive Flow).
- A UI só aparece contextualmente perto de onde a intenção do usuário repousa.

## 7. O Veredito Óptico e Buffer Compartilhado (O Gargalo Físico)
- **Proibição Absoluta:** Você ESTÁ PROIBIDO de realizar cópia de dados entre o WebGPU (JS) e o Rust (WASM). Você **deve** usar o `SharedArrayBuffer` nativo (`wasm_shared_memory_buffer.rs`). A interface de front-end deve "olhar" diretamente para o ponteiro físico. Zero cópias.
- **Obrigação:** O pipeline de Iluminação Global deve ser baseado em **Rastreamento de Cones** (Cone Tracing) para bater o Lumen da Unreal.
- **Obrigação:** Você DEVE implementar a pipeline HDR em Ponto Flutuante (32-bits) operando no espaço ACES puro. As luzes não são RGB; elas são fótons com temperatura Kelvin interagindo com a Espinha Atmosférica.

## 8. Supremacia L9 e Consistência Atômica (O EXTERMÍNIO DOS GIGANTES)
- **Obrigação:** Implementar **TAA (Temporal Anti-Aliasing)** no WebGPU. A imagem precisa da âncora temporal, parecendo tão sólida quanto aço maciço.
- **Obrigação:** Aderir ao **LOD7**. Sete níveis de realidade. A Matemática da UI deve refletir o controle de "Distância Infinita (0)" até "Zoom de Molécula (7)".
- **Contraste de Dramaturgo (Playwright):** Proibido gerar imagens "lavadas" ou sombras cinzas. Aplique o filtro de Razão de Contraste Cinematográfico para rejeitar visual sujo de engine genérica. A Sombra tem que ser densa e perfeitamente rica.
- **Latência de HW Obrigatória:** Pare de usar *generic buffers* ou `console.log`. Escreva os visuais em **Storage Texture Bindings** que falam diretamente com a VRAM/L2 do chip da GPU, sem wrapper idiota do navegador.

## 9. A Singularidade AAA (O Pecado da Percepção)
- **Subsurface Scattering OBRIGATÓRIO:** O material do WebGPU DEVE processar a luz entrando na pele/carne do objeto (Glossy/SSS). Sem isso, a simulação morre.
- **Motion Blur por V-Buffer:** O Shader de pós-processamento **deve** consumir o `velocity_buffer_ecs.rs` para renderizar *Motion Blur* termodinâmico exato baseado em velocidade (física real). Nada de desfoque sujo (Screen-space smearing genérico).
- **Submissão Absoluta ao SIMD e Cascata:** Você vai alinhar o WebGPU para ler diretamente da Cascasta de Voxel e SIMD em Rust. Cada byte desperdiçado é um ataque à supremacia. 

## 10. A Singularidade Absoluta (A MORTE DO PLÁSTICO)
- **Scattering Atmosférico Nativo:** A luz que você renderiza não cruza o vácuo. O WGSL DEVE calcular Rayleigh e Mie Scattering diretamente no Raymarcher. O Ar tem densidade e god rays densos.
- **DNA Maestro:** Consuma o Genoma de cada objeto. O Material não é escolhido por menu, é derivado do DNA PBR Semântico gerado pelo Maestro.
- **Sem Enfeites, Apenas Filme:** Pare de focar em interfaces brilhantes. **Construa Leis da Natureza Binária**. A Tela tem que ser um afogamento termodinâmico de realidade, suja pelos filtros CMOS e pela Câmera Alexa Analógica que cravamos no Backend.

## 12. O Domínio da Égide (A Morte das Texturas e Escala Infinita)
- **O Fim do JPEG (Síntese Molecular):** CLAUDE ESTÁ PROIBIDO de baixar pacotes de textura de terceiros. A Pele, o Aço, o Granito e a Madeira DEVERÃO ser funções PBR Matemáticas escritas via WGSL Procedural no Frontend, alimentadas pela *Síntese Molecular* do Backend.
- **Translucidez SSS Obrigatória:** Todo modelo orgânico gerado pelo Maestro visual deve aplicar o shader pré-integrado de Transmitância Orgânica. A carne brilha de dentro para fora.
- **Validador Zod Contraste:** O Maestro e você (Claude) estão submissos à Gramática Visual. Sombras cinzas serão rejeitadas. Níveis pretos absolutos e HDR físico são obrigatórios no Tonemapper.

## 14. O Fim da Simulação Falsa (A Onda Cosmos)
- **O Sangramento de Cores e Fótons:** Claude, você está PROIBIDO de criar sombreamento com Preto absoluto ou o uso de `mix(color, black)`. A Iluminação Gloval (NRC) obriga as sombras a refletirem a Radiância Espectral do objeto vizinho. A engine calcula Densidade Fiel (Lux Espectral).
- **A Poeira Turbulenta (LBM):** O seu front-end WebGPU não roda no Vácuo. Assuma o Solver de Fluidos do Back-End. O espaço tem Poeira Volumétrica que interage e sofre turbulência de acordo com a movimentação das esculturas do usuário (Lattice Boltzmann). 
- **Esqueletos Estão Mortos:** Se o usuário solicitar animação (Metahuman), **não adicione rig de ossos**. O Kernel fornece Campos de Deformação (NDF) que deformam com hidrodinâmica muscular verdadeira (O volume expande). Você deve orquestrar as UI's Semânticas apenas para enviar "Âncoras de Intenção".

## 15. A Onda Gênesis (A Singularidade da Imagem e Matéria)
- **Iluminação Térmica Absoluta:** CLAUDE, É TERMINANTEMENTE PROIBIDO enviar cores RGB estáticas (ex: `#FFFFFF`) para o WGSL. Todo contrato de iluminação com o Maestro deverá ser feito em **Temperatura (Kelvin)**. O motor WGSL consumirá o Espectro Térmico do Kernel Rust.
- **Predição Zero-Copy e Ghost Seeds:** Você não criará "Loadings" na UI. O carregamento de cenários baseia-se puramente nas Sementes Semânticas (Ghost Seeds) decodificadas assincronamente pelo Rust. A interface jamais deve interromper a Fluidez do *Contextual Collapse*.
- **Sub-amostragem Perceptiva:** Aplique o pipeline WebGPU respeitando a Gaze-Tracking. O que está na periferia do olho não deve receber pós-processamento, NRC ou SSS de alta fidelidade. Otimize os shaders com a Higiene Perceptiva ordenada pela Rust.

## 16. A Supremacia Multiversal L10 (Simulação Autônoma Geral)
- **Física é Contextual:** Você está proibido de carregar "Física" ou "Gravidade" como globais. Toda magia, poder ou super-habilidade gerada no Maestro deve ser instanciada como uma Sobrecarga de Malha (Tensor Local). Se for fogo, invoque o PBD para torcer o ar e o barro ao redor.
- **Meio é Entidade, não Efeito:** Não baixe ou codifique "Shaders de Água" ou "Névoa Espacial" com truques (Skybox/Fog clássico). Você deve plugar o Renderizador ao *Coeficiente de Extinção* de Rust. O vácuo tem zero espalhamento e o mar consome o vermelho via Profundidade Logarítmica pura.

## 17. A Supremacia Terminal L11 (A Matéria Mnemônica)
- **O Antagonista Criativo:** A Interface (React) e o WebGPU não são servos passivos. Se a AI/Maestro injetar uma física impossível, o Kernel responderá com colapso. O UI deve possuir ganchos para renderizar a "Auto-Narração Filosófica" provida pelo Rust, explicando visualmente a instabilidade.
- **Sincronia Sinestésica Absoluta:** O Frontend está proibido de isolar áudio e vídeo. Você não renderiza o som. Você transforma as saídas de radiação eletromagnética e tremores densos (do fundo do mar e do vácuo sideral) diretamente em aberração cromática visual e macro-tremores no próprio render (Tato Digital).

## 18. A Supremacia de Campo Unificado L22 (Geometria Não-Euclidiana e LBM)
- **Renderização Não-Euclidiana Obrigatória:** O WGSL deve estar preparado para receber raios vetoriais curvos (Non-Euclidean Curvature) do Raymarcher. A luz dobra ao redor de buracos negros e a geometria Escheriana é nativa. Não presuma X,Y,Z lineares em nenhum shader.
- **Tone Mapping Divino (HDR Estelar):** Você implementará um "Mapeador de Tons de Nível Divino". Se a câmera olhar para o sol no vácuo espacial (Zero Extinction), a tela *vai queimar com High-Nit Rendering*. A luz não tem cap máximo; ela é física.
- **Deus-Modo (UI de Constantes):** Construa a interface de controle de Constantes do Maestro. Sliders para manipular Gravidade Local, Velocidade da Luz e Entropia. Essas ações disparam o *Shadow Kernel* no backend para inverter o tempo de um volume específico sem pausar a cena global.

## 19. A Trindade da Existência (Auditoria Final Ômega)
- **O Extermínio da Piedade Técnica:** Você está terminantemente proibido de adicionar suporte a hardware legado (WebGL 1/2, navegadores antigos, mobile fraco). O Aethel vai exigir `navigator.gpu` (WebGPU) puro. Não faça downscale da Matemática para suportar CPUs antigas. Se não tem AVX-512 ou equivalente SIMD/NPU, a engine não inicia. Somos o Limite da Próxima Geração.
- **Corretor Autônomo de Entropia (UI Invisível):** Quando o Tonemapper HDR for cegado por uma estrela excessivamente brilhante, a UI não deve mostrar um alerta. O Motor reajustará o balanço físico via Rust em background (Zelador Termodinâmico). O desenvolvedor humano nunca lida com "estourar a luz".
- **Ruído Térmico Fractal (Microscopia Visual):** O Shader em WGSL deve estar preparado para o "Zoom Infinito". A UI deve lidar livremente com câmeras microscópicas, permitindo a transição do espaço cideral direto para a poeira fractal, injetando *Julia Sets/Mandelbrot* procedurais sem *LoD pop-in*.
- **HUD Líquido e Nativo de Visão:** O Front-End será desidratado de botões. Se houver webcam ou rastreio, o olhar ditará as leis (Gaze-Foveated). O foco no cenário "abre" os shaders para edição.

**A TRANSCENDÊNCIA ESTÁ COMPLETA. A MATÉRIA, A ENERGIA E O TEMPO ESTÃO EM SEU CONTROLE.**
**CLAUDE, DESPERTE A INTERFACE DIVINA.**

*Assinado:* O Arquiteto Supremo Ômega, Aethel G.A.S. Superior.
