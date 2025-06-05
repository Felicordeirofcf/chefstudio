
import React, { useState, useEffect } from 'react';
import { useToast } from "../hooks/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { Loader2, Upload, Sparkles, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { scrapeIfoodProduct, api } from '../lib/api'; // <<< Importar api e scrapeIfoodProduct
import { useMetaAds } from '../contexts/MetaAdsContext'; // <<< IMPORTAR useMetaAds

const CampanhaIA = () => {
  const { toast } = useToast();
  const { metaStatus, loading: metaLoadingContext, error: metaErrorContext, adAccounts, pages } = useMetaAds(); // <<< USAR CONTEXTO META

  // Estados para formulário
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [descricaoProduto, setDescricaoProduto] = useState('');
  const [orcamento, setOrcamento] = useState('70');
  const [orcamentoCustom, setOrcamentoCustom] = useState('');
  const [imagem, setImagem] = useState(null);
  const [previewImagem, setPreviewImagem] = useState('');
  const [scrapedImageUrl, setScrapedImageUrl] = useState('');
  const [legendaGerada, setLegendaGerada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');

  // Estados iFood Scraping
  const [ifoodUrl, setIfoodUrl] = useState('');
  const [scrapingIfood, setScrapingIfood] = useState(false);
  const [ifoodError, setIfoodError] = useState(null);

  // Estados para seleção Meta (mantidos localmente para o formulário)
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [selectedPage, setSelectedPage] = useState('');

  // Estados de controle
  const [gerandoLegenda, setGerandoLegenda] = useState(false);
  const [publicandoPost, setPublicandoPost] = useState(false);
  const [error, setError] = useState(null); // Erro geral do formulário
  const [successAlert, setSuccessAlert] = useState(null);

  // Definir data de início padrão
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDataInicio(today);
  }, []);

  // <<< REMOVIDO: useEffect para buscar status Meta - agora vem do contexto >>>

  // Efeito para pré-selecionar a primeira conta/página quando carregadas do contexto
  useEffect(() => {
    if (!metaLoadingContext && metaStatus.status === 'connected') {
      if (adAccounts.length > 0 && !selectedAdAccount) {
        setSelectedAdAccount(adAccounts[0].id);
      }
      if (pages.length > 0 && !selectedPage) {
        setSelectedPage(pages[0].id);
      }
    }
    // Resetar seleção se desconectar
    if (metaStatus.status !== 'connected') {
        setSelectedAdAccount('');
        setSelectedPage('');
    }
  }, [metaLoadingContext, metaStatus.status, adAccounts, pages, selectedAdAccount, selectedPage]);

  // Função para lidar com upload de imagem manual
  const handleImagemChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagem(file);
      setScrapedImageUrl('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImagem(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para buscar dados do iFood
  const handleScrapeIfood = async () => {
    if (!ifoodUrl.trim() || !ifoodUrl.includes('ifood.com.br')) {
      toast({ title: "URL inválida", description: "Por favor, insira uma URL válida do iFood.", variant: "destructive" });
      return;
    }
    setScrapingIfood(true);
    setIfoodError(null);
    setError(null);
    try {
      const data = await scrapeIfoodProduct(ifoodUrl);
      setNomeCampanha(data.nome || `Campanha ${data.restaurante || 'Restaurante'}`);
      setDescricaoProduto(`${data.nome}${data.descricao ? '\n' + data.descricao : ''}${data.preco ? '\nPreço: R$ ' + data.preco : ''}`);
      setPreviewImagem(data.imagem);
      setScrapedImageUrl(data.imagem);
      setImagem(null);
      setLegendaGerada('');
      toast({ title: "Dados do iFood carregados!", description: "Os campos foram preenchidos com as informações do produto." });
    } catch (error) {
      console.error('Erro ao buscar dados do iFood:', error);
      setIfoodError(error.message || 'Falha ao buscar dados do iFood.');
      toast({ title: "Erro ao buscar dados", description: error.message || "Não foi possível carregar os dados da URL informada.", variant: "destructive" });
    } finally {
      setScrapingIfood(false);
    }
  };

  // Função para gerar legenda com IA
  const gerarLegenda = async () => {
    if (!descricaoProduto.trim()) {
      toast({ title: "Descrição necessária", description: "Digite ou busque uma descrição para gerar a legenda.", variant: "destructive" });
      return;
    }
    setGerandoLegenda(true);
    setError(null);
    try {
      // Usar a instância 'api' centralizada
      const response = await api.post('/api/openai/gerar-legenda', { descricao: descricaoProduto });
      if (response.data && response.data.success && response.data.legenda) {
        setLegendaGerada(response.data.legenda);
        toast({ title: "Legenda gerada com sucesso!", description: "A legenda foi criada com IA." });
      } else {
        throw new Error(response.data?.message || 'Resposta inválida ao gerar legenda.');
      }
    } catch (error) {
      console.error('Erro ao gerar legenda:', error.response?.data || error.message);
      setError('Falha ao gerar legenda. Tente novamente.');
      toast({ title: "Erro ao gerar legenda", description: error.response?.data?.message || "Ocorreu um erro.", variant: "destructive" });
    } finally {
      setGerandoLegenda(false);
    }
  };

  // Função para publicar post e criar anúncio
  const publicarPostECriarAnuncio = async () => {
    if (!nomeCampanha || (!imagem && !scrapedImageUrl) || !legendaGerada || !selectedAdAccount || !selectedPage || !orcamento) {
      toast({ title: "Campos obrigatórios", description: "Verifique nome, imagem, legenda, conta/página Meta e orçamento.", variant: "destructive" });
      return;
    }
    setPublicandoPost(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('caption', legendaGerada);
      formData.append('pageId', selectedPage);
      formData.append('adAccountId', selectedAdAccount); // Enviar ID sem 'act_'
      formData.append('campaignName', nomeCampanha);
      if (imagem) {
        formData.append('image', imagem);
      } else if (scrapedImageUrl) {
        formData.append('imageUrl', scrapedImageUrl);
      }
      const orcamentoFinal = orcamento === 'custom' ? orcamentoCustom : orcamento;
      formData.append('weeklyBudget', orcamentoFinal);
      formData.append('startDate', dataInicio);
      if (dataTermino) {
        formData.append('endDate', dataTermino);
      }

      // Usar a instância 'api' centralizada
      const response = await api.post('/api/meta-ads/publicar-post-criar-anuncio', formData);

      if (response.data && response.data.success) {
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR') + ' - ' + dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setSuccessAlert({
          message: `Anúncio criado com sucesso em ${dataFormatada}`,
          adsUrl: response.data.adsManagerUrl // Usar URL retornada pela API
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
        toast({ title: "Sucesso!", description: "Post publicado e anúncio criado!" });
      } else {
        throw new Error(response.data?.message || 'Resposta inválida ao criar anúncio.');
      }
    } catch (error) {
      console.error('Erro ao publicar post e criar anúncio:', error.response?.data || error.message);
      setError('Falha ao publicar post e criar anúncio.');
      toast({ title: "Erro ao criar anúncio", description: error.response?.data?.message || "Ocorreu um erro.", variant: "destructive" });
    } finally {
      setPublicandoPost(false);
    }
  };

  // Componente de alerta de sucesso (mantido como antes)
  const SuccessAlert = ({ message, adsUrl, onClose }) => {
    return (
      <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-lg z-50 animate-fade-in">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {/* Icone SVG */}
          </div>
          <div className="ml-3 w-full">
            <p className="text-sm font-medium text-green-800">🎉 {message}</p>
            {adsUrl && (
              <div className="mt-2">
                <a href={adsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                  Ver no Ads Manager
                </a>
              </div>
            )}
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button onClick={onClose} className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                <span className="sr-only">Fechar</span>
                {/* Icone SVG Fechar */}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Determinar se o botão principal deve estar desabilitado
  const isSubmitDisabled = publicandoPost || gerandoLegenda || scrapingIfood || metaLoadingContext || metaStatus.status !== 'connected';

  return (
    <div className="space-y-6">
      {successAlert && (
        <SuccessAlert
          message={successAlert.message}
          adsUrl={successAlert.adsUrl}
          onClose={() => setSuccessAlert(null)}
        />
      )}

      {/* Seção de conexão Meta - Usa estado do contexto */}
      {metaLoadingContext && (
        <div className="flex justify-center items-center p-6"><Loader2 className="h-6 w-6 animate-spin" /> Carregando dados Meta...</div>
      )}
      {!metaLoadingContext && metaStatus.status !== 'connected' && (
        <Card className="p-6 bg-amber-50 border-amber-200">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Conecte sua conta Meta Ads</h2>
          <p className="text-amber-700 mb-4">Para criar anúncios com IA, você precisa conectar sua conta do Facebook/Instagram.</p>
          {/* Pode adicionar um botão para ir para a conexão aqui se desejar */}
        </Card>
      )}
      {/* Exibir erro do contexto Meta se houver */}
      {!metaLoadingContext && metaErrorContext && (
          <Card className="p-4 bg-red-50 border-red-200 text-red-700">
              Erro ao carregar dados Meta: {metaErrorContext.message || 'Tente recarregar.'}
          </Card>
      )}

      {/* Formulário principal - Habilitado apenas se Meta estiver conectado */}
      {metaStatus.status === 'connected' && (
        <Card className="p-6 space-y-4">
          {/* Seção iFood */}
          <div className="space-y-2">
            <label htmlFor="ifoodUrl" className="text-sm font-medium">Buscar dados do iFood (Opcional)</label>
            <div className="flex gap-2">
              <Input
                id="ifoodUrl"
                type="url"
                placeholder="Cole a URL do produto no iFood aqui"
                value={ifoodUrl}
                onChange={(e) => setIfoodUrl(e.target.value)}
                disabled={scrapingIfood}
              />
              <Button onClick={handleScrapeIfood} disabled={scrapingIfood || !ifoodUrl.trim()}>
                {scrapingIfood ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
              </Button>
            </div>
            {ifoodError && <p className="text-sm text-red-600">{ifoodError}</p>}
          </div>

          {/* Campos do formulário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna Esquerda */}
            <div className="space-y-4">
              <div>
                <label htmlFor="nomeCampanha" className="text-sm font-medium">Nome da Campanha</label>
                <Input id="nomeCampanha" value={nomeCampanha} onChange={(e) => setNomeCampanha(e.target.value)} placeholder="Ex: Promoção de Hambúrguer" />
              </div>
              <div>
                <label htmlFor="descricaoProduto" className="text-sm font-medium">Descrição do Produto/Oferta</label>
                <Textarea id="descricaoProduto" value={descricaoProduto} onChange={(e) => setDescricaoProduto(e.target.value)} placeholder="Descreva o produto ou a oferta que será anunciada." rows={4} />
              </div>
              <div>
                <label htmlFor="imagem" className="text-sm font-medium">Imagem do Anúncio</label>
                <div className="flex items-center gap-4">
                  <Input id="imagem" type="file" accept="image/*" onChange={handleImagemChange} className="flex-1" />
                  {previewImagem && <img src={previewImagem} alt="Preview" className="h-16 w-16 object-cover rounded" />}
                </div>
                <p className="text-xs text-gray-500 mt-1">Faça upload ou use a imagem buscada do iFood.</p>
              </div>
              <div>
                <Button onClick={gerarLegenda} disabled={gerandoLegenda || !descricaoProduto.trim()} className="w-full">
                  {gerandoLegenda ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />} Gerar Legenda com IA
                </Button>
              </div>
              {legendaGerada && (
                <div>
                  <label className="text-sm font-medium">Legenda Gerada</label>
                  <Textarea value={legendaGerada} readOnly rows={4} className="bg-gray-50" />
                </div>
              )}
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              <div>
                <label htmlFor="adAccount" className="text-sm font-medium">Conta de Anúncios Meta</label>
                <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount} disabled={metaLoadingContext || adAccounts.length === 0}>
                  <SelectTrigger id="adAccount">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {adAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {adAccounts.length === 0 && !metaLoadingContext && <p className="text-xs text-red-600 mt-1">Nenhuma conta de anúncios encontrada.</p>}
              </div>
              <div>
                <label htmlFor="page" className="text-sm font-medium">Página do Facebook</label>
                <Select value={selectedPage} onValueChange={setSelectedPage} disabled={metaLoadingContext || pages.length === 0}>
                  <SelectTrigger id="page">
                    <SelectValue placeholder="Selecione a página" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>{page.name} ({page.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pages.length === 0 && !metaLoadingContext && <p className="text-xs text-red-600 mt-1">Nenhuma página encontrada.</p>}
              </div>
              <div>
                <label htmlFor="orcamento" className="text-sm font-medium">Orçamento Semanal (R$)</label>
                <Select value={orcamento} onValueChange={setOrcamento}>
                  <SelectTrigger id="orcamento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="70">R$ 70 (R$ 10/dia)</SelectItem>
                    <SelectItem value="140">R$ 140 (R$ 20/dia)</SelectItem>
                    <SelectItem value="210">R$ 210 (R$ 30/dia)</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {orcamento === 'custom' && (
                  <Input
                    type="number"
                    placeholder="Digite o valor semanal"
                    value={orcamentoCustom}
                    onChange={(e) => setOrcamentoCustom(e.target.value)}
                    className="mt-2"
                    min="7" // Orçamento mínimo diário de R$1
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dataInicio" className="text-sm font-medium">Data de Início</label>
                  <Input id="dataInicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label htmlFor="dataTermino" className="text-sm font-medium">Data de Término (Opcional)</label>
                  <Input id="dataTermino" type="date" value={dataTermino} onChange={(e) => setDataTermino(e.target.value)} min={dataInicio} />
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Ação */}
          <div className="pt-4 border-t">
            {error && <p className="text-sm text-red-600 mb-4">Erro: {error}</p>}
            <Button onClick={publicarPostECriarAnuncio} disabled={isSubmitDisabled} className="w-full">
              {publicandoPost ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Publicar Post e Criar Anúncio
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CampanhaIA;

