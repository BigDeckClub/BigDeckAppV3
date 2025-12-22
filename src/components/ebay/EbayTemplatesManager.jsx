import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useAuthFetch } from '../../hooks/useAuthFetch';

export default function EbayTemplatesManager({ onClose }) {
  const [templates, setTemplates] = useState([]);
  const [type, setType] = useState('title');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingId, setSavingId] = useState(null);
  const { authFetch } = useAuthFetch();

  useEffect(() => {
    fetchTemplates();
  }, [type]);

  async function fetchTemplates() {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`/api/ebay/templates?type=${encodeURIComponent(type)}`);
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createTemplate() {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch('/api/ebay/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_type: type, template_name: name, template_content: content })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Create failed');
      setName(''); setContent('');
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(t) {
    setEditingId(t.id);
    setEditName(t.template_name || '');
    setEditContent(t.template_content || '');
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditContent('');
    setError(null);
  }

  async function saveTemplate(id) {
    if (!editName || !editContent) {
      setError('Name and content are required');
      return;
    }
    try {
      setSavingId(id);
      setError(null);
      const res = await authFetch(`/api/ebay/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_name: editName, template_content: editContent, template_type: type })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Update failed');
      setTemplates(prev => prev.map(p => (p.id === id ? j : p)));
      cancelEdit();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function removeTemplate(id) {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`/api/ebay/templates/${id}`, { method: 'DELETE' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Delete failed');
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-[var(--bg-page)] rounded">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">eBay Templates</h3>
        <div>
          <button className="text-sm text-[var(--text-muted)] mr-2" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 rounded border p-2">
          <option value="title">Title</option>
          <option value="condition">Condition</option>
          <option value="includes">Includes</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded border p-2 w-full" />
      </div>

      <div className="mb-3">
        <label className="block text-sm">Content</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} className="mt-1 rounded border p-2 w-full" rows={6} />
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="flex gap-2 mb-4">
        <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={createTemplate} disabled={loading}>Create</button>
        <button className="bg-gray-600 text-white px-3 py-2 rounded" onClick={fetchTemplates} disabled={loading}>Refresh</button>
      </div>

      <div>
        <h4 className="font-medium mb-2">Existing templates</h4>
        {loading && <div>Loading...</div>}
        {!loading && templates.length === 0 && <div className="text-sm text-[var(--text-muted)]">No templates</div>}
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="p-2 border rounded bg-[var(--surface)] flex justify-between items-start">
              <div className="w-full">
                {editingId === t.id ? (
                  <div>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full mb-2 rounded border p-2" />
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full rounded border p-2" rows={4} />
                  </div>
                ) : (
                  <div onClick={() => startEdit(t)} className="cursor-pointer hover:bg-[var(--card-hover)] p-1 rounded">
                    <div className="font-semibold">{t.template_name || `${t.template_type} template`}</div>
                    <div className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{t.template_content}</div>
                  </div>
                )}
              </div>
              <div className="ml-3 flex flex-col items-end gap-2">
                {editingId === t.id ? (
                  <>
                    <div className="flex gap-2">
                      <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => saveTemplate(t.id)} disabled={savingId === t.id}>
                        {savingId === t.id ? 'Saving...' : 'Save'}
                      </button>
                      <button className="bg-gray-600 text-white px-3 py-1 rounded" onClick={cancelEdit} disabled={savingId === t.id}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <button className="text-sm text-blue-400 mb-2" onClick={() => startEdit(t)}>Edit</button>
                    <button className="text-sm text-red-500" onClick={() => removeTemplate(t.id)}>Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

EbayTemplatesManager.propTypes = {
  onClose: PropTypes.func.isRequired,
};
