/**
 * @file AbstractClass.js
 * @description Core utility providing a strict base for abstract classes. Ensures that specific architectural components cannot be initialized without proper inheritance.
 * @version 1.0.0
 * @author 1D
 * @copyright © 2026 Hold'inCorp. All rights reserved.
 * @license Apache-2.0
 * @updated 2026.03.08
 */

import Ø1D from "../../Humans.js";

/**
 * @abstract
 * @class AbstractClass
 * @description Fundamental base class designed to prevent direct instantiation.
 * Subclasses must call `super(true)` to bypass the abstract protection.
 */
class AbstractClass {
    /**
     * @constructor
     * @param {boolean} [instantiable=false] - Safety flag. Must be set to true by child classes via super().
     * @throws {Error} If called directly or without the instantiable flag set to true.
     */
    constructor(instantiable = false) {
        if (!instantiable) throw new Error(`${Ø1D.brand} — Abstract class "${this.constructor.name}" cannot be instantiated directly.`);
    }
}

// Dual export: allows both default and named imports
export { AbstractClass as default, AbstractClass };
