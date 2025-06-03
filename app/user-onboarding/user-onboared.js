// src/Step4.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase"; // auth & db must be exported
import { doc, getDoc } from "firebase/firestore";
import "../styles/step4.css";

const Step4 = () => {
  const [photoURL, setPhotoURL] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPhotoFromFirestore = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const uid = user.uid;
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.photoURL) {
            setPhotoURL(data.photoURL);
          }
        }
      } catch (err) {
        console.warn("Could not fetch photoURL:", err);
      }
    };
    loadPhotoFromFirestore();
  }, []);

  const handleComplete = () => {
    navigate("/");
  };

  return (
    <div className="create-container">
      <div className="final-content">
        <h1 className="page-title final-title">Let's Get to Work – Safely</h1>
        <p className="subtitle final-subtitle">
          All set! Your SafePoint account is good to go.
        </p>

        <div className="final-photo-wrapper">
          {photoURL ? (
            <img src={photoURL} alt="Profile" className="final-photo" />
          ) : (
            <div className="final-photo-placeholder" />
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary complete-button"
          onClick={handleComplete}
        >
          Complete
        </button>
      </div>
    </div>
  );
};

export default Step4;
