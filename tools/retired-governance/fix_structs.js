const fs = require('fs');
const path = require('path');

const KERNEL_SRC = 'E:/Aethel engine/packages/aethel-kernel-rust/src';
const filesToFix = [
    'atomic_thread_sync.rs', 'cpu_affinity_micro_workers.rs', 'blue_noise_dithering_relaxer.rs', 'voxel_cone_radiosity.rs',
    'velocity_buffer_ecs.rs', 'asynchronous_reality_threads.rs', 'chromatic_glass_refraction.rs', 'universal_logarithmic_scale.rs',
    'unified_field_network.rs', 'msl_wgsl_compiler.rs', 'acoustic_reverb_geometry.rs', 'ghost_state_predictor.rs',
    'fm_additive_synthesis.rs', 'hybrid_eulerian_lagrangian_pbd.rs', 'mnemonic_matter_entropy.rs', 'synesthetic_sensory_remap.rs',
    'autonomous_conflict_generator.rs', 'four_dimensional_time_sdf.rs', 'fractal_energy_perturbation.rs',
    'non_euclidean_curved_raymarcher.rs', 'shadow_kernel_time_reversal.rs', 'atmospheric_physical_damping.rs',
    'autonomous_entropy_corrector.rs', 'desktop_soak.rs'
];

for (const file of filesToFix) {
    let p = path.join(KERNEL_SRC, file);
    if (!fs.existsSync(p)) continue;
    let c = fs.readFileSync(p, 'utf8');
    
    // Fix struct definition
    const structDefErr = /pub struct ([a-zA-Z0-9_]+) \{\r?\n\s*distinct_from_peers_note: "HELD: Distinct from many peers\. Fingerprint cross-check held to avoid coupling\."\.to_string\(\),/g;
    c = c.replace(structDefErr, 'pub struct $1 {\n    pub distinct_from_peers_note: String,');
    
    fs.writeFileSync(p, c);
}

// Fix internal_voxel_density
let ivdPath = path.join(KERNEL_SRC, 'internal_voxel_density.rs');
let ivdContent = fs.readFileSync(ivdPath, 'utf8');
ivdContent = ivdContent.replace(/evidence_fingerprint: u64,\r?\n\s*_peer_distinct: bool,/g, 'evidence_fingerprint: u64,\n    peer_distinct: bool,');
fs.writeFileSync(ivdPath, ivdContent);

// Fix volumetric_extinction_medium
let volPath = path.join(KERNEL_SRC, 'volumetric_extinction_medium.rs');
let volContent = fs.readFileSync(volPath, 'utf8');
// It had 'let _distinct_from_dc_uniform_beer_lambert' -> change back to 'let distinct_from_dc_uniform_beer_lambert'
volContent = volContent.replace(/let _distinct_from_dc_uniform_beer_lambert/g, 'let distinct_from_dc_uniform_beer_lambert');
// The ew_held function missed the param. The caller had:
//        outputs_finite,
//        /* bool */,
//        long.optical_depth,
volContent = volContent.replace(/outputs_finite,\r?\n\s*\/\* bool \*\/\,/g, 'outputs_finite,\n            distinct_from_dc_uniform_beer_lambert,');
// It also might have missed it in a different way in the latest run because my previous fix broke it. 
// I will just checkout volumetric_extinction_medium.rs and then patch it manually to be safe.
fs.writeFileSync(volPath, volContent);
