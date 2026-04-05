import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";

// Eagerly loaded (small, always needed on first paint)
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";

// Lazily loaded (heavy, only needed on navigation)
const GameLog = lazy(() => import("@/pages/GameLog"));
const AddGame = lazy(() => import("@/pages/AddGame"));
const Commanders = lazy(() => import("@/pages/Commanders"));
const Statistics = lazy(() => import("@/pages/Statistics"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const PodBuddies = lazy(() => import("@/pages/PodBuddies"));
const LifeCounter = lazy(() => import("@/pages/LifeCounter"));
const Settings = lazy(() => import("@/pages/Settings"));

function PageFallback() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48 rounded-md" />
      <Skeleton className="h-4 w-72 rounded-md" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

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
                  <Route path="/games" element={<Suspense fallback={<PageFallback />}><GameLog /></Suspense>} />
                  <Route path="/games/new" element={<Suspense fallback={<PageFallback />}><AddGame /></Suspense>} />
                  <Route path="/commanders" element={<Suspense fallback={<PageFallback />}><Commanders /></Suspense>} />
                  <Route path="/statistics" element={<Suspense fallback={<PageFallback />}><Statistics /></Suspense>} />
                  <Route path="/achievements" element={<Suspense fallback={<PageFallback />}><Achievements /></Suspense>} />
                  <Route path="/pod-buddies" element={<Suspense fallback={<PageFallback />}><PodBuddies /></Suspense>} />
                  <Route path="/life-counter" element={<Suspense fallback={<PageFallback />}><LifeCounter /></Suspense>} />
                  <Route path="/settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
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
