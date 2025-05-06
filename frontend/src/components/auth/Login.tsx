import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useState } from 'react';
import { loginUser } from "../../lib/api"; // Import the REAL API function

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const imageUrl = "/image.png"; // Path relative to the public folder

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Use the REAL login function
      const response = await loginUser({ email, password });
      console.log("Login successful:", response);
      // api.ts now handles saving to localStorage

      // Check if Meta is connected and redirect accordingly
      if (response.isMetaConnected) {
        navigate("/dashboard"); // Navigate to dashboard if Meta is already connected
      } else {
        navigate("/connect-meta"); // Navigate to Meta connection step if not connected
      }

    } catch (err: any) {
      console.error("Login failed:", err.message);
      setError(err.message || "Falha no login. Verifique suas credenciais.");
      // Clear potentially stored invalid token if login fails after a previous session
      localStorage.removeItem('userInfo');
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
            src={imageUrl}
            alt="Chef sorrindo"
            className="object-cover w-full h-full"
          />
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-center mb-4 text-gray-800">Bem vindo(a)</h2>
          <p className="text-center text-gray-500 mb-10">Faça login para continuar</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Input
                id="email"
                type="email"
                placeholder="E-mail"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <Input
                id="password"
                type="password"
                placeholder="Senha"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-md font-semibold transition duration-300 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "ENTRAR"}
            </Button>
          </form>

          <div className="mt-5 text-center">
            {/* Link to a future forgot password page */}
            {/* <Link to="/forgot-password" className="text-sm text-purple-600 hover:underline">
              Esqueci minha senha
            </Link> */}
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Não tem uma conta?{" "}
              <Link to="/register" className="text-purple-600 hover:underline font-medium">
                Crie uma agora
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

