import React from "react";

export default function IncidentTracker() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Incident Tracker</h2>
      <div className="flex justify-around text-center">
        <div>
          <p className="text-3xl font-bold text-[#192C63]">12</p>
          <p className="text-sm text-gray-500">Open</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-yellow-500">8</p>
          <p className="text-sm text-gray-500">In Progress</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-green-600">22</p>
          <p className="text-sm text-gray-500">Resolved</p>
        </div>
      </div>
    </div>
  );
}
