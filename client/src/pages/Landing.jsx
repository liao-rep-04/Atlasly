import { useState } from 'react';
import { Link } from 'react-router-dom';
import DemoMap from '../components/DemoMap';
import {
  MapPin,
  Camera,
  DollarSign,
  Map,
  Calendar,
  Users,
  ArrowRight,
  Check,
  Star,
  Globe,
  Compass,
  Heart,
  Sparkles
} from 'lucide-react';

const Landing = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: MapPin,
      title: 'Pin Your Dreams',
      description: 'Drop pins on all the places you want to visit. From hidden cafes to iconic landmarks.',
      demo: '🗺️',
    },
    {
      icon: Calendar,
      title: 'Smart Itineraries',
      description: 'Drag and drop to reorder your plans. We suggest the best route to save time.',
      demo: '📅',
    },
    {
      icon: Camera,
      title: 'Visual Memories',
      description: 'Upload photos for each location. Relive your journey with beautiful galleries.',
      demo: '📸',
    },
    {
      icon: DollarSign,
      title: 'Budget Tracking',
      description: 'Track costs for experiences, dining, hotels, and transport. Stay on budget.',
      demo: '💰',
    },
    {
      icon: Sparkles,
      title: 'AI Tour Guide',
      description: 'Immersive AI guide that adapts to your location, answers questions, and brings destinations to life.',
      demo: '🤖',
    },
  ];

  const stats = [
    { number: '4.9', label: 'Rating' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-neutral-200 z-50">
        <div className="container-page">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Compass className="w-8 h-8 text-primary-600" />
              <span className="text-2xl font-display font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Atlasly
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="btn-ghost">
                Sign In
              </Link>
              <Link to="/register" className="btn-primary">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6 animate-fade-in">
            <Star className="w-4 h-4 fill-current" />
            Loved by travelers worldwide
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold text-neutral-900 mb-6 animate-fade-in">
            Plan Your Perfect
            <span className="block bg-gradient-to-r from-primary-600 via-secondary-600 to-accent-600 bg-clip-text text-transparent">
              Adventure
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-neutral-600 mb-8 max-w-3xl mx-auto animate-fade-in">
            Pinterest meets Google Maps. Organize your dream trips with beautiful boards,
            smart itineraries, and photo galleries.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in">
            <Link to="/register" className="btn-primary text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-shadow">
              Start Planning Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <button className="btn-outline text-lg px-8 py-4">
              Watch Demo
            </button>
          </div>

          {/* Hero Image/Demo */}
          <div className="relative max-w-5xl mx-auto animate-fade-in">
            <div className="aspect-video rounded-2xl overflow-hidden">
              <DemoMap />
            </div>
            {/* Floating cards */}
            <div className="absolute -top-4 -left-4 bg-white p-4 rounded-xl shadow-lg border border-neutral-200 hidden md:block">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Paris, France</p>
                  <p className="text-xs text-neutral-500">Added to bucket list</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 bg-white p-4 rounded-xl shadow-lg border border-neutral-200 hidden md:block">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white fill-current" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Trip Saved!</p>
                  <p className="text-xs text-neutral-500">Ready to explore</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex justify-center">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-neutral-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Plan, organize, and relive your adventures with powerful yet simple tools
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isAIFeature = feature.title === 'AI Tour Guide';
              return (
                <div
                  key={index}
                  className={`group card-soft hover:shadow-xl transition-all duration-300 cursor-pointer ${
                    isAIFeature ? 'md:col-span-2' : ''
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${
                      isAIFeature
                        ? 'bg-gradient-to-br from-accent-500 via-primary-500 to-secondary-600'
                        : 'bg-gradient-to-br from-primary-500 to-secondary-600'
                    } rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                        {feature.title}
                        {isAIFeature && <span className="ml-2 text-sm bg-gradient-to-r from-accent-600 to-primary-600 bg-clip-text text-transparent font-bold">NEW</span>}
                      </h3>
                      <p className="text-neutral-600 mb-4">
                        {feature.description}
                      </p>
                      <div className="text-4xl">{feature.demo}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-neutral-600">
              Start planning in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Your Trip',
                description: 'Pick a destination and give your adventure a name',
                icon: Globe,
              },
              {
                step: '02',
                title: 'Add Experiences',
                description: 'Pin places to visit, restaurants, hotels, and activities',
                icon: MapPin,
              },
              {
                step: '03',
                title: 'Organize & Go',
                description: 'Reorder your itinerary and track your journey',
                icon: Compass,
              },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-secondary-600 text-white text-2xl font-bold rounded-2xl mb-4">
                    {step.step}
                  </div>
                  <Icon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-neutral-600">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-6">
                Why Travelers Love Atlasly
              </h2>
              <div className="space-y-4">
                {[
                  'Visual planning like Pinterest',
                  'Smart route suggestions',
                  'Collaborative trip planning',
                  'Budget tracking made easy',
                  'Photo galleries for memories',
                  'AI tour guide for immersive exploration',
                  'Works on all devices',
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg text-neutral-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl p-8 h-96 flex items-center justify-center">
              <div className="text-center">
                <Users className="w-24 h-24 text-primary-600 mx-auto mb-4" />
                <p className="text-xl font-semibold text-neutral-700">
                  Join thousands of happy travelers
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-600 to-secondary-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            Ready to Plan Your Next Adventure?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join Atlasly today and start organizing your dream trips
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl transition-shadow"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-white/80 mt-4 text-sm">
            No credit card required • Free forever
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-neutral-900 text-neutral-400">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Compass className="w-6 h-6 text-primary-400" />
              <span className="text-xl font-display font-bold text-white">
                Atlasly
              </span>
            </div>
            <div className="flex gap-6">
              <Link to="/login" className="hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="hover:text-white transition-colors">
                Register
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-neutral-800 text-center text-sm">
            © 2026 Atlasly. Made with ❤️ for travelers everywhere.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
