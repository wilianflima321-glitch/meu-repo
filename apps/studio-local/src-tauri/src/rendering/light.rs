#[repr(C)]
#[derive(Debug, Copy, Clone, bytemuck::Pod, bytemuck::Zeroable)]
pub struct LightRaw {
    pub position: [f32; 3], // directional uses this as direction
    pub light_type: u32,    // 0 = Directional, 1 = Point, 2 = Spot
    pub color: [f32; 3],
    pub intensity: f32,
    pub direction: [f32; 3], // only for spot
    pub range: f32,
    pub inner_cone: f32,     // cos(angle)
    pub outer_cone: f32,     // cos(angle)
    pub _padding: [f32; 2],
}

impl LightRaw {
    pub fn new_directional(direction: glam::Vec3, color: glam::Vec3, intensity: f32) -> Self {
        Self {
            position: direction.normalize().to_array(),
            light_type: 0,
            color: color.to_array(),
            intensity,
            direction: [0.0; 3],
            range: 0.0,
            inner_cone: 0.0,
            outer_cone: 0.0,
            _padding: [0.0; 2],
        }
    }

    pub fn new_point(position: glam::Vec3, color: glam::Vec3, intensity: f32, range: f32) -> Self {
        Self {
            position: position.to_array(),
            light_type: 1,
            color: color.to_array(),
            intensity,
            direction: [0.0; 3],
            range,
            inner_cone: 0.0,
            outer_cone: 0.0,
            _padding: [0.0; 2],
        }
    }
}
