"""
Citation service for tracking and managing source citations in RAG responses.

Provides advanced citation tracking with document metadata, confidence scoring,
and citation quality assessment.
"""

import logging
from typing import Any
from collections.abc import Sequence

from app.services.vector_search_service import SearchResult

logger = logging.getLogger(__name__)


class CitationService:
    """Service for managing citations in RAG pipeline responses."""

    def __init__(
        self,
        min_similarity_threshold: float = 0.3,
        max_citations_per_response: int = 10,
    ) -> None:
        """
        Initialize citation service.

        Args:
            min_similarity_threshold: Minimum similarity score for citations (0.0-1.0)
            max_citations_per_response: Maximum number of citations to include
        """
        self.min_similarity_threshold = min_similarity_threshold
        self.max_citations_per_response = max_citations_per_response

        logger.info(
            f"Initialized CitationService "
            f"(threshold={min_similarity_threshold}, max={max_citations_per_response})"
        )

    def create_citations_from_search_results(
        self,
        search_results: Sequence[SearchResult],
        cited_indices: set[int] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Create citation objects from vector search results.

        Args:
            search_results: Search results from vector similarity search
            cited_indices: Set of 1-indexed citation numbers actually used in response

        Returns:
            List of citation dictionaries with metadata

        Example:
            >>> citations = service.create_citations_from_search_results(
            ...     search_results, cited_indices={1, 3}
            ... )
            >>> print(citations[0]["document_title"])
        """
        citations = []

        for i, result in enumerate(search_results):
            chunk = result.chunk
            document = result.document
            citation_num = i + 1  # 1-indexed

            # Skip if not cited (when cited_indices provided)
            if cited_indices is not None and citation_num not in cited_indices:
                continue

            # Skip low-relevance results
            if result.similarity_score < self.min_similarity_threshold:
                logger.debug(
                    f"Skipping citation {citation_num} "
                    f"(score={result.similarity_score:.3f} < {self.min_similarity_threshold})"
                )
                continue

            # Create citation object
            citation = {
                "index": citation_num,
                "text": chunk.chunk_text,
                "document_id": str(document.id),
                "document_title": document.name,
                "chunk_index": chunk.chunk_index,
                "similarity_score": round(result.similarity_score, 4),
                "relevance_rank": i + 1,  # 1 = most relevant
                # Document metadata
                "page_number": chunk.chunk_metadata.get("page_num"),
                "start_char": chunk.start_char,
                "end_char": chunk.end_char,
                # Confidence indicators
                "confidence_level": self._calculate_confidence_level(result.similarity_score),
            }

            citations.append(citation)

            # Limit number of citations
            if len(citations) >= self.max_citations_per_response:
                logger.debug(f"Reached max citations limit ({self.max_citations_per_response})")
                break

        logger.info(f"Created {len(citations)} citations from {len(search_results)} results")
        return citations

    def _calculate_confidence_level(self, similarity_score: float) -> str:
        """
        Calculate confidence level based on similarity score.

        Args:
            similarity_score: Cosine similarity score (0.0-1.0)

        Returns:
            Confidence level: 'high', 'medium', 'low'
        """
        if similarity_score >= 0.8:
            return "high"
        if similarity_score >= 0.5:
            return "medium"
        return "low"

    def calculate_overall_confidence(
        self,
        search_results: Sequence[SearchResult],
        num_citations_used: int,
    ) -> float:
        """
        Calculate overall confidence score for a RAG response.

        Considers:
        - Average similarity of top results
        - Number of high-quality sources
        - Coverage (how many sources were actually used)

        Args:
            search_results: All search results retrieved
            num_citations_used: Number of citations actually used in response

        Returns:
            Confidence score (0.0-1.0)
        """
        if not search_results:
            return 0.0

        # Average similarity of top 3 results
        top_results = search_results[:3]
        avg_similarity = sum(r.similarity_score for r in top_results) / len(top_results)

        # High-quality sources (similarity > 0.7)
        high_quality_count = sum(1 for r in search_results if r.similarity_score > 0.7)
        quality_ratio = high_quality_count / len(search_results) if search_results else 0

        # Coverage (how many sources were used)
        coverage = min(num_citations_used / 3, 1.0)  # Optimal is 3+ citations

        # Weighted confidence score
        confidence = (
            avg_similarity * 0.5  # 50% weight on similarity
            + quality_ratio * 0.3  # 30% weight on quality ratio
            + coverage * 0.2  # 20% weight on coverage
        )

        logger.debug(
            f"Confidence calculation: similarity={avg_similarity:.3f}, "
            f"quality_ratio={quality_ratio:.3f}, coverage={coverage:.3f}, "
            f"final={confidence:.3f}"
        )

        return round(confidence, 4)

    def deduplicate_citations(self, citations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Remove duplicate citations from the same document chunk.

        Args:
            citations: List of citation dictionaries

        Returns:
            Deduplicated list of citations
        """
        seen = set()
        deduplicated = []

        for citation in citations:
            # Use (document_id, chunk_index) as unique key
            key = (citation["document_id"], citation["chunk_index"])

            if key not in seen:
                seen.add(key)
                deduplicated.append(citation)
            else:
                logger.debug(
                    f"Removed duplicate citation: {citation['document_title']} "
                    f"(chunk {citation['chunk_index']})"
                )

        logger.info(
            f"Deduplicated citations: {len(citations)} -> {len(deduplicated)} "
            f"({len(citations) - len(deduplicated)} duplicates removed)"
        )

        return deduplicated

    def rank_citations_by_relevance(
        self,
        citations: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Rank citations by relevance (similarity score + position).

        Args:
            citations: List of citation dictionaries

        Returns:
            Sorted list of citations (most relevant first)
        """
        # Sort by similarity score (descending), then by original rank
        sorted_citations = sorted(
            citations,
            key=lambda c: (-c["similarity_score"], c.get("relevance_rank", 999)),
        )

        logger.debug(
            f"Ranked {len(sorted_citations)} citations by relevance "
            f"(top score: {sorted_citations[0]['similarity_score']:.3f})"
            if sorted_citations
            else "No citations to rank"
        )

        return sorted_citations

    def filter_low_quality_citations(
        self,
        citations: list[dict[str, Any]],
        min_confidence: str = "low",
    ) -> list[dict[str, Any]]:
        """
        Filter out low-quality citations based on confidence level.

        Args:
            citations: List of citation dictionaries
            min_confidence: Minimum confidence level ('high', 'medium', 'low')

        Returns:
            Filtered list of citations
        """
        confidence_order = {"high": 3, "medium": 2, "low": 1}
        min_level = confidence_order.get(min_confidence, 1)

        filtered = [
            c
            for c in citations
            if confidence_order.get(c.get("confidence_level", "low"), 1) >= min_level
        ]

        logger.info(
            f"Filtered citations by confidence >= '{min_confidence}': "
            f"{len(citations)} -> {len(filtered)}"
        )

        return filtered

    def detect_hallucinations(
        self,
        response: str,
        context_chunks: list[str],
        citations: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Detect potential hallucinations in the response (validation against context).

        Performs validation by checking:
        1. All citations reference valid context chunks
        2. Response contains citation markers when context is available
        3. Citations have adequate relevance scores
        4. Response avoids hallucination indicator phrases

        Args:
            response: Generated response text
            context_chunks: Context chunks used for generation
            citations: Extracted citations

        Returns:
            Validation result dictionary with:
            - is_valid (bool): Whether response passes validation
            - issues (list[str]): List of validation issues found
            - quality_score (float): Overall quality score (0-1)
        """
        issues = []
        quality_score = 1.0

        # Check 1: Verify all citation indices are valid
        if citations:
            max_index = len(context_chunks)
            for citation in citations:
                citation_num = citation.get("index", 0)
                if citation_num < 1 or citation_num > max_index:
                    issues.append(
                        f"Citation [{citation_num}] references invalid context index "
                        f"(valid range: 1-{max_index})"
                    )
                    quality_score -= 0.2
        else:
            # No citations - could indicate hallucination or very general response
            if context_chunks and len(response) > 50:  # Non-trivial response
                issues.append("Response has no citations despite available context")
                quality_score -= 0.3

        # Check 2: Verify response contains citation markers
        import re

        citation_pattern = r"\[(\d+)\]"
        citation_markers = set(re.findall(citation_pattern, response))

        if context_chunks and not citation_markers:
            issues.append("Response contains no citation markers despite available context")
            quality_score -= 0.2

        # Check 3: Verify cited chunks are actually relevant
        if citations:
            low_quality_citations = [
                c for c in citations if c.get("similarity_score", 0) < 0.4
            ]
            if low_quality_citations:
                issues.append(
                    f"{len(low_quality_citations)} citations have very low relevance (<0.4)"
                )
                quality_score -= 0.1 * len(low_quality_citations)

        # Check 4: Detect potential hallucination indicators
        hallucination_keywords = [
            "according to my knowledge",
            "as far as I know",
            "in general",
            "typically",
            "usually",
            "it is common",
        ]
        response_lower = response.lower()
        for keyword in hallucination_keywords:
            if keyword in response_lower and len(context_chunks) > 0:
                issues.append(
                    f"Response contains potential hallucination indicator: '{keyword}'"
                )
                quality_score -= 0.1
                break

        # Clamp quality score to [0, 1]
        quality_score = max(0.0, min(1.0, quality_score))

        is_valid = quality_score >= 0.6 and len(issues) == 0

        validation_result = {
            "is_valid": is_valid,
            "issues": issues,
            "quality_score": round(quality_score, 3),
            "num_citations": len(citations),
            "num_context_chunks": len(context_chunks),
        }

        if not is_valid:
            logger.warning(
                f"Response validation failed: quality={quality_score:.3f}, "
                f"issues={len(issues)}"
            )
            for issue in issues:
                logger.debug(f"  - {issue}")
        else:
            logger.debug(f"Response validation passed: quality={quality_score:.3f}")

        return validation_result


# Global service instance
_citation_service: CitationService | None = None


def get_citation_service() -> CitationService:
    """
    Get or create the global citation service instance.

    Returns:
        Global CitationService instance
    """
    global _citation_service  # noqa: PLW0603

    if _citation_service is None:
        _citation_service = CitationService()

    return _citation_service
