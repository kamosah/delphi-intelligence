'use client';

import { BarChart3, ExternalLink } from 'lucide-react';
import { Card } from '@olympus/ui';

export default function AnalyticsDebugPage() {
  return (
    <div className="w-full min-h-screen overflow-y-auto">
      <div className="container mx-auto max-w-6xl p-8 space-y-6 pb-16">
        <div>
          <h1 className="text-3xl font-bold">Analytics Monitoring</h1>
          <p className="text-gray-600 mt-2">
            User behavior tracking and conversion analytics
          </p>
        </div>

        {/* Analytics Info Card */}
        <Card className="p-6 bg-purple-50 border-purple-200">
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-900">
                Vercel Analytics Active
              </h3>
              <p className="text-sm text-purple-700 mt-1">
                Analytics is collecting user behavior data including page views,
                events, and conversions from all environments.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href="https://vercel.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-700 hover:text-purple-800 underline flex items-center gap-1"
                >
                  Open Vercel Dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-gray-400">→</span>
                <span className="text-sm text-purple-700">
                  Analytics → Overview
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Explainer Card */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics vs SpeedInsights
          </h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold">Vercel Analytics</h3>
              <p className="text-gray-600 mt-1">
                Tracks user behavior: page views, unique visitors, events,
                conversions. Useful for product and marketing insights.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Vercel SpeedInsights</h3>
              <p className="text-gray-600 mt-1">
                Monitors Core Web Vitals: LCP, INP, FCP, CLS, TTFB. Useful for
                performance optimization.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
