/**
 * @file Humans.js
 * @description Local identity bridge. Bridges the global Ø1D identity with the local project context.
 * @version 1.0.0000
 * @author 1D
 * @updated 2026.03.13
 * @copyright © 2026 Hold'inCorp. All rights reserved.
 * @see https://1dkvr.github.io/FrameKit/Human.js
 */

import Ø1D from "https://1dkvr.github.io/FrameKit/Human.js";

// Initialize local context
Ø1D.attach("FrameKit");

/**
 * Hybrid export of the configured instance.
 */
export { Ø1D as default, Ø1D };
