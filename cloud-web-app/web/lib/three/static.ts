// @aethel-heavy-async-boundary Runtime-only Three namespace for synchronous engine helpers.
//
// Public/dashboard/admin shells must keep using dynamic boundaries. Engine
// modules that need constructors synchronously can import this gateway instead
// of adding new direct `three` imports across the codebase.
import * as THREE from 'three'

export { THREE }
