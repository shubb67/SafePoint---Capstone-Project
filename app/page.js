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
          <Route path="/personal-info" element={<PersonalInformation />} />
          <Route path="/details"       element={<IncidentDetails />} />
          <Route path="/impact-info"  element={<ImpactInfo />} />
          <Route path="/evidence"     element={<Evidence />} />
          <Route path="/submit"       element={<Submit />} />
          
          <Route path="/property-damage/personal-info" element={<PropertyPersonalInfo />} />
          <Route path="/property-damage/incident-details" element={<PropertyIncidentDetails />} />

       {/* Redirect unknown → home */}
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </IncidentProvider>
    </BrowserRouter>
  );
}

export default App;
