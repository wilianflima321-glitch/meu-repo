// Aethel Engine: GPU Radix Sort Compute Shader (histogram + workgroup-local scatter)
//
// Shipped: 4-bit radix histogram + exclusive-scan local scatter within a workgroup.
// HELD: multi-block global prefix-sum (cross-workgroup order), full 32-bit AAA radix,
//       LBVH leaf/hierarchy construction (node buffer not bound — passes are no-ops).
// Do not market this file as AAA BVH SAH / 10M-instance sort until those land.

@group(0) @binding(0) var<storage, read_write> keys_in: array<u32>;
@group(0) @binding(1) var<storage, read_write> values_in: array<u32>;
@group(0) @binding(2) var<storage, read_write> keys_out: array<u32>;
@group(0) @binding(3) var<storage, read_write> values_out: array<u32>;
@group(0) @binding(4) var<storage, read_write> block_sums: array<u32>;

struct SortConstants {
    shift: u32,
    num_elements: u32,
    blocks: u32,
};
@group(1) @binding(0) var<uniform> constants: SortConstants;

const WORKGROUP_SIZE: u32 = 256;
const RADIX_BIN_COUNT: u32 = 16; // 4-bit radix

var<workgroup> local_histogram: array<atomic<u32>, RADIX_BIN_COUNT>;
var<workgroup> bin_cursor: array<atomic<u32>, RADIX_BIN_COUNT>;
var<workgroup> shared_keys: array<u32, WORKGROUP_SIZE>;
var<workgroup> shared_values: array<u32, WORKGROUP_SIZE>;

// PASS 1: Histogram (per-workgroup) + publish block_sums for a future global scan.
@compute @workgroup_size(WORKGROUP_SIZE)
fn histogram_pass(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>, @builtin(workgroup_id) group_id: vec3<u32>) {
    let id = global_id.x;

    if (local_id.x < RADIX_BIN_COUNT) {
        atomicStore(&local_histogram[local_id.x], 0u);
    }
    workgroupBarrier();

    if (id < constants.num_elements) {
        let key = keys_in[id];
        let bin = (key >> constants.shift) & 0xFu;
        atomicAdd(&local_histogram[bin], 1u);
    }
    workgroupBarrier();

    // Publish per-block histograms. Global exclusive scan of block_sums is HELD.
    if (local_id.x < RADIX_BIN_COUNT) {
        let block_idx = group_id.x * RADIX_BIN_COUNT + local_id.x;
        block_sums[block_idx] = atomicLoad(&local_histogram[local_id.x]);
    }
}

// PASS 3: Workgroup-local scatter using exclusive scan of the local histogram.
// Cross-workgroup global order remains HELD until block_sums prefix-sum is wired.
@compute @workgroup_size(WORKGROUP_SIZE)
fn scatter_pass(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>, @builtin(workgroup_id) group_id: vec3<u32>) {
    let id = global_id.x;
    let base = group_id.x * WORKGROUP_SIZE;

    if (local_id.x < RADIX_BIN_COUNT) {
        atomicStore(&local_histogram[local_id.x], 0u);
    }
    workgroupBarrier();

    var key: u32 = 0xFFFFFFFFu;
    var val: u32 = 0u;
    var bin: u32 = 0u;
    var valid = false;
    if (id < constants.num_elements) {
        key = keys_in[id];
        val = values_in[id];
        bin = (key >> constants.shift) & 0xFu;
        atomicAdd(&local_histogram[bin], 1u);
        valid = true;
    }
    shared_keys[local_id.x] = key;
    shared_values[local_id.x] = val;
    workgroupBarrier();

    // Exclusive prefix of local_histogram → bin_cursor start (serial, 16 bins).
    if (local_id.x == 0u) {
        var sum = 0u;
        for (var b = 0u; b < RADIX_BIN_COUNT; b = b + 1u) {
            let count = atomicLoad(&local_histogram[b]);
            atomicStore(&bin_cursor[b], sum);
            sum = sum + count;
        }
    }
    workgroupBarrier();

    if (valid) {
        let local_slot = atomicAdd(&bin_cursor[bin], 1u);
        let out_index = base + local_slot;
        if (out_index < constants.num_elements) {
            keys_out[out_index] = shared_keys[local_id.x];
            values_out[out_index] = shared_values[local_id.x];
        }
    }
}

// PASS 4: LBVH leaf construction — HELD (node storage binding not present).
@compute @workgroup_size(WORKGROUP_SIZE)
fn lbvh_build_pass(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let id = global_id.x;
    if (id >= constants.num_elements) {
        return;
    }
    // HELD: refuse to invent leaf nodes without a bound node buffer.
}

// PASS 5: LBVH hierarchy — HELD (bottom-up AABB merge not wired).
@compute @workgroup_size(WORKGROUP_SIZE)
fn lbvh_hierarchy_pass(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let id = global_id.x;
    if (id >= constants.num_elements) {
        return;
    }
    // HELD: refuse to invent hierarchy merges without node storage + atomics path.
}
