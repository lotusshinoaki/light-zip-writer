import { ReadableStream, WritableStream } from 'node:stream/web';
import { TextEncoder } from 'node:util';

const CRC_TABLE = [
  0, 1996959894, -301047508, -1727442502, 124634137, 1886057615, -379345611,
  -1637575261, 249268274, 2044508324, -522852066, -1747789432, 162941995,
  2125561021, -407360249, -1866523247, 498536548, 1789927666, -205950648,
  -2067906082, 450548861, 1843258603, -187386543, -2083289657, 325883990,
  1684777152, -43845254, -1973040660, 335633487, 1661365465, -99664541,
  -1928851979, 997073096, 1281953886, -715111964, -1570279054, 1006888145,
  1258607687, -770865667, -1526024853, 901097722, 1119000684, -608450090,
  -1396901568, 853044451, 1172266101, -589951537, -1412350631, 651767980,
  1373503546, -925412992, -1076862698, 565507253, 1454621731, -809855591,
  -1195530993, 671266974, 1594198024, -972236366, -1324619484, 795835527,
  1483230225, -1050600021, -1234817731, 1994146192, 31158534, -1731059524,
  -271249366, 1907459465, 112637215, -1614814043, -390540237, 2013776290,
  251722036, -1777751922, -519137256, 2137656763, 141376813, -1855689577,
  -429695999, 1802195444, 476864866, -2056965928, -228458418, 1812370925,
  453092731, -2113342271, -183516073, 1706088902, 314042704, -1950435094,
  -54949764, 1658658271, 366619977, -1932296973, -69972891, 1303535960,
  984961486, -1547960204, -725929758, 1256170817, 1037604311, -1529756563,
  -740887301, 1131014506, 879679996, -1385723834, -631195440, 1141124467,
  855842277, -1442165665, -586318647, 1342533948, 654459306, -1106571248,
  -921952122, 1466479909, 544179635, -1184443383, -832445281, 1591671054,
  702138776, -1328506846, -942167884, 1504918807, 783551873, -1212326853,
  -1061524307, -306674912, -1698712650, 62317068, 1957810842, -355121351,
  -1647151185, 81470997, 1943803523, -480048366, -1805370492, 225274430,
  2053790376, -468791541, -1828061283, 167816743, 2097651377, -267414716,
  -2029476910, 503444072, 1762050814, -144550051, -2140837941, 426522225,
  1852507879, -19653770, -1982649376, 282753626, 1742555852, -105259153,
  -1900089351, 397917763, 1622183637, -690576408, -1580100738, 953729732,
  1340076626, -776247311, -1497606297, 1068828381, 1219638859, -670225446,
  -1358292148, 906185462, 1090812512, -547295293, -1469587627, 829329135,
  1181335161, -882789492, -1134132454, 628085408, 1382605366, -871598187,
  -1156888829, 570562233, 1426400815, -977650754, -1296233688, 733239954,
  1555261956, -1026031705, -1244606671, 752459403, 1541320221, -1687895376,
  -328994266, 1969922972, 40735498, -1677130071, -351390145, 1913087877,
  83908371, -1782625662, -491226604, 2075208622, 213261112, -1831694693,
  -438977011, 2094854071, 198958881, -2032938284, -237706686, 1759359992,
  534414190, -2118248755, -155638181, 1873836001, 414664567, -2012718362,
  -15766928, 1711684554, 285281116, -1889165569, -127750551, 1634467795,
  376229701, -1609899400, -686959890, 1308918612, 956543938, -1486412191,
  -799009033, 1231636301, 1047427035, -1362007478, -640263460, 1088359270,
  936918000, -1447252397, -558129467, 1202900863, 817233897, -1111625188,
  -893730166, 1404277552, 615818150, -1160759803, -841546093, 1423857449,
  601450431, -1285129682, -1000256840, 1567103746, 711928724, -1274298825,
  -1022587231, 1510334235, 755167117,
] as const;

export function calcCrc32(data: Uint8Array) {
  let crc = 0 ^ -1;
  data.forEach((n) => {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ n) & 0xff];
  });
  return (crc ^ -1) >>> 0;
}

export function getZipDate(date: Date) {
  return (
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 4) |
    date.getDate()
  );
}

export function getZipTime(date: Date) {
  return (
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2)
  );
}

async function readAllBytes(rs: ReadableStream<Uint8Array>) {
  const reader = rs.getReader();
  try {
    const chunks: Uint8Array[] = [];

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
    }

    let length = 0;
    chunks.forEach((n) => { length += n.byteLength; })

    const result = new Uint8Array(length);
    let offset = 0;
    chunks.forEach((n) => {
      result.set(n, offset);
      offset += n.byteLength;
    });
    return result;
  } finally {
    reader.releaseLock();
  }
}

class CustomArrayBuffer {
  private readonly _bytes: Uint8Array;
  private readonly _view: DataView;

  constructor(byteLength: number) {
    this._bytes = new Uint8Array(byteLength);
    this._view = new DataView(this._bytes.buffer);
  }

  get length() {
    return this._bytes.length;
  }

