/**
 * @file Human.js
 * @description Dynamic identity resolver for authorship integrity. This module dynamically resolves developer, project, and branch metadata based on the execution context. Inspired by the "humans.txt" philosophy: "We are people, not machines."
 * @version 1.2.1102
 * @author 1D
 * @updated 2026.03.13
 * @copyright © 2026 Hold'inCorp. All rights reserved.
 * @see https://humanstxt.org/
 */

/**
 * @class Human
 * @description Singleton utility class designed to extract and protect developer identity and project branding. It analyzes `import.meta.url` to verify that the script is running from authorized sources (GitHub or jsDelivr).
 */
class Human {
    /** * Internal metadata storage.
     * @type {Object|null} 
     * @private 
     */
    #data = null;

    /** * Holds the unique instance of the Human class.
     * @static 
     * @type {Human|null}
     */
    static instance = null;

    /**
     * Constructs the Human singleton. Prevents multiple instantiations and triggers the metadata resolution.
     */
    constructor() {
        if (Human.instance) return Human.instance;
        this.#data = this.#resolve();
        Human.instance = this;
    }

    /**
     * Resolves metadata from the current script URL. Supports GitHub Pages and jsDelivr patterns.
     * @private
     * @returns {Object|null} The resolved metadata or null if unauthorized.
     * @throws {Error} If the execution context is not a verified GitHub/CDN mirror.
     */
    #resolve() {
        const url = import.meta.url;
        try {
            let author, project, branch = null;

            if (url.includes("github.io")) {
                // Pattern: https://[author].github.io/[project]/
                const urlObj = new URL(url);
                author = urlObj.hostname.split(".")[0];
                project = urlObj.pathname.split("/")[1] || null;
                branch = ""; 
            } else if (url.includes("jsdelivr.net")) {
                // Pattern: https://cdn.jsdelivr.net/gh/[author]/[project]@[branch]/
                const pathParts = new URL(url).pathname.split("/");
                author = pathParts[2];
                const projectPart = pathParts[3];
                
                if (projectPart.includes("@")) {
                    const split = projectPart.split("@");
                    project = split[0];
                    branch = split[1];
                } else {
                    project = projectPart;
                    branch = "latest";
                }
            } else {
                throw new Error("Unauthorized context. Script must be hosted on official GitHub or CDN mirrors.");
            }

            return {
                alias: author.substring(0, 2).toUpperCase(),
                fullName: author.substring(0, 2).toUpperCase() + author.slice(2).toLowerCase(),
                project: project,
                branch: branch,
                remote: true
            };
        } catch (error) {
            console.error(`[${this.constructor.name} — CRITICAL] ${error.message}`);
            return null;
        }
    }

    /**
     * Dynamically adapts the project name if Human.js is used as an external library.
     * @param {string} name - The name of the calling project.
     * @returns {Human} The current instance for method chaining.
     * @example
     * Ø1D.attach("MyProject");
     */
    attach(name) {
        if (this.#data) this.#data.project = name;
        return this;
    }

    /**
     * Internal validator to ensure metadata is loaded before access.
     * @private
     * @returns {Object} The internal data object.
     * @throws {ReferenceError} If metadata resolution failed.
     */
    get _check() {
        if (!this.#data) throw new ReferenceError(`${this.constructor.name} : Metadata resolution failed.`);
        return this.#data;
    }

    /** * @type {string}
     * @description Returns the developer's two-letter alias (e.g., "1D").
     */
    get alias() { return this._check.alias; }

    /** * @type {string}
     * @description Returns the developer's full name derived from the host.
     */
    get fullName() { return this._check.fullName; }

    /** * @type {string}
     * @description Returns the current project name.
     */
    get project() { return this._check.project ?? "GitHub"; }

    /** * @type {string}
     * @description Returns the resolved branch or version prefixed with '@'.
     */
    get branch() { 
        const b = this._check.branch;
        return b ? `@${b}` : "";
    }

    /** * @type {string}
     * @description Returns the complete branding signature (e.g., "1d — MyProject@main").
     */
    get branding() { return `${this.fullName} — ${this.project}${this.branch}`; }
    
    /** * @type {string}
     * @description Returns the simplified branding signature (e.g., "1D — MyProject").
     */
    get brand() { return `${this.alias} — ${this.project}`; }

    /** * @type {boolean}
     * @description Checks if the script is running from a verified remote host.
     */
    get isVerified() { return this.#data?.remote === true; }

    /** * @type {string}
     * @description Returns the developer's GitHub profile URL.
     */
    get profile() { return `https://github.com/${this.fullName}`; }
}

/**
 * Global identity instance: Ø1D
 * Frozen to ensure immutability and authorship protection.
 * @constant {Human}
 */
const Ø1D = new Human();
Object.freeze(Ø1D);

/**
 * Hybrid export: Allows both default and named imports.
 * @example
 * import Ø1D from './Human.js'; // Default
 * import { Ø1D } from './Human.js'; // Named
 */
export { Ø1D as default, Ø1D };
