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
      OPENROUTER_API_KEY?: string;
      ANTHROPIC_API_KEY?: string;
      GOOGLE_API_KEY?: string;
      GROQ_API_KEY?: string;
      
      // Stripe
      STRIPE_SECRET_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      STRIPE_PUBLISHABLE_KEY?: string;
      
      // Storage — Cloudflare R2 (default production backend, zero egress fees)
      R2_ACCOUNT_ID?: string;
      R2_ACCESS_KEY_ID?: string;
      R2_SECRET_ACCESS_KEY?: string;
      R2_BUCKET_NAME?: string;
      R2_BUCKET_BACKUPS?: string;
      R2_BUCKET_ASSETS?: string;
      R2_BUCKET_EXPORTS?: string;
      /** Optional dedicated bucket for F.1 GameSave CAS blobs; falls back to R2_BUCKET_NAME + player-saves/ prefix. */
      R2_BUCKET_PLAYER_SAVES?: string;
      /** Force-disable Prisma GameSave cloud marketing even when DB round-trip works. */
      AETHEL_GAMESAVE_CLOUD_DISABLED?: string;

      // Storage — self-hosted S3-compatible (local dev / MinIO)
      S3_ENDPOINT?: string;
      S3_ACCESS_KEY?: string;
      S3_SECRET_KEY?: string;
      S3_BUCKET?: string;
      S3_REGION?: string;

      // Storage — legacy/back-compat AWS S3 (not recommended: pays egress)
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
