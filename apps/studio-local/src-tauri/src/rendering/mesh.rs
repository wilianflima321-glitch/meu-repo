use super::pbr_graphics::Vertex;
use wgpu::util::DeviceExt;

#[repr(C)]
#[derive(Copy, Clone, bytemuck::Pod, bytemuck::Zeroable)]
pub struct InstanceRaw {
    model: [[f32; 4]; 4],
}

impl InstanceRaw {
    pub fn desc<'a>() -> wgpu::VertexBufferLayout<'a> {
        use std::mem;
        wgpu::VertexBufferLayout {
            array_stride: mem::size_of::<InstanceRaw>() as wgpu::BufferAddress,
            // We need to switch from using a step mode of Vertex to Instance
            // This means that our shaders will only change to use the next
            // instance when the shader starts processing a new instance
            step_mode: wgpu::VertexStepMode::Instance,
            attributes: &[
                // A mat4 takes up 4 vertex slots as it is technically 4 vec4s. We need to define a slot
                // for each vec4. We'll have to reassemble the mat4 in the shader.
                wgpu::VertexAttribute {
                    offset: 0,
                    // While our vertex shader only uses locations 0, 1, and 2 now, in later tutorials we'll
                    // be using 2, 3, and 4, for Vertex. We'll start at slot 3 to not conflict with them later
                    shader_location: 3,
                    format: wgpu::VertexFormat::Float32x4,
                },
                wgpu::VertexAttribute {
                    offset: mem::size_of::<[f32; 4]>() as wgpu::BufferAddress,
                    shader_location: 4,
                    format: wgpu::VertexFormat::Float32x4,
                },
                wgpu::VertexAttribute {
                    offset: mem::size_of::<[f32; 8]>() as wgpu::BufferAddress,
                    shader_location: 5,
                    format: wgpu::VertexFormat::Float32x4,
                },
                wgpu::VertexAttribute {
                    offset: mem::size_of::<[f32; 12]>() as wgpu::BufferAddress,
                    shader_location: 6,
                    format: wgpu::VertexFormat::Float32x4,
                },
            ],
        }
    }
}

pub struct Mesh {
    pub name: String,
    pub start_index: u32,
    pub index_count: u32,
    pub vertex_offset: i32,
    pub instance_count: u32,
    pub material_bind_group: wgpu::BindGroup,
}

impl Mesh {
    pub fn create_cube_data() -> (Vec<Vertex>, Vec<u16>) {
        let vertices = vec![
            // Front face
            Vertex { position: [-1.0, -1.0,  1.0], normal: [0.0, 0.0, 1.0], uv: [0.0, 1.0] },
            Vertex { position: [ 1.0, -1.0,  1.0], normal: [0.0, 0.0, 1.0], uv: [1.0, 1.0] },
            Vertex { position: [ 1.0,  1.0,  1.0], normal: [0.0, 0.0, 1.0], uv: [1.0, 0.0] },
            Vertex { position: [-1.0,  1.0,  1.0], normal: [0.0, 0.0, 1.0], uv: [0.0, 0.0] },
            // Back face
            Vertex { position: [-1.0, -1.0, -1.0], normal: [0.0, 0.0, -1.0], uv: [1.0, 1.0] },
            Vertex { position: [-1.0,  1.0, -1.0], normal: [0.0, 0.0, -1.0], uv: [1.0, 0.0] },
            Vertex { position: [ 1.0,  1.0, -1.0], normal: [0.0, 0.0, -1.0], uv: [0.0, 0.0] },
            Vertex { position: [ 1.0, -1.0, -1.0], normal: [0.0, 0.0, -1.0], uv: [0.0, 1.0] },
            // Top face
            Vertex { position: [-1.0,  1.0, -1.0], normal: [0.0, 1.0, 0.0], uv: [0.0, 1.0] },
            Vertex { position: [-1.0,  1.0,  1.0], normal: [0.0, 1.0, 0.0], uv: [0.0, 0.0] },
            Vertex { position: [ 1.0,  1.0,  1.0], normal: [0.0, 1.0, 0.0], uv: [1.0, 0.0] },
            Vertex { position: [ 1.0,  1.0, -1.0], normal: [0.0, 1.0, 0.0], uv: [1.0, 1.0] },
            // Bottom face
            Vertex { position: [-1.0, -1.0, -1.0], normal: [0.0, -1.0, 0.0], uv: [1.0, 1.0] },
            Vertex { position: [ 1.0, -1.0, -1.0], normal: [0.0, -1.0, 0.0], uv: [0.0, 1.0] },
            Vertex { position: [ 1.0, -1.0,  1.0], normal: [0.0, -1.0, 0.0], uv: [0.0, 0.0] },
            Vertex { position: [-1.0, -1.0,  1.0], normal: [0.0, -1.0, 0.0], uv: [1.0, 0.0] },
            // Right face
            Vertex { position: [ 1.0, -1.0, -1.0], normal: [1.0, 0.0, 0.0], uv: [1.0, 1.0] },
            Vertex { position: [ 1.0,  1.0, -1.0], normal: [1.0, 0.0, 0.0], uv: [1.0, 0.0] },
            Vertex { position: [ 1.0,  1.0,  1.0], normal: [1.0, 0.0, 0.0], uv: [0.0, 0.0] },
            Vertex { position: [ 1.0, -1.0,  1.0], normal: [1.0, 0.0, 0.0], uv: [0.0, 1.0] },
            // Left face
            Vertex { position: [-1.0, -1.0, -1.0], normal: [-1.0, 0.0, 0.0], uv: [0.0, 1.0] },
            Vertex { position: [-1.0, -1.0,  1.0], normal: [-1.0, 0.0, 0.0], uv: [1.0, 1.0] },
            Vertex { position: [-1.0,  1.0,  1.0], normal: [-1.0, 0.0, 0.0], uv: [1.0, 0.0] },
            Vertex { position: [-1.0,  1.0, -1.0], normal: [-1.0, 0.0, 0.0], uv: [0.0, 0.0] },
        ];

        let indices: Vec<u16> = vec![
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23,   // left
        ];

        (vertices, indices)
    }

    pub fn create_cube(device: &wgpu::Device) -> Self {
        let (vertices, indices) = Self::create_cube_data();

        let vertex_buffer = device.create_buffer_init(
            &wgpu::util::BufferInitDescriptor {
                label: Some("Mesh Vertex Buffer"),
                contents: bytemuck::cast_slice(&vertices),
                usage: wgpu::BufferUsages::VERTEX,
            }
        );

        let index_buffer = device.create_buffer_init(
            &wgpu::util::BufferInitDescriptor {
                label: Some("Mesh Index Buffer"),
                contents: bytemuck::cast_slice(&indices),
                usage: wgpu::BufferUsages::INDEX,
            }
        );

        Self {
            vertex_buffer,
            index_buffer,
            num_elements: indices.len() as u32,
        }
    }
}
