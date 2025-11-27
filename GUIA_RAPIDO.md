# 🚀 Guia Rápido - AI IDE

## Início em 3 Passos

### 1️⃣ Iniciar Servidor

```bash
cd examples/browser-ide-app
python3 server.py
```

### 2️⃣ Abrir no Navegador

```
http://localhost:3000
```

### 3️⃣ Criar Seu Primeiro Projeto

1. Clique em **"+ New Project"**
2. Escolha um template (ex: "2D Platformer")
3. Digite um nome
4. Clique em **"Create Project"**

**Pronto!** Você está criando seu primeiro jogo! 🎮

---

## 🎯 Componentes Principais

### 📂 Project Manager
**URL**: `http://localhost:3000/project-manager.html`

- Gerenciar projetos
- 20+ templates prontos
- Filtrar por categoria e dificuldade
- Buscar templates

### 💻 Code Editor
**URL**: `http://localhost:3000/monaco-editor.html`  
**Atalho**: `Alt + 1`

- Editor profissional (VS Code engine)
- Syntax highlighting
- Auto-complete
- Multi-file support

### 🎨 Visual Scripting
**URL**: `http://localhost:3000/visual-scripting.html`  
**Atalho**: `Alt + 2`

- Drag-and-drop nodes
- 20+ node types
- Blueprint-style
- Real-time preview

### 🌍 3D Viewport
**URL**: `http://localhost:3000/3d-viewport.html`  
**Atalho**: `Alt + 3`

- Editor 3D completo
- Physics engine (Cannon.js)
- Camera controls
- Object manipulation

### 📦 Asset Manager
**URL**: `http://localhost:3000/asset-manager.html`  
**Atalho**: `Alt + 4`

- Upload/download assets
- Preview (images, 3D, audio)
- Organize com folders e tags
- AI auto-categorization

---

## ⌨️ Atalhos de Teclado

### Globais
- `Ctrl + K` - Command Palette
- `Ctrl + S` - Save Project
- `Ctrl + O` - Open Project
- `Ctrl + N` - New Project
- `F1` - Help

### Navegação
- `Alt + 1` - Code Editor
- `Alt + 2` - Visual Scripting
- `Alt + 3` - 3D Viewport
- `Alt + 4` - Asset Manager

### Editor
- `Ctrl + F` - Find
- `Ctrl + H` - Replace
- `Ctrl + /` - Comment
- `Ctrl + D` - Duplicate Line

---

## 🤖 Agentes IA

### 1. 🏗️ Architect Agent
**Especialidade**: Arquitetura de software

**Exemplos**:
- "Como estruturar uma aplicação microservices?"
- "Qual padrão de design usar para notificações?"
- "Como garantir escalabilidade?"

### 2. 💻 Coder Agent
**Especialidade**: Geração de código

**Exemplos**:
- "Crie uma função TypeScript para validar email"
- "Implemente um rate limiter em JavaScript"
- "Escreva testes unitários para esta função"

### 3. 🔍 Research Agent
**Especialidade**: Pesquisa

**Exemplos**:
- "React 19 features"
- "Melhores práticas de segurança API"
- "Como funciona o algoritmo Raft?"

### 4. 🎨 AI Dream System
**Especialidade**: Criação criativa

**Features**:
- Geração iterativa até qualidade perfeita (85%+)
- Validação automática
- Verificação de consistência

### 5. 🧠 Character Memory Bank
**Especialidade**: Memória persistente

**Features**:
- Armazenamento de perfis detalhados
- Consistência visual 99%+
- Busca por similaridade
- Versionamento

---

## 📚 Templates Disponíveis

### 🎮 Jogos (10 templates)
1. **2D Platformer** - Mario-style (Beginner, 30 min)
2. **3D FPS** - Shooter simples (Intermediate, 2h)
3. **Racing Game** - Corrida com física (Intermediate, 2h)
4. **Puzzle Game** - Match-3 (Beginner, 1h)
5. **Tower Defense** - Estratégia (Intermediate, 3h)
6. **Top-Down RPG** - Zelda-style (Advanced, 5h)
7. **Endless Runner** - Temple Run style (Beginner, 1h)
8. **Physics Puzzle** - Angry Birds style (Intermediate, 2h)
9. **Rhythm Game** - Guitar Hero style (Intermediate, 2h)
10. **Survival Game** - Minecraft-style (Advanced, 5h)

### 📱 Apps (5 templates)
1. **Analytics Dashboard** - Charts e métricas (Intermediate, 2h)
2. **E-commerce Store** - Loja online (Advanced, 5h)
3. **Social Media Feed** - Posts e likes (Intermediate, 3h)
4. **Portfolio Website** - Showcase pessoal (Beginner, 1h)
5. **Admin Panel** - CRUD operations (Advanced, 4h)

