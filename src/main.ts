import { exec } from 'node:child_process';
import { readFile, rm } from 'node:fs';
import { promisify } from 'node:util';
import { ZipWriter } from './zip-writer.js';

const _exec = promisify(exec);
const _readFile = promisify(readFile);
const _rm = promisify(rm);

function equals(a: Buffer, b: Buffer) {
  if (a.length !== b.length) {
    return false;
  }
  const _a = new Uint8Array(a);
  const _b = new Uint8Array(b);
  for (let i = 0; i < _a.length; i++) {
    if (_a[i] !== _b[i]) {
      return false;
    }
  }
  return true;
}

function randomByte() {
  return Math.floor(Math.random() * 256);
}

function randomBytes() {
  const buffer = Buffer.alloc(randomByte());
  for (let i = 0; i < buffer.length; i++) {
    buffer.writeUint8(randomByte(), i);
  }
  return buffer;
}

async function main() {
  const zn = process.env.TMPDIR + 'zip-writer-test.zip'
  const dest = `${process.env.TMPDIR}zip-writer-test`;

  for (let j = 0; j < 1000; j++) {
    console.debug(j);

    await _rm(zn, { recursive: true, force: true });
    // Create random contents zip
    const zw = new ZipWriter(zn);

    const files = [];
    try {
      for (let i = 0; i < (randomByte() + 1); i++) {
        const name = `${i}.bin`;
        const data = randomBytes();
        await zw.writeFile(name, data);
        files.push({ data, name });
      }
    } finally {
      zw.close();
    }

    await _rm(dest, { recursive: true, force: true });
    // Extract with unzip
    await _exec(`unzip ${zn} -d ${dest}`);

    // Compare with extracted file
    for (let i = 0; i < files.length; i++) {
      const data = await _readFile(`${dest}/${files[i].name}`);
      if (!equals(files[i].data, data)) {
        console.warn('Original:', files[i].data);
        console.warn('Extracted:', data);
        throw new Error('The extracted data is corrupted');
      }
    }
  }
  console.debug('Test OK');
}

main();
