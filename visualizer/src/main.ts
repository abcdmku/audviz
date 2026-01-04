// main.ts
import { SignalManager } from './SignalManager';
import { VisualizerEngine } from './VisualizerEngine';
import { AssetManager } from './AssetManager';

// Configuration
const WS_URL = ((window.location.protocol === 'https:') ? 'wss://' : 'ws://') + window.location.hostname + ':8000/ws/audio-analysis';
const API_URL = window.location.origin.replace('8080', '8000'); // Assuming standard ports

async function main() {
  console.log("Initializing DJ Visualizer...");

  // 1. Setup UI Elements
  const canvas = document.getElementById('visualizer-canvas') as HTMLCanvasElement;
  const statusEl = document.getElementById('status')!;
  const energyBar = document.getElementById('energy-bar')!;
  const beatIndicator = document.getElementById('beat-indicator')!;
  const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
  const generateBtn = document.getElementById('generate-btn')!;

  // Resize canvas
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // 2. Initialize Components
  const signalManager = new SignalManager(WS_URL);
  const assetManager = new AssetManager(API_URL);
  const engine = new VisualizerEngine(canvas);

  try {
    await engine.init();
    console.log("WebGPU Engine Initialized");
  } catch (e) {
    console.error("Failed to init WebGPU:", e);
    statusEl.innerText = `Error: WebGPU init failed (${e})`;
    statusEl.style.color = 'red';
  }

  // 3. Connect Signals
  signalManager.subscribe((data) => {
    // Update Engine
    engine.updateState(data.energy, data.is_beat);

    // Update UI (simplified debug view)
    energyBar.style.width = `${data.energy * 100}%`;

    if (data.is_beat) {
      beatIndicator.classList.add('beat-active');
      setTimeout(() => beatIndicator.classList.remove('beat-active'), 100);
    }

    if (signalManager.connected) {
        statusEl.innerText = "Connected: Live Audio Analysis";
        statusEl.style.color = "#0f0";
    }
  });

  signalManager.connect();

  // 4. Handle Interaction
  generateBtn.addEventListener('click', async () => {
    const prompt = promptInput.value;
    if (!prompt) return;

    statusEl.innerText = "Generating Asset...";
    statusEl.style.color = "yellow";

    try {
      const url = await assetManager.generateTexture(prompt);
      console.log("Asset generated:", url);
      statusEl.innerText = "Loading Asset...";

      const bitmap = await assetManager.loadImageBitmap(url);
      await engine.loadTexture(bitmap);

      statusEl.innerText = "Asset Loaded!";
      statusEl.style.color = "#0f0";
      promptInput.value = "";
    } catch (e) {
      statusEl.innerText = "Generation Failed";
      statusEl.style.color = "red";
    }
  });
}

main().catch(console.error);
