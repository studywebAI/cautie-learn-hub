export class CacheService {
  private static DB_NAME = 'cautie-cache';
  private static VERSION = 1;
  
  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CacheService.DB_NAME, CacheService.VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('ttl', 'ttl', { unique: false });
        }
      };
    });
  }
  
  async set(key: string, data: any, ttl: number = 3600000): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction(['cache'], 'readwrite');
    tx.objectStore('cache').put({
      key,
      data,
      timestamp: Date.now(),
      ttl
    });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  async get(key: string): Promise<any | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['cache'], 'readonly');
      const request = tx.objectStore('cache').get(key);
      request.onsuccess = () => {
        const cached = request.result;
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          resolve(cached.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async delete(key: string): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction(['cache'], 'readwrite');
    tx.objectStore('cache').delete(key);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  async clearExpired(): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction(['cache'], 'readwrite');
    const store = tx.objectStore('cache');
    const index = store.index('timestamp');
    const now = Date.now();
    
    // Delete expired entries
    const request = index.openCursor();
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const cached = cursor.value;
        if (now - cached.timestamp >= cached.ttl) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  async clearAll(): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction(['cache'], 'readwrite');
    tx.objectStore('cache').clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
