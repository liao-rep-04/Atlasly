# Atlasly - Trip Planning App

Pinterest-style trip planning application that helps you organize and visualize your perfect trip.

## Features

- 📍 **Trip Planning** - Create and manage trips with multiple destinations
- 🗺️ **Interactive Maps** - View all trip items on an interactive map
- 📸 **Photo Management** - Upload and organize photos for each location
- 💰 **Cost Tracking** - Track expenses for experiences, dining, hotels, and transportation
- 🔄 **Drag & Drop** - Easily reorder your itinerary
- 🌍 **Google Places Integration** - Auto-populate location details

## Tech Stack

### Frontend
- React 19 + Vite
- Tailwind CSS
- React Router
- Axios
- Vitest (Testing)

### Backend
- Node.js + Express
- PostgreSQL
- JWT Authentication
- Jest (Testing)

## Getting Started

### Prerequisites
- Node.js 18+ (recommended: 20+)
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/liao-rep-04/Atlasly.git
cd atlasly
```

2. Install dependencies:
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Set up environment variables:
```bash
# In /server directory
cp .env.example .env
# Edit .env with your database credentials
```

4. Create PostgreSQL database:
```bash
createdb atlasly
```

5. Start development servers:
```bash
# Terminal 1 - Server (from /server)
npm run dev

# Terminal 2 - Client (from /client)
npm run dev
```

6. Open http://localhost:5173

## Testing

⚠️ **No code deployed without passing tests!**

```bash
# Client tests
cd client && npm test

# Server tests
cd server && npm test

# Coverage
npm run test:coverage
```

## License

MIT
