"""
LangChain configuration and utility functions.

Provides configured LLM and embedding instances for the AI agent.
"""

import os
from typing import Any

from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import settings


def configure_langsmith() -> None:
    """
    Configure LangSmith tracing if enabled.

    Sets environment variables for LangChain tracing and observability.
    """
    if settings.langchain_tracing_v2:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project

        if settings.langchain_api_key:
            os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key


def get_llm(streaming: bool = True, **kwargs: Any) -> ChatOpenAI:
    """
    Get configured ChatOpenAI instance for the AI agent.

    Args:
        streaming: Enable token streaming for real-time responses
        **kwargs: Additional arguments to override default configuration

    Returns:
        Configured ChatOpenAI instance

    Example:
        >>> llm = get_llm(streaming=True)
        >>> async for chunk in llm.astream("Hello!"):
        ...     print(chunk.content, end="", flush=True)
    """
    # Configure LangSmith if enabled
    configure_langsmith()

    # Default configuration
    config = {
        "model": settings.openai_chat_model,
        "temperature": settings.openai_temperature,
        "max_tokens": settings.openai_max_tokens,
        "streaming": streaming,
        "openai_api_key": settings.openai_api_key,
        "max_retries": settings.openai_max_retries,
    }

    # Override with any provided kwargs
    config.update(kwargs)

    return ChatOpenAI(**config)  # type: ignore[arg-type]


def get_embeddings(**kwargs: Any) -> OpenAIEmbeddings:
    """
    Get configured OpenAI embeddings instance.

    Args:
        **kwargs: Additional arguments to override default configuration

    Returns:
        Configured OpenAIEmbeddings instance

    Example:
        >>> embeddings = get_embeddings()
        >>> vector = await embeddings.aembed_query("What is AI?")
    """
    # Default configuration
    config = {
        "model": settings.openai_embedding_model,
        "openai_api_key": settings.openai_api_key,
        "max_retries": settings.openai_max_retries,
    }

    # Override with any provided kwargs
    config.update(kwargs)

    return OpenAIEmbeddings(**config)  # type: ignore[arg-type]


# Initialize LangSmith on module import if enabled
configure_langsmith()
