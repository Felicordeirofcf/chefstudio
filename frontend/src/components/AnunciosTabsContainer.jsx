import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import CampanhaManual from '../CampanhaManual';
import CampanhaIA from '../CampanhaIA';

const AnunciosTabsContainer = () => {
  const [activeTab, setActiveTab] = useState("manual");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Criar Anúncio</h1>
      
      <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="manual">Criar anúncio manualmente</TabsTrigger>
          <TabsTrigger value="ia">Criar anúncio com Inteligência Artificial</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual" className="mt-0">
          <CampanhaManual />
        </TabsContent>
        
        <TabsContent value="ia" className="mt-0">
          <CampanhaIA />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnunciosTabsContainer;
