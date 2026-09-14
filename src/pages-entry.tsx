import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Studio } from "@/components/studio/Studio";
import "./styles.css";

const el = document.getElementById("root");
if (!el) throw new Error("PXD2 root missing");

createRoot(el).render(
  <StrictMode>
    <PreviewHostBridge />
    <AuthProvider>
      <Studio />
    </AuthProvider>
  </StrictMode>,
);
