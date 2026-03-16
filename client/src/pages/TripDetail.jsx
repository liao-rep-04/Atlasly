import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  List,
  Map as MapIcon,
  ArrowLeft,
  Edit,
  Trash2,
} from 'lucide-react';
import TripMap from '../components/TripMap';

const TripDetail = () => {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [tripItems, setTripItems] = useState([]);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'list', 'map'
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItem, setNewItem] = useState({
    type: 'experience',
    name: '',
    description: '',
    location_name: '',
    latitude: '',
    longitude: '',
    cost: '',
    date: '',
    time: '',
  });

  // Mock data for demo - replace with API call
  useEffect(() => {
    // Simulate API call
    setTrip({
      id: id,
      name: 'Paris Adventure',
      description: 'A wonderful trip to the City of Light',
      start_date: '2026-06-01',
      end_date: '2026-06-07',
      status: 'planning',
    });

    setTripItems([
      {
        id: '1',
        trip_id: id,
        type: 'experience',
        name: 'Eiffel Tower',
        description: 'Visit the iconic Eiffel Tower',
        location_name: 'Champ de Mars, Paris',
        latitude: 48.8584,
        longitude: 2.2945,
        cost: 25,
        date: '2026-06-02',
        time: '10:00',
        order_index: 0,
      },
      {
        id: '2',
        trip_id: id,
        type: 'dining',
        name: 'Le Jules Verne',
        description: 'Fine dining at the Eiffel Tower',
        location_name: 'Eiffel Tower, Avenue Gustave Eiffel',
        latitude: 48.8583,
        longitude: 2.294,
        cost: 120,
        date: '2026-06-02',
        time: '12:30',
        order_index: 1,
      },
      {
        id: '3',
        trip_id: id,
        type: 'experience',
        name: 'Louvre Museum',
        description: 'Explore world-famous art and artifacts',
        location_name: 'Rue de Rivoli, Paris',
        latitude: 48.8606,
        longitude: 2.3376,
        cost: 18,
        date: '2026-06-03',
        time: '14:00',
        order_index: 2,
      },
    ]);
  }, [id]);

  const handleAddItem = (e) => {
    e.preventDefault();
    const item = {
      ...newItem,
      id: Date.now().toString(),
      trip_id: id,
      order_index: tripItems.length,
      latitude: parseFloat(newItem.latitude) || null,
      longitude: parseFloat(newItem.longitude) || null,
      cost: parseFloat(newItem.cost) || 0,
    };
    setTripItems([...tripItems, item]);
    setShowAddItemForm(false);
    setNewItem({
      type: 'experience',
      name: '',
      description: '',
      location_name: '',
      latitude: '',
      longitude: '',
      cost: '',
      date: '',
      time: '',
    });
  };

  const handleDeleteItem = (itemId) => {
    setTripItems(tripItems.filter((item) => item.id !== itemId));
  };

  const totalCost = tripItems.reduce((sum, item) => sum + (item.cost || 0), 0);

  if (!trip) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-neutral-600">Loading trip...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="container-page py-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                className={`btn-ghost px-4 py-2 ${
                  viewMode === 'list' ? 'bg-primary-100 text-primary-700' : ''
                }`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                className={`btn-ghost px-4 py-2 ${
                  viewMode === 'split' ? 'bg-primary-100 text-primary-700' : ''
                }`}
                onClick={() => setViewMode('split')}
              >
                <List className="w-4 h-4 mr-1" />
                <MapIcon className="w-4 h-4" />
              </button>
              <button
                className={`btn-ghost px-4 py-2 ${
                  viewMode === 'map' ? 'bg-primary-100 text-primary-700' : ''
                }`}
                onClick={() => setViewMode('map')}
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-neutral-900 mb-2">
                {trip.name}
              </h1>
              {trip.description && (
                <p className="text-neutral-600 mb-3">{trip.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-neutral-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(trip.start_date).toLocaleDateString()} -{' '}
                    {new Date(trip.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{tripItems.length} locations</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>${totalCost.toFixed(2)} total</span>
                </div>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => setShowAddItemForm(!showAddItemForm)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container-page py-6">
        {/* Add item form */}
        {showAddItemForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">Add New Location</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Type
                  </label>
                  <select
                    className="input"
                    value={newItem.type}
                    onChange={(e) =>
                      setNewItem({ ...newItem, type: e.target.value })
                    }
                    required
                  >
                    <option value="experience">Experience</option>
                    <option value="dining">Dining</option>
                    <option value="hotel">Hotel</option>
                    <option value="transportation">Transportation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input"
                  rows="2"
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Location Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Eiffel Tower, Paris"
                  value={newItem.location_name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, location_name: e.target.value })
                  }
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="input"
                    placeholder="48.8584"
                    value={newItem.latitude}
                    onChange={(e) =>
                      setNewItem({ ...newItem, latitude: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="input"
                    placeholder="2.2945"
                    value={newItem.longitude}
                    onChange={(e) =>
                      setNewItem({ ...newItem, longitude: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={newItem.cost}
                    onChange={(e) =>
                      setNewItem({ ...newItem, cost: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={newItem.date}
                    onChange={(e) =>
                      setNewItem({ ...newItem, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    className="input"
                    value={newItem.time}
                    onChange={(e) =>
                      setNewItem({ ...newItem, time: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">
                  Add Location
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowAddItemForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Content based on view mode */}
        <div
          className={`grid gap-6 ${
            viewMode === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {/* List view */}
          {(viewMode === 'list' || viewMode === 'split') && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Itinerary</h2>
              <div className="space-y-3">
                {tripItems.length === 0 ? (
                  <div className="card text-center py-12">
                    <div className="text-4xl mb-4">📍</div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                      No locations yet
                    </h3>
                    <p className="text-neutral-600 mb-4">
                      Add your first location to start planning
                    </p>
                    <button
                      className="btn-primary"
                      onClick={() => setShowAddItemForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Location
                    </button>
                  </div>
                ) : (
                  tripItems.map((item, index) => (
                    <div key={item.id} className="card hover:shadow-lg transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-neutral-900">
                                {item.name}
                              </h3>
                              <p className="text-sm text-neutral-600 capitalize">
                                {item.type}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button className="p-2 text-neutral-400 hover:text-primary-600">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 text-neutral-400 hover:text-red-600"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-sm text-neutral-600 mb-2">
                              {item.description}
                            </p>
                          )}
                          {item.location_name && (
                            <p className="text-sm text-neutral-500 mb-2">
                              📍 {item.location_name}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-neutral-600">
                            {item.date && (
                              <span>
                                📅 {new Date(item.date).toLocaleDateString()}
                              </span>
                            )}
                            {item.time && <span>⏰ {item.time}</span>}
                            {item.cost > 0 && (
                              <span className="font-semibold text-primary-600">
                                💰 ${item.cost.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Map view */}
          {(viewMode === 'map' || viewMode === 'split') && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Map View</h2>
              <div
                className={`${
                  viewMode === 'map' ? 'h-[calc(100vh-280px)]' : 'h-[600px]'
                }`}
              >
                <TripMap tripItems={tripItems} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripDetail;
