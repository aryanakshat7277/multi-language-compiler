import { CompilerExecutionRequest } from './piston/pistonTypes';
import { config } from '../config/env';

export class CompilerValidator {
  static validateExecutionRequest(req: CompilerExecutionRequest): void {
    if (!req.language) {
      throw new Error('Language is required');
    }

    if (!req.files || req.files.length === 0) {
      throw new Error('At least one file must be provided');
    }

    if (req.files.length > config.compilerMaxFiles) {
      throw new Error(`Maximum of ${config.compilerMaxFiles} files allowed`);
    }

    let totalSize = 0;
    const maxSourceSize = config.compilerMaxSourceSize;
    const maxTotalSize = maxSourceSize * 5; // 500KB total max as requested

    for (const file of req.files) {
      this.sanitizeFilename(file.name);
      
      const size = Buffer.byteLength(file.content, 'utf8');
      if (size > maxSourceSize) {
        throw new Error(`File ${file.name} exceeds maximum size of ${maxSourceSize} bytes`);
      }
      totalSize += size;
    }

    if (totalSize > maxTotalSize) {
      throw new Error(`Total files size exceeds maximum of ${maxTotalSize} bytes`);
    }

    if (req.stdin) {
      const stdinSize = Buffer.byteLength(req.stdin, 'utf8');
      if (stdinSize > config.compilerMaxStdinSize) {
        throw new Error(`Stdin exceeds maximum size of ${config.compilerMaxStdinSize} bytes`);
      }
    }
  }

  static sanitizeFilename(name: string): void {
    if (!name || name.trim() === '') {
      throw new Error('Filename cannot be empty');
    }

    if (name.length > 100) {
      throw new Error('Filename must not exceed 100 characters');
    }

    if (name.includes('..')) {
      throw new Error('Directory traversal (..) is not allowed in filenames');
    }

    if (name.includes('\\') || name.includes('/')) {
      throw new Error('Paths are not allowed in filenames');
    }

    if (name.indexOf('\0') !== -1) {
      throw new Error('Null bytes are not allowed in filenames');
    }

    if (name.startsWith('.')) {
      throw new Error('Hidden files are not allowed');
    }
  }

  static validateFileExtension(name: string, languageId: string): void {
    const extIndex = name.lastIndexOf('.');
    if (extIndex !== -1) {
      const ext = name.substring(extIndex);
      const expectedExtMap: Record<string, string> = {
        python: '.py',
        cpp: '.cpp',
        c: '.c',
        java: '.java',
        javascript: '.js',
        typescript: '.ts',
        go: '.go',
        rust: '.rs'
      };

      const expected = expectedExtMap[languageId];
      if (expected && ext !== expected) {
        console.warn(`File extension warning: Expected ${expected} for ${languageId}, got ${ext}`);
      }
    }
  }
}
