//! Console HAL desktop path (letter **bs**): wgpu documents Vulkan / DX12 / Metal
//! via `wgpu::Backends` for studio-local. Maps to TS `lib/immunity/console-hal.ts`
//! negotiate (`webgpu` / `vulkan` / `dx12`). **PS5 GNM always HELD** — no proprietary
//! SDK in this module; never claim `ps5GnmReady`. Live present/submit soak remains HELD.

use std::sync::Arc;
use tauri::Window;

use crate::gpu_culling::GpuCullingPipeline;

pub struct WgpuRenderer {
    pub instance: wgpu::Instance,
    pub surface: wgpu::Surface<'static>,
    pub adapter: wgpu::Adapter,
    pub device: Arc<wgpu::Device>,
    pub queue: Arc<wgpu::Queue>,
    /// Missão Suprema 6 — GPU-Driven Rendering: built once alongside the
    /// device so frustum/occlusion culling can dispatch every frame without
    /// touching shader compilation again.
    pub culling: GpuCullingPipeline,
}

impl WgpuRenderer {
    /// Compiles and creates a Compute Pipeline from a raw WGSL shader string.
    pub fn create_compute_pipeline(&self, shader_source: &str, entry_point: &str) -> wgpu::ComputePipeline {
        let shader = self.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Compute Shader"),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });

        self.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Compute Pipeline"),
            layout: None,
            module: &shader,
            entry_point,
            compilation_options: Default::default(),
        })
    }

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

        let culling = GpuCullingPipeline::new(&device);

        Ok(Self {
            instance,
            surface,
            adapter,
            device: Arc::new(device),
            queue: Arc::new(queue),
            culling,
        })
    }
}
