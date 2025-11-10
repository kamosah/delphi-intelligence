import type { Meta, StoryObj } from '@storybook/nextjs';
import { http, HttpResponse, delay } from 'msw';
import { OrganizationSwitcher } from './OrganizationSwitcher';

// Mock organizations data
const mockOrganizations = [
  {
    id: '1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    description: 'Building the future of AI',
    ownerId: 'user-1',
    memberCount: 12,
    spaceCount: 8,
    threadCount: 45,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    name: 'Tech Innovators',
    slug: 'tech-innovators',
    description: 'Innovation at scale',
    ownerId: 'user-1',
    memberCount: 25,
    spaceCount: 15,
    threadCount: 120,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  {
    id: '3',
    name: 'Startup Labs',
    slug: 'startup-labs',
    description: null,
    ownerId: 'user-2',
    memberCount: 5,
    spaceCount: 3,
    threadCount: 18,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-10T00:00:00Z',
  },
];

const meta = {
  title: 'Layout/OrganizationSwitcher',
  component: OrganizationSwitcher,
  parameters: {
    layout: 'centered',
    msw: {
      handlers: [
        http.post('/graphql', async ({ request }) => {
          const body = (await request.json()) as { query: string };

          // Mock GetOrganizations query
          if (body.query?.includes('GetOrganizations')) {
            return HttpResponse.json({
              data: {
                organizations: mockOrganizations,
              },
            });
          }

          // Mock CreateOrganization mutation
          if (body.query?.includes('CreateOrganization')) {
            const newOrg = {
              id: '4',
              name: 'New Organization',
              slug: 'new-organization',
              description: 'A newly created organization',
              ownerId: 'user-1',
              memberCount: 1,
              spaceCount: 0,
              threadCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            return HttpResponse.json({
              data: {
                createOrganization: newOrg,
              },
            });
          }

          return HttpResponse.json({ data: {} });
        }),
      ],
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrganizationSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default organization switcher with multiple organizations
 *
 * Design Features:
 * - Hex-style dropdown with clean border and hover states
 * - Current organization shown with Building2 icon
 * - ChevronDown icon indicates dropdown
 * - Shows member count and space count for each org
 * - Selected org highlighted with blue background
 * - Check icon next to current selection
 */
export const Default: Story = {};

/**
 * Loading state while organizations are being fetched
 */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('/graphql', async () => {
          await delay('infinite');
          return HttpResponse.json({ data: { organizations: [] } });
        }),
      ],
    },
  },
};

/**
 * Empty state when user has no organizations
 */
export const EmptyState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('/graphql', () => {
          return HttpResponse.json({
            data: {
              organizations: [],
            },
          });
        }),
      ],
    },
  },
};

/**
 * Single organization - no switching needed but can still create new orgs
 */
export const SingleOrganization: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('/graphql', () => {
          return HttpResponse.json({
            data: {
              organizations: [mockOrganizations[0]],
            },
          });
        }),
      ],
    },
  },
};

/**
 * Many organizations to test overflow behavior
 */
export const ManyOrganizations: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('/graphql', () => {
          const manyOrgs = Array.from({ length: 10 }, (_, i) => ({
            id: `${i + 1}`,
            name: `Organization ${i + 1}`,
            slug: `org-${i + 1}`,
            description: i % 2 === 0 ? `Description for org ${i + 1}` : null,
            ownerId: 'user-1',
            memberCount: Math.floor(Math.random() * 50) + 1,
            spaceCount: Math.floor(Math.random() * 20),
            threadCount: Math.floor(Math.random() * 100),
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z',
          }));

          return HttpResponse.json({
            data: {
              organizations: manyOrgs,
            },
          });
        }),
      ],
    },
  },
};
