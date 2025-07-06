declare module '@/lib/openadp-browser/ocrypt.js' {
  export interface RecoveryResult {
    secret: Uint8Array;
    remaining: number;
    updatedMetadata?: Uint8Array;
  }

  export function register(
    userID: string,
    appID: string,
    secret: Uint8Array,
    pin: string,
    maxGuesses: number
  ): Promise<Uint8Array>;

  export function recover(
    metadata: Uint8Array,
    pin: string
  ): Promise<RecoveryResult>;

  export class OcryptError extends Error {
    code?: string;
    constructor(message: string, code?: string);
  }
} 