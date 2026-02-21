import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Users } from 'lucide-react';
import { semestersApi } from '../services/api';

export default function ManageBatchesModal({ semester, isOpen, onClose }) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newBatchName, setNewBatchName] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && semester) {
            fetchBatches();
        }
    }, [isOpen, semester]);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const res = await semestersApi.getBatches(semester.id);
            setBatches(res.data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Failed to load batches');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBatch = async (e) => {
        e.preventDefault();
        if (!newBatchName.trim()) return;

        try {
            await semestersApi.createBatch(semester.id, { name: newBatchName });
            setNewBatchName('');
            fetchBatches(); // Refresh list
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to create batch');
        }
    };

    const handleDeleteBatch = async (batchId) => {
        if (!confirm('Are you sure you want to delete this batch? All associated assignments will be lost.')) return;

        try {
            await semestersApi.deleteBatch(semester.id, batchId);
            fetchBatches(); // Refresh list
        } catch (err) {
            console.error(err);
            setError('Failed to delete batch');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2>Manage Batches</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <p style={{ marginBottom: '1rem', color: '#666' }}>
                        Manage batches for <strong>{semester?.name}</strong>.
                    </p>

                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    {/* Batch List */}
                    <div className="batches-list" style={{ marginBottom: '1.5rem' }}>
                        {loading ? (
                            <div className="spinner"></div>
                        ) : batches.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', color: '#6b7280' }}>
                                No batches found.
                            </div>
                        ) : (
                            batches.map(batch => (
                                <div key={batch.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem',
                                    background: '#f3f4f6',
                                    borderRadius: '0.5rem',
                                    marginBottom: '0.5rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={16} color="#4b5563" />
                                        <span style={{ fontWeight: '500' }}>{batch.name}</span>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleDeleteBatch(batch.id)}
                                        title="Delete Batch"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Batch Form */}
                    <form onSubmit={handleAddBatch} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            className="form-input"
                            value={newBatchName}
                            onChange={(e) => setNewBatchName(e.target.value)}
                            placeholder="New Batch Name (e.g., A)"
                            required
                        />
                        <button type="submit" className="btn btn-primary">
                            <Plus size={18} />
                            Add
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
