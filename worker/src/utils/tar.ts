/**
 * Simple TAR archive creator for Dockerode putArchive.
 * Creates a valid POSIX tar buffer from an array of files.
 */
export function createTarBuffer(files: { name: string; content: string }[]): Buffer {
  const buffers: Buffer[] = [];
  
  for (const file of files) {
    const contentBuf = Buffer.from(file.content, 'utf8');
    const header = Buffer.alloc(512);
    
    // Fill header with zeros initially
    header.fill(0);
    
    // name (100 bytes)
    header.write(file.name, 0, 100, 'ascii');
    // mode (8 bytes)
    header.write('0000644\0', 100, 8, 'ascii');
    // uid (8 bytes) - 1000 in octal is 1750
    header.write('0001750\0', 108, 8, 'ascii'); 
    // gid (8 bytes) - 1000 in octal is 1750
    header.write('0001750\0', 116, 8, 'ascii');
    // size (12 bytes)
    header.write(contentBuf.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
    // mtime (12 bytes)
    header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0', 136, 12, 'ascii');
    // chksum (8 bytes) - initialize with spaces
    header.write('        ', 148, 8, 'ascii');
    // typeflag (1 byte) - '0' for regular file
    header.write('0', 156, 1, 'ascii');
    // magic (6 bytes)
    header.write('ustar\0', 257, 6, 'ascii');
    // version (2 bytes)
    header.write('00', 263, 2, 'ascii');
    
    // Calculate checksum
    let chksum = 0;
    for (let i = 0; i < 512; i++) {
      chksum += header[i];
    }
    // write checksum
    header.write(chksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
    
    buffers.push(header);
    buffers.push(contentBuf);
    
    // Padding to 512 bytes boundary
    const paddingLength = (512 - (contentBuf.length % 512)) % 512;
    if (paddingLength > 0) {
      buffers.push(Buffer.alloc(paddingLength));
    }
  }
  
  // End of archive marker (two 512-byte blocks of zeros)
  buffers.push(Buffer.alloc(1024));
  
  return Buffer.concat(buffers);
}
