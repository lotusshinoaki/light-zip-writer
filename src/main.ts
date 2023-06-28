import { openReadableStream, openWritableStream } from './helper.js';
import { ZipWriter } from './zip-writer.js';

async function main() {
  if (process.argv.length < 4) {
    console.log();
    console.log('node build/src/main.js output_zip input_file1 [input_file2 ...]');
    console.log();
    process.exitCode = 1;
    return;
  }

  const ws = openWritableStream(process.argv[2]);
  try {
    const zw = new ZipWriter(ws);
    try {
      for (let i = 3; i < process.argv.length; i++) {
        const name = process.argv[i];
        const { close: rsClose, stream: rs } = openReadableStream(name);
        try {
          await zw.writeFile(name, rs);
        } finally {
          rsClose();
        }
      }
    } finally {
      await zw.close();
    }
  } finally {
    ws.close();
  }
}

main();
