import type { Meta, StoryObj } from '@storybook/react';
import { List, ListItem } from './list';

const meta = {
  title: 'Components/List',
  component: List,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicList: Story = {
  render: () => (
    <List>
      <ListItem>First item</ListItem>
      <ListItem>Second item</ListItem>
      <ListItem>Third item</ListItem>
    </List>
  ),
};

export const WithCustomStyling: Story = {
  render: () => (
    <List>
      <ListItem className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <div>
          <p className="font-medium">Item with custom styling</p>
          <p className="text-sm text-gray-500">Subtitle text</p>
        </div>
      </ListItem>
      <ListItem className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <div>
          <p className="font-medium">Another item</p>
          <p className="text-sm text-gray-500">More subtitle text</p>
        </div>
      </ListItem>
    </List>
  ),
};

export const InteractiveList: Story = {
  render: () => (
    <List>
      <ListItem>
        <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-medium">Clickable item 1</span>
            <span className="text-sm text-gray-500">→</span>
          </div>
        </button>
      </ListItem>
      <ListItem>
        <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-medium">Clickable item 2</span>
            <span className="text-sm text-gray-500">→</span>
          </div>
        </button>
      </ListItem>
      <ListItem>
        <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-medium">Clickable item 3</span>
            <span className="text-sm text-gray-500">→</span>
          </div>
        </button>
      </ListItem>
    </List>
  ),
};

export const WithLinks: Story = {
  render: () => (
    <List>
      <ListItem>
        <a
          href="#"
          className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <p className="font-medium text-blue-600">Link to somewhere</p>
          <p className="text-sm text-gray-500 mt-1">Click to navigate</p>
        </a>
      </ListItem>
      <ListItem>
        <a
          href="#"
          className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <p className="font-medium text-blue-600">Another link</p>
          <p className="text-sm text-gray-500 mt-1">Click to navigate</p>
        </a>
      </ListItem>
    </List>
  ),
};

export const CompactList: Story = {
  render: () => (
    <List className="space-y-1">
      <ListItem className="px-2 py-1 text-sm hover:bg-gray-50 rounded">
        Compact item 1
      </ListItem>
      <ListItem className="px-2 py-1 text-sm hover:bg-gray-50 rounded">
        Compact item 2
      </ListItem>
      <ListItem className="px-2 py-1 text-sm hover:bg-gray-50 rounded">
        Compact item 3
      </ListItem>
    </List>
  ),
};
