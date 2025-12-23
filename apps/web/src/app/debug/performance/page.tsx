'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Zap,
  Clock,
  BarChart3,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { Metric } from 'web-vitals';
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
import { Card, Button } from '@olympus/ui';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  description: string;
  unit: string;
}

interface NavigationMetric {
  name: string;
  value: number;
  unit: string;
}

interface ResourceSummary {
  scripts: number;
  stylesheets: number;
  images: number;
  fonts: number;
  avgLoadTime: number;
  totalSize: number;
}

interface MemoryMetric {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export default function PerformanceDebugPage() {
  const [metricsMap, setMetricsMap] = useState<Map<string, PerformanceMetric>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [navigationMetrics, setNavigationMetrics] = useState<
    NavigationMetric[]
  >([]);
  const [resourceMetrics, setResourceMetrics] =
    useState<ResourceSummary | null>(null);
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetric | null>(null);
  const [fpsMetric, setFpsMetric] = useState<number>(0);

  const handleMetric = (metric: Metric) => {
    const metricConfig: Record<
      string,
      {
        name: string;
        description: string;
        unit: string;
        thresholds: { good: number; poor: number };
      }
    > = {
      CLS: {
        name: 'CLS (Cumulative Layout Shift)',
        description: 'Visual stability - measures unexpected layout shifts',
        unit: 'score',
        thresholds: { good: 0.1, poor: 0.25 },
      },
      FCP: {
        name: 'FCP (First Contentful Paint)',
        description: 'Time until first content is painted',
        unit: 'ms',
        thresholds: { good: 1800, poor: 3000 },
      },
      LCP: {
        name: 'LCP (Largest Contentful Paint)',
        description: 'Time until largest content element is visible',
        unit: 'ms',
        thresholds: { good: 2500, poor: 4000 },
      },
      TTFB: {
        name: 'TTFB (Time to First Byte)',
        description: 'Time until server responds',
        unit: 'ms',
        thresholds: { good: 800, poor: 1800 },
      },
      INP: {
        name: 'INP (Interaction to Next Paint)',
        description: 'Responsiveness - time from interaction to visual update',
        unit: 'ms',
        thresholds: { good: 200, poor: 500 },
      },
    };

    const config = metricConfig[metric.name];
    if (!config) return;

    let rating: 'good' | 'needs-improvement' | 'poor';
    if (metric.value <= config.thresholds.good) {
      rating = 'good';
    } else if (metric.value <= config.thresholds.poor) {
      rating = 'needs-improvement';
    } else {
      rating = 'poor';
    }

    const performanceMetric: PerformanceMetric = {
      name: config.name,
      value:
        config.unit === 'score'
          ? Math.round(metric.value * 1000) / 1000
          : Math.round(metric.value),
      rating,
      description: config.description,
      unit: config.unit,
    };

    setMetricsMap((prev) => new Map(prev).set(metric.name, performanceMetric));
  };

  const refreshMetrics = () => {
    setIsLoading(true);
    setMetricsMap(new Map());

    // Re-register listeners
    onCLS(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric);

    setTimeout(() => setIsLoading(false), 1000);
  };

