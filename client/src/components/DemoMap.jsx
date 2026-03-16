import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for different types
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

const DemoMap = () => {
  // Sample trip locations with different types
  const locations = [
    {
      id: 1,
      name: 'Eiffel Tower',
      position: [48.8584, 2.2945],
      type: 'Experience',
      color: '#ef4444',
      cost: '$25',
      time: '10:00 AM',
    },
    {
      id: 2,
      name: 'Le Jules Verne',
      position: [48.8583, 2.2940],
      type: 'Dining',
      color: '#0ea5e9',
      cost: '$120',
      time: '12:30 PM',
    },
    {
      id: 3,
      name: 'Louvre Museum',
      position: [48.8606, 2.3376],
      type: 'Experience',
      color: '#ef4444',
      cost: '$18',
      time: '2:00 PM',
    },
    {
      id: 4,
      name: 'Seine River Cruise',
      position: [48.8630, 2.3390],
      type: 'Experience',
      color: '#ef4444',
      cost: '$15',
      time: '5:00 PM',
    },
    {
      id: 5,
      name: 'Arc de Triomphe',
      position: [48.8738, 2.2950],
      type: 'Experience',
      color: '#ef4444',
      cost: 'Free',
      time: '7:00 PM',
    },
  ];

  // Route connecting the locations (suggested optimal path)
  const routePath = locations.map((loc) => loc.position);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-neutral-200 relative">
      <MapContainer
        center={[48.8606, 2.3100]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        />

        {/* Route line showing optimal path */}
        <Polyline
          positions={routePath}
          pathOptions={{
            color: '#ef4444',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10',
          }}
        />

        {/* Location markers */}
        {locations.map((location, index) => (
          <Marker
            key={location.id}
            position={location.position}
            icon={createCustomIcon(location.color)}
          >
            <Popup>
              <div className="min-w-[180px]">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-neutral-900 text-sm">
                      {index + 1}. {location.name}
                    </p>
                    <p className="text-xs text-neutral-600 mt-1">{location.type}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200">
                  <span className="text-xs text-neutral-600">⏰ {location.time}</span>
                  <span className="text-xs font-semibold text-primary-600">
                    💰 {location.cost}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Interactive legend overlay */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000] max-w-[200px]">
        <p className="text-xs font-semibold text-neutral-900 mb-2">
          📍 Paris Day Trip
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary-500"></div>
            <span className="text-xs text-neutral-600">Experience</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-secondary-500"></div>
            <span className="text-xs text-neutral-600">Dining</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-primary-500" style={{ width: '12px' }}></div>
            <span className="text-xs text-neutral-600">Route</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-neutral-200">
          <p className="text-xs text-neutral-500">
            💰 Total: <span className="font-semibold text-neutral-900">$178</span>
          </p>
        </div>
      </div>

      {/* Feature badges overlay */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-1.5">
          <p className="text-xs font-semibold text-primary-600">✨ Click markers for details</p>
        </div>
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-1.5">
          <p className="text-xs font-semibold text-secondary-600">🗺️ Optimized route shown</p>
        </div>
      </div>
    </div>
  );
};

export default DemoMap;
