import { useEffect, useRef } from 'react';
import { useAppStore } from './stores/appStore';
import { SimulationEngine, SCENARIOS, generateSimTimeSeries } from './lib/simulation';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import OverviewPage from './pages/OverviewPage';
import DigitalTwinPage from './pages/DigitalTwinPage';
import LiveTelemetryPage from './pages/LiveTelemetryPage';
import CameraInspectionPage from './pages/CameraInspectionPage';
import RiskIntelligencePage from './pages/RiskIntelligencePage';
import EventTimelinePage from './pages/EventTimelinePage';
import SimulationLabPage from './pages/SimulationLabPage';
import BatteryRegistryPage from './pages/BatteryRegistryPage';
import ReportsPage from './pages/ReportsPage';
import SystemConfigPage from './pages/SystemConfigPage';

export default function App() {
  const { currentPage, mode, pushReading, startSession } = useAppStore();
  const simEngineRef = useRef<SimulationEngine | null>(null);
  const sessionStarted = useRef(false);

  // Start a simulation session on mount if in simulation mode
  useEffect(() => {
    if (!sessionStarted.current) {
      startSession();
      sessionStarted.current = true;
    }
  }, [startSession]);

  // In simulation mode, run the default scenario engine
  useEffect(() => {
    if (mode !== 'simulation') {
      simEngineRef.current?.stop();
      simEngineRef.current = null;
      return;
    }
    const engine = new SimulationEngine('normal', (reading) => {
      pushReading(reading);
    });
    simEngineRef.current = engine;
    engine.play();

    // Pre-populate history with 60 points so charts aren't empty
    const history = generateSimTimeSeries('normal', 60);
    history.forEach(r => pushReading(r));

    return () => {
      engine.stop();
    };
  }, [mode, pushReading]);

  const renderPage = () => {
    switch (currentPage) {
      case 'overview': return <OverviewPage />;
      case 'digital-twin': return <DigitalTwinPage />;
      case 'live-telemetry': return <LiveTelemetryPage />;
      case 'camera-inspection': return <CameraInspectionPage />;
      case 'risk-intelligence': return <RiskIntelligencePage />;
      case 'event-timeline': return <EventTimelinePage />;
      case 'simulation-lab': return <SimulationLabPage />;
      case 'battery-registry': return <BatteryRegistryPage />;
      case 'reports': return <ReportsPage />;
      case 'system-config': return <SystemConfigPage />;
      default: return <OverviewPage />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--navy-950)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden grid-bg animate-fade-in">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
