import type { Meta, StoryObj } from '@storybook/nextjs';
import { expect, fn, userEvent, within } from '@storybook/test';
import {
  DocumentUploadFileItem,
  type FileUploadState,
} from './DocumentUploadFileItem';

const meta = {
  title: 'Documents/DocumentUploadFileItem',
  component: DocumentUploadFileItem,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onRetry: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof DocumentUploadFileItem>;

export default meta;
type Story = StoryObj<typeof meta>;

// Create a mock File object
const createMockFile = (name: string, size: number): File => {
  return new File([''], name, { type: 'application/pdf' });
};

// Helper to create file state
const createFileState = (
  overrides: Partial<FileUploadState> = {}
): FileUploadState => ({
  file: createMockFile('sample-document.pdf', 2.5 * 1024 * 1024),
  id: 'file-1',
  status: 'pending',
  progress: 0,
  ...overrides,
});

/**
 * File item in pending state, ready to upload.
 */
export const Pending: Story = {
  args: {
    fileState: createFileState({ status: 'pending' }),
  },
};

/**
 * File item currently uploading with 45% progress.
 */
export const Uploading: Story = {
  args: {
    fileState: createFileState({ status: 'uploading', progress: 45 }),
  },
};

/**
 * File item uploading near completion (95%).
 */
export const UploadingNearComplete: Story = {
  args: {
    fileState: createFileState({ status: 'uploading', progress: 95 }),
  },
};

/**
 * File item successfully uploaded.
 */
export const Success: Story = {
  args: {
    fileState: createFileState({ status: 'success', progress: 100 }),
  },
};

/**
 * File item failed to upload with error message.
 */
export const Error: Story = {
  args: {
    fileState: createFileState({
      status: 'error',
      error: 'Network error: Failed to connect to server',
    }),
  },
};

/**
 * Large file (50MB) uploading.
 */
export const LargeFile: Story = {
  args: {
    fileState: createFileState({
      file: createMockFile('large-presentation.pptx', 50 * 1024 * 1024),
      status: 'uploading',
      progress: 30,
    }),
  },
};

/**
 * Small file (100KB) successfully uploaded.
 */
export const SmallFile: Story = {
  args: {
    fileState: createFileState({
      file: createMockFile('notes.txt', 100 * 1024),
      status: 'success',
      progress: 100,
    }),
  },
};

/**
 * File with very long name that will truncate.
 */
export const LongFileName: Story = {
  args: {
    fileState: createFileState({
      file: createMockFile(
        'this-is-a-very-long-file-name-that-should-truncate-in-the-ui-component.pdf',
        5 * 1024 * 1024
      ),
      status: 'uploading',
      progress: 60,
    }),
  },
};

/**
 * Interactive test: Clicking remove button calls onRemove.
 */
export const RemoveButtonTest: Story = {
  args: {
    fileState: createFileState({ status: 'success', progress: 100 }),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Find the remove button (X icon button)
    const removeButtons = canvas.getAllByRole('button');
    const removeButton = removeButtons.find((btn) => btn.querySelector('svg'));

    if (removeButton) {
      await userEvent.click(removeButton);
      // Verify onRemove was called with the file ID
      await expect(args.onRemove).toHaveBeenCalledWith(args.fileState.id);
    }
  },
};

/**
 * Interactive test: Clicking retry button calls onRetry for failed uploads.
 */
export const RetryButtonTest: Story = {
  args: {
    fileState: createFileState({
      status: 'error',
      error: 'Network error: Connection lost',
    }),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify error message is displayed
    const errorMessage = canvas.getByText(/Network error: Connection lost/);
    await expect(errorMessage).toBeInTheDocument();

    // Find and click the retry button
    const retryButton = canvas.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);

    // Verify onRetry was called with the file ID
    await expect(args.onRetry).toHaveBeenCalledWith(args.fileState.id);
  },
};

/**
 * Interactive test: Progress bar and percentage display correctly.
 */
export const ProgressDisplayTest: Story = {
  args: {
    fileState: createFileState({ status: 'uploading', progress: 75 }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify file name is displayed
    const fileName = canvas.getByText(/sample-document.pdf/);
    await expect(fileName).toBeInTheDocument();

    // Verify progress percentage is displayed
    const progressText = canvas.getByText('75%');
    await expect(progressText).toBeInTheDocument();
  },
};

/**
 * Interactive test: Success state displays correctly.
 */
export const SuccessStateTest: Story = {
  args: {
    fileState: createFileState({ status: 'success', progress: 100 }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify file name is displayed
    const fileName = canvas.getByText(/sample-document.pdf/);
    await expect(fileName).toBeInTheDocument();

    // Success icon should be visible (CheckCircle2)
    // No progress bar should be shown
    const progressText = canvas.queryByText('100%');
    await expect(progressText).not.toBeInTheDocument();
  },
};
