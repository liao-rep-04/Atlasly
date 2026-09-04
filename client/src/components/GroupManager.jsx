import { useState } from 'react';
import { X, Plus, Trash2, Users2 } from 'lucide-react';
import { GROUP_COLORS } from '../lib/tripConstants';

const emptyForm = { name: '', color: GROUP_COLORS[0], member_ids: [] };

/**
 * Manage trip sub-groups: a person or subset of travelers doing their own
 * thing within the same trip (e.g. "Hiking Crew"). Each group gets a color
 * that frames its stops in the itinerary and colors its route on the map.
 */
const GroupManager = ({ groups, members, onCreate, onUpdate, onDelete, onClose }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const toggleMember = (userId) =>
    setForm((f) => ({
      ...f,
      member_ids: f.member_ids.includes(userId)
        ? f.member_ids.filter((id) => id !== userId)
        : [...f.member_ids, userId],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreate(form);
      setForm(emptyForm);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = (group, userId) => {
    onUpdate(group.id, { member_ids: group.member_ids.filter((id) => id !== userId) });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users2 className="w-5 h-5 text-primary-500" />
            Trip Groups
          </h3>
          <button className="p-1 text-neutral-400 hover:text-neutral-700" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-neutral-600 mb-4">
          Splitting off to do your own thing? Create a group, assign stops to
          it, and it'll get its own color on the itinerary and map.
        </p>

        {groups.length > 0 && (
          <div className="space-y-2 mb-4">
            {groups.map((group) => (
              <div key={group.id} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-2 font-medium text-neutral-900">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    {group.name}
                  </span>
                  <button
                    className="p-1 text-neutral-300 hover:text-red-600"
                    onClick={() => onDelete(group)}
                    title="Delete group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const inGroup = group.member_ids.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        className={`text-xs rounded-full px-2 py-0.5 border transition-colors ${
                          inGroup
                            ? 'text-white border-transparent'
                            : 'text-neutral-500 border-neutral-200 hover:border-neutral-300'
                        }`}
                        style={inGroup ? { backgroundColor: group.color } : undefined}
                        onClick={() =>
                          inGroup
                            ? handleRemoveMember(group, m.id)
                            : onUpdate(group.id, { member_ids: [...group.member_ids, m.id] })
                        }
                      >
                        {m.username}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-3 border-t border-neutral-200 pt-4">
            <input
              type="text"
              className="input"
              placeholder="Group name (e.g. Hiking Crew)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
            <div>
              <p className="text-xs font-medium text-neutral-600 mb-1.5">Color</p>
              <div className="flex flex-wrap gap-2">
                {GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-7 h-7 rounded-full ${
                      form.color === color ? 'ring-2 ring-offset-2 ring-neutral-400' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setForm({ ...form, color })}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-600 mb-1.5">
                Who's in this group?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${
                      form.member_ids.includes(m.id)
                        ? 'text-white border-transparent'
                        : 'text-neutral-600 border-neutral-300 hover:border-neutral-400'
                    }`}
                    style={form.member_ids.includes(m.id) ? { backgroundColor: form.color } : undefined}
                    onClick={() => toggleMember(m.id)}
                  >
                    {m.username}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Creating...' : 'Create Group'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="btn-outline w-full"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Group
          </button>
        )}
      </div>
    </div>
  );
};

export default GroupManager;
