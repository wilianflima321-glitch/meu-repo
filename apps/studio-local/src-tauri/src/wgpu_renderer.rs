use std::sync::Arc;
use tauri::Window;

pub struct WgpuRenderer {
    pub instance: wgpu::Instance,
    pub surface: wgpu::Surface<'static>,
    pub adapter: wgpu::Adapter,
    pub device: Arc<wgpu::Device>,
    pub queue: Arc<wgpu::Queue>,
}

impl WgpuRenderer {
    /// Mounts the Vulkan/Metal renderer directly onto the Tauri OS Window.
    /// This bypasses the Chromium WebView to allocate a raw Vulkan/Metal surface.
    pub async fn mount_on_window(window: Arc<Window>) -> Result<Self, String> {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });

        // Safety: The Tauri Window must outlive the surface. We use Arc to ensure lifetime.
        let surface = unsafe { instance.create_surface(window.clone()).map_err(|e| e.to_string())? };

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await
            .ok_or("Failed to find an appropriate GPU adapter for Aethel Engine")?;

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("Aethel Engine Native Device"),
                    required_features: wgpu::Features::POLYGON_MODE_LINE
                        | wgpu::Features::SPIRV_SHADER_PASSTHROUGH,
                    required_limits: wgpu::Limits::default(),
                },
                None,
            )
            .await
            .map_err(|e| format!("Failed to request device: {}", e))?;

        Ok(Self {
            instance,
            surface,
            adapter,
            device: Arc::new(device),
            queue: Arc::new(queue),
        })
    }
}
