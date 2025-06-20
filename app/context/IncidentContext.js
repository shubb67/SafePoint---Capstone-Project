"use client";
import React, { createContext, useReducer, useContext } from "react";

const IncidentStateContext = createContext();
const IncidentDispatchContext = createContext();

const initialState = {
  incidentType: "",
  personalInfo: {
    yourName: "",
    wasInjured: "",
    injuredPersons: "",
    witnesses: "",
  },
  incidentDetails: {
    date: "",
    time: "",
    locationId: "",
    description: "",
    transcriptText: "",
  },
  impactInfo: {
    emergency:       "",             // “yes” / “no”
    impactOps:       "",             // “none” / “minor” / “major”
    severity:        "",             // “low” / “medium” / “high”
    responseAction:  "",            
    voice: {
      url:           "",             
      transcript:    ""              
    }
  },
  evidence: [], // array of File or URL strings
};

function incidentReducer(state, action) {
  switch (action.type) {
    case "SET_TYPE":
      return { ...state, incidentType: action.payload };
    case "SET_PERSONAL":
      return { ...state, personalInfo: action.payload };
    case "SET_DETAILS":
      return { ...state, incidentDetails: action.payload };
    case "SET_IMPACT":
      return { ...state, impactInfo: action.payload };
    case "SET_EVIDENCE":
      return { ...state, evidence: action.payload };
    case "RESET":
      return initialState;
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

export function IncidentProvider({ children }) {
  const [state, dispatch] = useReducer(incidentReducer, initialState);
  return (
    <IncidentStateContext.Provider value={state}>
      <IncidentDispatchContext.Provider value={dispatch}>
        {children}
      </IncidentDispatchContext.Provider>
    </IncidentStateContext.Provider>
  );
}

export function useIncidentState() {
  return useContext(IncidentStateContext);
}
export function useIncidentDispatch() {
  return useContext(IncidentDispatchContext);
}
