import * as Y from "yjs";

const PROSEMIRROR_FIELD = "default";

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export function restoreFromSnapshot(liveDoc: Y.Doc, snapshotBase64: string) {
  const snapshotBytes = base64ToUint8(snapshotBase64);
  const snapshotDoc = new Y.Doc();
  Y.applyUpdate(snapshotDoc, snapshotBytes);

  liveDoc.transact(() => {
    const liveFragment = liveDoc.getXmlFragment(PROSEMIRROR_FIELD);
    const snapFragment = snapshotDoc.getXmlFragment(PROSEMIRROR_FIELD);

    if (liveFragment.length > 0) {
      liveFragment.delete(0, liveFragment.length);
    }

    snapFragment.forEach((item) => {
      if (item instanceof Y.AbstractType) {
        liveFragment.push([item.clone()]);
      }
    });
  });

  snapshotDoc.destroy();
}

export function encodeSnapshot(doc: Y.Doc): string {
  return uint8ToBase64(Y.encodeStateAsUpdate(doc));
}
