import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { User, LogOut, Menu as MenuIcon, X as XIcon, Settings, ChevronDown, ChevronUp, Megaphone, Bot } from 'lucide-react'; // Adicionado Megaphone e Bot
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
  const [isManagementOpen, setIsManagementOpen] = useState(true);
  const [isAdsOpen, setIsAdsOpen] = useState(true); // Estado para o menu de anúncios

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

  const managementSubItems = [
    { name: 'Meu Perfil', path: '/dashboard/profile', icon: User },
  ];

  // Adicionado item de Anúncios
  const adsSubItems = [
    { name: 'Criar Anúncio', path: '/dashboard/anuncios', icon: Megaphone },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/'); // Ajuste para subrotas
  const isManagementActive = () => managementSubItems.some(item => isActive(item.path));
  const isAdsActive = () => adsSubItems.some(item => isActive(item.path)); // Verifica se alguma rota de anúncios está ativa

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className={`bg-purple-800 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 shadow-lg flex flex-col`}>
        <div className="flex items-center justify-between px-4">
          <Link to="/dashboard" className="text-white text-2xl font-semibold uppercase hover:text-gray-300">ChefiaStudio</Link>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 rounded-md text-gray-300 hover:bg-purple-700">
            <XIcon size={24} />
          </button>
        </div>
        <nav className="flex-grow">
          {/* Menu Gerenciamento */}
          <button
            onClick={() => setIsManagementOpen(!isManagementOpen)}
            className={`w-full flex items-center justify-between py-2.5 px-4 rounded transition duration-200 hover:bg-purple-700 hover:text-white ${isManagementActive() ? 'bg-purple-700' : ''}`}
          >
            <div className="flex items-center">
              <Settings className="mr-3" size={20} />
              Gerenciamento
            </div>
            {isManagementOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {isManagementOpen && (
            <div className="pl-4 mt-1 space-y-1">
              {managementSubItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center py-2 px-4 rounded transition duration-200 hover:bg-purple-600 hover:text-white ${isActive(item.path) ? 'bg-purple-600 font-semibold' : 'text-purple-100'}`}
                >
                  <item.icon className="mr-3" size={18} />
                  {item.name}
                </Link>
              ))}
            </div>
          )}

          {/* Menu Anúncios (Novo) */}
          <button
            onClick={() => setIsAdsOpen(!isAdsOpen)}
            className={`w-full flex items-center justify-between py-2.5 px-4 rounded transition duration-200 hover:bg-purple-700 hover:text-white mt-4 ${isAdsActive() ? 'bg-purple-700' : ''}`}
          >
            <div className="flex items-center">
              <Bot className="mr-3" size={20} /> {/* Ícone de Anúncios/IA */}
              Anúncios
            </div>
            {isAdsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {isAdsOpen && (
            <div className="pl-4 mt-1 space-y-1">
              {adsSubItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center py-2 px-4 rounded transition duration-200 hover:bg-purple-600 hover:text-white ${isActive(item.path) ? 'bg-purple-600 font-semibold' : 'text-purple-100'}`}
                >
                  <item.icon className="mr-3" size={18} />
                  {item.name}
                </Link>
              ))}
            </div>
          )}

        </nav>
        <div className="px-4 pb-4">
          <Button variant="ghost" onClick={handleLogout} className="w-full flex items-center justify-start text-gray-300 hover:bg-purple-700 hover:text-white">
            <LogOut className="mr-3" size={20} />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
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

        <header className="bg-white shadow-md p-4 hidden md:flex justify-end items-center sticky top-0 z-20">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">Olá, {userProfile?.name || 'Usuário'}</span>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="User Avatar" />
              <AvatarFallback>{userProfile?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 bg-gray-100 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

