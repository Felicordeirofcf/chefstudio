import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useLocation,
} from 'react-router-dom';
// import App from './App'; // Assuming App might still be useful for global context/styles
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ConnectMeta from './components/auth/ConnectMeta';
import DashboardLayout from './components/layout/DashboardLayout'; // Import the new layout
import DashboardHome from './components/dashboard/Dashboard'; // Renamed for clarity
import ProfilePage from './components/dashboard/ProfilePage'; // Import Profile Page
import PlansPage from './components/dashboard/PlansPage'; // Import Plans Page
import { Toaster } from "./components/ui/toaster";
import './index.css';

// Helper function to get user info from localStorage
const getUserInfo = () => {
  const userInfo = localStorage.getItem('userInfo');
  if (!userInfo) return null;
  try {
    return JSON.parse(userInfo);
  } catch (e) {
    localStorage.removeItem('userInfo');
    return null;
  }
};

// Protected Route Component - Handles Authentication and Meta Connection Check
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const userInfo = getUserInfo();
  const location = useLocation();

  if (!userInfo || !userInfo.token) {
    // Not authenticated, redirect to login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Authenticated, check Meta connection status
  if (!userInfo.isMetaConnected && location.pathname !== '/connect-meta') {
    // Authenticated but Meta not connected, and not already on connect page
    // Redirect to connect-meta page
    return <Navigate to="/connect-meta" state={{ from: location }} replace />;
  }

  if (userInfo.isMetaConnected && location.pathname === '/connect-meta') {
      // Authenticated and Meta IS connected, but trying to access connect page again
      // Redirect to dashboard
      return <Navigate to="/dashboard" replace />;
  }

  // Authenticated and Meta connected (or on the connect page itself), allow access
  return children;
};

// Define the routes using the createBrowserRouter API
const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/connect-meta",
    element: (
      <ProtectedRoute>
        <ConnectMeta />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardLayout /> {/* Use DashboardLayout for all dashboard routes */}
      </ProtectedRoute>
    ),
    children: [
      {
        index: true, // Default route for /dashboard
        element: <DashboardHome />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "plans",
        element: <PlansPage />,
      },
      // Add other dashboard sections here later (e.g., cardapio)
    ],
  },
  // Add a catch-all or 404 route if needed
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>,
);

