import axios from 'axios';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const LogoutButton = ({className}) => {
  const navigate = useNavigate();

  const handleLogout =async () => {
    await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        userId: localStorage.getItem('userId'),
    });

    // Clear stored tokens and any user-specific data
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    // Optionally, you can also call your backend logout endpoint here
    // Redirect the user to the login page
    navigate('/login');
  };

  return (
    <button 
      onClick={handleLogout} 
      className={`bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded cursor-pointer ${className}`}
    >
      Logout
    </button>
  );
};

export default LogoutButton;
