declare global {
  // Set by the RN runtime; declared here so reads stay type-checked.
  var RN$Bridgeless: boolean | undefined;
  var nativeFabricUIManager: object | undefined;
}

export type ArchitectureInfo = {
  bridgeless: boolean;
  fabric: boolean;
};

/** Reads runtime flags to prove (not assume) the New Architecture is active. */
export function getArchitectureInfo(): ArchitectureInfo {
  return {
    bridgeless: globalThis.RN$Bridgeless === true,
    fabric: globalThis.nativeFabricUIManager != null,
  };
}
