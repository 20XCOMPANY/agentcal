/**
 * [INPUT]: Depends on ReactDOM root mounting, BrowserRouter, and global stylesheet import.
 * [OUTPUT]: Boots the client application into #root.
 * [POS]: runtime entrypoint for the AgentCal client bundle.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import "@/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