  setUint8(byteOffset: number, value: number) {
    this._view.setUint8(byteOffset, value);
  }

  setUint16(byteOffset: number, value: number) {
    this._view.setUint16(byteOffset, value, true);
  }

  setUint32(byteOffset: number, value: number) {
    this._view.setUint32(byteOffset, value, true);
  }

  setBigUint64(byteOffset: number, value: bigint) {
    this._view.setBigUint64(byteOffset, value, true);
  }

  async writeTo(ws: WritableStream<Uint8Array>) {
    const writer = ws.getWriter();
    try {
      await writer.ready;
      await writer.write(this._bytes);
      return;
    } finally {
      writer.releaseLock();
    }
  }
}

interface CentralFileHeader {
  extra: CustomArrayBuffer;
  header: CustomArrayBuffer;
  name: Uint8Array;
}

export class ZipWriter {
  private readonly _centralFileHeaderList: CentralFileHeader[] = [];
  private readonly _encoder = new TextEncoder();
  private readonly _ws: WritableStream<Uint8Array>;
  private readonly _zip64: boolean;
  private readonly _zipDate: number;
  private readonly _zipTime: number;

  private _centralDirectoryOffset = 0;
  private _centralDirectorySize = 0;
  private _closed = false;
  private _filePointer = 0;
  private _zip64EndOfCentralDirectoryOffset = 0;

  constructor(ws: WritableStream<Uint8Array>, zip64 = false) {
    this._ws = ws;
    this._zip64 = zip64;

    const date = new Date();
    this._zipTime = getZipTime(date);
    this._zipDate = getZipDate(date);
  }

  async close() {
    if (this._closed) {
      return;
    }

    await this._writeCentralDirectory();
    if (this._zip64) {
      await this._writeZip64EndOfCentralDirectory();
      await this._writeZip64EndOfCentralDirectoryLocator();
    }
    await this._writeEndOfCentralDirectory();
    this._closed = true;
  }

  async writeFile(name: string, rs: ReadableStream<Uint8Array>) {
    if (this._closed) {
      throw new Error('ZipWriter already closed');
    }

    const data = await readAllBytes(rs);
    const utf8Name = this._encoder.encode(name);

    const lfh = new CustomArrayBuffer(30);
    const extra = new CustomArrayBuffer(this._zip64 ? 28 : 0);
    // local file header signature(4)
    lfh.setUint8(0, 0x50);
    lfh.setUint8(1, 0x4b);
    lfh.setUint8(2, 0x03);
    lfh.setUint8(3, 0x04);
    // version needed to extract (2)
    lfh.setUint16(4, this._zip64 ? 45 : 10);
    // general purpose bit flag(2)
    lfh.setUint16(6, 0x0800);
    // compression method (2)
    lfh.setUint16(8, 0);
    // last mod file time (2)
    lfh.setUint16(10, this._zipTime);
    // last mod file date (2)
    lfh.setUint16(12, this._zipDate);
    // crc-32 (4)
    const crc32 = calcCrc32(data);
    lfh.setUint32(14, crc32);
    // compressed size (4)
    lfh.setUint32(18, this._zip64 ? 0xffffffff : data.length);
    // uncompressed size (4)
    lfh.setUint32(22, this._zip64 ? 0xffffffff : data.length);
    // file name length (2)
    lfh.setUint16(26, utf8Name.byteLength);
    // extra field length (2)
    lfh.setUint16(28, extra.length);

    await lfh.writeTo(this._ws);
    await this._writeBytes(utf8Name);
    if (this._zip64) {
      // zip64 extended information extra field
      extra.setUint8(0, 0x01);
      extra.setUint8(1, 0x00);
      extra.setUint16(2, 24);
      // original size (8)
      extra.setBigUint64(4, BigInt(data.length));
      extra.setBigUint64(4, BigInt(data.length));
      // compressed size (8)
      extra.setBigUint64(12, BigInt(data.length));
      // relative header offset (8)
      extra.setBigUint64(20, BigInt(this._filePointer));
      await extra.writeTo(this._ws);
    }
    await this._writeBytes(data);

    const cfh = new CustomArrayBuffer(46);
    // central file header signature (4)
    cfh.setUint8(0, 0x50);
    cfh.setUint8(1, 0x4b);
    cfh.setUint8(2, 0x01);
    cfh.setUint8(3, 0x02);
    // version made by (1+1)
    cfh.setUint8(4, this._zip64 ? 45 : 10);
    cfh.setUint8(5, 3);
    // version needed to extract (2)
    cfh.setUint16(6, this._zip64 ? 45 : 10);
    // general purpose bit flag (2)
    cfh.setUint16(8, 0x0800);
    // compression method (2)
    cfh.setUint16(10, 0);
    // last mod file time (2)
    cfh.setUint16(12, this._zipTime);
    // last mod file date (2)
    cfh.setUint16(14, this._zipDate);
    // crc-32 (4)
    cfh.setUint32(16, crc32);
    // compressed size (4)
    cfh.setUint32(20, this._zip64 ? 0xffffffff : data.length);
    // uncompressed size (4)
    cfh.setUint32(24, this._zip64 ? 0xffffffff : data.length);
    // file name length (2)
    cfh.setUint16(28, utf8Name.length);
    // extra field length (2)
    cfh.setUint16(30, extra.length);
    // file comment length (2)
    cfh.setUint16(32, 0);
    // disk number start (2)
    cfh.setUint16(34, 0);
    // internal file attributes (2)
    cfh.setUint16(36, 0);
    // external file attributes (4)
    cfh.setUint32(38, 0x1FF << 16); // 0x1FF=0777=rwxrwxrwx
    // relative offset of local header (4)
    cfh.setUint32(42, this._zip64 ? 0xffffffff : this._filePointer);
    this._centralFileHeaderList.push({ extra, header: cfh, name: utf8Name });

    this._filePointer += lfh.length + utf8Name.length + extra.length + data.length;
  }

