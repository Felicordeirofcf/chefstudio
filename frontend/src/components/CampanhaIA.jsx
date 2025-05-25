import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from "../hooks/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { Loader2, Upload, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const CampanhaIA = () => {
  const { toast } = useToast();

  // Estados para formulário
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [descricaoProduto, setDescricaoProduto] = useState('');
  const [orcamento, setOrcamento] = useState('70');
  const [orcamentoCustom, setOrcamentoCustom] = useState('');
  const [imagem, setImagem] = useState(null);
  const [previewImagem, setPreviewImagem] = useState('');
  const [legendaGerada, setLegendaGerada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');

  // Estados Meta
  const [adAccountsList, setAdAccountsList] = useState([]);
  const [pagesList, setPagesList] = useState([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [isMetaConnected, setIsMetaConnected] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [gerandoLegenda, setGerandoLegenda] = useState(false);
  const [publicandoPost, setPublicandoPost] = useState(false);
  const [error, setError] = useState(null);
  const [successAlert, setSuccessAlert] = useState(null);

  // Definir data de início padrão
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDataInicio(today);
  }, []);

  // Buscar status da conexão Meta
  useEffect(() => {
    const fetchMetaStatus = async () => {
      setMetaLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn("Token não encontrado, usuário não autenticado.");
          setIsMetaConnected(false);
          setMetaLoading(false);
          return;
        }

        const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";
        const response = await axios.get(`${API_BASE_URL}/meta/connection-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const { isConnected, adAccounts, metaPages } = response.data;
        console.log("Resposta de /api/meta/connection-status:", response.data);

        setIsMetaConnected(isConnected);

        if (isConnected) {
          if (adAccounts && adAccounts.length > 0) {
            setAdAccountsList(adAccounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.id})` })));
            if (!selectedAdAccount || !adAccounts.some(acc => acc.id === selectedAdAccount)) {
              setSelectedAdAccount(adAccounts[0].id);
            }
          } else {
            setAdAccountsList([]);
            setSelectedAdAccount('');
            console.warn("Nenhuma conta de anúncios encontrada via API.");
          }

          if (metaPages && metaPages.length > 0) {
            setPagesList(metaPages.map(page => ({ value: page.id, label: `${page.name} (${page.id})` })));
            if (!selectedPage || !metaPages.some(page => page.id === selectedPage)) {
              setSelectedPage(metaPages[0].id);
            }
          } else {
            setPagesList([]);
            setSelectedPage('');
            console.warn("Nenhuma página do Facebook encontrada via API.");
          }
        } else {
          setAdAccountsList([]);
          setPagesList([]);
          setSelectedAdAccount('');
          setSelectedPage('');
        }

      } catch (error) {
        console.error('Erro ao buscar status da conexão Meta:', error.response?.data || error.message);
        setError('Erro ao verificar conexão com Meta Ads. Tente recarregar a página.');
        setIsMetaConnected(false);
        setAdAccountsList([]);
        setPagesList([]);
        setSelectedAdAccount('');
        setSelectedPage('');
      } finally {
        setMetaLoading(false);
      }
    };

    fetchMetaStatus();
  }, []);

  // Função para lidar com upload de imagem
  const handleImagemChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagem(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImagem(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para gerar legenda com IA
  const gerarLegenda = async () => {
    if (!descricaoProduto.trim()) {
      toast({
        title: "Descrição necessária",
        description: "Por favor, digite uma descrição do produto para gerar a legenda.",
        variant: "destructive"
      });
      return;
    }

    setGerandoLegenda(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Usuário não autenticado.');
      }

      const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";
      const response = await axios.post(
        `${API_BASE_URL}/openai/gerar-legenda`,
        { descricao: descricaoProduto },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.success && response.data.legenda) {
        setLegendaGerada(response.data.legenda);
        toast({
          title: "Legenda gerada com sucesso!",
          description: "A legenda foi criada com IA e está pronta para uso.",
        });
      } else {
        throw new Error('Resposta inválida do servidor.');
      }
    } catch (error) {
      console.error('Erro ao gerar legenda:', error.response?.data || error.message);
      setError('Falha ao gerar legenda. Por favor, tente novamente.');
      toast({
        title: "Erro ao gerar legenda",
        description: error.response?.data?.message || "Ocorreu um erro ao gerar a legenda. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setGerandoLegenda(false);
    }
  };

  // Função para publicar post e criar anúncio
  const publicarPostECriarAnuncio = async () => {
    // Validar campos obrigatórios
    if (!nomeCampanha || !imagem || !legendaGerada || !selectedAdAccount || !selectedPage || !orcamento) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios e gere uma legenda.",
        variant: "destructive"
      });
      return;
    }

    setPublicandoPost(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Usuário não autenticado.');
      }

      const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";
      
      // Preparar FormData para upload da imagem
      const formData = new FormData();
      formData.append('image', imagem);
      formData.append('caption', legendaGerada);
      formData.append('pageId', selectedPage);
      formData.append('adAccountId', selectedAdAccount);
      formData.append('campaignName', nomeCampanha);
      
      // Determinar o orçamento final (valor selecionado ou personalizado)
      const orcamentoFinal = orcamento === 'custom' ? orcamentoCustom : orcamento;
      formData.append('weeklyBudget', orcamentoFinal);
      
      // Adicionar datas
      formData.append('startDate', dataInicio);
      if (dataTermino) {
        formData.append('endDate', dataTermino);
      }

      // Enviar requisição para publicar post e criar anúncio
      const response = await axios.post(
        `${API_BASE_URL}/meta-ads/publicar-post-criar-anuncio`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );

      if (response.data && response.data.success) {
        // Mostrar alerta de sucesso
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR') + ' - ' + 
                             dataAtual.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        
        setSuccessAlert({
          message: `Anúncio criado com sucesso em ${dataFormatada}`,
          adsUrl: `https://business.facebook.com/adsmanager/manage/campaigns?act=${selectedAdAccount}`
        });
        
        // Limpar formulário
        setNomeCampanha('');
        setDescricaoProduto('');
        setImagem(null);
        setPreviewImagem('');
        setLegendaGerada('');
        setOrcamentoCustom('');
        
        toast({
          title: "Sucesso!",
          description: "Post publicado e anúncio criado com sucesso!",
        });
      } else {
        throw new Error('Resposta inválida do servidor.');
      }
    } catch (error) {
      console.error('Erro ao publicar post e criar anúncio:', error.response?.data || error.message);
      setError('Falha ao publicar post e criar anúncio. Por favor, tente novamente.');
      toast({
        title: "Erro ao criar anúncio",
        description: error.response?.data?.message || "Ocorreu um erro ao publicar o post e criar o anúncio. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setPublicandoPost(false);
    }
  };

  // Componente de alerta de sucesso
  const SuccessAlert = ({ message, adsUrl, onClose }) => {
    return (
      <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-lg z-50 animate-fade-in">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 w-full">
            <p className="text-sm font-medium text-green-800">
              🎉 {message}
            </p>
            {adsUrl && (
              <div className="mt-2">
                <a 
                  href={adsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Ver no Ads Manager
                </a>
              </div>
            )}
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onClose}
                className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <span className="sr-only">Fechar</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alerta de sucesso */}
      {successAlert && (
        <SuccessAlert 
          message={successAlert.message} 
          adsUrl={successAlert.adsUrl} 
          onClose={() => setSuccessAlert(null)} 
        />
      )}

      {/* Seção de conexão Meta */}
      {!isMetaConnected && (
        <Card className="p-6 bg-amber-50 border-amber-200">
          <h2 className="text-lg font-semibold mb-2">Conecte sua conta Meta Ads</h2>
          <p className="text-sm text-gray-600 mb-4">
            Para criar anúncios, você precisa conectar sua conta Meta Ads e selecionar uma página do Facebook.
          </p>
          <Button 
            onClick={() => window.location.href = '/connect-meta'} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Conectar Meta Ads
          </Button>
        </Card>
      )}

      {/* Formulário principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coluna 1: Upload e Descrição */}
        <div className="space-y-6">
          <div>
            <label htmlFor="nomeCampanha" className="block text-sm font-medium mb-1">
              Nome da Campanha *
            </label>
            <Input
              id="nomeCampanha"
              value={nomeCampanha}
              onChange={(e) => setNomeCampanha(e.target.value)}
              placeholder="Ex: Promoção de Hambúrguer - Maio 2025"
              className="w-full"
              disabled={!isMetaConnected || metaLoading}
              required
            />
          </div>

          <div>
            <label htmlFor="imagem" className="block text-sm font-medium mb-1">
              Imagem do Produto *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              {previewImagem ? (
                <div className="space-y-2 w-full">
                  <img 
                    src={previewImagem} 
                    alt="Preview" 
                    className="mx-auto h-48 object-contain rounded-md"
                  />
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => {
                        setImagem(null);
                        setPreviewImagem('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Remover imagem
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Faça upload de uma imagem</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImagemChange}
                        disabled={!isMetaConnected || metaLoading}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF até 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="descricaoProduto" className="block text-sm font-medium mb-1">
              Descrição do Produto *
            </label>
            <Textarea
              id="descricaoProduto"
              value={descricaoProduto}
              onChange={(e) => setDescricaoProduto(e.target.value)}
              placeholder="Ex: Combo de hambúrguer com batata e refri por R$ 24,90"
              className="w-full h-24"
              disabled={!isMetaConnected || metaLoading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Descreva o produto ou promoção de forma simples e direta.
            </p>
          </div>

          <div>
            <Button
              onClick={gerarLegenda}
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={!descricaoProduto || gerandoLegenda || !isMetaConnected || metaLoading}
            >
              {gerandoLegenda ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Legenda com IA
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Coluna 2: Configurações e Legenda */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="adAccount" className="block text-sm font-medium mb-1">
                Conta de Anúncios *
              </label>
              <Select
                value={selectedAdAccount}
                onValueChange={setSelectedAdAccount}
                disabled={!isMetaConnected || metaLoading || adAccountsList.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {adAccountsList.map((account) => (
                    <SelectItem key={account.value} value={account.value}>
                      {account.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="page" className="block text-sm font-medium mb-1">
                Página do Facebook *
              </label>
              <Select
                value={selectedPage}
                onValueChange={setSelectedPage}
                disabled={!isMetaConnected || metaLoading || pagesList.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma página" />
                </SelectTrigger>
                <SelectContent>
                  {pagesList.map((page) => (
                    <SelectItem key={page.value} value={page.value}>
                      {page.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="orcamento" className="block text-sm font-medium mb-1">
              Orçamento Semanal *
            </label>
            <Select
              value={orcamento}
              onValueChange={setOrcamento}
              disabled={!isMetaConnected || metaLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um valor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">R$ 20,00</SelectItem>
                <SelectItem value="50">R$ 50,00</SelectItem>
                <SelectItem value="70">R$ 70,00</SelectItem>
                <SelectItem value="100">R$ 100,00</SelectItem>
                <SelectItem value="150">R$ 150,00</SelectItem>
                <SelectItem value="200">R$ 200,00</SelectItem>
                <SelectItem value="custom">Outro valor</SelectItem>
              </SelectContent>
            </Select>
            
            {orcamento === 'custom' && (
              <div className="mt-2">
                <Input
                  type="number"
                  value={orcamentoCustom}
                  onChange={(e) => setOrcamentoCustom(e.target.value)}
                  placeholder="Digite o valor em reais"
                  className="w-full"
                  min="20"
                  step="10"
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dataInicio" className="block text-sm font-medium mb-1">
                Data de Início *
              </label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full"
                disabled={!isMetaConnected || metaLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="dataTermino" className="block text-sm font-medium mb-1">
                Data de Término (opcional)
              </label>
              <Input
                id="dataTermino"
                type="date"
                value={dataTermino}
                onChange={(e) => setDataTermino(e.target.value)}
                className="w-full"
                disabled={!isMetaConnected || metaLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="legendaGerada" className="block text-sm font-medium mb-1">
              Legenda Gerada *
            </label>
            <Textarea
              id="legendaGerada"
              value={legendaGerada}
              onChange={(e) => setLegendaGerada(e.target.value)}
              placeholder="A legenda gerada pela IA aparecerá aqui. Você pode editá-la se desejar."
              className="w-full h-32"
              disabled={!isMetaConnected || metaLoading}
              required
            />
          </div>
        </div>
      </div>

      {/* Botão de publicação */}
      <div className="pt-4">
        <Button
          onClick={publicarPostECriarAnuncio}
          className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
          disabled={
            !nomeCampanha || 
            !imagem || 
            !legendaGerada || 
            !selectedAdAccount || 
            !selectedPage || 
            !orcamento || 
            (orcamento === 'custom' && !orcamentoCustom) || 
            publicandoPost || 
            !isMetaConnected || 
            metaLoading
          }
        >
          {publicandoPost ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Publicando...
            </>
          ) : (
            'Publicar Post e Criar Anúncio'
          )}
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Isso irá publicar a imagem com a legenda na sua página do Facebook e criar um anúncio automaticamente.
        </p>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampanhaIA;
