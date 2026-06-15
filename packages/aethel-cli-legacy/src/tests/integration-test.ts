/**
 * ═══════════════════════════════════════════════════════════════
 * INTEGRATION TEST - TESTE DAS INTEGRAÇÕES REAIS
 * ═══════════════════════════════════════════════════════════════
 * 
 * Execute: npx ts-node src/tests/integration-test.ts
 * 
 * Requer: .env configurado com pelo menos 1 API key de LLM
 */

import * as dotenv from 'dotenv';
dotenv.config();

// ═══════════════════════════════════════════════════════════════
// CORES PARA OUTPUT
// ═══════════════════════════════════════════════════════════════

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(type: 'success' | 'error' | 'info' | 'warn', message: string) {
  const icons = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    info: `${colors.blue}ℹ️`,
    warn: `${colors.yellow}⚠️`,
  };
  console.log(`${icons[type]} ${message}${colors.reset}`);
}

// ═══════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════

async function testLLMClient() {
  console.log('\n📋 Testing LLM Client...\n');
  
  try {
    const { RealLLMClient } = await import('../common/llm/real-llm-client');
    const client = new RealLLMClient();
    
    const providers = client.getAvailableProviders();
    
    if (providers.length === 0) {
      log('warn', 'No LLM providers configured. Add API keys to .env');
      log('info', 'Required: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, or GROQ_API_KEY');
      return false;
    }
    
    log('success', `Available providers: ${providers.join(', ')}`);
    
    // Testar uma chamada simples
    const result = await client.smartComplete(
      [{ role: 'user', content: 'Say "Hello Aethel!" and nothing else.' }],
      { task: 'chat', budget: 'cheap' }
    );
    
    log('success', `Response: ${result.content}`);
    log('info', `Provider: ${result.provider}, Model: ${result.model}`);
    log('info', `Tokens: ${result.usage.totalTokens}, Cost: $${result.cost.toFixed(6)}, Latency: ${result.latencyMs}ms`);
    
    return true;
  } catch (error: any) {
    log('error', `LLM test failed: ${error.message}`);
    return false;
  }
}

async function testExchangeClient() {
  console.log('\n📋 Testing Exchange Client...\n');
  
  try {
    // Verificar se CCXT está instalado
    const ccxt = await import('ccxt');
    log('success', `CCXT installed - ${Object.keys(ccxt.exchanges).length} exchanges available`);
    
    // Testar conexão com Binance (sem autenticação, apenas market data)
    const exchange = new ccxt.binance({
      enableRateLimit: true,
    });
    
    log('info', 'Connecting to Binance (public API)...');
    await exchange.loadMarkets();
    log('success', `Connected - ${Object.keys(exchange.markets).length} markets loaded`);
    
    // Obter ticker de BTC
    const ticker = await exchange.fetchTicker('BTC/USDT');
    log('success', `BTC/USDT: $${ticker.last?.toFixed(2)} (24h vol: ${ticker.baseVolume?.toFixed(2)} BTC)`);
    
    // Verificar se temos credenciais para testnet
    if (process.env.BINANCE_API_KEY) {
      log('info', 'Binance API key found - authenticated features available');
    } else {
      log('warn', 'No Binance API key - only public data available');
    }
    
    return true;
  } catch (error: any) {
    if (error.message.includes("Cannot find module 'ccxt'")) {
      log('error', 'CCXT not installed. Run: npm install ccxt');
    } else {
      log('error', `Exchange test failed: ${error.message}`);
    }
    return false;
  }
}

