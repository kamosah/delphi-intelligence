"""Server-Sent Events (SSE) manager for real-time updates."""

import asyncio
import logging
from collections import defaultdict
from typing import Any
from uuid import UUID

logger = logging.getLogger(__name__)


class SSEManager:
    """Manages Server-Sent Events connections and broadcasts."""

    def __init__(self):
        """Initialize SSE manager with empty connections."""
        # Store queues by document_id for targeted updates
        self._document_queues: dict[UUID, list[asyncio.Queue]] = defaultdict(list)
        # Store queues by space_id for space-wide updates
        self._space_queues: dict[UUID, list[asyncio.Queue]] = defaultdict(list)

    def subscribe_to_document(self, document_id: UUID) -> asyncio.Queue:
        """
        Subscribe to updates for a specific document.

        Args:
            document_id: UUID of the document to watch

        Returns:
            Queue that will receive document status updates
        """
        queue: asyncio.Queue = asyncio.Queue()
        self._document_queues[document_id].append(queue)
        logger.info(f"Client subscribed to document {document_id}")
        return queue

    def subscribe_to_space(self, space_id: UUID) -> asyncio.Queue:
        """
        Subscribe to updates for all documents in a space.

        Args:
            space_id: UUID of the space to watch

        Returns:
            Queue that will receive document status updates for the space
        """
        queue: asyncio.Queue = asyncio.Queue()
        self._space_queues[space_id].append(queue)
        logger.info(f"Client subscribed to space {space_id}")
        return queue

    def unsubscribe_from_document(self, document_id: UUID, queue: asyncio.Queue) -> None:
        """
        Unsubscribe from document updates.

        Args:
            document_id: UUID of the document
            queue: Queue to remove
        """
        if document_id in self._document_queues:
            try:
                self._document_queues[document_id].remove(queue)
                if not self._document_queues[document_id]:
                    del self._document_queues[document_id]
                logger.info(f"Client unsubscribed from document {document_id}")
            except ValueError:
                pass

    def unsubscribe_from_space(self, space_id: UUID, queue: asyncio.Queue) -> None:
        """
        Unsubscribe from space updates.

        Args:
            space_id: UUID of the space
            queue: Queue to remove
        """
        if space_id in self._space_queues:
            try:
                self._space_queues[space_id].remove(queue)
                if not self._space_queues[space_id]:
                    del self._space_queues[space_id]
                logger.info(f"Client unsubscribed from space {space_id}")
            except ValueError:
                pass

    async def emit_document_update(
        self, document_id: UUID, space_id: UUID, event: str, data: dict[str, Any]
    ) -> None:
        """
        Emit an update for a document to all subscribers.

        Args:
            document_id: UUID of the document
            space_id: UUID of the space containing the document
            event: Event type (e.g., 'status_update', 'processing_progress')
            data: Event data to send
        """
        message = {"event": event, "document_id": str(document_id), "data": data}

        # Send to document-specific subscribers
        if document_id in self._document_queues:
            dead_queues = []
            for queue in self._document_queues[document_id]:
                try:
                    await queue.put(message)
                except Exception as e:
                    logger.error(f"Failed to send to document queue: {e}")
                    dead_queues.append(queue)

            # Clean up dead queues
            for queue in dead_queues:
                self.unsubscribe_from_document(document_id, queue)

        # Send to space-wide subscribers
        if space_id in self._space_queues:
            dead_queues = []
            for queue in self._space_queues[space_id]:
                try:
                    await queue.put(message)
                except Exception as e:
                    logger.error(f"Failed to send to space queue: {e}")
                    dead_queues.append(queue)

            # Clean up dead queues
            for queue in dead_queues:
                self.unsubscribe_from_space(space_id, queue)

        logger.debug(
            f"Emitted {event} for document {document_id} to "
            f"{len(self._document_queues.get(document_id, []))} document subscribers "
            f"and {len(self._space_queues.get(space_id, []))} space subscribers"
        )


# Global SSE manager instance
sse_manager = SSEManager()
