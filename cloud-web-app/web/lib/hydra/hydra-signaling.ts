/**
 * Aethel Engine: O Sinalizador de Frequência (Hydra Signaling)
 * 
 * Este é O ÚNICO código de servidor central do novo paradigma.
 * Sua função é efêmera: Ele atende o WebRTC Offer/Answer, apresenta os dois IPs
 * e então SE AUTO-DESCONECTA da simulação. O P2P Bare-Metal assume daí em diante.
 */

interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate'
  targetPeerId: string
  senderId: string
  payload: any
  isDesktopNode: boolean
}

export class HydraSignalingBroker {
  private activeConnections = new Map<string, WebSocket>()

  /**
   * Conecta um novo cliente da Aethel ao salão central efêmero.
   */
  public registerClient(socket: WebSocket, clientId: string) {
    this.activeConnections.set(clientId, socket)
    console.log(`[Hydra Broker] Usuário ${clientId} conectou para buscar pares.`)

    socket.onmessage = (event) => {
      const msg: SignalMessage = JSON.parse(event.data)
      this.routeSignal(msg)
    }
  }

  /**
   * Roteia chaves criptográficas (SDP) para formar o túnel entre as duas máquinas.
   * O Servidor não sabe NADA sobre malhas, voxels ou entropia. Ele é um telefone cego.
   */
  private routeSignal(msg: SignalMessage) {
    const targetSocket = this.activeConnections.get(msg.targetPeerId)
    if (targetSocket) {
      targetSocket.send(JSON.stringify(msg))
      console.log(`[Hydra Broker] Handshake cruzado entre ${msg.senderId} e ${msg.targetPeerId}.`)
    }
  }
}

// Quando o Handshake termina, os 'Sockets' morrem e o 'hydra_mesh_node.rs' 
// via DataChannel assume a taxa de quadros (240fps) e sincronia física.
