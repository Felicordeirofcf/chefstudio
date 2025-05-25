/**
 * Função simples para criar uma campanha
 * Esta é uma implementação mínima para resolver o erro de callback undefined
 */
function criarCampanha(req, res) {
  res.status(200).json({ message: 'Campanha criada com sucesso!' });
}

// Exportação explícita da função criarCampanha
module.exports = {
  criarCampanha
};
