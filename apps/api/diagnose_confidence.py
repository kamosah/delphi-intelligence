"""
Diagnostic script to analyze vector search results and confidence scoring.

Usage:
    poetry run python diagnose_confidence.py <space_id> "Your query here"

Example:
    poetry run python diagnose_confidence.py 123e4567-e89b-12d3-a456-426614174000 "What are the key risks mentioned?"
"""

import asyncio
import sys
from uuid import UUID

from app.db.session import get_session
from app.services.vector_search_service import get_vector_search_service
from app.services.citation_service import get_citation_service


def calculate_confidence_with_params(
    search_results,
    num_citations: int,
    high_quality_threshold: float
) -> dict:
    """Calculate confidence with custom high_quality_threshold."""
    if not search_results:
        return {
            "confidence": 0.0,
            "avg_similarity": 0.0,
            "quality_ratio": 0.0,
            "coverage": 0.0,
            "high_quality_count": 0,
        }

    # Average similarity of top 3 results
    top_results = search_results[:3]
    avg_similarity = sum(r.similarity_score for r in top_results) / len(top_results)

    # High-quality sources (similarity > threshold)
    high_quality_count = sum(1 for r in search_results if r.similarity_score > high_quality_threshold)
    quality_ratio = high_quality_count / len(search_results) if search_results else 0

    # Coverage (how many sources were used)
    coverage = min(num_citations / 3, 1.0)

    # Weighted confidence score
    confidence = (
        avg_similarity * 0.5  # 50% weight on similarity
        + quality_ratio * 0.3  # 30% weight on quality ratio
        + coverage * 0.2  # 20% weight on coverage
    )

    return {
        "confidence": round(confidence, 4),
        "avg_similarity": round(avg_similarity, 4),
        "quality_ratio": round(quality_ratio, 4),
        "coverage": round(coverage, 4),
        "high_quality_count": high_quality_count,
    }


