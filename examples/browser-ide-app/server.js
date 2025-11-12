const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// API endpoint para simular agentes
app.post('/api/agent/:type', async (req, res) => {
    const { type } = req.params;
    const { input } = req.body;

    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    let response = {
        agentId: type,
        content: '',
        metadata: {}
    };

    switch(type) {
        case 'architect':
            response.content = 'Architect Agent response for: ' + input;
            response.metadata = {
                tokensUsed: 150,
                model: 'gpt-4',
                duration: 1200
            };
            break;
        case 'coder':
            response.content = '```typescript\n// Code generated for: ' + input + '\n```';
            response.metadata = {
                tokensUsed: 180,
                model: 'gpt-4',
                language: 'typescript',
                duration: 800
            };
            break;
        case 'research':
            response.content = 'Research results for: ' + input;
            response.metadata = {
                tokensUsed: 200,
                sources: 6,
                confidence: 0.95,
                duration: 2100
            };
            break;
        default:
            response.content = 'Agent response for: ' + input;
    }

    res.json(response);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        agents: ['architect', 'coder', 'research', 'ai-dream', 'character-memory'],
        timestamp: new Date().toISOString()
    });
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         🤖 AI IDE - Sistema Multi-Agente                 ║
║                                                          ║
║  Status: ✅ RUNNING                                       ║
║  URL: http://localhost:${PORT}                            ║
║  Agents: 5 (Architect, Coder, Research, AI Dream, Memory)║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

📚 Agentes Disponíveis:
  ✓ Architect Agent - Arquitetura e Design Patterns
  ✓ Coder Agent - Geração de Código
  ✓ Research Agent - Pesquisa Inteligente
  ✓ AI Dream System - Geração Criativa
  ✓ Character Memory Bank - Memória Persistente

🚀 Abra seu navegador em: http://localhost:${PORT}
`);
});
