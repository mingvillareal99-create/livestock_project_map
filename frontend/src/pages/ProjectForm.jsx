import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import EXIF from "exif-js";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { 
  Upload, 
  MapPin, 
  Save, 
  ArrowLeft, 
  Trash2,
  Camera,
  AlertCircle,
  X,
  Check
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";
const BICOL_CENTER = { lat: 13.4213, lng: 123.4139 };

const STATUS_OPTIONS = ["Proposed", "Ongoing", "Completed"];

const PROJECT_TYPE_OPTIONS = [
  "Swine Modules Package 2B with housing",
  "Swine Modules Package 3B with housing",
  "Chicken Modules Package 1 (Free Range)",
  "Duck Modules Package 1",
  "Beef Cattle Package 1 (Fattening)",
  "Beef Cattle Package 2 (Breeder) Upgraded with Housing",
  "Goat Package 1 (Meat/Dairy/Dual Type)",
  "Rabbit Package",
  "Stingless Bees"
];

function LocationPicker({ coordinates, onLocationSelect, onClose }) {
  const [markerPosition, setMarkerPosition] = useState(
    coordinates?.lat && coordinates?.lng
      ? { lat: coordinates.lat, lng: coordinates.lng }
      : BICOL_CENTER
  );

  const handleMapClick = useCallback((e) => {
    if (e.detail?.latLng) {
      const { lat, lng } = e.detail.latLng;
      setMarkerPosition({ lat, lng });
    }
  }, []);

  const handleConfirm = () => {
    onLocationSelect(markerPosition);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Pick Location on Map</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="h-96">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              style={{ width: "100%", height: "100%" }}
              defaultCenter={markerPosition}
              defaultZoom={12}
              mapId="location-picker-map"
              gestureHandling="greedy"
              onClick={handleMapClick}
              disableDefaultUI={true}
              zoomControl={true}
            >
              <AdvancedMarker position={markerPosition}>
                <div className="map-marker bg-[#EF8E1E]">
                  <span className="map-marker-inner text-white">
                    <MapPin className="w-4 h-4" />
                  </span>
                </div>
              </AdvancedMarker>
            </Map>
          </APIProvider>
        </div>

        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Lat: {markerPosition.lat.toFixed(6)}, Lng: {markerPosition.lng.toFixed(6)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              className="bg-[#357A37] hover:bg-[#2A6B2E]"
              data-testid="confirm-location-btn"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Location
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef(null);
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedCoords, setExtractedCoords] = useState(null);

  const [formData, setFormData] = useState({
    project_name: "",
    beneficiary_name: "",
    address: "",
    status: "Proposed",
    coordinates: { lat: null, lng: null },
    image_data: null
  });

  useEffect(() => {
    if (isEditMode) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/projects/${id}`);
      const project = response.data;
      setFormData({
        project_name: project.project_name,
        beneficiary_name: project.beneficiary_name,
        address: project.address,
        status: project.status,
        coordinates: project.coordinates || { lat: null, lng: null },
        image_data: null
      });
      if (project.image_url) {
        setImagePreview(project.image_url);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project");
      navigate("/gallery");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setImagePreview(dataUrl);
      setFormData(prev => ({ ...prev, image_data: dataUrl }));

      // Extract EXIF GPS data
      EXIF.getData(file, function() {
        const lat = EXIF.getTag(this, "GPSLatitude");
        const latRef = EXIF.getTag(this, "GPSLatitudeRef");
        const lng = EXIF.getTag(this, "GPSLongitude");
        const lngRef = EXIF.getTag(this, "GPSLongitudeRef");

        if (lat && lng) {
          const convertDMSToDD = (dms, ref) => {
            const degrees = dms[0] + dms[1] / 60 + dms[2] / 3600;
            return (ref === "S" || ref === "W") ? -degrees : degrees;
          };

          const latitude = convertDMSToDD(lat, latRef);
          const longitude = convertDMSToDD(lng, lngRef);

          setExtractedCoords({ lat: latitude, lng: longitude });
          setFormData(prev => ({
            ...prev,
            coordinates: { lat: latitude, lng: longitude }
          }));
          toast.success("GPS coordinates extracted from image!");
        } else {
          setExtractedCoords(null);
          toast.info("No GPS data found in image. You can set location manually.");
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleLocationSelect = (coords) => {
    setFormData(prev => ({
      ...prev,
      coordinates: { lat: coords.lat, lng: coords.lng }
    }));
    toast.success("Location updated!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.project_name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!formData.beneficiary_name.trim()) {
      toast.error("Beneficiary name is required");
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        project_name: formData.project_name,
        beneficiary_name: formData.beneficiary_name,
        address: formData.address,
        status: formData.status,
        coordinates: formData.coordinates.lat ? formData.coordinates : null,
        image_data: formData.image_data
      };

      if (isEditMode) {
        await axios.put(`${API}/projects/${id}`, payload);
        toast.success("Project updated successfully!");
      } else {
        await axios.post(`${API}/projects`, payload);
        toast.success("Project created successfully!");
      }

      navigate("/gallery");
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/projects/${id}`);
      toast.success("Project deleted successfully!");
      navigate("/gallery");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8" data-testid="form-loading">
        <div className="max-w-2xl mx-auto">
          <div className="h-8 w-48 skeleton mb-6" />
          <div className="h-64 skeleton rounded-xl mb-4" />
          <div className="space-y-4">
            <div className="h-12 skeleton rounded-lg" />
            <div className="h-12 skeleton rounded-lg" />
            <div className="h-12 skeleton rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" data-testid="project-form">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#357A37]">
              {isEditMode ? "Edit Project" : "Add New Project"}
            </h1>
            <p className="text-gray-500 text-sm">
              {isEditMode ? "Update project details" : "Fill in the project information"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Project Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                data-testid="image-input"
              />
              
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Project preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setFormData(prev => ({ ...prev, image_data: null }));
                      setExtractedCoords(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-md hover:bg-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  {extractedCoords && (
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      GPS Extracted
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="upload-dropzone"
                  data-testid="upload-dropzone"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="font-medium text-gray-700 mb-1">
                    Upload Project Photo
                  </p>
                  <p className="text-sm text-gray-500">
                    GPS coordinates will be extracted automatically
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="project_name">Project Name *</Label>
                <Input
                  id="project_name"
                  value={formData.project_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
                  placeholder="Enter project name"
                  className="mt-1.5"
                  data-testid="project-name-input"
                />
              </div>

              <div>
                <Label htmlFor="beneficiary_name">Beneficiary Name *</Label>
                <Input
                  id="beneficiary_name"
                  value={formData.beneficiary_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, beneficiary_name: e.target.value }))}
                  placeholder="Enter beneficiary name"
                  className="mt-1.5"
                  data-testid="beneficiary-name-input"
                />
              </div>

              <div>
                <Label htmlFor="address">Full Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter full address"
                  className="mt-1.5"
                  rows={3}
                  data-testid="address-input"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="mt-1.5" data-testid="status-select">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Manual Coordinate Input */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.coordinates?.lat || ""}
                    onChange={(e) => {
                      const lat = e.target.value ? parseFloat(e.target.value) : null;
                      setFormData(prev => ({
                        ...prev,
                        coordinates: { ...prev.coordinates, lat }
                      }));
                    }}
                    placeholder="e.g., 13.6218"
                    className="mt-1.5"
                    data-testid="latitude-input"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.coordinates?.lng || ""}
                    onChange={(e) => {
                      const lng = e.target.value ? parseFloat(e.target.value) : null;
                      setFormData(prev => ({
                        ...prev,
                        coordinates: { ...prev.coordinates, lng }
                      }));
                    }}
                    placeholder="e.g., 123.1948"
                    className="mt-1.5"
                    data-testid="longitude-input"
                  />
                </div>
              </div>

              {/* Status indicator and Pick on Map button */}
              {formData.coordinates?.lat && formData.coordinates?.lng ? (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Location Set</p>
                      <p className="text-sm text-green-600">
                        {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  {GOOGLE_MAPS_API_KEY && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLocationPicker(true)}
                      className="border-green-300 text-green-700 hover:bg-green-100"
                      data-testid="change-location-btn"
                    >
                      Pick on Map
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">No Location Set</p>
                      <p className="text-sm text-amber-600">
                        Enter coordinates above or pick on map
                      </p>
                    </div>
                  </div>
                  {GOOGLE_MAPS_API_KEY && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLocationPicker(true)}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                      data-testid="pick-location-btn"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Pick on Map
                    </Button>
                  )}
                </div>
              )}

              {/* Helper text */}
              <p className="text-xs text-gray-500">
                Tip: Upload a geotagged photo to auto-extract coordinates, or enter them manually above.
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pb-8">
            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
                data-testid="delete-btn"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#357A37] hover:bg-[#2A6B2E]"
              data-testid="save-btn"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? "Saving..." : isEditMode ? "Update Project" : "Create Project"}
            </Button>
          </div>
        </form>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && GOOGLE_MAPS_API_KEY && (
        <LocationPicker
          coordinates={formData.coordinates}
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
