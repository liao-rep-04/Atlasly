# Atlasly - Trip Planning App Setup

## Project Overview
**Name**: Atlasly
**Description**: Pinterest-style trip planning application
**Target Audience**: Primarily female users (girlfriends, moms) - friendly, approachable design

## Core Features

### 1. Trip Planning
- Create trips with multiple destinations
- Add items to trip lists:
  - **Experiences** (activities, attractions, tours)
  - **Dining** (restaurants, cafes, food markets)
  - **Hotels** (accommodations with booking details)
  - **Transportation** (flights, trains, car rentals, etc.)
  - **Cost tracking** for each item

### 2. Interactive Map
- Display all trip items on a map
- Suggest optimal travel routes between locations
- Visual representation of trip itinerary

### 3. Itinerary Management
- Drag-and-drop reordering of trip items
- Add/remove items dynamically
- Edit trip details and costs

### 4. Photo Management
- Upload photos for each trip item
- Gallery view for completed trips
- Hover to view photos for each location/experience

### 5. Location Information
- Integration with Google Places API for descriptions
- Auto-populate details for well-known locations
- User-editable text fields for custom descriptions

## Tech Stack

### Frontend
- **React** (Vite)
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Leaflet** or **Google Maps API** for mapping
- **React Beautiful DnD** for drag-and-drop
- **Axios** for API calls
- **Vitest** + **React Testing Library** for unit tests

### Backend
- **Node.js** + **Express**
- **PostgreSQL** database
- **Google Places API** integration
- **Multer** or **Cloudinary** for image uploads
- **Jest** for API testing

### Deployment
- **Render** (same account as fitness tracker)
- Separate services for frontend and backend
- PostgreSQL database on Render

## Database Schema (Preliminary)

### Tables
1. **users** - User authentication and profiles
2. **trips** - Trip details (name, dates, status)
3. **trip_items** - Individual items in a trip (experiences, dining, hotels, etc.)
4. **photos** - Photos associated with trip items
5. **costs** - Cost tracking for trip items

## Design Considerations
- **Color Palette**: Soft, inviting colors (pastels, warm tones)
- **Typography**: Friendly, readable fonts
- **UI/UX**: Clean, Pinterest-inspired grid layouts
- **Responsive**: Mobile-first design
- **Accessibility**: WCAG compliant

## Testing Strategy
- Unit tests for all new features
- Comprehensive logging for debugging
- Test coverage for:
  - API endpoints
  - React components
  - Map functionality
  - Image uploads
  - Drag-and-drop behavior

## Development Phases
1. **Phase 1**: Project setup, authentication, basic CRUD
2. **Phase 2**: Map integration, location search
3. **Phase 3**: Photo uploads and gallery
4. **Phase 4**: Drag-and-drop itinerary management
5. **Phase 5**: Google Places API integration
6. **Phase 6**: Route optimization
7. **Phase 7**: Polish, testing, deployment

## Next Steps
1. Initialize npm projects (client + server)
2. Set up basic folder structure
3. Configure Vite + React
4. Set up Express server
5. Configure PostgreSQL database
6. Create GitHub repository
7. Set up Render deployment
8. Begin Phase 1 development
