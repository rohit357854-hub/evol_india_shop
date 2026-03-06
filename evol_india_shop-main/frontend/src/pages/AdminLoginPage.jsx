import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Smartphone, Lock, User, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter username and password");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/login`, {
        username: username.trim(),
        password: password.trim()
      });
      
      localStorage.setItem("adminToken", response.data.token);
      localStorage.setItem("adminUsername", response.data.username);
      toast.success("Login successful!");
      navigate("/admin");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">Evol India Shop</h1>
          <p className="text-zinc-400 mt-1">Admin Panel</p>
        </div>

        {/* Login Form */}
        <form 
          onSubmit={handleSubmit}
          className="glass-card rounded-2xl p-8 border border-white/10"
          data-testid="admin-login-form"
        >
          <h2 className="text-xl font-semibold text-white mb-6 text-center font-['Outfit']">
            Sign in to Dashboard
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  data-testid="login-username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-zinc-900/50 border-white/10 text-white pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  data-testid="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-900/50 border-white/10 text-white pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            data-testid="login-submit-btn"
            disabled={loading}
            className="w-full mt-6 bg-white text-black hover:bg-zinc-200 rounded-full py-6"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-center text-zinc-500 text-sm mt-4">
            Default: admin / admin123
          </p>
        </form>
      </div>
    </div>
  );
}
