use crate::rendering::pbr_graphics::Vertex;
use wgpu::util::DeviceExt;

/// A monolithic buffer holder for all static geometry in the world.
/// This allows a single `set_vertex_buffer` call, and then we just use
/// `draw_indexed_indirect` with different `base_vertex` and `first_index`.
pub struct MeshRegistry {
    pub vertex_buffer: wgpu::Buffer,
    pub index_buffer: wgpu::Buffer,
    
    // Track allocation
    pub current_vertex_offset: u32,
    pub current_index_offset: u32,
    
    // Track registered meshes
    pub meshes: Vec<MeshAllocation>,
}

pub struct MeshAllocation {
    pub base_vertex: u32,
    pub first_index: u32,
    pub index_count: u32,
    pub material_bind_group: wgpu::BindGroup,
}

impl MeshRegistry {
    pub fn new(device: &wgpu::Device) -> Self {
        let max_vertices = 100_000;
        let max_indices = 100_000;

        let vertex_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Mega Vertex Buffer"),
            size: max_vertices as u64 * std::mem::size_of::<Vertex>() as u64,
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let index_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Mega Index Buffer"),
            size: max_indices as u64 * std::mem::size_of::<u16>() as u64, // using u16 indices
            usage: wgpu::BufferUsages::INDEX | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        Self {
            vertex_buffer,
            index_buffer,
            current_vertex_offset: 0,
            current_index_offset: 0,
            meshes: Vec::new(),
        }
    }

    pub fn allocate_mesh(&mut self, queue: &wgpu::Queue, vertices: &[Vertex], indices: &[u16], material_bind_group: wgpu::BindGroup) -> usize {
        // Write to GPU
        let v_offset_bytes = self.current_vertex_offset as u64 * std::mem::size_of::<Vertex>() as u64;
        let i_offset_bytes = self.current_index_offset as u64 * std::mem::size_of::<u16>() as u64;
        
        queue.write_buffer(&self.vertex_buffer, v_offset_bytes, bytemuck::cast_slice(vertices));
        queue.write_buffer(&self.index_buffer, i_offset_bytes, bytemuck::cast_slice(indices));

        let allocation = MeshAllocation {
            base_vertex: self.current_vertex_offset,
            first_index: self.current_index_offset,
            index_count: indices.len() as u32,
            material_bind_group,
        };

        self.current_vertex_offset += vertices.len() as u32;
        self.current_index_offset += indices.len() as u32;

        let id = self.meshes.len();
        self.meshes.push(allocation);
        id
    }
}
