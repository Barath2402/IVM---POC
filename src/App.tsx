import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { UploadPage } from './pages/UploadPage';
import { DashboardPage } from './pages/DashboardPage';
import { MetricsPage } from './pages/MetricsPage';
import { SecurityPage } from './pages/SecurityPage';
import { ZeroDayTrackerPage } from './pages/ZeroDayTrackerPage';
import { AgentInsightsPage } from './pages/AgentInsightsPage';
import { ApimSplitPage } from './pages/ApimSplitPage';
import { AistPipelinePage } from './pages/AistPipelinePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<UploadPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="metrics" element={<MetricsPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="zero-day" element={<ZeroDayTrackerPage />} />
          <Route path="insights" element={<AgentInsightsPage />} />
          <Route path="split" element={<ApimSplitPage />} />
          <Route path="pipeline" element={<AistPipelinePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
