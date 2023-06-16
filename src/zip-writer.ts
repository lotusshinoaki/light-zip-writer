import fs from 'node:fs';

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

export function calcCrc32(data: Buffer) {
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

interface CentralFileHeader {
  extra: Buffer;
  header: Buffer;
  name: string;
}

export class ZipWriter {
  private readonly _centralFileHeaderList: CentralFileHeader[] = [];
  private readonly _writer: fs.WriteStream;
  private readonly _zip64: boolean;
  private readonly _zipDate: number;
  private readonly _zipTime: number;

  private _centralDirectoryOffset = 0;
  private _centralDirectorySize = 0;
  private _closed = false;
  private _filePointer = 0;
  private _zip64EndOfCentralDirectoryOffset = 0;

  constructor(name: string, zip64 = false) {
    this._writer = fs.createWriteStream(name, 'binary');
    this._zip64 = zip64;

    const date = new Date();
    this._zipTime = getZipTime(date);
    this._zipDate = getZipDate(date);
  }

  close() {
    if (this._closed) {
      return;
    }

    this._writeCentralDirectory();
    if (this._zip64) {
      this._writeZip64EndOfCentralDirectory();
      this._writeZip64EndOfCentralDirectoryLocator();
    }
    this._writeEndOfCentralDirectory();
    this._writer.close();
    this._closed = true;
  }

  async writeFile(name: string, data: Buffer) {
    if (this._closed) {
      throw new Error('ZipWriter already closed');
    }

    // local file header signature(4)
    const lfh = Buffer.alloc(30);
    const extra = Buffer.alloc(this._zip64 ? 20 : 0);
    lfh.writeUint8(0x50, 0);
    lfh.writeUint8(0x4b, 1);
    lfh.writeUint8(0x03, 2);
    lfh.writeUint8(0x04, 3);
    // version needed to extract (2)
    lfh.writeUint16LE(this._zip64 ? 45 : 10, 4);
    // general purpose bit flag(2)
    lfh.writeUint16LE(0, 6);
    // compression method (2)
    lfh.writeUint16LE(0, 8);
    // last mod file time (2)
    lfh.writeUint16LE(this._zipTime, 10);
    // last mod file date (2)
    lfh.writeUint16LE(this._zipDate, 12);
    // crc-32 (4)
    const crc32 = calcCrc32(data);
    lfh.writeUInt32LE(crc32, 14);
    // compressed size (4)
    lfh.writeUint32LE(this._zip64 ? 0xffffffff : data.length, 18);
    // uncompressed size (4)
    lfh.writeUint32LE(this._zip64 ? 0xffffffff : data.length, 22);
    // file name length (2)
    lfh.writeUint16LE(name.length, 26);
    // extra field length (2)
    lfh.writeUint16LE(extra.length, 28);

    this._writer.write(lfh);
    this._writer.write(name);

    if (this._zip64) {
      // zip64 extended information extra field
      extra.writeUint8(0x01, 0);
      extra.writeUint8(0x00, 1);
      extra.writeUint16LE(16, 2);
      // original size (4)
      extra.writeUint32LE(data.length, 4);
      // compressed size (4)
      extra.writeUint32LE(data.length, 12);
      this._writer.write(extra);
    }

    await new Promise((resolve) => {
      this._writer.write(data, resolve);
    });

    // central file header signature (4)
    const cfh = Buffer.alloc(46);
    cfh.writeUint8(0x50, 0);
    cfh.writeUint8(0x4b, 1);
    cfh.writeUint8(0x01, 2);
    cfh.writeUint8(0x02, 3);
    // version made by (1+1)
    cfh.writeUint8(this._zip64 ? 45 : 10, 4);
    cfh.writeUint8(3, 5);
    // version needed to extract (2)
    cfh.writeUint16LE(this._zip64 ? 45 : 10, 6);
    // general purpose bit flag (2)
    cfh.writeUint16LE(0, 8);
    // compression method (2)
    cfh.writeUint16LE(0, 10);
    // last mod file time (2)
    cfh.writeUint16LE(this._zipTime, 12);
    // last mod file date (2)
    cfh.writeUint16LE(this._zipDate, 14);
    // crc-32 (4)
    cfh.writeUInt32LE(crc32, 16);
    // compressed size (4)
    cfh.writeUint32LE(this._zip64 ? 0xffffffff : data.length, 20);
    // uncompressed size (4)
    cfh.writeUint32LE(this._zip64 ? 0xffffffff : data.length, 24);
    // file name length (2)
    cfh.writeUint16LE(name.length, 28);
    // extra field length (2)
    cfh.writeUint16LE(extra.length, 30);
    // file comment length (2)
    cfh.writeUint16LE(0, 32);
    // disk number start (2)
    cfh.writeUint16LE(0, 34);
    // internal file attributes (2)
    cfh.writeUint16LE(0, 36);
    // external file attributes (4)
    cfh.writeUint32LE(0x1FF << 16, 38); // 0x1FF=0777=rwxrwxrwx
    // relative offset of local header (4)
    cfh.writeUint32LE(this._zip64 ? 0xffffffff : this._filePointer, 42);
    this._centralFileHeaderList.push({ extra, header: cfh, name });

    this._filePointer += lfh.length + name.length + extra.length + data.length;
  }

  private _writeCentralDirectory() {
    if (this._centralFileHeaderList.length === 0) {
      throw new Error('Cannot create an empty zip');
    }

    this._centralDirectoryOffset = this._filePointer;

    this._centralFileHeaderList.forEach(({ extra, header, name }) => {
      this._writer.write(header);
      this._writer.write(name);
      this._writer.write(extra);

      const writeSize = header.length + name.length + extra.length;
      this._centralDirectorySize += writeSize;
      this._filePointer += writeSize;
    });
  }

  private _writeZip64EndOfCentralDirectory() {
    this._zip64EndOfCentralDirectoryOffset = this._filePointer;

    // zip64 end of central directory signature (4)
    const ecd64 = Buffer.alloc(56);
    ecd64.writeUint8(0x50, 0);
    ecd64.writeUint8(0x4b, 1);
    ecd64.writeUint8(0x06, 2);
    ecd64.writeUint8(0x06, 3);
    // size of zip64 end of central directory (8)
    ecd64.writeBigUint64LE(BigInt(44), 4);
    // version made by (2)
    ecd64.writeUint16LE(45, 12);
    // version needed to extract (2)
    ecd64.writeUint16LE(45, 14);
    // number of this disk (4)
    ecd64.writeUint32LE(0, 16);
    // number of the disk with the start of the central directory (4)
    ecd64.writeUint32LE(0, 20);
    // total number of entries in the central directory on this disk (8)
    ecd64.writeBigUInt64LE(BigInt(this._centralFileHeaderList.length), 24);
    // total number of entries in the central directory (8)
    ecd64.writeBigUInt64LE(BigInt(this._centralFileHeaderList.length), 32);
    // size of the central directory (8)
    ecd64.writeBigUInt64LE(BigInt(this._centralDirectorySize), 40);
    // offset of start of central directory with respect to the starting disk number (8)
    ecd64.writeBigUInt64LE(BigInt(this._centralDirectoryOffset), 48);

    this._writer.write(ecd64);
  }

  private _writeZip64EndOfCentralDirectoryLocator() {
    // zip64 end of central directory locator signature (4)
    const ecdl = Buffer.alloc(20);
    ecdl.writeUint8(0x50, 0);
    ecdl.writeUint8(0x4b, 1);
    ecdl.writeUint8(0x06, 2);
    ecdl.writeUint8(0x07, 3);
    // number of the disk with the start of the zip64 end of central directory (4)
    ecdl.writeUint32LE(0, 4);
    // relative offset of the zip64 end of central directory record (8)
    ecdl.writeBigUInt64LE(BigInt(this._zip64EndOfCentralDirectoryOffset), 8);
    // total number of disks (4)
    ecdl.writeUint32LE(0, 16);

    this._writer.write(ecdl);
  }

  private _writeEndOfCentralDirectory() {
    // end of central dir signature (4)
    const ecd = Buffer.alloc(22);
    ecd.writeUint8(0x50, 0);
    ecd.writeUint8(0x4b, 1);
    ecd.writeUint8(0x05, 2);
    ecd.writeUint8(0x06, 3);
    // number of this disk (2)
    ecd.writeUint16LE(this._zip64 ? 0xffff : 0, 4);
    // number of the disk with the start of the central directory (2)
    ecd.writeUint16LE(this._zip64 ? 0xffff : 0, 6);
    // total number of entries in the central directory on this disk (2)
    ecd.writeUint16LE(
      this._zip64 ? 0xffff : this._centralFileHeaderList.length,
      8,
    );
    // total number of entries in the central directory (2)
    ecd.writeUint16LE(
      this._zip64 ? 0xffff : this._centralFileHeaderList.length,
      10,
    );
    // size of the central directory (4)
    ecd.writeUint32LE(
      this._zip64 ? 0xffffffff : this._centralDirectorySize,
      12,
    );
    // offset of start of central directory with respect to the starting disk number (4)
    ecd.writeUint32LE(
      this._zip64 ? 0xffffffff : this._centralDirectoryOffset,
      16,
    );
    // zip file comment length (2)
    ecd.writeUint16LE(0, 20);

    this._writer.write(ecd);
    this._writer.close();
  }
}
