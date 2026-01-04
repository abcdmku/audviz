import sys
import os
import asyncio
import pytest

# Add audio_brain to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../audio_brain')))

from cloud_gateway import PollinationsGenerator

@pytest.mark.asyncio
async def test_pollinations_api():
    print("Testing Pollinations Generator...")
    gen = PollinationsGenerator()
    prompt = "cyberpunk city night"
    url = await gen.generate_texture(prompt)
    print(f"Generated URL: {url}")

    assert "pollinations.ai" in url
    assert "cyberpunk" in url
    print("Cloud Gateway Test Passed!")

if __name__ == "__main__":
    asyncio.run(test_pollinations_api())
