import { Button } from "../ui/button";
import { Input } from "../ui/input";

import { useNavigate } from "react-router-dom"; // Import useNavigate
import { useState } from 'react';
import { saveRestaurantInfo } from "../../lib/api"; // Import the simulated API function

export default function RestaurantInfoForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    restaurantName: "",
    businessType: "",
    address: "",
    whatsapp: "",
    menuLink: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Placeholder image URL from mockup analysis (replace if a real image is provided)
  const imageUrl = "/home/ubuntu/upload/image.png"; // Assuming the third image was the restaurant info form

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Use the simulated save function
      const response = await saveRestaurantInfo(formData);
      console.log("Restaurant info saved (simulated):", response);
      // Navigate to the next step (Meta Connect)
      navigate("/connect-meta");
    } catch (err: any) {
      console.error("Failed to save info (simulated):", err.message);
      setError(err.message || "Falha ao salvar informações.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden mx-4 sm:mx-0">
        {/* Image Section */}
        <div className="w-1/2 hidden md:block relative">
           <img
            src={imageUrl} // Using the uploaded image path - THIS WON'T WORK DIRECTLY IN BROWSER LATER
            alt="Menu de bebidas"
            className="object-cover w-full h-full"
          />
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">Preencha os dados a seguir</h2>
          <p className="text-center text-gray-500 mb-8">Informe os detalhes do seu estabelecimento</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input 
                id="restaurantName" 
                type="text" 
                placeholder="Nome do estabelecimento" 
                required 
                value={formData.restaurantName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <Input 
                id="businessType" 
                type="text" 
                placeholder="Tipo de negócio" 
                required 
                value={formData.businessType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <Input 
                id="address" 
                type="text" 
                placeholder="Endereço completo do estabelecimento" 
                required 
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <Input 
                id="whatsapp" 
                type="tel" 
                placeholder="Whatsapp (com DDD)" 
                required 
                value={formData.whatsapp}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <Input 
                id="menuLink" 
                type="url" 
                placeholder="Link do seu cardápio (ifood, cardápio digital)" 
                required 
                value={formData.menuLink}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
             {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-md font-semibold transition duration-300 mt-6 disabled:opacity-50"
            >
              {loading ? "Salvando..." : "AVANÇAR"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

