/**
 * ═══════════════════════════════════════════════════════════════
 * AETHEL ENGINE - PONTO DE ENTRADA PRINCIPAL
 * ═══════════════════════════════════════════════════════════════
 * 
 * Execute: npx ts-node src/main.ts
 * 
 * Este é o ponto de entrada principal da Aethel Engine.
 * Inicializa todos os sistemas e expõe uma interface de comando.
 */

import 'dotenv/config';
import * as readline from 'readline';

// ═══════════════════════════════════════════════════════════════
// CORES PARA OUTPUT
// ═══════════════════════════════════════════════════════════════

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(type: 'success' | 'error' | 'info' | 'warn' | 'system', message: string) {
  const styles: Record<string, string> = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    info: `${colors.blue}ℹ️`,
    warn: `${colors.yellow}⚠️`,
    system: `${colors.cyan}🤖`,
  };
  console.log(`${styles[type]} ${message}${colors.reset}`);
}

// ═══════════════════════════════════════════════════════════════
// BANNER
// ═══════════════════════════════════════════════════════════════

function showBanner() {
  console.log(`
${colors.cyan}${colors.bold}
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║     █████╗ ███████╗████████╗██╗  ██╗███████╗██╗           ║
    ║    ██╔══██╗██╔════╝╚══██╔══╝██║  ██║██╔════╝██║           ║
    ║    ███████║█████╗     ██║   ███████║█████╗  ██║           ║
    ║    ██╔══██║██╔══╝     ██║   ██╔══██║██╔══╝  ██║           ║
    ║    ██║  ██║███████╗   ██║   ██║  ██║███████╗███████╗      ║
    ║    ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝      ║
    ║                                                           ║
    ║              🚀 SUPREME AI ENGINE v2.0.0 🚀                ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
${colors.reset}
  `);
}

// ═══════════════════════════════════════════════════════════════
// VERIFICAÇÃO DE AMBIENTE
// ═══════════════════════════════════════════════════════════════

interface SystemStatus {
  llm: { available: boolean; providers: string[] };
  trading: { available: boolean; exchanges: string[] };
  browser: { available: boolean };
  configured: boolean;
}

async function checkEnvironment(): Promise<SystemStatus> {
  const status: SystemStatus = {
    llm: { available: false, providers: [] },
    trading: { available: false, exchanges: [] },
    browser: { available: false },
    configured: false,
  };

  // Verificar LLM providers
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('xxx')) {
    status.llm.providers.push('openai');
  }
  if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('xxx')) {
    status.llm.providers.push('anthropic');
  }
  if (process.env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY.includes('xxx')) {
    status.llm.providers.push('google');
  }
  if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('xxx')) {
    status.llm.providers.push('groq');
  }
  status.llm.available = status.llm.providers.length > 0;

  // Verificar exchanges
  if (process.env.BINANCE_API_KEY && !process.env.BINANCE_API_KEY.includes('xxx')) {
    status.trading.exchanges.push('binance');
  }
  if (process.env.BYBIT_API_KEY && !process.env.BYBIT_API_KEY.includes('xxx')) {
    status.trading.exchanges.push('bybit');
  }
  status.trading.available = status.trading.exchanges.length > 0;

  // Verificar browser (playwright)
  try {
    await import('playwright');
    status.browser.available = true;
  } catch {
    status.browser.available = false;
  }

  status.configured = status.llm.available;
  return status;
}

function showStatus(status: SystemStatus) {
  console.log(`
${colors.bold}📊 System Status:${colors.reset}

  ${status.llm.available ? '✅' : '❌'} LLM Providers: ${status.llm.providers.length > 0 ? status.llm.providers.join(', ') : 'None configured'}
  ${status.trading.available ? '✅' : '⚠️'} Trading: ${status.trading.exchanges.length > 0 ? status.trading.exchanges.join(', ') : 'None configured'}
  ${status.browser.available ? '✅' : '⚠️'} Browser Automation: ${status.browser.available ? 'Available' : 'Not installed'}
  `);

  if (!status.configured) {
    console.log(`
${colors.yellow}⚠️  No LLM provider configured!${colors.reset}

To get started, create a .env file with at least one API key:

  ${colors.cyan}cp .env.example .env${colors.reset}
  
Then add your API key (e.g., OPENAI_API_KEY=sk-...)
    `);
  }
}

// ═══════════════════════════════════════════════════════════════
// CLIENTE LLM SIMPLES
// ═══════════════════════════════════════════════════════════════

let llmClient: any = null;

async function initLLM(): Promise<boolean> {
  try {
    const { RealLLMClient } = await import('./common/llm/real-llm-client');
    llmClient = new RealLLMClient();
    
    const providers = llmClient.getAvailableProviders();
    if (providers.length === 0) {
      return false;
    }
    
    log('success', `LLM initialized with providers: ${providers.join(', ')}`);
    return true;
  } catch (error: any) {
    log('error', `Failed to initialize LLM: ${error.message}`);
    return false;
  }
}

