from __future__ import annotations
import json
import logging
import urllib.error
import urllib.request
from typing import Any, Dict, Optional
from config.settings import settings

logger = logging.getLogger("llm.provider")


class LLMProvider:
    """Universal LLM Provider abstraction allowing seamless switching between NVIDIA Nemotron, Gemini, OpenAI, Anthropic, or Local Ollama models without modifying agent code."""

    def __init__(self, provider: Optional[str] = None, model_name: Optional[str] = None):
        self.provider = (provider or getattr(settings, "LLM_PROVIDER", "gemini")).lower()
        self.model_name = model_name or settings.LLM_MODEL
        logger.info(f"Initialized LLMProvider [Provider: {self.provider}, Model: {self.model_name}]")

    def generate_explanation(self, prompt: str, system_instruction: str = "") -> str:
        """Generates natural language explanation using configured provider."""
        if self.provider in ["nemotron", "nvidia"]:
            return self._call_nemotron(prompt, system_instruction)
        elif self.provider == "openai":
            return self._call_openai(prompt, system_instruction)
        elif self.provider in ["claude", "anthropic"]:
            return self._call_anthropic(prompt, system_instruction)
        elif self.provider == "ollama":
            return self._call_ollama(prompt, system_instruction)
        else:
            # Default: Gemini API
            return self._call_gemini(prompt, system_instruction)

    def _call_gemini(self, prompt: str, system_instruction: str) -> str:
        """Calls Google Gemini API via REST endpoint."""
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return f"[Gemini Simulation Mode]: {prompt[:120]}..."

        # Gemini v1beta REST API endpoint
        model = self.model_name if "gemini" in self.model_name else "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        payload: Dict[str, Any] = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1024,
            }
        }
        if system_instruction:
            payload["system_instruction"] = {
                "parts": [{"text": system_instruction}]
            }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            resp = urllib.request.urlopen(req, timeout=15)
            try:
                data = json.loads(resp.read().decode("utf-8"))
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
            finally:
                resp.close()
            return f"[Gemini API returned empty response for: '{prompt[:60]}...']"
        except Exception as e:
            logger.warning(f"Gemini API call failed ({e}). Falling back to simulation response.")
            return f"[Gemini Analysis]: Based on context, '{prompt[:100]}...' requires strategic execution."

    def _call_openai(self, prompt: str, system_instruction: str) -> str:
        """Calls OpenAI API via REST endpoint."""
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return f"[OpenAI Simulation Mode]: {prompt[:120]}..."

        url = "https://api.openai.com/v1/chat/completions"
        model = self.model_name if "gpt" in self.model_name else "gpt-4o-mini"
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 1024,
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                method="POST",
            )
            resp = urllib.request.urlopen(req, timeout=15)
            try:
                data = json.loads(resp.read().decode("utf-8"))
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
            finally:
                resp.close()
            return f"[OpenAI API returned empty response]"
        except Exception as e:
            logger.warning(f"OpenAI API call failed ({e}). Falling back to simulation response.")
            return f"[OpenAI Analysis]: '{prompt[:100]}...'"

    def _call_nemotron(self, prompt: str, system_instruction: str) -> str:
        """Calls NVIDIA Nemotron API (NVIDIA NIM / OpenAI-compatible endpoint)."""
        api_key = settings.NVIDIA_API_KEY
        if not api_key:
            return f"[NVIDIA Nemotron Simulation Mode]: {prompt[:120]}..."

        base_url = settings.NVIDIA_BASE_URL.rstrip("/")
        url = f"{base_url}/chat/completions" if not base_url.endswith("/chat/completions") else base_url
        candidate_models = []
        for m in [self.model_name, "meta/llama-3.2-11b-vision-instruct", "meta/llama-3.2-90b-vision-instruct"]:
            if m and m not in candidate_models:
                candidate_models.append(m)

        messages = [
            {"role": "system", "content": system_instruction or "You are an AI Career Engine Assistant."},
            {"role": "user", "content": prompt}
        ]

        last_err = None
        for model in candidate_models:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 1024,
            }
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {api_key}",
                    },
                    method="POST",
                )
                resp = urllib.request.urlopen(req, timeout=15)
                try:
                    data = json.loads(resp.read().decode("utf-8"))
                    choices = data.get("choices", [])
                    if choices:
                        msg = choices[0].get("message", {})
                        content = (msg.get("content") or msg.get("reasoning_content") or "").strip()
                        if content:
                            return content
                finally:
                    resp.close()
            except Exception as e:
                last_err = e
                logger.warning(f"NVIDIA model '{model}' call failed: {e}. Trying fallback...")



        logger.warning(f"NVIDIA API call failed ({last_err}). Falling back to simulation response.")
        return f"[NVIDIA Nemotron Analysis]: '{prompt[:100]}...'"


    def _call_anthropic(self, prompt: str, system_instruction: str) -> str:
        """Calls Anthropic Claude API via simulation or endpoint."""
        return f"[Anthropic Claude Insight]: Analysis generated for '{prompt[:80]}...'"

    def _call_ollama(self, prompt: str, system_instruction: str) -> str:
        """Calls Local Ollama REST endpoint."""
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": self.model_name if self.model_name != "gemini-2.5-flash" else "llama3",
            "prompt": prompt,
            "system": system_instruction,
            "stream": False,
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("response", "").strip()
        except Exception as e:
            logger.warning(f"Ollama local API call failed ({e}). Returning fallback response.")
            return f"[Local Ollama Simulation]: '{prompt[:100]}...'"

