// Correção do componente de criação de campanha para usar o endpoint correto
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAdCampaign, getMetaConnectionStatus } from '../lib/api-fetch-fixed';
import MetaConnectionStatus from './MetaConnectionStatus';

const CreateCampaignForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    campaignName: '',
    dailyBudget: 10,
    radius: 5,
    postUrl: '',
    menuUrl: '',
    targetCountry: 'BR',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Verificar conexão Meta antes de tentar criar campanha
      const connectionStatus = await getMetaConnectionStatus();
      if (!connectionStatus.connected) {
        setError("Você precisa conectar sua conta ao Meta Ads primeiro");
        navigate('/connect-meta?redirect=true');
        return;
      }
      
      console.log('Enviando dados para criação de campanha:', formData);
      
      // Usar o endpoint correto para criação de campanha
      const result = await createAdCampaign(formData);
      
      console.log('Campanha criada com sucesso:', result);
      
      // Redirecionar para página de sucesso ou dashboard
      navigate('/dashboard?campaign_created=true');
      
    } catch (err) {
      console.error('Erro ao criar campanha:', err);
      setError(err.message || 'Erro ao criar campanha. Por favor, tente novamente.');
      
      // Se o erro for de conexão Meta, redirecionar para página de conexão
      if (err.message.includes('conectar') || err.message.includes('Meta')) {
        navigate('/connect-meta?redirect=true');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Criar Nova Campanha</h2>
      
      <MetaConnectionStatus />
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Erro</p>
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="campaignName">
            Nome da Campanha
          </label>
          <input
            type="text"
            id="campaignName"
            name="campaignName"
            value={formData.campaignName}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="postUrl">
            URL da Publicação do Facebook/Instagram
          </label>
          <input
            type="url"
            id="postUrl"
            name="postUrl"
            value={formData.postUrl}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="https://www.facebook.com/photo/?fbid=123456789"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Cole a URL de uma publicação existente no Facebook ou Instagram
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="dailyBudget">
            Orçamento Diário (R$)
          </label>
          <input
            type="number"
            id="dailyBudget"
            name="dailyBudget"
            value={formData.dailyBudget}
            onChange={handleChange}
            min="5"
            step="1"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="radius">
            Raio de Alcance (km)
          </label>
          <input
            type="number"
            id="radius"
            name="radius"
            value={formData.radius}
            onChange={handleChange}
            min="1"
            max="50"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startDate">
            Data de Início
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endDate">
            Data de Término (opcional)
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Criando Campanha...
              </span>
            ) : (
              'Criar Campanha'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCampaignForm;
