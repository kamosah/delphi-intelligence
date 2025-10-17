import type { Meta, StoryObj } from '@storybook/nextjs';
import { withAuth } from '@/lib/storybook/decorators';
import { DocumentList } from './DocumentList';
import type { Document } from '@/lib/api/documents-client';

const meta = {
  title: 'Documents/DocumentList',
  component: DocumentList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    withAuth,
    (Story) => (
      <div className="max-w-4xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocumentList>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Q3_Financial_Report.pdf',
    file_type: 'pdf',
    size_bytes: 2457600,
    space_id: 'space-1',
    uploaded_by: 'user-1',
    status: 'processed',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    name: 'Product_Roadmap_2024.docx',
    file_type: 'docx',
    size_bytes: 1048576,
    space_id: 'space-1',
    uploaded_by: 'user-1',
    status: 'uploaded',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    name: 'customer_data.csv',
    file_type: 'csv',
    size_bytes: 524288,
    space_id: 'space-1',
    uploaded_by: 'user-1',
    status: 'processing',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    name: 'corrupted_file.xlsx',
    file_type: 'xlsx',
    size_bytes: 2097152,
    space_id: 'space-1',
    uploaded_by: 'user-1',
    status: 'failed',
    processing_error: 'File appears to be corrupted or invalid format',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Default document list with multiple documents in various states.
 */
export const Default: Story = {
  args: {
    documents: mockDocuments,
    spaceId: 'space-1',
    isLoading: false,
  },
};

/**
 * Loading state with skeleton placeholders.
 */
export const Loading: Story = {
  args: {
    documents: [],
    spaceId: 'space-1',
    isLoading: true,
  },
};

/**
 * Empty state when no documents have been uploaded.
 */
export const Empty: Story = {
  args: {
    documents: [],
    spaceId: 'space-1',
    isLoading: false,
  },
};

/**
 * Empty state with custom message.
 */
export const EmptyWithCustomMessage: Story = {
  args: {
    documents: [],
    spaceId: 'space-1',
    isLoading: false,
    emptyMessage:
      'This space has no documents yet. Start by uploading some files.',
  },
};

/**
 * Single document in the list.
 */
export const SingleDocument: Story = {
  args: {
    documents: [mockDocuments[0]],
    spaceId: 'space-1',
    isLoading: false,
  },
};

/**
 * All documents in processed state.
 */
export const AllProcessed: Story = {
  args: {
    documents: mockDocuments.map((doc) => ({
      ...doc,
      status: 'processed' as const,
    })),
    spaceId: 'space-1',
    isLoading: false,
  },
};

/**
 * All documents currently processing.
 */
export const AllProcessing: Story = {
  args: {
    documents: mockDocuments.map((doc) => ({
      ...doc,
      status: 'processing' as const,
    })),
    spaceId: 'space-1',
    isLoading: false,
  },
};

/**
 * Multiple failed documents with various error messages.
 */
export const WithErrors: Story = {
  args: {
    documents: [
      {
        ...mockDocuments[0],
        status: 'failed',
        processing_error: 'File size exceeds maximum limit',
      },
      {
        ...mockDocuments[1],
        status: 'failed',
        processing_error: 'Unsupported file format detected',
      },
      {
        ...mockDocuments[2],
        status: 'failed',
        processing_error: 'Network error during processing',
      },
    ],
    spaceId: 'space-1',
    isLoading: false,
  },
};

/**
 * Large list with many documents for testing scroll behavior.
 */
export const LargeList: Story = {
  args: {
    documents: Array.from({ length: 20 }, (_, i) => ({
      id: `doc-${i}`,
      name: `Document_${i + 1}.pdf`,
      file_type: 'pdf',
      size_bytes: Math.floor(Math.random() * 5000000) + 100000,
      space_id: 'space-1',
      uploaded_by: 'user-1',
      status: ['uploaded', 'processing', 'processed', 'failed'][
        Math.floor(Math.random() * 4)
      ] as Document['status'],
      created_at: new Date(
        Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
      ).toISOString(),
      updated_at: new Date(
        Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
      ).toISOString(),
    })),
    spaceId: 'space-1',
    isLoading: false,
  },
};
