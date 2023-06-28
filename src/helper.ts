import { createReadStream, createWriteStream } from 'node:fs';
import { Readable, Writable } from 'node:stream';
import { TextEncoder } from 'node:util';
import { ReadableStream, WritableStream } from 'node:stream/web';

const _Writable = Writable as unknown as (Writable & { toWeb: (ws: Writable) => WritableStream<Uint8Array> });

export function createReadableStreamFromString(data: string) {
  return createReadableStreamFromUint8Array(new TextEncoder().encode(data));
}

export function createReadableStreamFromUint8Array(data: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
}

export function openReadableStream(name: string) {
  const rs = createReadStream(name);
  return { close: rs.close.bind(rs), stream: Readable.toWeb(rs) };
}

export function openWritableStream(name: string) {
  return _Writable.toWeb(createWriteStream(name));
}
