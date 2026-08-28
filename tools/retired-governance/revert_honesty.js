const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const KERNEL_SRC = 'E:/Aethel engine/packages/aethel-kernel-rust/src';
const WIRE_SRC = 'E:/Aethel engine/apps/studio-local/src-tauri/src';

const excludedKernel = [
    'cpu_affinity_micro_workers.rs', 'chromatic_glass_refraction.rs', 'blue_noise_dithering_relaxer.rs', 'atomic_thread_sync.rs', 'asynchronous_reality_threads.rs',
    'wgsl_surface_noise_kernel.rs', 'wasm_shared_memory_buffer.rs', 'voxel_cone_radiosity.rs', 'voronoi_destruction_3d.rs', 'volumetric_extinction_medium.rs',
    'velocity_buffer_ecs.rs', 'usd_importer_bridge.rs', 'universal_logarithmic_scale.rs', 'unified_field_theory.rs', 'unified_field_network.rs'
];

for (const file of fs.readdirSync(KERNEL_SRC)) {
    if (file.endsWith('.rs') && !excludedKernel.includes(file)) {
        execSync(`git checkout "${path.join(KERNEL_SRC, file)}"`, { stdio: 'inherit' });
    }
}

for (const file of fs.readdirSync(WIRE_SRC)) {
    if (file.endsWith('.rs')) {
        let isExcluded = false;
        for (const ex of excludedKernel) {
            if (file === `kernel_${ex.replace('.rs', '_wire.rs')}`) {
                isExcluded = true;
                break;
            }
        }
        if (!isExcluded) {
            execSync(`git checkout "${path.join(WIRE_SRC, file)}"`, { stdio: 'inherit' });
        }
    }
}
