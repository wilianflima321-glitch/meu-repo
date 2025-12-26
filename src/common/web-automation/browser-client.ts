/**
 * AETHEL ENGINE - Browser Automation Client (Node-safe, Playwright opcional)
 *
 * Objetivo:
 * - Fornecer automação web real quando Playwright estiver disponível.
 * - Não depender de mocks no runtime.
 * - Não fazer import estático de 'playwright' (mantém build verde sem a dependência).
 */

import { EventEmitter } from 'events';

export interface BrowserConfig {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

export interface NavigationResult {
  url: string;
  title: string;
  status: number;
  loadTime: number;
}

export interface FormField {
  selector: string;
  name: string;
  type: string;
  placeholder?: string;
  required: boolean;
}

export interface PageAnalysis {
  url: string;
  title: string;
  forms: Array<{
    selector: string;
    fields: FormField[];
    isLogin: boolean;
  }>;
  hasCaptcha: boolean;
}

export interface LoginResult {
  success: boolean;
  mfaRequired: boolean;
  error?: string;
}

export class BrowserClient extends EventEmitter {
  private config: Required<Omit<BrowserConfig, 'proxy' | 'userAgent'>> & Pick<BrowserConfig, 'proxy' | 'userAgent'>;
  private browser: any | null = null;
  private context: any | null = null;
  private page: any | null = null;

  constructor(config: BrowserConfig = {}) {
    super();
    this.config = {
      headless: config.headless ?? true,
      slowMo: config.slowMo ?? 50,
      timeout: config.timeout ?? 30_000,
      viewport: config.viewport ?? { width: 1920, height: 1080 },
      userAgent: config.userAgent,
      proxy: config.proxy,
    };
  }

  async initialize(): Promise<void> {
    if (this.page) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    let playwright: any;
    try {
      // Evita falha de build quando Playwright não está instalado.
      // Em runtime, se não existir, lançamos erro claro.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      playwright = require('playwright');
    } catch {
      throw new Error("Playwright não está instalado. Instale com: npm install playwright && npx playwright install");
    }

    const launchOptions: any = {
      headless: this.config.headless,
      slowMo: this.config.slowMo,
    };

    if (this.config.proxy) {
      launchOptions.proxy = {
        server: this.config.proxy.server,
        username: this.config.proxy.username,
        password: this.config.proxy.password,
      };
    }

    this.browser = await playwright.chromium.launch(launchOptions);

    const contextOptions: any = {
      viewport: this.config.viewport,
      userAgent: this.config.userAgent,
    };

    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout);

    this.emit('initialized');
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.emit('closed');
  }

  isInitialized(): boolean {
    return this.page !== null;
  }

  getCurrentUrl(): string | undefined {
    return this.page?.url?.();
  }

  private ensureReady(): void {
    if (!this.page) throw new Error('BrowserClient não inicializado. Chame initialize() primeiro.');
  }

