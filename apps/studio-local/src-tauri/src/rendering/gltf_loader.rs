use crate::rendering::pbr_graphics::Vertex;
use gltf::Gltf;

pub struct MeshData {
    pub vertices: Vec<Vertex>,
    pub indices: Vec<u16>,
}

pub fn load_gltf(
    path: &str,
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    mesh_registry: &mut crate::rendering::mesh_registry::MeshRegistry,
    material_bind_group_layout: &wgpu::BindGroupLayout,
) -> Vec<usize> {
    let (gltf, buffers, _images) = gltf::import(path).expect("Failed to load glTF file");

    let mut loaded_mesh_ids = Vec::new();

    for mesh in gltf.meshes() {
        for primitive in mesh.primitives() {
            let reader = primitive.reader(|buffer| Some(&buffers[buffer.index()]));

            let mut positions: Vec<[f32; 3]> = Vec::new();
            if let Some(iter) = reader.read_positions() {
                positions = iter.collect();
            }

            let mut normals: Vec<[f32; 3]> = Vec::new();
            if let Some(iter) = reader.read_normals() {
                normals = iter.collect();
            } else {
                normals = vec![[0.0, 1.0, 0.0]; positions.len()];
            }

            let mut uvs: Vec<[f32; 2]> = Vec::new();
            if let Some(iter) = reader.read_tex_coords(0) {
                uvs = iter.into_f32().collect();
            } else {
                uvs = vec![[0.0, 0.0]; positions.len()];
            }

            let mut vertices = Vec::with_capacity(positions.len());
            for i in 0..positions.len() {
                vertices.push(Vertex {
                    position: positions[i],
                    normal: normals[i],
                    uv: uvs[i],
                });
            }

            let mut indices = Vec::new();
            if let Some(iter) = reader.read_indices() {
                indices = iter.into_u32().map(|i| i as u16).collect();
            }

            let default_texture = crate::rendering::texture::Texture::create_default_white_texture(device, queue);
            let material_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
                layout: material_bind_group_layout,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::TextureView(&default_texture.view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::Sampler(&default_texture.sampler),
                    },
                    wgpu::BindGroupEntry {
                        binding: 2,
                        resource: wgpu::BindingResource::TextureView(&default_texture.view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 3,
                        resource: wgpu::BindingResource::Sampler(&default_texture.sampler),
                    },
                ],
                label: Some("Material Bind Group"),
            });

            let mesh_id = mesh_registry.allocate_mesh(queue, &vertices, &indices, material_bind_group);
            loaded_mesh_ids.push(mesh_id);
        }
    }

    Ok(meshes)
}
