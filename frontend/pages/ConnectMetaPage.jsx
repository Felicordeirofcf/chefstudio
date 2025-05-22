// Página de conexão Meta para integrar os componentes
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import ConnectMeta from '../components/ConnectMeta';
import MetaConnectionTest from '../components/MetaConnectionTest';

const ConnectMetaPage = () => {
  const [showTest, setShowTest] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Verificar se o usuário já está conectado ao Meta
    if (user && user.metaConnectionStatus === 'connected') {
      setShowTest(true);
    }
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Conectar ao Meta Ads</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <ConnectMeta />
          
          <div className="mt-6">
            <button
              onClick={() => setShowTest(!showTest)}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {showTest ? 'Ocultar detalhes de conexão' : 'Verificar status de conexão'}
            </button>
          </div>
        </div>
        
        {showTest && (
          <div>
            <MetaConnectionTest />
          </div>
        )}
      </div>
      
      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Instruções para Conexão</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Clique no botão "Conectar Instagram / Facebook" acima</li>
          <li>Você será redirecionado para o Facebook para autorizar o acesso</li>
          <li>Faça login na sua conta do Facebook se necessário</li>
          <li>Selecione a conta de anúncios que deseja conectar</li>
          <li>Conceda as permissões solicitadas</li>
          <li>Você será redirecionado de volta para o ChefStudio automaticamente</li>
          <li>Após a conexão, você poderá criar e gerenciar anúncios</li>
        </ol>
        
        <div className="mt-4 bg-yellow-100 p-4 rounded">
          <p className="font-semibold">Importante:</p>
          <p>Você precisa ter uma conta de anúncios ativa no Facebook Business Manager para usar esta funcionalidade.</p>
        </div>
      </div>
    </div>
  );
};

export default ConnectMetaPage;
