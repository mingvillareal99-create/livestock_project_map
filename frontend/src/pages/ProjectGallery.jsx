import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Search, 
  Filter, 
  MapPin, 
  FolderOpen,
  ChevronDown,
  X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_OPTIONS = ["All", "Proposed", "Ongoing", "Completed"];

export default function ProjectGallery() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      project.project_name.toLowerCase().includes(searchLower) ||
      project.beneficiary_name.toLowerCase().includes(searchLower) ||
      project.address.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status) => {
    const badges = {
      Proposed: "badge-proposed",
      Ongoing: "badge-ongoing",
      Completed: "badge-completed"
    };
    return badges[status] || badges.Proposed;
  };

  return (
    <div className="p-4 md:p-8" data-testid="project-gallery">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#357A37] mb-1">
          Project Gallery
        </h1>
        <p className="text-gray-500">
          Browse and manage all agricultural projects
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search projects, beneficiaries, or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input w-full"
            data-testid="search-input"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="border-gray-200 min-w-[140px] justify-between"
              data-testid="status-filter-btn"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>{statusFilter}</span>
              </div>
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {STATUS_OPTIONS.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => setStatusFilter(status)}
                className={statusFilter === status ? "bg-gray-100" : ""}
                data-testid={`filter-${status.toLowerCase()}`}
              >
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter Pills (Mobile) */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-4 md:hidden">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`filter-pill whitespace-nowrap ${
              statusFilter === status ? "active" : ""
            }`}
            data-testid={`pill-${status.toLowerCase()}`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-500 mb-4">
        Showing {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
        {statusFilter !== "All" && ` (${statusFilter})`}
        {search && ` matching "${search}"`}
      </p>

      {/* Project Grid */}
      {loading ? (
        <div className="project-grid" data-testid="gallery-loading">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 skeleton rounded-xl" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-8 text-center" data-testid="empty-state">
          <div className="empty-state">
            <FolderOpen className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {search ? "No matching projects" : "No Projects Found"}
            </h3>
            <p className="text-gray-500 mb-4">
              {search 
                ? `No projects match "${search}"`
                : "Add your first project to get started"
              }
            </p>
            {!search && (
              <Button
                onClick={() => navigate('/project/new')}
                className="bg-[#357A37] hover:bg-[#2A6B2E]"
                data-testid="add-project-empty-btn"
              >
                Add Project
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="project-grid">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id}
              className="project-card group overflow-hidden cursor-pointer"
              onClick={() => navigate(`/project/${project.id}`)}
              data-testid={`project-card-${project.id}`}
            >
              {/* Image */}
              <div className="card-image-container bg-gray-100">
                {project.image_url ? (
                  <img
                    src={project.image_url}
                    alt={project.project_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <div className="card-image-overlay" />
                
                {/* Status Badge Overlay */}
                <div className="absolute top-3 right-3">
                  <span className={getStatusBadge(project.status)}>
                    {project.status}
                  </span>
                </div>
              </div>

              {/* Content */}
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">
                  {project.project_name}
                </h3>
                <p className="text-sm text-gray-500 mb-2 truncate">
                  {project.beneficiary_name}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">
                    {project.coordinates?.lat 
                      ? `${project.coordinates.lat.toFixed(4)}, ${project.coordinates.lng.toFixed(4)}`
                      : "No location set"
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
