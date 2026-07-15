export const WEB_CONFIG = {
  // APIs de busca (configure no .env)
  tavily: process.env.TAVILY_API_KEY,
  serper: process.env.SERPER_API_KEY,
  
  // Limites
  maxResultsPerSearch: 10,
  maxContentLength: 50000,
  requestTimeout: 15000,
  
  // User agent para requests
  userAgent: 'AethelEngine-AI/1.0 (Web Research Bot)',
};
