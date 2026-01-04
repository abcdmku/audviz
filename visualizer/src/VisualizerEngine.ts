// VisualizerEngine.ts
// WebGPU logic

export class VisualizerEngine {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private pipeline: GPURenderPipeline | null = null;

  // State
  private energy: number = 0;
  private beat: number = 0; // decayed beat value

  // Uniforms
  private uniformBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;

  // Textures
  private texture: GPUTexture | null = null;
  private sampler: GPUSampler | null = null;
  private defaultTexture: GPUTexture | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init() {
    if (!navigator.gpu) {
      throw new Error("WebGPU not supported on this browser.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No WebGPU adapter found.");

    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;

    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: format,
      alphaMode: 'premultiplied'
    });

    // Create default fallback texture (1x1 white pixel)
    this.createDefaultTexture();

    // Create sampler
    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    await this.createPipeline(format);
    this.startLoop();
  }

  createDefaultTexture() {
    if (!this.device) return;
    this.defaultTexture = this.device.createTexture({
      size: [1, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.device.queue.writeTexture(
      { texture: this.defaultTexture },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4, rowsPerImage: 1 },
      [1, 1]
    );
    this.texture = this.defaultTexture;
  }

  async loadTexture(bitmap: ImageBitmap) {
    if (!this.device) return;

    const texture = this.device.createTexture({
      size: [bitmap.width, bitmap.height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture: texture },
      [bitmap.width, bitmap.height]
    );

    this.texture = texture;

    // Recreate bind group with new texture
    // In a real engine, we'd have a separate bind group for materials to avoid rebuilding pipeline layout
    // But here we just update the bind group assuming layout is same
    this.updateBindGroup();
    console.log("Texture updated on GPU");
  }

  updateBindGroup() {
    if (!this.device || !this.pipeline || !this.uniformBuffer || !this.texture || !this.sampler) return;

    // We need to re-create the bind group. We stored the layout?
    // Actually, we can just get the layout from the pipeline.
    const bindGroupLayout = this.pipeline.getBindGroupLayout(0);

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: this.texture.createView() }
      ]
    });
  }

  async createPipeline(format: GPUTextureFormat) {
    if (!this.device) return;

    const shaderModule = this.device.createShaderModule({
      code: `
        struct Uniforms {
          energy: f32,
          beat: f32,
          time: f32,
          padding: f32,
        };
        @group(0) @binding(0) var<uniform> uniforms: Uniforms;
        @group(0) @binding(1) var mySampler: sampler;
        @group(0) @binding(2) var myTexture: texture_2d<f32>;

        struct VertexOutput {
          @builtin(position) Position : vec4<f32>,
          @location(0) uv : vec2<f32>,
        };

        @vertex
        fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
          var pos = array<vec2<f32>, 3>(
            vec2<f32>(-1.0, -1.0),
            vec2<f32>( 3.0, -1.0),
            vec2<f32>(-1.0,  3.0)
          );
          var output : VertexOutput;
          output.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
          output.uv = pos[VertexIndex] * 0.5 + 0.5;
          // Invert Y for texture coordinates if needed, but WebGPU is usually bottom-left origin?
          // Actually WebGPU UVs are usually top-left logic for images but NDCS is Y-up.
          // We'll flip V to match standard texture mapping if image appears upside down.
          output.uv.y = 1.0 - output.uv.y;
          return output;
        }

        @fragment
        fn fs_main(@location(0) uv : vec2<f32>) -> @location(0) vec4<f32> {
          // Sample texture
          let texColor = textureSample(myTexture, mySampler, uv);

          // Simple visualization: Pulse logic
          let center = vec2<f32>(0.5, 0.5);
          let dist = distance(uv, center);

          let pulse = uniforms.beat * 0.1;

          // Distort UV based on energy
          let distortedUV = uv;
          // distortedUV.x += sin(uv.y * 10.0 + uniforms.time) * uniforms.energy * 0.05;

          // Color Tint logic
          // If texture is white (default), we use procedural color.
          // If texture is loaded, we tint it with energy.

          // Let's just multiply texture by some energy glow
          let glow = 0.5 + uniforms.energy * 0.5 + pulse;

          return texColor * glow;
        }
      `
    });

    this.uniformBuffer = this.device.createBuffer({
      size: 16, // 4 floats * 4 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      ]
    });

    // Initial bind group with default texture
    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.sampler! },
        { binding: 2, resource: this.texture!.createView() }
      ]
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }

  updateState(energy: number, is_beat: boolean) {
    this.energy = energy;
    if (is_beat) {
      this.beat = 1.0;
    }
  }

  startLoop() {
    const frame = () => {
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  render() {
    if (!this.device || !this.context || !this.pipeline || !this.uniformBuffer || !this.bindGroup) return;

    // Decay beat
    this.beat *= 0.9;

    // Update Uniforms
    const time = performance.now() / 1000.0;
    const uniforms = new Float32Array([this.energy, this.beat, time, 0.0]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms);

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }, // Dark gray background
        loadOp: 'clear',
        storeOp: 'store',
      }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(3, 1, 0, 0); // Draw 3 vertices (1 triangle covering screen)
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
