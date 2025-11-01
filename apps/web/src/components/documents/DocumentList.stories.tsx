import type { Document } from '@/lib/api/generated';
import { withAuth } from '@/lib/storybook/decorators';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { DocumentList } from './DocumentList';

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
    fileType: 'pdf',
    filePath: '/uploads/Q3_Financial_Report.pdf',
    sizeBytes: 2457600,
    spaceId: 'space-1',
    uploadedBy: 'user-1',
    status: 'processed',
    extractedText: null,
    docMetadata: null,
    processedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    processingError: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    name: 'Product_Roadmap_2024.docx',
    fileType: 'docx',
    filePath: '/uploads/Product_Roadmap_2024.docx',
    sizeBytes: 1048576,
    spaceId: 'space-1',
    uploadedBy: 'user-1',
    status: 'uploaded',
    extractedText: null,
    docMetadata: null,
    processedAt: null,
    processingError: null,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    name: 'customer_data.csv',
    fileType: 'csv',
    filePath: '/uploads/customer_data.csv',
    sizeBytes: 524288,
    spaceId: 'space-1',
    uploadedBy: 'user-1',
    status: 'processing',
    extractedText: null,
    docMetadata: null,
    processedAt: null,
    processingError: null,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    name: 'corrupted_file.xlsx',
    fileType: 'xlsx',
    filePath: '/uploads/corrupted_file.xlsx',
    sizeBytes: 2097152,
    spaceId: 'space-1',
    uploadedBy: 'user-1',
    status: 'failed',
    extractedText: null,
    docMetadata: null,
    processedAt: null,
    processingError: 'File appears to be corrupted or invalid format',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
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
        processingError: 'File size exceeds maximum limit',
      },
      {
        ...mockDocuments[1],
        status: 'failed',
        processingError: 'Unsupported file format detected',
      },
      {
        ...mockDocuments[2],
        status: 'failed',
        processingError: 'Network error during processing',
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
      fileType: 'pdf',
      filePath: `/uploads/Document_${i + 1}.pdf`,
      sizeBytes: Math.floor(Math.random() * 5000000) + 100000,
      spaceId: 'space-1',
      uploadedBy: 'user-1',
      status: ['uploaded', 'processing', 'processed', 'failed'][
        Math.floor(Math.random() * 4)
      ] as Document['status'],
      extractedText: null,
      docMetadata: null,
      processedAt: null,
      processingError: null,
      createdAt: new Date(
        Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
      ).toISOString(),
      updatedAt: new Date(
        Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
      ).toISOString(),
    })),
    spaceId: 'space-1',
    isLoading: false,
  },
};
