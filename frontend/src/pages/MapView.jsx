import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  MapPin, 
  X, 
  AlertTriangle,
  ExternalLink,
  Filter,
  ChevronDown,
  Navigation
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";

// Bicol Region center coordinates (approximate)
const BICOL_CENTER = { lat: 13.4213, lng: 123.4139 };

const STATUS_COLORS = {
  Proposed: "#64748B",
  Ongoing: "#D97706",
  Completed: "#15803D"
};

// Dynamic import for Google Maps to handle errors gracefully
let APIProvider, Map, AdvancedMarker, InfoWindow, useMap;

try {
  const mapsModule = require("@vis.gl/react-google-maps");
  APIProvider = mapsModule.APIProvider;
  Map = mapsModule.Map;
  AdvancedMarker = mapsModule.AdvancedMarker;
  InfoWindow = mapsModule.InfoWindow;
  useMap = mapsModule.useMap;
} catch (e) {
  console.error("Failed to load Google Maps module:", e);
}

function MapContent({ projects, selectedProject, onMarkerClick, onInfoWindowClose }) {
  const map = useMap ? useMap() : null;

  useEffect(() => {
    if (map && projects.length > 0 && window.google) {
      // Fit bounds to show all markers
      const projectsWithCoords = projects.filter(p => p.coordinates?.lat && p.coordinates?.lng);
      if (projectsWithCoords.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        projectsWithCoords.forEach(p => {
          bounds.extend({ lat: p.coordinates.lat, lng: p.coordinates.lng });
        });
        map.fitBounds(bounds, { padding: 50 });
      }
    }
  }, [map, projects]);

  if (!AdvancedMarker || !InfoWindow) return null;

  return (
    <>
      {projects.map((project) => {
        if (!project.coordinates?.lat || !project.coordinates?.lng) return null;
        
        return (
          <AdvancedMarker
            key={project.id}
            position={{ lat: project.coordinates.lat, lng: project.coordinates.lng }}
            onClick={() => onMarkerClick(project)}
          >
            <div 
              className="map-marker"
              style={{ backgroundColor: STATUS_COLORS[project.status] || STATUS_COLORS.Proposed }}
            >
              <span className="map-marker-inner text-white">
                <MapPin className="w-4 h-4" />
              </span>
            </div>
          </AdvancedMarker>
        );
      })}

      {selectedProject && selectedProject.coordinates?.lat && (
        <InfoWindow
          position={{ 
            lat: selectedProject.coordinates.lat, 
            lng: selectedProject.coordinates.lng 
          }}
          onCloseClick={onInfoWindowClose}
        >
          <InfoCard project={selectedProject} />
        </InfoWindow>
      )}
    </>
  );
}

