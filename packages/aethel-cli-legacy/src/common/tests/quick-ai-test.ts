/**
 * ═══════════════════════════════════════════════════════════════
 * QUICK TEST - LLM & AI SYSTEM VERIFICATION
 * ═══════════════════════════════════════════════════════════════
 * 
 * Script para verificar rapidamente se os sistemas de IA estão
 * funcionando corretamente.
 * 
 * COMO EXECUTAR:
 * 1. Configure as variáveis de ambiente no .env
 * 2. Execute: npx ts-node src/common/tests/quick-ai-test.ts
 */

// Este script roda via `ts-node` em ambiente CommonJS.
// Usar `require` evita problemas de resolução ESM (extensão obrigatória) no Node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function log(category: string, message: string, status: '✅' | '❌' | '⚠️' | '🔄' | 'ℹ️' = 'ℹ️') {
  console.log(`${status} [${category}] ${message}`);
}

function hr() {
  console.log('\n' + '═'.repeat(60) + '\n');
}

function hasAnyLLMKey(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.DEEPSEEK_API_KEY
  );
}

// ═══════════════════════════════════════════════════════════════
// TEST: ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════

async function testEnvironment(): Promise<boolean> {
  log('ENV', 'Verificando variáveis de ambiente...', '🔄');
  
  const providers = {
    'OPENAI_API_KEY': !!process.env.OPENAI_API_KEY,
    'ANTHROPIC_API_KEY': !!process.env.ANTHROPIC_API_KEY,
    'GOOGLE_API_KEY': !!process.env.GOOGLE_API_KEY,
    'GROQ_API_KEY': !!process.env.GROQ_API_KEY,
    'DEEPSEEK_API_KEY': !!process.env.DEEPSEEK_API_KEY,
  };
  
  const available = Object.entries(providers).filter(([_, v]) => v);
  const missing = Object.entries(providers).filter(([_, v]) => !v);
  
  available.forEach(([k]) => log('ENV', `${k}: Configurado`, '✅'));
  missing.forEach(([k]) => log('ENV', `${k}: Não configurado`, '⚠️'));
  
  if (available.length === 0) {
    log('ENV', 'Nenhuma API key configurada (LLM/Trading serão pulados)', '⚠️');
    log('ENV', 'Configure pelo menos uma API key no .env para habilitar LLM/Trading', 'ℹ️');
    return true;
  }
  
  log('ENV', `${available.length} provider(s) disponível(is)`, '✅');
  return true;
}

// ═══════════════════════════════════════════════════════════════
// TEST: LLM CLIENT
// ═══════════════════════════════════════════════════════════════