  useEffect(() => {
    // Register web-vitals listeners
    onCLS(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric);

    // Mark as loaded after a short delay
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Navigation Timing metrics
  useEffect(() => {
    const navigationEntry = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;

    if (navigationEntry) {
      setNavigationMetrics([
        {
          name: 'DNS Lookup',
          value: Math.round(
            navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart
          ),
          unit: 'ms',
        },
        {
          name: 'TCP Connection',
          value: Math.round(
            navigationEntry.connectEnd - navigationEntry.connectStart
          ),
          unit: 'ms',
        },
        {
          name: 'Request Time',
          value: Math.round(
            navigationEntry.responseStart - navigationEntry.requestStart
          ),
          unit: 'ms',
        },
        {
          name: 'Response Time',
          value: Math.round(
            navigationEntry.responseEnd - navigationEntry.responseStart
          ),
          unit: 'ms',
        },
        {
          name: 'DOM Processing',
          value: Math.round(
            navigationEntry.domComplete - navigationEntry.domLoading
          ),
          unit: 'ms',
        },
        {
          name: 'Page Load',
          value: Math.round(
            navigationEntry.loadEventEnd - navigationEntry.loadEventStart
          ),
          unit: 'ms',
        },
      ]);
    }
  }, []);

  // Resource Timing summary
  useEffect(() => {
    const resourceEntries = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];

    const summary = {
      scripts: resourceEntries.filter((r) => r.initiatorType === 'script')
        .length,
      stylesheets: resourceEntries.filter(
        (r) => r.initiatorType === 'link' || r.initiatorType === 'css'
      ).length,
      images: resourceEntries.filter((r) => r.initiatorType === 'img').length,
      fonts: resourceEntries.filter(
        (r) => r.name.includes('.woff') || r.name.includes('.ttf')
      ).length,
      avgLoadTime: Math.round(
        resourceEntries.reduce((sum, r) => sum + r.duration, 0) /
          resourceEntries.length
      ),
      totalSize: resourceEntries.reduce(
        (sum, r) => sum + (r.transferSize || 0),
        0
      ),
    };

    setResourceMetrics(summary);
  }, []);

  // Memory usage (Chrome-only)
  useEffect(() => {
    if ('memory' in performance) {
      const updateMemory = () => {
        const memory = (performance as any).memory;
        setMemoryMetrics({
          usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576),
          totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576),
          jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576),
        });
      };

      updateMemory();
      const interval = setInterval(updateMemory, 2000);
      return () => clearInterval(interval);
    }
  }, []);

  // FPS monitor
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 0;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setFpsMetric(fps);
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const metrics = Array.from(metricsMap.values());

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'text-green-600 bg-green-50';
      case 'needs-improvement':
        return 'text-yellow-600 bg-yellow-50';
      case 'poor':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'good':
        return '✓ Good';
      case 'needs-improvement':
        return '⚠ Needs Improvement';
      case 'poor':
        return '✗ Poor';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="w-full min-h-screen overflow-y-auto">
      <div className="container mx-auto max-w-6xl p-8 space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Performance Monitoring</h1>
            <p className="text-gray-600 mt-2">
              Real-time Core Web Vitals using Google's web-vitals library
            </p>
          </div>
          <Button
            onClick={refreshMetrics}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh Metrics
          </Button>
        </div>

        {/* SpeedInsights Info */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">
                Vercel SpeedInsights Active
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                SpeedInsights is collecting real user metrics from all
                environments. This debug page uses Google's official web-vitals
                library for local measurement.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href="https://vercel.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-700 hover:text-blue-800 underline flex items-center gap-1"
                >
                  Open Vercel Dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-gray-400">→</span>
                <span className="text-sm text-blue-700">Analytics → Speed</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Core Web Vitals */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Core Web Vitals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading && metrics.length === 0 ? (
              <Card className="p-6 col-span-full">
                <div className="text-center text-gray-500">
                  Loading metrics... (interact with the page to generate INP)
                </div>
              </Card>
            ) : metrics.length === 0 ? (
              <Card className="p-6 col-span-full">
                <div className="text-center text-gray-500">
                  No metrics available yet. Metrics will appear as the page
                  loads and you interact with it.
                </div>
              </Card>
            ) : (
              metrics.map((metric) => (
                <Card key={metric.name} className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-gray-700">
                        {metric.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getRatingColor(metric.rating)}`}
                      >
                        {getRatingBadge(metric.rating)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{metric.value}</span>
                      <span className="text-sm text-gray-500">
                        {metric.unit}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {metric.description}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Navigation Timing */}
        {navigationMetrics.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Navigation Timing
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {navigationMetrics.map((metric) => (
                <Card key={metric.name} className="p-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    {metric.name}
                  </h3>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-bold">{metric.value}</span>
                    <span className="text-sm text-gray-500">{metric.unit}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Resource Loading */}
        {resourceMetrics && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resource Loading
            </h2>
            <Card className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Scripts</p>
                  <p className="text-2xl font-bold">
                    {resourceMetrics.scripts}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Stylesheets</p>
                  <p className="text-2xl font-bold">
                    {resourceMetrics.stylesheets}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Images</p>
                  <p className="text-2xl font-bold">{resourceMetrics.images}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fonts</p>
                  <p className="text-2xl font-bold">{resourceMetrics.fonts}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Load Time</p>
                  <p className="text-2xl font-bold">
                    {resourceMetrics.avgLoadTime} ms
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Size</p>
                  <p className="text-2xl font-bold">
                    {Math.round(resourceMetrics.totalSize / 1024)} KB
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Memory Usage (Chrome only) */}
        {memoryMetrics && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Memory Usage</h2>
            <Card className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Used Heap</p>
                  <p className="text-2xl font-bold">
                    {memoryMetrics.usedJSHeapSize} MB
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Heap</p>
                  <p className="text-2xl font-bold">
                    {memoryMetrics.totalJSHeapSize} MB
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Heap Limit</p>
                  <p className="text-2xl font-bold">
                    {memoryMetrics.jsHeapSizeLimit} MB
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Note: Memory metrics are only available in Chrome/Edge
              </p>
            </Card>
          </div>
        )}

        {/* Frame Rate */}
        {fpsMetric > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Frame Rate</h2>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-600">Current FPS</p>
                  <p className="text-4xl font-bold">{fpsMetric}</p>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all ${
                        fpsMetric >= 55
                          ? 'bg-green-500'
                          : fpsMetric >= 30
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min((fpsMetric / 60) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Target: 60 FPS (smooth) | 30-60 FPS (acceptable) | &lt;30
                    FPS (poor)
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Performance Tips */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Understanding the Metrics
          </h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold">LCP (Largest Contentful Paint)</h3>
              <p className="text-gray-600 mt-1">
                Good: {'<'} 2.5s | Needs Improvement: 2.5s - 4s | Poor: {'>'} 4s
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Measures loading performance. Should occur within 2.5 seconds of
                page load.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">INP (Interaction to Next Paint)</h3>
              <p className="text-gray-600 mt-1">
                Good: {'<'} 200ms | Needs Improvement: 200ms - 500ms | Poor:{' '}
                {'>'} 500ms
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Measures responsiveness. Time from user interaction to visual
                feedback. Requires page interaction to measure.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">First Contentful Paint (FCP)</h3>
              <p className="text-gray-600 mt-1">
                Good: {'<'} 1.8s | Needs Improvement: 1.8s - 3s | Poor: {'>'} 3s
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Time from navigation to when the browser renders the first piece
                of DOM content.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">CLS (Cumulative Layout Shift)</h3>
              <p className="text-gray-600 mt-1">
                Good: {'<'} 0.1 | Needs Improvement: 0.1 - 0.25 | Poor: {'>'}{' '}
                0.25
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Measures visual stability. Sum of all unexpected layout shift
                scores.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Time to First Byte (TTFB)</h3>
              <p className="text-gray-600 mt-1">
                Good: {'<'} 800ms | Needs Improvement: 800ms - 1.8s | Poor:{' '}
                {'>'} 1.8s
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Time from navigation to when the browser receives the first byte
                of response.
              </p>
            </div>
            <div className="pt-4 border-t">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                About These Measurements
              </h3>
              <p className="text-gray-600 mt-1">
                These metrics are measured using Google's official{' '}
                <code className="bg-gray-100 px-1 rounded">web-vitals</code>{' '}
                library, the same library used by Chrome and Vercel
                SpeedInsights. Metrics are measured in real-time as you use the
                application.
              </p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6 bg-gray-50">
          <h3 className="font-semibold mb-3">Quick Performance Checks</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                • Check browser DevTools → Lighthouse tab for detailed analysis
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                • Run:{' '}
                <code className="bg-white px-2 py-1 rounded text-xs">
                  npm run build && npm run start
                </code>{' '}
                to test production build
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                • Monitor bundle size:{' '}
                <code className="bg-white px-2 py-1 rounded text-xs">
                  npm run build
                </code>{' '}
                (check output)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                • Analyze bundle:{' '}
                <code className="bg-white px-2 py-1 rounded text-xs">
                  ANALYZE=true npm run build
                </code>
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
