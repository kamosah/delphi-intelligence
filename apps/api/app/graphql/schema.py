"""Main GraphQL schema definition."""

import strawberry

from .mutation import Mutation
from .query import Query

# Create the GraphQL schema
schema = strawberry.Schema(query=Query, mutation=Mutation)
