# 📖 GUIA DE USO COMPLETO - AI IDE

**Versão**: 1.0.0  
**Data**: 2025-11-27  
**Público**: Desenvolvedores, Designers, Criadores de Conteúdo

---

## 🚀 INÍCIO RÁPIDO

### **1. Iniciar a Plataforma**

#### **Opção A: Python (Recomendado)**
```bash
cd examples/browser-ide-app
python3 -m http.server 8080
```

#### **Opção B: Node.js**
```bash
cd examples/browser-ide-app
npm install
node server.js
```

### **2. Abrir no Navegador**
```
http://localhost:8080/index.html
```

### **3. Primeira Vez?**
1. Você verá a landing page com opções de templates
2. Clique em "Criar um Jogo", "Criar um Filme" ou "Criar um App"
3. Escolha um template ou comece do zero
4. Pronto! Você está no editor

---

## 🎯 NAVEGAÇÃO

### **Navbar Global**
Presente em todas as páginas no topo:

| Item | Atalho | Função |
|------|--------|--------|
| Home | Alt+H | Volta para página inicial |
| Projects | Alt+P | Gerenciador de projetos |
| Editor | Alt+1 | Editor de código |
| Visual | Alt+2 | Editor visual de scripts |
| 3D View | Alt+3 | Viewport 3D |
| Assets | Alt+4 | Gerenciador de assets |

**Botões de Ação**:
- 💾 **Save** (Ctrl+S): Salva projeto atual
- ▶️ **Run**: Executa o projeto
- 🌙 **Theme**: Alterna entre light/dark
- 🔗 **Share**: Compartilha o projeto

### **Breadcrumbs**
Logo abaixo do navbar, mostra onde você está:
```
Home > Projects > My Game > Editor
```
Clique em qualquer item para voltar.

---

## 📁 GERENCIADOR DE PROJETOS

### **Criar Novo Projeto**

1. Clique em **"Projects"** no navbar
2. Clique em **"+ New Project"**
3. Escolha um template:
   - **Games**: Platformer, FPS, Racing, Puzzle, etc.
   - **Apps**: Dashboard, E-commerce, Portfolio, etc.
   - **Movies**: Sci-Fi, Action, Animation, etc.
4. Digite o nome do projeto
5. Clique em **"Create"**

### **Abrir Projeto Existente**

1. Vá para **"Projects"**
2. Veja lista de projetos recentes
3. Clique no projeto desejado
4. Escolha onde abrir:
   - **Editor**: Código
   - **Visual**: Scripts visuais
   - **3D**: Viewport 3D
   - **Assets**: Gerenciar assets

### **Deletar Projeto**

1. Vá para **"Projects"**
2. Passe o mouse sobre o projeto
3. Clique no ícone de lixeira
4. Confirme a exclusão

---

## 💻 EDITOR DE CÓDIGO

### **Interface**

```
┌─────────────────────────────────────────┐
│  Navbar (Home | Projects | Editor...)   │
├─────────────────────────────────────────┤
│  Breadcrumbs (Home > Projects > ...)    │
├──────┬──────────────────────────────────┤
│      │  Toolbar (Run | Format | AI...)  │
│ File ├──────────────────────────────────┤
│ Tree │                                   │
│      │     Monaco Editor                 │
│      │     (Código aqui)                 │
│      │                                   │
├──────┴──────────────────────────────────┤
│  Status Bar (Line 1, Col 1 | UTF-8...)  │
└─────────────────────────────────────────┘
```

### **Recursos**

#### **Syntax Highlighting**
- Suporte para: TypeScript, JavaScript, Python, Java, Go, Rust
- Cores automáticas baseadas na linguagem
- Detecção automática por extensão de arquivo

#### **Auto-Completion**
- Pressione `Ctrl+Space` para sugestões
- Funciona com variáveis, funções, classes
- Integrado com bibliotecas conhecidas

#### **Atalhos de Teclado**

| Atalho | Função |
|--------|--------|
| Ctrl+S | Salvar |
| Ctrl+Z | Desfazer |
| Ctrl+Y | Refazer |
| Ctrl+F | Buscar |
| Ctrl+H | Substituir |
| Ctrl+/ | Comentar linha |
| Alt+↑/↓ | Mover linha |
| Ctrl+D | Duplicar linha |
| F11 | Fullscreen |

#### **Toolbar**

