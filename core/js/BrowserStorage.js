/**
 * @file BrowserStorage.js
 * @description Professional-grade storage toolkit for Web Applications. Provides a unified, high-level interface for LocalStorage, SessionStorage, and IndexedDB. Implements advanced features: Namespacing, TTL (Time-To-Live), and Proxy-based IndexedDB CRUD.
 * @version 1.5.1628
 * @author 1D
 * @copyright © 2026 Hold'inCorp. All rights reserved.
 * @license Apache-2.0
 */

import Ø1D from "../../Humans.js";

/**
 * @abstract
 * @class BrowserStorage
 * @description Abstract base class handling common storage logic (Namespace, TTL, JSON serialization). This class serves as a blueprint and cannot be instantiated directly.
 * @see {@link https://developer.mozilla.org/docs/Web/API/Web_Storage_API}
 */
class BrowserStorage {
    /**
     * @private 
     * @static 
     * @type {string} 
     * @description Current operational namespace for key prefixing to prevent collisions.
     */
    static _namespace = `${Ø1D.alias}—${Ø1D.project}`;

    /**
     * @constructor
     * @throws {Error} Prevents instantiation of this abstract class.
     */
    constructor() { 
        throw new Error(`${this.constructor.name} is an abstract class. Use "LocalBS" or "SessionBS" instead.`);
    }

    /**
     * @static
     * @returns {string} The project brand name for logging and headers.
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
     * @static
     * @public
     * @param {string} ns - The new namespace string.
     * @param {boolean} [migrate=false] - If true, moves all data from the old namespace to the new one.
     * @description Reconfigures the global namespace and optionally migrates existing data.
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
     * @private 
     * @static
     * @param {string} key - The raw key name.
     * @returns {string} The prefixed key (namespace_key).
     * @description Internal key formatter.
     */
    static _prefix(key) { return `${this._namespace}_${key}`; }

    /**
     * @static
     * @public
     * @template T
     * @param {string} key - Unique identifier for the data.
     * @param {boolean} [full=false] - If true, returns the metadata wrapper (expiry, timestamp).
     * @returns {T|Object|null} The original value, the full wrapper, or null if expired/missing.
     * @description Retrieves a value from storage. Automatically handles TTL expiration and JSON decoding.
     */
    static get(key, full = false) {
        try {
            const raw = this._storage.getItem(this._prefix(key));
            if (!raw) return null;

            const entry = JSON.parse(raw);
            
            if (entry?._expiry && Date.now() > entry._expiry) {
                this.remove(key);
                return null;
            }

            return (entry && entry._isWrapped && !full) ? entry.value : entry;
        } catch (e) {
            return this._storage.getItem(this._prefix(key));
        }
    }

    /**
     * @static
     * @public
     * @param {string} key - Unique identifier.
     * @param {any} value - Data to store (Object, Array, Primitive).
     * @param {number|null} [ttl=null] - Optional lifespan in milliseconds from now.
     * @throws {QuotaExceededError} If browser storage limits are reached.
     * @description Stores data with automatic JSON serialization and metadata wrapping.
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
     * @static
     * @public
     * @param {string} key - The identifier to remove.
     * @description Removes a specific item from the storage using the current namespace.
     */
    static remove(key) { this._storage.removeItem(this._prefix(key)); }

    /**
     * @static
     * @public
     * @description Clears all data associated with the current namespace prefix.
     */
    static clear() {
        const prefix = `${this._namespace}_`;
        Object.keys(this._storage).forEach(key => {
            if (key.startsWith(prefix)) this._storage.removeItem(key);
        });
    }

    /**
     * @static
     * @public
     * @param {number} index - Integer representing the index of the key.
     * @returns {string|null} The key name.
     * @description Returns the name of the nth key in the storage.
     */
    static key(index) { return this._storage.key(index); }
}

/**
 * @class LocalBS
 * @extends BrowserStorage
 * @description Persistent Storage API (LocalStorage). Data survives browser restarts.
 */
export class LocalBS extends BrowserStorage { 
    static get _storage() { return window.localStorage; }
}

/**
 * @class SessionBS
 * @extends BrowserStorage
 * @description Volatile Storage API (SessionStorage). Data is cleared when the tab/window is closed.
 */
export class SessionBS extends BrowserStorage { 
    static get _storage() { return window.sessionStorage; }
}

/**
 * @typedef {Object} IndexConfig
 * @property {string} name - The name of the index.
 * @property {string|string[]} keyPath - The path to the data to be indexed.
 * @property {IDBIndexParameters} [options] - Standard IDBIndex options.
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
 * Optimized for connection lifecycle management and real-time subscription support.
 * * @example
 * // PROFESSIONAL IMPLEMENTATION: E-Commerce Inventory Management
 * const STORE_SCHEMA = {
 *     products: {
 *         keyPath: "sku", // Unique Stock Keeping Unit
 *         autoIncrement: false,
 *         indexes: [
 *             { name: "by_category", keyPath: "category", options: { unique: false } },
 *             { name: "by_status", keyPath: "status", options: { unique: false } }
 *         ]
 *     },
 *     logs: { keyPath: "id", autoIncrement: true }
 * };
 * const inventoryDB = new IndexedBS("WarehouseManager", STORE_SCHEMA, 1);
 * await inventoryDB.open();
 * 
 * // 1. Adding a premium product
 * await inventoryDB.api.products.put({ 
 *     sku: "TECH-MBP-2026", 
 *     name: "MacBook Pro M5", 
 *     category: "Laptops", 
 *     stock: 42,
 *     status: "active" 
 * });
 *
 * // 2. High-speed lookup by category index
 * const laptops = await inventoryDB.api.products.find("by_category", "Laptops");
 * 
 * // 3. Real-time Subscription for UI updates
 * inventoryDB.api.products.subscribe(({ action, payload }) => {
 *     if (action === "put" && payload.stock < 5) alert(`Low stock warning for ${payload.sku}!`);
 * });
 */
