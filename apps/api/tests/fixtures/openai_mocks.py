"""LangChain mocks for deterministic testing.

This module provides mock implementations of LangChain LLM and embeddings:
- MockChatOpenAI: Deterministic chat responses without API calls
- MockOpenAIEmbeddings: Hash-based deterministic vector embeddings
"""

import hashlib
from collections.abc import AsyncIterator, Iterator
from typing import Any

from langchain_core.callbacks import AsyncCallbackManagerForLLMRun, CallbackManagerForLLMRun
from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult


class MockChatOpenAI(BaseChatModel):
    """Mock ChatOpenAI for deterministic testing without API calls.

    Usage:
        mock_llm = MockChatOpenAI(responses=["Hello!", "How can I help?"])
        response = await mock_llm.ainvoke("What's up?")
        # Returns: AIMessage(content="Hello!")
    """

    responses: list[str] = ["Mocked response"]
    """List of responses to cycle through."""

    current_index: int = 0
    """Current response index (cycles through responses)."""

    @property
    def _llm_type(self) -> str:
        """Return identifier for this LLM type."""
        return "mock-chat-openai"

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Generate chat response synchronously.

        Args:
            messages: List of chat messages
            stop: Optional stop sequences
            run_manager: Optional callback manager
            **kwargs: Additional generation parameters

        Returns:
            ChatResult with mocked response
        """
        response = self._get_next_response()
        message = AIMessage(content=response)
        generation = ChatGeneration(message=message)
        return ChatResult(generations=[generation])

    async def _agenerate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: AsyncCallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Generate chat response asynchronously.

        Args:
            messages: List of chat messages
            stop: Optional stop sequences
            run_manager: Optional callback manager
            **kwargs: Additional generation parameters

        Returns:
            ChatResult with mocked response
        """
        # Reuse sync implementation (callback manager not used in mock)
        return self._generate(messages, stop=stop, run_manager=None, **kwargs)

    def _stream(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> Iterator[ChatGenerationChunk]:
        """Stream chat response synchronously (chunk by chunk).

        Args:
            messages: List of chat messages
            stop: Optional stop sequences
            run_manager: Optional callback manager
            **kwargs: Additional generation parameters

        Yields:
            ChatGenerationChunk for each token
        """
        response = self._get_next_response()

        # Split into words and stream word by word
        words = response.split()
        for i, word in enumerate(words):
            # Add space before word (except first)
            content = f" {word}" if i > 0 else word
            chunk = AIMessageChunk(content=content)
            yield ChatGenerationChunk(message=chunk)

    async def _astream(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: AsyncCallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[ChatGenerationChunk]:
        """Stream chat response asynchronously (chunk by chunk).

        Args:
            messages: List of chat messages
            stop: Optional stop sequences
            run_manager: Optional callback manager
            **kwargs: Additional generation parameters

        Yields:
            ChatGenerationChunk for each token
        """
        response = self._get_next_response()

        # Split into words and stream word by word
        words = response.split()
        for i, word in enumerate(words):
            # Add space before word (except first)
            content = f" {word}" if i > 0 else word
            chunk = AIMessageChunk(content=content)
            yield ChatGenerationChunk(message=chunk)

    def _get_next_response(self) -> str:
        """Get next response from the list (cycles through).

        Returns:
            Next mocked response string
        """
        response = self.responses[self.current_index % len(self.responses)]
        self.current_index += 1
        return response


class MockOpenAIEmbeddings(Embeddings):
    """Mock OpenAI embeddings with deterministic hash-based vectors.

    Generates 1536-dimensional vectors (matching text-embedding-3-small)
    using deterministic hashing. Same text always produces same vector.

    Usage:
        mock_embeddings = MockOpenAIEmbeddings()
        vector = await mock_embeddings.aembed_query("Hello world")
        # Returns: [0.123, -0.456, ...] (1536 dimensions, deterministic)
    """

    dimensions: int = 1536
    """Embedding dimensions (matches OpenAI text-embedding-3-small)."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple documents synchronously.

        Args:
            texts: List of text documents to embed

        Returns:
            List of embedding vectors (one per document)
        """
        return [self._hash_to_vector(text) for text in texts]

    async def aembed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple documents asynchronously.

        Args:
            texts: List of text documents to embed

        Returns:
            List of embedding vectors (one per document)
        """
        # Reuse sync implementation for simplicity
        return self.embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query synchronously.

        Args:
            text: Query text to embed

        Returns:
            Embedding vector
        """
        return self._hash_to_vector(text)

    async def aembed_query(self, text: str) -> list[float]:
        """Embed a single query asynchronously.

        Args:
            text: Query text to embed

        Returns:
            Embedding vector
        """
        # Reuse sync implementation for simplicity
        return self.embed_query(text)

    def _hash_to_vector(self, text: str) -> list[float]:
        """Convert text to deterministic embedding vector via hashing.

        Uses SHA-256 hash to generate deterministic floats in [-1, 1] range.
        Same text always produces same vector.

        Args:
            text: Input text to hash

        Returns:
            Normalized embedding vector (1536 dimensions)
        """
        # Generate deterministic hash
        hash_bytes = hashlib.sha256(text.encode()).digest()

        # Expand hash to required dimensions by rehashing
        vector: list[float] = []
        current_hash = hash_bytes
        while len(vector) < self.dimensions:
            # Convert hash bytes to floats in [-1, 1] range
            for i in range(0, len(current_hash), 2):
                if len(vector) >= self.dimensions:
                    break

                # Take 2 bytes, convert to int, normalize to [-1, 1]
                byte_pair = current_hash[i : i + 2]
                if len(byte_pair) == 2:
                    value = int.from_bytes(byte_pair, byteorder="big")
                    # Normalize from [0, 65535] to [-1, 1]
                    normalized = (value / 65535.0) * 2 - 1
                    vector.append(normalized)

            # Rehash for next batch
            current_hash = hashlib.sha256(current_hash).digest()

        return vector[: self.dimensions]
