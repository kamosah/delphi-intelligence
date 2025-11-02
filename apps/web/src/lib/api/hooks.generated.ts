import {
  useMutation,
  useQuery,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';
import { graphqlRequestFetcher } from './graphql-client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: string; output: string };
  JSON: { input: any; output: any };
};

export type CreateQueryInput = {
  confidenceScore?: InputMaybe<Scalars['Float']['input']>;
  queryText: Scalars['String']['input'];
  result?: InputMaybe<Scalars['String']['input']>;
  spaceId: Scalars['ID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};

export type CreateSpaceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  iconColor?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateUserInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  fullName?: InputMaybe<Scalars['String']['input']>;
};

export type Document = {
  __typename?: 'Document';
  createdAt: Scalars['DateTime']['output'];
  docMetadata?: Maybe<Scalars['JSON']['output']>;
  extractedText?: Maybe<Scalars['String']['output']>;
  filePath: Scalars['String']['output'];
  fileType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  processedAt?: Maybe<Scalars['DateTime']['output']>;
  processingError?: Maybe<Scalars['String']['output']>;
  sizeBytes: Scalars['Int']['output'];
  spaceId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  uploadedBy: Scalars['ID']['output'];
};

export type DocumentChunk = {
  __typename?: 'DocumentChunk';
  chunkIndex: Scalars['Int']['output'];
  chunkMetadata: Scalars['JSON']['output'];
  chunkText: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  documentId: Scalars['ID']['output'];
  endChar: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  startChar: Scalars['Int']['output'];
  tokenCount: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createQuery?: Maybe<QueryResult>;
  createSpace: Space;
  createUser: User;
  deleteQuery: Scalars['Boolean']['output'];
  deleteSpace: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  updateQuery?: Maybe<QueryResult>;
  updateSpace?: Maybe<Space>;
  updateUser?: Maybe<User>;
};

export type MutationCreateQueryArgs = {
  input: CreateQueryInput;
};

export type MutationCreateSpaceArgs = {
  input: CreateSpaceInput;
};

export type MutationCreateUserArgs = {
  input: CreateUserInput;
};

export type MutationDeleteQueryArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteSpaceArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};

export type MutationUpdateQueryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateQueryInput;
};

export type MutationUpdateSpaceArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSpaceInput;
};

export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};

export type Query = {
  __typename?: 'Query';
  documents: Array<Document>;
  health: Scalars['String']['output'];
  queries: Array<QueryResult>;
  query?: Maybe<QueryResult>;
  searchDocuments: Array<SearchResult>;
  space?: Maybe<Space>;
  spaces: Array<Space>;
  user?: Maybe<User>;
  userByEmail?: Maybe<User>;
  users: Array<User>;
};

export type QueryDocumentsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  spaceId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryQueriesArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  spaceId: Scalars['ID']['input'];
};

export type QueryQueryArgs = {
  id: Scalars['ID']['input'];
};

export type QuerySearchDocumentsArgs = {
  input: SearchDocumentsInput;
};

export type QuerySpaceArgs = {
  id: Scalars['ID']['input'];
};

export type QuerySpacesArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};

export type QueryUserByEmailArgs = {
  email: Scalars['String']['input'];
};

