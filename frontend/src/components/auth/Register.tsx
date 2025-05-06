import {
  Button
} from "../ui/button";
import {
  Input
} from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select" // Import Select components
import {
  Link,
  useNavigate
} from "react-router-dom";
import {
  useState
} from 'react';
import {
  registerUser
} from "../../lib/api"; // Import the REAL API function
import {
  useToast
} from "../../hooks/use-toast";
import {
  Toaster
} from "../ui/toaster";

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // User Account State
  const [name, setName] = useState(""); // Responsible person's name
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Establishment State
  const [establishmentName, setEstablishmentName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [menuLink, setMenuLink] = useState(""); // Optional

  // Address State (Optional)
  const [address, setAddress] = useState("");
  const [cep, setCep] = useState("");

  // UI State
  const [error, setError] = useState < string | null > (null);
  const [loading, setLoading] = useState(false);

  const imageUrl = "/image.png"; // Reuse login image or use a different one

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Frontend Validations
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!name || !email || !establishmentName || !businessType || !whatsapp) {
        setError("Por favor, preencha todos os campos obrigatórios.");
        return;
    }
    // Basic WhatsApp format check (optional, backend does more thorough check)
    if (!/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(whatsapp)) {
        setError("Formato de WhatsApp inválido (ex: (11) 98765-4321).");
        return;
    }

    setLoading(true);
    try {
      // Consolidate all data
      const userData = {
        name,
        email,
        password,
        establishmentName,
        businessType,
        whatsapp,
        menuLink,
        address,
        cep
      };
      const response = await registerUser(userData);
      console.log("Registration successful:", response);
      toast({
        title: "Cadastro realizado!",
        description: "Sua conta foi criada com sucesso.",
      });
      // api.ts handles saving to localStorage
      navigate("/dashboard"); // Navigate to dashboard on successful registration
    } catch (err: any) {
      console.error("Registration failed:", err.message);
      setError(err.message || "Falha no cadastro. Verifique os dados e tente novamente.");
      toast({
        title: "Erro no Cadastro",
        description: err.message || "Não foi possível criar sua conta.",
        variant: "destructive",
      });
      localStorage.removeItem('userInfo'); // Ensure no partial data is stored
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12">
      <div className="flex w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden mx-4 sm:mx-0">
        {/* Image Section */}
        <div className="w-1/2 hidden md:block relative">
           <img
            src={imageUrl}
            alt="ChefiaStudio Cadastro"
            className="object-cover w-full h-full"
          />
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-gray-800">Crie sua Conta</h2>
          <p className="text-center text-gray-500 mb-6">Preencha os dados abaixo para começar.</p>

          <form onSubmit={handleRegister} className="space-y-3">
            {/* Account Info */}
            <Input
              id="name"
              type="text"
              placeholder="Nome do Responsável *"
              required
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <Input
              id="email"
              type="email"
              placeholder="E-mail *"
              required
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <Input
              id="password"
              type="password"
              placeholder="Senha (mínimo 6 caracteres) *"
              required
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
             <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirmar Senha *"
              required
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />

            {/* Establishment Info */}
            <Input
              id="establishmentName"
              type="text"
              placeholder="Nome do Estabelecimento *"
              required
              value={establishmentName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEstablishmentName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {/* Use Select for Business Type */}
            <Select required value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-500">
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
            <Input
              id="whatsapp"
              type="text"
              placeholder="WhatsApp (com DDD) *"
              required
              value={whatsapp}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWhatsapp(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <Input
              id="menuLink"
              type="url"
              placeholder="Link do Cardápio (Opcional)"
              value={menuLink}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMenuLink(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />

            {/* Address Info (Optional) */}
             <Input
              id="address"
              type="text"
              placeholder="Endereço Completo (Opcional)"
              value={address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
             <Input
              id="cep"
              type="text"
              placeholder="CEP (Opcional, ex: 12345-678)"
              value={cep}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCep(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />

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

