import React, { useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/_utils/firebase';
import { getAuth } from 'firebase/auth';

// NotifyAllEmployees Component with Firebase Integration
const NotifyAllEmployees = ({ incidentId, incidentData }) => {
  const [notifyMessage, setNotifyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState({ type: '', message: '' });
  const auth = getAuth();

  const handleSendNotification = async () => {
    if (!notifyMessage.trim()) {
      setSendStatus({ type: 'error', message: 'Please enter a notification message' });
      return;
    }

    setIsSending(true);
    setSendStatus({ type: '', message: '' });

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get all users from the same company/organization
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      const userCompany = userData?.company;

      if (!userCompany) {
        throw new Error('Company not found');
      }

      // Create notification document
      const notificationData = {
        // Notification content
        notifyMessage: notifyMessage,
        
        // Incident details
        incidentId: incidentId,
        incidentType: incidentData?.incidentType || 'unknown',
        location: incidentData?.incidentDetails?.location || 'Unknown Location',
        
        // Users involved in the incident
        involvedUsers: {
          reporter: incidentData?.personalInfo?.yourName || null,
          injuredPersons: incidentData?.personalInfo?.injuredPersons || null,
          witnesses: incidentData?.personalInfo?.witnesses || null,
        },
        
        // Notification metadata
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        createdByName: userData?.firstName || 'Admin',
        company: userCompany,
        status: 'active',
        readBy: [], // Array to track who has read the notification
        
        // Additional incident info for display
        incidentSeverity: incidentData?.impactInfo?.severity || 'medium',
        incidentDate: incidentData?.incidentDetails?.date || null,
      };

      // Add notification to Firestore
      const notificationRef = await addDoc(collection(db, 'notifications'), notificationData);

      console.log('Notification created with ID:', notificationRef.id);
      
      setSendStatus({ 
        type: 'success', 
        message: 'Notification sent to all employees successfully!' 
      });
      
      // Clear the message after successful send
      setTimeout(() => {
        setNotifyMessage('');
        setSendStatus({ type: '', message: '' });
      }, 3000);

    } catch (error) {
      console.error('Error sending notification:', error);
      setSendStatus({ 
        type: 'error', 
        message: `Failed to send notification: ${error.message}` 
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold text-black mb-2">
        Notify All Employees
      </h1>
      
      <p className="text-base text-gray-900 mb-5">
        Broadcast Notification
      </p>
      
      <div className="mb-6">
        <textarea
          value={notifyMessage}
          onChange={(e) => setNotifyMessage(e.target.value)}
          placeholder="Please type out any information you would like employees to know about this incident..."
          className="w-full px-4 py-3 bg-gray-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-gray-700 text-base leading-relaxed"
          rows={4}
          disabled={isSending}
          style={{ backgroundColor: '#f5f5f5' }}
        />
      </div>

      {sendStatus.message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          sendStatus.type === 'success' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {sendStatus.message}
        </div>
      )}
      
      <button
        onClick={handleSendNotification}
        disabled={isSending || !notifyMessage.trim()}
        className="w-full bg-[#1e2762] text-white py-4 px-6 rounded-lg flex items-center justify-between hover:bg-[#161d4f] transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-base font-medium">
          {isSending ? 'Sending...' : 'Send to All Employees'}
        </span>
        {isSending ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <ChevronRight className="w-6 h-6 stroke-[3] group-hover:translate-x-1 transition-transform" />
        )}
      </button>
    </div>
  );
};
export default NotifyAllEmployees;