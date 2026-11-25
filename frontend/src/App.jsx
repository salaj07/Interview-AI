import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Dashboard } from "./pages/Dashboard";
import { Setup } from "./pages/Setup";
import { LiveInterview } from "./pages/LiveInterview";
import { Report } from "./pages/Report";

export default function App() {
  return (
    <Router>
      <Toaster theme="dark" position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/interview/:id" element={<LiveInterview />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
