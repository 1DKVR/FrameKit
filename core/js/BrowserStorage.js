/**
 * @file BrowserStorage.js
 * @description Professional-grade storage toolkit for FrameKit.
 * Provides a unified interface for LocalStorage, SessionStorage, and IndexedDB.
 */

/**
 * @abstract
 * @class BrowserStorage
 * @description Abstract base class handling common logic (Namespace, TTL, JSON serialization).
 * This class cannot be instantiated directly.
 * @version 1.2.0
 * @author 1D
 * @copyright Hold'inCorp. 2026
 * @license Apache-2.0
 * @updated 26.03.08
 * @link https://developer.mozilla.org/docs/Web/API/Web_Storage_API
 */
class BrowserStorage {
    /** @private @static */
    static _namespace = "1D_Fk";

    /**
     * @throws {Error} Prevents instantiation of this abstract class.
     */
    constructor(){ throw new Error(`${this.name} is an abstract class. Use "LocalBS" or "SessionBS" instead.`) }

    /** * Read-only project branding 
     * @static
     */
    static get _author_project(){ return "[1D•KVR — FrameKit]" }
    
    /**
     * @protected 
     * @static
     * @returns {Storage} The browser's storage interface.
     */
    static get _storage(){ throw new Error(`${this._author_project} Method "_storage" must be implemented by the child class.`) }

    /**
     * Sets the global prefix and optionally migrates data.
     * @static
     * @param {string} ns - The new namespace.
     * @param {boolean} [migrate=false] - If true, moves data from the previous namespace to the new one.
     */
    static init(ns, migrate=false){
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
            console.warn(`${this._author_project} Data migrated from ${this._namespace} to ${ns}`);
        }

        this._namespace = ns;
    }

    /**
     * @private 
     * @static
     * @param {string} key 
     * @returns {string} Prefixed key.
     */
    static _prefix(key){ return `${this._namespace}_${key}` }

    /**
     * Retrieves a value. Handles TTL expiration and JSON parsing.
     * @static
     * @template T
     * @param {string} key - Unique identifier for the data.
     * @param {boolean} [full=false] - If true, returns the full wrapper object including metadata.
     * @returns {T|Object|null} Original value, full object, or null if missing/expired.
     */
    static get(key, full=false) {
        try{
            const raw = this._storage.getItem(this._prefix(key));
            if (!raw) return null;

            const entry = JSON.parse(raw);
            
            // Time-To-Live (TTL) logic
            if(entry?._expiry && Date.now() > entry._expiry){
                this.remove(key);
                return null;
            }

            // Returns unwrapped value unless 'full' is requested
            return (entry && entry._isWrapped && !full) ? entry.value : entry;
        }catch(e){
            // Fallback to raw string if JSON parsing fails
            return this._storage.getItem(this._prefix(key));
        }
    }

    /**
     * Stores data with automatic serialization and metadata.
     * @static
     * @param {string} key - Unique identifier.
     * @param {any} value - Data to store (Object, Array, Primitive).
     * @param {number|null} [ttl=null] - Lifespan in milliseconds.
     */
    static set(key, value, ttl=null){
        if (value === undefined) return;

        const payload = {
            value, // ES6 => value:value
            _isWrapped: true,
            _expiry: ttl ? Date.now()+ttl : null,
            _timestamp: Date.now()
        };

        try{
            this._storage.setItem(this._prefix(key), JSON.stringify(payload));
        }catch(e){
            if(e.name === "QuotaExceededError") console.error(`${this._author_project} Storage quota exceeded.`);
            throw e; 
        }
    }

    /**
     * Removes a specific item based on its key.
     * @static
     * @param {string} key 
     */
    static remove(key){ this._storage.removeItem(this._prefix(key)) }

    /**
     * Wipes all data belonging to the current namespace only.
     * @static
     */
    static clear(){
        const prefix = `${this._namespace}_`;
        Object.keys(this._storage).forEach(key => {
            if (key.startsWith(prefix)) this._storage.removeItem(key);
        });
    }

    /**
     * @static
     * @param {number} index 
     * @returns {string|null} Key name at specified index.
     */
    static key(index){ return this._storage.key(index) }
}

/**
 * @class LocalBS
 * @extends BrowserStorage
 * @description Static API for LocalStorage (Long-term persistence).
 * @example LocalBS.set("theme", "dark");
 */
export class LocalBS extends BrowserStorage { static get _storage(){ return window.localStorage }}

/**
 * @class SessionBS
 * @extends BrowserStorage
 * @description Static API for SessionStorage (Volatile, cleared on tab close).
 * @example SessionBS.get("session_id");
 */
