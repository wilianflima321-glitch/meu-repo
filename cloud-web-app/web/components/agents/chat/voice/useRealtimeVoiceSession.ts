'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LiveConnectionStatus } from '../live/LiveSessionHUD'
import type { WaveformSpeaker } from '../live/LiveVoiceWaveform'

interface UseRealtimeVoiceSessionOptions {
  isEnabled: boolean
  modelId: string
  onMessageReceived?: (text: string) => void
}

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: any
  webkitSpeechRecognition?: any
}

export function useRealtimeVoiceSession({
  isEnabled,
  modelId,
  onMessageReceived,
}: UseRealtimeVoiceSessionOptions) {
  const [status, setStatus] = useState<LiveConnectionStatus>('disconnected')
  const [speaker, setSpeaker] = useState<WaveformSpeaker>('idle')
  const [transcript, setTranscript] = useState<string>('')
  const [amplitude, setAmplitude] = useState<number>(0.05)
  const [isMuted, setIsMuted] = useState<boolean>(false)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const stopAudioTracks = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
  }, [])

  const cleanup = useCallback(() => {
    setStatus('disconnected')
    setSpeaker('idle')
    setTranscript('')
    setAmplitude(0.05)

    stopAudioTracks()

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    dataChannelRef.current = null

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close()
    }
    audioContextRef.current = null
    analyserRef.current = null

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch { /* ignore */ }
      recognitionRef.current = null
    }

    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
      mockIntervalRef.current = null
    }

    if (speechUtteranceRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    speechUtteranceRef.current = null
  }, [stopAudioTracks])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next
        })
      }
      return next
    })
  }, [])

  const simulateAIResponse = useCallback((userPrompt: string) => {
    setStatus('connected')
    setSpeaker('idle')
    
    // Choose dynamic response based on query
    let reply = 'I am scanning the active engine viewport context. Everything looks fully aligned.'
    const lower = userPrompt.toLowerCase()
    if (lower.includes('optimize') || lower.includes('collision')) {
      reply = 'I found the collision trigger node. I can optimize the bounding box calculation for better physics execution.'
    } else if (lower.includes('sound') || lower.includes('audio')) {
      reply = 'I will link a new sound cue node so that the SFX bus plays a click sound on interaction.'
    } else if (lower.includes('compile') || lower.includes('validate')) {
      reply = 'Analyzing compilation graph. Generating sandbox receipts for release validation.'
    }

    // Speech synthesis response
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(reply)
      speechUtteranceRef.current = utterance
      utterance.lang = document.documentElement.lang || navigator.language || 'en-US'
      
      utterance.onstart = () => {
        setStatus('connected')
        setSpeaker('ai')
        setTranscript(reply)
      }
      utterance.onend = () => {
        setSpeaker('idle')
        setTranscript('')
        onMessageReceived?.(reply)
      }
      utterance.onerror = () => {
        setSpeaker('idle')
        setTranscript('')
      }
      window.speechSynthesis.speak(utterance)
    } else {
      // Mock visual response without text-to-speech
      setStatus('connected')
      setSpeaker('ai')
      setTranscript(reply)
      setTimeout(() => {
        setSpeaker('idle')
        setTranscript('')
        onMessageReceived?.(reply)
      }, 3000)
    }
  }, [onMessageReceived])

  // Realtime Voice VAD and AI loopback simulation
  const runMockSession = useCallback((stream: MediaStream) => {
    setStatus('connected')
    setSpeaker('idle')

    const speechWindow = window as WindowWithSpeechRecognition
    const SpeechRecognitionAPI = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI()
      recognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = document.documentElement.lang || navigator.language || 'en-US'

      recognition.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }

        const activeText = finalTranscript || interimTranscript
        if (activeText.trim()) {
          setSpeaker('user')
          setTranscript(activeText)
          
          // Interrupt simulated AI if it was speaking (barge-in)
          if (speechUtteranceRef.current && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel()
          }

          // Debounce / VAD: wait for user silence to trigger response
          if (mockIntervalRef.current) clearTimeout(mockIntervalRef.current)
          mockIntervalRef.current = setTimeout(() => {
            simulateAIResponse(activeText)
          }, 1400)
        }
      }

      recognition.onerror = () => { /* ignore */ }
      recognition.onend = () => {
        // Keep speech recognition alive during session
        if (status === 'connected' && recognitionRef.current) {
          try { recognition.start() } catch { /* ignore */ }
        }
      }
      recognition.start()
    } else {
      // Predefined VAD ticker fallback if speech API is unavailable
      let tickCount = 0
      const mockResponses = [
        'Analyzing blueprint variables...',
        'Compiling the visual script graph.',
        'I am aware of the active OnDamage node context.',
        'Would you like me to connect a sound trigger here?',
      ]
      mockIntervalRef.current = setInterval(() => {
        tickCount++
        if (tickCount % 6 === 0) {
          setSpeaker('user')
          setTranscript('Can you optimize this collision event?')
          setTimeout(() => {
            simulateAIResponse('Can you optimize this collision event?')
          }, 1500)
        }
      }, 3000)
    }
  }, [status, simulateAIResponse])

  const startSession = useCallback(async () => {
    setStatus('connecting')
    try {
      // 1. Fetch token from our Next.js API route
      const response = await fetch('/api/ai/voice/realtime-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch realtime session credentials')
      }

      const { client_secret } = await response.json()
      const token = client_secret?.value

      // 2. Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      // 3. Setup Audio Analyser for Waveform
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 256
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Start amplitude loop
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      const updateAmplitude = () => {
        if (!analyserRef.current || isMuted) {
          setAmplitude(0.02)
          return
        }
        analyserRef.current.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        const avg = sum / bufferLength
        // scale to 0-1 range with smooth decay
        const normalized = Math.min(1, avg / 140)
        setAmplitude(normalized > 0.05 ? normalized : 0.05)
        requestAnimationFrame(updateAmplitude)
      }
      requestAnimationFrame(updateAmplitude)

      // 4. Check if token is mock or if we should run mock fallback
      if (!token || token.startsWith('mock_')) {
        runMockSession(stream)
        return
      }

      // 5. Connect Real WebRTC Session (OpenAI Realtime format)
      const pc = new RTCPeerConnection()
      peerConnectionRef.current = pc

      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0]
      }

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc

      dc.onopen = () => {
        setStatus('connected')
      }

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          // Handle transcripts, tool executions, and VAD barge-in events
          if (event.type === 'response.audio_transcript.delta') {
            setSpeaker('ai')
            setTranscript(event.delta || '')
          }
          if (event.type === 'input_audio_buffer.speech_started') {
            // User interrupted AI speaking: barge-in
            setSpeaker('user')
            audioEl.pause() // stop AI audio stream immediately
          }
          if (event.type === 'response.text.done') {
            onMessageReceived?.(event.text || '')
          }
        } catch { /* ignore */ }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/sdp',
        },
      })

      if (!sdpResponse.ok) {
        throw new Error('WebRTC SDP Handshake failed')
      }

      const answerSdp = await sdpResponse.text()
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }))

    } catch (e) {
      // Fallback to fully simulated high-fidelity mock session if error occurred (e.g. CORS or network block)
      if (localStreamRef.current) {
        runMockSession(localStreamRef.current)
      } else {
        setStatus('disconnected')
      }
    }
  }, [isMuted, onMessageReceived, runMockSession])

  // Session lifecycle
  useEffect(() => {
    if (isEnabled) {
      void startSession()
    } else {
      cleanup()
    }
    return () => {
      cleanup()
    }
  }, [isEnabled, startSession, cleanup])

  return {
    status,
    speaker,
    transcript,
    amplitude,
    isMuted,
    toggleMute,
    endSession: cleanup,
  }
}
