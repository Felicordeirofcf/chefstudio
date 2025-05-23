import React, { useState, useCallback, useEffect } from 'react';
import { Card, Form, Button, Alert, Image, Spinner, Container, Row, Col } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api-fetch';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const UploadCampanha = ({ onCampaignCreated }) => {
  const [nome, setNome] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date());
  const [dataTermino, setDataTermino] = useState(null);
  const [linkCardapio, setLinkCardapio] = useState('');
  const [cta, setCta] = useState('LEARN_MORE');
  const [imagem, setImagem] = useState(null);
  const [previewImagem, setPreviewImagem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState(null);
  const { token } = useAuth();
  const [allFieldsFilled, setAllFieldsFilled] = useState(false);

  const callToActionOptions = [
    { value: 'LEARN_MORE', label: 'Saiba Mais' },
    { value: 'BOOK_TRAVEL', label: 'Reserve Agora' },
    { value: 'ORDER_NOW', label: 'Peça Agora' },
    { value: 'SHOP_NOW', label: 'Compre Agora' },
    { value: 'SIGN_UP', label: 'Cadastre-se' },
    { value: 'DOWNLOAD', label: 'Baixar' },
    { value: 'CONTACT_US', label: 'Entre em Contato' }
  ];

  // Verificar se todos os campos obrigatórios estão preenchidos
  useEffect(() => {
    if (nome && orcamento && dataInicio && linkCardapio && cta) {
      setAllFieldsFilled(true);
    } else {
      setAllFieldsFilled(false);
    }
  }, [nome, orcamento, dataInicio, linkCardapio, cta]);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setImagem(file);
      setPreviewImagem(URL.createObjectURL(file));
      
      // Se todos os campos obrigatórios estiverem preenchidos, criar campanha automaticamente
      if (allFieldsFilled) {
        handleCreateCampaign(file);
      }
    }
  }, [allFieldsFilled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1
  });

  const handleCreateCampaign = async (imageFile) => {
    if (!nome || !orcamento || !dataInicio || !linkCardapio || !cta || !imageFile) {
      setError('Preencha todos os campos obrigatórios e faça upload de uma imagem');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('orcamento', orcamento);
      formData.append('dataInicio', dataInicio.toISOString().split('T')[0]);
      
      if (dataTermino) {
        formData.append('dataTermino', dataTermino.toISOString().split('T')[0]);
      }
      
      formData.append('linkCardapio', linkCardapio);
      formData.append('cta', cta);
      formData.append('imagem', imageFile);

      const response = await api.post('/api/meta/create-from-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setSuccess(true);
      setCreatedCampaign(response.data.adDetails);
      
      // Notificar componente pai sobre a criação da campanha
      if (onCampaignCreated) {
        onCampaignCreated(response.data.adDetails);
      }
      
      // Limpar formulário
      setNome('');
      setOrcamento('');
      setDataInicio(new Date());
      setDataTermino(null);
      setLinkCardapio('');
      setCta('LEARN_MORE');
      setImagem(null);
      setPreviewImagem(null);
    } catch (err) {
      console.error('Erro ao criar campanha:', err);
      setError(err.response?.data?.message || 'Erro ao criar campanha. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (imagem) {
      handleCreateCampaign(imagem);
    } else {
      setError('Faça upload de uma imagem para criar a campanha');
    }
  };

  return (
    <Container className="py-4">
      <Card className="shadow-sm">
        <Card.Header as="h5" className="text-center bg-primary text-white">
          Criar Nova Campanha
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="justify-content-center">
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Nome da Campanha*</Form.Label>
                  <Form.Control
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Promoção de Verão"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Orçamento Diário (R$)*</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="1"
                    value={orcamento}
                    onChange={(e) => setOrcamento(e.target.value)}
                    placeholder="Ex: 10.00"
                    required
                  />
                </Form.Group>

                <Row className="mb-3">
                  <Col>
                    <Form.Group>
                      <Form.Label>Data de Início*</Form.Label>
                      <DatePicker
                        selected={dataInicio}
                        onChange={date => setDataInicio(date)}
                        minDate={new Date()}
                        className="form-control"
                        dateFormat="dd/MM/yyyy"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group>
                      <Form.Label>Data de Término (opcional)</Form.Label>
                      <DatePicker
                        selected={dataTermino}
                        onChange={date => setDataTermino(date)}
                        minDate={dataInicio}
                        className="form-control"
                        dateFormat="dd/MM/yyyy"
                        isClearable
                        placeholderText="Sem data de término"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Link do Cardápio ou Site*</Form.Label>
                  <Form.Control
                    type="url"
                    value={linkCardapio}
                    onChange={(e) => setLinkCardapio(e.target.value)}
                    placeholder="https://seurestaurante.com/cardapio"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Botão de Ação*</Form.Label>
                  <Form.Select
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    required
                  >
                    {callToActionOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Imagem do Anúncio*</Form.Label>
                  <div 
                    {...getRootProps()} 
                    className={`dropzone p-4 text-center border rounded ${isDragActive ? 'border-primary bg-light' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <input {...getInputProps()} />
                    {previewImagem ? (
                      <div className="text-center">
                        <Image 
                          src={previewImagem} 
                          alt="Preview" 
                          style={{ maxHeight: '200px', maxWidth: '100%' }} 
                          thumbnail 
                        />
                        <p className="mt-2">Clique ou arraste para trocar a imagem</p>
                      </div>
                    ) : (
                      <div>
                        {isDragActive ? (
                          <p>Solte a imagem aqui...</p>
                        ) : (
                          <>
                            <p>Arraste e solte uma imagem aqui, ou clique para selecionar</p>
                            {allFieldsFilled && (
                              <p className="text-success">
                                <strong>Todos os campos preenchidos! A campanha será criada automaticamente após o upload da imagem.</strong>
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <small className="text-muted">
                    A campanha será criada automaticamente após o upload da imagem
                  </small>
                </Form.Group>

                {error && (
                  <Alert variant="danger" className="mt-3">
                    {error}
                  </Alert>
                )}

                {success && !loading && (
                  <Alert variant="success" className="mt-3">
                    Campanha criada com sucesso! Você pode visualizá-la na seção "Produtos Anunciados".
                  </Alert>
                )}

                {createdCampaign && (
                  <Card className="mt-4 mb-3">
                    <Card.Header as="h6">Campanha Criada</Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={4}>
                          {createdCampaign.imageUrl && (
                            <Image 
                              src={createdCampaign.imageUrl} 
                              alt={createdCampaign.name} 
                              style={{ maxWidth: '100%' }} 
                              thumbnail 
                            />
                          )}
                        </Col>
                        <Col md={8}>
                          <p><strong>Nome:</strong> {createdCampaign.name}</p>
                          <p><strong>Status:</strong> {createdCampaign.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}</p>
                          <p><strong>Orçamento:</strong> R$ {parseFloat(createdCampaign.dailyBudget).toFixed(2)}/dia</p>
                          {createdCampaign.previewUrl && (
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              href={createdCampaign.previewUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              Visualizar no Facebook
                            </Button>
                          )}
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                <div className="d-grid gap-2 mt-4">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading || !nome || !orcamento || !dataInicio || !linkCardapio || !cta}
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        {' '}Criando campanha...
                      </>
                    ) : 'Criar Campanha'}
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UploadCampanha;