async function testLLMClient(): Promise<boolean> {
  log('LLM', 'Testando RealLLMClient...', '🔄');
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getLLMClient } = require('../llm/real-llm-client');
    const client = getLLMClient();
    
    const providers = client.getAvailableProviders();
    log('LLM', `Providers disponíveis: ${providers.join(', ')}`, '✅');
    
    if (providers.length === 0) {
      log('LLM', 'Nenhum provider disponível', '❌');
      return false;
    }
    
    // Testar uma chamada simples
    log('LLM', 'Testando chamada de API...', '🔄');
    
    const result = await client.smartComplete([
      { role: 'user', content: 'Responda apenas: OK' }
    ], { task: 'chat', budget: 'cheap' });
    
    log('LLM', `Resposta: "${result.content.substring(0, 50)}..."`, '✅');
    log('LLM', `Modelo: ${result.model}`, 'ℹ️');
    log('LLM', `Custo: $${result.cost.toFixed(6)}`, 'ℹ️');
    log('LLM', `Tokens: ${result.usage.promptTokens} in / ${result.usage.completionTokens} out`, 'ℹ️');
    
    return true;
    
  } catch (error: any) {
    log('LLM', `Erro: ${error.message}`, '❌');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST: LLM BRIDGE
// ═══════════════════════════════════════════════════════════════

async function testLLMBridge(): Promise<boolean> {
  log('BRIDGE', 'Testando LLM Integration Bridge...', '🔄');
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getLLMBridge } = require('../llm/llm-integration-bridge');
    const bridge = getLLMBridge();
    
    if (!bridge.isReady()) {
      log('BRIDGE', 'Bridge não está pronta (sem providers)', '⚠️');
      return false;
    }
    
    // Testar interpretação de comando
    log('BRIDGE', 'Testando interpretCommand...', '🔄');
    
    const command = await bridge.interpretCommand('Navegue para google.com');
    
    log('BRIDGE', `Intent: ${command.intent}`, '✅');
    log('BRIDGE', `Action: ${command.action}`, 'ℹ️');
    log('BRIDGE', `Response: ${command.response}`, 'ℹ️');
    
    return true;
    
  } catch (error: any) {
    log('BRIDGE', `Erro: ${error.message}`, '❌');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST: MISSION PLANNER
// ═══════════════════════════════════════════════════════════════

async function testMissionPlanner(): Promise<boolean> {
  log('MISSION', 'Testando AI Mission Planner...', '🔄');
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AIPlanner } = require('../mission-system/mission-executor');

    const planner = new AIPlanner({ useLLM: hasAnyLLMKey() });
    
    log('MISSION', 'Gerando plano de missão...', '🔄');
    
    const plan = await planner.planMission(
      'Inicializar um repositório Git local e fazer o primeiro commit',
      { repoPath: '.', message: 'chore: initial commit' }
    );
    
    log('MISSION', `Tasks geradas: ${plan.tasks.length}`, '✅');
    log('MISSION', `Duração estimada: ${plan.estimatedDuration}ms`, 'ℹ️');
    
    plan.tasks.slice(0, 3).forEach((task: { name: string; type: string }, i: number) => {
      log('MISSION', `  ${i + 1}. ${task.name} (${task.type})`, 'ℹ️');
    });
    
    if (plan.tasks.length > 3) {
      log('MISSION', `  ... e mais ${plan.tasks.length - 3} tasks`, 'ℹ️');
    }
    
    return true;
    
  } catch (error: any) {
    log('MISSION', `Erro: ${error.message}`, '❌');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST: TRADING AI
// ═══════════════════════════════════════════════════════════════

async function testTradingAI(): Promise<boolean> {
  log('TRADING', 'Testando Trading AI com LLM...', '🔄');
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getLLMBridge } = require('../llm/llm-integration-bridge');
    const bridge = getLLMBridge();
    
    if (!bridge.isReady()) {
      log('TRADING', 'LLM não disponível para análise', '⚠️');
      return false;
    }
    
    log('TRADING', 'Analisando BTC/USDT...', '🔄');
    
    const analysis = await bridge.analyzeTrade({
      symbol: 'BTC/USDT',
      timeframe: '1h',
      indicators: {
        RSI: 45,
        MACD: { histogram: 0.002, signal: 'neutral' },
        EMA_20: 67500,
        EMA_50: 67000,
        Trend: 'sideways',
      },
      patterns: ['Doji', 'Support Test'],
      currentPrice: 67250,
    });
    
    log('TRADING', `Recomendação: ${analysis.recommendation.toUpperCase()}`, '✅');
    log('TRADING', `Confiança: ${analysis.confidence}%`, 'ℹ️');
    log('TRADING', `Raciocínio: ${analysis.reasoning.substring(0, 100)}...`, 'ℹ️');
    
    if (analysis.entry) log('TRADING', `Entry: $${analysis.entry}`, 'ℹ️');
    if (analysis.stopLoss) log('TRADING', `Stop Loss: $${analysis.stopLoss}`, 'ℹ️');
    if (analysis.takeProfit) log('TRADING', `Take Profit: $${analysis.takeProfit}`, 'ℹ️');
    
    return true;
    
  } catch (error: any) {
    log('TRADING', `Erro: ${error.message}`, '❌');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST: MEDIA TOOLKIT (VIDEO/IMAGE/AUDIO)
// ═══════════════════════════════════════════════════════════════

async function testMediaToolkit(): Promise<boolean> {
  log('MEDIA', 'Testando MediaToolkit (vídeo/imagem/áudio)...', '🔄');

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getMediaToolkit } = require('../media/media-toolkit');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isBrowserRuntime } = require('../media/theia-adapters');
    const toolkit = getMediaToolkit();

    const videoProject = toolkit.createVideoProject('Demo Video', 1920, 1080, 24);
    if (!videoProject.tracks.length) throw new Error('Video project sem tracks');
    toolkit.addVideoClip(videoProject.tracks[0], 'C:/tmp/demo.mp4', 0, 24 * 5);

    const imageDoc = toolkit.createImageDocument('Demo Image', 1024, 768);
    if (!imageDoc.layers.length) throw new Error('Image document sem layers');
    toolkit.addImageEffect(imageDoc.layers[0], 'brightness', { amount: 0.1 });

    const audioProject = toolkit.createAudioProject('Demo Audio', 48000, 120);
    if (!audioProject.tracks.length) throw new Error('Audio project sem tracks');
    toolkit.addAudioEffect(audioProject.tracks[0], 'compressor', { threshold: -18, ratio: 3 });

    log('MEDIA', `Video tracks: ${videoProject.tracks.length}`, '✅');
    log('MEDIA', `Image layers: ${imageDoc.layers.length}`, '✅');
    log('MEDIA', `Audio tracks: ${audioProject.tracks.length}`, '✅');
    log('MEDIA', `Exemplo duração: ${toolkit.formatDuration(240, 24)}`, 'ℹ️');
    log('MEDIA', `Browser runtime: ${isBrowserRuntime() ? 'sim' : 'não'}`, 'ℹ️');

    return true;
  } catch (error: any) {
    log('MEDIA', `Erro: ${error.message}`, '❌');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    AETHEL ENGINE                              ║
║                 AI SYSTEM QUICK TEST                          ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const results: Record<string, boolean> = {};
  
  // 1. Test Environment
  hr();
  results['Environment'] = await testEnvironment();

  const canRunLLM = hasAnyLLMKey();

  // 2. Test Media Toolkit (independe de API key)
  hr();
  results['Media Toolkit'] = await testMediaToolkit();

  // 3. Test Mission Planner (roda sem LLM via heurística)
  hr();
  results['Mission Planner'] = await testMissionPlanner();

  if (canRunLLM) {
    // 4. Test LLM Client
    hr();
    results['LLM Client'] = await testLLMClient();

    // 5. Test LLM Bridge
    hr();
    results['LLM Bridge'] = await testLLMBridge();

    // 6. Test Trading AI
    hr();
    results['Trading AI'] = await testTradingAI();
  } else {
    log('ENV', 'Sem API keys: pulando testes LLM/Trading (somente)', '⚠️');
  }
  
  // Summary
  hr();
  console.log('📊 RESUMO DOS TESTES:\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, result] of Object.entries(results)) {
    console.log(`   ${result ? '✅' : '❌'} ${name}`);
    if (result) passed++;
    else failed++;
  }
  
  console.log(`\n   Total: ${passed}/${passed + failed} testes passaram`);
  
  if (failed === 0) {
    console.log('\n🎉 TODOS OS SISTEMAS DE IA ESTÃO FUNCIONAIS!\n');
  } else {
    console.log('\n⚠️  Alguns sistemas precisam de atenção.\n');
  }
}

// Executar
main().catch(console.error);
