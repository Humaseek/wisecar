import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Hebrew + RTL
if (typeof document !== "undefined") {
  document.documentElement.lang = "he";
  document.documentElement.dir = "rtl";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