- **▶️ Run**: Executa o código
- **🎨 Format**: Formata o código automaticamente
- **🤖 AI Help**: Pede ajuda da IA (em breve)
- **💾 Save**: Salva o arquivo
- **Language**: Seleciona a linguagem

### **File Explorer**

**Lateral esquerda**, mostra estrutura do projeto:

```
📁 My Game
  📁 src
    📄 main.js
    📄 game.js
    📄 player.js
  📁 assets
    🖼️ player.png
    🖼️ background.png
  📁 scenes
    📄 level1.json
  📄 index.html
  📄 style.css
```

**Ações**:
- **Clicar**: Abre arquivo
- **Botão "+"**: Novo arquivo
- **Botão "📁"**: Nova pasta
- **Botão "🔄"**: Atualizar

---

## 🎨 EDITOR VISUAL DE SCRIPTS

### **Interface**

```
┌─────────────────────────────────────────┐
│  Navbar + Breadcrumbs                   │
├──────┬──────────────────────────────────┤
│      │  Toolbar (Add Node | Run...)     │
│ Node ├──────────────────────────────────┤
│ List │                                   │
│      │     Canvas                        │
│ 🟦   │     (Arraste nodes aqui)          │
│ 🟩   │                                   │
│ 🟨   │                                   │
│      │                                   │
├──────┴──────────────────────────────────┤
│  Stats (Nodes: 5 | Connections: 3)      │
└─────────────────────────────────────────┘
```

### **Tipos de Nodes**

| Tipo | Cor | Função |
|------|-----|--------|
| Event | 🟦 Azul | Eventos (Start, Update, Click) |
| Action | 🟩 Verde | Ações (Move, Rotate, Scale) |
| Logic | 🟨 Amarelo | Lógica (If, Loop, Compare) |
| Data | 🟧 Laranja | Dados (Variable, Get, Set) |
| Math | 🟪 Roxo | Matemática (+, -, *, /) |

### **Como Usar**

1. **Adicionar Node**:
   - Clique em um node na sidebar
   - Ou arraste para o canvas

2. **Conectar Nodes**:
   - Clique no ponto de saída (direita)
   - Arraste até o ponto de entrada (esquerda)
   - Solte para conectar

3. **Configurar Node**:
   - Clique no node
   - Edite propriedades na sidebar

4. **Executar**:
   - Clique em **"▶️ Run"**
   - Veja resultado em tempo real

### **Exemplo: Movimento do Player**

```
[Start Event] → [Get Input] → [If Pressed] → [Move Player]
                                    ↓
                              [Play Animation]
```

---

## 🎮 VIEWPORT 3D

### **Interface**

```
┌─────────────────────────────────────────┐
│  Navbar + Breadcrumbs                   │
├──────┬──────────────────────────┬───────┤
│      │                          │       │
│ File │     3D Viewport          │ Insp. │
│ Tree │     (Cena 3D aqui)       │       │
│      │                          │ Props │
│      │                          │       │
├──────┴──────────────────────────┴───────┤
│  Toolbar (Add | Move | Rotate | Scale)  │
└─────────────────────────────────────────┘
```

### **Controles de Câmera**

| Ação | Controle |
|------|----------|
| Rotacionar | Botão esquerdo + arrastar |
| Pan | Botão direito + arrastar |
| Zoom | Scroll do mouse |
| Reset | Duplo clique |

### **Adicionar Objetos**

1. Clique em **"Add"** no toolbar
2. Escolha tipo:
   - **Cube**: Cubo
   - **Sphere**: Esfera
   - **Plane**: Plano
   - **Light**: Luz
   - **Camera**: Câmera
3. Objeto aparece na cena

### **Manipular Objetos**

1. **Selecionar**: Clique no objeto
2. **Mover**: Botão "Move" + arrastar
3. **Rotacionar**: Botão "Rotate" + arrastar
4. **Escalar**: Botão "Scale" + arrastar
5. **Deletar**: Tecla "Delete"

### **Inspector**

**Lateral direita**, mostra propriedades do objeto selecionado:

- **Transform**:
  - Position (X, Y, Z)
  - Rotation (X, Y, Z)
  - Scale (X, Y, Z)

- **Material**:
  - Color
  - Texture
  - Metalness
  - Roughness

- **Physics** (se habilitado):
  - Mass
  - Friction
  - Restitution

### **Física**

