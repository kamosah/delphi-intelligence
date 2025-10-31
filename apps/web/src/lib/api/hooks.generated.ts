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
  createSpace: Space;
  createUser: User;
  deleteSpace: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  updateSpace?: Maybe<Space>;
  updateUser?: Maybe<User>;
};

export type MutationCreateSpaceArgs = {
  input: CreateSpaceInput;
};

export type MutationCreateUserArgs = {
  input: CreateUserInput;
};

export type MutationDeleteSpaceArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
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
  health: Scalars['String']['output'];
  searchDocuments: Array<SearchResult>;
  space?: Maybe<Space>;
  spaces: Array<Space>;
  user?: Maybe<User>;
  userByEmail?: Maybe<User>;
  users: Array<User>;
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
