export default function SpacesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spaces</h1>
          <p className="text-gray-600">
            Organize your documents into collaborative workspaces.
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Create Space
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-semibold">M</span>
            </div>
            <span className="text-xs text-gray-500">3 members</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Marketing Team
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Marketing strategies, campaigns, and analytics documents.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">12 documents</span>
            <span className="text-xs text-blue-600">Active</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-semibold">P</span>
            </div>
            <span className="text-xs text-gray-500">5 members</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Product Team
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Product requirements, specifications, and roadmaps.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">8 documents</span>
            <span className="text-xs text-green-600">Active</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-semibold">E</span>
            </div>
            <span className="text-xs text-gray-500">2 members</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Engineering
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Technical docs, architecture, and development guides.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">15 documents</span>
            <span className="text-xs text-purple-600">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
