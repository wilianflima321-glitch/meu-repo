/**
 * Environment Variables Type Definitions
 * 
 * Define todas as variáveis de ambiente usadas no projeto
 */

declare module '*.css';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Database
      DATABASE_URL: string;
      
      // Auth
      JWT_SECRET: string;
      NEXTAUTH_SECRET?: string;
      NEXTAUTH_URL?: string;
      
      // AI Providers
      OPENAI_API_KEY?: string;
      ANTHROPIC_API_KEY?: string;
      GOOGLE_API_KEY?: string;
      GROQ_API_KEY?: string;
      
      // Stripe
      STRIPE_SECRET_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      STRIPE_PUBLISHABLE_KEY?: string;
      
      // Storage
      AWS_ACCESS_KEY_ID?: string;
      AWS_SECRET_ACCESS_KEY?: string;
      AWS_S3_BUCKET?: string;
      AWS_REGION?: string;
      
      // App
      NODE_ENV: 'development' | 'production' | 'test';
      NEXT_PUBLIC_APP_URL?: string;
      
      // Testing
      TEST_URL?: string;
    }
  }
}

export {};
