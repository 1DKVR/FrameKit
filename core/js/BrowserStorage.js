/**
 * @file BrowserStorage.js
 * @description A professional-grade, zero-dependency wrapper for LocalStorage, SessionStorage, and IndexedDB.
 * Features: Automatic JSON serialization, TTL (Time-To-Live) support, Reactive listeners, and a simplified Promise-based IndexedDB API.
 */

/**
 * @abstract
 * @class BrowserStorage
 * @description Base class providing unified logic for Synchronous Web Storage (Local/Session).
 * @version 1.0.0
 * @author 1D
 * @copyright Hold'inCorp. 2026
 * @license Apache-2.0
 * @updated 26.03.07
 * @link https://developer.mozilla.org/docs/Web/API/Web_Storage_API
 */
class BrowserStorage {
    /**
     * @protected
     * @throws {Error} If called directly without implementation 
     */
    static get _storage() {
        throw new Error(`Method "_storage" must be implemented in ${this.name}`);
    }

    /** @returns {number} The total number of items stored. */
    static get size() { return this._storage.length; }

    /**
     * Retrieves and parses data from storage.
     * Automatically handles expired items based on TTL.
     * * @example
     * const user = LocalBS.get('user_profile');
     * * @template T
     * @param {string} key - The unique identifier.
     * @returns {T|null} The parsed value or null if not found/expired.
     */
    static get(key) {
        try {
            const raw = this._storage.getItem(key);
            if (!raw) return null;

            const entry = JSON.parse(raw);
            
            // Logic for Time-To-Live (TTL)
            if (entry?._expiry && Date.now() > entry._expiry) {
                this.remove(key);
                return null;
            }

            // Returns value if wrapped (with metadata), otherwise returns raw entry
            return entry?._isWrapped ? entry.value : entry;
        } catch (e) {
            console.error(`[BrowserStorage] Parsing error for key "${key}":`, e);
            return null;
        }
    }

    /**
     * Stores any data type as a JSON string.
     * * @example
     * // Store indefinitely
     * LocalBS.set('theme', 'dark');
     * // Store with 1-hour expiration (3600000 ms)
     * LocalBS.set('session_token', 'XYZ123', 3600000);
     * * @param {string} key - Storage key.
     * @param {any} value - Data to store (Object, Array, String, etc.).
     * @param {number|null} [ttl=null] - Optional lifespan in milliseconds.
     */
    static set(key, value, ttl = null) {
        if (value === undefined) return;

        const payload = {
            value,
            _isWrapped: true,
            _expiry: ttl ? Date.now() + ttl : null,
            _timestamp: Date.now()
        };

        try {
            this._storage.setItem(key, JSON.stringify(payload));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('[BrowserStorage] Critical: Storage quota exceeded.');
            }
            throw e;
        }
    }

    /**
     * Removes a specific item.
     * @param {string} key 
     */
    static remove(key) { this._storage.removeItem(key); }

    /** Wipes all data from this storage instance. */
    static clear() { this._storage.clear(); }

    /**
     * @param {number} index 
     * @returns {string|null} The key name at the given index.
     */
    static key(index) { return this._storage.key(index); }
}

/**
 * @class LocalBS
 * @extends BrowserStorage
 * @description Wrapper for persistent LocalStorage.
 * @link https://developer.mozilla.org/docs/Web/API/Window/localStorage
 */
class LocalBS extends BrowserStorage { static get _storage() { return localStorage; } }

/**
 * @class SessionBS
 * @extends BrowserStorage
 * @description Wrapper for volatile SessionStorage (cleared on tab close).
 * @link https://developer.mozilla.org/docs/Web/API/Window/sessionStorage
 */
class SessionBS extends BrowserStorage { static get _storage() { return sessionStorage; } }


// --- INDEXEDDB IMPLEMENTATION ---

/**
 * @typedef {Object} IndexConfig
 * @property {string} name - Index name.
 * @property {string|string[]} keyPath - Field(s) to index.
 * @property {IDBIndexParameters} [options] - Unique, multiEntry, etc.
 */

/**
 * @typedef {Object} StoreConfig
 * @property {string} [keyPath="id"] - Primary key.
 * @property {boolean} [autoIncrement=true] - Enable auto-ID.
 * @property {IndexConfig[]} [indexes] - List of indexes to create.
 */

/**
 * @class IndexedBS
 * @description High-performance, Promise-based IndexedDB wrapper with reactive listeners.
 * @link https://developer.mozilla.org/docs/Web/API/IndexedDB_API
 */
class IndexedBS {
    #db = null;
    #api = {};
    #dbName;
    #stores;
    #version;

    /**
     * @param {string} dbName - Database name.
     * @param {Record<string, StoreConfig>} stores - Config for each Object Store.
     * @param {number} [version=1] - Database version.
     */
    constructor(dbName, stores = {}, version = 1) {
        this.#dbName = dbName;
        this.#stores = stores;
        this.#version = version;
    }

    /** @returns {Record<string, any>} Simplified CRUD API for each store. */
    get api() { return this.#api; }

    /**
     * Establishes connection and manages store migrations.
     * @returns {Promise<IndexedBS>}
     */
    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.#dbName, this.#version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                Object.entries(this.#stores).forEach(([name, config]) => {
                    if (!db.objectStoreNames.contains(name)) {
                        const store = db.createObjectStore(name, {
                            keyPath: config.keyPath || "id",
                            autoIncrement: config.autoIncrement ?? true
                        });
                        config.indexes?.forEach(idx => 
                            store.createIndex(idx.name, idx.keyPath, idx.options || {})
                        );
                    }
                });
            };

            request.onsuccess = (event) => {
                this.#db = event.target.result;
                this.#setupAccessors();
                resolve(this);
            };

            request.onerror = () => reject(request.error);
        });
    }

    #setupAccessors() {
        Object.keys(this.#stores).forEach(name => {
            this.#api[name] = this.#createStoreInterface(name);
        });
    }

    #createStoreInterface(storeName) {
        const listeners = new Set();
        const getStore = (mode) => this.#db.transaction(storeName, mode).objectStore(storeName);
        const exec = (request) => new Promise((res, rej) => {
            request.onsuccess = () => res(request.result);
            request.onerror = () => rej(request.error);
        });

        const notify = (action, payload) => listeners.forEach(fn => fn({ action, payload, storeName }));

        return {
            /** Add a new record (fails if key exists). */
            add: async (item) => {
                const res = await exec(getStore("readwrite").add(item));
                notify("add", item);
                return res;
            },
            /** Add or Update a record. */
            put: async (item) => {
                const res = await exec(getStore("readwrite").put(item));
                notify("put", item);
                return res;
            },
            /** Get record by key. */
            get: (key) => exec(getStore("readonly").get(key)),
            /** Get all records from store. */
            getAll: () => exec(getStore("readonly").getAll()),
            /** Delete record by key. */
            delete: async (key) => {
                const res = await exec(getStore("readwrite").delete(key));
                notify("delete", key);
                return res;
            },
            /** * Cursor-based filter for large datasets.
             * @param {function(any):boolean} predicate - Filter condition.
             */
            filter: async (predicate) => {
                const results = [];
                const store = getStore("readonly");
                return new Promise((resolve) => {
                    store.openCursor().onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            if (predicate(cursor.value)) results.push(cursor.value);
                            cursor.continue();
                        } else resolve(results);
                    };
                });
            },
            /** * Observe changes in this store.
             * @param {Function} fn - Callback function.
             * @returns {Function} Unsubscribe function.
             */
            subscribe: (fn) => {
                listeners.add(fn);
                return () => listeners.delete(fn);
            }
        };
    }
}