function InfoCard({ project }) {
  const navigate = useNavigate();
  
  const getStatusBadge = (status) => {
    const badges = {
      Proposed: "bg-slate-100 text-slate-600",
      Ongoing: "bg-amber-100 text-amber-700",
      Completed: "bg-green-100 text-green-700"
    };
    return badges[status] || badges.Proposed;
  };

  return (
    <div className="info-card">
      {project.image_url && (
        <img
          src={project.image_url}
          alt={project.project_name}
          className="info-card-image"
        />
      )}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm mb-1">
          {project.project_name}
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          {project.beneficiary_name}
        </p>
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(project.status)}`}>
            {project.status}
          </span>
          <button
            onClick={() => navigate(`/project/${project.id}`)}
            className="text-xs text-[#1E5631] hover:underline flex items-center gap-1"
          >
            View <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Fallback List View when Maps API is unavailable
function ProjectListView({ projects, statusFilter, setStatusFilter }) {
  const navigate = useNavigate();
  
  const getStatusBadge = (status) => {
    const badges = {
      Proposed: "badge-proposed",
      Ongoing: "badge-ongoing",
      Completed: "badge-completed"
    };
    return badges[status] || badges.Proposed;
  };

  return (
    <div className="p-4 md:p-8" data-testid="map-list-view">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1E5631] mb-1">
            Project Locations
          </h1>
          <p className="text-gray-500">
            View projects with GPS coordinates
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="border-gray-200"
              data-testid="list-filter-btn"
            >
              <Filter className="w-4 h-4 mr-2" />
              {statusFilter}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {["All", "Proposed", "Ongoing", "Completed"].map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* API Key Warning */}
      <Card className="mb-6 bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">Google Maps API Configuration Required</h3>
              <p className="text-sm text-amber-700">
                The Google Maps API key needs to be configured with HTTP referrer restrictions for this domain. 
                Below is a list view of all projects with coordinates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects with coordinates */}
      <div className="space-y-3">
        {projects.filter(p => p.coordinates?.lat).map((project) => (
          <Card 
            key={project.id}
            className="project-card cursor-pointer"
            onClick={() => navigate(`/project/${project.id}`)}
            data-testid={`map-list-project-${project.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: STATUS_COLORS[project.status] + "20" }}
                >
                  <MapPin 
                    className="w-6 h-6" 
                    style={{ color: STATUS_COLORS[project.status] }} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {project.project_name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {project.beneficiary_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={getStatusBadge(project.status)}>
                      {project.status}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {project.coordinates.lat.toFixed(4)}, {project.coordinates.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${project.coordinates.lat},${project.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-[#1E5631] text-white rounded-lg hover:bg-[#144224] transition-colors"
                  data-testid={`open-in-gmaps-${project.id}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}

        {projects.filter(p => p.coordinates?.lat).length === 0 && (
          <Card className="p-8 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-700 mb-2">No Projects with Coordinates</h3>
            <p className="text-gray-500">
              Projects with GPS coordinates will appear here
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function MapView() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [projectsWithoutCoords, setProjectsWithoutCoords] = useState([]);
  const [showNoCoordsList, setShowNoCoordsList] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== "All") {
        params.status = statusFilter;
      }
      const response = await axios.get(`${API}/projects`, { params });
      const allProjects = response.data;
      
      setProjects(allProjects.filter(p => p.coordinates?.lat && p.coordinates?.lng));
      setProjectsWithoutCoords(allProjects.filter(p => !p.coordinates?.lat || !p.coordinates?.lng));
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerClick = useCallback((project) => {
    setSelectedProject(project);
  }, []);

  const handleInfoWindowClose = useCallback(() => {
    setSelectedProject(null);
  }, []);

  // Check if Google Maps components are available
  if (!GOOGLE_MAPS_API_KEY || !APIProvider || !Map || mapError) {
    return (
      <ProjectListView 
        projects={projects.length > 0 ? projects : []} 
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
    );
  }

  return (
    <div className="relative h-full" data-testid="map-view">
      {/* Floating Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-2 flex-wrap">
        <h1 className="text-lg font-bold text-[#1E5631] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
          Map View
        </h1>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-white/90 backdrop-blur-sm shadow-md border-0"
              data-testid="map-filter-btn"
            >
              <Filter className="w-4 h-4 mr-2" />
              {statusFilter}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {["All", "Proposed", "Ongoing", "Completed"].map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {projectsWithoutCoords.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 shadow-md"
            onClick={() => setShowNoCoordsList(!showNoCoordsList)}
            data-testid="no-coords-btn"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            {projectsWithoutCoords.length} Need Location
          </Button>
        )}
      </div>

      {/* Projects without coordinates panel */}
      {showNoCoordsList && (
        <div className="absolute top-16 right-4 z-20 w-80 max-h-96 bg-white rounded-xl shadow-xl overflow-hidden animate-fade-in">
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <h3 className="font-semibold text-amber-800">Projects Needing Location</h3>
            <button
              onClick={() => setShowNoCoordsList(false)}
              className="p-1 hover:bg-amber-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-72">
            {projectsWithoutCoords.map((project) => (
              <div
                key={project.id}
                className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/project/${project.id}`)}
                data-testid={`no-coord-project-${project.id}`}
              >
                <p className="font-medium text-gray-900 text-sm">
                  {project.project_name}
                </p>
                <p className="text-xs text-gray-500">
                  {project.beneficiary_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      {loading ? (
        <div className="map-container flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#1E5631] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading map...</p>
          </div>
        </div>
      ) : (
        <APIProvider 
          apiKey={GOOGLE_MAPS_API_KEY}
          onLoad={() => console.log("Maps API loaded")}
        >
          <Map
            className="map-container"
            defaultCenter={BICOL_CENTER}
            defaultZoom={9}
            mapId="da-project-map"
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={true}
            onError={() => setMapError(true)}
          >
            <MapContent
              projects={projects}
              selectedProject={selectedProject}
              onMarkerClick={handleMarkerClick}
              onInfoWindowClose={handleInfoWindowClose}
            />
          </Map>
        </APIProvider>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md">
        <p className="text-xs font-semibold text-gray-500 mb-2">STATUS</p>
        <div className="space-y-1">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-600">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
