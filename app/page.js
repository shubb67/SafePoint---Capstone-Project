// src/App.js
"use client";
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import WelcomeScreen       from "./WelcomeScreen";
import CreateAccount       from "./user-onboarding/CreateAccount";
import IncidentLayout      from "./incident-report/IncidentLayout";
import Login              from "./user-onboarding/login";
import CompanyInformation from "./user-onboarding/company-info";
import UploadPhoto        from "./user-onboarding/upload-photo";
import UserOnboared     from "./user-onboarding/user-onboared";


// import AdminDashboard      from "./admin/AdminDashboard";
// import HomePage            from "./HomePage";

import IncidentType        from "./incident-report/incident-type";
import PersonalInformation from "./incident-report/injury/personal-information";
import IncidentDetails     from "./incident-report/injury/incident-details";
import ImpactInfo from "./incident-report/injury/impact-info";
import { IncidentProvider } from "./context/IncidentContext";
import Evidence from "./incident-report/injury/evidence";
 import { Navigate } from "react-router-dom";
 export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import Submit from "./incident-report/injury/submit"
import PropertyPersonalInfo from "./incident-report/property-damage/personal-info";
import PropertyIncidentDetails from "./incident-report/property-damage/incident-details";
import ImpactResponse from "./incident-report/property-damage/impact-response";
import PropertyEvidence from "./incident-report/property-damage/upload-evidence";
import PropertyReportSubmitted from "./incident-report/property-damage/property-report-submit";
import NearMissPersonalInfo from "./incident-report/near-miss/personal-info";
import NearMissIncidentDetails from "./incident-report/near-miss/incident-details";
import NearMissImpact from "./incident-report/near-miss/impact-response";
import NearMissEvidence from "./incident-report/near-miss/upload-evidence";
import NearMissReportSubmitted from "./incident-report/near-miss/report-submitted";
import SafetyHazardsIncidentDetails from "./incident-report/safety-hazards/incident-details";
import SafetyHazardPersonalInfo from "./incident-report/safety-hazards/personal-info";
import SafetyHazardImpactResponse from "./incident-report/safety-hazards/safety-impact";
import SafetyHazardEvidence from "./incident-report/safety-hazards/upload-evidence";
import SafetyHazardReportSubmitted from "./incident-report/safety-hazards/safety-report-submitted";
import UserDashboard from "./user-dashboard/dashboard";
import ForgotPassword from "./user-onboarding/forgot-password";
import ProfileScreen from "./profile";
import AdminDashboard from "./admin-dashboard/AdminDashboard";
import ChatsSection from "./admin-dashboard/components/ChatsSection";
import IncidentsByLocationChart from "./admin-dashboard/components/IncidentByLocationChart";
import IncidentsOverTimeChart from "./admin-dashboard/components/IncidentOverTimeChart";
import SafetyRecord from "./admin-dashboard/components/SafetyRecord";
import SubmittedIncidents from "./admin-dashboard/components/SubmittedIncidents";
import IncidentTracker from "./admin-dashboard/components/IncidentTracker";
import ProtectedAdminRoute from "./admin-dashboard/components/ProtectedAdminRoute";


function App() {
  if (typeof window === "undefined") {
    return null;
  }
  return (
    <BrowserRouter>
     <IncidentProvider>
      <Routes>
        {/* Public / Onboarding */}
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/company-information" element={<CompanyInformation />} />
        <Route path="/upload-photo" element={<UploadPhoto />} />
        <Route path="/user-onboarded" element={<UserOnboared />} />
        <Route path="/login" element={<Login />} />



          <Route path="/incident-type"  element={<IncidentType />} />
          <Route path="/injury/personal-info" element={<PersonalInformation />} />
          <Route path="/injury/incident-details"       element={<IncidentDetails />} />
          <Route path="/injury/impact-info"  element={<ImpactInfo />} />
          <Route path="/injury/evidence"     element={<Evidence />} />
          <Route path="/injury/report-submitted"       element={<Submit />} />

          <Route path="/property-damage/personal-info" element={<PropertyPersonalInfo />} />
          <Route path="/property-damage/incident-details" element={<PropertyIncidentDetails />} />
          <Route path="/property-damage/impact-response" element={<ImpactResponse />} />
          <Route path="/property-damage/upload-evidence" element={<PropertyEvidence />} />
          <Route path="/property-damage/report-submitted" element={<PropertyReportSubmitted />} />

          <Route path="/near-miss/personal-info" element={<NearMissPersonalInfo />} />
          <Route path="/near-miss/incident-details" element={<NearMissIncidentDetails />} />
          <Route path="/near-miss/impact-response" element={<NearMissImpact />} />
          <Route path="/near-miss/upload-evidence" element={<NearMissEvidence />} />
          <Route path="/near-miss/report-submitted" element={<NearMissReportSubmitted />} />

          <Route path="/safety-hazards/personal-info" element={<SafetyHazardPersonalInfo />} />
          <Route path="/safety-hazards/incident-details" element={<SafetyHazardsIncidentDetails />} />
          <Route path="/safety-hazards/safety-impact" element={<SafetyHazardImpactResponse />} />
          <Route path="/safety-hazards/upload-evidence" element={<SafetyHazardEvidence />} />
          <Route path="/safety-hazards/safety-report-submitted" element={<SafetyHazardReportSubmitted />} />

          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/profile" element={<ProfileScreen />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-dashboard/chats" element={<ChatsSection />} />
          <Route path="/admin-dashboard/incidents-by-location" element={<IncidentsByLocationChart />} />
          <Route path="/admin-dashboard/incidents-over-time" element={<IncidentsOverTimeChart />} />
          <Route path="/admin-dashboard/safety-record" element={<SafetyRecord />} />
          <Route path="/admin-dashboard/submitted-incidents" element={<SubmittedIncidents />} />
          <Route path="/admin-dashboard/incident-tracker" element={<IncidentTracker />} />


       {/* Redirect unknown → home */}
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </IncidentProvider>
    </BrowserRouter>
  );
}

export default App;
