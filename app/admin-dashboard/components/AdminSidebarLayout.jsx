import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { Bell, User, HelpCircle, Search } from "lucide-react";


export default function AdminSidebarLayout() {
  const [searchQuery, setSearchQuery] = useState("");
  
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#1a2b5c] text-white">
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-xl font-semibold">SafePoint</h1>
          <div className="flex items-center gap-4">
            <Bell className="w-5 h-5 cursor-pointer" />
            <User className="w-5 h-5 cursor-pointer" />
            <HelpCircle className="w-5 h-5 cursor-pointer" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-1.5 rounded text-black text-sm w-64"
              />
            </div>
            <button className="bg-[#4267b2] px-4 py-1.5 rounded text-sm">
              ☰
            </button>
          </div>
        </div>
      </header>

    </div>
  );
}
