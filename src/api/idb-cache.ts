const DB_NAME = 'pokebasic-cache'
const DB_VERSION = 1
const STORE = 'api-cache'

// TTL in milliseconds
export const TTL = {
    POKEMON:      7 * 24 * 60 * 60 * 1000,
    SPECIES:      7 * 24 * 60 * 60 * 1000,
    EVOLUTION:    7 * 24 * 60 * 60 * 1000,
    TYPE_LIST:    3 * 24 * 60 * 60 * 1000,
    POKEMON_LIST: 7 * 24 * 60 * 60 * 1000,
    ABILITY:      7 * 24 * 60 * 60 * 1000,
}

interface CacheEntry {
    key: string
    data: unknown
    expires: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE, { keyPath: 'key' })
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => {
            dbPromise = null
            reject(req.error)
        }
    })
    return dbPromise
}

export async function idbGet<T>(key: string): Promise<T | null> {
    try {
        const db = await openDB()
        return new Promise((resolve) => {
            const tx = db.transaction(STORE, 'readonly')
            const req = tx.objectStore(STORE).get(key)
            req.onsuccess = () => {
                const entry = req.result as CacheEntry | undefined
                if (!entry || Date.now() > entry.expires) resolve(null)
                else resolve(entry.data as T)
            }
            req.onerror = () => resolve(null)
        })
    } catch {
        return null
    }
}

export async function idbSet(key: string, data: unknown, ttlMs: number): Promise<void> {
    try {
        const db = await openDB()
        return new Promise((resolve) => {
            const tx = db.transaction(STORE, 'readwrite')
            tx.objectStore(STORE).put({ key, data, expires: Date.now() + ttlMs })
            tx.oncomplete = () => resolve()
            tx.onerror = () => resolve()
        })
    } catch {
        // IDB unavailable (private browsing, etc.) — fail silently
    }
}
