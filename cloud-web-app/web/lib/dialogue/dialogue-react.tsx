import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { DialogueDisplayData, DialogueEvent } from './dialogue-contracts';
import { DialogueManager } from './dialogue-system';

const DialogueContext = createContext<DialogueManager | null>(null);

export function DialogueProvider({ children }: { children: React.ReactNode }) {
  const managerRef = useRef<DialogueManager>(new DialogueManager());

  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);

  return (
    <DialogueContext.Provider value={managerRef.current}>
      {children}
    </DialogueContext.Provider>
  );
}

export function useDialogue() {
  const manager = useContext(DialogueContext);
  if (!manager) {
    throw new Error('useDialogue must be used within a DialogueProvider');
  }

  const [displayData, setDisplayData] = useState<DialogueDisplayData | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const updateDisplay = () => {
      setDisplayData(manager.getDisplayData());
      setIsActive(manager.isActive());
    };

    manager.on('conversationStarted', updateDisplay);
    manager.on('conversationEnded', updateDisplay);
    manager.on('nodeDisplayed', updateDisplay);
    manager.on('textUpdated', updateDisplay);
    manager.on('choiceSelected', updateDisplay);

    return () => {
      manager.off('conversationStarted', updateDisplay);
      manager.off('conversationEnded', updateDisplay);
      manager.off('nodeDisplayed', updateDisplay);
      manager.off('textUpdated', updateDisplay);
      manager.off('choiceSelected', updateDisplay);
    };
  }, [manager]);

  const startConversation = useCallback((conversationId: string, startNode?: string) => {
    return manager.startConversation(conversationId, startNode);
  }, [manager]);

  const continueDialogue = useCallback(() => {
    manager.continue();
  }, [manager]);

  const selectChoice = useCallback((choiceId: string) => {
    manager.selectChoice(choiceId);
  }, [manager]);

  const endConversation = useCallback(() => {
    manager.endConversation();
  }, [manager]);

  return {
    manager,
    displayData,
    isActive,
    startConversation,
    continue: continueDialogue,
    selectChoice,
    endConversation,
    loadConversation: manager.loadConversation.bind(manager),
    setVariable: manager.getVariableStore().setVariable.bind(manager.getVariableStore()),
    getVariable: manager.getVariableStore().getVariable.bind(manager.getVariableStore()),
    setFlag: manager.getVariableStore().setFlag.bind(manager.getVariableStore()),
    hasFlag: manager.getVariableStore().hasFlag.bind(manager.getVariableStore()),
  };
}

export function useDialogueEvents(eventType: string, handler: (event: DialogueEvent) => void) {
  const { manager } = useDialogue();

  useEffect(() => {
    const wrappedHandler = ({ event }: { event: DialogueEvent }) => {
      if (event.type === eventType || eventType === '*') {
        handler(event);
      }
    };

    manager.on('dialogueEvent', wrappedHandler);

    return () => {
      manager.off('dialogueEvent', wrappedHandler);
    };
  }, [manager, eventType, handler]);
}
