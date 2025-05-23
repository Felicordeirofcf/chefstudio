import React, { useState, useEffect } from 'react';
import { Card, Button, Container, Row, Col, Badge, Image, Spinner } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api-fetch';

const ProdutosAnunciados = () => {
  const [campanhas, setCampanhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pausingCampaign, setPausingCampaign] = useState(null);
  const { token } = useAuth();

  const fetchCampanhas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/meta/campaigns', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setCampanhas(response.data);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
      setError('Não foi possível carregar as campanhas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCampanhas();
    }
  }, [token]);

  const handlePauseCampaign = async (campaignId) => {
    try {
      setPausingCampaign(campaignId);
      await api.post('/api/meta/pause-campaign', 
        { campaignId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Atualizar a lista de campanhas após pausar
      fetchCampanhas();
    } catch (err) {
      console.error('Erro ao pausar campanha:', err);
      setError('Não foi possível pausar a campanha. Por favor, tente novamente.');
    } finally {
      setPausingCampaign(null);
    }
  };

  if (loading && campanhas.length === 0) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
        <p className="mt-2">Carregando campanhas...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </Container>
    );
  }

  if (campanhas.length === 0) {
    return (
      <Container className="py-4">
        <Card className="text-center">
          <Card.Body>
            <Card.Title>Nenhuma campanha encontrada</Card.Title>
            <Card.Text>
              Você ainda não criou nenhuma campanha. Faça upload de uma imagem para criar sua primeira campanha.
            </Card.Text>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Produtos Anunciados</h2>
      <Row xs={1} md={2} lg={3} className="g-4">
        {campanhas.map((campanha) => (
          <Col key={campanha.id}>
            <Card className="h-100 shadow-sm">
              {campanha.imageUrl && (
                <Card.Img 
                  variant="top" 
                  src={campanha.imageUrl} 
                  alt={campanha.name}
                  style={{ height: '200px', objectFit: 'cover' }}
                />
              )}
              <Card.Body>
                <Card.Title className="d-flex justify-content-between align-items-center">
                  {campanha.name}
                  <Badge bg={campanha.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {campanha.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                  </Badge>
                </Card.Title>
                <Card.Text>
                  <strong>Orçamento:</strong> R$ {parseFloat(campanha.dailyBudget).toFixed(2)}/dia<br />
                  <strong>Início:</strong> {new Date(campanha.startDate).toLocaleDateString('pt-BR')}<br />
                  {campanha.endDate && (
                    <><strong>Término:</strong> {new Date(campanha.endDate).toLocaleDateString('pt-BR')}<br /></>
                  )}
                </Card.Text>
                <div className="d-grid gap-2">
                  {campanha.previewUrl && (
                    <Button 
                      variant="outline-primary" 
                      href={campanha.previewUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      👁️ Visualizar no Facebook
                    </Button>
                  )}
                  {campanha.status === 'ACTIVE' && (
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => handlePauseCampaign(campanha.id)}
                      disabled={pausingCampaign === campanha.id}
                    >
                      {pausingCampaign === campanha.id ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                          {' '}Pausando...
                        </>
                      ) : (
                        <>⏸️ Pausar Campanha</>
                      )}
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default ProdutosAnunciados;
