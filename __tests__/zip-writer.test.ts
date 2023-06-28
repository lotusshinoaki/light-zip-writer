import { exec } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import { createReadableStreamFromUint8Array, openWritableStream } from '../src/helper.js';
import { ZipWriter, calcCrc32, getZipDate, getZipTime } from '../src/zip-writer.js';

const _exec = promisify(exec);

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

describe('crc32', () => {
  // https://opensource.apple.com/source/tcl/tcl-20/tcl_ext/tcllib/tcllib/modules/crc/crc32.test.auto.html
  it('calc', () => {
    expect(calcCrc32(Buffer.from(''))).toBe(0);
    expect(calcCrc32(Buffer.from('a'))).toBe(0xe8b7be43);
    expect(calcCrc32(Buffer.from('abc'))).toBe(0x352441c2);
    expect(calcCrc32(Buffer.from('message digest'))).toBe(0x20159d7f);
    expect(calcCrc32(Buffer.from('abcdefghijklmnopqrstuvwxyz'))).toBe(
      0x4c2750bd,
    );
    expect(
      calcCrc32(
        Buffer.from(
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        ),
      ),
    ).toBe(0x1fc2e6d2);
    expect(
      calcCrc32(
        Buffer.from(
          '12345678901234567890123456789012345678901234567890123456789012345678901234567890',
        ),
      ),
    ).toBe(0x7ca94a72);
  });
});

describe('getZipDate', () => {
  it('get', () => {
    const tmp = ((2000 - 1980) << 9) | (1 << 4) | 2;
    expect(getZipDate(new Date(2000, 0, 2, 3, 4, 5))).toBe(tmp);
  });
});

describe('getZipTime', () => {
  it('get', () => {
    const tmp = (3 << 11) | (4 << 5) | Math.floor(5 / 2);
    expect(getZipTime(new Date(2000, 0, 2, 3, 4, 5))).toBe(tmp);
  });
});

describe('ZipWriter', () => {
  it('compress and decompress test', async () => {
    const zn = process.env.TMPDIR + 'zip-writer-test.zip'
    const dest = `${process.env.TMPDIR}zip-writer-test`;

    for (let j = 0; j < 100; j++) {
      await rm(zn, { recursive: true, force: true });
      // Create random contents zip
      const ws = openWritableStream(zn);
      try {
        const zw = new ZipWriter(ws, j >= 50);

        const files = [];
        try {
          for (let i = 0; i < (randomByte() + 1); i++) {
            const name = `${i}.bin`;
            const data = randomBytes();
            await zw.writeFile(name, createReadableStreamFromUint8Array(data));
            files.push({ data, name });
          }
        } finally {
          await zw.close();
        }

        await rm(dest, { recursive: true, force: true });
        // Extract with unzip
        await _exec(`python3 scripts/unzip.py ${zn} ${dest}`);

        // Compare with extracted file
        for (let i = 0; i < files.length; i++) {
          const data = await readFile(`${dest}/${files[i].name}`);
          expect(files[i].data).toEqual(data);
        }
      } finally {
        await ws.close();
      }
    }
  }, 20 * 1000);
});
