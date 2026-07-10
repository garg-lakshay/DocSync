import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as syncProtocol from "y-protocols/sync";
import type { RawData } from "ws";
import type { Role } from "./role.js";

const MESSAGE_SYNC = 0;

type MessagePayload = RawData | Uint8Array;

export function rawDataToUint8Array(data: MessagePayload): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (Array.isArray(data)) {
    return new Uint8Array(Buffer.concat(data));
  }
  if (Buffer.isBuffer(data)) {
    return new Uint8Array(data);
  }
  return new Uint8Array(data);
}

export function encodeSyncStep2Message(doc: import("yjs").Doc): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep2(encoder, doc);
  return encoding.toUint8Array(encoder);
}

export function isSyncUpdateMessage(data: Uint8Array | Buffer): boolean {
  try {
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);
    if (messageType !== MESSAGE_SYNC) return false;
    const syncMessageType = decoding.readVarUint(decoder);
    return syncMessageType === syncProtocol.messageYjsSyncStep2;
  } catch {
    return false;
  }
}

export function shouldRejectViewerUpdate(role: Role, data: MessagePayload): boolean {
  return role === "VIEWER" && isSyncUpdateMessage(rawDataToUint8Array(data));
}

export function isOversizedPayload(data: MessagePayload, maxBytes: number): boolean {
  if (Array.isArray(data)) {
    const total = data.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    return total > maxBytes;
  }
  return Buffer.byteLength(data) > maxBytes;
}
