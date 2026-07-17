import type { SaveSlotSummary, WorldSave } from './WorldSave';

const DB_NAME = 'voxelverse-worlds';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

export class WorldSaveStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  async save(worldSave: WorldSave): Promise<void> {
    const db = await this.open();
    await this.runStoreRequest(db, 'readwrite', (store) => store.put(worldSave));
  }

  async load(slotId: string): Promise<WorldSave | null> {
    const db = await this.open();
    return this.runStoreRequest<WorldSave | undefined>(db, 'readonly', (store) => store.get(slotId))
      .then((save) => save ?? null);
  }

  async list(): Promise<SaveSlotSummary[]> {
    const db = await this.open();
    const saves = await this.runStoreRequest<WorldSave[]>(db, 'readonly', (store) => store.getAll());
    return saves
      .map((save) => ({
        slotId: save.slotId,
        name: save.name,
        updatedAt: save.updatedAt,
        playTime: save.playTime,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async delete(slotId: string): Promise<void> {
    const db = await this.open();
    await this.runStoreRequest(db, 'readwrite', (store) => store.delete(slotId));
  }

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'slotId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private runStoreRequest<T = unknown>(
    db: IDBDatabase,
    mode: IDBTransactionMode,
    createRequest: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = createRequest(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
