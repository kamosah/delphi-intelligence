'use client';

import { useState } from 'react';

type PreviewTab = 'threads' | 'documents' | 'spaces';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: 'Spaces',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    label: 'Threads',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
  },
  {
    label: 'Documents',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
];

function AppSidebar({ activeNav }: { activeNav: string }) {
  return (
    <div className="w-48 bg-gray-900 flex-shrink-0 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">O</span>
          </div>
          <span className="text-white text-sm font-semibold">Olympus</span>
        </div>
      </div>

      {/* Org picker */}
      <div className="px-3 py-2 border-b border-gray-800">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-800 cursor-pointer">
          <div className="w-4 h-4 rounded bg-indigo-500 flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">R</span>
          </div>
          <span className="text-gray-300 text-xs truncate">Research Team</span>
          <svg
            className="w-3 h-3 text-gray-500 ml-auto flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === activeNav;
          return (
            <div
              key={item.label}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[9px] font-semibold">KA</span>
          </div>
          <div className="min-w-0">
            <p className="text-gray-300 text-[10px] font-medium truncate">
              K. Amosah
            </p>
            <p className="text-gray-500 text-[9px] truncate">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadsPreview() {
  return (
    <div className="flex h-full">
      <AppSidebar activeNav="Threads" />

      {/* Threads list */}
      <div className="w-44 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">Threads</span>
          <button className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden py-1">
          {[
            { title: 'Q3 Earnings Summary', time: '2m ago', active: true },
            { title: 'Legal risk analysis', time: '1h ago', active: false },
            { title: 'Market trends Q4', time: 'Yesterday', active: false },
            { title: 'Competitor research', time: '2d ago', active: false },
          ].map((t) => (
            <div
              key={t.title}
              className={`px-3 py-2 cursor-pointer ${t.active ? 'bg-blue-50 border-r-2 border-blue-600' : 'hover:bg-gray-100'}`}
            >
              <p
                className={`text-[10px] font-medium truncate ${t.active ? 'text-blue-700' : 'text-gray-700'}`}
              >
                {t.title}
              </p>
              <p className="text-[9px] text-gray-400 mt-0.5">{t.time}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-800">
            Q3 Earnings Summary
          </span>
          <span className="ml-auto text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            Research Space
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden px-4 py-3 space-y-3">
          {/* User message */}
          <div className="flex justify-end">
            <div className="max-w-[70%] bg-blue-600 text-white rounded-xl rounded-br-sm px-3 py-2">
              <p className="text-[10px] leading-relaxed">
                Summarize the key findings from the Q3 earnings reports across
                our document collection.
              </p>
            </div>
          </div>

          {/* AI response */}
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-[8px] font-bold">A</span>
            </div>
            <div className="max-w-[80%] bg-gray-50 border border-gray-200 rounded-xl rounded-tl-sm px-3 py-2.5">
              <p className="text-[10px] text-gray-800 leading-relaxed mb-2">
                Based on the Q3 reports, here are the key findings:
              </p>
              <ul className="space-y-1 mb-2">
                <li className="text-[10px] text-gray-700 flex gap-1.5">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>
                  <span>
                    Revenue grew <strong>18% YoY</strong> to $4.2B, beating
                    estimates by 3.1%
                  </span>
                </li>
                <li className="text-[10px] text-gray-700 flex gap-1.5">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>
                  <span>
                    Operating margin expanded to <strong>24.3%</strong> from
                    21.1% in Q3 prior year
                  </span>
                </li>
                <li className="text-[10px] text-gray-700 flex gap-1.5">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>
                  <span>
                    Customer acquisition cost decreased <strong>12%</strong>{' '}
                    while LTV increased 9%
                  </span>
                </li>
              </ul>
              {/* Source citations */}
              <div className="flex flex-wrap gap-1 pt-1.5 border-t border-gray-200">
                <span className="text-[8px] text-gray-400 self-center mr-0.5">
                  Sources:
                </span>
                {[
                  'Q3-Earnings-2024.pdf',
                  'Annual-Report.pdf',
                  'CFO-Commentary.docx',
                ].map((src, i) => (
                  <span
                    key={src}
                    className="text-[8px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium cursor-pointer hover:bg-blue-100"
                  >
                    [{i + 1}] {src.split('.')[0].replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="px-4 py-2.5 border-t border-gray-200">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5">
            <span className="text-[10px] text-gray-400 flex-1">
              Ask Athena anything about your documents…
            </span>
            <button className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentsPreview() {
  const docs = [
    {
      name: 'Q3-Earnings-2024.pdf',
      date: 'Mar 18, 2026',
      status: 'Ready',
      size: '2.4 MB',
      pages: 48,
    },
    {
      name: 'Annual-Report-2025.pdf',
      date: 'Mar 15, 2026',
      status: 'Ready',
      size: '8.1 MB',
      pages: 132,
    },
    {
      name: 'CFO-Commentary-Q3.docx',
      date: 'Mar 14, 2026',
      status: 'Ready',
      size: '0.9 MB',
      pages: 12,
    },
    {
      name: 'Market-Analysis-Q4.pdf',
      date: 'Mar 12, 2026',
      status: 'Processing',
      size: '5.2 MB',
      pages: '—',
    },
    {
      name: 'Competitor-Landscape.pdf',
      date: 'Mar 10, 2026',
      status: 'Ready',
      size: '3.7 MB',
      pages: 64,
    },
  ];

  return (
    <div className="flex h-full">
      <AppSidebar activeNav="Documents" />
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Toolbar */}
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <div>
            <h2 className="text-xs font-semibold text-gray-900">Documents</h2>
            <p className="text-[9px] text-gray-400">
              5 documents · Research Space
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded px-2 py-1">
              <svg
                className="w-3 h-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="text-[10px] text-gray-400">
                Search documents…
              </span>
            </div>
            <button className="flex items-center gap-1 bg-blue-600 text-white text-[10px] font-medium px-2 py-1 rounded">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Upload
            </button>
          </div>
        </div>

        {/* Table header */}
        <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-2">
          <span className="col-span-5 text-[9px] font-semibold text-gray-500 uppercase tracking-wide">
            Name
          </span>
          <span className="col-span-3 text-[9px] font-semibold text-gray-500 uppercase tracking-wide">
            Uploaded
          </span>
          <span className="col-span-2 text-[9px] font-semibold text-gray-500 uppercase tracking-wide">
            Status
          </span>
          <span className="col-span-1 text-[9px] font-semibold text-gray-500 uppercase tracking-wide">
            Pages
          </span>
          <span className="col-span-1 text-[9px] font-semibold text-gray-500 uppercase tracking-wide">
            Size
          </span>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-hidden divide-y divide-gray-100">
          {docs.map((doc) => (
            <div
              key={doc.name}
              className="px-4 py-2 grid grid-cols-12 gap-2 items-center hover:bg-gray-50 cursor-pointer group"
            >
              <div className="col-span-5 flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-3 h-3 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-[10px] text-gray-800 font-medium truncate">
                  {doc.name}
                </span>
              </div>
              <span className="col-span-3 text-[10px] text-gray-500">
                {doc.date}
              </span>
              <div className="col-span-2">
                <span
                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                    doc.status === 'Ready'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}
                >
                  {doc.status === 'Processing' && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1 animate-pulse" />
                  )}
                  {doc.status}
                </span>
              </div>
              <span className="col-span-1 text-[10px] text-gray-500">
                {doc.pages}
              </span>
              <span className="col-span-1 text-[10px] text-gray-500">
                {doc.size}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpacesPreview() {
  const spaces = [
    {
      name: 'Research',
      description: 'Academic papers & market research',
      members: 8,
      threads: 24,
      docs: 47,
      color: 'bg-blue-500',
      initial: 'R',
    },
    {
      name: 'Legal',
      description: 'Contracts, compliance & regulatory',
      members: 5,
      threads: 12,
      docs: 83,
      color: 'bg-purple-500',
      initial: 'L',
    },
    {
      name: 'Finance',
      description: 'Earnings, reports & forecasts',
      members: 6,
      threads: 31,
      docs: 129,
      color: 'bg-emerald-500',
      initial: 'F',
    },
    {
      name: 'Engineering',
      description: 'Technical docs & RFCs',
      members: 12,
      threads: 18,
      docs: 56,
      color: 'bg-orange-500',
      initial: 'E',
    },
  ];

  return (
    <div className="flex h-full">
      <AppSidebar activeNav="Spaces" />
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <div>
            <h2 className="text-xs font-semibold text-gray-900">Spaces</h2>
            <p className="text-[9px] text-gray-400">4 active workspaces</p>
          </div>
          <button className="ml-auto flex items-center gap-1 bg-blue-600 text-white text-[10px] font-medium px-2 py-1 rounded">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Space
          </button>
        </div>

        {/* Cards */}
        <div className="flex-1 p-4 grid grid-cols-2 gap-3 content-start overflow-hidden">
          {spaces.map((space) => (
            <div
              key={space.name}
              className="border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group bg-white"
            >
              <div className="flex items-start gap-2.5 mb-2.5">
                <div
                  className={`w-8 h-8 rounded-lg ${space.color} flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-white text-xs font-bold">
                    {space.initial}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900">
                    {space.name}
                  </p>
                  <p className="text-[9px] text-gray-400 truncate">
                    {space.description}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-900">
                    {space.members}
                  </p>
                  <p className="text-[8px] text-gray-400">Members</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-900">
                    {space.threads}
                  </p>
                  <p className="text-[8px] text-gray-400">Threads</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-900">
                    {space.docs}
                  </p>
                  <p className="text-[8px] text-gray-400">Docs</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TABS: { id: PreviewTab; label: string }[] = [
  { id: 'threads', label: 'Threads' },
  { id: 'documents', label: 'Documents' },
  { id: 'spaces', label: 'Spaces' },
];

/**
 * Interactive product preview for the landing page hero section.
 * Renders inline UI mockups of the three core Olympus views:
 * Threads (AI chat), Documents (library), and Spaces (workspaces).
 *
 * Uses the Hex design aesthetic: dark sidebar, clean white content area,
 * blue primary accents. No screenshot images — fully rendered in HTML/CSS.
 */
export function ProductPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('threads');

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl bg-white border border-gray-200/80 ring-1 ring-black/5">
      {/* Browser chrome */}
      <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-3">
        {/* Window controls */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>

        {/* URL bar */}
        <div className="flex-1 bg-white border border-gray-200 rounded px-3 py-0.5 flex items-center gap-1.5">
          <svg
            className="w-3 h-3 text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span className="text-[10px] text-gray-500">
            olympus-web-pi.vercel.app
          </span>
        </div>

        {/* Feature tabs */}
        <div className="flex items-center gap-0.5 bg-gray-200 rounded-md p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* App content */}
      <div className="h-[380px] overflow-hidden">
        {activeTab === 'threads' && <ThreadsPreview />}
        {activeTab === 'documents' && <DocumentsPreview />}
        {activeTab === 'spaces' && <SpacesPreview />}
      </div>
    </div>
  );
}