async function chat(message: string): Promise<string> {
  if (!llmClient) {
    return 'LLM not initialized. Please configure an API key in .env';
  }

  try {
    const result = await llmClient.smartComplete(
      [
        {
          role: 'system',
          content: `You are Aethel, a powerful AI assistant. You are helpful, concise, and knowledgeable.
Today's date is ${new Date().toLocaleDateString()}.
Respond in the user's language.`,
        },
        { role: 'user', content: message },
      ],
      { task: 'chat', budget: 'balanced' }
    );

    return result.content;
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

// ═══════════════════════════════════════════════════════════════
// COMANDOS DISPONÍVEIS
// ═══════════════════════════════════════════════════════════════

const commands: Record<string, { desc: string; fn: (args: string) => Promise<void> }> = {
  help: {
    desc: 'Show available commands',
    fn: async () => {
      console.log(`
${colors.bold}Available Commands:${colors.reset}

  ${colors.cyan}help${colors.reset}          - Show this help message
  ${colors.cyan}status${colors.reset}        - Show system status
  ${colors.cyan}chat <msg>${colors.reset}    - Chat with AI
  ${colors.cyan}test llm${colors.reset}      - Test LLM connection
  ${colors.cyan}test browser${colors.reset}  - Test browser automation
  ${colors.cyan}test exchange${colors.reset} - Test exchange connection
  ${colors.cyan}clear${colors.reset}         - Clear screen
  ${colors.cyan}exit${colors.reset}          - Exit the program

Or just type a message to chat with Aethel AI.
      `);
    },
  },

  status: {
    desc: 'Show system status',
    fn: async () => {
      const status = await checkEnvironment();
      showStatus(status);
    },
  },

  chat: {
    desc: 'Chat with AI',
    fn: async (message: string) => {
      if (!message) {
        log('warn', 'Please provide a message');
        return;
      }
      
      console.log(`${colors.magenta}🤔 Thinking...${colors.reset}`);
      const response = await chat(message);
      console.log(`\n${colors.green}🤖 Aethel:${colors.reset} ${response}\n`);
    },
  },

  test: {
    desc: 'Run tests',
    fn: async (what: string) => {
      switch (what) {
        case 'llm':
          await testLLM();
          break;
        case 'browser':
          await testBrowser();
          break;
        case 'exchange':
          await testExchange();
          break;
        default:
          log('warn', 'Usage: test <llm|browser|exchange>');
      }
    },
  },

  clear: {
    desc: 'Clear screen',
    fn: async () => {
      console.clear();
      showBanner();
    },
  },

  exit: {
    desc: 'Exit program',
    fn: async () => {
      log('info', 'Goodbye! 👋');
      process.exit(0);
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════

async function testLLM() {
  log('info', 'Testing LLM connection...');
  
  if (!llmClient) {
    log('error', 'LLM not initialized');
    return;
  }

  try {
    const result = await llmClient.smartComplete(
      [{ role: 'user', content: 'Say "Hello!" and nothing else.' }],
      { task: 'chat', budget: 'cheap' }
    );
    
    log('success', `Response: ${result.content}`);
    log('info', `Provider: ${result.provider}, Model: ${result.model}`);
    log('info', `Cost: $${result.cost.toFixed(6)}, Latency: ${result.latencyMs}ms`);
  } catch (error: any) {
    log('error', `Test failed: ${error.message}`);
  }
}

async function testBrowser() {
  log('info', 'Testing browser automation...');
  
  try {
    const { chromium } = await import('playwright');
    
    log('info', 'Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    log('info', 'Navigating to example.com...');
    await page.goto('https://example.com');
    
    const title = await page.title();
    log('success', `Page loaded: "${title}"`);
    
    await browser.close();
    log('success', 'Browser test passed!');
  } catch (error: any) {
    if (error.message.includes("Cannot find module")) {
      log('error', 'Playwright not installed. Run: npm install playwright && npx playwright install');
    } else {
      log('error', `Test failed: ${error.message}`);
    }
  }
}

async function testExchange() {
  log('info', 'Testing exchange connection...');
  
  try {
    const ccxt = await import('ccxt');
    
    const exchange = new ccxt.binance({ enableRateLimit: true });
    await exchange.loadMarkets();
    
    const ticker = await exchange.fetchTicker('BTC/USDT');
    log('success', `BTC/USDT: $${ticker.last?.toFixed(2)}`);
    log('success', 'Exchange test passed!');
  } catch (error: any) {
    if (error.message.includes("Cannot find module")) {
      log('error', 'CCXT not installed. Run: npm install ccxt');
    } else {
      log('error', `Test failed: ${error.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// REPL (Read-Eval-Print Loop)
// ═══════════════════════════════════════════════════════════════

async function startREPL() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question(`${colors.cyan}aethel>${colors.reset} `, async (input) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        prompt();
        return;
      }

      const [cmd, ...args] = trimmed.split(' ');
      const argString = args.join(' ');

      if (commands[cmd]) {
        await commands[cmd].fn(argString);
      } else {
        // Tratar como chat
        console.log(`${colors.magenta}🤔 Thinking...${colors.reset}`);
        const response = await chat(trimmed);
        console.log(`\n${colors.green}🤖 Aethel:${colors.reset} ${response}\n`);
      }

      prompt();
    });
  };

  prompt();
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  showBanner();
  
  log('system', 'Initializing Aethel Engine...');
  
  // Verificar ambiente
  const status = await checkEnvironment();
  showStatus(status);
  
  // Inicializar LLM se disponível
  if (status.llm.available) {
    await initLLM();
  }
  
  console.log(`${colors.bold}Type 'help' for commands or just start chatting!${colors.reset}\n`);
  
  // Iniciar REPL
  await startREPL();
}

// Executar
main().catch(console.error);
