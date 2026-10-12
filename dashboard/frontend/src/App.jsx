import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import DatasetExploration from "./pages/DatasetExploration";
import LivePredictionPage from "./pages/LivePredictionPage";
import DepressionModels from "./pages/DepressionModels";
import AnxietyModels from "./pages/AnxietyModels";
import Overview from "./pages/Overview";
import "./App.css";

const navigationItems = [
  {
    path: "/overview",
    label: "Overview",
  },
  {
    path: "/dataset-exploration",
    label: "Dataset Exploration",
  },
  {
    path: "/depression",
    label: "Depression Models",
  },
  {
    path: "/anxiety",
    label: "Anxiety Models",
  },
  {
    path: "/prediction",
    label: "Live Prediction",
  },
  {
    path: "/subgroups",
    label: "Subgroup Analysis",
  },
  {
    path: "/interpretability",
    label: "Interpretability",
  },
  {
    path: "/methodology",
    label: "Methodology",
  },
];

const overviewRouteMap = {
  overview: "/overview",
  "dataset-exploration": "/dataset-exploration",
  "depression-models": "/depression",
  "anxiety-models": "/anxiety",
  "live-prediction": "/prediction",
  "subgroup-analysis": "/subgroups",
  interpretability: "/interpretability",
  methodology: "/methodology",
};

function PlaceholderPage({ title }) {
  return (
    <main className="page-content">
      <section className="placeholder-card">
        <p className="page-eyebrow">
          Mental Health Analytics Dashboard
        </p>

        <h1>{title}</h1>

        <p>
          This dashboard page will be implemented in the next
          development stage.
        </p>
      </section>
    </main>
  );
}

function OverviewPage() {
  const navigate = useNavigate();

  const handleOverviewNavigation = (target) => {
    const destination = overviewRouteMap[target] || "/overview";
    navigate(destination);
  };

  return (
    <main className="page-content">
      <Overview onNavigate={handleOverviewNavigation} />
    </main>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">MH</div>

        <div>
          <h2>Mental Health</h2>
          <p>Clinical NLP Dashboard</p>
        </div>
      </div>

      <nav
        className="sidebar-navigation"
        aria-label="Dashboard navigation"
      >
        {navigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? "navigation-link navigation-link--active"
                : "navigation-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>Clinical NLP Research</p>
        <span>For research use only</span>
      </div>
    </aside>
  );
}

function DashboardRoutes() {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <section className="dashboard-main">
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/overview" replace />}
          />

          <Route
            path="/overview"
            element={<OverviewPage />}
          />

          <Route
            path="/dataset-exploration"
            element={<DatasetExploration />}
          />

          <Route
            path="/depression"
            element={<DepressionModels />}
          />

          <Route
            path="/anxiety"
            element={<AnxietyModels />}
          />

          <Route
            path="/prediction"
            element={<LivePredictionPage />}
          />

          <Route
            path="/subgroups"
            element={
              <PlaceholderPage title="Subgroup Analysis" />
            }
          />

          <Route
            path="/interpretability"
            element={
              <PlaceholderPage title="Interpretability Analysis" />
            }
          />

          <Route
            path="/methodology"
            element={
              <PlaceholderPage title="Methodology" />
            }
          />

          <Route
            path="*"
            element={<Navigate to="/overview" replace />}
          />
        </Routes>
      </section>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <DashboardRoutes />
    </BrowserRouter>
  );
}

export default App;