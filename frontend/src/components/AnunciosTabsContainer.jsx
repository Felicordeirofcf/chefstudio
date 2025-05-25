import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
// Importar os componentes para cada aba
import CampanhaManual from './CampanhaManual'; // <<< DESCOMENTAR E IMPORTAR O COMPONENTE REAL
import CampanhaIA from './CampanhaIA';

// Componente placeholder (pode ser removido ou mantido para referência)
// const CampanhaManualPlaceholder = () => (
//   <div className="p-4 border rounded-md mt-4 bg-gray-50">
//     <h3 className="text-lg font-semibold mb-2">Criar Anúncio Manualmente</h3>
//     <p className="text-sm text-gray-600">O formulário para criação manual de anúncios será exibido aqui (Componente: CampanhaManual).</p>
//   </div>
// );

const AnunciosTabsContainer = () => {
  return (
    <Tabs defaultValue="manual" className="w-full mt-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="manual">Criar Anúncio Manualmente</TabsTrigger>
        <TabsTrigger value="ia">Criar Anúncio com IA</TabsTrigger>
      </TabsList>
      <TabsContent value="manual" className="mt-4">
        {/* Renderizar o componente de criação manual aqui */}
        <CampanhaManual /> {/* <<< SUBSTITUIR PLACEHOLDER PELO COMPONENTE REAL */}
        {/* <CampanhaManualPlaceholder /> */}
      </TabsContent>
      <TabsContent value="ia" className="mt-4">
        {/* Renderizar o componente de criação com IA aqui */}
        <CampanhaIA />
      </TabsContent>
    </Tabs>
  );
};

export default AnunciosTabsContainer;

