# blob_store

Stores large blobs of data in IndexedDB


``` js
import BlobStore from 'blob_store'

const bs = await new BlobStore()

bs.has('keyname')
bs.get('keyname')
bs.delete('keyname')
bs.add('keyname', blob)
const onProgress = x => console.log(`${onProgress * 100}% downloaded`)
bs.fetch('keyname', 'https://url', onProgress)
```
