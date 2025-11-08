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

export type CreateThreadInput = {
  confidenceScore?: InputMaybe<Scalars['Float']['input']>;
  organizationId: Scalars['ID']['input'];
  queryText: Scalars['String']['input'];
  result?: InputMaybe<Scalars['String']['input']>;
  spaceId?: InputMaybe<Scalars['ID']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
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
  createThread?: Maybe<Thread>;
  createUser: User;
  deleteSpace: Scalars['Boolean']['output'];
  deleteThread: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  updateSpace?: Maybe<Space>;
  updateThread?: Maybe<Thread>;
  updateUser?: Maybe<User>;
};

export type MutationCreateSpaceArgs = {
  input: CreateSpaceInput;
};

export type MutationCreateThreadArgs = {
  input: CreateThreadInput;
};

export type MutationCreateUserArgs = {
  input: CreateUserInput;
};

export type MutationDeleteSpaceArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteThreadArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};

export type MutationUpdateSpaceArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSpaceInput;
};

export type MutationUpdateThreadArgs = {
  id: Scalars['ID']['input'];
  input: UpdateThreadInput;
};

export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};

export type Query = {
  __typename?: 'Query';
  documents: Array<Document>;
  health: Scalars['String']['output'];
  searchDocuments: Array<SearchResult>;
  space?: Maybe<Space>;
  spaces: Array<Space>;
  thread?: Maybe<Thread>;
  threads: Array<Thread>;
  user?: Maybe<User>;
  userByEmail?: Maybe<User>;
  users: Array<User>;
};

export type QueryDocumentsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  spaceId?: InputMaybe<Scalars['ID']['input']>;
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

export type QueryThreadArgs = {
  id: Scalars['ID']['input'];
};

export type QueryThreadsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  organizationId?: InputMaybe<Scalars['ID']['input']>;
  spaceId?: InputMaybe<Scalars['ID']['input']>;
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

export type Thread = {
  __typename?: 'Thread';
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
  organizationId: Scalars['ID']['output'];
  processingTimeMs?: Maybe<Scalars['Int']['output']>;
  queryText: Scalars['String']['output'];
  result?: Maybe<Scalars['String']['output']>;
  sources?: Maybe<Scalars['JSON']['output']>;
  spaceId?: Maybe<Scalars['ID']['output']>;
  status?: Maybe<ThreadStatusEnum>;
  title?: Maybe<Scalars['String']['output']>;
  tokensUsed?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export enum ThreadStatusEnum {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
}

export type UpdateSpaceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  iconColor?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateThreadInput = {
  result?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
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

export type CreateThreadMutationVariables = Exact<{
  input: CreateThreadInput;
}>;

export type CreateThreadMutation = {
  __typename?: 'Mutation';
  createThread?: {
    __typename?: 'Thread';
    id: string;
    organizationId: string;
    spaceId?: string | null;
    createdBy: string;
    queryText: string;
    result?: string | null;
    title?: string | null;
    context?: string | null;
    confidenceScore?: number | null;
    agentSteps?: any | null;
    sources?: any | null;
    modelUsed?: string | null;
    status?: ThreadStatusEnum | null;
    errorMessage?: string | null;
    processingTimeMs?: number | null;
    tokensUsed?: number | null;
    costUsd?: number | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type UpdateThreadMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateThreadInput;
}>;

export type UpdateThreadMutation = {
  __typename?: 'Mutation';
  updateThread?: {
    __typename?: 'Thread';
    id: string;
    organizationId: string;
    spaceId?: string | null;
    createdBy: string;
    queryText: string;
    result?: string | null;
    title?: string | null;
    context?: string | null;
    confidenceScore?: number | null;
    agentSteps?: any | null;
    sources?: any | null;
    modelUsed?: string | null;
    status?: ThreadStatusEnum | null;
    errorMessage?: string | null;
    processingTimeMs?: number | null;
    tokensUsed?: number | null;
    costUsd?: number | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type DeleteThreadMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteThreadMutation = {
  __typename?: 'Mutation';
  deleteThread: boolean;
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

export type GetThreadsQueryVariables = Exact<{
  spaceId?: InputMaybe<Scalars['ID']['input']>;
  organizationId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetThreadsQuery = {
  __typename?: 'Query';
  threads: Array<{
    __typename?: 'Thread';
    id: string;
    organizationId: string;
    spaceId?: string | null;
    createdBy: string;
    queryText: string;
    result?: string | null;
    title?: string | null;
    context?: string | null;
    confidenceScore?: number | null;
    sources?: any | null;
    agentSteps?: any | null;
    modelUsed?: string | null;
    status?: ThreadStatusEnum | null;
    errorMessage?: string | null;
    processingTimeMs?: number | null;
    tokensUsed?: number | null;
    costUsd?: number | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type GetThreadQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetThreadQuery = {
  __typename?: 'Query';
  thread?: {
    __typename?: 'Thread';
    id: string;
    organizationId: string;
    spaceId?: string | null;
    createdBy: string;
    queryText: string;
    result?: string | null;
    title?: string | null;
    context?: string | null;
    confidenceScore?: number | null;
    sources?: any | null;
    agentSteps?: any | null;
    modelUsed?: string | null;
    status?: ThreadStatusEnum | null;
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
