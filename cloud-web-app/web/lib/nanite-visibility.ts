/**
 * Visibility-buffer render pass for Nanite-like runtime.
 */
import * as THREE from 'three';
import type { Meshlet, VirtualizedMesh } from './nanite-types';

export class VisibilityBufferRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private visibilityBuffer: WebGLTexture | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private visibilityProgram: WebGLProgram | null = null;
  private resolveProgram: WebGLProgram | null = null;
  
  initialize(gl: WebGL2RenderingContext, width: number, height: number): void {
    this.gl = gl;
    this.createVisibilityBuffer(width, height);
    this.createShaders();
  }
  
  private createVisibilityBuffer(width: number, height: number): void {
    if (!this.gl) return;
    
    const gl = this.gl;
    
    // Visibility buffer armazena: meshletId (16 bits) + triangleId (16 bits)
    this.visibilityBuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.visibilityBuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32UI, width, height, 0, gl.RED_INTEGER, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    // Framebuffer
    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.visibilityBuffer, 0);
    
    // Depth buffer
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  
  private createShaders(): void {
    if (!this.gl) return;
    
    const gl = this.gl;
    
    // Visibility pass shader
    const visVS = `#version 300 es
      layout(location = 0) in vec3 aPosition;
      
      uniform mat4 uMVP;
      flat out uint vMeshletTriangleId;
      
      void main() {
        gl_Position = uMVP * vec4(aPosition, 1.0);
        // meshletId seria passado via instancing ou UBO
        vMeshletTriangleId = uint(gl_VertexID / 3);
      }
    `;
    
    const visFS = `#version 300 es
      precision highp float;
      precision highp usampler2D;
      
      flat in uint vMeshletTriangleId;
      out uint fragId;
      
      void main() {
        fragId = vMeshletTriangleId;
      }
    `;
    
    // Resolve shader - reconstói cor/material do visibility buffer
    const resolveVS = `#version 300 es
      layout(location = 0) in vec2 aPosition;
      out vec2 vUV;
      
      void main() {
        vUV = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;
    
    const resolveFS = `#version 300 es
      precision highp float;
      precision highp usampler2D;
      
      uniform usampler2D uVisibilityBuffer;
      uniform sampler2D uVertexBuffer;
      uniform sampler2D uMaterialBuffer;
      
      in vec2 vUV;
      out vec4 fragColor;
      
      void main() {
        uint id = texture(uVisibilityBuffer, vUV).r;
        
        // Decodificar meshlet e triangle ID
        uint meshletId = id >> 16u;
        uint triangleId = id & 0xFFFFu;
        
        // Buscar atributos do vértice e material
        // (simplificado - versão completa buscaria de buffers)
        
        fragColor = vec4(
          float(meshletId % 256u) / 255.0,
          float(triangleId % 256u) / 255.0,
          0.5,
          1.0
        );
      }
    `;
    
    this.visibilityProgram = this.compileProgram(visVS, visFS);
    this.resolveProgram = this.compileProgram(resolveVS, resolveFS);
  }
  
  private compileProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    if (!this.gl) return null;
    
    const gl = this.gl;
    
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    return program;
  }
  
  /**
   * Renderiza meshlets para o visibility buffer
   */
  renderVisibilityPass(meshlets: Meshlet[], mesh: VirtualizedMesh, mvp: THREE.Matrix4): void {
    if (!this.gl || !this.framebuffer || !this.visibilityProgram) return;
    
    const gl = this.gl;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.visibilityProgram);
    
    const mvpLoc = gl.getUniformLocation(this.visibilityProgram, 'uMVP');
    gl.uniformMatrix4fv(mvpLoc, false, mvp.elements);
    
    // Renderizar cada meshlet
    for (const meshlet of meshlets) {
      // Em uma implementação real, usaríamos indirect drawing
      // e batch todos os meshlets visíveis juntos
      gl.drawArrays(gl.TRIANGLES, meshlet.triangleOffset, meshlet.triangleCount * 3);
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  
  /**
   * Resolve o visibility buffer para cor final
   */
  resolvePass(): void {
    if (!this.gl || !this.resolveProgram || !this.visibilityBuffer) return;
    
    const gl = this.gl;
    
    gl.useProgram(this.resolveProgram);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.visibilityBuffer);
    gl.uniform1i(gl.getUniformLocation(this.resolveProgram, 'uVisibilityBuffer'), 0);
    
    // Renderizar fullscreen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

