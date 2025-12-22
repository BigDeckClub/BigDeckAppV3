import React, { memo, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, Sparkles, RefreshCw, Plus, Trash2, Image, AlertTriangle, CheckCircle, Wand2 } from 'lucide-react';
import { useAuthFetch } from '../../hooks/useAuthFetch';

export const EbayListingModal = memo(function EbayListingModal({ open, onClose, deckId, initialPrice, deckName, commander }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [renderedTitle, setRenderedTitle] = useState('');
  const [renderedDescription, setRenderedDescription] = useState('');
  const [price, setPrice] = useState(initialPrice || '');
  const [theme, setTheme] = useState('');
  const [imageUrls, setImageUrls] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [imageGenLoading, setImageGenLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const { authFetch } = useAuthFetch();

  useEffect(() => {
    if (!open) return;
    // Fetch templates when modal opens
    (async () => {
      try {
        setError(null);
        const res = await authFetch('/api/ebay/templates?type=title');
        if (!res.ok) throw new Error('Failed to load templates');
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0) setSelectedTemplateId(data[0].id);
      } catch (err) {
        console.error('[EbayModal] Failed to fetch templates', err);
        setError('Failed to load templates');
      }
    })();
  }, [open, authFetch]);

  // Check deck availability when modal opens
  useEffect(() => {
    if (!open || !deckId) return;
    (async () => {
      try {
        setAvailabilityLoading(true);
        const res = await authFetch(`/api/ebay/check-availability/${deckId}`);
        if (res.ok) {
          const data = await res.json();
          setAvailability(data);
          // Set suggested price if available
          if (data.suggestedPrice && !price) {
            setPrice(data.suggestedPrice.toFixed(2));
          }
        }
      } catch (err) {
        console.error('[EbayModal] Availability check failed', err);
      } finally {
        setAvailabilityLoading(false);
      }
    })();
  }, [open, deckId, authFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render title preview when template changes
  useEffect(() => {
    if (!open || !selectedTemplateId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await authFetch('/api/ebay/templates/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: selectedTemplateId, deckId }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || 'Render failed');
        }
        const json = await res.json();
        setRenderedTitle(json.rendered || '');
      } catch (err) {
        console.error('[EbayModal] Title render error', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedTemplateId, deckId, open, authFetch]);

  // Generate AI description
  const generateAIDescription = useCallback(async () => {
    try {
      setAiLoading(true);
      setError(null);
      const res = await authFetch('/api/ebay/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId, commander, theme: theme || undefined }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Failed to generate description');
      }
      const json = await res.json();
      setRenderedDescription(json.description || '');
    } catch (err) {
      console.error('[EbayModal] AI description error', err);
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  }, [deckId, commander, theme, authFetch]);

  // Generate listing image
  const generateImage = useCallback(async () => {
    try {
      setImageGenLoading(true);
      setError(null);
      const res = await authFetch('/api/ebay/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId, commander, theme: theme || undefined }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Failed to generate image');
      }
      const json = await res.json();
      if (json.imageUrl) {
        // Add the generated image URL to the list
        setImageUrls(prev => {
          const filtered = prev.filter(u => u.trim().length > 0);
          return [...filtered, json.imageUrl];
        });
      }
    } catch (err) {
      console.error('[EbayModal] Image generation error', err);
      setError(err.message);
    } finally {
      setImageGenLoading(false);
    }
  }, [deckId, commander, theme, authFetch]);

  // Generate basic description on open
  useEffect(() => {
    if (!open || !deckId) return;
    // Generate a basic description initially
    generateAIDescription();
  }, [open, deckId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPrice(initialPrice || '');
  }, [initialPrice, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[var(--surface)] text-[var(--bda-text)] rounded-lg w-11/12 max-w-3xl shadow-lg overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className="text-lg font-semibold">Create eBay Listing</h3>
            {deckName && <div className="text-sm text-[var(--text-muted)]">{deckName}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Availability Status */}
          {availabilityLoading ? (
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded text-sm flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              Checking inventory availability...
            </div>
          ) : availability && (
            <div className={`p-3 rounded text-sm flex items-center gap-2 ${availability.available
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
              }`}>
              {availability.available ? (
                <>
                  <CheckCircle size={16} />
                  <span>All {availability.totalCards} cards available in inventory</span>
                  {availability.deckValue > 0 && (
                    <span className="ml-auto text-[var(--text-muted)]">
                      Deck cost: ${availability.deckValue.toFixed(2)}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <AlertTriangle size={16} />
                  <span>Missing {availability.missingCount} of {availability.totalCards} cards</span>
                  {availability.missingCards?.length > 0 && (
                    <span className="ml-2 text-xs">
                      ({availability.missingCards.slice(0, 3).map(c => c.name).join(', ')}
                      {availability.missingCards.length > 3 && ` +${availability.missingCards.length - 3} more`})
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/20 text-red-400 rounded text-sm">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          {/* Title Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title Template</label>
              <select
                value={selectedTemplateId ?? ''}
                onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
                className="block w-full rounded border p-2 bg-[var(--muted-surface)] text-[var(--bda-text)]"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.template_name || `${t.template_type} template`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Theme/Strategy</label>
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., Tribal Dragons, Aristocrats, Voltron"
                className="block w-full rounded border p-2 bg-[var(--muted-surface)] text-[var(--bda-text)]"
              />
            </div>
          </div>

          {/* Title Preview */}
          <div>
            <label className="block text-sm font-medium mb-1">Title Preview</label>
            <div className="p-3 border rounded min-h-[48px] bg-[var(--muted-surface)] text-sm">
              {loading ? 'Rendering...' : renderedTitle || 'No title generated'}
            </div>
          </div>

          {/* Description Section */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Description</label>
              <button
                onClick={generateAIDescription}
                disabled={aiLoading}
                className="flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300 disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Regenerate with AI
                  </>
                )}
              </button>
            </div>
            <textarea
              value={renderedDescription}
              onChange={(e) => setRenderedDescription(e.target.value)}
              className="block w-full rounded border p-3 bg-[var(--muted-surface)] text-[var(--bda-text)] min-h-[200px] text-sm"
              placeholder="Description will be generated..."
            />
          </div>

          {/* Image URLs Section */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <Image size={14} />
                Image URLs
              </label>
              <div className="flex gap-2">
                <button
                  onClick={generateImage}
                  disabled={imageGenLoading}
                  className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 disabled:opacity-50"
                  type="button"
                >
                  {imageGenLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 size={14} />
                      Generate Image
                    </>
                  )}
                </button>
                <button
                  onClick={() => setImageUrls([...imageUrls, ''])}
                  className="flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300"
                  type="button"
                >
                  <Plus size={14} />
                  Add URL
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      const newUrls = [...imageUrls];
                      newUrls[idx] = e.target.value;
                      setImageUrls(newUrls);
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 rounded border p-2 bg-[var(--muted-surface)] text-[var(--bda-text)] text-sm"
                  />
                  {imageUrls.length > 1 && (
                    <button
                      onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== idx))}
                      className="px-2 text-red-400 hover:text-red-300"
                      type="button"
                      title="Remove image"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Add image URLs or generate a listing image automatically
            </p>
          </div>

          {/* Price and Actions */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
            <div>
              <label className="block text-sm font-medium mb-1">Price (USD)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="block w-full rounded border p-2 bg-[var(--muted-surface)] text-[var(--bda-text)]"
                placeholder="0.00"
              />
            </div>

            <div className="flex items-end justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded border border-[var(--border)] hover:bg-[var(--muted-surface)]"
              >
                Cancel
              </button>
              <button
                className="btn-primary px-4 py-2 rounded"
                disabled={loading || !price}
                onClick={async () => {
                  try {
                    setLoading(true);
                    setError(null);
                    // Filter out empty image URLs
                    const validImageUrls = imageUrls.filter(url => url.trim().length > 0);
                    const res = await authFetch('/api/ebay/listings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        deckId,
                        title: renderedTitle,
                        description: renderedDescription,
                        price: Number(price),
                        theme: theme || undefined,
                        imageUrls: validImageUrls.length > 0 ? validImageUrls : undefined
                      })
                    });
                    const j = await res.json();
                    if (!res.ok) throw new Error(j?.error || 'Failed to create listing');
                    onClose();
                  } catch (err) {
                    console.error('[EbayModal] Create listing failed', err);
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? 'Creating...' : 'Create Draft Listing'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

EbayListingModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  deckId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  initialPrice: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  deckName: PropTypes.string,
  commander: PropTypes.string,
};

export default EbayListingModal;