export type QueryUsersArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type QueryResult = {
  __typename?: 'QueryResult';
  agentSteps?: Maybe<Scalars['JSON']['output']>;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  confidenceScore?: Maybe<Scalars['Float']['output']>;
  context?: Maybe<Scalars['String']['output']>;
  costUsd?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['ID']['output'];
  errorMessage?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  modelUsed?: Maybe<Scalars['String']['output']>;
  processingTimeMs?: Maybe<Scalars['Int']['output']>;
  queryText: Scalars['String']['output'];
  result?: Maybe<Scalars['String']['output']>;
  sources?: Maybe<Scalars['JSON']['output']>;
  spaceId: Scalars['ID']['output'];
  status?: Maybe<QueryStatusEnum>;
  title?: Maybe<Scalars['String']['output']>;
  tokensUsed?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export enum QueryStatusEnum {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
}

export type SearchDocumentsInput = {
  documentIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: Scalars['Int']['input'];
  query: Scalars['String']['input'];
  similarityThreshold?: Scalars['Float']['input'];
  spaceId?: InputMaybe<Scalars['ID']['input']>;
};

export type SearchResult = {
  __typename?: 'SearchResult';
  chunk: DocumentChunk;
  distance: Scalars['Float']['output'];
  document: Document;
  similarityScore: Scalars['Float']['output'];
};

export type Space = {
  __typename?: 'Space';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  documentCount: Scalars['Int']['output'];
  iconColor?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isPublic: Scalars['Boolean']['output'];
  maxMembers?: Maybe<Scalars['Int']['output']>;
  memberCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  ownerId: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type UpdateQueryInput = {
  result?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSpaceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  iconColor?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  fullName?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  fullName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type CreateQueryMutationVariables = Exact<{
  input: CreateQueryInput;
}>;

export type CreateQueryMutation = {
  __typename?: 'Mutation';
  createQuery?: {
    __typename?: 'QueryResult';
    id: string;
    spaceId: string;
    createdBy: string;
    queryText: string;
    result?: string | null;
    title?: string | null;
    context?: string | null;
    confidenceScore?: number | null;
    agentSteps?: any | null;
    sources?: any | null;
    modelUsed?: string | null;
    status?: QueryStatusEnum | null;
    errorMessage?: string | null;
    processingTimeMs?: number | null;
    tokensUsed?: number | null;
    costUsd?: number | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type UpdateQueryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateQueryInput;
}>;

export type UpdateQueryMutation = {
  __typename?: 'Mutation';
  updateQuery?: {
    __typename?: 'QueryResult';
    id: string;
    spaceId: string;
    createdBy: string;
    queryText: string;
    result?: string | null;
    title?: string | null;
    context?: string | null;
    confidenceScore?: number | null;
    agentSteps?: any | null;
    sources?: any | null;
    modelUsed?: string | null;
    status?: QueryStatusEnum | null;
    errorMessage?: string | null;
    processingTimeMs?: number | null;
    tokensUsed?: number | null;
    costUsd?: number | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type DeleteQueryResultMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteQueryResultMutation = {
  __typename?: 'Mutation';
  deleteQuery: boolean;
};

export type CreateSpaceMutationVariables = Exact<{
  input: CreateSpaceInput;
}>;

export type CreateSpaceMutation = {
  __typename?: 'Mutation';
  createSpace: {
    __typename?: 'Space';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    iconColor?: string | null;
    isPublic: boolean;
    maxMembers?: number | null;
    ownerId: string;
    memberCount: number;
    documentCount: number;
    createdAt: string;
    updatedAt: string;
  };
};

export type UpdateSpaceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateSpaceInput;
}>;

export type UpdateSpaceMutation = {
  __typename?: 'Mutation';
  updateSpace?: {
    __typename?: 'Space';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    iconColor?: string | null;
    isPublic: boolean;
    maxMembers?: number | null;
    ownerId: string;
    memberCount: number;
    documentCount: number;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type DeleteSpaceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteSpaceMutation = {
  __typename?: 'Mutation';
  deleteSpace: boolean;
};

export type GetDocumentsQueryVariables = Exact<{
  spaceId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetDocumentsQuery = {
  __typename?: 'Query';
  documents: Array<{
    __typename?: 'Document';
    id: string;
    name: string;
    fileType: string;
    filePath: string;
    status: string;
    spaceId: string;
    uploadedBy: string;
    sizeBytes: number;
    processingError?: string | null;
    processedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type SearchDocumentsQueryVariables = Exact<{
  input: SearchDocumentsInput;
}>;

export type SearchDocumentsQuery = {
  __typename?: 'Query';
  searchDocuments: Array<{
    __typename?: 'SearchResult';
    similarityScore: number;
    distance: number;
    chunk: {
      __typename?: 'DocumentChunk';
      id: string;
      documentId: string;
      chunkText: string;
      chunkIndex: number;
      tokenCount: number;
      startChar: number;
      endChar: number;
      chunkMetadata: any;
      createdAt: string;
    };
    document: {
      __typename?: 'Document';
      id: string;
      name: string;
      fileType: string;
      filePath: string;
      sizeBytes: number;
      status: string;
      spaceId: string;
      uploadedBy: string;
      docMetadata?: any | null;
      extractedText?: string | null;
      processingError?: string | null;
      processedAt?: string | null;
      createdAt: string;
      updatedAt: string;
    };
  }>;
};

export type HealthCheckQueryVariables = Exact<{ [key: string]: never }>;

export type HealthCheckQuery = { __typename?: 'Query'; health: string };

export type GetQueryResultsQueryVariables = Exact<{
  spaceId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetQueryResultsQuery = {
  __typename?: 'Query';
  queries: Array<{
    __typename?: 'QueryResult';
    id: string;
    spaceId: string;
    createdBy: string;
    queryText: string;
    result?: string | null;
    title?: string | null;
    context?: string | null;
    confidenceScore?: number | null;
    sources?: any | null;
    agentSteps?: any | null;
    modelUsed?: string | null;
    status?: QueryStatusEnum | null;
    errorMessage?: string | null;
    processingTimeMs?: number | null;
    tokensUsed?: number | null;
    costUsd?: number | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type GetQueryResultQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetQueryResultQuery = {
  __typename?: 'Query';
  query?: {
    __typename?: 'QueryResult';
    id: string;
    spaceId: string;
    createdBy: string;
    queryText: string;
    result?: string | null;
    title?: string | null;
    context?: string | null;
    confidenceScore?: number | null;
    sources?: any | null;
    agentSteps?: any | null;
    modelUsed?: string | null;
    status?: QueryStatusEnum | null;
    errorMessage?: string | null;
    processingTimeMs?: number | null;
    tokensUsed?: number | null;
    costUsd?: number | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type GetSpacesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetSpacesQuery = {
  __typename?: 'Query';
  spaces: Array<{
    __typename?: 'Space';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    iconColor?: string | null;
    isPublic: boolean;
    maxMembers?: number | null;
    ownerId: string;
    memberCount: number;
    documentCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type GetSpaceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetSpaceQuery = {
  __typename?: 'Query';
  space?: {
    __typename?: 'Space';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    iconColor?: string | null;
    isPublic: boolean;
    maxMembers?: number | null;
    ownerId: string;
    memberCount: number;
    documentCount: number;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type GetUserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetUserQuery = {
  __typename?: 'Query';
  user?: {
    __typename?: 'User';
    id: string;
    email: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type GetUsersQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetUsersQuery = {
  __typename?: 'Query';
  users: Array<{
    __typename?: 'User';
    id: string;
    email: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type GetUserByEmailQueryVariables = Exact<{
  email: Scalars['String']['input'];
}>;

export type GetUserByEmailQuery = {
  __typename?: 'Query';
  userByEmail?: {
    __typename?: 'User';
    id: string;
    email: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export const CreateQueryDocument = `
    mutation CreateQuery($input: CreateQueryInput!) {
  createQuery(input: $input) {
    id
    spaceId
    createdBy
    queryText
    result
    title
    context
    confidenceScore
    agentSteps
    sources
    modelUsed
    status
    errorMessage
    processingTimeMs
    tokensUsed
    costUsd
    completedAt
    createdAt
    updatedAt
  }
}
    `;

export const useCreateQueryMutation = <TError = Error, TContext = unknown>(
  options?: UseMutationOptions<
    CreateQueryMutation,
    TError,
    CreateQueryMutationVariables,
    TContext
  >
) => {
  return useMutation<
    CreateQueryMutation,
    TError,
    CreateQueryMutationVariables,
    TContext
  >({
    mutationKey: ['CreateQuery'],
    mutationFn: (variables?: CreateQueryMutationVariables) =>
      graphqlRequestFetcher<CreateQueryMutation, CreateQueryMutationVariables>(
        CreateQueryDocument,
        variables
      )(),
    ...options,
  });
};

useCreateQueryMutation.fetcher = (
  variables: CreateQueryMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<CreateQueryMutation, CreateQueryMutationVariables>(
    CreateQueryDocument,
    variables,
    options
  );

export const UpdateQueryDocument = `
    mutation UpdateQuery($id: ID!, $input: UpdateQueryInput!) {
  updateQuery(id: $id, input: $input) {
    id
    spaceId
    createdBy
    queryText
    result
    title
    context
    confidenceScore
    agentSteps
    sources
    modelUsed
    status
    errorMessage
    processingTimeMs
    tokensUsed
    costUsd
    completedAt
    createdAt
    updatedAt
  }
}
    `;

export const useUpdateQueryMutation = <TError = Error, TContext = unknown>(
  options?: UseMutationOptions<
    UpdateQueryMutation,
    TError,
    UpdateQueryMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateQueryMutation,
    TError,
    UpdateQueryMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateQuery'],
    mutationFn: (variables?: UpdateQueryMutationVariables) =>
      graphqlRequestFetcher<UpdateQueryMutation, UpdateQueryMutationVariables>(
        UpdateQueryDocument,
        variables
      )(),
    ...options,
  });
};

useUpdateQueryMutation.fetcher = (
  variables: UpdateQueryMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<UpdateQueryMutation, UpdateQueryMutationVariables>(
    UpdateQueryDocument,
    variables,
    options
  );

export const DeleteQueryResultDocument = `
    mutation DeleteQueryResult($id: ID!) {
  deleteQuery(id: $id)
}
    `;

export const useDeleteQueryResultMutation = <
  TError = Error,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    DeleteQueryResultMutation,
    TError,
    DeleteQueryResultMutationVariables,
    TContext
  >
) => {
  return useMutation<
    DeleteQueryResultMutation,
    TError,
    DeleteQueryResultMutationVariables,
    TContext
  >({
    mutationKey: ['DeleteQueryResult'],
    mutationFn: (variables?: DeleteQueryResultMutationVariables) =>
      graphqlRequestFetcher<
        DeleteQueryResultMutation,
        DeleteQueryResultMutationVariables
      >(DeleteQueryResultDocument, variables)(),
    ...options,
  });
};

useDeleteQueryResultMutation.fetcher = (
  variables: DeleteQueryResultMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<
    DeleteQueryResultMutation,
    DeleteQueryResultMutationVariables
  >(DeleteQueryResultDocument, variables, options);

export const CreateSpaceDocument = `
    mutation CreateSpace($input: CreateSpaceInput!) {
  createSpace(input: $input) {
    id
    name
    slug
    description
    iconColor
    isPublic
    maxMembers
    ownerId
    memberCount
    documentCount
    createdAt
    updatedAt
  }
}
    `;

export const useCreateSpaceMutation = <TError = Error, TContext = unknown>(
  options?: UseMutationOptions<
    CreateSpaceMutation,
    TError,
    CreateSpaceMutationVariables,
    TContext
  >
) => {
  return useMutation<
    CreateSpaceMutation,
    TError,
    CreateSpaceMutationVariables,
    TContext
  >({
    mutationKey: ['CreateSpace'],
    mutationFn: (variables?: CreateSpaceMutationVariables) =>
      graphqlRequestFetcher<CreateSpaceMutation, CreateSpaceMutationVariables>(
        CreateSpaceDocument,
        variables
      )(),
    ...options,
  });
};

useCreateSpaceMutation.fetcher = (
  variables: CreateSpaceMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<CreateSpaceMutation, CreateSpaceMutationVariables>(
    CreateSpaceDocument,
    variables,
    options
  );

export const UpdateSpaceDocument = `
    mutation UpdateSpace($id: ID!, $input: UpdateSpaceInput!) {
  updateSpace(id: $id, input: $input) {
    id
    name
    slug
    description
    iconColor
    isPublic
    maxMembers
    ownerId
    memberCount
    documentCount
    createdAt
    updatedAt
  }
}
    `;

export const useUpdateSpaceMutation = <TError = Error, TContext = unknown>(
  options?: UseMutationOptions<
    UpdateSpaceMutation,
    TError,
    UpdateSpaceMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateSpaceMutation,
    TError,
    UpdateSpaceMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateSpace'],
    mutationFn: (variables?: UpdateSpaceMutationVariables) =>
      graphqlRequestFetcher<UpdateSpaceMutation, UpdateSpaceMutationVariables>(
        UpdateSpaceDocument,
        variables
      )(),
    ...options,
  });
};

useUpdateSpaceMutation.fetcher = (
  variables: UpdateSpaceMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<UpdateSpaceMutation, UpdateSpaceMutationVariables>(
    UpdateSpaceDocument,
    variables,
    options
  );

export const DeleteSpaceDocument = `
    mutation DeleteSpace($id: ID!) {
  deleteSpace(id: $id)
}
    `;

export const useDeleteSpaceMutation = <TError = Error, TContext = unknown>(
  options?: UseMutationOptions<
    DeleteSpaceMutation,
    TError,
    DeleteSpaceMutationVariables,
    TContext
  >
) => {
  return useMutation<
    DeleteSpaceMutation,
    TError,
    DeleteSpaceMutationVariables,
    TContext
  >({
    mutationKey: ['DeleteSpace'],
    mutationFn: (variables?: DeleteSpaceMutationVariables) =>
      graphqlRequestFetcher<DeleteSpaceMutation, DeleteSpaceMutationVariables>(
        DeleteSpaceDocument,
        variables
      )(),
    ...options,
  });
};

useDeleteSpaceMutation.fetcher = (
  variables: DeleteSpaceMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<DeleteSpaceMutation, DeleteSpaceMutationVariables>(
    DeleteSpaceDocument,
    variables,
    options
  );

export const GetDocumentsDocument = `
    query GetDocuments($spaceId: ID, $limit: Int, $offset: Int) {
  documents(spaceId: $spaceId, limit: $limit, offset: $offset) {
    id
    name
    fileType
    filePath
    status
    spaceId
    uploadedBy
    sizeBytes
    processingError
    processedAt
    createdAt
    updatedAt
  }
}
    `;

export const useGetDocumentsQuery = <TData = GetDocumentsQuery, TError = Error>(
  variables?: GetDocumentsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetDocumentsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetDocumentsQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetDocumentsQuery, TError, TData>({
    queryKey:
      variables === undefined ? ['GetDocuments'] : ['GetDocuments', variables],
    queryFn: graphqlRequestFetcher<
      GetDocumentsQuery,
      GetDocumentsQueryVariables
    >(GetDocumentsDocument, variables),
    ...options,
  });
};

useGetDocumentsQuery.getKey = (variables?: GetDocumentsQueryVariables) =>
  variables === undefined ? ['GetDocuments'] : ['GetDocuments', variables];

useGetDocumentsQuery.fetcher = (
  variables?: GetDocumentsQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetDocumentsQuery, GetDocumentsQueryVariables>(
    GetDocumentsDocument,
    variables,
    options
  );

export const SearchDocumentsDocument = `
    query SearchDocuments($input: SearchDocumentsInput!) {
  searchDocuments(input: $input) {
    chunk {
      id
      documentId
      chunkText
      chunkIndex
      tokenCount
      startChar
      endChar
      chunkMetadata
      createdAt
    }
    document {
      id
      name
      fileType
      filePath
      sizeBytes
      status
      spaceId
      uploadedBy
      docMetadata
      extractedText
      processingError
      processedAt
      createdAt
      updatedAt
    }
    similarityScore
    distance
  }
}
    `;

export const useSearchDocumentsQuery = <
  TData = SearchDocumentsQuery,
  TError = Error,
>(
  variables: SearchDocumentsQueryVariables,
  options?: Omit<
    UseQueryOptions<SearchDocumentsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<SearchDocumentsQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<SearchDocumentsQuery, TError, TData>({
    queryKey: ['SearchDocuments', variables],
    queryFn: graphqlRequestFetcher<
      SearchDocumentsQuery,
      SearchDocumentsQueryVariables
    >(SearchDocumentsDocument, variables),
    ...options,
  });
};

useSearchDocumentsQuery.getKey = (variables: SearchDocumentsQueryVariables) => [
  'SearchDocuments',
  variables,
];

useSearchDocumentsQuery.fetcher = (
  variables: SearchDocumentsQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<SearchDocumentsQuery, SearchDocumentsQueryVariables>(
    SearchDocumentsDocument,
    variables,
    options
  );

export const HealthCheckDocument = `
    query HealthCheck {
  health
}
    `;

export const useHealthCheckQuery = <TData = HealthCheckQuery, TError = Error>(
  variables?: HealthCheckQueryVariables,
  options?: Omit<
    UseQueryOptions<HealthCheckQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<HealthCheckQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<HealthCheckQuery, TError, TData>({
    queryKey:
      variables === undefined ? ['HealthCheck'] : ['HealthCheck', variables],
    queryFn: graphqlRequestFetcher<HealthCheckQuery, HealthCheckQueryVariables>(
      HealthCheckDocument,
      variables
    ),
    ...options,
  });
};

useHealthCheckQuery.getKey = (variables?: HealthCheckQueryVariables) =>
  variables === undefined ? ['HealthCheck'] : ['HealthCheck', variables];

useHealthCheckQuery.fetcher = (
  variables?: HealthCheckQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<HealthCheckQuery, HealthCheckQueryVariables>(
    HealthCheckDocument,
    variables,
    options
  );

export const GetQueryResultsDocument = `
    query GetQueryResults($spaceId: ID!, $limit: Int, $offset: Int) {
  queries(spaceId: $spaceId, limit: $limit, offset: $offset) {
    id
    spaceId
    createdBy
    queryText
    result
    title
    context
    confidenceScore
    sources
    agentSteps
    modelUsed
    status
    errorMessage
    processingTimeMs
    tokensUsed
    costUsd
    completedAt
    createdAt
    updatedAt
  }
}
    `;

export const useGetQueryResultsQuery = <
  TData = GetQueryResultsQuery,
  TError = Error,
>(
  variables: GetQueryResultsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetQueryResultsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetQueryResultsQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetQueryResultsQuery, TError, TData>({
    queryKey: ['GetQueryResults', variables],
    queryFn: graphqlRequestFetcher<
      GetQueryResultsQuery,
      GetQueryResultsQueryVariables
    >(GetQueryResultsDocument, variables),
    ...options,
  });
};

useGetQueryResultsQuery.getKey = (variables: GetQueryResultsQueryVariables) => [
  'GetQueryResults',
  variables,
];

useGetQueryResultsQuery.fetcher = (
  variables: GetQueryResultsQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetQueryResultsQuery, GetQueryResultsQueryVariables>(
    GetQueryResultsDocument,
    variables,
    options
  );

export const GetQueryResultDocument = `
    query GetQueryResult($id: ID!) {
  query(id: $id) {
    id
    spaceId
    createdBy
    queryText
    result
    title
    context
    confidenceScore
    sources
    agentSteps
    modelUsed
    status
    errorMessage
    processingTimeMs
    tokensUsed
    costUsd
    completedAt
    createdAt
    updatedAt
  }
}
    `;

export const useGetQueryResultQuery = <
  TData = GetQueryResultQuery,
  TError = Error,
>(
  variables: GetQueryResultQueryVariables,
  options?: Omit<
    UseQueryOptions<GetQueryResultQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetQueryResultQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetQueryResultQuery, TError, TData>({
    queryKey: ['GetQueryResult', variables],
    queryFn: graphqlRequestFetcher<
      GetQueryResultQuery,
      GetQueryResultQueryVariables
    >(GetQueryResultDocument, variables),
    ...options,
  });
};

useGetQueryResultQuery.getKey = (variables: GetQueryResultQueryVariables) => [
  'GetQueryResult',
  variables,
];

useGetQueryResultQuery.fetcher = (
  variables: GetQueryResultQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetQueryResultQuery, GetQueryResultQueryVariables>(
    GetQueryResultDocument,
    variables,
    options
  );

export const GetSpacesDocument = `
    query GetSpaces($limit: Int, $offset: Int) {
  spaces(limit: $limit, offset: $offset) {
    id
    name
    slug
    description
    iconColor
    isPublic
    maxMembers
    ownerId
    memberCount
    documentCount
    createdAt
    updatedAt
  }
}
    `;

export const useGetSpacesQuery = <TData = GetSpacesQuery, TError = Error>(
  variables?: GetSpacesQueryVariables,
  options?: Omit<UseQueryOptions<GetSpacesQuery, TError, TData>, 'queryKey'> & {
    queryKey?: UseQueryOptions<GetSpacesQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetSpacesQuery, TError, TData>({
    queryKey:
      variables === undefined ? ['GetSpaces'] : ['GetSpaces', variables],
    queryFn: graphqlRequestFetcher<GetSpacesQuery, GetSpacesQueryVariables>(
      GetSpacesDocument,
      variables
    ),
    ...options,
  });
};

useGetSpacesQuery.getKey = (variables?: GetSpacesQueryVariables) =>
  variables === undefined ? ['GetSpaces'] : ['GetSpaces', variables];

useGetSpacesQuery.fetcher = (
  variables?: GetSpacesQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetSpacesQuery, GetSpacesQueryVariables>(
    GetSpacesDocument,
    variables,
    options
  );

export const GetSpaceDocument = `
    query GetSpace($id: ID!) {
  space(id: $id) {
    id
    name
    slug
    description
    iconColor
    isPublic
    maxMembers
    ownerId
    memberCount
    documentCount
    createdAt
    updatedAt
  }
}
    `;

export const useGetSpaceQuery = <TData = GetSpaceQuery, TError = Error>(
  variables: GetSpaceQueryVariables,
  options?: Omit<UseQueryOptions<GetSpaceQuery, TError, TData>, 'queryKey'> & {
    queryKey?: UseQueryOptions<GetSpaceQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetSpaceQuery, TError, TData>({
    queryKey: ['GetSpace', variables],
    queryFn: graphqlRequestFetcher<GetSpaceQuery, GetSpaceQueryVariables>(
      GetSpaceDocument,
      variables
    ),
    ...options,
  });
};

useGetSpaceQuery.getKey = (variables: GetSpaceQueryVariables) => [
  'GetSpace',
  variables,
];

useGetSpaceQuery.fetcher = (
  variables: GetSpaceQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetSpaceQuery, GetSpaceQueryVariables>(
    GetSpaceDocument,
    variables,
    options
  );

export const GetUserDocument = `
    query GetUser($id: ID!) {
  user(id: $id) {
    id
    email
    fullName
    avatarUrl
    bio
    createdAt
    updatedAt
  }
}
    `;

export const useGetUserQuery = <TData = GetUserQuery, TError = Error>(
  variables: GetUserQueryVariables,
  options?: Omit<UseQueryOptions<GetUserQuery, TError, TData>, 'queryKey'> & {
    queryKey?: UseQueryOptions<GetUserQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetUserQuery, TError, TData>({
    queryKey: ['GetUser', variables],
    queryFn: graphqlRequestFetcher<GetUserQuery, GetUserQueryVariables>(
      GetUserDocument,
      variables
    ),
    ...options,
  });
};

useGetUserQuery.getKey = (variables: GetUserQueryVariables) => [
  'GetUser',
  variables,
];

useGetUserQuery.fetcher = (
  variables: GetUserQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetUserQuery, GetUserQueryVariables>(
    GetUserDocument,
    variables,
    options
  );

export const GetUsersDocument = `
    query GetUsers($limit: Int, $offset: Int) {
  users(limit: $limit, offset: $offset) {
    id
    email
    fullName
    avatarUrl
    bio
    createdAt
    updatedAt
  }
}
    `;

export const useGetUsersQuery = <TData = GetUsersQuery, TError = Error>(
  variables?: GetUsersQueryVariables,
  options?: Omit<UseQueryOptions<GetUsersQuery, TError, TData>, 'queryKey'> & {
    queryKey?: UseQueryOptions<GetUsersQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetUsersQuery, TError, TData>({
    queryKey: variables === undefined ? ['GetUsers'] : ['GetUsers', variables],
    queryFn: graphqlRequestFetcher<GetUsersQuery, GetUsersQueryVariables>(
      GetUsersDocument,
      variables
    ),
    ...options,
  });
};

useGetUsersQuery.getKey = (variables?: GetUsersQueryVariables) =>
  variables === undefined ? ['GetUsers'] : ['GetUsers', variables];

useGetUsersQuery.fetcher = (
  variables?: GetUsersQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetUsersQuery, GetUsersQueryVariables>(
    GetUsersDocument,
    variables,
    options
  );

export const GetUserByEmailDocument = `
    query GetUserByEmail($email: String!) {
  userByEmail(email: $email) {
    id
    email
    fullName
    avatarUrl
    bio
    createdAt
    updatedAt
  }
}
    `;

export const useGetUserByEmailQuery = <
  TData = GetUserByEmailQuery,
  TError = Error,
>(
  variables: GetUserByEmailQueryVariables,
  options?: Omit<
    UseQueryOptions<GetUserByEmailQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetUserByEmailQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetUserByEmailQuery, TError, TData>({
    queryKey: ['GetUserByEmail', variables],
    queryFn: graphqlRequestFetcher<
      GetUserByEmailQuery,
      GetUserByEmailQueryVariables
    >(GetUserByEmailDocument, variables),
    ...options,
  });
};

useGetUserByEmailQuery.getKey = (variables: GetUserByEmailQueryVariables) => [
  'GetUserByEmail',
  variables,
];

useGetUserByEmailQuery.fetcher = (
  variables: GetUserByEmailQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetUserByEmailQuery, GetUserByEmailQueryVariables>(
    GetUserByEmailDocument,
    variables,
    options
  );
