import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { registerUser } from "../../lib/api";
import { useToast } from "../../hooks/use-toast";
import { Toaster } from "../ui/toaster";

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [establishmentName, setEstablishmentName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [menuLink, setMenuLink] = useState("");
  const [address, setAddress] = useState("");
  const [cep, setCep] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const imageUrl = "/image.png";

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!name || !email || !establishmentName || !businessType || !whatsapp) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(whatsapp)) {
      setError("Formato de WhatsApp inválido (ex: (11) 98765-4321).");
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name,
        email,
        password,
        establishmentName,
        businessType,
        whatsapp,
        menuLink,
        address,
        cep,
      };

      const response = await registerUser(userData);

      if (!response?.token || !response?.email) {
        throw new Error("Erro no cadastro: resposta incompleta.");
      }

      // Armazena no localStorage de forma uniforme
      localStorage.setItem("userInfo", JSON.stringify({
        token: response.token,
        _id: response._id,
        name: response.name,
        email: response.email,
        metaUserId: response.metaUserId,
        metaConnectionStatus: response.metaConnectionStatus,
        isMetaConnected: response.metaConnectionStatus === "connected"
      }));

      toast({
        title: "Cadastro realizado!",
        description: "Sua conta foi criada com sucesso.",
      });

      if (response.metaConnectionStatus === "connected") {
        navigate("/dashboard");
      } else {
        navigate("/connect-meta");
      }

    } catch (err: any) {
      console.error("Falha ao registrar:", err);
      setError(err.message || "Erro ao registrar. Verifique os dados.");
      toast({
        title: "Erro no Cadastro",
        description: err.message || "Não foi possível criar sua conta.",
        variant: "destructive",
      });
      localStorage.removeItem("userInfo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12">
      <div className="flex w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden mx-4 sm:mx-0">
        <div className="w-1/2 hidden md:block relative">
          <img
            src={imageUrl}
            alt="ChefiaStudio Cadastro"
            className="object-cover w-full h-full"
          />
        </div>

        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-gray-800">Crie sua Conta</h2>
          <p className="text-center text-gray-500 mb-6">Preencha os dados abaixo para começar.</p>

          <form onSubmit={handleRegister} className="space-y-3">
            <Input id="name" type="text" placeholder="Nome do Responsável *" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input id="email" type="email" placeholder="E-mail *" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input id="password" type="password" placeholder="Senha *" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Input id="confirmPassword" type="password" placeholder="Confirmar Senha *" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            <Input id="establishmentName" type="text" placeholder="Nome do Estabelecimento *" value={establishmentName} onChange={(e) => setEstablishmentName(e.target.value)} required />

            <Select value={businessType} onValueChange={setBusinessType} required>
              <SelectTrigger className="text-gray-500">
                <SelectValue placeholder="Tipo de Negócio *" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Restaurante">Restaurante</SelectItem>
                <SelectItem value="Pizzaria">Pizzaria</SelectItem>
                <SelectItem value="Hamburgueria">Hamburgueria</SelectItem>
                <SelectItem value="Bar">Bar</SelectItem>
                <SelectItem value="Cafeteria">Cafeteria</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>

            <Input id="whatsapp" type="text" placeholder="WhatsApp *" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
            <Input id="menuLink" type="url" placeholder="Link do Cardápio (Opcional)" value={menuLink} onChange={(e) => setMenuLink(e.target.value)} />
            <Input id="address" type="text" placeholder="Endereço (Opcional)" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Input id="cep" type="text" placeholder="CEP (Opcional)" value={cep} onChange={(e) => setCep(e.target.value)} />

            {error && <p className="text-red-500 text-xs text-center py-2">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-md font-semibold transition duration-300 disabled:opacity-50 mt-4"
            >
              {loading ? "Registrando..." : "REGISTRAR"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Já tem uma conta?{" "}
              <Link to="/" className="text-purple-600 hover:underline font-medium">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
