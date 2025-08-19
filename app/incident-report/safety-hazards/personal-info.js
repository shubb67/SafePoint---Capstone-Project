// src/incident-report/property-damage/PersonalInfo.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { Listbox } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import { doc, getDoc } from "firebase/firestore";
import { auth } from "@/_utils/firebase";

export default function SafetyHazardPersonalInfo() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();
  const previous = useLocation().state || {};

  // form state
  const [yourName, setYourName]   = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [witnesses, setWitnesses] = useState([]);
  const [users, setUsers]         = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  


  // load users for dropdowns, after companyName is set
  useEffect(() => {
    async function fetchRequestUsers() {
      setLoadingUsers(true);
      try {
        const wsId = (await getDoc(doc(db, "users", auth.currentUser.uid))).data().workspaceId;
          const snap = await getDocs(query(collection(db, "users"), where("workspaceId", "==", wsId)));
          setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));     
        
        const usersArr = usersSnap.docs.map(doc => {
          const d = doc.data();
          return {
            uid: doc.id,
            firstName: d.firstName || '',
            lastName: d.lastName || d.surname || '',
            photoUrl: d.photoUrl || '',
            email: d.email || '',
          };
        });
        setUsers(usersArr);
      } catch (err) {
        console.error("Error fetching users for dropdown", err);
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchRequestUsers();
  }, [companyName]);

  // Keep Listbox and value in sync
  useEffect(() => {
    setYourName(selectedUser);
  }, [selectedUser]);

  const handleBack = () => navigate(-1);

  const handleNext = e => {
    e.preventDefault();
    // stash into context under this incidentType
    dispatch({
      type: "SET_STEP_DATA",
      payload: {
        step: "personalInfo",
        data: { yourName, witnesses }
      }
    });
    // go to step 3 of your flow
    navigate("/safety-hazards/incident-details", { state: { ...previous, incidentType } });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 2 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-2/6 rounded-full" />
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
          Help us understand what happened by sharing who was involved.
        </p>

        {/* Form */}
        <form onSubmit={handleNext} className="space-y-6">
          {/* Your Name */}
          <div>
            <label
              htmlFor="yourName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your Name
            </label>
            <Listbox value={selectedUser} onChange={setSelectedUser}>
              <div className="relative">
                <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white border border-gray-300 py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <span className="flex items-center">
                    {selectedUser ? (
                      (() => {
                        const u = users.find(x => x.uid === selectedUser);
                        return u ? (
                          <>
                            {u.photoUrl
                              ? <img src={u.photoUrl} alt="" className="w-10 h-10 rounded-full mr-2" />
                              : <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">{u.firstName?.charAt(0) || "?"}</div>
                            }
                            <span className=" block truncate text-black">{u.firstName} {u.lastName}</span>
                          </>
                        ) : <span className="text-gray-400">Select User</span>;
                      })()
                    ) : (
                      <span className="text-gray-400">Select User</span>
                    )}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white py-1 shadow-lg ring-1 ring-opacity-5 focus:outline-none">
                  {users.map((u) => (
                    <Listbox.Option
                      key={u.uid}
                      value={u.uid}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                        }`
                      }
                    >
                      {({ selected, active }) => (
                        <>
                          <span className={`absolute left-2 top-2 flex items-center`}>
                            {u.photoUrl
                              ? <img src={u.photoUrl} alt="" className="w-9 h-9 rounded-full mr-2" />
                              : <div className="w-8 h-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center text-gray-500 font-bold">{u.firstName?.charAt(0) || "?"}</div>
                            }
                          </span>
                          <span className={`ml-4 block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {u.firstName} {u.lastName}
                          </span>
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>

          {/* Witness/es */}
<div>
  <label
    htmlFor="witnesses"
    className="block text-sm font-medium text-gray-700 mb-1"
  >
    Witness/es
  </label>
  <Listbox value={witnesses} onChange={setWitnesses} multiple>
    <div className="relative">
      <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white border border-gray-300 py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
        <span className="flex flex-wrap gap-2">
          {witnesses.length === 0 ? (
            <span className="text-gray-400">Select Witnesses</span>
          ) : (
            witnesses.map(uid => {
              const u = users.find(x => x.uid === uid);
              if (!u) return null;
              return (
                <span
                  key={u.uid}
                  className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"
                >
                  {u.photoUrl ? (
                    <img
                      src={u.photoUrl}
                      alt=""
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">
                      {u.firstName?.charAt(0) || "?"}
                    </span>
                  )}
                  <span className="text-sm text-gray-700">
                    {u.firstName} {u.lastName}
                  </span>
                </span>
              );
            })
          )}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </span>
      </Listbox.Button>
      <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white py-1 shadow-lg ring-1 ring-opacity-5 focus:outline-none">
        {users.map(u => (
          <Listbox.Option
            key={u.uid}
            value={u.uid}
            className={({ active }) =>
              `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
              }`
            }
          >
            {({ selected }) => (
              <>
                <span className="absolute left-2 top-2 flex items-center">
                  {u.photoUrl ? (
                    <img
                      src={u.photoUrl}
                      alt=""
                      className="w-7 h-7 rounded-full mr-2"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-gray-200 rounded-full mr-2 flex items-center justify-center text-gray-500 font-bold">
                      {u.firstName?.charAt(0) || "?"}
                    </div>
                  )}
                </span>
                <span
                  className={`ml-4 block truncate ${
                    selected ? 'font-medium' : 'font-normal'
                  }`}
                >
                  {u.firstName} {u.lastName}
                </span>
                {selected && (
                  <span className="absolute inset-y-0 right-3 flex items-center text-indigo-600 font-bold">
                    ✓
                  </span>
                )}
              </>
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
              disabled={!(yourName && witnesses)}
              className={
                `w-full py-3 rounded-lg text-white font-medium transition ` +
                (yourName && witnesses
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
