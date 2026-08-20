import "./App.css";

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-name">CMDC</div>
          <div className="brand-subtitle">COMMAND CENTER</div>
        </div>

        <nav className="nav">
          <a href="#" className="nav-item active">
            Dashboard
          </a>

          <a href="#" className="nav-item">
            Tasks
          </a>

          <a href="#" className="nav-item">
            Calendar
          </a>

          <a href="#" className="nav-item">
            Projects
          </a>

          <a href="#" className="nav-item">
            Notes
          </a>
        </nav>

        <div className="sidebar-footer">
          <a href="#" className="nav-item">
            Settings
          </a>
        </div>
      </aside>

      <main className="main">
        <header className="page-header">
          <div>
            <p className="eyebrow">COMMAND CENTER</p>
            <h1>Good morning.</h1>
            <p className="date">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </header>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Today</h2>
              <span>0 tasks</span>
            </div>

            <p className="empty-state">Nothing on your list yet.</p>
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <h2>Weather</h2>
            </div>

            <p className="empty-state">Weather coming soon.</p>
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <h2>Upcoming</h2>
            </div>

            <p className="empty-state">Your calendar will appear here.</p>
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <h2>Quick Notes</h2>
            </div>

            <p className="empty-state">No notes yet.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;