async function testBrowserClient() {
  console.log('\n📋 Testing Browser Client...\n');
  
  try {
    // Verificar se Playwright está instalado
    const playwright = await import('playwright');
    log('success', 'Playwright installed');
    
    // Tentar inicializar browser
    log('info', 'Launching browser...');
    const browser = await playwright.chromium.launch({ headless: true });
    log('success', 'Browser launched');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navegar para uma página de teste
    log('info', 'Navigating to example.com...');
    await page.goto('https://example.com');
    
    const title = await page.title();
    log('success', `Page loaded: "${title}"`);
    
    // Verificar conteúdo
    const heading = await page.textContent('h1');
    log('success', `Found heading: "${heading}"`);
    
    await browser.close();
    log('success', 'Browser closed successfully');
    
    return true;
  } catch (error: any) {
    if (error.message.includes("Cannot find module 'playwright'")) {
      log('error', 'Playwright not installed. Run: npm install playwright && npx playwright install');
    } else if (error.message.includes('Executable doesn\'t exist')) {
      log('error', 'Browser not installed. Run: npx playwright install chromium');
    } else {
      log('error', `Browser test failed: ${error.message}`);
    }
    return false;
  }
}

async function testEnvironmentVariables() {
  console.log('\n📋 Checking Environment Variables...\n');
  
  const required = [
    { key: 'OPENAI_API_KEY', desc: 'OpenAI API' },
    { key: 'ANTHROPIC_API_KEY', desc: 'Anthropic API' },
    { key: 'GOOGLE_API_KEY', desc: 'Google Gemini API' },
    { key: 'GROQ_API_KEY', desc: 'Groq API' },
    { key: 'BINANCE_API_KEY', desc: 'Binance Exchange' },
    { key: 'VERCEL_TOKEN', desc: 'Vercel Deploy' },
    { key: 'GITHUB_TOKEN', desc: 'GitHub API' },
  ];
  
  let hasAnyLLM = false;
  
  for (const { key, desc } of required) {
    const value = process.env[key];
    if (value && value !== 'xxx' && !value.startsWith('sk-xxx')) {
      log('success', `${key} configured (${desc})`);
      if (key.includes('API_KEY') && !key.includes('BINANCE')) {
        hasAnyLLM = true;
      }
    } else {
      log('warn', `${key} not set (${desc})`);
    }
  }
  
  if (!hasAnyLLM) {
    log('error', 'No LLM provider configured! At least one is required.');
    log('info', 'Add to .env: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, or GROQ_API_KEY');
  }
  
  return hasAnyLLM;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          AETHEL ENGINE - INTEGRATION TESTS                    ║
╚═══════════════════════════════════════════════════════════════╝
`);
  
  const results = {
    env: false,
    llm: false,
    exchange: false,
    browser: false,
  };
  
  // 1. Verificar variáveis de ambiente
  results.env = await testEnvironmentVariables();
  
  // 2. Testar LLM
  results.llm = await testLLMClient();
  
  // 3. Testar Exchange
  results.exchange = await testExchangeClient();
  
  // 4. Testar Browser
  results.browser = await testBrowserClient();
  
  // Sumário
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                      TEST SUMMARY                             ║
╠═══════════════════════════════════════════════════════════════╣
║  Environment Variables: ${results.env ? '✅ PASS' : '❌ FAIL'}                           ║
║  LLM Client:            ${results.llm ? '✅ PASS' : '❌ FAIL'}                           ║
║  Exchange Client:       ${results.exchange ? '✅ PASS' : '❌ FAIL'}                           ║
║  Browser Client:        ${results.browser ? '✅ PASS' : '❌ FAIL'}                           ║
╚═══════════════════════════════════════════════════════════════╝
`);
  
  const allPass = Object.values(results).every(r => r);
  
  if (allPass) {
    console.log(`${colors.green}🎉 All tests passed! System is ready.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed. Check the errors above.${colors.reset}`);
    console.log(`
${colors.blue}Quick Fix Commands:${colors.reset}
  npm install                    # Install all dependencies
  npx playwright install         # Install browser
  cp .env.example .env           # Create .env file
  # Then add your API keys to .env
`);
  }
  
  process.exit(allPass ? 0 : 1);
}

main().catch(console.error);
