export const CacheKeys = {
  // Usuários
  user: (id: string) => `user:${id}`,
  userSession: (id: string) => `session:${id}`,
  userProjects: (id: string) => `user:${id}:projects`,

  // Projetos
  project: (id: string) => `project:${id}`,
  projectFiles: (id: string) => `project:${id}:files`,
  projectAssets: (id: string) => `project:${id}:assets`,

  // AI
  aiResponse: (hash: string) => `ai:response:${hash}`,
  aiEmbedding: (id: string) => `ai:embedding:${id}`,

  // Rate limiting
  rateLimit: (key: string) => `ratelimit:${key}`,

  // Marketplace
  marketplaceItem: (id: string) => `marketplace:${id}`,
  marketplaceFeatured: () => `marketplace:featured`,

  // Analytics
  analytics: (type: string, date: string) => `analytics:${type}:${date}`,

  // Config
  featureFlags: () => `config:feature_flags`,
  systemSettings: () => `config:system`,
};
