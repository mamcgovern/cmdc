import { NavLink, Route, Routes } from "react-router-dom";
import "./App.css";

import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Calendar from "./pages/Calendar";
import Projects from "./pages/Projects";
import Notes from "./pages/Notes";
import Settings from "./pages/Settings";

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-name">CMDC</div>
          <div className="brand-subtitle">COMMAND CENTER</div>
        </div>

        <nav className="nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            Tasks
          </NavLink>

          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            Calendar
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            Projects
          </NavLink>

          <NavLink
            to="/notes"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            Notes
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            Settings
          </NavLink>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;