async def diagnose_query(space_id: UUID, query: str):
    """Run diagnostic analysis on a query."""
    print(f"\n{'='*80}")
    print(f"CONFIDENCE DIAGNOSTIC TOOL")
    print(f"{'='*80}")
    print(f"\nSpace ID: {space_id}")
    print(f"Query: {query}")
    print(f"\n{'='*80}")

    # Get services
    vector_search = get_vector_search_service()
    citation_service = get_citation_service()

    # Get database session
    async for db in get_session():
        try:
            # Run vector search
            print(f"\n[1] Running vector search...")
            search_results = await vector_search.search_similar_chunks(
                query=query,
                db=db,
                space_id=space_id,
                limit=5,
                similarity_threshold=0.3,
            )

            if not search_results:
                print("\n❌ No results found! Check that:")
                print("   - Documents are uploaded to this space")
                print("   - Documents have been processed (chunked/embedded)")
                print("   - Space ID is correct")
                return

            print(f"✅ Retrieved {len(search_results)} chunks\n")

            # Display search results
            print(f"[2] Search Results (with similarity scores):")
            print(f"{'-'*80}")
            for i, result in enumerate(search_results, 1):
                chunk = result.chunk
                doc = result.document
                score = result.similarity_score

                # Determine quality level
                if score >= 0.7:
                    quality = "🟢 HIGH"
                elif score >= 0.5:
                    quality = "🟡 MEDIUM"
                else:
                    quality = "🔴 LOW"

                print(f"\n[{i}] Similarity: {score:.4f} {quality}")
                print(f"    Document: {doc.name}")
                print(f"    Chunk {chunk.chunk_index} (chars {chunk.start_char}-{chunk.end_char})")
                print(f"    Preview: {chunk.chunk_text[:150]}...")

            print(f"\n{'-'*80}")

            # Calculate current confidence (with current thresholds)
            print(f"\n[3] Current Confidence Calculation:")
            print(f"{'-'*80}")

            # Assume 2 citations used (typical for a good answer)
            num_citations = 2

            current = calculate_confidence_with_params(
                search_results, num_citations, high_quality_threshold=0.7
            )

            print(f"Parameters:")
            print(f"  - High Quality Threshold: 0.7")
            print(f"  - Confidence Threshold: 0.5 (50%)")
            print(f"  - Citations Used: {num_citations}")
            print(f"\nCalculation:")
            print(f"  - Avg Similarity (top 3): {current['avg_similarity']:.4f} × 0.5 = {current['avg_similarity'] * 0.5:.4f}")
            print(f"  - Quality Ratio: {current['high_quality_count']}/{len(search_results)} = {current['quality_ratio']:.4f} × 0.3 = {current['quality_ratio'] * 0.3:.4f}")
            print(f"  - Coverage: {num_citations}/3 = {current['coverage']:.4f} × 0.2 = {current['coverage'] * 0.2:.4f}")
            print(f"\n  TOTAL CONFIDENCE: {current['confidence']:.4f} ({current['confidence']*100:.1f}%)")

            passes = current['confidence'] >= 0.5
            print(f"\n  Result: {'✅ PASSES' if passes else '❌ FAILS'} (threshold: 0.5)")

            if not passes:
                print(f"  ⚠️  Response would be REPLACED with 'I don't know' message")

            # Test alternative thresholds
            print(f"\n[4] Alternative Threshold Scenarios:")
            print(f"{'-'*80}")

            scenarios = [
                ("Option 1: Lower confidence only", 0.7, 0.3),
                ("Option 2: Lower quality only", 0.5, 0.5),
                ("Option 3: Lower both (balanced)", 0.6, 0.35),
                ("Option 4: Most permissive", 0.5, 0.3),
            ]

            for scenario_name, quality_threshold, confidence_threshold in scenarios:
                result = calculate_confidence_with_params(
                    search_results, num_citations, high_quality_threshold=quality_threshold
                )
                passes = result['confidence'] >= confidence_threshold
                status = "✅ PASSES" if passes else "❌ FAILS"

                print(f"\n{scenario_name}:")
                print(f"  - High Quality Threshold: {quality_threshold}")
                print(f"  - Confidence Threshold: {confidence_threshold}")
                print(f"  - Calculated Confidence: {result['confidence']:.4f} ({result['confidence']*100:.1f}%)")
                print(f"  - High Quality Count: {result['high_quality_count']}/{len(search_results)}")
                print(f"  - Status: {status}")

            # Recommendations
            print(f"\n[5] Recommendations:")
            print(f"{'-'*80}")

            # Check if any chunks are >0.7
            high_quality_count_07 = sum(1 for r in search_results if r.similarity_score > 0.7)
            high_quality_count_06 = sum(1 for r in search_results if r.similarity_score > 0.6)
            high_quality_count_05 = sum(1 for r in search_results if r.similarity_score > 0.5)

            print(f"\nSimilarity Score Distribution:")
            print(f"  - Chunks > 0.7 (current 'high quality'): {high_quality_count_07}")
            print(f"  - Chunks > 0.6: {high_quality_count_06}")
            print(f"  - Chunks > 0.5: {high_quality_count_05}")

            avg_top_3 = sum(r.similarity_score for r in search_results[:3]) / min(3, len(search_results))

            print(f"\nBased on the data:")
            if high_quality_count_07 == 0 and avg_top_3 >= 0.45:
                print(f"  ✅ Your query has GOOD semantic matches (avg: {avg_top_3:.3f})")
                print(f"  ⚠️  But the 0.7 threshold is too strict (0 chunks qualify)")
                print(f"  📊 Recommendation: Use Option 3 (balanced)")
                print(f"     - Lower quality threshold to 0.6")
                print(f"     - Lower confidence threshold to 0.35")
            elif high_quality_count_07 >= 1:
                print(f"  ✅ You have {high_quality_count_07} high-quality matches")
                print(f"  📊 Recommendation: Use Option 1 (lower confidence only)")
                print(f"     - Keep quality threshold at 0.7")
                print(f"     - Lower confidence threshold to 0.3")
            else:
                print(f"  ⚠️  Semantic matches are weak (avg: {avg_top_3:.3f})")
                print(f"  📊 Recommendation: May need better document coverage or query rephrasing")

            print(f"\n{'='*80}")

        finally:
            await db.close()


async def main():
    """Main entry point."""
    if len(sys.argv) < 3:
        print("Usage: poetry run python diagnose_confidence.py <space_id> \"<query>\"")
        print("\nExample:")
        print('  poetry run python diagnose_confidence.py 123e4567-e89b-12d3-a456-426614174000 "What are the key risks?"')
        sys.exit(1)

    try:
        space_id = UUID(sys.argv[1])
        query = sys.argv[2]

        await diagnose_query(space_id, query)

    except ValueError as e:
        print(f"❌ Error: Invalid space_id format. Must be a valid UUID.")
        print(f"   {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
