import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";

import LivePredictionPage from "./pages/LivePredictionPage";
import DatasetExploration from "./pages/DatasetExploration";
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

function App() {
  return (
    <BrowserRouter>
      <div className="dashboard-layout">
        <Sidebar />

        <section className="dashboard-main">
          <Routes>
            <Route
              path="/"
              element={
                <Navigate
                  to="/overview"
                  replace
                />
              }
            />

            <Route
              path="/overview"
              element={
                <PlaceholderPage title="Overview" />
              }
            />

            <Route
              path="/dataset-exploration"
              element={<DatasetExploration />
              }
            />

            <Route
              path="/depression"
              element={
                <PlaceholderPage title="Depression Models" />
              }
            />

            <Route
              path="/anxiety"
              element={
                <PlaceholderPage title="Anxiety Models" />
              }
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
              element={
                <Navigate
                  to="/overview"
                  replace
                />
              }
            />
          </Routes>
        </section>
      </div>
    </BrowserRouter>
  );
}

export default App;