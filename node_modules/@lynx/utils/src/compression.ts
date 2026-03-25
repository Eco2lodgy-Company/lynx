/**
 * Universal image compression interface.
 * Employs HTMLCanvas on Web and expo-image-manipulator on Mobile.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
}

// Since web and mobile have completely different APIs for this,
// we define an interface that each platform will implement and inject.
export type Compressor = (file: any, options?: CompressionOptions) => Promise<any>;

let _compressor: Compressor | null = null;

export function setCompressor(compressor: Compressor) {
  _compressor = compressor;
}

export async function compressImage(file: any, options?: CompressionOptions): Promise<any> {
  if (!_compressor) {
    console.warn("[Compression] No compressor configured, returning original file");
    return file;
  }
  return await _compressor(file, options);
}
