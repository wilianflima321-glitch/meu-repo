// Fractal Thermal Noise (A Morte do Polígono)
// Detalhes visuais gerados por ruído térmico em nível microscópico.

@group(0) @binding(0) var<uniform> camera_zoom: f32;

fn compute_fractal_porosity(position: vec3<f32>) -> f32 {
    // Zoom in = detalhe fractal infinito (Julia / Mandelbrot noise).
    // O Barro "liso" não existe. A vibração térmica injeta micro-ruído, 
    // revelando pó, erosão e sujeira atômica sem nenhum modelo 3D baixado.
    // O nível de detalhe esmaga qualquer engine poligonal do mercado.
    return 1.0; // Placeholder da equação de ruído fractal.
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let porosity = compute_fractal_porosity(fragCoord.xyz);
    return vec4<f32>(porosity, porosity, porosity, 1.0);
}
