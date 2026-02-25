/** WebRTC transport helpers for multiplayer runtime. */

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  dataChannelConfig?: RTCDataChannelInit;
}

export class WebRTCConnection {
  private connection: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private remoteId: string;
  private onMessageCallback: ((data: ArrayBuffer | string) => void) | null = null;
  private onConnectedCallback: (() => void) | null = null;
  private onDisconnectedCallback: (() => void) | null = null;
  
  constructor(remoteId: string, config: WebRTCConfig, isInitiator: boolean = false) {
    this.remoteId = remoteId;
    
    this.connection = new RTCPeerConnection({
      iceServers: config.iceServers,
    });
    
    this.connection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send candidate to signaling server
        this.onIceCandidate(event.candidate);
      }
    };
    
    this.connection.onconnectionstatechange = () => {
      if (this.connection.connectionState === 'connected') {
        this.onConnectedCallback?.();
      } else if (this.connection.connectionState === 'disconnected') {
        this.onDisconnectedCallback?.();
      }
    };
    
    if (isInitiator) {
      // Create data channel
      this.dataChannel = this.connection.createDataChannel('data', config.dataChannelConfig);
      this.setupDataChannel(this.dataChannel);
    } else {
      this.connection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }
  }
  
  private setupDataChannel(channel: RTCDataChannel): void {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      console.log('Data channel opened');
    };
    
    channel.onmessage = (event) => {
      this.onMessageCallback?.(event.data);
    };
    
    channel.onclose = () => {
      console.log('Data channel closed');
    };
  }
  
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);
    return offer;
  }
  
  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.connection.setRemoteDescription(offer);
    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);
    return answer;
  }
  
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    await this.connection.setRemoteDescription(description);
  }
  
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.connection.addIceCandidate(candidate);
  }
  
  protected onIceCandidate(_candidate: RTCIceCandidate): void {
    // Override this to send candidate via signaling server
  }
  
  send(data: ArrayBuffer | string): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(data as any);
    }
  }
  
  onMessage(callback: (data: ArrayBuffer | string) => void): void {
    this.onMessageCallback = callback;
  }
  
  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }
  
  onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback;
  }
  
  getRemoteId(): string {
    return this.remoteId;
  }
  
  close(): void {
    this.dataChannel?.close();
    this.connection.close();
  }
  
  // Voice chat
  async addVoiceTrack(stream: MediaStream): Promise<void> {
    for (const track of stream.getAudioTracks()) {
      this.connection.addTrack(track, stream);
    }
  }
  
  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.connection.ontrack = (event) => {
      callback(event.streams[0]);
    };
  }
}

export function createWebRTCConfig(stunServers: string[] = []): WebRTCConfig {
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      ...stunServers.map(url => ({ urls: url })),
    ],
    dataChannelConfig: {
      ordered: false,
      maxRetransmits: 0,
    },
  };
}
