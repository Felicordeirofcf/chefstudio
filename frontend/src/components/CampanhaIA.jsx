import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from "../hooks/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { Loader2, Upload, Sparkles, Search } from "lucide-react"; // Adicionado Search icon
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { scrapeIfoodProduct } from '../lib/api'; // <<< IMPORTAR FUNÇÃO DE SCRAPING

const CampanhaIA = () => {
  const { toast } = useToast();

  // Estados para formulário
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [descricaoProduto, setDescricaoProduto] = useState('');
  const [orcamento, setOrcamento] = useState('70');
  const [orcamentoCustom, setOrcamentoCustom] = useState('');
  const [imagem, setImagem] = useState(null); // Para upload manual
  const [previewImagem, setPreviewImagem] = useState(''); // Para preview (manual ou iFood)
  const [scrapedImageUrl, setScrapedImageUrl] = useState(''); // Armazena URL da imagem do iFood
  const [legendaGerada, setLegendaGerada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');

  // Estados iFood Scraping
  const [ifoodUrl, setIfoodUrl] = useState('');
  const [scrapingIfood, setScrapingIfood] = useState(false);
  const [ifoodError, setIfoodError] = useState(null);

  // Estados Meta
  const [adAccountsList, setAdAccountsList] = useState([]);
  const [pagesList, setPagesList] = useState([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [isMetaConnected, setIsMetaConnected] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

  // Estados de controle
  const [loading, setLoading] = useState(false); // Genérico, pode ser removido se não usado
  const [gerandoLegenda, setGerandoLegenda] = useState(false);
  const [publicandoPost, setPublicandoPost] = useState(false);
  const [error, setError] = useState(null); // Erro geral do formulário
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
        // Usar a função getToken da api.ts para consistência
        const token = JSON.parse(localStorage.getItem('user') || '{}').token; 
        if (!token) {
          console.warn("Token não encontrado, usuário não autenticado.");
          setIsMetaConnected(false);
          setMetaLoading(false);
          return;
        }

        const API_BASE_URL = import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app";
        // Usar a instância axios configurada em api.ts se possível, ou continuar com axios direto
        const response = await axios.get(`${API_BASE_URL}/api/meta/connection-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const { isConnected, adAccounts, metaPages } = response.data;
        console.log("Resposta de /api/meta/connection-status:", response.data);

        setIsMetaConnected(isConnected);

        if (isConnected) {
          if (adAccounts && adAccounts.length > 0) {
            setAdAccountsList(adAccounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.id})` })));
            // Manter seleção se ainda válida, senão selecionar primeiro
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
             // Manter seleção se ainda válida, senão selecionar primeiro
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
  // Remover selectedAdAccount e selectedPage das dependências para evitar loop
  }, []); 

  // Função para lidar com upload de imagem manual
  const handleImagemChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagem(file); // Armazena o arquivo para upload
      setScrapedImageUrl(''); // Limpa URL do iFood se houver upload manual
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImagem(reader.result); // Define preview local
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para buscar dados do iFood
  const handleScrapeIfood = async () => {
    if (!ifoodUrl.trim() || !ifoodUrl.includes('ifood.com.br')) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida do iFood.",
        variant: "destructive"
      });
      return;
    }

    setScrapingIfood(true);
    setIfoodError(null);
    setError(null); // Limpa erro geral também

    try {
      const data = await scrapeIfoodProduct(ifoodUrl);
      
      // Preencher campos do formulário
      setNomeCampanha(data.nome || `Campanha ${data.restaurante || 'Restaurante'}`);
      setDescricaoProduto(`${data.nome}${data.descricao ? '\n' + data.descricao : ''}${data.preco ? '\nPreço: R$ ' + data.preco : ''}`);
      setPreviewImagem(data.imagem); // Define preview com URL externa
      setScrapedImageUrl(data.imagem); // Armazena URL externa
      setImagem(null); // Limpa imagem de upload manual
      setLegendaGerada(''); // Limpar legenda antiga

      toast({
        title: "Dados do iFood carregados!",
        description: "Os campos foram preenchidos com as informações do produto.",
      });

    } catch (error) {
      console.error('Erro ao buscar dados do iFood:', error);
      setIfoodError(error.message || 'Falha ao buscar dados do iFood.');
      toast({
        title: "Erro ao buscar dados",
        description: error.message || "Não foi possível carregar os dados da URL informada. Verifique a URL e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setScrapingIfood(false);
    }
  };

  // Função para gerar legenda com IA
  const gerarLegenda = async () => {
    if (!descricaoProduto.trim()) {
      toast({
        title: "Descrição necessária",
        description: "Por favor, digite ou busque uma descrição do produto para gerar a legenda.",
        variant: "destructive"
      });
      return;
    }

    setGerandoLegenda(true);
    setError(null);

    try {
      const token = JSON.parse(localStorage.getItem('user') || '{}').token;
      if (!token) {
        throw new Error('Usuário não autenticado.');
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app";
      const response = await axios.post(
        `${API_BASE_URL}/api/openai/gerar-legenda`,
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
        throw new Error(response.data?.message || 'Resposta inválida do servidor ao gerar legenda.');
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
    // Precisa de imagem (manual ou iFood) e legenda
    if (!nomeCampanha || (!imagem && !scrapedImageUrl) || !legendaGerada || !selectedAdAccount || !selectedPage || !orcamento) {
      toast({
        title: "Campos obrigatórios",
        description: "Verifique o nome da campanha, imagem (upload ou iFood), legenda gerada, conta/página Meta e orçamento.",
        variant: "destructive"
      });
      return;
    }

    setPublicandoPost(true);
    setError(null);

    try {
      const token = JSON.parse(localStorage.getItem('user') || '{}').token;
      if (!token) {
        throw new Error('Usuário não autenticado.');
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app";
      
      // Preparar FormData
      const formData = new FormData();
      formData.append('caption', legendaGerada);
      formData.append('pageId', selectedPage);
      formData.append('adAccountId', selectedAdAccount);
      formData.append('campaignName', nomeCampanha);
      
      // Adicionar imagem: priorizar upload manual, senão usar URL do iFood
      if (imagem) {
        formData.append('image', imagem); // Envia o arquivo
      } else if (scrapedImageUrl) {
        formData.append('imageUrl', scrapedImageUrl); // Envia a URL
        // IMPORTANTE: O backend (/api/meta-ads/publicar-post-criar-anuncio) PRECISA ser ajustado
        // para aceitar 'imageUrl' além de 'image' (arquivo).
        console.warn("Enviando imageUrl para o backend. Certifique-se que o endpoint /publicar-post-criar-anuncio aceita isso.");
      }
      
      // Determinar o orçamento final
      const orcamentoFinal = orcamento === 'custom' ? orcamentoCustom : orcamento;
      formData.append('weeklyBudget', orcamentoFinal);
      
      // Adicionar datas
      formData.append('startDate', dataInicio);
      if (dataTermino) {
        formData.append('endDate', dataTermino);
      }

      // Enviar requisição
      const response = await axios.post(
        `${API_BASE_URL}/api/meta-ads/publicar-post-criar-anuncio`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            // Content-Type é definido automaticamente pelo browser para FormData
          } 
        }
      );

      if (response.data && response.data.success) {
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
        setScrapedImageUrl('');
        setIfoodUrl('');
        setLegendaGerada('');
        setOrcamentoCustom('');
        
        toast({
          title: "Sucesso!",
          description: "Post publicado e anúncio criado com sucesso!",
        });
      } else {
        throw new Error(response.data?.message || 'Resposta inválida do servidor ao criar anúncio.');
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

  // Componente de alerta de sucesso (mantido como antes)
  const SuccessAlert = ({ message, adsUrl, onClose }) => {
    // ... (código do alerta inalterado)
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
      {metaLoading && (
        <div className="flex justify-center items-center p-6"><Loader2 className="h-6 w-6 animate-spin" /> Carregando dados Meta...</div>
      )}
      {!metaLoading && !isMetaConnected && (
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

      {/* Formulário principal - Visível apenas se Meta estiver conectado */}
      {isMetaConnected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna 1: iFood, Upload e Descrição */}
          <div className="space-y-6">
            {/* --- Seção iFood --- */}
            <div>
              <label htmlFor="ifoodUrl" className="block text-sm font-medium mb-1">
                Buscar dados do iFood (Opcional)
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  id="ifoodUrl"
                  type="url"
                  value={ifoodUrl}
                  onChange={(e) => setIfoodUrl(e.target.value)}
                  placeholder="Cole a URL do produto no iFood aqui"
                  className="flex-grow"
                  disabled={scrapingIfood || publicandoPost}
                />
                <Button
                  onClick={handleScrapeIfood}
                  disabled={scrapingIfood || !ifoodUrl.trim() || publicandoPost}
                  variant="outline"
                  size="icon"
                >
                  {scrapingIfood ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {ifoodError && <p className="text-xs text-red-600 mt-1">{ifoodError}</p>}
              <p className="text-xs text-gray-500 mt-1">Cole a URL de um produto do iFood para preencher os campos abaixo automaticamente.</p>
            </div>
            {/* --- Fim Seção iFood --- */}

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
                disabled={publicandoPost}
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
                      // Adicionar tratamento de erro para imagens externas
                      onError={(e) => { e.target.onerror = null; e.target.src='/placeholder-image.png'; /* ou alguma imagem padrão */ }}
                    />
                    <div className="flex justify-center">
                      <Button 
                        onClick={() => {
                          setImagem(null);
                          setPreviewImagem('');
                          setScrapedImageUrl('');
                        }}
                        variant="outline"
                        size="sm"
                        disabled={publicandoPost}
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
                        className={`relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 ${publicandoPost ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span>Faça upload de uma imagem</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleImagemChange}
                          disabled={publicandoPost}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF até 10MB
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Faça upload ou use a busca do iFood acima.</p>
            </div>

            <div>
              <label htmlFor="descricaoProduto" className="block text-sm font-medium mb-1">
                Descrição do Produto (para IA) *
              </label>
              <Textarea
                id="descricaoProduto"
                value={descricaoProduto}
                onChange={(e) => setDescricaoProduto(e.target.value)}
                placeholder="Ex: Combo de hambúrguer artesanal (180g), pão brioche, queijo cheddar, bacon crocante, alface, tomate e molho especial. Acompanha batata frita e refrigerante lata."
                rows={4}
                className="w-full"
                disabled={publicandoPost}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Usado para gerar a legenda do anúncio com IA.</p>
            </div>
          </div>

          {/* Coluna 2: Legenda, Orçamento, Datas e Publicação */}
          <div className="space-y-6">
            <div>
              <label htmlFor="legendaGerada" className="block text-sm font-medium mb-1">
                Legenda do Anúncio (Gerada por IA) *
              </label>
              <Textarea
                id="legendaGerada"
                value={legendaGerada}
                onChange={(e) => setLegendaGerada(e.target.value)}
                placeholder="Clique em 'Gerar Legenda com IA' abaixo ou edite manualmente."
                rows={6}
                className="w-full"
                disabled={publicandoPost}
                required
              />
              <Button
                onClick={gerarLegenda}
                disabled={gerandoLegenda || !descricaoProduto.trim() || publicandoPost}
                className="mt-2 w-full"
              >
                {gerandoLegenda ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Gerar Legenda com IA</>
                )}
              </Button>
            </div>

            <div>
              <label htmlFor="orcamento" className="block text-sm font-medium mb-1">
                Orçamento Semanal (R$) *
              </label>
              <Select 
                value={orcamento} 
                onValueChange={setOrcamento}
                disabled={publicandoPost}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o orçamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="70">R$ 70 (R$ 10/dia)</SelectItem>
                  <SelectItem value="140">R$ 140 (R$ 20/dia)</SelectItem>
                  <SelectItem value="210">R$ 210 (R$ 30/dia)</SelectItem>
                  <SelectItem value="350">R$ 350 (R$ 50/dia)</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {orcamento === 'custom' && (
                <Input
                  type="number"
                  value={orcamentoCustom}
                  onChange={(e) => setOrcamentoCustom(e.target.value)}
                  placeholder="Digite o valor semanal (Ex: 100)"
                  className="mt-2"
                  min="10" // Orçamento mínimo razoável
                  disabled={publicandoPost}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dataInicio" className="block text-sm font-medium mb-1">
                  Data de Início *
                </label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} // Não permitir data passada
                  disabled={publicandoPost}
                  required
                />
              </div>
              <div>
                <label htmlFor="dataTermino" className="block text-sm font-medium mb-1">
                  Data de Término (Opcional)
                </label>
                <Input
                  id="dataTermino"
                  type="date"
                  value={dataTermino}
                  onChange={(e) => setDataTermino(e.target.value)}
                  min={dataInicio || new Date().toISOString().split('T')[0]} // Não antes do início
                  disabled={publicandoPost}
                />
              </div>
            </div>

            {/* Seletores Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                <label htmlFor="adAccount" className="block text-sm font-medium mb-1">
                  Conta de Anúncios *
                </label>
                <Select 
                  value={selectedAdAccount} 
                  onValueChange={setSelectedAdAccount}
                  disabled={publicandoPost || adAccountsList.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={adAccountsList.length > 0 ? "Selecione a conta" : "Nenhuma conta encontrada"} />
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
                  disabled={publicandoPost || pagesList.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={pagesList.length > 0 ? "Selecione a página" : "Nenhuma página encontrada"} />
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

            {/* Botão de Publicar */}
            <div>
              <Button
                onClick={publicarPostECriarAnuncio}
                disabled={publicandoPost || gerandoLegenda || scrapingIfood || !isMetaConnected}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {publicandoPost ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando e Criando Anúncio...</>
                ) : (
                  "Publicar Post e Criar Anúncio"
                )}
              </Button>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampanhaIA;

