import React from "react";

export default function SafetyRecord() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Safety Record</h2>
      <div className="flex justify-between">
        <div className="bg-[#192C63] text-white rounded-lg p-4 text-center flex-1 mr-2">
          <p className="text-3xl font-bold">85</p>
          <p className="text-sm">Incident-Free Days</p>
        </div>
        <div className="bg-green-400 text-white rounded-lg p-4 text-center flex-1 ml-2">
          <p className="text-3xl font-bold">120</p>
          <p className="text-sm">Previous Record</p>
        </div>
      </div>
    </div>
  );
}
