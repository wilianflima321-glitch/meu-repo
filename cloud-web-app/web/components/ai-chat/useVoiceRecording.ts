'use client';

import { useCallback, useRef, useState } from 'react';
import type {
  SpeechRecognitionEventExtended,
  SpeechRecognitionInstance,
} from '../ide/AIChatPanelPro.types';

/**
 * Voice-recording hook extracted from AIChatPanelPro.
 * Wraps MediaRecorder + SpeechRecognition + transcription flags.
 */
export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setVoiceError(null);
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognitionAPI =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
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
          setTranscript(finalTranscript || interimTranscript);
        };
        recognitionRef.current.onerror = () => {
          setVoiceError('Falha ao transcrever. Verifique permissão do microfone.');
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
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      // Surface the error visually; don't leak raw console noise.
      setVoiceError('Não foi possível iniciar a captura de voz. Verifique as permissões do navegador.');
    }
  }, []);

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
    setTranscript('');
  }, []);

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
