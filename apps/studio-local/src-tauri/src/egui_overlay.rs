use egui_wgpu::wgpu;
use egui_winit::winit;
use std::sync::Arc;
use winit::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder},
    window::WindowBuilder,
};

/// Launches a native debug overlay bypassing React DOM for maximum performance and direct GPU inspection.
#[tauri::command]
pub async fn launch_native_egui_overlay() -> Result<(), String> {
    std::thread::spawn(|| {
        if let Err(e) = run_egui_loop() {
            eprintln!("Egui overlay failed: {}", e);
        }
    });
    Ok(())
}

fn run_egui_loop() -> Result<(), String> {
    let event_loop = EventLoopBuilder::new().build().map_err(|e| e.to_string())?;
    let window = Arc::new(
        WindowBuilder::new()
            .with_title("Aethel Engine - Native Egui Overlay")
            .with_inner_size(winit::dpi::PhysicalSize::new(800, 600))
            .build(&event_loop)
            .map_err(|e| e.to_string())?,
    );

    let instance = wgpu::Instance::new(wgpu::InstanceDescriptor::default());
    let surface = instance.create_surface(window.clone()).map_err(|e| e.to_string())?;

    let adapter = pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
        power_preference: wgpu::PowerPreference::HighPerformance,
        compatible_surface: Some(&surface),
        force_fallback_adapter: false,
    }))
    .ok_or("No adapter found")?;

    let (device, queue) = pollster::block_on(adapter.request_device(
        &wgpu::DeviceDescriptor {
            label: Some("Egui Overlay Device"),
            required_features: wgpu::Features::empty(),
            required_limits: wgpu::Limits::default(),
        },
        None,
    ))
    .map_err(|e| e.to_string())?;

    let surface_caps = surface.get_capabilities(&adapter);
    let surface_format = surface_caps
        .formats
        .iter()
        .copied()
        .find(|f| f.is_srgb())
        .unwrap_or(surface_caps.formats[0]);

    let mut surface_config = surface.get_default_config(&adapter, 800, 600).unwrap();
    surface_config.format = surface_format;
    surface.configure(&device, &surface_config);

    let egui_ctx = egui::Context::default();
    let mut egui_winit_state = egui_winit::State::new(
        egui_ctx.clone(),
        egui::viewport::ViewportId::ROOT,
        &window,
        Some(window.scale_factor() as f32),
        None,
    );

    let mut egui_renderer = egui_wgpu::Renderer::new(&device, surface_format, None, 1);

    event_loop.run(move |event, elwt| {
        elwt.set_control_flow(ControlFlow::Poll);

        match event {
            Event::WindowEvent { event, .. } => {
                let response = egui_winit_state.on_window_event(&window, &event);
                if response.consumed {
                    return;
                }
                match event {
                    WindowEvent::CloseRequested => elwt.exit(),
                    WindowEvent::Resized(size) => {
                        if size.width > 0 && size.height > 0 {
                            surface_config.width = size.width;
                            surface_config.height = size.height;
                            surface.configure(&device, &surface_config);
                            window.request_redraw();
                        }
                    }
                    WindowEvent::RedrawRequested => {
                        let raw_input = egui_winit_state.take_egui_input(&window);
                        let full_output = egui_ctx.run(raw_input, |ctx| {
                            egui::Window::new("Aethel Native Telemetry")
                                .show(ctx, |ui| {
                                    ui.label("Egui Native Overlay Active");
                                    ui.label("Bypassing React DOM.");
                                    if ui.button("Close").clicked() {
                                        elwt.exit();
                                    }
                                });
                        });

                        egui_winit_state.handle_platform_output(&window, full_output.platform_output);

                        let tris = egui_ctx.tessellate(full_output.shapes, full_output.pixels_per_point);
                        for (id, image_delta) in &full_output.textures_delta.set {
                            egui_renderer.update_texture(&device, &queue, *id, image_delta);
                        }

                        let frame = match surface.get_current_texture() {
                            Ok(frame) => frame,
                            Err(_) => return,
                        };
                        let view = frame.texture.create_view(&wgpu::TextureViewDescriptor::default());
                        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
                            label: Some("egui_encoder"),
                        });

                        let screen_descriptor = egui_wgpu::ScreenDescriptor {
                            size_in_pixels: [surface_config.width, surface_config.height],
                            pixels_per_point: full_output.pixels_per_point,
                        };

                        egui_renderer.update_buffers(
                            &device,
                            &queue,
                            &mut encoder,
                            &tris,
                            &screen_descriptor,
                        );

                        {
                            let mut rpass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                                label: Some("egui_rpass"),
                                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                                    view: &view,
                                    resolve_target: None,
                                    ops: wgpu::Operations {
                                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                                        store: wgpu::StoreOp::Store,
                                    },
                                })],
                                depth_stencil_attachment: None,
                                timestamp_writes: None,
                                occlusion_query_set: None,
                            });
                            egui_renderer.render(&mut rpass, &tris, &screen_descriptor);
                        }

                        queue.submit(Some(encoder.finish()));
                        frame.present();

                        for id in &full_output.textures_delta.free {
                            egui_renderer.free_texture(id);
                        }
                    }
                    _ => {}
                }
            }
            Event::AboutToWait => {
                window.request_redraw();
            }
            _ => {}
        }
    }).unwrap();
    Ok(())
}
