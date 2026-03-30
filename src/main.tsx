import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App";
import { clerkConfig, hasClerkConfig } from "./lib/clerk";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {hasClerkConfig ? (
      <ClerkProvider publishableKey={clerkConfig.publishableKey}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
