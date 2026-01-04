// AssetManager.ts
// Handles asset generation and loading

export class AssetManager {
  private apiBase: string;

  constructor(apiBase: string = 'http://localhost:8000') {
    this.apiBase = apiBase;
  }

  async generateTexture(prompt: string): Promise<string> {
    console.log(`Requesting asset generation for: ${prompt}`);
    try {
      const res = await fetch(`${this.apiBase}/generate-asset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);

      const data = await res.json();
      if (data.status === 'success' && data.url) {
        return data.url;
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (e) {
      console.error('Asset generation failed:', e);
      throw e;
    }
  }

  async loadImageBitmap(url: string): Promise<ImageBitmap> {
    const res = await fetch(url);
    const blob = await res.blob();
    return await createImageBitmap(blob);
  }
}
