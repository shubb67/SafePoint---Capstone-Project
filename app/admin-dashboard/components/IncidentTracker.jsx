import React from "react";

export default function IncidentDetailView() {
  return (
    <div className="flex bg-[#f8f9fc] min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-4 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-[#192C63]">14th Street Project</h1>
          <p className="text-sm text-gray-500">Project Description</p>
        </div>
        <nav className="space-y-4">
          <button className="block text-left text-[#192C63] font-medium">🏠 Home</button>
          <button className="block text-left text-gray-600 hover:text-[#192C63]">📄 Incident Reports</button>
          <button className="block text-left text-gray-600 hover:text-[#192C63]">💬 Chats</button>
          <button className="block text-left text-gray-600 hover:text-[#192C63]">📄 Templates</button>
          <button className="block text-left text-gray-600 hover:text-[#192C63]">📋 Task Organization</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-[#192C63]">Injury & Loss of Life Report</h2>
            <p className="text-sm text-gray-500">Report ID: #INC-2025-001</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">⏳ Pending Review</span>
            <p className="text-sm text-gray-400">Submitted 2 hours ago</p>
          </div>
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left (2/3 width) */}
          <div className="col-span-2 space-y-6">
            {/* Personal Info */}
            <div className="bg-white rounded-xl shadow p-4 space-y-2">
              <h3 className="font-semibold text-gray-700 mb-2">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Reporter Name:</strong> Sarah Johnson</div>
                <div><strong>Was anyone injured?</strong> <span className="text-red-600">Yes</span></div>
                <div><strong>Injured Person(s):</strong> Michael Rodriguez, Construction Worker</div>
                <div><strong>Witnesses:</strong> Emma Thompson, David Chen</div>
              </div>
            </div>

            {/* Incident Details */}
            <div className="bg-white rounded-xl shadow p-4 space-y-2">
              <h3 className="font-semibold text-gray-700 mb-2">Incident Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Date:</strong> March 15, 2024</div>
                <div><strong>Time:</strong> 2:30 PM</div>
                <div className="col-span-2"><strong>Location:</strong> Construction Site – Building A, Level 3</div>
                <div className="col-span-2">
                  <strong>Description:</strong> Worker fell from scaffolding while installing safety barriers.
                  The scaffolding appeared to be improperly secured. Emergency services were called immediately.
                  Worker sustained injuries to leg and back.
                </div>
              </div>
            </div>

            {/* Impact and Response */}
            <div className="bg-white rounded-xl shadow p-4 space-y-2">
              <h3 className="font-semibold text-gray-700 mb-2">Impact and Response</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Emergency Response Activated:</strong> <span className="text-green-600">Yes</span></div>
                <div><strong>Severity Level:</strong> <span className="text-red-600">High</span></div>
              </div>
            </div>

            {/* Evidence */}
            <div className="bg-white rounded-xl shadow p-4 space-y-2">
              <h3 className="font-semibold text-gray-700 mb-2">Evidence</h3>
              <img
                src="https://images.unsplash.com/photo-1581093588401-9a56bfc67457"
                alt="evidence"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          </div>

          {/* Right (1/3 width) */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-4 space-y-4">
              <h3 className="font-semibold text-gray-700">Review Actions</h3>
              <button className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600">✅ Resolve</button>
              <button className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600">❌ Reject</button>
              <button className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">📩 Request More Info</button>
              <button className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600">⚠️ Escalate</button>

              {/* Assign dropdown */}
              <div className="mt-4">
                <label className="block text-sm mb-1 text-gray-600">Assign to Another Admin</label>
                <select className="w-full border border-gray-300 rounded px-2 py-2 text-sm">
                  <option>Select Admin</option>
                  <option>Daniel Smith</option>
                  <option>Emily Johnson</option>
                </select>
                <button className="mt-2 w-full bg-[#192C63] text-white py-2 rounded hover:bg-[#101c4a]">
                  Assign Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