export class SessionBS extends BrowserStorage { static get _storage(){ return window.sessionStorage }}


/**
 * @typedef {Object} IndexConfig
 * @property {string} name - Index name.
 * @property {string|string[]} keyPath - Data path for indexing.
 * @property {IDBIndexParameters} [options] - Options (e.g., { unique: true }).
 */

/**
 * @typedef {Object} StoreConfig
 * @property {string} [keyPath="id"] - Primary key.
 * @property {boolean} [autoIncrement=true] - Automatic key increment.
 * @property {IndexConfig[]} [indexes] - Search index configuration.
 */

/**
 * @class IndexedBS
 * @description High-performance Promise-based wrapper for IndexedDB with full Store support.
 */
export class IndexedBS {
    #db = null;
    #api = {};
    #dbName;
    #stores;
    #version;

    /**
     * Enable/Disable automatic logging for all operations.
     * @public
     */
    debug = false;

    /**
     * @param {string} dbName - Database name.
     * @param {Record<string, StoreConfig>} stores - Object store configuration.
     * @param {number} [version=1] - Database version number.
     */
    constructor(dbName, stores = {}, version = 1){
        this.#dbName = dbName;
        this.#stores = stores;
        this.#version = version;
    }

    /** @returns {Record<string, any>} CRUD API for each configured store. */
    get api(){ return this.#api }

    /**
     * Initializes connection to IndexedDB and configures stores.
     * @returns {Promise<IndexedBS>}
     */
    async open(){
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.#dbName, this.#version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                Object.entries(this.#stores).forEach(([name, config]) => {
                    if(!db.objectStoreNames.contains(name)){
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

    /** Closes the database connection cleanly. */
    close(){
        if(this.#db){
            this.#db.close();
            this.#db = null;
        }
    }

    /** @private */
    #setupAccessors(){
        Object.keys(this.#stores).forEach(name => {
            this.#api[name] = this.#createStoreInterface(name);
        });
    }

    /** @private */
    #createStoreInterface(storeName){
        const listeners = new Set();
        const getStore = (mode) => this.#db.transaction(storeName, mode).objectStore(storeName);
        
        /** @private */
        const exec = (request) => new Promise((res, rej) => {
            request.onsuccess = () => res(request.result);
            request.onerror = () => rej(request.error);
        });

        /** @private */
        const notify = (action, payload) => {
            if(this.debug){
                console.log(`%c[1D — IndexedBS Debug]%c Action [${action}] on store [${storeName}] :`, "color: #1a73e8; font-weight: bold", "color: inherit", payload);
            }
            listeners.forEach(fn => fn({ action, payload, storeName }));
        };

        return {
            /** Adds a new record. */
            add: (item) => exec(getStore("readwrite").add(item)).then(res => { notify("add", item); return res; }),
            
            /** Updates or adds a record. */
            put: (item) => exec(getStore("readwrite").put(item)).then(res => { notify("put", item); return res; }),
            
            /** Retrieves a record by its key. */
            get: (key) => exec(getStore("readonly").get(key)),
            
            /** Retrieves the key for a specific record. */
            getKey: (key) => exec(getStore("readonly").getKey(key)),
            
            /** Retrieves all records. */
            getAll: () => exec(getStore("readonly").getAll()),

            /** Counts the number of records. */
            count: () => exec(getStore("readonly").count()),
            
            /** Deletes a record by key. */
            delete: (key) => exec(getStore("readwrite").delete(key)).then(res => { notify("delete", key); return res; }),

            /** Clears all records in this specific store. */
            clear: () => exec(getStore("readwrite").clear()).then(res => { notify("clear", null); return res; }),

            /** Filters data via a cursor. */
            filter: async (predicate) => {
                const results = [];
                const store = getStore("readonly");
                return new Promise((resolve) => {
                    store.openCursor().onsuccess = (e) => {
                        const cursor = e.target.result;
                        if(cursor){
                            if (predicate(cursor.value)) results.push(cursor.value);
                            cursor.continue();
                        } else resolve(results);
                    };
                });
            },
                        
            /** * Specialized search using an index.
             * @param {string} indexName - The name of the index to use.
             * @param {any} value - The value to look for.
             */
            find: (indexName, value) => {
                const store = getStore("readonly");
                const index = store.index(indexName);
                return exec(index.get(value));
            },

            /** * Observes real-time changes on this store.
             * @param {Function} fn - Notification callback.
             * @returns {Function} Unsubscribe function.
             */
            subscribe: (fn) => {
                listeners.add(fn);
                return () => listeners.delete(fn);
            }
        };
    }
}
