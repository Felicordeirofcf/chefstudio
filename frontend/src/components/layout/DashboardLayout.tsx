import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { User, CreditCard, LogOut, Menu as MenuIcon, X as XIcon, Settings, ChevronDown, ChevronUp } from 'lucide-react'; // Import icons including Chevrons
import { useState, useEffect } from 'react';
import { getUserProfile, logoutUser } from "../../lib/api";
import { useToast } from "../../hooks/use-toast";

interface UserProfile {
  name?: string;
}

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(true); // State for accordion

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getUserProfile();
        setUserProfile(profile);
      } catch (error) {
        console.error("Failed to fetch profile for layout:", error);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    logoutUser();
    toast({ title: "Logout realizado", description: "Você foi desconectado com sucesso." });
    navigate('/');
  };

  // Define navigation structure with accordion
  const managementSubItems = [
    { name: 'Meu Perfil', path: '/dashboard/profile', icon: User },
    { name: 'Planos', path: '/dashboard/plans', icon: CreditCard },
  ];

  const isActive = (path: string) => location.pathname === path || (path === '/dashboard/profile' && location.pathname.startsWith('/dashboard/profile')) || (path === '/dashboard/plans' && location.pathname.startsWith('/dashboard/plans'));
  const isManagementActive = () => managementSubItems.some(item => isActive(item.path));

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className={`bg-purple-800 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 shadow-lg flex flex-col`}>
        <div className="flex items-center justify-between px-4">
          {/* Link to main dashboard page */} 
          <Link to="/dashboard" className="text-white text-2xl font-semibold uppercase hover:text-gray-300">ChefiaStudio</Link>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 rounded-md text-gray-300 hover:bg-purple-700">
            <XIcon size={24} />
          </button>
        </div>
        <nav className="flex-grow">
          {/* Management Accordion Button */}
          <button
            onClick={() => setIsManagementOpen(!isManagementOpen)}
            className={`w-full flex items-center justify-between py-2.5 px-4 rounded transition duration-200 hover:bg-purple-700 hover:text-white ${isManagementActive() ? 'bg-purple-700' : ''}`}
          >
            <div className="flex items-center">
              <Settings className="mr-3" size={20} /> {/* Using Settings icon for Management */}
              Gerenciamento
            </div>
            {isManagementOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {/* Management Sub-items (Accordion Content) */}
          {isManagementOpen && (
            <div className="pl-4 mt-1 space-y-1">
              {managementSubItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)} // Close sidebar on mobile nav click
                  className={`flex items-center py-2 px-4 rounded transition duration-200 hover:bg-purple-600 hover:text-white ${isActive(item.path) ? 'bg-purple-600 font-semibold' : 'text-purple-100'}`}
                >
                  <item.icon className="mr-3" size={18} />
                  {item.name}
                </Link>
              ))}
            </div>
          )}

          {/* Add other main sections here if needed in the future */}

        </nav>
        <div className="px-4 pb-4">
           <Button variant="ghost" onClick={handleLogout} className="w-full flex items-center justify-start text-gray-300 hover:bg-purple-700 hover:text-white">
             <LogOut className="mr-3" size={20} />
             Sair
           </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header for Mobile and Top Bar */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-20 md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 p-1 rounded-md hover:bg-gray-100">
            <MenuIcon size={24} />
          </button>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-700">{userProfile?.name || 'Usuário'}</span>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="User Avatar" />
              <AvatarFallback>{userProfile?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </header>
         {/* Top Bar for Desktop */}
         <header className="bg-white shadow-md p-4 hidden md:flex justify-end items-center sticky top-0 z-20">
           <div className="flex items-center space-x-4">
             <span className="text-sm text-gray-700">Olá, {userProfile?.name || 'Usuário'}</span>
             <Avatar>
               <AvatarImage src="https://github.com/shadcn.png" alt="User Avatar" />
               <AvatarFallback>{userProfile?.name?.charAt(0) || 'U'}</AvatarFallback>
             </Avatar>
           </div>
         </header>

        {/* Page Content */}
        <main className="flex-1 bg-gray-100 overflow-y-auto">
          <Outlet /> {/* Nested routes will render here */}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

