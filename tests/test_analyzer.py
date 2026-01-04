import sys
import os
import numpy as np
import logging

# Add audio_brain to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../audio_brain')))

from analyzer import AudioAnalyzer

def test_beat_detection():
    print("Testing Audio Analyzer...")
    analyzer = AudioAnalyzer()

    # 1. Generate Silence
    silence = np.zeros(1024, dtype=np.float32)
    res = analyzer.process_frame(silence)
    print(f"Silence: {res}")
    assert res['energy'] == 0.0
    assert not res['is_beat']

    # 2. Generate strong beat (Simulate a kick drum)
    # Sine wave pulse
    t = np.linspace(0, 1024/44100, 1024)
    kick = np.sin(2 * np.pi * 60 * t) * 1.0 # Max amplitude

    # Send a few frames of silence then a kick
    for _ in range(5):
        analyzer.process_frame(silence)

    res = analyzer.process_frame(kick.astype(np.float32))
    print(f"Kick: {res}")

    # Note: Our simple detector compares to previous flux.
    # Current energy should be high (normalized to ~1.0 if rms high)
    assert res['energy'] > 0.5
    assert res['is_beat'] == True

    print("Analyzer Test Passed!")

if __name__ == "__main__":
    test_beat_detection()
