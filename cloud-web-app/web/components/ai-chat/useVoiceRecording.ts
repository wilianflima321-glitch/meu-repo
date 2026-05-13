'use client';

import { useCallback, useRef, useState } from 'react';
import type {
  SpeechRecognitionEventExtended,
  SpeechRecognitionInstance,
} from '../ide/AIChatPanelPro.types';

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

/**
 * Voice-recording hook extracted from AIChatPanelPro.
 * Wraps MediaRecorder + SpeechRecognition + transcription flags.
 */
export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef('');

  const updateTranscript = useCallback((value: string) => {
    transcriptRef.current = value;
    setTranscript(value);
  }, []);

  const transcribeBlobFallback = useCallback(async (blob: Blob) => {
    if (blob.size <= 0) return;

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'voice-input.webm');
      formData.append('language', 'pt-BR');

      const response = await fetch('/api/ai/voice/transcribe', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as { text?: string; message?: string; error?: string } | null;

      if (response.ok && payload?.text) {
        updateTranscript(payload.text);
        return;
      }

      if (!transcriptRef.current.trim() && response.status !== 503) {
        setVoiceError(payload?.message || payload?.error || 'Nao foi possivel transcrever o audio.');
      }
    } catch {
      if (!transcriptRef.current.trim()) {
        setVoiceError('Nao foi possivel enviar o audio para transcricao segura.');
      }
    } finally {
      setIsTranscribing(false);
    }
  }, [updateTranscript]);

  const startRecording = useCallback(async () => {
    try {
      setVoiceError(null);
      const speechWindow = window as WindowWithSpeechRecognition;
      const SpeechRecognitionAPI =
        speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';
        recognitionRef.current.onresult = (event: SpeechRecognitionEventExtended) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }
          updateTranscript(finalTranscript || interimTranscript);
        };
        recognitionRef.current.onerror = () => {
          setVoiceError('Falha ao transcrever. Verifique a permissao do microfone.');
        };
        recognitionRef.current.start();
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        void transcribeBlobFallback(blob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      // Surface the error visually; don't leak raw console noise.
      recognitionRef.current?.stop();
      setVoiceError('Nao foi possivel iniciar a captura de voz. Verifique as permissoes do navegador.');
    }
  }, [transcribeBlobFallback, updateTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    updateTranscript('');
  }, [updateTranscript]);

  const clearVoiceError = useCallback(() => {
    setVoiceError(null);
  }, []);

  return {
    isRecording,
    audioBlob,
    transcript,
    isTranscribing,
    voiceError,
    startRecording,
    stopRecording,
    clearRecording,
    clearVoiceError,
  };
}

export type UseVoiceRecordingReturn = ReturnType<typeof useVoiceRecording>;
