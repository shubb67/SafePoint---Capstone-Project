"use client";
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import WelcomeScreen from "./WelcomeScreen";
import CreateAccount from "./user-onboarding/CreateAccount";
import Step2 from "./user-onboarding/company-info";
import Step3 from "./user-onboarding/upload-photo";
import Step4 from "./user-onboarding/user-onboared";
import Login from "./user-onboarding/login";
import IncidentType from "./incident-report/incident-type";
import PersonalInformation from "./incident-report/personal-information";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 
          1) Visiting “/” renders the WelcomeScreen 
          2) Visiting “/create-account” renders the CreateAccount form 
        */}
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/company-information" element={<Step2 />} />
        <Route path="/upload-photo" element={<Step3 />} />
        <Route path="/final-step" element={<Step4 />} /> 
        <Route path="/login" element={<Login />} />
        <Route path="/incident-type" element={<IncidentType />} />
        <Route path="/personal-information" element={<PersonalInformation />} />
        {/* 
          3) Any other path will render a 404 Not Found page 
          (You can create a NotFound component if needed)
        */}
        <Route path="*" element={<h1>404 Not Found</h1>} />
        
       
      </Routes>
    </BrowserRouter>
  );
}

export default App;