1. Selecione objeto
2. Clique em **"Enable Physics"** no inspector
3. Configure propriedades:
   - **Mass**: Peso do objeto
   - **Friction**: Atrito
   - **Restitution**: Elasticidade
4. Clique em **"▶️ Play"** para simular

---

## 🖼️ GERENCIADOR DE ASSETS

### **Interface**

```
┌─────────────────────────────────────────┐
│  Navbar + Breadcrumbs                   │
├──────┬──────────────────────────────────┤
│      │  Toolbar (Upload | View...)      │
│ Filt.├──────────────────────────────────┤
│      │                                   │
│ Type │     Grid de Assets               │
│ Tags │     [img] [img] [img]            │
│      │     [img] [img] [img]            │
│      │                                   │
└──────┴──────────────────────────────────┘
```

### **Upload de Assets**

1. Clique em **"📤 Upload"**
2. Selecione arquivos:
   - **Imagens**: PNG, JPG, GIF, SVG
   - **Modelos 3D**: FBX, OBJ, GLTF
   - **Áudio**: MP3, WAV, OGG
3. Aguarde upload
4. Assets aparecem no grid

### **Organizar Assets**

#### **Por Pastas**
- Clique em **"📁 New Folder"**
- Digite nome
- Arraste assets para pasta

#### **Por Tags**
- Selecione asset
- Clique em **"🏷️ Add Tag"**
- Digite tag (ex: "character", "background")
- Assets podem ter múltiplas tags

#### **Por Tipo**
Use filtros na sidebar:
- **All**: Todos
- **Images**: Imagens
- **3D Models**: Modelos 3D
- **Audio**: Áudio
- **Scripts**: Scripts

### **Buscar Assets**

1. Use barra de busca no topo
2. Digite nome ou tag
3. Resultados aparecem em tempo real

### **Preview**

1. Clique em um asset
2. Preview aparece em modal:
   - **Imagens**: Visualização completa
   - **3D**: Visualizador 3D interativo
   - **Áudio**: Player de áudio
3. Clique fora para fechar

### **Usar Assets**

#### **No Editor 3D**
1. Arraste asset do gerenciador
2. Solte no viewport 3D
3. Objeto é criado automaticamente

#### **No Código**
1. Clique com botão direito no asset
2. Selecione **"Copy Path"**
3. Cole no código:
```javascript
const texture = loadTexture('assets/player.png');
```

---

## 🎨 SISTEMA DE TEMAS

### **Alternar Tema**

**Método 1**: Clique no botão 🌙/☀️ no navbar

**Método 2**: Atalho de teclado (em breve)

### **Temas Disponíveis**

#### **Dark Theme** (Padrão)
- Background: #1e1e1e
- Text: #ffffff
- Accent: #007acc
- Ideal para: Trabalho noturno, redução de fadiga ocular

#### **Light Theme**
- Background: #ffffff
- Text: #000000
- Accent: #0066cc
- Ideal para: Trabalho diurno, apresentações

### **Persistência**

O tema escolhido é salvo automaticamente e mantido entre sessões.

---

## 🔔 NOTIFICAÇÕES (Toasts)

### **Tipos**

| Tipo | Cor | Uso |
|------|-----|-----|
| Success | 🟢 Verde | Ação bem-sucedida |
| Error | 🔴 Vermelho | Erro ocorreu |
| Warning | 🟡 Amarelo | Aviso importante |
| Info | 🔵 Azul | Informação geral |

### **Exemplos**

- **Success**: "Project saved successfully!"
- **Error**: "Failed to load file"
- **Warning**: "Unsaved changes"
- **Info**: "New update available"

### **Comportamento**

- Aparecem no canto superior direito
- Desaparecem automaticamente após 3 segundos
- Podem ser fechadas manualmente (clique no X)
- Múltiplas notificações formam fila

---

## 🤖 ASSISTENTE DE IA

### **Status Atual**: ⚠️ Em Desenvolvimento

A funcionalidade de IA está preparada mas aguarda conexão com API real.

### **Funcionalidades Planejadas**

#### **1. Ajuda com Código**
```
Você: "Como criar um player que pula?"
IA: "Aqui está um exemplo:
     function jump() {
       player.velocity.y = 10;
     }"
```

#### **2. Geração de Código**
```
Você: "// Create enemy AI"
IA: [Gera código completo de IA de inimigo]
```

