"""Tests for LangChain mocks (MockChatOpenAI and MockOpenAIEmbeddings).

Validates deterministic behavior of mocks without making real API calls.
"""

import pytest

from tests.fixtures.openai_mocks import MockChatOpenAI, MockOpenAIEmbeddings


@pytest.mark.integration
def test_mock_chat_openai_basic_response(mock_chat_openai: MockChatOpenAI) -> None:
    """Verify MockChatOpenAI returns configured responses."""
    # Set custom responses
    mock_chat_openai.responses = ["Hello!", "How can I help?"]

    # First invocation
    result = mock_chat_openai.invoke("What's up?")
    assert result.content == "Hello!"

    # Second invocation (cycles to next response)
    result = mock_chat_openai.invoke("Another question")
    assert result.content == "How can I help?"

    # Third invocation (cycles back to first)
    result = mock_chat_openai.invoke("Third question")
    assert result.content == "Hello!"


@pytest.mark.integration
async def test_mock_chat_openai_async_response(mock_chat_openai: MockChatOpenAI) -> None:
    """Verify MockChatOpenAI async invocation works."""
    mock_chat_openai.responses = ["Async response"]

    result = await mock_chat_openai.ainvoke("Test query")
    assert result.content == "Async response"


@pytest.mark.integration
async def test_mock_chat_openai_streaming(mock_chat_openai: MockChatOpenAI) -> None:
    """Verify MockChatOpenAI supports streaming (word by word)."""
    mock_chat_openai.responses = ["Hello world from mock"]

    # Collect streamed chunks
    chunks: list[str] = []
    async for chunk in mock_chat_openai.astream("Test query"):
        content = chunk.content
        assert isinstance(content, str)
        chunks.append(content)

    # Should stream word by word
    assert chunks == ["Hello", " world", " from", " mock"]

    # Reconstruct full message
    full_message = "".join(chunks)
    assert full_message == "Hello world from mock"


@pytest.mark.integration
def test_mock_embeddings_deterministic(mock_embeddings: MockOpenAIEmbeddings) -> None:
    """Verify MockOpenAIEmbeddings produces deterministic vectors."""
    # Same text should produce same vector
    vector1 = mock_embeddings.embed_query("Hello world")
    vector2 = mock_embeddings.embed_query("Hello world")
    assert vector1 == vector2

    # Different text should produce different vector
    vector3 = mock_embeddings.embed_query("Different text")
    assert vector1 != vector3


@pytest.mark.integration
def test_mock_embeddings_dimensions(mock_embeddings: MockOpenAIEmbeddings) -> None:
    """Verify MockOpenAIEmbeddings returns 1536-dimensional vectors."""
    vector = mock_embeddings.embed_query("Test text")
    assert len(vector) == 1536

    # All values should be floats in [-1, 1] range
    assert all(isinstance(v, float) for v in vector)
    assert all(-1 <= v <= 1 for v in vector)


@pytest.mark.integration
async def test_mock_embeddings_async(mock_embeddings: MockOpenAIEmbeddings) -> None:
    """Verify MockOpenAIEmbeddings async methods work."""
    # Async single query
    vector1 = await mock_embeddings.aembed_query("Hello")
    assert len(vector1) == 1536

    # Async multiple documents
    vectors = await mock_embeddings.aembed_documents(["Doc 1", "Doc 2", "Doc 3"])
    assert len(vectors) == 3
    assert all(len(v) == 1536 for v in vectors)

    # Deterministic across sync/async
    vector2 = mock_embeddings.embed_query("Hello")
    assert vector1 == vector2


@pytest.mark.integration
def test_patch_openai_fixture(patch_openai: tuple[MockChatOpenAI, MockOpenAIEmbeddings]) -> None:
    """Verify patch_openai fixture provides both mocks."""
    llm, embeddings = patch_openai

    # LLM should be MockChatOpenAI
    assert isinstance(llm, MockChatOpenAI)
    result = llm.invoke("Test")
    assert result.content == "Mocked response"

    # Embeddings should be MockOpenAIEmbeddings
    assert isinstance(embeddings, MockOpenAIEmbeddings)
    vector = embeddings.embed_query("Test")
    assert len(vector) == 1536


@pytest.mark.integration
def test_patch_openai_monkeypatch_works(
    patch_openai: tuple[MockChatOpenAI, MockOpenAIEmbeddings],
) -> None:
    """Verify patch_openai monkeypatches factory functions."""
    from app.services.langchain_config import get_embeddings, get_llm  # noqa: PLC0415

    llm_mock, embeddings_mock = patch_openai

    # get_llm() should return our mock
    llm = get_llm()
    assert llm is llm_mock  # type: ignore[comparison-overlap]
    assert isinstance(llm, MockChatOpenAI)

    # get_embeddings() should return our mock
    embeddings = get_embeddings()
    assert embeddings is embeddings_mock  # type: ignore[comparison-overlap]
    assert isinstance(embeddings, MockOpenAIEmbeddings)  # type: ignore[unreachable]


@pytest.mark.integration
def test_mock_llm_response_cycling(mock_chat_openai: MockChatOpenAI) -> None:
    """Verify MockChatOpenAI cycles through responses correctly."""
    mock_chat_openai.responses = ["First", "Second"]

    # Call 5 times, should cycle: First, Second, First, Second, First
    results = [mock_chat_openai.invoke(f"Query {i}").content for i in range(5)]
    assert results == ["First", "Second", "First", "Second", "First"]
