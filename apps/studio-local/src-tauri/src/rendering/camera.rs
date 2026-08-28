use glam::{Mat4, Vec3};

#[rustfmt::skip]
pub const OPENGL_TO_WGPU_MATRIX: Mat4 = Mat4::from_cols_array(&[
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 0.5, 0.0,
    0.0, 0.0, 0.5, 1.0,
]);

pub struct Camera {
    pub eye: Vec3,
    pub target: Vec3,
    pub up: Vec3,
    pub aspect: f32,
    pub fovy: f32,
    pub znear: f32,
    pub zfar: f32,
}

impl Camera {
    pub fn build_view_matrix(&self) -> Mat4 {
        Mat4::look_at_rh(self.eye, self.target, self.up)
    }

    pub fn build_projection_matrix(&self) -> Mat4 {
        OPENGL_TO_WGPU_MATRIX * Mat4::perspective_rh(self.fovy, self.aspect, self.znear, self.zfar)
    }

    pub fn build_view_projection_matrix(&self) -> Mat4 {
        self.build_projection_matrix() * self.build_view_matrix()
    }

    /// Extracts the 6 frustum planes (Left, Right, Bottom, Top, Near, Far) from the View-Projection matrix.
    /// Each plane is represented as `[A, B, C, D]` where `Ax + By + Cz + D = 0` and the normal `(A,B,C)` points inward.
    pub fn extract_frustum_planes(&self) -> [[f32; 4]; 6] {
        let vp = self.build_view_projection_matrix();
        let r1 = vp.row(0);
        let r2 = vp.row(1);
        let r3 = vp.row(2);
        let r4 = vp.row(3);

        let planes = [
            (r4 + r1).normalize(), // Left
            (r4 - r1).normalize(), // Right
            (r4 + r2).normalize(), // Bottom
            (r4 - r2).normalize(), // Top
            (r4 + r3).normalize(), // Near
            (r4 - r3).normalize(), // Far
        ];
        
        let mut result = [[0.0; 4]; 6];
        for i in 0..6 {
            result[i] = planes[i].to_array();
        }
        result
    }
}

#[repr(C)]
#[derive(Debug, Copy, Clone, bytemuck::Pod, bytemuck::Zeroable)]
pub struct CameraUniform {
    pub view_proj: [[f32; 4]; 4],
    pub view: [[f32; 4]; 4],
    pub proj: [[f32; 4]; 4],
    pub inv_view_proj: [[f32; 4]; 4],
    pub eye_position: [f32; 4], // w is padding
    pub num_lights: u32,
    pub _padding: [u32; 3],
    pub light_view_proj: [[f32; 4]; 4],
}

impl CameraUniform {
    pub fn new() -> Self {
        use glam::Mat4;
        Self {
            view_proj: Mat4::IDENTITY.to_cols_array_2d(),
            view: Mat4::IDENTITY.to_cols_array_2d(),
            proj: Mat4::IDENTITY.to_cols_array_2d(),
            inv_view_proj: Mat4::IDENTITY.to_cols_array_2d(),
            eye_position: [0.0; 4],
            num_lights: 0,
            _padding: [0; 3],
            light_view_proj: Mat4::IDENTITY.to_cols_array_2d(),
        }
    }

    pub fn update_view_proj(&mut self, camera: &Camera) {
        let view = camera.build_view_matrix();
        let proj = camera.build_projection_matrix();
        let view_proj = proj * view;
        let inv_view_proj = view_proj.inverse();

        self.view_proj = view_proj.to_cols_array_2d();
        self.view = view.to_cols_array_2d();
        self.proj = proj.to_cols_array_2d();
        self.inv_view_proj = inv_view_proj.to_cols_array_2d();
        self.eye_position = [camera.eye.x, camera.eye.y, camera.eye.z, 1.0];
    }
}
