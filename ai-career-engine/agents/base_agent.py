from __future__ import annotations
import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from llm.provider import LLMProvider
from models.schemas import AgentResult

# Configure logging for agents
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


class BaseAgent(ABC):
    """Abstract Base Agent providing standardized execution context, timing, logging, LLM provider access, and error handling."""

    def __init__(self, name: str, version: str = "1.0.0", llm_provider: Optional[LLMProvider] = None):
        self.name = name
        self.version = version
        self.logger = logging.getLogger(f"agent.{name}")
        self.llm = llm_provider or LLMProvider()

    def execute(self, context: Dict[str, Any]) -> AgentResult:
        """Executes the agent lifecycle with context validation, timing, and error safety."""
        start = time.perf_counter()
        try:
            self.validate_context(context)
            result = self.run(context)
            elapsed = time.perf_counter() - start
            self.logger.info("%s completed in %.3fs", self.name, elapsed)
            return result
        except Exception as exc:
            self.logger.exception("%s execution failed", self.name)
            return AgentResult(
                agent=self.name,
                status="error",
                summary=f"Agent {self.name} encountered an unhandled exception.",
                errors=[str(exc)],
            )

    def validate_context(self, context: Dict[str, Any]) -> None:
        """Validates that context is a dictionary."""
        if not isinstance(context, dict):
            raise TypeError("Agent context must be a dictionary.")

    @abstractmethod
    def run(self, context: Dict[str, Any]) -> AgentResult:
        """Core execution logic to be implemented by each agent subclass."""
        pass
