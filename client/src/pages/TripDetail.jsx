import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove,
} from '@dnd-kit/sortable';
import {
  MapPin, Calendar, DollarSign, Plus, List, Map as MapIcon,
  ArrowLeft, Play, X, UserPlus, Images, Lightbulb, Wand2, Users2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TripMap from '../components/TripMap';
import StopForm from '../components/StopForm';
import StopCard from '../components/StopCard';
import SortableStopCard from '../components/SortableStopCard';
import IdeaBoard from '../components/IdeaBoard';
import GroupManager from '../components/GroupManager';
import TripPlayback from '../components/TripPlayback';
import TripSlideshow from '../components/TripSlideshow';
import { optimizeItinerary, totalRouteDistance } from '../lib/routeOptimizer';
import {
  getTrip, createTripItem, updateTripItem, deleteTripItem,
  reorderTripItems, uploadPhoto, deletePhoto, inviteToTrip,
  createActivity, updateActivity, deleteActivity,
  createGroup, updateGroup, deleteGroup,
} from '../lib/api';

const TripDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [tripItems, setTripItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'mine'
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null); // {ok, message}
  const [loadError, setLoadError] = useState('');
  const [viewMode, setViewMode] = useState('split'); // 'split', 'list', 'map'
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [pendingPin, setPendingPin] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [slideshow, setSlideshow] = useState(false);
  const [optimizeMsg, setOptimizeMsg] = useState('');

  // Pointer drag needs a small move threshold so a plain click (edit/delete/
  // photo buttons) doesn't get eaten as a drag start. Keyboard drag: focus
  // the grip handle, Space to pick up, Arrow keys to move, Space to drop.
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getTrip(id);
        setTrip(res.data.trip);
        setMembers(res.data.members || []);
        setGroups(res.data.groups || []);
        setTripItems(res.data.items);
      } catch (err) {
        setLoadError(err.response?.data?.error || 'Failed to load trip');
      }
    };
    load();
  }, [id]);

  const formOpen = showAddForm || editingItem !== null;

  // Map clicks drop a pin while the form is open; otherwise they open the form
  const handleMapClick = useCallback(
    (latlng) => {
      setPendingPin(latlng);
      setShowAddForm((open) => open || editingItem !== null ? open : true);
    },
    [editingItem]
  );

  const closeForm = () => {
    setShowAddForm(false);
    setEditingItem(null);
    setPendingPin(null);
  };

  const handleAddItem = async (fields) => {
    const res = await createTripItem(id, fields);
    setTripItems((items) => [...items, res.data.item]);
    closeForm();
  };

  const handleUpdateItem = async (fields) => {
    const res = await updateTripItem(id, editingItem.id, fields);
    setTripItems((items) =>
      items.map((it) =>
        it.id === editingItem.id
          ? { ...res.data.item, photos: it.photos, activities: it.activities }
          : it
      )
    );
    closeForm();
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from the trip?`)) return;
    await deleteTripItem(id, item.id);
    setTripItems((items) => items.filter((it) => it.id !== item.id));
  };

  // Shared by manual reorder, drag-and-drop, and the optimizer: takes a full
  // ordered array, assigns fresh order_index values, updates state
  // optimistically, then persists.
  const commitOrder = useCallback(
    async (orderedItems) => {
      const reordered = orderedItems.map((it, i) => ({ ...it, order_index: i }));
      setTripItems(reordered);
      await reorderTripItems(
        id,
        reordered.map((it) => ({ id: it.id, order_index: it.order_index }))
      );
    },
    [id]
  );

  const handleMove = (item, direction) => {
    const sorted = [...tripItems].sort((a, b) => a.order_index - b.order_index);
    const from = sorted.findIndex((it) => it.id === item.id);
    const to = from + direction;
    if (to < 0 || to >= sorted.length) return;
    [sorted[from], sorted[to]] = [sorted[to], sorted[from]];
    commitOrder(sorted);
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const sorted = [...tripItems].sort((a, b) => a.order_index - b.order_index);
    const from = sorted.findIndex((it) => it.id === active.id);
    const to = sorted.findIndex((it) => it.id === over.id);
    if (from === -1 || to === -1) return;
    commitOrder(arrayMove(sorted, from, to));
  };

  const handleOptimize = () => {
    const sorted = [...tripItems].sort((a, b) => a.order_index - b.order_index);
    // Distance math needs floats; pg returns DECIMAL columns as strings
    const positioned = sorted
      .filter((it) => it.latitude != null && it.longitude != null)
      .map((it) => ({ ...it, latitude: parseFloat(it.latitude), longitude: parseFloat(it.longitude) }));

    if (positioned.length < 3) {
      setOptimizeMsg('Add at least 3 stops with locations to optimize the route.');
      setTimeout(() => setOptimizeMsg(''), 4000);
      return;
    }

    const before = totalRouteDistance(positioned);
    const optimized = optimizeItinerary(sorted);
    const optimizedPositioned = optimized.filter((it) => it.latitude != null && it.longitude != null);
    const after = totalRouteDistance(
      optimizedPositioned.map((it) => ({ ...it, latitude: parseFloat(it.latitude), longitude: parseFloat(it.longitude) }))
    );
    const savedKm = before - after;

    commitOrder(optimized);
    setOptimizeMsg(
      savedKm > 1
        ? `Reordered — trimmed about ${Math.round(savedKm)} km of local travel. Stops in different cities/countries were left in place.`
        : 'Your order was already close to optimal — only minor tweaks made within each area.'
    );
    setTimeout(() => setOptimizeMsg(''), 6000);
  };

  const handleIdeaPromoted = (item) => {
    setTripItems((items) => [...items, item]);
    setViewMode('split');
  };

  const handleUploadPhoto = async (itemId, file) => {
    try {
      const res = await uploadPhoto(itemId, file);
      setTripItems((items) =>
        items.map((it) =>
          it.id === itemId ? { ...it, photos: [...(it.photos || []), res.data.photo] } : it
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Photo upload failed');
    }
  };

  const handleDeletePhoto = async (itemId, photoId) => {
    await deletePhoto(photoId);
    setTripItems((items) =>
      items.map((it) =>
        it.id === itemId
          ? { ...it, photos: it.photos.filter((p) => p.id !== photoId) }
          : it
      )
    );
  };

  // Dynamic-event sub-activities
  const handleCreateActivity = async (itemId, data) => {
    const res = await createActivity(id, itemId, data);
    setTripItems((items) =>
      items.map((it) =>
        it.id === itemId
          ? { ...it, activities: [...(it.activities || []), res.data.activity] }
          : it
      )
    );
  };

  const handleToggleActivityStatus = async (itemId, activity) => {
    const nextStatus = activity.status === 'optional' ? 'planned' : 'optional';
    const res = await updateActivity(id, itemId, activity.id, { status: nextStatus });
    setTripItems((items) =>
      items.map((it) =>
        it.id === itemId
          ? {
              ...it,
              activities: it.activities.map((a) =>
                a.id === activity.id ? res.data.activity : a
              ),
            }
          : it
      )
    );
  };

  const handleDeleteActivity = async (itemId, activity) => {
    await deleteActivity(id, itemId, activity.id);
    setTripItems((items) =>
      items.map((it) =>
        it.id === itemId
          ? { ...it, activities: it.activities.filter((a) => a.id !== activity.id) }
          : it
      )
    );
  };

  // Trip sub-groups
  const handleCreateGroup = async (data) => {
    const res = await createGroup(id, data);
    setGroups((prev) => [...prev, res.data.group]);
  };

  const handleUpdateGroup = async (groupId, data) => {
    const res = await updateGroup(id, groupId, data);
    setGroups((prev) => prev.map((g) => (g.id === groupId ? res.data.group : g)));
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Delete "${group.name}"? Its stops stay, just unassigned.`)) return;
    await deleteGroup(id, group.id);
    setGroups((prev) => prev.filter((g) => g.id !== group.id));
    setTripItems((items) =>
      items.map((it) => (it.group_id === group.id ? { ...it, group_id: null } : it))
    );
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteStatus(null);
    try {
      const res = await inviteToTrip(id, inviteName);
      setInviteStatus({ ok: true, message: `Invitation sent to ${res.data.invited}!` });
      setInviteName('');
    } catch (err) {
      setInviteStatus({
        ok: false,
        message: err.response?.data?.error || 'Failed to send invitation',
      });
    }
  };

  // Stable identity matters: playback effects depend on this array
  const acceptedMembers = useMemo(
    () => members.filter((m) => m.status === 'owner' || m.status === 'accepted'),
    [members]
  );

  const groupsById = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.id, g])),
    [groups]
  );

  // "My Trip" hides other groups' breakout stops but always keeps the
  // shared base trip (group_id null) visible — a personal view filter,
  // not an access restriction: everyone can still switch back to "Everyone"
  const isVisibleToMe = useCallback(
    (item) => {
      if (viewFilter !== 'mine' || !item.group_id) return true;
      return groupsById[item.group_id]?.member_ids.includes(user?.id) ?? true;
    },
    [viewFilter, groupsById, user?.id]
  );

  const sortedItems = [...tripItems].sort((a, b) => a.order_index - b.order_index);
  const visibleItems = sortedItems.filter(isVisibleToMe);
  const totalCost = tripItems.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
  // Every photo in stop order — the slideshow source
  const allPhotos = sortedItems.flatMap((it) =>
    (it.photos || []).map((p) => ({ ...p, item_name: it.name }))
  );
  // pg returns DECIMAL as strings; playback does arithmetic on these
  const playableStops = sortedItems
    .filter((it) => it.latitude != null && it.longitude != null)
    .map((it) => ({
      ...it,
      latitude: parseFloat(it.latitude),
      longitude: parseFloat(it.longitude),
    }));

  if (loadError) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">😕</div>
          <p className="text-neutral-600 mb-4">{loadError}</p>
          <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

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
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to={`/trip/${id}/gallery`}
                className="btn-ghost px-4 py-2"
                title="Trip photo gallery"
              >
                <Images className="w-4 h-4" />
              </Link>
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
              <button
                className={`btn-ghost px-4 py-2 ${
                  viewMode === 'ideas' ? 'bg-amber-100 text-amber-700' : ''
                }`}
                onClick={() => setViewMode('ideas')}
                title="Idea board"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 mb-1 sm:mb-2">
                {trip.name}
              </h1>
              {trip.description && (
                <p className="text-neutral-600 mb-2 sm:mb-3 text-sm sm:text-base">
                  {trip.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
                {trip.start_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(trip.start_date).toLocaleDateString()}
                      {trip.end_date &&
                        ` - ${new Date(trip.end_date).toLocaleDateString()}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{tripItems.length} stops</span>
                </div>
                {totalCost > 0 && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>${totalCost.toFixed(2)} total</span>
                  </div>
                )}
                {/* Traveler avatars */}
                <div className="flex items-center">
                  <div className="flex -space-x-2 mr-1">
                    {acceptedMembers.slice(0, 5).map((m) => (
                      <span key={m.id} title={m.username}>
                        {m.selfie_url ? (
                          <img
                            src={m.selfie_url}
                            alt={m.username}
                            className="w-7 h-7 rounded-full object-cover border-2 border-white shadow"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-neutral-300 border-2 border-white shadow flex items-center justify-center text-xs font-semibold text-white">
                            {m.username[0].toUpperCase()}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                  {acceptedMembers.length > 1 && (
                    <span className="text-xs text-neutral-500">
                      {acceptedMembers.length} travelers
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              {trip.is_owner && (
                <button className="btn-outline" onClick={() => setShowInvite(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </button>
              )}
              <button className="btn-outline" onClick={() => setShowGroupManager(true)}>
                <Users2 className="w-4 h-4 mr-2" />
                Groups
              </button>
              <button
                className="btn-outline"
                onClick={() => setPlaying(true)}
                disabled={playableStops.length < 1}
                title={
                  playableStops.length < 1
                    ? 'Add stops with locations to replay your trip'
                    : 'Replay your journey'
                }
              >
                <Play className="w-4 h-4 mr-2" />
                Play Trip
              </button>
              <button
                className="btn-outline"
                onClick={() => setSlideshow(true)}
                disabled={allPhotos.length < 1}
                title={
                  allPhotos.length < 1
                    ? 'Add photos to your stops first'
                    : 'Watch all trip photos as a slideshow'
                }
              >
                <Images className="w-4 h-4 mr-2" />
                Slideshow
              </button>
              <button
                className="btn-primary"
                onClick={() => (formOpen ? closeForm() : setShowAddForm(true))}
              >
                {formOpen ? (
                  <X className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {formOpen ? 'Close' : 'Add Stop'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container-page py-6">
        {/* Add / edit stop form */}
        {formOpen && (
          <div className="card mb-6 border-2 border-primary-200">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? `Edit "${editingItem.name}"` : 'Add a Stop'}
            </h3>
            <StopForm
              key={editingItem?.id || 'new'}
              item={editingItem}
              pendingPin={pendingPin}
              isFirstStop={!editingItem && tripItems.length === 0}
              groups={groups}
              onSubmit={editingItem ? handleUpdateItem : handleAddItem}
              onCancel={closeForm}
            />
          </div>
        )}

        {/* Ideas view replaces the itinerary/map grid entirely */}
        {viewMode === 'ideas' ? (
          <IdeaBoard
            tripId={id}
            currentUserId={user?.id}
            isOwner={trip.is_owner}
            onPromoted={handleIdeaPromoted}
          />
        ) : (
          <div
            className={`grid gap-6 ${
              viewMode === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {/* List view */}
            {(viewMode === 'list' || viewMode === 'split') && (
              <div>
                <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold">Itinerary</h2>
                  <div className="flex items-center gap-2">
                    {groups.length > 0 && (
                      <div className="flex items-center bg-neutral-100 rounded-full p-0.5">
                        {[
                          { value: 'all', label: 'Everyone' },
                          { value: 'mine', label: 'My Trip' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            className={`text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${
                              viewFilter === opt.value
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-800'
                            }`}
                            onClick={() => setViewFilter(opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {sortedItems.length >= 3 && viewFilter === 'all' && (
                      <button
                        className="btn-outline px-3 py-1.5 text-sm"
                        onClick={handleOptimize}
                        title="Reorder stops within each area for a shorter route; different cities/countries stay in your planned order"
                      >
                        <Wand2 className="w-4 h-4 mr-1.5" />
                        Optimize Route
                      </button>
                    )}
                  </div>
                </div>
                {optimizeMsg && (
                  <div className="mb-3 p-3 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-800">
                    {optimizeMsg}
                  </div>
                )}
                <div className="space-y-3">
                  {visibleItems.length === 0 ? (
                    <div className="card text-center py-12">
                      <div className="text-4xl mb-4">📍</div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                        {viewFilter === 'mine' ? 'Nothing in your trip yet' : 'No stops yet'}
                      </h3>
                      <p className="text-neutral-600 mb-4">
                        {viewFilter === 'mine'
                          ? 'Stops from your groups (and the shared trip) will show up here'
                          : 'Search for a place or click the map to drop your first pin'}
                      </p>
                      {viewFilter === 'all' && (
                        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Stop
                        </button>
                      )}
                    </div>
                  ) : viewFilter === 'mine' ? (
                    // A filtered personal view — reordering operates on the full,
                    // unfiltered order, so it's not offered while filtered
                    visibleItems.map((item, index) => (
                      <StopCard
                        key={item.id}
                        item={item}
                        index={sortedItems.indexOf(item)}
                        isFirst
                        isLast
                        group={groupsById[item.group_id]}
                        onEdit={(it) => {
                          setEditingItem(it);
                          setShowAddForm(false);
                          setPendingPin(null);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onDelete={handleDeleteItem}
                        onMove={() => {}}
                        onUploadPhoto={handleUploadPhoto}
                        onDeletePhoto={handleDeletePhoto}
                        onCreateActivity={handleCreateActivity}
                        onToggleActivityStatus={handleToggleActivityStatus}
                        onDeleteActivity={handleDeleteActivity}
                      />
                    ))
                  ) : (
                    <DndContext
                      sensors={dragSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={sortedItems.map((it) => it.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {sortedItems.map((item, index) => (
                          <SortableStopCard
                            key={item.id}
                            item={item}
                            index={index}
                            isFirst={index === 0}
                            isLast={index === sortedItems.length - 1}
                            group={groupsById[item.group_id]}
                            onEdit={(it) => {
                              setEditingItem(it);
                              setShowAddForm(false);
                              setPendingPin(null);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            onDelete={handleDeleteItem}
                            onMove={handleMove}
                            onUploadPhoto={handleUploadPhoto}
                            onDeletePhoto={handleDeletePhoto}
                            onCreateActivity={handleCreateActivity}
                            onToggleActivityStatus={handleToggleActivityStatus}
                            onDeleteActivity={handleDeleteActivity}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            )}

            {/* Map view — first on mobile so it sits next to the add-stop form */}
            {(viewMode === 'map' || viewMode === 'split') && (
              <div className="order-first md:order-none">
                <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
                  Map View
                  {formOpen && (
                    <span className="text-sm font-normal text-amber-600">
                      Click the map to place this stop 📍
                    </span>
                  )}
                </h2>
                <div
                  className={`${
                    viewMode === 'map'
                      ? 'h-[60vh] md:h-[calc(100vh-280px)]'
                      : 'h-[45vh] md:h-[600px]'
                  } md:sticky md:top-40`}
                >
                  <TripMap
                    tripItems={viewFilter === 'mine' ? visibleItems : tripItems}
                    onMapClick={handleMapClick}
                    draftPin={formOpen ? pendingPin : null}
                    groups={groups}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Invite a Traveler</h3>
              <button
                className="p-1 text-neutral-400 hover:text-neutral-700"
                onClick={() => {
                  setShowInvite(false);
                  setInviteStatus(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {inviteStatus && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm border ${
                  inviteStatus.ok
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {inviteStatus.message}
              </div>
            )}
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Username or email
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="friend@example.com"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  autoFocus
                />
                <p className="mt-1 text-xs text-neutral-500">
                  They'll see the invitation on their dashboard and can add
                  stops and photos once they join.
                </p>
              </div>
              <button type="submit" className="btn-primary w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Send Invitation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Group manager modal */}
      {showGroupManager && (
        <GroupManager
          groups={groups}
          members={acceptedMembers}
          onCreate={handleCreateGroup}
          onUpdate={handleUpdateGroup}
          onDelete={handleDeleteGroup}
          onClose={() => setShowGroupManager(false)}
        />
      )}

      {/* Slideshow overlay */}
      {slideshow && (
        <TripSlideshow trip={trip} photos={allPhotos} onClose={() => setSlideshow(false)} />
      )}

      {/* Playback overlay */}
      {playing && (
        <TripPlayback
          trip={trip}
          stops={playableStops}
          travelers={acceptedMembers}
          onClose={() => setPlaying(false)}
        />
      )}
    </div>
  );
};

export default TripDetail;
