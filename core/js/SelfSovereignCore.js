/**
 * @fileoverview Sovereign Identity Core Engine
 * @version 1.2.2
 * @author 1D
 * @license Apache-2.0
 * @copyright © 2026 Hold"inCorp. All rights reserved.
 */

export { SelfSovereignCore as default, SelfSovereignCore };

/**
 * @class SelfSovereignCore
 * @classdesc A high-performance, deterministic cryptographic engine designed for Sovereign Identity (SSI).
 * It manages BIP-39 mnemonic persistence, deterministic key derivation (HKDF), and high-level 
 * cryptographic operations (AES-GCM, HMAC). The architecture is name-agnostic and IDE-optimized.
 */
export class SelfSovereignCore {

    /** 
     * @private
     * @static
     * @type {number} 
     * @description Default protocol version used for new identity generations.
     */
    static #PROTOCOL = 1;
    
    /** 
     * @private
     * @static
     * @type {Object<number, Object>} 
     * @description Registry of cryptographic specifications and algorithm parameters per protocol version.
     */
    static #PROTOCOLS = {
        1: {
            separator: ".",
            seedFormat: "raw",
            kdf: { name: "HKDF", hash: "SHA-256", bits: 256, salt: new Uint8Array(), size: 32 },
            signature: { import: { name: "HMAC", hash: "SHA-256" }, ops: ["sign", "verify"] },
            encryption: { name: "AES-GCM", length: 256, ivSize: 12, ops: ["encrypt", "decrypt"] },
            identifier: { hash: "SHA-256" }
        }
    };

    /** 
     * @private
     * @static
     * @type {TextEncoder} 
     * @description Global singleton instance of TextEncoder to minimize garbage collection overhead.
     */
    static #encoder = new TextEncoder();
    
    /** 
     * @private 
     * @type {Object<string, CryptoKey>} 
     * @description Secure internal storage for WebCrypto key objects (Signature, Encryption, and Master derivation).
     */
    #keys;

    /** 
     * @private 
     * @type {number} 
     * @description The protocol version version assigned to this specific instance.
     */
    #protocol;

    /** 
     * @private 
     * @type {string} 
     * @description A unique, deterministic public string representing the identity.
     */
    #publicID;

    /**
     * @constructor
     * @private
     * @param {Object} params - Configuration parameters for instance initialization.
     * @param {Object} params.keys - Mapping of initialized CryptoKeys.
     * @param {string} params.publicID - The calculated unique identifier.
     * @param {number} params.version - The protocol version used.
     * @description The constructor is private to enforce initialization via static factory methods.
     */
    constructor({ keys, publicID, version }) {
        this.#keys = keys;
        this.#publicID = publicID;
        this.#protocol = version;
        Object.freeze(this);
    }

    // --- STATIC PUBLIC PROXIES (IDE Compatibility) ---

    /** 
     * @static
     * @method encode
     * @description Encodes a string into a Uint8Array using the shared static encoder.
     * @param {string} data - The string to encode.
     * @returns {Uint8Array} The resulting byte array.
     */
    static encode(data) {
        return this.#encoder.encode(data);
    }

    /**
     * @static
     * @async
     * @method _deriveRaw
     * @description Public bridge for internal key derivation. Required to maintain 
     * private access integrity across different execution contexts in strict environments.
     * @param {CryptoKey} key - Source key for derivation.
     * @param {string} info - Context-specific information for HKDF.
     * @param {Object} config - Protocol configuration object.
     * @returns {Promise<Uint8Array>}
     */
    static async _deriveRaw(key, info, config) {
        return await this.#deriveRaw(key, info, config);
    }

    // --- STATIC ACCESSORS ---

    /** 
     * @static
     * @readonly
     * @returns {number} The current default protocol version. 
     */
    static get PROTOCOL() { return this.#PROTOCOL; }

    /** 
     * @static
     * @readonly
     * @returns {Object} All supported protocol definitions. 
     */
    static get PROTOCOLS() { return this.#PROTOCOLS; }
    
    // --- INSTANCE ACCESSORS ---

    /** 
     * @readonly
     * @returns {Object} The cryptographic parameters of the current instance. 
     */
    get curProto() { return this.constructor.PROTOCOLS[this.#protocol]; }

    /** 
     * @readonly
     * @returns {string} The identity's public identifier. 
     */
    get publicID() { return this.#publicID; }

    /** 
     * @readonly
     * @returns {number} The protocol version of this instance. 
     */
    get version() { return this.#protocol; }

    // --- STATIC PUBLIC METHODS ---

    /**
     * @static
     * @async
     * @method generate
     * @description Generates a brand new sovereign identity from high-entropy random values.
     * @param {Object} [options={}] - Generation options.
     * @param {boolean} [options.persist=false] - If true, returns the 24-word recovery mnemonic.
     * @param {number} [options.protocol] - Specify a protocol version (defaults to static #PROTOCOL).
     * @returns {Promise<SelfSovereignCore|Object>} Returns either the instance or an object containing the instance and mnemonic.
     */
    static async generate({ persist = false, protocol = this.PROTOCOL } = {}) {
        const config = this.#getSafeConfig(protocol);
        const entropy = window.crypto.getRandomValues(new Uint8Array(config.kdf.size));
        
        const instance = await this.restore(entropy, protocol);
        const mnemonic = persist ? await this.#entropyToMnemonic(entropy, config) : null;
        
        entropy.fill(0); // Security: Clear raw entropy from memory
        return persist ? { instance, mnemonic } : instance;
    }

    /**
     * @static
     * @async
     * @method restore
     * @description Reconstructs an identity from existing entropy or a BIP-39 mnemonic phrase.
     * @param {Uint8Array|string} source - 32-byte entropy array or a 24-word string.
     * @param {number} [version=1] - Protocol version for restoration.
     * @returns {Promise<SelfSovereignCore>} A frozen instance of the core.
     * @throws {Error} If checksum fails or mnemonic is invalid.
     */
    static async restore(source, version = this.PROTOCOL) {
        const config = this.#getSafeConfig(version);
        const entropy = typeof source === "string" 
            ? await this.#mnemonicToEntropy(source, config) 
            : source;

        // Import the Master Root Key from entropy
        const root = await crypto.subtle.importKey(
            config.seedFormat, entropy, { name: config.kdf.name }, false, ["deriveBits"]
        );

        // Deterministically derive specialized sub-keys (Signature, Encryption, Master)
        const [sRaw, eRaw, mRaw] = await Promise.all([
            this.#deriveRaw(root, "signature", config),
            this.#deriveRaw(root, "encryption", config),
            this.#deriveRaw(root, "master", config)
        ]);

        // Transform raw derived bits into functional WebCrypto keys
        const keys = {
            signature: await crypto.subtle.importKey(config.seedFormat, sRaw, config.signature.import, false, config.signature.ops),
            encryption: await crypto.subtle.importKey(config.seedFormat, eRaw, { name: config.encryption.name }, false, config.encryption.ops),
            master: await crypto.subtle.importKey(config.seedFormat, mRaw, { name: config.kdf.name }, false, ["deriveBits"])
        };

        const publicID = await this.#computePublicID(sRaw, config, version);
        
        // Security: Wipe raw buffers
        [sRaw, eRaw, mRaw].forEach(b => b.fill(0));
        
        return new this({ keys, publicID, version });
    }

    // --- INSTANCE PUBLIC METHODS ---

    /**
     * @async
     * @method sign
     * @description Generates a cryptographic signature for the provided data using the instance's HMAC key.
     * @param {Uint8Array|string} data - The message to sign.
     * @returns {Promise<ArrayBuffer>} The resulting signature.
     */
    async sign(data) {
        this.#check();
        const bytes = typeof data === "string" ? this.constructor.encode(data) : data;
        return await crypto.subtle.sign(this.curProto.signature.import, this.#keys.signature, bytes);
    }

    /**
     * @async
     * @method encrypt
     * @description Encrypts data using AES-GCM with an automatically generated IV.
     * @param {Uint8Array|string} data - Plaintext data.
     * @param {Uint8Array} [aad] - Additional Authenticated Data (optional).
     * @returns {Promise<Object>} Object containing ciphertext and initialization vector (iv).
     */
    async encrypt(data, aad = new Uint8Array()) {
        this.#check();
        const bytes = typeof data === "string" ? this.constructor.encode(data) : data;
        const iv = window.crypto.getRandomValues(new Uint8Array(this.curProto.encryption.ivSize));
        const ciphertext = await crypto.subtle.encrypt(
            { name: this.curProto.encryption.name, iv, additionalData: aad },
            this.#keys.encryption,
            bytes
        );
        return { ciphertext: new Uint8Array(ciphertext), iv };
    }

    /**
     * @async
     * @method decrypt
     * @description Decrypts ciphertext using the instance's AES key.
     * @param {Uint8Array} ciphertext - Encrypted bytes.
     * @param {Uint8Array} iv - The Initialization Vector used for encryption.
     * @param {Uint8Array} [aad] - Additional Authenticated Data used during encryption.
     * @returns {Promise<Uint8Array>} The original plaintext bytes.
     */
    async decrypt(ciphertext, iv, aad = new Uint8Array()) {
        this.#check();
        return new Uint8Array(await crypto.subtle.decrypt(
            { name: this.curProto.encryption.name, iv, additionalData: aad },
            this.#keys.encryption,
            ciphertext
        ));
    }

    /**
     * @async
     * @method derive
     * @description Derives a deterministic context-specific sub-key from the master key.
     * Useful for creating application-specific or module-specific keys.
     * @param {string} context - A unique string defining the key's purpose (e.g., "storage.cloud").
     * @returns {Promise<Uint8Array>} 256-bit derived key bytes.
     */
    async derive(context) {
        this.#check();
        return await this.constructor._deriveRaw(this.#keys.master, context, this.curProto);
    }

    /**
     * @method destroy
     * @description Wipes key references and identifier from memory to prevent further use.
     */
    destroy() {
        this.#keys = null;
        this.#publicID = null;
    }

    // --- PRIVATE UTILITIES (NAME-AGNOSTIC) ---

    /** 
     * @private @static
     * @description Fetches the protocol configuration safely. 
     */
    static #getSafeConfig(version) {
        const config = this.#PROTOCOLS[version];
        if (!config) throw new Error(`Protocol v${version} unsupported.`);
        return config;
    }

    /** 
     * @private @static
     * @description Core HKDF derivation logic. 
     */
    static async #deriveRaw(key, info, config) {
        const bits = await crypto.subtle.deriveBits(
            { 
                name: config.kdf.name, 
                hash: config.kdf.hash, 
                salt: config.kdf.salt, 
                info: this.encode(info) 
            },
            key, config.kdf.bits
        );
        return new Uint8Array(bits);
    }

    /** 
     * @private @static
     * @description Computes a deterministic public identifier based on the signature key hash.
     */
    static async #computePublicID(raw, config, version) {
        const hash = await crypto.subtle.digest(config.identifier.hash, raw);
        const b64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        return `${version}${config.separator}${b64}`;
    }

    /** 
     * @private @static
     * @description Lazy loads the BIP-39 wordlist from an external module.
     */
    static async #getWordList() {
        return (await import("./Bip0039.js")).Bip0039.wordList;
    }

    /** 
     * @private @static
     * @description Converts raw entropy into a BIP-39 compliant 24-word mnemonic.
     */
    static async #entropyToMnemonic(entropy, config) {
        const wordList = await this.#getWordList();
        const hash = await crypto.subtle.digest(config.kdf.hash, entropy);
        const bits = Array.from(entropy).map(b => b.toString(2).padStart(8, "0")).join("") + new Uint8Array(hash)[0].toString(2).padStart(8, "0");
        
        return bits.match(/.{1,11}/g).map(bin => wordList[parseInt(bin, 2)]).join(" ");
    }
    
    /** 
     * @private @static
     * @description Converts a 24-word mnemonic back into its original 32-byte entropy.
     */
    static async #mnemonicToEntropy(mnemonic, config) {
        const wordList = await this.#getWordList();
        const words = mnemonic.trim().split(/\s+/);
        if (words.length !== 24) throw new Error("Mnemonic must be 24 words.");

        const bits = words.map(w => {
            const index = wordList.indexOf(w);
            if (index === -1) throw new Error(`Invalid BIP-39 word: ${w}`);
            return index.toString(2).padStart(11, "0");
        }).join("");

        const entropy = new Uint8Array(32);
        for (let i = 0; i < 32; i++) entropy[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);

        const hash = await crypto.subtle.digest(config.kdf.hash, entropy);
        if (bits.slice(256) !== new Uint8Array(hash)[0].toString(2).padStart(8, "0")) {
            throw new Error("Mnemonic checksum mismatch.");
        }
        return entropy;
    }

    /** 
     * @private
     * @description Internal integrity check to ensure keys are loaded before operation.
     */
    #check() { if (!this.#keys) throw new Error("Instance destroyed or not initialized."); }
}
