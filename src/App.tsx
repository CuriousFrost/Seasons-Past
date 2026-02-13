import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import GameLog from "@/pages/GameLog";
import AddGame from "@/pages/AddGame";
import Commanders from "@/pages/Commanders";
import Statistics from "@/pages/Statistics";
import PodBuddies from "@/pages/PodBuddies";
import LifeCounter from "@/pages/LifeCounter";
import Settings from "@/pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/games" element={<GameLog />} />
                  <Route path="/games/new" element={<AddGame />} />
                  <Route path="/commanders" element={<Commanders />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/pod-buddies" element={<PodBuddies />} />
                  <Route path="/life-counter" element={<LifeCounter />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
