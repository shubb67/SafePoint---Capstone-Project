import { NavLink, Outlet } from "react-router-dom";

export default function AdminSidebarLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#192C63] text-white p-4 space-y-4">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
        <NavLink to="/admin" className="block hover:bg-gray-700 p-2 rounded">Dashboard</NavLink>
        <NavLink to="/admin/incidents" className="block hover:bg-gray-700 p-2 rounded">Incidents</NavLink>
        <NavLink to="/admin/charts" className="block hover:bg-gray-700 p-2 rounded">Analytics</NavLink>
        <NavLink to="/admin/settings" className="block hover:bg-gray-700 p-2 rounded">Settings</NavLink>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
