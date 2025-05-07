import axios from 'axios';

// ✅ Use variável de ambiente para funcionar em produção e desenvolvimento
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Função para buscar o token do localStorage
const getToken = () => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      const parsedInfo = JSON.parse(userInfo);
      return parsedInfo.token;
    } catch (e) {
      console.error("Erro ao ler userInfo:", e);
      localStorage.removeItem('userInfo');
      return null;
    }
  }
  return null;
};

// ✅ Instância do axios usando a base dinâmica
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to include the token in headers
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Real API Functions ---

// Auth
export const registerUser = async (userData: any) => {
  try {
    const response = await api.post(`/auth/register`, userData);
    // Save user info (including token and meta status) to localStorage upon successful registration
    if (response.data && response.data.token) {
      localStorage.setItem('userInfo', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error: any) {
    console.error("Registration error:", error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || "Erro ao registrar usuário.");
  }
};

export const loginUser = async (credentials: any) => {
  try {
    const response = await api.post(`/auth/login`, credentials);
    // Save user info (including token and meta status) to localStorage upon successful login
    if (response.data && response.data.token) {
      localStorage.setItem('userInfo', JSON.stringify(response.data));
    }
    return response.data; // Contains isMetaConnected flag
  } catch (error: any) {
    console.error("Login error:", error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || "Credenciais inválidas.");
  }
};

export const logoutUser = () => {
  // Remove user info from localStorage
  localStorage.removeItem('userInfo');
  // Optionally: redirect to login page or refresh the app state
};

export const getUserProfile = async () => {
  try {
    const response = await api.get(`/auth/profile`);
    return response.data;
  } catch (error: any) {
    console.error("Get profile error:", error.response?.data?.message || error.message);
    // Handle token expiration or unauthorized access
    if (error.response?.status === 401) {
        logoutUser(); // Log out user if token is invalid/expired
        // Optionally redirect to login
    }
    throw new Error(error.response?.data?.message || "Erro ao buscar perfil.");
  }
};

export const updateUserProfile = async (profileData: any) => {
  try {
    const response = await api.put(`/auth/profile`, profileData);
     // Update localStorage if user info (like name, email) changed
    const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const updatedUserInfo = { ...currentUserInfo, ...response.data }; // Merge changes
    localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
    return response.data;
  } catch (error: any) {
    console.error("Update profile error:", error.response?.data?.message || error.message);
    if (error.response?.status === 401) {
        logoutUser();
    }
    throw new Error(error.response?.data?.message || "Erro ao atualizar perfil.");
  }
};

export const updatePlan = async (planData: { planName: string }) => {
    try {
        const response = await api.put(`/auth/plan`, planData);
        // Update plan info in localStorage
        const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        currentUserInfo.plan = response.data.plan;
        localStorage.setItem('userInfo', JSON.stringify(currentUserInfo));
        return response.data;
    } catch (error: any) {
        console.error("Update plan error:", error.response?.data?.message || error.message);
        if (error.response?.status === 401) {
            logoutUser();
        }
        throw new Error(error.response?.data?.message || "Erro ao atualizar plano.");
    }
};

// Meta Connection (Real backend call for simulation)
export const connectMeta = async () => {
  console.log("Attempting to connect Meta..."); // Log start
  const token = getToken();
  console.log("Using token:", token); // Log token
  try {
    console.log("Sending POST request to /auth/connect-meta"); // Log before request
    const response = await api.post(`/auth/connect-meta`);
    console.log("Connect Meta response:", response.data); // Log success response
    // Update Meta connection status in localStorage
    const currentUserInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    currentUserInfo.isMetaConnected = true; // Assume success based on backend response
    localStorage.setItem("userInfo", JSON.stringify(currentUserInfo));
    return response.data;
  } catch (error: any) {
    console.error("Connect Meta error object:", error); // Log the full error object
    console.error("Connect Meta error status:", error.response?.status); // Log status
    console.error("Connect Meta error response data:", error.response?.data); // Log response data
    console.error("Connect Meta error message:", error.response?.data?.message || error.message); // Log specific message
    if (error.response?.status === 401) {
      logoutUser();
    }
    throw new Error(error.response?.data?.message || "Erro ao conectar conta Meta.");
  }
};


// --- Simulated API Functions (Keep for features not yet migrated) ---

// Menu (Still Simulated)
export const getMenuItems = async () => {
  try {
    // Simulate fetching menu items
    console.log("Simulating fetching menu items...");
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    return [
        { id: 1, name: "Hambúrguer Clássico", description: "Pão, carne, queijo", price: 25.00, imageUrl: "/hamburguer.jpg" },
        { id: 2, name: "Batata Frita", description: "Porção generosa", price: 15.00, imageUrl: "/batata.jpg" },
        { id: 3, name: "Refrigerante Lata", description: "Coca-Cola, Guaraná, etc.", price: 5.00, imageUrl: "/refri.jpg" },
    ];
  } catch (error: any) {
    console.error("Simulated get menu items error:", error.message);
    throw new Error("Erro ao buscar itens do cardápio (simulado)");
  }
};

export const addMenuItem = async (item: any) => {
  try {
    // Simulate adding menu item
    console.log("Simulating adding menu item:", item);
    await new Promise(resolve => setTimeout(resolve, 500));
    const newItem = { ...item, id: `sim_${Date.now()}` };
    return { message: "Item adicionado com sucesso (simulado)", item: newItem };
  } catch (error: any) {
    console.error("Simulated add menu item error:", error.message);
    throw new Error("Erro ao adicionar item ao cardápio (simulado)");
  }
};

// Ads (Still Simulated)
export const createAdCampaign = async (campaignDetails: any) => {
  try {
    // Simulate creating ad campaign
    console.log("Simulating creating ad campaign:", campaignDetails);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { message: "Campanha criada com sucesso (simulado)", campaignId: `sim_camp_${Date.now()}` };
  } catch (error: any) {
    console.error("Simulated create ad campaign error:", error.message);
    throw new Error("Erro ao criar campanha (simulado)");
  }
};

// Meta Metrics (Still Simulated)
export const getMetaAdAccounts = async () => {
  try {
    // Simulate fetching ad accounts
    console.log("Simulating fetching Meta ad accounts...");
    await new Promise(resolve => setTimeout(resolve, 500));
    return [{ id: "act_123", name: "Conta de Anúncios Principal (Simulada)" }];
  } catch (error: any) {
    console.error("Simulated get Meta ad accounts error:", error.message);
    throw new Error("Erro ao buscar contas de anúncio Meta (simulado)");
  }
};

export const getMetaLiveMetrics = async () => {
    try {
        // Simulate fetching live metrics
        console.log("Simulating fetching Meta live metrics...");
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
            reach: Math.floor(Math.random() * 5000) + 1000, // 1000-6000
            clicks: Math.floor(Math.random() * 300) + 50,    // 50-350
            spend: (Math.random() * 100 + 20).toFixed(2),   // 20.00-120.00
            ctr: (Math.random() * 1.5 + 0.5).toFixed(2),    // 0.50-2.00
        };
    } catch (error: any) {
        console.error("Simulated get Meta live metrics error:", error.message);
        throw new Error("Erro ao buscar métricas ao vivo do Meta (simulado)");
    }
};




// Restaurant Info (Simulated)
export const saveRestaurantInfo = async (data: any) => {
  try {
    // Simulate saving restaurant info
    console.log("Simulating saving restaurant info:", data);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: "Informações do restaurante salvas com sucesso (simulado)", data };
  } catch (error: any) {
    console.error("Simulated save restaurant info error:", error.message);
    throw new Error("Erro ao salvar informações do restaurante (simulado)");
  }
};
