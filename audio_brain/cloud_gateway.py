import abc
import logging
import requests
import urllib.parse

logger = logging.getLogger(__name__)

class AssetGenerator(abc.ABC):
    @abc.abstractmethod
    async def generate_texture(self, prompt: str) -> str:
        """Generates a texture/image from a prompt and returns the URL or Base64 data."""
        pass

class PollinationsGenerator(AssetGenerator):
    """
    Uses the free Pollinations.ai API.
    URL format: https://image.pollinations.ai/prompt/{encoded_prompt}
    """
    BASE_URL = "https://image.pollinations.ai/prompt/"

    async def generate_texture(self, prompt: str) -> str:
        logger.info(f"Generating image via Pollinations.ai for prompt: {prompt}")
        encoded_prompt = urllib.parse.quote(prompt)
        # We append a random seed or parameter to ensure freshness if needed,
        # but Pollinations typically generates a new one.
        # Let's add 'texture' and 'seamless' keywords to help the model.
        enhanced_prompt = f"{encoded_prompt}%20texture%20seamless%20high%20quality"

        url = f"{self.BASE_URL}{enhanced_prompt}"

        # In a real app we might want to download and cache, but for now
        # returning the URL directly is fine as the frontend can load it.
        # However, verifying it works is good.
        return url

class MockGenerator(AssetGenerator):
    async def generate_texture(self, prompt: str) -> str:
        logger.info("Mock generating texture...")
        return "https://via.placeholder.com/1024x1024.png?text=Mock+Texture"

def get_generator(mode: str) -> AssetGenerator:
    if mode == "online_free":
        return PollinationsGenerator()
    elif mode == "local":
        # Return LocalGenerator() # Not implemented yet
        return MockGenerator()
    else:
        return MockGenerator()