#### **3. Análise de Código**
```
IA: "Detectei 3 possíveis melhorias:
     1. Otimizar loop na linha 45
     2. Adicionar error handling
     3. Usar const ao invés de let"
```

#### **4. Sugestões Contextuais**
```
IA: "Baseado no seu projeto, sugiro:
     • Adicionar física aos objetos
     • Implementar sistema de pontuação
     • Criar menu principal"
```

### **Como Usar (Quando Disponível)**

1. **No Editor**: Clique em **"🤖 AI Help"**
2. **Digite sua pergunta** ou **selecione código**
3. **Aguarde resposta** da IA
4. **Aceite ou rejeite** sugestões

---

## ⌨️ ATALHOS DE TECLADO

### **Globais**

| Atalho | Função |
|--------|--------|
| Ctrl+S | Salvar projeto |
| Ctrl+O | Abrir projeto |
| Ctrl+N | Novo projeto |
| Alt+H | Ir para Home |
| Alt+P | Ir para Projects |
| Alt+1 | Ir para Editor |
| Alt+2 | Ir para Visual Scripting |
| Alt+3 | Ir para 3D Viewport |
| Alt+4 | Ir para Assets |

### **Editor de Código**

| Atalho | Função |
|--------|--------|
| Ctrl+Z | Desfazer |
| Ctrl+Y | Refazer |
| Ctrl+F | Buscar |
| Ctrl+H | Substituir |
| Ctrl+/ | Comentar |
| Alt+↑/↓ | Mover linha |
| Ctrl+D | Duplicar linha |
| Ctrl+Space | Auto-complete |

### **3D Viewport**

| Atalho | Função |
|--------|--------|
| Delete | Deletar objeto |
| Ctrl+D | Duplicar objeto |
| W | Modo Move |
| E | Modo Rotate |
| R | Modo Scale |
| F | Focar objeto |

---

## 💾 SALVAR E EXPORTAR

### **Salvar Projeto**

**Automático**:
- Salva a cada 30 segundos
- Salva ao trocar de página

**Manual**:
- Clique em **💾 Save** no navbar
- Ou pressione **Ctrl+S**

### **Exportar Projeto**

1. Vá para **"Projects"**
2. Clique no projeto
3. Clique em **"⬇️ Export"**
4. Escolha formato:
   - **JSON**: Projeto completo
   - **ZIP**: Projeto + assets
   - **HTML**: Página standalone
5. Arquivo é baixado

### **Importar Projeto**

1. Vá para **"Projects"**
2. Clique em **"📤 Import"**
3. Selecione arquivo (.json ou .zip)
4. Projeto é adicionado à lista

---

## 🔗 COMPARTILHAR

### **Gerar Link**

1. Abra o projeto
2. Clique em **🔗 Share** no navbar
3. Link é copiado para clipboard
4. Compartilhe com outros

### **Colaboração** (Em Breve)

- Edição em tempo real
- Chat integrado
- Controle de versão
- Permissões de acesso

---

## 🐛 SOLUÇÃO DE PROBLEMAS

### **Página não carrega**

**Problema**: Página em branco ou erro 404

**Solução**:
1. Verifique se servidor está rodando
2. Confirme URL: `http://localhost:8080/index.html`
3. Limpe cache do navegador (Ctrl+Shift+R)
4. Tente outro navegador

### **Scripts não carregam**

**Problema**: Funcionalidades não funcionam

**Solução**:
1. Abra console do navegador (F12)
2. Verifique erros em vermelho
3. Confirme que todos os arquivos .js existem
4. Recarregue página (F5)

### **Editor não aparece**

**Problema**: Monaco Editor não carrega

**Solução**:
1. Verifique conexão com internet (CDN)
2. Aguarde alguns segundos
3. Recarregue página
4. Verifique console para erros

### **3D Viewport preto**

**Problema**: Viewport 3D não mostra nada

**Solução**:
1. Verifique se WebGL está habilitado
2. Atualize drivers de vídeo
3. Tente outro navegador
4. Adicione uma luz à cena

### **Assets não aparecem**

**Problema**: Assets não carregam

**Solução**:
1. Verifique formato do arquivo
2. Confirme tamanho (max 10MB)
3. Tente fazer upload novamente
4. Limpe cache

---

## 📞 SUPORTE

### **Documentação**

- **README.md**: Visão geral
- **FLUXO_IA_COMPLETO.md**: Arquitetura de IA
- **STATUS_FINAL_COMPLETO.md**: Status do projeto
- **VALIDACAO_FINAL.md**: Validação completa

