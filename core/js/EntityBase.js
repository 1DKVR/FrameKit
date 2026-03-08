/**
 * @file Entity.js
 * @description Core entity management. Provides identity, lifecycle, and automatic timestamping. Built for high-performance data structures. This serves as the foundation for any object (Living beings, items, houses, etc.) requiring a unique identity and traceability.
 * @version 1.0.0
 * @author 1D
 * @updated 2026.03.08
 * @copyright © 2026 Hold'inCorp. All rights reserved.
 */

import { Ø1D } from "./Humans.js";
import { AbstractClass } from "./AbstractClass.js";

/**
 * @class EntityBase
 * @extends AbstractClass
 * @description Abstract base class providing identity, lifecycle, and reactive timestamps.
 */
export class EntityBase extends AbstractClass {
    /**
     * Constructs a new instance of an entity.
     * @param {Object} [data={}] - Initial values for the entity.
     * @param {string} [data.uuid] - Unique identifier (auto-generated if missing).
     * @param {string} [data.created] - ISO timestamp of creation.
     * @param {string} [data.updated] - ISO timestamp of last update.
     * @param {string|null} [data.deleted] - ISO timestamp of deletion or null.
     * @param {boolean} [instantiable=false] - Flag to allow subclass instantiation.
     */
    constructor(data = {}, instantiable = false){
        super(instantiable);

        /** @type {string} Unique identifier for the instance. Immutable. */
        this.uuid = data.uuid || crypto.randomUUID();
        
        /** @type {string} ISO timestamp of creation. Immutable. */
        this.created = data.created || EntityBase.dateISO();
        
        /** @type {string} ISO timestamp of last update. */
        this.updated = data.updated || this.created;
        
        /** @type {string|null} ISO timestamp of deletion or null. */
        this.deleted = data.deleted || null;

        // Internal locks for structural integrity
        this._lock("uuid");
        this._lock("created");

        /**
         * Returns a Proxy to auto-track changes and update the 'updated' timestamp.
         */
        return new Proxy(this, {
            set: (target, prop, value) => {
                const descriptor = Object.getOwnPropertyDescriptor(target, prop);
                
                if (descriptor && descriptor.writable === false) {
                    console.warn(`${Ø1D.brand} Property "${prop}" is read-only.`);
                    return true; 
                }

                target[prop] = value;

                if (!prop.startsWith("_") && prop !== "updated") {
                    target.updated = EntityBase.dateISO();
                }
                return true;
            }
        });
    }

    /**
     * Assigns a value and locks the property immediately (Immutability).
     * @param {string} property - Name of the property.
     * @param {*} value - Value to assign.
     */
    setImmutable(property, value){
        this[property] = value;
        this._lock(property);
    }

    /**
     * Locks a property to prevent further modifications.
     * @private
     * @param {string} property - Name of the property to lock.
     */
    _lock(property){
        const descriptor = Object.getOwnPropertyDescriptor(this, property);
        if (!descriptor || !descriptor.writable) return;
        
        Object.defineProperty(this, property, { 
            writable: false, 
            configurable: false 
        });
    }

    /** @returns {string} Locale formatted creation date. */
    get createdAt(){ return EntityBase.dateLocale(this.created) }

    /** @returns {string} Locale formatted update date. */
    get updatedAt(){ return EntityBase.dateLocale(this.updated) }

    /** @returns {boolean} True if the entity is marked as deleted. */
    get isDeleted(){ return !!this.deleted }

    /** @returns {string|null} Locale formatted deletion date or null. */
    get deletedAt(){ return this.isDeleted ? EntityBase.dateLocale(this.deleted) : null }

    /** Marks the entity as deleted (Soft Delete). */
    delete(){ this.deleted = EntityBase.dateISO() }

    /** Restores a deleted entity. */
    restore(){ this.deleted = null }

    /**
     * Serializes the entity to a plain JavaScript object.
     * @returns {Object} Clean data object.
     */
    toJSON(){ return { ...this } }

    /**
     * Normalizes a date input into a JavaScript Date object.
     * @static
     * @param {Date|string|number} [date] - Input date.
     * @returns {Date}
     * @throws {TypeError} If the date is invalid.
     */
    static date(date){
        const d = new Date(date ?? Date.now());
        if (isNaN(d.getTime())) {
            throw new TypeError(`${Ø1D.brand} — Invalid date provided: ${date}`);
        }
        return d;
    }

    /**
     * @static
     * @param {Date|string|number} [date] - Input date.
     * @returns {string} ISO 8601 timestamp.
     */
    static dateISO(date){ return EntityBase.date(date).toISOString() }

    /**
     * @static
     * @param {Date|string|number} [date] - Input date.
     * @returns {string} Locale formatted date string.
     */
    static dateLocale(date){ return EntityBase.date(date).toLocaleString() }
}
