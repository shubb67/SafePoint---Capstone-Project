import React from "react";
import { Outlet } from "react-router-dom";
import { IncidentProvider } from "../context/IncidentContext";

export default function IncidentLayout() {
  return (
    <IncidentProvider>
      <Outlet />
    </IncidentProvider>
  );
}
