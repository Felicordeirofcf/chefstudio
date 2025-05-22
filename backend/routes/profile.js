const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/user');

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Obtém o perfil completo do usuário logado
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil do usuário obtido com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Formatar resposta com dados do restaurante
    const profileData = {
      id: user._id,
      name: user.name,
      email: user.email,
      restaurantName: user.establishmentName || '',
      businessType: user.businessType || '',
      whatsapp: user.whatsapp || '',
      menuLink: user.menuLink || '',
      address: user.address || '',
      cep: user.cep || '',
      plan: user.plan || 'free',
      metaConnectionStatus: user.metaConnectionStatus || 'disconnected',
      metaConnectedAt: user.metaConnectedAt || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.json(profileData);
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar perfil do usuário', 
      error: error.message 
    });
  }
});

module.exports = router;
