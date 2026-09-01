from __future__ import annotations
import os
import unittest
from llm.provider import LLMProvider


@unittest.skipUnless(
    os.getenv("NVIDIA_API_KEY"),
    "NVIDIA_API_KEY not configured. Skipping live network tests."
)
class TestNvidiaLLMLive(unittest.TestCase):
    """Live E2E test suite calling real NVIDIA Nemotron API endpoints on demand."""

    def test_live_nemotron_completion(self):
        provider = LLMProvider(provider="nemotron", model_name="nvidia/nemotron-3-ultra-550b-a55b")
        response = provider.generate_explanation(
            prompt="Briefly state one key career development advice in 1 sentence.",
            system_instruction="You are an AI Career Coach."
        )
        self.assertIsNotNone(response)
        self.assertGreater(len(response), 10)
        self.assertNotIn("Simulation Mode", response)


if __name__ == "__main__":
    unittest.main()

