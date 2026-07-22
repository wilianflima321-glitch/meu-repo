// O Alocador de Memória SIMD (Pool Allocator)
// Malloc em WASM causa fragmentação na memória linear. O Aethel não aloca nada dinamicamente
// no hot-loop. Este Pool Allocator reserva a Heap do Rust alinhada em 16-bytes
// e fornece os slots ultra-rápidos (O(1)) garantindo SIMD cache hits.

#[repr(align(16))]
pub struct SimdAlignedBlock {
    pub data: [f32; 4], // 16 bytes perfeitamente alinhados para SIMD (SSE/AVX)
}

pub struct SimdPoolAllocator {
    pub arena: Vec<SimdAlignedBlock>,
    pub free_indices: Vec<usize>,
}

impl SimdPoolAllocator {
    pub fn new(capacity: usize) -> Self {
        let mut arena = Vec::with_capacity(capacity);
        let mut free_indices = Vec::with_capacity(capacity);
        
        for i in 0..capacity {
            arena.push(SimdAlignedBlock { data: [0.0; 4] });
            free_indices.push(capacity - 1 - i); // LIFO rápido
        }
        
        Self { arena, free_indices }
    }

    /// Aloca uma entidade no ECS em tempo constante. Zero fragmentation.
    #[inline(always)]
    pub fn allocate_simd_block(&mut self, payload: [f32; 4]) -> Option<usize> {
        if let Some(index) = self.free_indices.pop() {
            self.arena[index].data = payload;
            Some(index)
        } else {
            None // O(1) falha segura (Out of Memory previsto e domado, nunca Panic)
        }
    }

    #[inline(always)]
    pub fn free_block(&mut self, index: usize) {
        // Zero-copy free. Apenas devolve o índice para a piscina.
        self.free_indices.push(index);
    }
}
