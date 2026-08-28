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

const badString = 'distinct_from_peers_note: "HELD: Distinct from many peers. Fingerprint cross-check held to avoid coupling.".to_string(),';
const goodString = 'pub distinct_from_peers_note: String,';

for (const file of filesToFix) {
    let p = path.join(KERNEL_SRC, file);
    if (!fs.existsSync(p)) continue;
    let c = fs.readFileSync(p, 'utf8');
    let lines = c.split(/\r?\n/);
    
    for (let i = 0; i < lines.length; i++) {
        // Fix struct definitions
        if ((lines[i].includes('pub struct ') || lines[i].includes('struct ')) && lines[i].includes('{')) {
            if (i + 1 < lines.length && lines[i+1].includes(badString)) {
                lines[i+1] = lines[i+1].replace(badString, goodString);
            }
        }
        
        // Fix function signatures returning Report {
        if (lines[i].includes(') -> ') && lines[i].includes('Report {')) {
            if (i + 1 < lines.length && lines[i+1].includes(badString)) {
                lines[i+1] = '';
            }
        } else if (lines[i].trim() === '{' && i > 0 && lines[i-1].includes(') -> ') && lines[i-1].includes('Report')) {
            if (i + 1 < lines.length && lines[i+1].includes(badString)) {
                lines[i+1] = '';
            }
        }
    }
    
    fs.writeFileSync(p, lines.join('\n'));
}

// Fix internal_voxel_density
let ivdPath = path.join(KERNEL_SRC, 'internal_voxel_density.rs');
let ivdContent = fs.readFileSync(ivdPath, 'utf8');
ivdContent = ivdContent.replace(/_peer_distinct: bool,/g, 'peer_distinct: bool,');
fs.writeFileSync(ivdPath, ivdContent);

console.log("Fixed with explicit lines.");
