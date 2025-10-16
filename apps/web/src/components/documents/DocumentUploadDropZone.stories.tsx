import type { Meta, StoryObj } from '@storybook/nextjs';
import { DocumentUploadDropZone } from './DocumentUploadDropZone';

const meta = {
  title: 'Documents/DocumentUploadDropZone',
  component: DocumentUploadDropZone,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isDragging: {
      control: 'boolean',
      description: 'Whether files are being dragged over the drop zone',
    },
    isUploading: {
      control: 'boolean',
      description: 'Whether files are currently being uploaded',
    },
  },
} satisfies Meta<typeof DocumentUploadDropZone>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default drop zone state, ready to accept files.
 */
export const Default: Story = {
  args: {
    isDragging: false,
    isUploading: false,
    acceptedFileTypes: ['.pdf', '.doc', '.docx', '.txt'],
    onDragOver: (e) => {
      e.preventDefault();
      console.log('Drag over');
    },
    onDragLeave: (e) => {
      e.preventDefault();
      console.log('Drag leave');
    },
    onDrop: (e) => {
      e.preventDefault();
      console.log('Files dropped:', e.dataTransfer.files);
    },
    onFileInput: (e) => {
      console.log('Files selected:', e.target.files);
    },
  },
};

/**
 * Drop zone when files are being dragged over it.
 */
export const Dragging: Story = {
  args: {
    ...Default.args,
    isDragging: true,
  },
};

/**
 * Drop zone in disabled state during upload.
 */
export const Uploading: Story = {
  args: {
    ...Default.args,
    isUploading: true,
  },
};

/**
 * Drop zone with many accepted file types.
 */
export const ManyFileTypes: Story = {
  args: {
    ...Default.args,
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
    ],
  },
};
