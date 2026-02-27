import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import HomePage from "./pages/HomePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import AdminPage from "./pages/AdminPage";
import "@/App.css";

function App() {
  return (
    <div className="App min-h-screen bg-[#09090b]">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster 
        position="top-right" 
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(24, 24, 27, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fafafa',
          },
        }}
      />
    </div>
  );
}

export default App;
