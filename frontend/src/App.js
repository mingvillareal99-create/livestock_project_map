import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ProjectGallery from "./pages/ProjectGallery";
import MapView from "./pages/MapView";
import ProjectForm from "./pages/ProjectForm";
import "./App.css";

function App() {
  return (
    <div className="App min-h-screen bg-background">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="gallery" element={<ProjectGallery />} />
            <Route path="map" element={<MapView />} />
            <Route path="project/new" element={<ProjectForm />} />
            <Route path="project/:id" element={<ProjectForm />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
