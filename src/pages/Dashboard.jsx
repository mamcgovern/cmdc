function Dashboard() {
  return (
    <>
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
    </>
  );
}

export default Dashboard;