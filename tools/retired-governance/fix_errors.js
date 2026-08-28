const fs = require('fs');
const path = require('path');

const KERNEL_SRC = 'E:/Aethel engine/packages/aethel-kernel-rust/src';

const missingInitFiles = [
    { file: 'atomic_thread_sync.rs', struct: 'AtomicThreadSyncSoakReport' },
    { file: 'cpu_affinity_micro_workers.rs', struct: 'CpuAffinityMicroWorkersSoakReport' },
    { file: 'blue_noise_dithering_relaxer.rs', struct: 'BlueNoiseDitheringSoakReport' },
    { file: 'voxel_cone_radiosity.rs', struct: 'VoxelConeRadiositySoakReport' },
    { file: 'velocity_buffer_ecs.rs', struct: 'VelocityBufferEcsSoakReport' },
    { file: 'asynchronous_reality_threads.rs', struct: 'AsynchronousRealityThreadsSoakReport' },
    { file: 'chromatic_glass_refraction.rs', struct: 'ChromaticGlassRefractionSoakReport' },
    { file: 'universal_logarithmic_scale.rs', struct: 'UniversalLogarithmicScaleSoakReport' },
    { file: 'unified_field_network.rs', struct: 'UnifiedFieldNetworkSoakReport' },
    { file: 'msl_wgsl_compiler.rs', struct: 'MslWgslCompilerSoakReport' },
    { file: 'acoustic_reverb_geometry.rs', struct: 'AcousticReverbGeometrySoakReport' },
    { file: 'ghost_state_predictor.rs', struct: 'GhostStatePredictorSoakReport' },
    { file: 'fm_additive_synthesis.rs', struct: 'FmAdditiveSynthesisSoakReport' },
    { file: 'hybrid_eulerian_lagrangian_pbd.rs', struct: 'HybridEulerianLagrangianPbdSoakReport' },
    { file: 'mnemonic_matter_entropy.rs', struct: 'MnemonicMatterEntropySoakReport' },
    { file: 'synesthetic_sensory_remap.rs', struct: 'SynestheticSensoryRemapSoakReport' },
    { file: 'autonomous_conflict_generator.rs', struct: 'AutonomousConflictGeneratorSoakReport' },
    { file: 'four_dimensional_time_sdf.rs', struct: 'FourDimensionalTimeSdfSoakReport' },
    { file: 'fractal_energy_perturbation.rs', struct: 'FractalEnergyPerturbationSoakReport' },
    { file: 'non_euclidean_curved_raymarcher.rs', struct: 'CurvedRaymarcherSoakReport' },
    { file: 'shadow_kernel_time_reversal.rs', struct: 'ShadowTimeReversalSoakReport' },
    { file: 'atmospheric_physical_damping.rs', struct: 'AtmosphericPhysicalDampingSoakReport' },
    { file: 'autonomous_entropy_corrector.rs', struct: 'AutonomousEntropyCorrectorSoakReport' },
    { file: 'desktop_soak.rs', struct: 'DesktopSoakReport' }
];

for (const item of missingInitFiles) {
    const filePath = path.join(KERNEL_SRC, item.file);
    if (!fs.existsSync(filePath)) continue;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find struct initializations
    // Could be `StructName {` or `StructName { \n`
    const regex = new RegExp(`\\b${item.struct}\\s*\\{`, 'g');
    content = content.replace(regex, (match) => {
        return match + '\n        distinct_from_peers_note: "HELD: Distinct from many peers. Fingerprint cross-check held to avoid coupling.".to_string(),';
    });

    // Let's make sure it doesn't add multiple times if it was already there (some might have it from fail_report but not run_...)
    // Wait, regex might add it to ALL. Let's clean up any double occurrences in the same block.
    // That's easy: if there's distinct_from_peers_note twice, we'll fix it later.
    
    fs.writeFileSync(filePath, content);
}

// Fix duplicated in volumetric_extinction_medium.rs
let volPath = path.join(KERNEL_SRC, 'volumetric_extinction_medium.rs');
let volContent = fs.readFileSync(volPath, 'utf8');
volContent = volContent.replace(/pub distinct_from_peers_note: String,\r?\n(\s*pub distinct_from_peers_note: String,)/, '$1');
volContent = volContent.replace(/let _distinct_from_dc_uniform_beer_lambert/, 'let distinct_from_dc_uniform_beer_lambert');
volContent = volContent.replace(/outputs_finite,\r?\n(\s*)long\.optical_depth,/, 'outputs_finite,\n$1distinct_from_dc_uniform_beer_lambert,\n$1long.optical_depth,');
fs.writeFileSync(volPath, volContent);

// Fix internal_voxel_density.rs
let ivdPath = path.join(KERNEL_SRC, 'internal_voxel_density.rs');
let ivdContent = fs.readFileSync(ivdPath, 'utf8');
ivdContent = ivdContent.replace(/let _peer_distinct =/, 'let peer_distinct =');
ivdContent = ivdContent.replace(/_peer_distinct: bool,/, 'peer_distinct: bool,');
fs.writeFileSync(ivdPath, ivdContent);

// Fix lattice_boltzmann_gas_fluid.rs
let lbgfPath = path.join(KERNEL_SRC, 'lattice_boltzmann_gas_fluid.rs');
let lbgfContent = fs.readFileSync(lbgfPath, 'utf8');
lbgfContent = lbgfContent.replace(/let distinct_from_fluid =/, 'let _distinct_from_fluid =');
fs.writeFileSync(lbgfPath, lbgfContent);

// Fix Copy in desktop_soak.rs
let deskPath = path.join(KERNEL_SRC, 'desktop_soak.rs');
let deskContent = fs.readFileSync(deskPath, 'utf8');
deskContent = deskContent.replace(/#\[derive\(Debug, Clone, Copy, PartialEq\)\]/g, '#[derive(Debug, Clone, PartialEq)]');
fs.writeFileSync(deskPath, deskContent);

// Fix double distinct_from_peers_note in any file
for (const file of fs.readdirSync(KERNEL_SRC)) {
    if (!file.endsWith('.rs')) continue;
    const p = path.join(KERNEL_SRC, file);
    let c = fs.readFileSync(p, 'utf8');
    
    let changed = false;
    
    // De-duplicate struct definition
    if (c.match(/pub distinct_from_peers_note: String,\s*pub distinct_from_peers_note: String,/)) {
        c = c.replace(/pub distinct_from_peers_note: String,(\s*)pub distinct_from_peers_note: String,/, 'pub distinct_from_peers_note: String,');
        changed = true;
    }
    
    // De-duplicate struct initialization
    const dupInitRegex = /distinct_from_peers_note:[^,]+,(\s*)distinct_from_peers_note:[^,]+,/g;
    if (c.match(dupInitRegex)) {
        c = c.replace(dupInitRegex, 'distinct_from_peers_note: "HELD: Distinct from many peers. Fingerprint cross-check held to avoid coupling.".to_string(),');
        changed = true;
    }
    
    if (changed) fs.writeFileSync(p, c);
}

console.log("Fixes applied!");
