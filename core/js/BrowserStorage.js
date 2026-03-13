/**
 * @file BrowserStorage.js
 * @description Professional-grade storage toolkit for Web Applications. Provides a unified, high-level interface for LocalStorage, SessionStorage, and IndexedDB. Implements advanced features: Namespacing, TTL (Time-To-Live), and Proxy-based IndexedDB CRUD.
 * @version 1.3.1119
 * @author 1D
 * @copyright © 2026 Hold'inCorp. All rights reserved.
 * @license Apache-2.0
 */

import Ø1D from "../../Humans.js";

/**
 * @abstract
 * @class BrowserStorage
 * @description Abstract base class handling common storage logic (Namespace, TTL, JSON serialization).
 * This class serves as a blueprint and cannot be instantiated directly.
 * @link https://developer.mozilla.org/docs/Web/API/Web_Storage_API
 */
class BrowserStorage {
    /**
     * @private 
     * @static 
     * @type {string} Current operational namespace for key prefixing.
     */
    static _namespace = `${Ø1D.alias}—${Ø1D.project}`;

    /**
     * @constructor
     * @throws {Error} Prevents instantiation of this abstract class.
     */
    constructor() { 
        throw new Error(`${this.name} is an abstract class. Use "LocalBS" or "SessionBS" instead.`);
    }

    /**
     * Read-only branding identifier.
     * @static
     * @returns {string} The project brand name.
     */
    static get _author_project() { return Ø1D.brand; }
    
    /**
     * @abstract
     * @protected 
     * @static
     * @returns {Storage} The browser's storage interface (localStorage or sessionStorage).
     * @throws {Error} If not implemented by the child class.
     */
    static get _storage() { 
        throw new Error(`[${this._author_project}] Method "_storage" must be implemented by the child class.`);
    }

    /**
     * Reconfigures the global namespace and optionally migrates existing data.
     * @static
     * @public
     * @param {string} ns - The new namespace string.
     * @param {boolean} [migrate=false] - If true, moves all data from the old namespace to the new one.
     */
    static init(ns, migrate = false) {
        if (ns === this._namespace) return;
        
        if (migrate) {
            const oldPrefix = `${this._namespace}_`;
            const newPrefix = `${ns}_`;
            
            Object.keys(this._storage).forEach(key => {
                if (key.startsWith(oldPrefix)) {
                    const data = this._storage.getItem(key);
                    const newKey = key.replace(oldPrefix, newPrefix);
                    this._storage.setItem(newKey, data);
                    this._storage.removeItem(key);
                }
            });
            console.warn(`[${this._author_project}] Data migrated from ${this._namespace} to ${ns}`);
        }

        this._namespace = ns;
    }

    /**
     * Internal key formatter.
     * @private 
     * @static
     * @param {string} key - The raw key name.
     * @returns {string} The prefixed key (namespace_key).
     */
    static _prefix(key) { return `${this._namespace}_${key}`; }

    /**
     * Retrieves a value from storage. Automatically handles TTL expiration and JSON decoding.
     * @static
     * @public
     * @template T
     * @param {string} key - Unique identifier for the data.
     * @param {boolean} [full=false] - If true, returns the metadata wrapper (expiry, timestamp).
     * @returns {T|Object|null} The original value, the full wrapper, or null if expired/missing.
     */
    static get(key, full = false) {
        try {
            const raw = this._storage.getItem(this._prefix(key));
            if (!raw) return null;

            const entry = JSON.parse(raw);
            
            // Time-To-Live (TTL) logic: Check if current date exceeds expiry timestamp
            if (entry?._expiry && Date.now() > entry._expiry) {
                this.remove(key);
                return null;
            }

            // Returns unwrapped value unless the 'full' metadata object is explicitly requested
            return (entry && entry._isWrapped && !full) ? entry.value : entry;
        } catch (e) {
            // Fallback: If JSON is corrupted or was stored as raw string, return as-is
            return this._storage.getItem(this._prefix(key));
        }
    }

    /**
     * Stores data with automatic JSON serialization and metadata wrapping.
     * @static
     * @public
     * @param {string} key - Unique identifier.
     * @param {any} value - Data to store (Object, Array, Primitive).
     * @param {number|null} [ttl=null] - Optional lifespan in milliseconds from now.
     * @throws {QuotaExceededError} If browser storage limits are reached.
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
            this._storage.setItem(this._prefix(key), JSON.stringify(payload));
        } catch (e) {
            if (e.name === "QuotaExceededError") {
                console.error(`[${this._author_project}] Storage quota exceeded.`);
            }
            throw e; 
        }
    }

    /**
     * Removes a specific item from the storage using the current namespace.
     * @static
     * @public
     * @param {string} key - The identifier to remove.
     */
    static remove(key) { this._storage.removeItem(this._prefix(key)); }

    /**
     * Clears all data associated with the current namespace prefix.
     * Other application data remains untouched.
     * @static
     * @public
     */
    static clear() {
        const prefix = `${this._namespace}_`;
        Object.keys(this._storage).forEach(key => {
            if (key.startsWith(prefix)) this._storage.removeItem(key);
        });
    }

    /**
     * Returns the name of the nth key in the storage.
     * @static
     * @public
     * @param {number} index - Integer representing the index of the key.
     * @returns {string|null}
     */
    static key(index) { return this._storage.key(index); }
}

/**
 * @class LocalBS
 * @extends BrowserStorage
 * @description Persistent Storage API (LocalStorage). Data survives browser restarts.
 * @example LocalBS.set("user_settings", { theme: "dark" }, 3600000); // Expires in 1h
 */
export class LocalBS extends BrowserStorage { 
    static get _storage() { return window.localStorage; }
}