### **Debug**

Abra console do navegador (F12) e execute:

```javascript
// Ver estado do IntegrationHub
console.log(window.IntegrationHub.state);

// Ver componentes registrados
console.log(window.IntegrationHub.components);

// Ver contexto de IA
console.log(globalContext.getContextForAI());

// Testar toast
window.ToastSystem.show('Teste', 'success');
```

### **Logs**

Todos os sistemas logam no console:
- ✅ Sucesso: Verde
- ❌ Erro: Vermelho
- ⚠️ Aviso: Amarelo
- ℹ️ Info: Azul

---

## 🎓 TUTORIAIS

### **Tutorial 1: Criar Jogo Simples**

1. **Criar Projeto**
   - Vá para Projects
   - Clique em "New Project"
   - Escolha "2D Platformer"
   - Nome: "My First Game"

2. **Editar Código**
   - Abra no Editor
   - Veja código do template
   - Modifique velocidade do player
   - Salve (Ctrl+S)

3. **Adicionar Assets**
   - Vá para Assets
   - Upload imagem do player
   - Upload imagem de fundo

4. **Testar**
   - Clique em "Run"
   - Jogue!

### **Tutorial 2: Criar Cena 3D**

1. **Criar Projeto**
   - New Project > 3D Scene

2. **Adicionar Objetos**
   - Abra 3D Viewport
   - Add > Cube
   - Add > Sphere
   - Add > Light

3. **Posicionar**
   - Selecione Cube
   - Move para (0, 0, 0)
   - Selecione Sphere
   - Move para (2, 1, 0)

4. **Adicionar Física**
   - Selecione Sphere
   - Enable Physics
   - Mass: 1
   - Play para simular

### **Tutorial 3: Visual Script**

1. **Criar Script**
   - Abra Visual Scripting
   - Add Node > Event > Start

2. **Adicionar Lógica**
   - Add Node > Action > Move
   - Conecte Start → Move

3. **Configurar**
   - Clique em Move
   - Set speed: 5
   - Set direction: (1, 0, 0)

4. **Testar**
   - Clique em Run
   - Objeto se move!

---

## 🎯 DICAS E TRUQUES

### **Produtividade**

1. **Use Atalhos**: Memorize Ctrl+S, Alt+1-4
2. **File Explorer**: Organize arquivos em pastas
3. **Templates**: Use templates para começar rápido
4. **Auto-save**: Confie no auto-save, mas salve manualmente antes de testar

### **Código**

1. **Format**: Use "Format" para código limpo
2. **Comments**: Comente código complexo
3. **Variables**: Use nomes descritivos
4. **Functions**: Divida código em funções pequenas

### **3D**

1. **Lighting**: Sempre adicione luz à cena
2. **Camera**: Posicione câmera antes de adicionar objetos
3. **Physics**: Teste física com objetos simples primeiro
4. **Performance**: Limite número de objetos (< 100)

### **Assets**

1. **Organize**: Use pastas e tags
2. **Nomes**: Use nomes descritivos
3. **Tamanho**: Otimize imagens (< 1MB)
4. **Formatos**: Use PNG para transparência, JPG para fotos

---

## 📊 LIMITES E RECOMENDAÇÕES

### **Performance**

| Item | Limite Recomendado |
|------|-------------------|
| Objetos 3D | < 100 |
| Polígonos por objeto | < 10,000 |
| Tamanho de imagem | < 2MB |
| Tamanho de modelo 3D | < 10MB |
| Linhas de código | < 5,000 |
| Nodes visuais | < 50 |

### **Navegadores Suportados**

| Navegador | Versão Mínima |
|-----------|---------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

### **Requisitos de Sistema**

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| RAM | 4GB | 8GB+ |
| GPU | Integrada | Dedicada |
| CPU | Dual-core | Quad-core+ |
| Resolução | 1280x720 | 1920x1080+ |

---

## 🎉 CONCLUSÃO

Você agora sabe como usar todas as funcionalidades da plataforma!

**Próximos Passos**:
1. Explore os templates
2. Crie seu primeiro projeto
3. Experimente todas as ferramentas
4. Compartilhe suas criações

**Divirta-se criando! 🚀**

---

**Versão**: 1.0.0  
**Última Atualização**: 2025-11-27  
**Feedback**: Abra uma issue no GitHub
