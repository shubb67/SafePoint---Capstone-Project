"use client";

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/_utils/firebase";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { Listbox } from "@headlessui/react";
import { ChevronDown } from "lucide-react";

export default function PersonalInfo() {
  const navigate = useNavigate();
  const { state: previous } = useLocation();
  const dispatch = useIncidentDispatch();
  const incidentState = useIncidentState();

  // Form fields
  const [yourName, setYourName] = useState("");
  const [wasInjured, setWasInjured] = useState("");
  const [injuredPersons, setInjuredPersons] = useState("");
  const [witnesses, setWitnesses] = useState("");

  // Load users for dropdowns
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    })();
  }, []);

  const handleBack = () => navigate(-1);
  const handleNext = e => {
    e.preventDefault();
    dispatch({
      type: "SET_PERSONAL",
      payload: { yourName, wasInjured, injuredPersons, witnesses },
    });
    navigate("/injury/incident-details", { state: previous });
  };

  const canProceed =
    yourName &&
    wasInjured &&
    (wasInjured === "yes" ? injuredPersons : true) &&
    witnesses;

  // Helpers for selected user objects
  const selectedUser = users.find(u => u.uid === yourName);
  const selectedInjured = users.find(u => u.uid === injuredPersons);
  const selectedWitness = users.find(u => u.uid === witnesses);

  // Common Listbox Option render
  const renderUserOption = u => (
    <>
      <span className="absolute left-2 top-1.5 flex items-center">
        {u.photoUrl
          ? (
            <img src={u.photoUrl} alt="" className="w-7 h-7 rounded-full mr-2" />
          )
          : (
            <div className="w-7 h-7 bg-gray-200 rounded-full mr-2 flex items-center justify-center text-gray-500 font-bold">
              {u.firstName?.charAt(0) || "?"}
            </div>
          )}
      </span>
      <span className="ml-10 block truncate">{u.firstName} {u.surname}</span>
    </>
  );

  // Common Listbox Button render
  function ListboxButtonContent(selectedObj, placeholder = "Select…") {
    return (
      <span className="flex items-center">
        {selectedObj ? (
          <>
            {selectedObj.photoUrl
              ? <img src={selectedObj.photoUrl} alt="" className="w-7 h-7 rounded-full mr-2" />
              : <div className="w-7 h-7 bg-gray-200 rounded-full mr-2 flex items-center justify-center text-gray-500 font-bold">
                  {selectedObj.firstName?.charAt(0) || "?"}
                </div>
            }
            <span className="block truncate text-black">
              {selectedObj.firstName} {selectedObj.surname}
            </span>
          </>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 2 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-1/3 rounded-full" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center mb-4">
          <button
            onClick={handleBack}
            className="text-2xl text-gray-800"
            aria-label="Go back"
          >
            ←
          </button>
          <h1 className="flex-1 text-xl font-semibold text-gray-800 text-center">
            Personal Information
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        {/* Subtitle */}
        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          To tailor SafePoint to your team, we just need a few details about the incident.
        </p>

        {/* Form */}
        <form onSubmit={handleNext} className="space-y-5">

          {/* Your Name (Listbox) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <Listbox value={yourName} onChange={setYourName}>
              <div className="relative mt-1">
                <Listbox.Button className="w-full relative cursor-pointer rounded-lg bg-white border border-gray-300 py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black">
                  {ListboxButtonContent(selectedUser)}
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white py-1 shadow-lg ring-1 ring-opacity-5 focus:outline-none">
                  <Listbox.Option value="">
                    <span className="block px-4 py-2 text-gray-400">Select…</span>
                  </Listbox.Option>
                  {users.map(u => (
                    <Listbox.Option
                      key={u.uid}
                      value={u.uid}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-2 pr-4 ${
                          active ? "bg-blue-100 text-blue-900" : "text-gray-900"
                        }`
                      }
                    >
                      {({ selected }) => (
                        <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                          {renderUserOption(u)}
                        </span>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>

          {/* Was anyone injured? */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Was anyone injured?
            </label>
            <div className="flex gap-2">
              {["yes", "no"].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setWasInjured(val)}
                  className={
                    "flex-1 py-2 border rounded-lg text-center font-medium transition " +
                    (wasInjured === val
                      ? "bg-[#192C63] text-white border-[#192C63]"
                      : "bg-white text-gray-700 border-gray-300 hover:shadow-sm")
                  }
                >
                  {val === "yes" ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>

          {/* Injured Person/s (Listbox) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Injured Person/s
            </label>
            <Listbox
              value={injuredPersons}
              onChange={setInjuredPersons}
              disabled={wasInjured !== "yes"}
            >
              <div className="relative mt-1">
                <Listbox.Button
                  disabled={wasInjured !== "yes"}
                  className={
                    "w-full relative cursor-pointer rounded-lg py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 text-black " +
                    (wasInjured === "yes"
                      ? "bg-white border border-gray-300 focus:ring-blue-500"
                      : "bg-gray-100 border border-gray-200 cursor-not-allowed text-gray-400")
                  }
                >
                  {ListboxButtonContent(
                    wasInjured === "yes" ? selectedInjured : null
                  )}
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white py-1 shadow-lg ring-1 ring-opacity-5 focus:outline-none">
                  <Listbox.Option value="">
                    <span className="block px-4 py-2 text-gray-400">Select…</span>
                  </Listbox.Option>
                  {users.map(u => (
                    <Listbox.Option
                      key={u.uid}
                      value={u.uid}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-2 pr-4 ${
                          active ? "bg-blue-100 text-blue-900" : "text-gray-900"
                        }`
                      }
                    >
                      {({ selected }) => (
                        <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                          {renderUserOption(u)}
                        </span>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>

          {/* Witness/es (Listbox) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Witness/es
            </label>
            <Listbox value={witnesses} onChange={setWitnesses}>
              <div className="relative mt-1">
                <Listbox.Button className="w-full relative cursor-pointer rounded-lg bg-white border border-gray-300 py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black">
                  {ListboxButtonContent(selectedWitness)}
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white py-1 shadow-lg ring-1 ring-opacity-5 focus:outline-none">
                  <Listbox.Option value="">
                    <span className="block px-4 py-2 text-gray-400">Select…</span>
                  </Listbox.Option>
                  {users.map(u => (
                    <Listbox.Option
                      key={u.uid}
                      value={u.uid}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-2 pr-4 ${
                          active ? "bg-blue-100 text-blue-900" : "text-gray-900"
                        }`
                      }
                    >
                      {({ selected }) => (
                        <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                          {renderUserOption(u)}
                        </span>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>

          {/* Next */}
          <div className="absolute bottom-0 pb-6 left-1/2 transform -translate-x-1/2 px-4 w-full max-w-lg">
            <button
              type="submit"
              disabled={!canProceed}
              className={
                "w-full py-3 rounded-lg text-white font-medium transition " +
                (canProceed
                  ? "bg-[#192C63] hover:bg-[#162050]"
                  : "bg-gray-400 cursor-not-allowed")
              }
            >
              Next
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
