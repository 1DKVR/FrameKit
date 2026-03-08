/**
 * @file Human.js
 * @description Dynamic identity resolver.
 * This module enforces authorship integrity by dynamically resolving developer and project metadata through official hosting URLs (GitHub/CDNs).
 * * Inspired by the "humans.txt" philosophy: "We are people, not machines."
 * @see https://humanstxt.org/
 * @version 1.1.0
 * @author 1D
 * @updated 2026.03.08
 * @copyright © 2026 Hold'inCorp. All rights reserved.
 */

/**
 * @class Human
 * @description Singleton utility class designed to extract and protect the developer's identity and project branding. 
 * It uses the execution context (import.meta.url) to verify that the script is running from an authorized source.
 */
class Human {
    /** * Internal metadata storage.
     * @type {Object|null} 
     * @private 
     */
    #data = null;

    /** * @static 
     * @type {Human|null}
     * @description Holds the unique instance of the Human class. 
     */
    static instance = null;

    /**
     * Constructs the Human singleton.
     * Prevents multiple instantiations and triggers the metadata resolution.
     */
    constructor() {
        if (Human.instance) return Human.instance;
        this.#data = this.#resolve();
        Human.instance = this;
    }

    /**
     * Resolves metadata from the current script URL.
     * Supports GitHub Pages and jsDelivr patterns.
     * @private
     * @returns {Object|null} The resolved metadata or null if the context is unauthorized.
     */
    #resolve() {
        const url = import.meta.url;
        try{
            let author, project;

            if(url.includes("github.io")){
                // Pattern for GitHub Pages: https://[author].github.io/[project]/...
                const urlObj = new URL(url);
                author = urlObj.hostname.split(".")[0];
                project = urlObj.pathname.split("/")[1] || null;
            }else if(url.includes("jsdelivr.net")){
                // Pattern for jsDelivr: https://cdn.jsdelivr.net/gh/[author]/[project]@...
                const pathParts = new URL(url).pathname.split("/");
                author = pathParts[2];
                project = pathParts[3].split("@")[0];
            }else{
                throw new Error("Unauthorized execution context. Script must be hosted on official GitHub or CDN mirrors.");
            }

            return {
                alias: author.substring(0, 2).toUpperCase(),
                fullName: author.substring(0, 2).toUpperCase() + author.slice(2).toLowerCase(),
                project: project,
                remote: true
            };
        }catch(error){
            console.error(`[Human — CRITICAL] ${error.message}`);
            return null;
        }
    }

    /**
     * Dynamically adapts the project name if Human.js is used as an external library.
     * @param {string} name - The name of the calling project.
     * @returns {Human} The instance for chaining.
     */
    attach(name){
        if (this.#data) this.#data.project = name;
        return this;
    }

    /**
     * Internal validator to ensure metadata is loaded before access.
     * @private
     * @throws {ReferenceError} If metadata is missing.
     */
    get _check(){
        if (!this.#data) throw new ReferenceError("Human: Metadata resolution failed.");
        return this.#data;
    }

    /** @returns {string} The developer alias (e.g., "1D"). */
    get alias(){ return this._check.alias; }

    /** @returns {string} The developer full name (e.g., "1Dkvr"). */
    get fullName(){ return this._check.fullName; }

    /** @returns {string} The current project name. */
    get project(){ return this._check.project ?? "GitHub"; }

    /** @returns {string} The complete branding signature. */
    get brand(){ return `[${this.fullName} — ${this.project}]`; }

    /** @returns {boolean} True if running from a verified remote host. */
    get isVerified(){ return this.#data?.remote === true; }

    /** @returns {string} The developer's GitHub profile URL. */
    get profile(){ return `https://github.com/${this.fullName.toLowerCase()}`; }
}

/**
 * Global identity instance: Ø1D
 * Frozen to ensure immutability and authorship protection.
 * @constant {Human}
 */
const Ø1D = new Human();
Object.freeze(Ø1D);

/**
 * Only export the unique identity identifier to avoid naming conflicts.
 */
export { Ø1D };
