import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="container-page">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-2xl font-display font-bold text-primary-600">
              Atlasly
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-600">
                Welcome, {user?.fullName || user?.username}!
              </span>
              <button onClick={handleLogout} className="btn-outline">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-page">
        <div className="py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-neutral-900 mb-2">
              My Trips
            </h2>
            <p className="text-neutral-600">
              Start planning your next adventure
            </p>
          </div>

          {/* Empty State */}
          <div className="card text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">✈️</div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                No trips yet
              </h3>
              <p className="text-neutral-600 mb-6">
                Create your first trip and start planning your perfect getaway!
              </p>
              <button className="btn-primary">
                Create Your First Trip
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
