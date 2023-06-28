# light-zip-writer

Create a zip (uncompressed) demo.

* ZIP64 compatible.

## Example

```
const zw = new ZipWriter('example.zip');
try {
  zw.writeFile('a.txt', createReadableStreamFromString('aaaaa'));
  zw.writeFile('b.txt', createReadableStreamFromString('bbbbb'));
} finally {
  zw.close();
}
```
