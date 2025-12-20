"""Abstract base class for LLM providers."""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional, List, Dict, Any


class LLMProvider(ABC):
    """Abstract base class for LLM providers.

    Provides a unified interface for different LLM providers (OpenAI, Gemini, etc.)
    optimized for low-latency voice agent applications.
    """

    def __init__(self, api_key: str, model: Optional[str] = None):
        """Initialize the LLM provider.

        Args:
            api_key: API key for the provider
            model: Model identifier (provider-specific)
        """
        self.api_key = api_key
        self.model = model

    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        functions: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate a complete response from the LLM.

        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            functions: Optional list of function definitions for function calling
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens to generate

        Returns:
            Generated response text

        Raises:
            Exception: If the API call fails
        """
        pass

    @abstractmethod
    async def stream_response(
        self,
        messages: List[Dict[str, str]],
        functions: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens from the LLM.

        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            functions: Optional list of function definitions for function calling
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens to generate

        Yields:
            Response text chunks as they are generated

        Raises:
            Exception: If the API call fails
        """
        pass

    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model.

        Returns:
            Dictionary containing model metadata:
                - name: Model identifier
                - provider: Provider name (e.g., 'openai', 'gemini')
                - max_tokens: Maximum context window size
                - supports_functions: Whether function calling is supported
                - latency_tier: Latency tier ('low', 'medium', 'high')
                - cost_per_1k_tokens: Approximate cost per 1000 tokens
        """
        pass

    def supports_function_calling(self) -> bool:
        """Check if the provider supports function calling.

        Returns:
            True if function calling is supported
        """
        model_info = self.get_model_info()
        return model_info.get("supports_functions", False)

    def get_provider_name(self) -> str:
        """Get the provider name.

        Returns:
            Provider name string
        """
        model_info = self.get_model_info()
        return model_info.get("provider", "unknown")

    def get_latency_tier(self) -> str:
        """Get the latency tier for this model.

        Returns:
            Latency tier ('low', 'medium', 'high')
        """
        model_info = self.get_model_info()
        return model_info.get("latency_tier", "medium")
