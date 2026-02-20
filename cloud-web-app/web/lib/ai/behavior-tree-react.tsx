'use client';

import { useState, useRef, useEffect, useContext, createContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AIAgent, AIManager } from './behavior-tree-system';
import type { AgentConfig } from './behavior-tree-system';

const AIContext = createContext<AIManager | null>(null);

export function AIProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef<AIManager>(new AIManager());
  
  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);
  
  return (
    <AIContext.Provider value={managerRef.current}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const manager = useContext(AIContext);
  if (!manager) {
    throw new Error('useAI must be used within an AIProvider');
  }
  
  const [agents, setAgents] = useState<AIAgent[]>([]);
  
  useEffect(() => {
    const updateAgents = () => setAgents(manager.getAllAgents());
    
    manager.on('agentCreated', updateAgents);
    manager.on('agentRemoved', updateAgents);
    
    updateAgents();
    
    return () => {
      manager.off('agentCreated', updateAgents);
      manager.off('agentRemoved', updateAgents);
    };
  }, [manager]);
  
  const createAgent = useCallback((config: AgentConfig) => {
    return manager.createAgent(config);
  }, [manager]);
  
  const removeAgent = useCallback((id: string) => {
    manager.removeAgent(id);
  }, [manager]);
  
  return {
    manager,
    agents,
    createAgent,
    removeAgent,
    registerTarget: manager.registerWorldTarget.bind(manager),
    unregisterTarget: manager.unregisterWorldTarget.bind(manager),
  };
}

export function useAgent(agentId: string) {
  const { manager } = useAI();
  const [agent, setAgent] = useState<AIAgent | undefined>(manager.getAgent(agentId));
  
  useEffect(() => {
    const currentAgent = manager.getAgent(agentId);
    setAgent(currentAgent);
    
    if (currentAgent) {
      const onUpdate = () => setAgent(manager.getAgent(agentId));
      currentAgent.on('updated', onUpdate);
      currentAgent.on('stateChanged', onUpdate);
      currentAgent.on('damaged', onUpdate);
      
      return () => {
        currentAgent.off('updated', onUpdate);
        currentAgent.off('stateChanged', onUpdate);
        currentAgent.off('damaged', onUpdate);
      };
    }
  }, [manager, agentId]);
  
  return agent;
}
