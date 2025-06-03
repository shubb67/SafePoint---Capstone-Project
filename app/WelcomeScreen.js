// src/WelcomeScreen.js
"use client";
import React from "react";
import { Link } from "react-router-dom"; // ← import Link
import "./styles/WelcomeScreen.css";

const WelcomeScreen = () => {
  return (
    <div className="welcome-container">
      <div className="content-wrapper">
        <div className="panels-container">
          <div className="left-panel">
            <div className="left-text-inline">
              <h1 className="welcome-title">Welcome to SafePoint</h1>
              <p className="welcome-subtitle">
                Safer worksites start here. Report incidents, upload evidence, and keep
                your team protected—all in one place.
              </p>
            </div>
          </div>

          <div className="right-panel">
            <div className="image-placeholder"></div>

            {/* 
              Change: 
              <button> … </button> 
              ↓ 
              <Link>…</Link> 
              so that React Router handles navigation 
            */}
           <button className="btn btn-secondary">
             <Link to="/create-account">
              Create New Account
            </Link>
            </button>

            <button className="btn btn-primary"><Link to="/login">
              Login to Existing Account
            </Link></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
