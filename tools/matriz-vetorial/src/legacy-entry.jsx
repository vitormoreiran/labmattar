import "../compatibility/editor.css";
import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../compatibility/page.tsx";
createRoot(document.getElementById("legacy-root")).render(<Home />);