export class IndexedBS {
    /** @private @type {IDBDatabase|null} */
    #db = null;
    /** @private @type {Record<string, any>} */
    #api = {};
    /** @private @type {string} */
    #dbName;
    /** @private @type {Record<string, StoreConfig>} */
    #stores;
    /** @private @type {number} */
    #version;
    /** @private @type {Function} */
    #unloadHandler;

    /**
     * @public
     * @type {boolean}
     * @description Toggles verbose logging for debugging purposes.
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
        this.#unloadHandler = () => this.close();
    }

    /**
     * @public
     * @returns {Record<string, any>} CRUD interfaces for configured stores. 
     * @description Dynamic accessors generated for each Object Store after open().
     */
    get api() { return this.#api; }

    /**
     * @public
     * @returns {Promise<IndexedBS>}
     * @description Establishes connection to IndexedDB. Handles schema upgrades and lifecycle guards.
     */
    async open() {
        if (this.#db) return this;

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

                // Lifecycle Guard: Auto-close on version change to avoid blocking
                this.#db.onversionchange = () => {
                    this.close();
                    if (this.debug) console.warn(`[${Ø1D.brand}] Connection closed due to external upgrade.`);
                };

                // Lifecycle Guard: Auto-close on tab close/refresh to prevent "Database blocked"
                window.addEventListener('beforeunload', this.#unloadHandler);

                this.#setupAccessors();
                resolve(this);
            };

            request.onerror = () => reject(request.error);
            request.onblocked = () => console.warn(`[${Ø1D.brand}] Connection blocked by another tab.`);
        });
    }

    /**
     * @public
     * @description Gracefully closes the active database connection and removes lifecycle listeners.
     */
    close() {
        if (this.#db) {
            this.#db.close();
            this.#db = null;
            window.removeEventListener('beforeunload', this.#unloadHandler);
            if (this.debug) console.log(`[${Ø1D.brand}] IndexedDB connection closed.`);
        }
    }

    /**
     * @private 
     * @description Internal setup to generate store interfaces based on config.
     */
    #setupAccessors() {
        Object.keys(this.#stores).forEach(name => {
            this.#api[name] = this.#createStoreInterface(name);
        });
    }

    /**
     * @private 
     * @param {string} storeName 
     * @returns {Object} The CRUD interface for the store.
     * @description Factory for creating CRUD operations for a specific store.
     */
    #createStoreInterface(storeName) {
        const listeners = new Set();
        
        /** @private */
        const getStore = (mode) => {
            if (!this.#db) throw new Error("Database connection is closed.");
            return this.#db.transaction(storeName, mode).objectStore(storeName);
        };
        
        /** @private */
        const exec = (request) => new Promise((res, rej) => {
            request.onsuccess = () => res(request.result);
            request.onerror = () => rej(request.error);
        });

        /** @private */
        const notify = (action, payload) => {
            if (this.debug) {
                console.log(`%c[${Ø1D.brand} — ${this.constructor.name} Debug]%c Action [${action}] on store [${storeName}] :`, "color: #1a73e8; font-weight: bold", "color: inherit", payload);
            }
            listeners.forEach(fn => fn({ action, payload, storeName }));
        };

        return {
            /**
             * @param {any} item 
             * @returns {Promise<any>}
             * @description Adds a new record. Fails if key already exists.
             */
            add: (item) => exec(getStore("readwrite").add(item)).then(res => { notify("add", item); return res; }),
            
            /**
             * @param {any} item 
             * @returns {Promise<any>}
             * @description Adds or updates a record (upsert).
             */
            put: (item) => exec(getStore("readwrite").put(item)).then(res => { notify("put", item); return res; }),
            
            /**
             * @param {any} key 
             * @returns {Promise<any>}
             * @description Retrieves a record by its primary key.
             */
            get: (key) => exec(getStore("readonly").get(key)),
            
            /**
             * @param {any} key 
             * @returns {Promise<any>}
             * @description Retrieves only the key of a record.
             */
            getKey: (key) => exec(getStore("readonly").getKey(key)),
            
            /**
             * @returns {Promise<any[]>}
             * @description Retrieves all records from the store.
             */
            getAll: () => exec(getStore("readonly").getAll()),

            /**
             * @returns {Promise<number>}
             * @description Returns the total number of records in the store.
             */
            count: () => exec(getStore("readonly").count()),
            
            /**
             * @param {any} key 
             * @returns {Promise<void>}
             * @description Deletes a record by its primary key.
             */
            delete: (key) => exec(getStore("readwrite").delete(key)).then(res => { notify("delete", key); return res; }),

            /**
             * @returns {Promise<void>}
             * @description Wipes all records in this specific store.
             */
            clear: () => exec(getStore("readwrite").clear()).then(res => { notify("clear", null); return res; }),

            /**
             * @param {Function} predicate - Condition (item => boolean).
             * @returns {Promise<any[]>}
             * @description Scans the store using a cursor and returns items matching the predicate.
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
             * @param {string} indexName 
             * @param {any} value 
             * @returns {Promise<any>}
             * @description Performs a high-speed search using a configured index.
             */
            find: (indexName, value) => {
                const store = getStore("readonly");
                const index = store.index(indexName);
                return exec(index.get(value));
            },

            /**
             * @param {Function} fn - Callback receiving {action, payload, storeName}.
             * @returns {Function} Unsubscribe function.
             * @description Subscribes to write operations (add, put, delete, clear) on this store.
             */
            subscribe: (fn) => {
                listeners.add(fn);
                return () => listeners.delete(fn);
            }
        };
    }
}
