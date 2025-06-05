
import React from 'react';
import MetaAdsConnection from '../MetaAdsConnection'; // Import the existing component
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'; // Import Card components for layout

const ConnectMeta = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Conexão com Meta Ads</CardTitle>
          <CardDescription>
            Gerencie a conexão da sua conta com o Meta Ads para habilitar a criação e o gerenciamento de anúncios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Render the existing MetaAdsConnection component */}
          <MetaAdsConnection />
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectMeta;

