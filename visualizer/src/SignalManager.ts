// SignalManager.ts
// Handles WebSocket communication with the Audio Brain

export interface AudioAnalysis {
  energy: number;
  is_beat: boolean;
  spectral_flux: number;
}

type SignalCallback = (data: AudioAnalysis) => void;

export class SignalManager {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: SignalCallback[] = [];
  public connected: boolean = false;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    console.log(`Connecting to WS: ${this.url}`);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WS Connected');
      this.connected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const data: AudioAnalysis = JSON.parse(event.data);
        this.notify(data);
      } catch (e) {
        console.error('Failed to parse signal:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('WS Disconnected, retrying in 3s...');
      this.connected = false;
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error('WS Error:', err);
    };
  }

  subscribe(cb: SignalCallback) {
    this.callbacks.push(cb);
  }

  private notify(data: AudioAnalysis) {
    for (const cb of this.callbacks) {
      cb(data);
    }
  }
}
