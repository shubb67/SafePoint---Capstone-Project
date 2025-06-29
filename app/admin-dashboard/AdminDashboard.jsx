import React from "react";
import IncidentTracker from "./components/IncidentTracker";
import SafetyRecord from "./components/SafetyRecord";
import SubmittedIncidents from "./components/SubmittedIncidents";
import ChatsSection from "./components/ChatsSection";
import IncidentsByLocationChart from "./components/IncidentByLocationChart";
import IncidentsOverTimeChart from "./components/IncidentOverTimeChart";

export default function AdminDashboard() {
  return (
    <div className="p-6 bg-gray-100 min-h-screen space-y-6">
      <IncidentTracker />
      <SafetyRecord />
      <SubmittedIncidents />
      <ChatsSection />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IncidentsByLocationChart />
        <IncidentsOverTimeChart />
      </div>
    </div>
  );
}
