import numpy as np
import logging

logger = logging.getLogger(__name__)

class AudioAnalyzer:
    def __init__(self, sample_rate=44100, chunk_size=1024):
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        self.prev_flux = 0.0
        # Simple energy history for smoothing
        self.energy_history = []

    def process_frame(self, audio_chunk: np.ndarray):
        """
        Process a chunk of audio data and return analysis features.

        Args:
            audio_chunk (np.ndarray): Audio data (float32).

        Returns:
            dict: {
                "energy": float (0.0 - 1.0),
                "is_beat": bool,
                "spectral_flux": float
            }
        """
        if len(audio_chunk) == 0:
            return {"energy": 0.0, "is_beat": False, "spectral_flux": 0.0}

        # 1. Calculate RMS Energy
        rms = np.sqrt(np.mean(audio_chunk**2))
        # Normalize arbitrarily for visualization (assuming typical max input)
        normalized_energy = min(rms * 5.0, 1.0)

        # 2. Simple Onset Detection (Spectral Flux)
        # Compute FFT
        fft = np.fft.rfft(audio_chunk)
        magnitude = np.abs(fft)

        # Calculate flux (positive difference in magnitude)
        # Note: A real robust onset detection needs previous frame magnitude history.
        # Here we implement a simplified version for prototype.
        # In a real system, we'd store prev_magnitude.

        # For this prototype, let's use a simpler energy-based beat detector
        # combined with a high-frequency band check.

        is_beat = False
        if normalized_energy > 0.6 and normalized_energy > (self.prev_flux * 1.5):
             is_beat = True

        self.prev_flux = normalized_energy

        return {
            "energy": float(normalized_energy),
            "is_beat": is_beat,
            "spectral_flux": 0.0 # Placeholder if we don't do full spectral diff
        }
