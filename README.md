# light-zip-writer

Create a zip (uncompressed) in one pass.

* Minimal memory requirements.
* ZIP64 compatible.

## Example

```
const zw = new ZipWriter('example.zip');
try {
  zw.writeFile('a.txt', Buffer.from('aaaaa'));
  zw.writeFile('b.txt', Buffer.from('bbbbb'));
} finally {
  zw.close();
}
```
