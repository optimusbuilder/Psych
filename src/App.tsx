import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import IntakePage from "./pages/IntakePage";
import ProviderLayout from "./pages/ProviderLayout";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderCases from "./pages/ProviderCases";
import ProviderCaseDetail from "./pages/ProviderCaseDetail";
import ProviderUrgent from "./pages/ProviderUrgent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/intake" element={<IntakePage />} />
          <Route path="/provider" element={<ProviderLayout />}>
            <Route index element={<ProviderDashboard />} />
            <Route path="cases" element={<ProviderCases />} />
            <Route path="cases/:id" element={<ProviderCaseDetail />} />
            <Route path="urgent" element={<ProviderUrgent />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
