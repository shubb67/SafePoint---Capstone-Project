// src/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase"; // Ensure auth is exported from firebase.js
import "../styles/login.css";

const Login = () => {
  const navigate = useNavigate();

  // State for form fields + loading/error
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Go back to the previous screen
  const handleBack = () => {
    navigate(-1);
  };

  // Handle the form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // On success, navigate to home/dashboard
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Incorrect email or password.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Failed to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Back Arrow */}
      <div className="login-header">
        <button
          type="button"
          className="back-button"
          onClick={handleBack}
          aria-label="Go back"
        >
          ←
        </button>
      </div>

      {/* Title & Subtitle */}
      <div className="login-titles">
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Enter your credential to continue</p>
      </div>

      {/* Form */}
      <form className="login-form" onSubmit={handleSubmit}>
        {/* Email Address */}
        <div className="form-group">
          <label htmlFor="login-email">Email Address *</label>
          <div className="input-with-icon">
            <span className="icon email-icon" aria-hidden="true">
              {/* Inline SVG email icon */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
                  stroke="#555"
                  strokeWidth="2"
                />
                <path d="M22 6L12 13L2 6" stroke="#555" strokeWidth="2" />
              </svg>
            </span>
            <input
              type="email"
              id="login-email"
              name="login-email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="login-password">Password *</label>
          <input
            type="password"
            id="login-password"
            name="login-password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Error Message */}
        {error && <p className="error-text">{error}</p>}

        {/* Login Button */}
        <button
          type="submit"
          className="btn btn-primary login-button"
          disabled={loading}
        >
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
