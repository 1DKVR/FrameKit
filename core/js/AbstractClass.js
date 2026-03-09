/**
 * @file AbstractClass.js
 * @description Base class that prevents direct instantiation.
 * @version 1.0.0
 * @author 1D
 * @copyright © 2026 Hold'inCorp. All rights reserved.
 * @license Apache-2.0
 * @updated 26.03.08
 */

import { Ø1D } from "../../Humans.js";

/**
 * @abstract
 * @class AbstractClass
 * @description Base class that prevents direct instantiation.
 */
export class AbstractClass {
    /**
     * @param {boolean} [instantiable=false] - Must be true to allow instantiation.
     * @throws {Error} Throws if trying to instantiate the abstract class directly.
     */
    constructor(instantiable = false) {
        if (!instantiable) throw new Error(`${Ø1D.brand} — Abstract class "${this.constructor.name}" cannot be instantiated directly.`)
    }
}
