import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend);

export default function IncidentsByLocationChart() {
  const data = {
    labels: ['Site A', 'Site B', 'Site C'],
    datasets: [
      {
        label: 'Incidents',
        data: [5, 8, 3],
        backgroundColor: ['#192C63', '#34D399', '#FBBF24'],
      },
    ],
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Incidents by Location</h2>
      <Pie data={data} />
    </div>
  );
}