  private async _writeBytes(data: Uint8Array) {
    const writer = this._ws.getWriter();
    try {
      await writer.ready;
      await writer.write(data);
      return;
    } finally {
      writer.releaseLock();
    }
  }

  private async _writeCentralDirectory() {
    if (this._centralFileHeaderList.length === 0) {
      throw new Error('Cannot create an empty zip');
    }

    this._centralDirectoryOffset = this._filePointer;

    for (const {extra, header, name} of this._centralFileHeaderList) {
      await header.writeTo(this._ws);
      await this._writeBytes(name);
      await extra.writeTo(this._ws);

      const writeSize = header.length + name.length + extra.length;
      this._centralDirectorySize += writeSize;
      this._filePointer += writeSize;
    }
  }

  private async _writeZip64EndOfCentralDirectory() {
    this._zip64EndOfCentralDirectoryOffset = this._filePointer;

    const ecd64 = new CustomArrayBuffer(56);
    // zip64 end of central directory signature (4)
    ecd64.setUint8(0, 0x50);
    ecd64.setUint8(1, 0x4b);
    ecd64.setUint8(2, 0x06);
    ecd64.setUint8(3, 0x06);
    // size of zip64 end of central directory (8)
    ecd64.setBigUint64(4, BigInt(44));
    // version made by (2)
    ecd64.setUint16(12, 45);
    // version needed to extract (2)
    ecd64.setUint16(14, 45);
    // number of this disk (4)
    ecd64.setUint32(16, 0);
    // number of the disk with the start of the central directory (4)
    ecd64.setUint32(20, 0);
    // total number of entries in the central directory on this disk (8)
    ecd64.setBigUint64(24, BigInt(this._centralFileHeaderList.length));
    // total number of entries in the central directory (8)
    ecd64.setBigUint64(32, BigInt(this._centralFileHeaderList.length));
    // size of the central directory (8)
    ecd64.setBigUint64(40, BigInt(this._centralDirectorySize));
    // offset of start of central directory with respect to the starting disk number (8)
    ecd64.setBigUint64(48, BigInt(this._centralDirectoryOffset));

    await ecd64.writeTo(this._ws);
  }

  private async _writeZip64EndOfCentralDirectoryLocator() {
    const ecdl = new CustomArrayBuffer(20);

    // zip64 end of central directory locator signature (4)
    ecdl.setUint8(0, 0x50);
    ecdl.setUint8(1, 0x4b);
    ecdl.setUint8(2, 0x06);
    ecdl.setUint8(3, 0x07);
    // number of the disk with the start of the zip64 end of central directory (4)
    ecdl.setUint32(4, 0);
    // relative offset of the zip64 end of central directory record (8)
    ecdl.setBigUint64(8, BigInt(this._zip64EndOfCentralDirectoryOffset));
    // total number of disks (4)
    ecdl.setUint32(16, 0);

    await ecdl.writeTo(this._ws);
  }

  private async _writeEndOfCentralDirectory() {
    const ecd = new CustomArrayBuffer(22);

    // end of central dir signature (4)
    ecd.setUint8(0, 0x50);
    ecd.setUint8(1, 0x4b);
    ecd.setUint8(2, 0x05);
    ecd.setUint8(3, 0x06);
    // number of this disk (2)
    ecd.setUint16(4, this._zip64 ? 0xffff : 0);
    // number of the disk with the start of the central directory (2)
    ecd.setUint16(6, this._zip64 ? 0xffff : 0);
    // total number of entries in the central directory on this disk (2)
    ecd.setUint16(
      8,
      this._zip64 ? 0xffff : this._centralFileHeaderList.length,
    );
    // total number of entries in the central directory (2)
    ecd.setUint16(
      10,
      this._zip64 ? 0xffff : this._centralFileHeaderList.length,
    );
    // size of the central directory (4)
    ecd.setUint32(
      12,
      this._zip64 ? 0xffffffff : this._centralDirectorySize,
    );
    // offset of start of central directory with respect to the starting disk number (4)
    ecd.setUint32(
      16,
      this._zip64 ? 0xffffffff : this._centralDirectoryOffset,
    );
    // zip file comment length (2)
    ecd.setUint16(20, 0);

    await ecd.writeTo(this._ws);
  }
}
