import { Outlet } from "react-router-dom";
import { Toaster } from "./components/ui/toaster"; // Assuming you have shadcn/ui toaster setup

function App() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {/* You can add a common layout here if needed (e.g., Navbar, Footer) */}
      {/* The Outlet component renders the matched child route component */}
      <Outlet />
      <Toaster /> {/* To display toasts */} 
    </div>
  );
}

export default App;

