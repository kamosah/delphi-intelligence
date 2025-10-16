import type { Meta, StoryObj } from '@storybook/nextjs';
import { expect, fn, within } from '@storybook/test';
import { DocumentUploadFileList } from './DocumentUploadFileList';
import type { FileUploadState } from './DocumentUploadFileItem';

const meta = {
  title: 'Documents/DocumentUploadFileList',
  component: DocumentUploadFileList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onRetry: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof DocumentUploadFileList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create mock files
const createMockFile = (name: string, sizeMB: number): File => {
  return new File([''], name, { type: 'application/pdf' });
};

const createFileState = (
  name: string,
  sizeMB: number,
  overrides: Partial<FileUploadState> = {}
): FileUploadState => ({
  file: createMockFile(name, sizeMB),
  id: `${name}-${Date.now()}`,
  status: 'pending',
  progress: 0,
  ...overrides,
});

/**
 * Empty file list (should render nothing).
 */
export const Empty: Story = {
  args: {
    files: [],
  },
};

/**
 * Single file uploading with 50% progress.
 */
export const SingleFileUploading: Story = {
  args: {
    files: [
      createFileState('document.pdf', 2.5, {
        status: 'uploading',
        progress: 50,
      }),
    ],
  },
};

/**
 * Single file successfully uploaded.
 */
export const SingleFileSuccess: Story = {
  args: {
    files: [
      createFileState('document.pdf', 2.5, {
        status: 'success',
        progress: 100,
      }),
    ],
  },
};

/**
 * Multiple files in various states.
 */
export const MixedStates: Story = {
  args: {
    files: [
      createFileState('presentation.pptx', 15.3, {
        status: 'success',
        progress: 100,
      }),
      createFileState('report.pdf', 5.2, { status: 'uploading', progress: 75 }),
      createFileState('data.csv', 1.8, { status: 'uploading', progress: 30 }),
      createFileState('notes.txt', 0.1, { status: 'pending', progress: 0 }),
    ],
  },
};

/**
 * All files successfully uploaded.
 */
export const AllSuccess: Story = {
  args: {
    files: [
      createFileState('document1.pdf', 2.5, {
        status: 'success',
        progress: 100,
      }),
      createFileState('document2.pdf', 3.1, {
        status: 'success',
        progress: 100,
      }),
      createFileState('document3.docx', 1.2, {
        status: 'success',
        progress: 100,
      }),
      createFileState('document4.xlsx', 0.8, {
        status: 'success',
        progress: 100,
      }),
    ],
  },
};

/**
 * Some files failed to upload.
 */
export const WithErrors: Story = {
  args: {
    files: [
      createFileState('document1.pdf', 2.5, {
        status: 'success',
        progress: 100,
      }),
      createFileState('document2.pdf', 3.1, {
        status: 'error',
        error: 'File size exceeds limit',
      }),
      createFileState('document3.docx', 1.2, {
        status: 'uploading',
        progress: 60,
      }),
      createFileState('document4.xlsx', 0.8, {
        status: 'error',
        error: 'Network connection lost',
      }),
    ],
  },
};

/**
 * Large batch of files being uploaded.
 */
export const LargeBatch: Story = {
  args: {
    files: [
      createFileState('file1.pdf', 2.5, { status: 'success', progress: 100 }),
      createFileState('file2.pdf', 3.1, { status: 'success', progress: 100 }),
      createFileState('file3.docx', 1.2, { status: 'success', progress: 100 }),
      createFileState('file4.xlsx', 0.8, { status: 'uploading', progress: 90 }),
      createFileState('file5.pptx', 12.5, {
        status: 'uploading',
        progress: 45,
      }),
      createFileState('file6.csv', 0.3, { status: 'uploading', progress: 20 }),
      createFileState('file7.txt', 0.05, { status: 'pending', progress: 0 }),
      createFileState('file8.pdf', 5.0, { status: 'pending', progress: 0 }),
    ],
  },
};

/**
 * All files failed to upload.
 */
export const AllFailed: Story = {
  args: {
    files: [
      createFileState('document1.pdf', 2.5, {
        status: 'error',
        error: 'Authentication failed',
      }),
      createFileState('document2.pdf', 3.1, {
        status: 'error',
        error: 'File type not supported',
      }),
      createFileState('document3.docx', 1.2, {
        status: 'error',
        error: 'Upload timeout',
      }),
    ],
  },
};

/**
 * Interactive test: Verifies summary statistics are correct.
 */
export const SummaryStatisticsTest: Story = {
  args: {
    files: [
      createFileState('doc1.pdf', 2.5, { status: 'success', progress: 100 }),
      createFileState('doc2.pdf', 3.1, { status: 'success', progress: 100 }),
      createFileState('doc3.pdf', 1.2, { status: 'uploading', progress: 50 }),
      createFileState('doc4.pdf', 0.8, {
        status: 'error',
        error: 'Upload failed',
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify success count in summary
    const successText = canvas.getByText(/2 of 4 uploaded/);
    await expect(successText).toBeInTheDocument();

    // Verify error count in summary
    const errorText = canvas.getByText(/1 failed/);
    await expect(errorText).toBeInTheDocument();
  },
};

/**
 * Interactive test: Empty list renders nothing.
 */
export const EmptyListTest: Story = {
  args: {
    files: [],
  },
  play: async ({ canvasElement }) => {
    // The component should return null for empty files
    // So the canvas element should be empty or minimal
    const canvas = within(canvasElement);

    // Try to find the summary text that only appears when there are files
    const summaryText = canvas.queryByText(/uploaded/);
    await expect(summaryText).not.toBeInTheDocument();
  },
};

/**
 * Interactive test: All files render in the list.
 */
export const AllFilesRenderedTest: Story = {
  args: {
    files: [
      createFileState('file1.pdf', 1.0, { status: 'success', progress: 100 }),
      createFileState('file2.pdf', 2.0, { status: 'uploading', progress: 50 }),
      createFileState('file3.pdf', 3.0, { status: 'pending', progress: 0 }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify all 3 files are rendered by name
    const file1 = canvas.getByText('file1.pdf');
    const file2 = canvas.getByText('file2.pdf');
    const file3 = canvas.getByText('file3.pdf');

    await expect(file1).toBeInTheDocument();
    await expect(file2).toBeInTheDocument();
    await expect(file3).toBeInTheDocument();

    // Verify summary shows 1 of 3 uploaded (only file1 is success)
    const summary = canvas.getByText(/1 of 3 uploaded/);
    await expect(summary).toBeInTheDocument();
  },
};

/**
 * Interactive test: Error summary displays when files fail.
 */
export const ErrorSummaryTest: Story = {
  args: {
    files: [
      createFileState('doc1.pdf', 2.5, { status: 'success', progress: 100 }),
      createFileState('doc2.pdf', 3.1, {
        status: 'error',
        error: 'Network error',
      }),
      createFileState('doc3.pdf', 1.2, {
        status: 'error',
        error: 'File too large',
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify both error messages are shown
    const networkError = canvas.getByText(/Network error/);
    const sizeError = canvas.getByText(/File too large/);

    await expect(networkError).toBeInTheDocument();
    await expect(sizeError).toBeInTheDocument();

    // Verify error count in summary
    const errorSummary = canvas.getByText(/2 failed/);
    await expect(errorSummary).toBeInTheDocument();
  },
};
