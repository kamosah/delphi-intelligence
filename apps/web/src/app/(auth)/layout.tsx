import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication',
  description:
    'Sign in to Olympus - Your AI-powered document intelligence platform. Access your workspaces, documents, and AI analyst.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding/Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 p-12 items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Olympus</h1>
          <p className="text-xl opacity-90 mb-8">
            Your AI analyst for document intelligence
          </p>
          <div className="text-left max-w-md">
            <div className="flex items-center mb-4">
              <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
              <span>Upload and organize documents</span>
            </div>
            <div className="flex items-center mb-4">
              <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
              <span>Ask questions about your content</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
              <span>Get AI-powered insights</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Olympus</h1>
            <p className="text-gray-600">Welcome back</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
