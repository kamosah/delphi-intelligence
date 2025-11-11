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

export type AddOrganizationMemberInput = {
  organizationId: Scalars['ID']['input'];
  role?: OrganizationRole;
  userId: Scalars['ID']['input'];
};

export type CreateOrganizationInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type CreateSpaceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  iconColor?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  organizationId: Scalars['ID']['input'];
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

export type DashboardStats = {
  __typename?: 'DashboardStats';
  threadsThisMonth: Scalars['Int']['output'];
  totalDocuments: Scalars['Int']['output'];
  totalSpaces: Scalars['Int']['output'];
  totalThreads: Scalars['Int']['output'];
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
  addOrganizationMember: OrganizationMember;
  createOrganization: Organization;
  createSpace: Space;
  createThread?: Maybe<Thread>;
  createUser: User;
  deleteOrganization: Scalars['Boolean']['output'];
  deleteSpace: Scalars['Boolean']['output'];
  deleteThread: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  removeOrganizationMember: Scalars['Boolean']['output'];
  updateMemberRole?: Maybe<OrganizationMember>;
  updateOrganization?: Maybe<Organization>;
  updateSpace?: Maybe<Space>;
  updateThread?: Maybe<Thread>;
  updateUser?: Maybe<User>;
};

export type MutationAddOrganizationMemberArgs = {
  input: AddOrganizationMemberInput;
};

export type MutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
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