### 🎬 Filmes/Animações (5 templates)
1. **Sci-Fi Scene** - Cena futurista (Advanced, 4h)
2. **Action Sequence** - Explosões (Advanced, 5h)
3. **Character Animation** - Walk cycle (Intermediate, 3h)
4. **Environment Showcase** - Landscape (Intermediate, 3h)
5. **VFX Demo** - Efeitos visuais (Advanced, 4h)

---

## 🛠️ Comandos Úteis

### Servidor
```bash
# Iniciar servidor Python
python3 server.py

# Iniciar servidor Node.js (alternativo)
npm start

# Parar servidor
Ctrl + C
```

### Projeto
```bash
# Salvar projeto
Ctrl + S

# Exportar projeto
Menu → Export Project

# Importar projeto
Menu → Import Project
```

### Desenvolvimento
```bash
# Abrir console do navegador
F12

# Recarregar página
Ctrl + R

# Limpar cache
Ctrl + Shift + R
```

---

## 🐛 Troubleshooting

### Porta 3000 já em uso?
```bash
# Usar porta diferente
python3 -m http.server 3001
```

### Servidor não inicia?
```bash
# Verificar Python
python3 --version  # Deve ser 3.6+

# Testar manualmente
cd examples/browser-ide-app
python3 -m http.server 3000
```

### Página não carrega?
1. Verificar se servidor está rodando
2. Abrir http://localhost:3000 no navegador
3. Verificar console do navegador (F12)
4. Limpar cache (Ctrl + Shift + R)

### Assets não aparecem?
1. Verificar se arquivo foi enviado
2. Verificar formato suportado
3. Verificar tamanho do arquivo (< 10MB)
4. Limpar localStorage e tentar novamente

---

## 💡 Dicas e Truques

### Produtividade
1. **Use atalhos de teclado** - 3x mais rápido
2. **Command Palette (Ctrl+K)** - Acesso rápido a tudo
3. **Templates** - Comece com template, não do zero
4. **AI Agents** - Deixe a IA fazer o trabalho pesado

### Organização
1. **Nomeie bem seus projetos** - Fácil de encontrar depois
2. **Use tags** - Organize assets por categoria
3. **Salve frequentemente** - Ctrl+S é seu amigo
4. **Exporte backups** - Segurança nunca é demais

### Performance
1. **Feche abas não usadas** - Economiza memória
2. **Limpe assets não usados** - Projeto mais leve
3. **Use preview antes de importar** - Evita assets ruins
4. **Otimize texturas** - Comprima antes de importar

### Aprendizado
1. **Comece com templates beginner** - Aprenda o básico
2. **Experimente todos os agentes IA** - Descubra o poder
3. **Veja os exemplos** - Aprenda com código pronto
4. **Leia a documentação** - Está tudo documentado

---

## 📊 Estatísticas

### Tempo Médio
- **Primeiro projeto**: 5-10 minutos
- **Jogo simples**: 30 minutos - 2 horas
- **App completo**: 2-5 horas
- **Projeto avançado**: 5-20 horas

### Produtividade com IA
- **Sem IA**: 1x velocidade
- **Com 1 agente**: 2-3x velocidade
- **Com 5 agentes**: 5-10x velocidade
- **Com templates**: 10-20x velocidade

---

## 🎯 Próximos Passos

### Depois de Criar Seu Primeiro Projeto
1. ✅ Explore outros templates
2. ✅ Experimente todos os agentes IA
3. ✅ Customize seu projeto
4. ✅ Adicione seus próprios assets
5. ✅ Compartilhe com amigos

### Para Aprender Mais
1. 📚 Leia `VALIDACAO_IDE_FUNCIONAL.md`
2. 📚 Veja `GUIA_USO_COMPLETO.md`
3. 📚 Explore `ARQUITETURA_PROPOSTA.md`
4. 📚 Confira `PLANO_SUPERAR_UNREAL.md`

---

## 🆘 Suporte

### Documentação
- `README.md` - Visão geral
- `GUIA_USO_COMPLETO.md` - Guia detalhado
- `VALIDACAO_IDE_FUNCIONAL.md` - Validação técnica
- `TRABALHO_CONTINUADO_2025-11-27.md` - Últimas atualizações

### Comunidade
- GitHub Issues - Reporte bugs
- Discussions - Tire dúvidas
- Wiki - Documentação colaborativa

---

## 🎉 Comece Agora!

```bash
cd examples/browser-ide-app
python3 server.py
```

Abra `http://localhost:3000` e crie seu primeiro projeto! 🚀

---

**Versão**: 1.1.0  
**Data**: 2025-11-27  
**Status**: ✅ Pronto para Uso

🚀 **BOA SORTE E DIVIRTA-SE CRIANDO!** 🚀
