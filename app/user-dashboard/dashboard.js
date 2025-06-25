import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Home as HomeIcon,
  FileText,
  PlusCircle,
  MessageSquare,
  User
} from "lucide-react";
import { Flame, Droplet } from "lucide-react";
import Image from 'next/image';
import NewIncidentIcon  from "../assets/image/icon456.png"; 

export default function UserDashboard() {
  const navigate = useNavigate();

  // Dummy data
  const userName = "Daniel";
  const projectName = "Maple Leaf Drilling";
  const projectSite = "14th Street Project";
  const incidentFreeDays = 90;
  const prevRecordDays = 120;
  const recentIncidents = [
    {
      id: 1,
      title: "Fire Hazard",
      location: "Welding Workshop",
      icon: <Flame className="w-5 h-5 text-red-500" />,
      ago: "3 hrs ago",
    },
    {
      id: 2,
      title: "Oil Spill",
      location: "Western Oil Field",
      icon: <Droplet className="w-5 h-5 text-yellow-500" />,
      ago: "3 hrs ago",
    },
  ];

  // Format today’s date nicely
  const formattedDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Quick-action cards
  const cards = [
    {
      title: "New Incident Report",
     icon: (<Image
        src={NewIncidentIcon}
        alt="New Incident"
        width={32}
        height={32}
        className="object-contain"
      />
     ),
      onClick: () => navigate("/incident-type"),
    },
    {
      title: "View Your Reports",
      icon: <FileText className="w-8 h-8 text-gray-800" />,
      onClick: () => navigate("/reports"),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{formattedDate}</p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">
              Good morning, {userName}!
            </h2>
          </div>
          <button className="p-2 rounded-full bg-white shadow">
            <Bell className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Safety Record */}
      <div className="mt-6 px-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500">Safety Record</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{projectName}</p>
              <p className="text-xs text-gray-500">{projectSite}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 bg-[#192C63] text-white rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{incidentFreeDays}</p>
              <p className="text-xs">Incident-Free</p>
            </div>
            <div className="flex-1 bg-green-400 text-white rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{prevRecordDays}</p>
              <p className="text-xs">Previous Record</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 px-4 grid grid-cols-2 gap-4">
        {cards.map(({ title, icon, onClick }) => (
          <button
            key={title}
            onClick={onClick}
            className="flex flex-col items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition"
          >
            {icon}
            <span className="mt-2 text-sm font-medium text-gray-700">
              {title}
            </span>
          </button>
        ))}
      </div>

      {/* Recent Incidents */}
      <div className="mt-6 px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-800">
            Recent Incidents
          </h3>
          <Link to="/reports" className="text-sm text-blue-600 hover:underline">
            View All
          </Link>
        </div>
        <div className="space-y-3">
          {recentIncidents.map(({ id, title, location, icon, ago }) => (
            <div
              key={id}
              className="bg-white rounded-xl shadow p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-full">{icon}</div>
                <div>
                  <p className="font-medium text-gray-800">{title}</p>
                  <p className="text-xs text-gray-500">{location}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">{ago}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto flex justify-between px-8 py-3">
          <Link
            to="/"
            className="flex flex-col items-center text-gray-500 hover:text-[#192C63]"
          >
            <HomeIcon className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link
            to="/reports"
            className="flex flex-col items-center text-gray-500 hover:text-[#192C63]"
          >
            <FileText className="w-6 h-6" />
            <span className="text-xs">Reports</span>
          </Link>
          <button
            onClick={() => navigate("/incident-type")}
            className="relative -mt-6 bg-[#192C63] text-white rounded-full p-3 shadow-lg"
          >
            <PlusCircle className="w-8 h-8" />
          </button>
          <Link
            to="/chats"
            className="flex flex-col items-center text-gray-500 hover:text-[#192C63]"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-xs">Chats</span>
          </Link>
          <Link
            to="/profile"
            className="flex flex-col items-center text-gray-500 hover:text-[#192C63]"
          >
            <User className="w-6 h-6" />
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
