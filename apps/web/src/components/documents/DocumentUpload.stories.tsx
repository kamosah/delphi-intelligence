import type { Meta, StoryObj } from '@storybook/nextjs';
import { expect, within } from '@storybook/test';
import { DocumentUpload } from './DocumentUpload';
import { withAuth } from '@/lib/storybook/decorators';

const meta = {
  title: 'Documents/DocumentUpload',
  component: DocumentUpload,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    withAuth,
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocumentUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default document upload component with standard settings.
 */
export const Default: Story = {
  args: {
    spaceId: 'space-123',
    onUploadComplete: (documentId: string) => {
      console.log('Upload complete:', documentId);
    },
  },
};

/**
 * Upload component with restricted file types (PDFs only).
 */
export const PDFOnly: Story = {
  args: {
    spaceId: 'space-123',
    acceptedFileTypes: ['.pdf'],
    onUploadComplete: (documentId: string) =>
      console.log('Uploaded:', documentId),
  },
};

/**
 * Upload component with custom file limits.
 */
export const CustomLimits: Story = {
  args: {
    spaceId: 'space-123',
    maxFiles: 5,
    maxSizeMB: 25,
    onUploadComplete: (documentId: string) =>
      console.log('Uploaded:', documentId),
  },
};

/**
 * Upload component accepting many file types.
 */
export const ManyFileTypes: Story = {
  args: {
    spaceId: 'space-123',
    acceptedFileTypes: [
      '.pdf',
      '.doc',
      '.docx',
      '.txt',
      '.csv',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.jpg',
      '.png',
      '.gif',
    ],
    onUploadComplete: (documentId: string) =>
      console.log('Uploaded:', documentId),
  },
};

/**
 * Upload component for small files only.
 */
export const SmallFilesOnly: Story = {
  args: {
    spaceId: 'space-123',
    maxSizeMB: 5,
    acceptedFileTypes: ['.txt', '.csv', '.json'],
    onUploadComplete: (documentId: string) =>
      console.log('Uploaded:', documentId),
  },
};

/**
 * Upload component with single file limit.
 */
export const SingleFile: Story = {
  args: {
    spaceId: 'space-123',
    maxFiles: 1,
    onUploadComplete: (documentId: string) =>
      console.log('Uploaded:', documentId),
  },
};

/**
 * Upload component for batch processing.
 */
export const BatchUpload: Story = {
  args: {
    spaceId: 'space-123',
    maxFiles: 50,
    maxSizeMB: 100,
    onUploadComplete: (documentId: string) =>
      console.log('Uploaded:', documentId),
  },
};

/**
 * Story demonstrating the full workflow:
 * 1. User sees drop zone with "Drop files here or click to browse" message
 * 2. File input accepts multiple files with specified file types
 * 3. Files are validated for size and type
 * 4. Valid files begin uploading automatically
 * 5. Progress bars show upload progress
 * 6. Success/error states are displayed
 * 7. Summary statistics update in real-time
 *
 * **Authentication**: This component requires authentication (access token from Zustand store)
 * **Actions**: Try dragging files or clicking the drop zone to select files
 */
export const FullWorkflowDemo: Story = {
  args: {
    spaceId: 'space-123',
    maxFiles: 10,
    maxSizeMB: 50,
    acceptedFileTypes: ['.pdf', '.doc', '.docx', '.txt', '.csv'],
    onUploadComplete: (documentId: string) => {
      console.log('Document uploaded successfully:', documentId);
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'This story shows the complete upload workflow. Authentication is handled via the `withAuth` decorator which sets mock credentials in the Zustand auth store.',
      },
    },
  },
};

/**
 * Interactive test: Verifies the upload interface renders correctly.
 */
export const InterfaceTest: Story = {
  args: {
    spaceId: 'space-123',
    onUploadComplete: (documentId: string) =>
      console.log('Uploaded:', documentId),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify card title is present
    const title = canvas.getByText('Upload Documents');
    await expect(title).toBeInTheDocument();

    // Verify description is present
    const description = canvas.getByText(
      /Drag and drop files or click to browse/
    );
    await expect(description).toBeInTheDocument();

    // Verify drop zone instructions
    const dropZoneText = canvas.getByText('Drop files here or click to browse');
    await expect(dropZoneText).toBeInTheDocument();

    // Verify supported formats are displayed
    const formatsText = canvas.getByText(/Supported formats:/);
    await expect(formatsText).toBeInTheDocument();
  },
};
