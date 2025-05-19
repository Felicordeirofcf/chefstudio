import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Carregar notificações ao montar o componente
  useEffect(() => {
    fetchNotifications();
    
    // Configurar polling para verificar novas notificações a cada 30 segundos
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/notifications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
      
      // Mostrar toast para novas notificações
      if (silent && response.data.unreadCount > unreadCount) {
        toast({
          title: 'Novas notificações',
          description: `Você tem ${response.data.unreadCount - unreadCount} novas notificações.`,
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      if (!silent) {
        toast({
          title: 'Erro ao carregar notificações',
          description: error.response?.data?.message || 'Não foi possível carregar as notificações.',
          variant: 'destructive'
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await api.patch(`/notifications/${id}/read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Atualizar estado local
      setNotifications(notifications.map(notification => 
        notification._id === id ? { ...notification, read: true } : notification
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar a notificação como lida.',
        variant: 'destructive'
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await api.patch('/notifications/read-all', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Atualizar estado local
      setNotifications(notifications.map(notification => ({ ...notification, read: true })));
      setUnreadCount(0);
      
      toast({
        title: 'Sucesso',
        description: 'Todas as notificações foram marcadas como lidas.',
        variant: 'success'
      });
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar todas as notificações como lidas.',
        variant: 'destructive'
      });
    }
  };

  const deleteNotification = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await api.delete(`/notifications/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Atualizar estado local
      const updatedNotifications = notifications.filter(notification => notification._id !== id);
      setNotifications(updatedNotifications);
      
      // Recalcular não lidas
      const newUnreadCount = updatedNotifications.filter(notification => !notification.read).length;
      setUnreadCount(newUnreadCount);
      
      toast({
        title: 'Sucesso',
        description: 'Notificação excluída com sucesso.',
        variant: 'success'
      });
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a notificação.',
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'campaign_status':
        return '🚀';
      case 'budget_alert':
        return '💰';
      case 'performance_alert':
        return '📈';
      case 'account_alert':
        return '⚠️';
      case 'system':
      default:
        return '🔔';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>
      
      {isOpen && (
        <Card className="absolute right-0 mt-2 w-80 z-50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Notificações</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Marcar todas como lidas
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-4">Carregando...</p>
            ) : notifications.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">Nenhuma notificação</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {notifications.map(notification => (
                    <div 
                      key={notification._id} 
                      className={`p-3 rounded-md relative ${notification.read ? 'bg-background' : 'bg-muted'}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="text-xl">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">{formatDate(notification.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2 justify-end">
                        {!notification.read && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => markAsRead(notification._id)}
                          >
                            Marcar como lida
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteNotification(notification._id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationCenter;
