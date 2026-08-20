import { useEffect, useState } from "react";

function Settings() {
  const [theme, setTheme] = useState(
    localStorage.getItem("cmdc-theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cmdc-theme", theme);
  }, [theme]);

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">CMDC</p>
        <h1>Settings</h1>
        <p className="date">Customize your Command Center.</p>
      </header>

      <section className="settings-section">
        <div className="settings-card">
          <div className="settings-card-header">
            <div>
              <h2>Appearance</h2>
              <p>Choose how CMDC looks.</p>
            </div>
          </div>

          <div className="theme-options">
            <button
              type="button"
              className={`theme-option ${
                theme === "light" ? "theme-option--active" : ""
              }`}
              onClick={() => setTheme("light")}
            >
              <div className="theme-preview theme-preview--light">
                <div className="theme-preview-sidebar" />

                <div className="theme-preview-main">
                  <div className="theme-preview-line" />
                  <div className="theme-preview-card" />
                </div>
              </div>

              <div className="theme-option-info">
                <strong>Light</strong>
                <span>Clean and bright</span>
              </div>
            </button>

            <button
              type="button"
              className={`theme-option ${
                theme === "dark" ? "theme-option--active" : ""
              }`}
              onClick={() => setTheme("dark")}
            >
              <div className="theme-preview theme-preview--dark">
                <div className="theme-preview-sidebar" />

                <div className="theme-preview-main">
                  <div className="theme-preview-line" />
                  <div className="theme-preview-card" />
                </div>
              </div>

              <div className="theme-option-info">
                <strong>Dark</strong>
                <span>Low-light workspace</span>
              </div>
            </button>

            <button
              type="button"
              className={`theme-option ${
                theme === "color" ? "theme-option--active" : ""
              }`}
              onClick={() => setTheme("color")}
            >
              <div className="theme-preview theme-preview--color">
                <div className="theme-preview-sidebar" />

                <div className="theme-preview-main">
                  <div className="theme-preview-line" />
                  <div className="theme-preview-card" />
                </div>
              </div>

              <div className="theme-option-info">
                <strong>Color</strong>
                <span>A more colorful Command Center</span>
              </div>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export default Settings;