// src/App.js
"use client";
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import WelcomeScreen from "./WelcomeScreen";
import CreateAccount from "./CreateAccount";

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
