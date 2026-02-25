# DA Region 5 Project Monitoring Dashboard - PRD

## Original Problem Statement
Build a full-stack Project Monitoring Dashboard with Google Maps integration. Core features include a Project Gallery with photo uploads, EXIF GPS coordinate extraction, and a database for Projects (Project Name, Beneficiary Name, Address, Status, Coordinates). Mobile-responsive UI for field workers. Map View tab with project pins, Quick Info cards, and 'Pick on Map' tool. DA Region 5 branding with green theme.

## User Persona
- **Primary**: Government field workers in DA Region 5
- **Device**: Mobile-first (field use) and desktop (office)
- **Needs**: Quick project documentation, GPS tracking, status updates, visual verification

## Core Requirements (Static)
1. ✅ Project CRUD operations
2. ✅ Image upload with EXIF GPS extraction
3. ✅ Status management (Proposed, Ongoing, Completed)
4. ✅ Search and filter functionality
5. ✅ Export to CSV/PDF
6. ✅ Dashboard statistics
7. ✅ Map View with project pins
8. ✅ Pick on Map tool for manual location
9. ✅ Mobile-responsive UI
10. ✅ DA Region 5 branding

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Maps**: @vis.gl/react-google-maps (with fallback list view)
- **Image Processing**: Pillow (backend EXIF), exif-js (frontend)
- **Export**: ReportLab (PDF), CSV streaming

## What's Been Implemented (Feb 25, 2026)
- [x] Dashboard with real-time statistics
- [x] Project Gallery with grid view and search/filter
- [x] Add/Edit Project form with image upload
- [x] EXIF GPS extraction from uploaded images
- [x] Status dropdown (Proposed, Ongoing, Completed)
- [x] Map View with Google Maps integration + fallback
- [x] Pick on Map location tool
- [x] Export CSV functionality
- [x] Export PDF functionality
- [x] Mobile responsive layout with bottom nav
- [x] Custom DA Region 5 logo and branding
- [x] Color-coded status badges

## Known Limitations
- Google Maps API key requires HTTP referrer configuration for the domain
- Fallback list view provided when Maps API is unavailable

## Prioritized Backlog
### P0 (Critical)
- None (MVP complete)

### P1 (High Priority)
- Configure Google Maps API key referrer restrictions
- Add bulk project import (CSV)
- Add project activity log/history

### P2 (Medium Priority)
- Add project categories/tags
- Add beneficiary contact details
- Offline mode for field workers
- Push notifications for status changes

## Next Tasks
1. Configure Google Maps API key with HTTP referrer for the production domain
2. Add image gallery support (multiple images per project)
3. Add project reporting/analytics
