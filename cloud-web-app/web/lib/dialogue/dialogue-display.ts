import type { DialogueConversation, DialogueDisplayData, DialogueNode, DialogueState } from './dialogue-contracts';
import type { ConditionEvaluator, DialogueTextProcessor } from './dialogue-runtime-parts';

export function createDialogueDisplayData(input: {
  isTyping: boolean;
  displayedText: string;
  state: DialogueState;
  node: DialogueNode;
  conversation: DialogueConversation;
  conditionEvaluator: ConditionEvaluator;
  textProcessor: DialogueTextProcessor;
}): DialogueDisplayData {
  const speaker = input.node.speaker ? input.conversation.characters[input.node.speaker] : null;
  let choices: DialogueDisplayData['choices'] = [];

  if (input.node.type === 'choice' && input.node.choices) {
    choices = input.node.choices.map((choice) => {
      const available = !choice.conditions || input.conditionEvaluator.evaluateAll(choice.conditions);
      const visitedKey = `${input.state.currentConversation}.${input.node.id}.${choice.id}`;

      return {
        id: choice.id,
        text: input.textProcessor.processText(choice.text, choice.textKey),
        available,
        visited: input.state.visitedChoices.has(visitedKey),
      };
    });
  }

  return {
    speaker,
    text: input.displayedText,
    expression: input.node.expression || 'default',
    voiceClip: input.node.voiceClip || null,
    choices,
    canContinue: !input.isTyping && (input.node.type !== 'choice' || choices.length === 0),
    isComplete: !input.isTyping,
  };
}
