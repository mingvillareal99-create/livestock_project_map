from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import csv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class Coordinates(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None

class ProjectBase(BaseModel):
    project_name: str
    beneficiary_name: str
    address: str
    status: str = "Proposed"  # Proposed, Ongoing, Completed
    coordinates: Optional[Coordinates] = None

class ProjectCreate(ProjectBase):
    image_data: Optional[str] = None  # Base64 encoded image

class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    beneficiary_name: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    image_data: Optional[str] = None

class Project(ProjectBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DashboardStats(BaseModel):
    total_projects: int
    proposed: int
    ongoing: int
    completed: int
    with_coordinates: int
    without_coordinates: int

# Helper function to extract GPS from EXIF
def extract_gps_from_image(image_data: bytes) -> Optional[dict]:
    try:
        image = Image.open(io.BytesIO(image_data))
        exif_data = image._getexif()
        
        if not exif_data:
            return None
        
        gps_info = {}
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                for gps_tag_id, gps_value in value.items():
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_info[gps_tag] = gps_value
        
        if not gps_info:
            return None
        
        # Convert GPS coordinates to decimal
        def convert_to_degrees(value):
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return d + (m / 60.0) + (s / 3600.0)
        
        if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
            lat = convert_to_degrees(gps_info['GPSLatitude'])
            if gps_info.get('GPSLatitudeRef', 'N') == 'S':
                lat = -lat
            
            lng = convert_to_degrees(gps_info['GPSLongitude'])
            if gps_info.get('GPSLongitudeRef', 'E') == 'W':
                lng = -lng
            
            return {"lat": lat, "lng": lng}
        
        return None
    except Exception as e:
        logging.error(f"Error extracting GPS: {e}")
        return None

# API Routes
@api_router.get("/")
async def root():
    return {"message": "DA Region 5 Project Monitoring API"}

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    total = await db.projects.count_documents({})
    proposed = await db.projects.count_documents({"status": "Proposed"})
    ongoing = await db.projects.count_documents({"status": "Ongoing"})
    completed = await db.projects.count_documents({"status": "Completed"})
    with_coords = await db.projects.count_documents({
        "$and": [
            {"coordinates.lat": {"$ne": None}},
            {"coordinates.lng": {"$ne": None}}
        ]
    })
    
    return DashboardStats(
        total_projects=total,
        proposed=proposed,
        ongoing=ongoing,
        completed=completed,
        with_coordinates=with_coords,
        without_coordinates=total - with_coords
    )

@api_router.post("/projects", response_model=Project)
async def create_project(project: ProjectCreate):
    project_dict = project.model_dump()
    image_data = project_dict.pop('image_data', None)
    
    # Create project object
    project_obj = Project(**project_dict)
    
    # Process image if provided
    if image_data:
        try:
            # Remove data URL prefix if present
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            
            # Extract GPS coordinates from EXIF
            gps_coords = extract_gps_from_image(image_bytes)
            if gps_coords and not project_obj.coordinates:
                project_obj.coordinates = Coordinates(**gps_coords)
            
            # Store image as base64 URL
            project_obj.image_url = f"data:image/jpeg;base64,{image_data}"
        except Exception as e:
            logging.error(f"Error processing image: {e}")
    
    # Convert to dict for MongoDB
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.projects.insert_one(doc)
    return project_obj

@api_router.get("/projects", response_model=List[Project])
async def get_projects(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    has_coordinates: Optional[bool] = Query(None)
):
    query = {}
    
    if status:
        query["status"] = status
    
    if search:
        query["$or"] = [
            {"project_name": {"$regex": search, "$options": "i"}},
            {"beneficiary_name": {"$regex": search, "$options": "i"}},
            {"address": {"$regex": search, "$options": "i"}}
        ]
    
    if has_coordinates is not None:
        if has_coordinates:
            query["$and"] = [
                {"coordinates.lat": {"$ne": None}},
                {"coordinates.lng": {"$ne": None}}
            ]
        else:
            query["$or"] = query.get("$or", []) + [
                {"coordinates": None},
                {"coordinates.lat": None},
                {"coordinates.lng": None}
            ]
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        if isinstance(project.get('updated_at'), str):
            project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    if isinstance(project.get('updated_at'), str):
        project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    
    return project

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_update: ProjectUpdate):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in project_update.model_dump().items() if v is not None}
    
    # Handle image update
    if 'image_data' in update_data:
        image_data = update_data.pop('image_data')
        if image_data:
            try:
                if ',' in image_data:
                    image_data = image_data.split(',')[1]
                
                image_bytes = base64.b64decode(image_data)
                
                # Extract GPS if coordinates not manually set
                if 'coordinates' not in update_data:
                    gps_coords = extract_gps_from_image(image_bytes)
                    if gps_coords:
                        update_data['coordinates'] = gps_coords
                
                update_data['image_url'] = f"data:image/jpeg;base64,{image_data}"
            except Exception as e:
                logging.error(f"Error processing image: {e}")
    
    # Handle coordinates update
    if 'coordinates' in update_data and update_data['coordinates']:
        update_data['coordinates'] = update_data['coordinates'].model_dump() if hasattr(update_data['coordinates'], 'model_dump') else update_data['coordinates']
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return updated

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}

@api_router.get("/export/csv")
async def export_csv(status: Optional[str] = Query(None)):
    query = {}
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['Project Name', 'Beneficiary Name', 'Address', 'Status', 'Latitude', 'Longitude', 'Created At'])
    
    for p in projects:
        coords = p.get('coordinates', {}) or {}
        writer.writerow([
            p.get('project_name', ''),
            p.get('beneficiary_name', ''),
            p.get('address', ''),
            p.get('status', ''),
            coords.get('lat', ''),
            coords.get('lng', ''),
            p.get('created_at', '')
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=projects_export.csv"}
    )

@api_router.get("/export/pdf")
async def export_pdf(status: Optional[str] = Query(None)):
    query = {}
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1E5631'),
        spaceAfter=20
    )
    
    elements = []
    elements.append(Paragraph("DA Region 5 - Project Monitoring Report", title_style))
    elements.append(Spacer(1, 12))
    
    # Table data
    data = [['Project Name', 'Beneficiary', 'Address', 'Status', 'Coordinates']]
    
    for p in projects:
        coords = p.get('coordinates', {}) or {}
        coord_str = f"{coords.get('lat', 'N/A')}, {coords.get('lng', 'N/A')}" if coords.get('lat') else "No coordinates"
        data.append([
            p.get('project_name', '')[:30],
            p.get('beneficiary_name', '')[:25],
            p.get('address', '')[:35],
            p.get('status', ''),
            coord_str
        ])
    
    table = Table(data, colWidths=[120, 100, 150, 80, 120])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E5631')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0FDF4')])
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=projects_report.pdf"}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
