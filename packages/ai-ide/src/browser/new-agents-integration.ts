/**
 * Integration module for new AI agents
 * 
 * Registers all new agents in the Inversify container
 */

import { ContainerModule } from '@theia/core/shared/inversify';
import { ArchitectAgentNew } from './architect-agent-new';
import { CoderAgentNew } from './coder-agent-new';
import { ResearchAgent } from './research-agent';
import { AIDreamSystem } from './ai-dream-system';
import { CharacterMemoryBank } from './character-memory-bank';

export const NewAgentsModule = new ContainerModule(bind => {
    // Register new agents
    bind(ArchitectAgentNew).toSelf().inSingletonScope();
    bind(CoderAgentNew).toSelf().inSingletonScope();
    bind(ResearchAgent).toSelf().inSingletonScope();
    
    // Register support systems
    bind(AIDreamSystem).toSelf().inSingletonScope();
    bind(CharacterMemoryBank).toSelf().inSingletonScope();
    
    console.log('[NewAgents] ✅ All new agents registered');
});

// Export for use in frontend-module.ts
export default NewAgentsModule;