  async navigateTo(url: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<NavigationResult> {
    this.ensureReady();

    const start = Date.now();
    const response = await this.page.goto(url, { waitUntil: options?.waitUntil ?? 'domcontentloaded' });

    return {
      url: this.page.url(),
      title: await this.page.title(),
      status: response?.status?.() ?? 0,
      loadTime: Date.now() - start,
    };
  }

  async click(selector: string): Promise<{ success: boolean; error?: string }> {
    this.ensureReady();
    try {
      await this.page.click(selector);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async type(selector: string, text: string, options?: { delay?: number }): Promise<{ success: boolean; error?: string }> {
    this.ensureReady();
    try {
      await this.page.fill(selector, '');
      await this.page.type(selector, text, { delay: options?.delay ?? 50 });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async fillForm(data: Record<string, string>): Promise<{ success: boolean; filled: string[]; failed: string[] }> {
    this.ensureReady();

    const filled: string[] = [];
    const failed: string[] = [];

    for (const [field, value] of Object.entries(data)) {
      const selectors = [
        `[name="${field}"]`,
        `#${field}`,
        `[id*="${field}"]`,
        `[placeholder*="${field}"]`,
      ];

      let ok = false;
      for (const selector of selectors) {
        try {
          const element = await this.page.$(selector);
          if (!element) continue;
          await this.page.fill(selector, value);
          ok = true;
          break;
        } catch {
          // tentar próximo
        }
      }

      if (ok) filled.push(field);
      else failed.push(field);
    }

    return { success: failed.length === 0, filled, failed };
  }

  async analyzePageWithAI(): Promise<PageAnalysis> {
    // Aqui NÃO fazemos “AI fake”: retornamos uma análise determinística baseada no DOM.
    this.ensureReady();

    const url = this.page.url();
    const title = await this.page.title();

    const forms = await this.page.$$('form');
    const parsedForms: PageAnalysis['forms'] = [];

    for (const form of forms) {
      const formSelector = await this.getSelector(form);
      const inputs = await form.$$('input, select, textarea');

      const fields: FormField[] = [];
      let hasPassword = false;
      let hasEmail = false;

      for (const input of inputs) {
        const name = (await input.getAttribute('name')) || '';
        const type = (await input.getAttribute('type')) || 'text';
        const placeholder = (await input.getAttribute('placeholder')) || undefined;
        const required = (await input.getAttribute('required')) !== null;

        if (type === 'password') hasPassword = true;
        if (type === 'email' || name.toLowerCase().includes('email')) hasEmail = true;

        if (type !== 'hidden' && type !== 'submit') {
          fields.push({
            selector: await this.getSelector(input),
            name,
            type,
            placeholder,
            required,
          });
        }
      }

      parsedForms.push({
        selector: formSelector,
        fields,
        isLogin: hasPassword && hasEmail,
      });
    }

    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      '.g-recaptcha',
      '.h-captcha',
      '#captcha',
      '[class*="captcha"]',
    ];

    let hasCaptcha = false;
    for (const selector of captchaSelectors) {
      if (await this.page.$(selector)) {
        hasCaptcha = true;
        break;
      }
    }

    return { url, title, forms: parsedForms, hasCaptcha };
  }

  async extractData(selectors: Record<string, string>): Promise<Record<string, string | null>> {
    this.ensureReady();

    const result: Record<string, string | null> = {};
    for (const [key, selector] of Object.entries(selectors || {})) {
      try {
        const value = await this.page.$eval(selector, (el: any) => {
          if (!el) return null;
          if (typeof el.value === 'string') return el.value;
          const text = typeof el.textContent === 'string' ? el.textContent : '';
          return text.trim() || null;
        });
        result[key] = value ?? null;
      } catch {
        result[key] = null;
      }
    }
    return result;
  }

  async screenshot(): Promise<{ dataBase64: string }>{
    this.ensureReady();
    const buffer = await this.page.screenshot({ fullPage: false });
    return { dataBase64: Buffer.from(buffer).toString('base64') };
  }

  async login(credentials: { email?: string; username?: string; password: string }): Promise<LoginResult> {
    this.ensureReady();

    const analysis = await this.analyzePageWithAI();
    const loginForm = analysis.forms.find(f => f.isLogin) || analysis.forms[0];

    if (!loginForm) {
      return { success: false, mfaRequired: false, error: 'Nenhum formulário encontrado na página.' };
    }

    const emailOrUser = credentials.email || credentials.username;

    // Tentativa simples: preencher primeiro campo de texto/email e primeiro password.
    const passwordField = loginForm.fields.find(f => f.type === 'password');
    const userField = loginForm.fields.find(f => f.type === 'email' || f.name.toLowerCase().includes('email') || f.name.toLowerCase().includes('user'));

    if (!passwordField) {
      return { success: false, mfaRequired: false, error: 'Campo de senha não encontrado.' };
    }

    if (emailOrUser && userField) {
      await this.page.fill(userField.selector, emailOrUser);
    }

    await this.page.fill(passwordField.selector, credentials.password);

    // Submeter via Enter
    await this.page.keyboard.press('Enter');

    return { success: true, mfaRequired: false };
  }

  private async getSelector(element: any): Promise<string> {
    const id = await element.getAttribute('id');
    if (id) return `#${id}`;

    const name = await element.getAttribute('name');
    if (name) return `[name="${name}"]`;

    const className = await element.getAttribute('class');
    if (className) {
      const first = String(className).split(' ')[0];
      if (first) return `.${first}`;
    }

    const tag = await element.evaluate((el: Element) => el.tagName.toLowerCase());
    return tag;
  }
}

export function createBrowserClient(config?: BrowserConfig): BrowserClient {
  return new BrowserClient(config);
}
