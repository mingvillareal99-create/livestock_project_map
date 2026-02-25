import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  BarChart3, 
  MapPin, 
  FolderOpen, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, projectsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/projects`)
      ]);
      setStats(statsRes.data);
      // Get 5 most recent projects
      const sorted = projectsRes.data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setRecentProjects(sorted.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await axios.get(`${API}/export/${format}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `projects_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed");
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Proposed: "badge-proposed",
      Ongoing: "badge-ongoing",
      Completed: "badge-completed"
    };
    return badges[status] || badges.Proposed;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6" data-testid="dashboard-loading">
        <div className="h-8 w-48 skeleton mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1E5631] mb-1">
            Project Dashboard
          </h1>
          <p className="text-gray-500">
            Monitor agricultural projects across Region 5
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="border-[#1E5631]/20 text-[#1E5631]"
                data-testid="export-dropdown-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleExport('csv')}
                data-testid="export-csv-btn"
              >
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleExport('pdf')}
                data-testid="export-pdf-btn"
              >
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="stat-card" data-testid="stat-total">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-[#1E5631]/10 rounded-lg">
                <FolderOpen className="w-5 h-5 text-[#1E5631]" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Total
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.total_projects || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Projects</p>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="stat-proposed">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Proposed
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.proposed || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Awaiting</p>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="stat-ongoing">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Ongoing
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.ongoing || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">In Progress</p>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="stat-completed">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Completed
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.completed || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Finished</p>
          </CardContent>
        </Card>
      </div>

      {/* Location Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="stat-card bg-gradient-to-br from-[#1E5631]/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#1E5631] rounded-xl">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">With GPS Coordinates</p>
                <p className="text-2xl font-bold text-[#1E5631]">
                  {stats?.with_coordinates || 0}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    / {stats?.total_projects || 0}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="stat-card cursor-pointer hover:border-amber-300"
          onClick={() => navigate('/map')}
          data-testid="needs-location-card"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Needs Location</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {stats?.without_coordinates || 0}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Projects</h2>
          <Button
            variant="ghost"
            onClick={() => navigate('/gallery')}
            className="text-[#1E5631] hover:text-[#1E5631] hover:bg-[#1E5631]/5"
            data-testid="view-all-btn"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {recentProjects.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="empty-state">
              <FolderOpen className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Projects Yet
              </h3>
              <p className="text-gray-500 mb-4">
                Start by adding your first agricultural project
              </p>
              <Button
                onClick={() => navigate('/project/new')}
                className="bg-[#1E5631] hover:bg-[#144224]"
                data-testid="add-first-project-btn"
              >
                Add Project
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <Card 
                key={project.id}
                className="project-card cursor-pointer"
                onClick={() => navigate(`/project/${project.id}`)}
                data-testid={`recent-project-${project.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {project.image_url ? (
                      <img
                        src={project.image_url}
                        alt={project.project_name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                        <FolderOpen className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
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
                        {project.coordinates?.lat && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Located
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
