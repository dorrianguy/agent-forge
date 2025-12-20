"""Google Gemini LLM provider implementation."""

import os
import json
from typing import AsyncGenerator, Optional, List, Dict, Any
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from .llm_provider import LLMProvider


class GeminiProvider(LLMProvider):
    """Google Gemini LLM provider optimized for low-latency voice applications.

    Supports Gemini 2.0 Flash model as a cost-effective alternative to OpenAI.
    """

    # Model configurations optimized for voice
    MODEL_CONFIGS = {
        "gemini-2.0-flash-exp": {
            "name": "gemini-2.0-flash-exp",
            "provider": "gemini",
            "max_tokens": 1048576,  # 1M token context window
            "supports_functions": True,
            "latency_tier": "low",
            "cost_per_1k_tokens": 0.000075,  # $0.075 per 1M input tokens
            "description": "Ultra-fast Gemini model with massive context window",
        },
        "gemini-1.5-flash": {
            "name": "gemini-1.5-flash",
            "provider": "gemini",
            "max_tokens": 1048576,
            "supports_functions": True,
            "latency_tier": "low",
            "cost_per_1k_tokens": 0.000075,
            "description": "Fast and cost-effective for high-throughput scenarios",
        },
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-2.0-flash-exp",
    ):
        """Initialize the Gemini provider.

        Args:
            api_key: Google AI API key (defaults to GOOGLE_AI_API_KEY env var)
            model: Model identifier (default: 'gemini-2.0-flash-exp')
        """
        api_key = api_key or os.getenv("GOOGLE_AI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_AI_API_KEY environment variable or api_key parameter required")

        super().__init__(api_key, model)

        if model not in self.MODEL_CONFIGS:
            raise ValueError(
                f"Invalid model: {model}. Supported models: {list(self.MODEL_CONFIGS.keys())}"
            )

        genai.configure(api_key=api_key)
        self.client = genai.GenerativeModel(model)

    def _convert_messages_to_gemini_format(
        self, messages: List[Dict[str, str]]
    ) -> tuple[Optional[str], List[Dict[str, str]]]:
        """Convert OpenAI-style messages to Gemini format.

        Args:
            messages: List of message dictionaries with 'role' and 'content' keys

        Returns:
            Tuple of (system_instruction, converted_messages)
        """
        system_instruction = None
        converted_messages = []

        for msg in messages:
            role = msg["role"]
            content = msg["content"]

            if role == "system":
                # Gemini handles system messages separately
                system_instruction = content
            elif role == "user":
                converted_messages.append({"role": "user", "parts": [content]})
            elif role == "assistant":
                converted_messages.append({"role": "model", "parts": [content]})

        return system_instruction, converted_messages

    def _convert_functions_to_gemini_tools(
        self, functions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Convert OpenAI-style function definitions to Gemini tools format.

        Args:
            functions: List of OpenAI function definitions

        Returns:
            List of Gemini tool definitions
        """
        tools = []
        for func in functions:
            tool = {
                "function_declarations": [
                    {
                        "name": func["name"],
                        "description": func.get("description", ""),
                        "parameters": func.get("parameters", {}),
                    }
                ]
            }
            tools.append(tool)
        return tools

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        functions: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate a complete response from Gemini.

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
        try:
            system_instruction, converted_messages = self._convert_messages_to_gemini_format(
                messages
            )

            # Update model with system instruction if present
            if system_instruction:
                self.client = genai.GenerativeModel(
                    self.model, system_instruction=system_instruction
                )

            generation_config = GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )

            # Prepare tools if functions are provided
            tools = None
            if functions:
                tools = self._convert_functions_to_gemini_tools(functions)

            # Start chat with history
            chat = self.client.start_chat(
                history=converted_messages[:-1] if len(converted_messages) > 1 else None
            )

            # Generate response
            kwargs = {"generation_config": generation_config}
            if tools:
                kwargs["tools"] = tools

            response = await chat.send_message_async(
                converted_messages[-1]["parts"][0] if converted_messages else "",
                **kwargs,
            )

            # Handle function calls
            if response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, "function_call"):
                        func_call = part.function_call
                        args_json = json.dumps(dict(func_call.args))
                        return f"FUNCTION_CALL:{func_call.name}:{args_json}"

            return response.text

        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}") from e

    async def stream_response(
        self,
        messages: List[Dict[str, str]],
        functions: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens from Gemini.

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
        try:
            system_instruction, converted_messages = self._convert_messages_to_gemini_format(
                messages
            )

            # Update model with system instruction if present
            if system_instruction:
                self.client = genai.GenerativeModel(
                    self.model, system_instruction=system_instruction
                )

            generation_config = GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )

            # Prepare tools if functions are provided
            tools = None
            if functions:
                tools = self._convert_functions_to_gemini_tools(functions)

            # Start chat with history
            chat = self.client.start_chat(
                history=converted_messages[:-1] if len(converted_messages) > 1 else None
            )

            # Generate streaming response
            kwargs = {"generation_config": generation_config, "stream": True}
            if tools:
                kwargs["tools"] = tools

            response = await chat.send_message_async(
                converted_messages[-1]["parts"][0] if converted_messages else "",
                **kwargs,
            )

            async for chunk in response:
                if chunk.text:
                    yield chunk.text

                # Handle streaming function calls
                if chunk.candidates[0].content.parts:
                    for part in chunk.candidates[0].content.parts:
                        if hasattr(part, "function_call"):
                            func_call = part.function_call
                            args_json = json.dumps(dict(func_call.args))
                            yield f"FUNCTION_CALL:{func_call.name}:{args_json}"

        except Exception as e:
            raise Exception(f"Gemini API streaming error: {str(e)}") from e

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current Gemini model.

        Returns:
            Dictionary containing model metadata
        """
        return self.MODEL_CONFIGS[self.model].copy()

    def set_model(self, model: str) -> None:
        """Switch to a different Gemini model.

        Args:
            model: Model identifier

        Raises:
            ValueError: If the model is not supported
        """
        if model not in self.MODEL_CONFIGS:
            raise ValueError(
                f"Invalid model: {model}. Supported models: {list(self.MODEL_CONFIGS.keys())}"
            )
        self.model = model
        self.client = genai.GenerativeModel(model)

    async def count_tokens(self, messages: List[Dict[str, str]]) -> int:
        """Count tokens for messages using Gemini's token counting API.

        Args:
            messages: List of message dictionaries

        Returns:
            Actual token count from Gemini

        Raises:
            Exception: If token counting fails
        """
        try:
            _, converted_messages = self._convert_messages_to_gemini_format(messages)
            content = " ".join(
                msg["parts"][0] for msg in converted_messages if msg.get("parts")
            )
            result = await self.client.count_tokens_async(content)
            return result.total_tokens
        except Exception as e:
            # Fallback to rough estimation
            total_chars = sum(len(msg.get("content", "")) for msg in messages)
            return total_chars // 4

    async def test_connection(self) -> bool:
        """Test the connection to Gemini API.

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
            raise Exception(f"Gemini connection test failed: {str(e)}") from e
