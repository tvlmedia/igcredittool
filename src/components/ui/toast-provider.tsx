"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "rgba(16, 18, 22, 0.92)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff",
          backdropFilter: "blur(16px)"
        }
      }}
    />
  );
}
