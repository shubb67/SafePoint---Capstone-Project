import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/_utils/firebase';
import { Mail, Phone, ArrowLeft, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Home as HomeIcon,
  FileText,
  MessageSquare,
  User
} from "lucide-react";


export default function ProfileScreen() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    };
    fetchUser();
  }, []);

  if (!userData) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <ArrowLeft className="w-6 h-6 text-black" />
        <h1 className="text-xl font-semibold text-black">Profile</h1>
        <Bell className="w-6 h-6 text-black" />
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center space-y-2">
        <img
          src={userData.photoUrl}
          className="w-24 h-24 rounded-full object-cover"
          alt="Profile"
        />
        <button className="text-sm text-blue-600">Edit Profile Picture</button>
        <div className="text-center">
          <h2 className="font-semibold text-lg text-black">{userData.firstName} {userData.surname}</h2>
          <p className="text-gray-500 text-sm">{userData.email}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="mt-6 space-y-4">
        {/* Name fields */}
        <div className="flex gap-2">
          <div className="flex-1 border p-3 rounded-xl">
            <label className="block text-sm text-gray-800">Name</label>
            <div className="flex justify-between items-center text-gray-500">
              <span>{userData.firstName}</span>
              <button className="text-blue-600 text-sm">Edit</button>
            </div>
          </div>
          <div className="flex-1 border p-3 rounded-xl">
            <label className="block text-sm text-gray-800">Surname</label>
            <div className="flex justify-between items-center text-gray-500">
              <span>{userData.surname}</span>
              <button className="text-blue-600 text-sm">Edit</button>
            </div>
          </div>
        </div>

        {/* Email field */}
        <div className="border p-3 rounded-xl">
          <label className="block text-sm text-gray-800">Email Address *</label>
          <div className="flex justify-between items-center text-gray-500">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>{userData.email}</span>
            </div>
            <button className="text-blue-600 text-sm">Edit</button>
          </div>
        </div>

        {/* Phone field */}
        <div className="border p-3 rounded-xl">
          <label className="block text-sm text-gray-800">Phone Number</label>
          <div className="flex justify-between items-center text-gray-500">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span>{userData.phone}</span>
            </div>
            <button className="text-blue-600 text-sm">Edit</button>
          </div>
        </div>

        <button className="w-full mt-4 p-3 rounded-xl bg-gray-100 text-blue-600 font-semibold" disabled>
          Change Password
        </button>
      </div>

<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto flex justify-between px-8 py-3">
          <Link to="/user-dashboard" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <HomeIcon className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link to="/reports" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <FileText className="w-6 h-6" />
            <span className="text-xs">Reports</span>
          </Link>
          <Link to="/chats" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <MessageSquare className="w-6 h-6" />
            <span className="text-xs">Chats</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <User className="w-6 h-6" />
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}