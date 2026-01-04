import asyncio
import numpy as np
import wave
import time
import logging

logger = logging.getLogger(__name__)

class AudioStream:
    def __init__(self, chunk_size=1024, sample_rate=44100):
        self.chunk_size = chunk_size
        self.sample_rate = sample_rate
        self.active = False

    async def stream(self):
        raise NotImplementedError

class SimulatedFileStream(AudioStream):
    """
    Simulates a live audio stream by reading a WAV file (or generating noise if none).
    """
    def __init__(self, filepath=None, chunk_size=1024, sample_rate=44100):
        super().__init__(chunk_size, sample_rate)
        self.filepath = filepath

    async def stream(self):
        self.active = True
        logger.info("Starting simulated audio stream (Synthetic Beat)")

        # If no file, generate a synthetic beat signal
        # 120 BPM = 2 beats per second = beat every 0.5s
        t = 0.0
        dt = self.chunk_size / self.sample_rate

        while self.active:
            # Generate a chunk of audio
            # Sine wave 50Hz (Kick) + High Hat noise

            # Time array for this chunk
            chunk_time = np.arange(t, t + dt, 1.0/self.sample_rate)
            t += dt

            # Kick drum on integer seconds and half seconds (0, 0.5, 1.0...)
            # We approximate by modulating amplitude based on time

            # Simple 4/4 beat simulation
            # Beat happens if (t % 0.5) is close to 0

            beat_phase = (chunk_time % 0.5) * 2 * np.pi # 0 to 2pi every 0.5s

            # Signal: Sine wave whose amplitude decays quickly after beat
            decay = np.exp(-10 * (chunk_time % 0.5))
            signal = np.sin(2 * np.pi * 60 * chunk_time) * decay

            # Add some noise
            noise = np.random.normal(0, 0.05, len(chunk_time))

            audio_chunk = (signal + noise).astype(np.float32)

            yield audio_chunk

            # Sleep to simulate real-time
            await asyncio.sleep(dt)

class LiveStream(AudioStream):
    """
    Captures system audio using PyAudio.
    """
    def __init__(self, device_index=None, chunk_size=1024, sample_rate=44100):
        super().__init__(chunk_size, sample_rate)
        self.device_index = device_index
        import pyaudio
        self.p = pyaudio.PyAudio()

    async def stream(self):
        import pyaudio
        self.active = True
        try:
            stream = self.p.open(format=pyaudio.paFloat32,
                                 channels=1,
                                 rate=self.sample_rate,
                                 input=True,
                                 input_device_index=self.device_index,
                                 frames_per_buffer=self.chunk_size)

            logger.info("Starting live audio stream")

            while self.active:
                data = stream.read(self.chunk_size, exception_on_overflow=False)
                # Convert bytes to numpy array
                audio_chunk = np.frombuffer(data, dtype=np.float32)
                yield audio_chunk
                await asyncio.sleep(0) # Yield control

        except Exception as e:
            logger.error(f"Error in live stream: {e}")
        finally:
            if 'stream' in locals():
                stream.stop_stream()
                stream.close()
