"""OpenAI LLM provider implementation."""

import os
from typing import AsyncGenerator, Optional, List, Dict, Any
import openai
from openai import AsyncOpenAI

from .llm_provider import LLMProvider


class OpenAIProvider(LLMProvider):
    """OpenAI LLM provider optimized for low-latency voice applications.

    Supports GPT-4o and GPT-4o-mini models with function calling capabilities.
    """

    # Model configurations optimized for voice
    MODEL_CONFIGS = {
        "gpt-4o": {
            "name": "gpt-4o",
            "provider": "openai",
            "max_tokens": 128000,
            "supports_functions": True,
            "latency_tier": "low",
            "cost_per_1k_tokens": 0.005,  # $5 per 1M input tokens
            "description": "Most capable model, optimized for speed and quality",
        },
        "gpt-4o-mini": {
            "name": "gpt-4o-mini",
            "provider": "openai",
            "max_tokens": 128000,
            "supports_functions": True,
            "latency_tier": "low",
            "cost_per_1k_tokens": 0.00015,  # $0.15 per 1M input tokens
            "description": "Fast and affordable model for high-throughput scenarios",
        },
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o-mini",
        organization: Optional[str] = None,
    ):
        """Initialize the OpenAI provider.

        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            model: Model identifier ('gpt-4o' or 'gpt-4o-mini')
            organization: Optional OpenAI organization ID
        """
        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable or api_key parameter required")

        super().__init__(api_key, model)

        if model not in self.MODEL_CONFIGS:
            raise ValueError(
                f"Invalid model: {model}. Supported models: {list(self.MODEL_CONFIGS.keys())}"
            )

        self.client = AsyncOpenAI(
            api_key=api_key,
            organization=organization,
        )

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        functions: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate a complete response from OpenAI.

        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            functions: Optional list of function definitions for function calling
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens to generate

        Returns:
            Generated response text

        Raises:
            openai.APIError: If the API call fails
        """
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }

        if max_tokens:
            kwargs["max_tokens"] = max_tokens

        if functions:
            kwargs["tools"] = [
                {"type": "function", "function": func} for func in functions
            ]
            kwargs["tool_choice"] = "auto"

        try:
            response = await self.client.chat.completions.create(**kwargs)

            # Handle function calls
            message = response.choices[0].message
            if message.tool_calls:
                # Return the function call details
                tool_call = message.tool_calls[0]
                return f"FUNCTION_CALL:{tool_call.function.name}:{tool_call.function.arguments}"

            return message.content or ""

        except openai.APIError as e:
            raise Exception(f"OpenAI API error: {str(e)}") from e

    async def stream_response(
        self,
        messages: List[Dict[str, str]],
        functions: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens from OpenAI.

        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            functions: Optional list of function definitions for function calling
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens to generate

        Yields:
            Response text chunks as they are generated

        Raises:
            openai.APIError: If the API call fails
        """
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "stream": True,
        }

        if max_tokens:
            kwargs["max_tokens"] = max_tokens

        if functions:
            kwargs["tools"] = [
                {"type": "function", "function": func} for func in functions
            ]
            kwargs["tool_choice"] = "auto"

        try:
            stream = await self.client.chat.completions.create(**kwargs)

            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

                # Handle streaming function calls
                if chunk.choices[0].delta.tool_calls:
                    tool_call = chunk.choices[0].delta.tool_calls[0]
                    if tool_call.function.name:
                        yield f"FUNCTION_CALL:{tool_call.function.name}:"
                    if tool_call.function.arguments:
                        yield tool_call.function.arguments

        except openai.APIError as e:
            raise Exception(f"OpenAI API streaming error: {str(e)}") from e

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current OpenAI model.

        Returns:
            Dictionary containing model metadata
        """
        return self.MODEL_CONFIGS[self.model].copy()

    def set_model(self, model: str) -> None:
        """Switch to a different OpenAI model.

        Args:
            model: Model identifier ('gpt-4o' or 'gpt-4o-mini')

        Raises:
            ValueError: If the model is not supported
        """
        if model not in self.MODEL_CONFIGS:
            raise ValueError(
                f"Invalid model: {model}. Supported models: {list(self.MODEL_CONFIGS.keys())}"
            )
        self.model = model

    async def count_tokens(self, messages: List[Dict[str, str]]) -> int:
        """Estimate token count for messages.

        Args:
            messages: List of message dictionaries

        Returns:
            Estimated token count

        Note:
            This is a rough estimation. For accurate counts, use tiktoken library.
        """
        # Rough estimation: ~4 characters per token
        total_chars = sum(len(msg.get("content", "")) for msg in messages)
        return total_chars // 4

    async def test_connection(self) -> bool:
        """Test the connection to OpenAI API.

        Returns:
            True if connection is successful

        Raises:
            Exception: If connection fails
        """
        try:
            await self.generate_response(
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5,
            )
            return True
        except Exception as e:
            raise Exception(f"OpenAI connection test failed: {str(e)}") from e
