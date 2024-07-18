import { openDB } from "idb";

export default class BlobStore {
  static storeName = "default";

  constructor() {
    this.db = null;
    this.downloading = false;
    this.error = null;

    return (async () => {
      this.db = await openDB("BlobStore", 1, {
        upgrade(db) {
          db.createObjectStore(BlobStore.storeName, { keyPath: "name" });
        },
      });
      return this;
    })();
  }

  async has(key) {
    return Boolean(await this.get(key));
  }

  async get(key) {
    return this.db.get(BlobStore.storeName, key);
  }

  async add(key, blob) {
    return this.db.add(BlobStore.storeName, { name: key, blob: blob });
  }

  async delete(key) {
    if (await this.has(key)) {
      await this.db.delete(BlobStore.storeName, key);
    }
    return true;
  }

  // Downloads URL and stores it as KEY in the database
  // onProgress is called with ratio of data received
  // replaces existing data at KEY
  async fetch(key, url, onProgress) {
    this.downloading = true;

    return fetch(url)
      .then(async (response) => {
        if (!response.headers.get("content-length")) {
          throw new Error(
            `response for ${url} is missing content-length header`,
          );
        }

        await this.delete(key);
        return response;
      })
      .then((response) => {
        const contentLength = response.headers.get("content-length");
        let bytesReceived = 0;
        const reader = response.body.getReader();

        return new ReadableStream({
          async start(controller) {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                console.debug("Finished downloading ", url);
                break;
              }

              controller.enqueue(value);

              bytesReceived += value.length;

              if (onProgress) {
                onProgress(bytesReceived / contentLength);
              }
            }

            controller.close();
            reader.releaseLock();
          },
        });
      })
      .then((stream) => new Response(stream))
      .then((response) => response.blob())
      .then(async (blob) => {
        await this.add(key, blob);
        this.error = null;
      })
      .then(async () => this.get(key))
      .catch((error) => {
        console.error(error);
        this.error = error.message;
      })
      .finally(() => {
        this.downloading = false;
      });
  }
}
