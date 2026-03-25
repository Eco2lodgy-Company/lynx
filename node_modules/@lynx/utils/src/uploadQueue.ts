/**
 * Offline upload queue management for mobile apps
 * Stores failed requests (like photo uploads) and retries them when online.
 */

// A simple in-memory queue for now. On mobile, this will be backed by AsyncStorage.
export type QueueItem = {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body: any;
  timestamp: number;
  retryCount: number;
};

export interface OfflineStorage {
  getItems: () => Promise<QueueItem[]>;
  setItems: (items: QueueItem[]) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  addItem: (item: QueueItem) => Promise<void>;
}

let _storage: OfflineStorage | null = null;
let _isOnline = true;

export function setOfflineStorage(storage: OfflineStorage) {
  _storage = storage;
}

export function setOnlineStatus(isOnline: boolean) {
  _isOnline = isOnline;
  if (isOnline) {
    processQueue();
  }
}

export async function enqueueRequest(req: Omit<QueueItem, "id" | "timestamp" | "retryCount">) {
  if (!_storage) throw new Error("OfflineStorage not configured");

  const item: QueueItem = {
    ...req,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    retryCount: 0,
  };

  await _storage.addItem(item);
  console.log(`[OfflineQueue] Request enqueued: ${item.id}`);

  if (_isOnline) {
    processQueue();
  }
}

export async function processQueue() {
  if (!_storage || !_isOnline) return;

  const items = await _storage.getItems();
  if (items.length === 0) return;

  console.log(`[OfflineQueue] Processing ${items.length} items...`);

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body, // In reality, FormData needs special serialization for AsyncStorage
      });

      if (response.ok) {
        await _storage.removeItem(item.id);
        console.log(`[OfflineQueue] Successfully processed: ${item.id}`);
      } else {
        throw new Error(`HTTP Error: ${response.status}`);
      }
    } catch (error) {
      console.error(`[OfflineQueue] Failed to process ${item.id}, will retry later`, error);
      // We keep it in the queue for the next online event
    }
  }
}
