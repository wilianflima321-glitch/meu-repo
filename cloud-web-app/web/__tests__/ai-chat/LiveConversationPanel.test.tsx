/**
 * Tests for ai-chat/LiveConversationPanel.
 *
 * Covers:
 *  - Status text switches between "IA trabalhando" and "Aguardando".
 *  - Interrupt button only visible while working, and fires onInterrupt.
 *  - Submitting the composer fires onSendMessage with the trimmed text and clears input.
 *  - Empty / whitespace-only submissions do not fire onSendMessage.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveConversationPanel } from '../../components/ai-chat/LiveConversationPanel';

describe('LiveConversationPanel', () => {
  it('shows "IA trabalhando" when isWorking=true', () => {
    render(<LiveConversationPanel isWorking onInterrupt={() => {}} onSendMessage={() => {}} />);
    expect(screen.getByText('IA trabalhando')).toBeInTheDocument();
  });

  it('shows "Aguardando" when isWorking=false and hides interrupt', () => {
    render(<LiveConversationPanel isWorking={false} onInterrupt={() => {}} onSendMessage={() => {}} />);
    expect(screen.getByText('Aguardando')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /interromper trabalho da ia/i })).toBeNull();
  });

  it('fires onInterrupt when the interrupt button is clicked', () => {
    const onInterrupt = vi.fn();
    render(<LiveConversationPanel isWorking onInterrupt={onInterrupt} onSendMessage={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /interromper trabalho da ia/i }));
    expect(onInterrupt).toHaveBeenCalledTimes(1);
  });

  it('fires onSendMessage with trimmed value when the form is submitted', () => {
    const onSendMessage = vi.fn();
    render(
      <LiveConversationPanel isWorking={false} onInterrupt={() => {}} onSendMessage={onSendMessage} />,
    );
    const textarea = screen.getByLabelText(/mensagem de conversação ao vivo/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '  olá mundo  ' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar mensagem ao vivo/i }));
    expect(onSendMessage).toHaveBeenCalledWith('olá mundo');
    expect(textarea.value).toBe('');
  });

  it('does not fire onSendMessage when the input is empty/whitespace', () => {
    const onSendMessage = vi.fn();
    render(
      <LiveConversationPanel isWorking={false} onInterrupt={() => {}} onSendMessage={onSendMessage} />,
    );
    const textarea = screen.getByLabelText(/mensagem de conversação ao vivo/i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar mensagem ao vivo/i }));
    expect(onSendMessage).not.toHaveBeenCalled();
  });
});
