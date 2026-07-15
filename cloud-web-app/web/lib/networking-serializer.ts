import type { MessageType, NetworkInput, NetworkMessage, PlayerState } from './networking-multiplayer';

export class NetworkSerializer {
  private static textEncoder = new TextEncoder();
  private static textDecoder = new TextDecoder();
  static serializeState(state: PlayerState): ArrayBuffer {
    const animBytes = this.textEncoder.encode(state.animation);
    const customJson = JSON.stringify(state.customData);
    const customBytes = this.textEncoder.encode(customJson);
    const size = 4 * 11 + // floats
                 4 + animBytes.length + // animation string length + data
                 4 + customBytes.length; // custom data length + data
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let offset = 0;
    view.setFloat32(offset, state.position.x, true); offset += 4;
    view.setFloat32(offset, state.position.y, true); offset += 4;
    view.setFloat32(offset, state.position.z, true); offset += 4;
    view.setFloat32(offset, state.rotation.x, true); offset += 4;
    view.setFloat32(offset, state.rotation.y, true); offset += 4;
    view.setFloat32(offset, state.rotation.z, true); offset += 4;
    view.setFloat32(offset, state.rotation.w, true); offset += 4;
    view.setFloat32(offset, state.velocity.x, true); offset += 4;
    view.setFloat32(offset, state.velocity.y, true); offset += 4;
    view.setFloat32(offset, state.velocity.z, true); offset += 4;
    view.setFloat32(offset, state.health, true); offset += 4;
    view.setUint32(offset, animBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, animBytes.length).set(animBytes);
    offset += animBytes.length;
    view.setUint32(offset, customBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, customBytes.length).set(customBytes);
    return buffer;
  }
  static deserializeState(buffer: ArrayBuffer): PlayerState {
    const view = new DataView(buffer);
    let offset = 0;
    const position = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 12;
    const rotation = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
      w: view.getFloat32(offset + 12, true),
    };
    offset += 16;
    const velocity = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 12;
    const health = view.getFloat32(offset, true);
    offset += 4;
    const animLength = view.getUint32(offset, true);
    offset += 4;
    const animation = this.textDecoder.decode(new Uint8Array(buffer, offset, animLength));
    offset += animLength;
    const customLength = view.getUint32(offset, true);
    offset += 4;
    const customJson = this.textDecoder.decode(new Uint8Array(buffer, offset, customLength));
    const customData = JSON.parse(customJson);
    return { position, rotation, velocity, animation, health, customData };
  }
  static serializeInput(input: NetworkInput): ArrayBuffer {
    const keysArray = Array.from(input.keys);
    const keysJson = JSON.stringify(keysArray);
    const keysBytes = this.textEncoder.encode(keysJson);
    const actionsJson = JSON.stringify(input.actions);
    const actionsBytes = this.textEncoder.encode(actionsJson);
    const playerIdBytes = this.textEncoder.encode(input.playerId);
    const size = 8 + // timestamp
                 4 + // sequence
                 4 + playerIdBytes.length + // player id
                 4 + keysBytes.length + // keys
                 4 * 2 + // mouse x, y
                 4 + // mouse buttons
                 4 + actionsBytes.length; // actions
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let offset = 0;
    view.setFloat64(offset, input.timestamp, true); offset += 8;
    view.setUint32(offset, input.sequence, true); offset += 4;
    view.setUint32(offset, playerIdBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, playerIdBytes.length).set(playerIdBytes);
    offset += playerIdBytes.length;
    view.setUint32(offset, keysBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, keysBytes.length).set(keysBytes);
    offset += keysBytes.length;
    view.setFloat32(offset, input.mouseX, true); offset += 4;
    view.setFloat32(offset, input.mouseY, true); offset += 4;
    view.setUint32(offset, input.mouseButtons, true); offset += 4;
    view.setUint32(offset, actionsBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, actionsBytes.length).set(actionsBytes);
    return buffer;
  }
  static deserializeInput(buffer: ArrayBuffer): NetworkInput {
    const view = new DataView(buffer);
    let offset = 0;
    const timestamp = view.getFloat64(offset, true); offset += 8;
    const sequence = view.getUint32(offset, true); offset += 4;
    const playerIdLength = view.getUint32(offset, true); offset += 4;
    const playerId = this.textDecoder.decode(new Uint8Array(buffer, offset, playerIdLength));
    offset += playerIdLength;
    const keysLength = view.getUint32(offset, true); offset += 4;
    const keysJson = this.textDecoder.decode(new Uint8Array(buffer, offset, keysLength));
    const keys = new Set<string>(JSON.parse(keysJson));
    offset += keysLength;
    const mouseX = view.getFloat32(offset, true); offset += 4;
    const mouseY = view.getFloat32(offset, true); offset += 4;
    const mouseButtons = view.getUint32(offset, true); offset += 4;
    const actionsLength = view.getUint32(offset, true); offset += 4;
    const actionsJson = this.textDecoder.decode(new Uint8Array(buffer, offset, actionsLength));
    const actions = JSON.parse(actionsJson);
    return { timestamp, sequence, playerId, keys, mouseX, mouseY, mouseButtons, actions };
  }
  static serializeMessage(message: NetworkMessage): ArrayBuffer {
    const typeBytes = this.textEncoder.encode(message.type);
    const payloadJson = JSON.stringify(message.payload);
    const payloadBytes = this.textEncoder.encode(payloadJson);
    const size = 1 + typeBytes.length + // type
                 8 + // timestamp
                 4 + // sequence
                 4 + payloadBytes.length; // payload
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let offset = 0;
    view.setUint8(offset, typeBytes.length); offset += 1;
    new Uint8Array(buffer, offset, typeBytes.length).set(typeBytes);
    offset += typeBytes.length;
    view.setFloat64(offset, message.timestamp, true); offset += 8;
    view.setUint32(offset, message.sequence, true); offset += 4;
    view.setUint32(offset, payloadBytes.length, true); offset += 4;
    new Uint8Array(buffer, offset, payloadBytes.length).set(payloadBytes);
    return buffer;
  }
  static deserializeMessage(buffer: ArrayBuffer): NetworkMessage {
    const view = new DataView(buffer);
    let offset = 0;
    const typeLength = view.getUint8(offset); offset += 1;
    const type = this.textDecoder.decode(new Uint8Array(buffer, offset, typeLength)) as MessageType;
    offset += typeLength;
    const timestamp = view.getFloat64(offset, true); offset += 8;
    const sequence = view.getUint32(offset, true); offset += 4;
    const payloadLength = view.getUint32(offset, true); offset += 4;
    const payloadJson = this.textDecoder.decode(new Uint8Array(buffer, offset, payloadLength));
    const payload = JSON.parse(payloadJson);
    return { type, timestamp, sequence, payload };
  }
}
