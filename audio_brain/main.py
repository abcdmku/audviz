import os
import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analyzer import AudioAnalyzer
from audio_stream import SimulatedFileStream, LiveStream
from cloud_gateway import get_generator

# Configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AudioBrain")

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
ANALYZER = AudioAnalyzer()
ASSET_GENERATOR = get_generator(os.getenv("ASSET_GENERATION_MODE", "online_free"))
USE_SIMULATED = os.getenv("USE_SIMULATED_AUDIO", "true").lower() == "true"

class PromptRequest(BaseModel):
    prompt: str

@app.get("/")
async def root():
    return {"status": "running", "service": "DJ Visualizer Brain"}

@app.post("/generate-asset")
async def generate_asset(request: PromptRequest):
    """
    Endpoint to trigger AI asset generation.
    Returns a URL to the generated image.
    """
    logger.info(f"Received asset generation request: {request.prompt}")
    try:
        url = await ASSET_GENERATOR.generate_texture(request.prompt)
        return {"status": "success", "url": url}
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return {"status": "error", "message": str(e)}

@app.websocket("/ws/audio-analysis")
async def audio_analysis_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Visualizer connected to WebSocket")

    # Select Audio Stream
    if USE_SIMULATED:
        streamer = SimulatedFileStream()
    else:
        # In a real deployment, we'd handle device selection
        streamer = LiveStream()

    try:
        async for audio_chunk in streamer.stream():
            # Analyze Frame
            analysis = ANALYZER.process_frame(audio_chunk)

            # Send Data
            await websocket.send_json(analysis)

            # Check for incoming messages (e.g. pings or control) - non-blocking
            try:
                # We use a very short timeout just to check polling
                # Real implementation might separate read/write tasks
                pass
            except Exception:
                pass

    except WebSocketDisconnect:
        logger.info("Visualizer disconnected")
        streamer.active = False
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        streamer.active = False