/**
 * @class SessionBS
 * @extends BrowserStorage
 * @description Volatile Storage API (SessionStorage). Data is cleared when the tab/window is closed.
 * @example SessionBS.set("temp_token", "abc-123");
 */
export class SessionBS extends BrowserStorage { 
    static get _storage() { return window.sessionStorage; }
}

/**
 * @typedef {Object} IndexConfig
 * @property {string} name - The name of the index.
 * @property {string|string[]} keyPath - The path to the data to be indexed.
 * @property {IDBIndexParameters} [options] - Standard IDBIndex options (e.g., { unique: true }).
 */

/**
 * @typedef {Object} StoreConfig
 * @property {string} [keyPath="id"] - The primary key path.
 * @property {boolean} [autoIncrement=true] - Whether the key should automatically increment.
 * @property {IndexConfig[]} [indexes] - List of search indexes to create.
 */

/**
 * @class IndexedBS
 * @description High-performance Promise-based wrapper for IndexedDB.
 * Provides a simplified CRUD API for multiple Object Stores with real-time subscription support.
 */
export class IndexedBS {
    /** @private */ #db = null;
    /** @private */ #api = {};
    /** @private */ #dbName;
    /** @private */ #stores;
    /** @private */ #version;

    /**
     * Toggles verbose logging for debugging purposes.
     * @public
     * @type {boolean}
     */
    debug = false;

    /**
     * @constructor
     * @param {string} dbName - The database name.
     * @param {Record<string, StoreConfig>} stores - Configuration for Object Stores.
     * @param {number} [version=1] - Schema version number.
     */
    constructor(dbName, stores = {}, version = 1) {
        this.#dbName = dbName;
        this.#stores = stores;
        this.#version = version;
    }

    /**
     * Dynamic accessors for each Object Store.
     * @public
     * @returns {Record<string, any>} CRUD interfaces for configured stores. 
     */
    get api() { return this.#api; }

    /**
     * Establishes connection to IndexedDB and performs schema upgrades if necessary.
     * @public
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

    /**
     * Gracefully closes the active database connection.
     * @public
     */
    close() {
        if (this.#db) {
            this.#db.close();
            this.#db = null;
        }
    }

    /**
     * Internal setup to generate store interfaces based on config.
     * @private 
     */
    #setupAccessors() {
        Object.keys(this.#stores).forEach(name => {
            this.#api[name] = this.#createStoreInterface(name);
        });
    }

    /**
     * Factory for creating CRUD operations for a specific store.
     * @private 
     * @param {string} storeName 
     */
    #createStoreInterface(storeName) {
        const listeners = new Set();
        const getStore = (mode) => this.#db.transaction(storeName, mode).objectStore(storeName);
        
        /**
         * Standard Promise wrapper for IDBRequest.
         * @private 
         */
        const exec = (request) => new Promise((res, rej) => {
            request.onsuccess = () => res(request.result);
            request.onerror = () => rej(request.error);
        });

        /**
         * Internal notification and debug logging dispatcher.
         * @private 
         */
        const notify = (action, payload) => {
            if (this.debug) {
                console.log(`%c[${Ø1D.brand} — IndexedBS Debug]%c Action [${action}] on store [${storeName}] :`, "color: #1a73e8; font-weight: bold", "color: inherit", payload);
            }
            listeners.forEach(fn => fn({ action, payload, storeName }));
        };

        return {
            /**
             * Adds a new record. Fails if key already exists.
             * @param {any} item 
             * @returns {Promise<any>} The key of the new record.
             */
            add: (item) => exec(getStore("readwrite").add(item)).then(res => { notify("add", item); return res; }),
            
            /**
             * Adds or updates a record.
             * @param {any} item 
             * @returns {Promise<any>} The key of the record.
             */
            put: (item) => exec(getStore("readwrite").put(item)).then(res => { notify("put", item); return res; }),
            
            /**
             * Retrieves a record by its primary key.
             * @param {any} key 
             * @returns {Promise<any>}
             */
            get: (key) => exec(getStore("readonly").get(key)),
            
            /**
             * Retrieves only the key of a record.
             * @param {any} key 
             * @returns {Promise<any>}
             */
            getKey: (key) => exec(getStore("readonly").getKey(key)),
            
            /**
             * Retrieves all records from the store.
             * @returns {Promise<any[]>}
             */
            getAll: () => exec(getStore("readonly").getAll()),

            /**
             * Returns the total number of records in the store.
             * @returns {Promise<number>}
             */
            count: () => exec(getStore("readonly").count()),
            
            /**
             * Deletes a record by its primary key.
             * @param {any} key 
             * @returns {Promise<void>}
             */
            delete: (key) => exec(getStore("readwrite").delete(key)).then(res => { notify("delete", key); return res; }),

            /**
             * Wipes all records in this specific store.
             * @returns {Promise<void>}
             */
            clear: () => exec(getStore("readwrite").clear()).then(res => { notify("clear", null); return res; }),

            /**
             * Scans the store using a cursor and returns items matching the predicate.
             * @param {Function} predicate - Condition (item => boolean).
             * @returns {Promise<any[]>}
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
                        
            /**
             * Performs a high-speed search using a configured index.
             * @param {string} indexName 
             * @param {any} value 
             * @returns {Promise<any>}
             */
            find: (indexName, value) => {
                const store = getStore("readonly");
                const index = store.index(indexName);
                return exec(index.get(value));
            },

            /**
             * Subscribes to write operations (add, put, delete, clear) on this store.
             * @param {Function} fn - Callback receiving {action, payload, storeName}.
             * @returns {Function} Unsubscribe function.
             */
            subscribe: (fn) => {
                listeners.add(fn);
                return () => listeners.delete(fn);
            }
        };
    }
}
