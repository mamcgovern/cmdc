import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
} from "react-router-dom";

import "./styles/index.css";

import App from "./App.jsx";

import {
  GoogleCalendarProvider,
} from "./context/GoogleCalendarContext.jsx";

const savedTheme =
  localStorage.getItem(
    "cmdc-theme"
  ) || "light";

document.documentElement.setAttribute(
  "data-theme",
  savedTheme
);

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <BrowserRouter>
      <GoogleCalendarProvider>
        <App />
      </GoogleCalendarProvider>
    </BrowserRouter>
  </StrictMode>
);