export type MutationDeleteOrganizationArgs = {
  id: Scalars['ID']['input'];
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

export type MutationRemoveOrganizationMemberArgs = {
  organizationId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type MutationUpdateMemberRoleArgs = {
  organizationId: Scalars['ID']['input'];
  role: OrganizationRole;
  userId: Scalars['ID']['input'];
};

export type MutationUpdateOrganizationArgs = {
  id: Scalars['ID']['input'];
  input: UpdateOrganizationInput;
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

export type Organization = {
  __typename?: 'Organization';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  memberCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  ownerId?: Maybe<Scalars['ID']['output']>;
  slug: Scalars['String']['output'];
  spaceCount: Scalars['Int']['output'];
  threadCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type OrganizationMember = {
  __typename?: 'OrganizationMember';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  organizationId: Scalars['ID']['output'];
  role: OrganizationRole;
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export enum OrganizationRole {
  Admin = 'ADMIN',
  Member = 'MEMBER',
  Owner = 'OWNER',
  Viewer = 'VIEWER',
}

export type Query = {
  __typename?: 'Query';
  dashboardStats: DashboardStats;
  documents: Array<Document>;
  health: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationMembers: Array<OrganizationMember>;
  organizations: Array<Organization>;
  searchDocuments: Array<SearchResult>;
  space?: Maybe<Space>;
  spaces: Array<Space>;
  thread?: Maybe<Thread>;
  threads: Array<Thread>;
  user?: Maybe<User>;
  userByEmail?: Maybe<User>;
  users: Array<User>;
};

export type QueryDashboardStatsArgs = {
  organizationId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryDocumentsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  spaceId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryOrganizationArgs = {
  id: Scalars['ID']['input'];
};

export type QueryOrganizationMembersArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  organizationId: Scalars['ID']['input'];
};

export type QueryOrganizationsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
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

export type UpdateOrganizationInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

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

export type CreateOrganizationMutationVariables = Exact<{
  input: CreateOrganizationInput;
}>;

export type CreateOrganizationMutation = {
  __typename?: 'Mutation';
  createOrganization: {
    __typename?: 'Organization';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    ownerId?: string | null;
    memberCount: number;
    spaceCount: number;
    threadCount: number;
    createdAt: string;
    updatedAt: string;
  };
};

export type UpdateOrganizationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateOrganizationInput;
}>;

export type UpdateOrganizationMutation = {
  __typename?: 'Mutation';
  updateOrganization?: {
    __typename?: 'Organization';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    ownerId?: string | null;
    memberCount: number;
    spaceCount: number;
    threadCount: number;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type DeleteOrganizationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteOrganizationMutation = {
  __typename?: 'Mutation';
  deleteOrganization: boolean;
};

export type AddOrganizationMemberMutationVariables = Exact<{
  input: AddOrganizationMemberInput;
}>;

export type AddOrganizationMemberMutation = {
  __typename?: 'Mutation';
  addOrganizationMember: {
    __typename?: 'OrganizationMember';
    id: string;
    organizationId: string;
    userId: string;
    role: OrganizationRole;
    createdAt: string;
  };
};

export type RemoveOrganizationMemberMutationVariables = Exact<{
  organizationId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
}>;

export type RemoveOrganizationMemberMutation = {
  __typename?: 'Mutation';
  removeOrganizationMember: boolean;
};

export type UpdateMemberRoleMutationVariables = Exact<{
  organizationId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
  role: OrganizationRole;
}>;

export type UpdateMemberRoleMutation = {
  __typename?: 'Mutation';
  updateMemberRole?: {
    __typename?: 'OrganizationMember';
    id: string;
    organizationId: string;
    userId: string;
    role: OrganizationRole;
    createdAt: string;
  } | null;
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

export type GetDashboardStatsQueryVariables = Exact<{
  organizationId?: InputMaybe<Scalars['ID']['input']>;
}>;

export type GetDashboardStatsQuery = {
  __typename?: 'Query';
  dashboardStats: {
    __typename?: 'DashboardStats';
    totalDocuments: number;
    totalSpaces: number;
    totalThreads: number;
    threadsThisMonth: number;
  };
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

export type GetOrganizationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetOrganizationsQuery = {
  __typename?: 'Query';
  organizations: Array<{
    __typename?: 'Organization';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    ownerId?: string | null;
    memberCount: number;
    spaceCount: number;
    threadCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type GetOrganizationQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetOrganizationQuery = {
  __typename?: 'Query';
  organization?: {
    __typename?: 'Organization';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    ownerId?: string | null;
    memberCount: number;
    spaceCount: number;
    threadCount: number;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type GetOrganizationMembersQueryVariables = Exact<{
  organizationId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetOrganizationMembersQuery = {
  __typename?: 'Query';
  organizationMembers: Array<{
    __typename?: 'OrganizationMember';
    id: string;
    organizationId: string;
    userId: string;
    role: OrganizationRole;
    createdAt: string;
    user?: {
      __typename?: 'User';
      id: string;
      email: string;
      fullName?: string | null;
      avatarUrl?: string | null;
    } | null;
  }>;
};

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

export const CreateOrganizationDocument = `
    mutation CreateOrganization($input: CreateOrganizationInput!) {
  createOrganization(input: $input) {
    id
    name
    slug
    description
    ownerId
    memberCount
    spaceCount
    threadCount
    createdAt
    updatedAt
  }
}
    `;

export const useCreateOrganizationMutation = <
  TError = Error,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    CreateOrganizationMutation,
    TError,
    CreateOrganizationMutationVariables,
    TContext
  >
) => {
  return useMutation<
    CreateOrganizationMutation,
    TError,
    CreateOrganizationMutationVariables,
    TContext
  >({
    mutationKey: ['CreateOrganization'],
    mutationFn: (variables?: CreateOrganizationMutationVariables) =>
      graphqlRequestFetcher<
        CreateOrganizationMutation,
        CreateOrganizationMutationVariables
      >(CreateOrganizationDocument, variables)(),
    ...options,
  });
};

useCreateOrganizationMutation.fetcher = (
  variables: CreateOrganizationMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<
    CreateOrganizationMutation,
    CreateOrganizationMutationVariables
  >(CreateOrganizationDocument, variables, options);

export const UpdateOrganizationDocument = `
    mutation UpdateOrganization($id: ID!, $input: UpdateOrganizationInput!) {
  updateOrganization(id: $id, input: $input) {
    id
    name
    slug
    description
    ownerId
    memberCount
    spaceCount
    threadCount
    createdAt
    updatedAt
  }
}
    `;

export const useUpdateOrganizationMutation = <
  TError = Error,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    UpdateOrganizationMutation,
    TError,
    UpdateOrganizationMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateOrganizationMutation,
    TError,
    UpdateOrganizationMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateOrganization'],
    mutationFn: (variables?: UpdateOrganizationMutationVariables) =>
      graphqlRequestFetcher<
        UpdateOrganizationMutation,
        UpdateOrganizationMutationVariables
      >(UpdateOrganizationDocument, variables)(),
    ...options,
  });
};

useUpdateOrganizationMutation.fetcher = (
  variables: UpdateOrganizationMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<
    UpdateOrganizationMutation,
    UpdateOrganizationMutationVariables
  >(UpdateOrganizationDocument, variables, options);

export const DeleteOrganizationDocument = `
    mutation DeleteOrganization($id: ID!) {
  deleteOrganization(id: $id)
}
    `;

export const useDeleteOrganizationMutation = <
  TError = Error,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    DeleteOrganizationMutation,
    TError,
    DeleteOrganizationMutationVariables,
    TContext
  >
) => {
  return useMutation<
    DeleteOrganizationMutation,
    TError,
    DeleteOrganizationMutationVariables,
    TContext
  >({
    mutationKey: ['DeleteOrganization'],
    mutationFn: (variables?: DeleteOrganizationMutationVariables) =>
      graphqlRequestFetcher<
        DeleteOrganizationMutation,
        DeleteOrganizationMutationVariables
      >(DeleteOrganizationDocument, variables)(),
    ...options,
  });
};

useDeleteOrganizationMutation.fetcher = (
  variables: DeleteOrganizationMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<
    DeleteOrganizationMutation,
    DeleteOrganizationMutationVariables
  >(DeleteOrganizationDocument, variables, options);

export const AddOrganizationMemberDocument = `
    mutation AddOrganizationMember($input: AddOrganizationMemberInput!) {
  addOrganizationMember(input: $input) {
    id
    organizationId
    userId
    role
    createdAt
  }
}
    `;

export const useAddOrganizationMemberMutation = <
  TError = Error,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    AddOrganizationMemberMutation,
    TError,
    AddOrganizationMemberMutationVariables,
    TContext
  >
) => {
  return useMutation<
    AddOrganizationMemberMutation,
    TError,
    AddOrganizationMemberMutationVariables,
    TContext
  >({
    mutationKey: ['AddOrganizationMember'],
    mutationFn: (variables?: AddOrganizationMemberMutationVariables) =>
      graphqlRequestFetcher<
        AddOrganizationMemberMutation,
        AddOrganizationMemberMutationVariables
      >(AddOrganizationMemberDocument, variables)(),
    ...options,
  });
};

useAddOrganizationMemberMutation.fetcher = (
  variables: AddOrganizationMemberMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<
    AddOrganizationMemberMutation,
    AddOrganizationMemberMutationVariables
  >(AddOrganizationMemberDocument, variables, options);

export const RemoveOrganizationMemberDocument = `
    mutation RemoveOrganizationMember($organizationId: ID!, $userId: ID!) {
  removeOrganizationMember(organizationId: $organizationId, userId: $userId)
}
    `;

export const useRemoveOrganizationMemberMutation = <
  TError = Error,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    RemoveOrganizationMemberMutation,
    TError,
    RemoveOrganizationMemberMutationVariables,
    TContext
  >
) => {
  return useMutation<
    RemoveOrganizationMemberMutation,
    TError,
    RemoveOrganizationMemberMutationVariables,
    TContext
  >({
    mutationKey: ['RemoveOrganizationMember'],
    mutationFn: (variables?: RemoveOrganizationMemberMutationVariables) =>
      graphqlRequestFetcher<
        RemoveOrganizationMemberMutation,
        RemoveOrganizationMemberMutationVariables
      >(RemoveOrganizationMemberDocument, variables)(),
    ...options,
  });
};

useRemoveOrganizationMemberMutation.fetcher = (
  variables: RemoveOrganizationMemberMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<
    RemoveOrganizationMemberMutation,
    RemoveOrganizationMemberMutationVariables
  >(RemoveOrganizationMemberDocument, variables, options);

export const UpdateMemberRoleDocument = `
    mutation UpdateMemberRole($organizationId: ID!, $userId: ID!, $role: OrganizationRole!) {
  updateMemberRole(organizationId: $organizationId, userId: $userId, role: $role) {
    id
    organizationId
    userId
    role
    createdAt
  }
}
    `;

export const useUpdateMemberRoleMutation = <TError = Error, TContext = unknown>(
  options?: UseMutationOptions<
    UpdateMemberRoleMutation,
    TError,
    UpdateMemberRoleMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateMemberRoleMutation,
    TError,
    UpdateMemberRoleMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateMemberRole'],
    mutationFn: (variables?: UpdateMemberRoleMutationVariables) =>
      graphqlRequestFetcher<
        UpdateMemberRoleMutation,
        UpdateMemberRoleMutationVariables
      >(UpdateMemberRoleDocument, variables)(),
    ...options,
  });
};

useUpdateMemberRoleMutation.fetcher = (
  variables: UpdateMemberRoleMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<
    UpdateMemberRoleMutation,
    UpdateMemberRoleMutationVariables
  >(UpdateMemberRoleDocument, variables, options);

export const CreateThreadDocument = `
    mutation CreateThread($input: CreateThreadInput!) {
  createThread(input: $input) {
    id
    organizationId
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

export const useCreateThreadMutation = <TError = Error, TContext = unknown>(
  options?: UseMutationOptions<
    CreateThreadMutation,
    TError,
    CreateThreadMutationVariables,
    TContext
  >
) => {
  return useMutation<
    CreateThreadMutation,
    TError,
    CreateThreadMutationVariables,
    TContext
  >({
    mutationKey: ['CreateThread'],
    mutationFn: (variables?: CreateThreadMutationVariables) =>
      graphqlRequestFetcher<
        CreateThreadMutation,
        CreateThreadMutationVariables
      >(CreateThreadDocument, variables)(),
    ...options,
  });
};

useCreateThreadMutation.fetcher = (
  variables: CreateThreadMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<CreateThreadMutation, CreateThreadMutationVariables>(
    CreateThreadDocument,
    variables,
    options
  );

export const UpdateThreadDocument = `
    mutation UpdateThread($id: ID!, $input: UpdateThreadInput!) {
  updateThread(id: $id, input: $input) {
    id
    organizationId
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

export const useUpdateThreadMutation = <TError = Error, TContext = unknown>(
  options?: UseMutationOptions<
    UpdateThreadMutation,
    TError,
    UpdateThreadMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateThreadMutation,
    TError,
    UpdateThreadMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateThread'],
    mutationFn: (variables?: UpdateThreadMutationVariables) =>
      graphqlRequestFetcher<
        UpdateThreadMutation,
        UpdateThreadMutationVariables
      >(UpdateThreadDocument, variables)(),
    ...options,
  });
};

useUpdateThreadMutation.fetcher = (
  variables: UpdateThreadMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<UpdateThreadMutation, UpdateThreadMutationVariables>(
    UpdateThreadDocument,
    variables,
    options
  );

export const DeleteThreadDocument = `
    mutation DeleteThread($id: ID!) {
  deleteThread(id: $id)
}
    `;

export const useDeleteThreadMutation = <TError = Error, TContext = unknown>(
  options?: UseMutationOptions<
    DeleteThreadMutation,
    TError,
    DeleteThreadMutationVariables,
    TContext
  >
) => {
  return useMutation<
    DeleteThreadMutation,
    TError,
    DeleteThreadMutationVariables,
    TContext
  >({
    mutationKey: ['DeleteThread'],
    mutationFn: (variables?: DeleteThreadMutationVariables) =>
      graphqlRequestFetcher<
        DeleteThreadMutation,
        DeleteThreadMutationVariables
      >(DeleteThreadDocument, variables)(),
    ...options,
  });
};

useDeleteThreadMutation.fetcher = (
  variables: DeleteThreadMutationVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<DeleteThreadMutation, DeleteThreadMutationVariables>(
    DeleteThreadDocument,
    variables,
    options
  );

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

export const GetDashboardStatsDocument = `
    query GetDashboardStats($organizationId: ID) {
  dashboardStats(organizationId: $organizationId) {
    totalDocuments
    totalSpaces
    totalThreads
    threadsThisMonth
  }
}
    `;

export const useGetDashboardStatsQuery = <
  TData = GetDashboardStatsQuery,
  TError = Error,
>(
  variables?: GetDashboardStatsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetDashboardStatsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetDashboardStatsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetDashboardStatsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetDashboardStats']
        : ['GetDashboardStats', variables],
    queryFn: graphqlRequestFetcher<
      GetDashboardStatsQuery,
      GetDashboardStatsQueryVariables
    >(GetDashboardStatsDocument, variables),
    ...options,
  });
};

useGetDashboardStatsQuery.getKey = (
  variables?: GetDashboardStatsQueryVariables
) =>
  variables === undefined
    ? ['GetDashboardStats']
    : ['GetDashboardStats', variables];

useGetDashboardStatsQuery.fetcher = (
  variables?: GetDashboardStatsQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<
    GetDashboardStatsQuery,
    GetDashboardStatsQueryVariables
  >(GetDashboardStatsDocument, variables, options);

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

export const GetOrganizationsDocument = `
    query GetOrganizations($limit: Int, $offset: Int) {
  organizations(limit: $limit, offset: $offset) {
    id
    name
    slug
    description
    ownerId
    memberCount
    spaceCount
    threadCount
    createdAt
    updatedAt
  }
}
    `;

export const useGetOrganizationsQuery = <
  TData = GetOrganizationsQuery,
  TError = Error,
>(
  variables?: GetOrganizationsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetOrganizationsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetOrganizationsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetOrganizationsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetOrganizations']
        : ['GetOrganizations', variables],
    queryFn: graphqlRequestFetcher<
      GetOrganizationsQuery,
      GetOrganizationsQueryVariables
    >(GetOrganizationsDocument, variables),
    ...options,
  });
};

useGetOrganizationsQuery.getKey = (
  variables?: GetOrganizationsQueryVariables
) =>
  variables === undefined
    ? ['GetOrganizations']
    : ['GetOrganizations', variables];

useGetOrganizationsQuery.fetcher = (
  variables?: GetOrganizationsQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetOrganizationsQuery, GetOrganizationsQueryVariables>(
    GetOrganizationsDocument,
    variables,
    options
  );

export const GetOrganizationDocument = `
    query GetOrganization($id: ID!) {
  organization(id: $id) {
    id
    name
    slug
    description
    ownerId
    memberCount
    spaceCount
    threadCount
    createdAt
    updatedAt
  }
}
    `;

export const useGetOrganizationQuery = <
  TData = GetOrganizationQuery,
  TError = Error,
>(
  variables: GetOrganizationQueryVariables,
  options?: Omit<
    UseQueryOptions<GetOrganizationQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetOrganizationQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetOrganizationQuery, TError, TData>({
    queryKey: ['GetOrganization', variables],
    queryFn: graphqlRequestFetcher<
      GetOrganizationQuery,
      GetOrganizationQueryVariables
    >(GetOrganizationDocument, variables),
    ...options,
  });
};

useGetOrganizationQuery.getKey = (variables: GetOrganizationQueryVariables) => [
  'GetOrganization',
  variables,
];

useGetOrganizationQuery.fetcher = (
  variables: GetOrganizationQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetOrganizationQuery, GetOrganizationQueryVariables>(
    GetOrganizationDocument,
    variables,
    options
  );

export const GetOrganizationMembersDocument = `
    query GetOrganizationMembers($organizationId: ID!, $limit: Int, $offset: Int) {
  organizationMembers(
    organizationId: $organizationId
    limit: $limit
    offset: $offset
  ) {
    id
    organizationId
    userId
    role
    createdAt
    user {
      id
      email
      fullName
      avatarUrl
    }
  }
}
    `;

export const useGetOrganizationMembersQuery = <
  TData = GetOrganizationMembersQuery,
  TError = Error,
>(
  variables: GetOrganizationMembersQueryVariables,
  options?: Omit<
    UseQueryOptions<GetOrganizationMembersQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetOrganizationMembersQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetOrganizationMembersQuery, TError, TData>({
    queryKey: ['GetOrganizationMembers', variables],
    queryFn: graphqlRequestFetcher<
      GetOrganizationMembersQuery,
      GetOrganizationMembersQueryVariables
    >(GetOrganizationMembersDocument, variables),
    ...options,
  });
};

useGetOrganizationMembersQuery.getKey = (
  variables: GetOrganizationMembersQueryVariables
) => ['GetOrganizationMembers', variables];

useGetOrganizationMembersQuery.fetcher = (
  variables: GetOrganizationMembersQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<
    GetOrganizationMembersQuery,
    GetOrganizationMembersQueryVariables
  >(GetOrganizationMembersDocument, variables, options);

export const GetThreadsDocument = `
    query GetThreads($spaceId: ID, $organizationId: ID, $limit: Int, $offset: Int) {
  threads(
    spaceId: $spaceId
    organizationId: $organizationId
    limit: $limit
    offset: $offset
  ) {
    id
    organizationId
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

export const useGetThreadsQuery = <TData = GetThreadsQuery, TError = Error>(
  variables?: GetThreadsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetThreadsQuery, TError, TData>,
    'queryKey'
  > & { queryKey?: UseQueryOptions<GetThreadsQuery, TError, TData>['queryKey'] }
) => {
  return useQuery<GetThreadsQuery, TError, TData>({
    queryKey:
      variables === undefined ? ['GetThreads'] : ['GetThreads', variables],
    queryFn: graphqlRequestFetcher<GetThreadsQuery, GetThreadsQueryVariables>(
      GetThreadsDocument,
      variables
    ),
    ...options,
  });
};

useGetThreadsQuery.getKey = (variables?: GetThreadsQueryVariables) =>
  variables === undefined ? ['GetThreads'] : ['GetThreads', variables];

useGetThreadsQuery.fetcher = (
  variables?: GetThreadsQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetThreadsQuery, GetThreadsQueryVariables>(
    GetThreadsDocument,
    variables,
    options
  );

export const GetThreadDocument = `
    query GetThread($id: ID!) {
  thread(id: $id) {
    id
    organizationId
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

export const useGetThreadQuery = <TData = GetThreadQuery, TError = Error>(
  variables: GetThreadQueryVariables,
  options?: Omit<UseQueryOptions<GetThreadQuery, TError, TData>, 'queryKey'> & {
    queryKey?: UseQueryOptions<GetThreadQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetThreadQuery, TError, TData>({
    queryKey: ['GetThread', variables],
    queryFn: graphqlRequestFetcher<GetThreadQuery, GetThreadQueryVariables>(
      GetThreadDocument,
      variables
    ),
    ...options,
  });
};

useGetThreadQuery.getKey = (variables: GetThreadQueryVariables) => [
  'GetThread',
  variables,
];

useGetThreadQuery.fetcher = (
  variables: GetThreadQueryVariables,
  options?: RequestInit['headers']
) =>
  graphqlRequestFetcher<GetThreadQuery, GetThreadQueryVariables>(
    GetThreadDocument,
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
