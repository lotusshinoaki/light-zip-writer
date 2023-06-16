import { calcCrc32, getZipDate, getZipTime } from '../src/zip-writer.js';

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
  it('get', () => {});
});
