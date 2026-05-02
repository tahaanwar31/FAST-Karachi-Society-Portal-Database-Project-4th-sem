
import React from 'react';
import { useAuth } from '../components/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { SocietyHeadDashboard } from './SocietyHeadDashboard';
import { StudentDashboard } from './StudentDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'SOCIETY_HEAD':
      return <SocietyHeadDashboard />;
    case 'STUDENT':
    default:
      return <StudentDashboard />;
  }
};
