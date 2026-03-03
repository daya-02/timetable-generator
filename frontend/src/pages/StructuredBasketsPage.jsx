/**
 * Structured Composite Baskets Management Page
 * Handles multi-department, mixed lab/theory blocks.
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Layers, AlertCircle } from 'lucide-react';
import { structuredCompositeBasketsApi, subjectsApi, departmentsApi } from '../services/api';
import './CrudPage.css';

export default function StructuredBasketsPage() {
    const [baskets, setBaskets] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingBasket, setEditingBasket] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        semester: 1,
        theory_hours: 3,
        lab_hours: 2,
        continuous_lab_periods: 2,
        same_slot_across_departments: true,
        allow_lab_parallel: true,
        department_ids: [],
        subject_ids: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [basketRes, subjRes, deptRes] = await Promise.all([
                structuredCompositeBasketsApi.getAll(),
                subjectsApi.getAll(),
                departmentsApi.getAll()
            ]);
            setBaskets(basketRes.data);
            setSubjects(subjRes.data);
            setDepartments(deptRes.data);
        } catch (err) {
            setError('Failed to load data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (basket = null) => {
        if (basket) {
            setEditingBasket(basket);
            setFormData({
                name: basket.name || '',
                semester: basket.semester,
                theory_hours: basket.theory_hours ?? 3,
                lab_hours: basket.lab_hours ?? 2,
                continuous_lab_periods: basket.continuous_lab_periods ?? 2,
                same_slot_across_departments: basket.same_slot_across_departments,
                allow_lab_parallel: basket.allow_lab_parallel,
                department_ids: basket.departments_involved ? basket.departments_involved.map(d => d.id) : [],
                subject_ids: basket.linked_subjects ? basket.linked_subjects.map(s => s.id) : []
            });
        } else {
            setEditingBasket(null);
            setFormData({
                name: '',
                semester: 1,
                theory_hours: 3,
                lab_hours: 2,
                continuous_lab_periods: 2,
                same_slot_across_departments: true,
                allow_lab_parallel: true,
                department_ids: [],
                subject_ids: []
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingBasket(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingBasket) {
                await structuredCompositeBasketsApi.update(editingBasket.id, formData);
            } else {
                await structuredCompositeBasketsApi.create(formData);
            }
            closeModal();
            await fetchData();
        } catch (err) {
            console.error('SCB save error:', err);
            const errorDetail = err.response?.data?.detail || err.message || 'Failed to save basket';
            setError(typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : errorDetail);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this Structured Composite Basket?')) return;
        try {
            await structuredCompositeBasketsApi.delete(id);
            fetchData();
        } catch (err) {
            setError('Failed to delete basket');
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="crud-page">
            <div className="page-header">
                <div>
                    <h1>Structured Baskets</h1>
                    <p>Manage composite baskets for mixed theory/lab continuity across departments</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Create Basket
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} />
                    {error}
                    <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none' }}><X size={14} /></button>
                </div>
            )}

            <div className="crud-grid">
                {baskets.map(basket => (
                    <div key={basket.id} className="crud-item" style={{ borderLeft: '4px solid #8b5cf6' }}>
                        <div className="crud-item-header">
                            <div>
                                <h3 className="crud-item-title">{basket.name}</h3>
                                <div className="flex gap-2 items-center text-xs text-muted">
                                    <span>Sem {basket.semester}</span>
                                    <span>•</span>
                                    <span>{basket.theory_hours + basket.lab_hours} Hours</span>
                                </div>
                            </div>
                            <div className="crud-item-actions">
                                <button className="btn btn-sm btn-secondary" onClick={() => openModal(basket)}><Edit2 size={14} /></button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(basket.id)}><Trash2 size={14} /></button>
                            </div>
                        </div>

                        <div style={{ marginTop: '12px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                {basket.same_slot_across_departments && (
                                    <span className="badge" style={{ background: '#eff6ff', color: '#2563eb' }}>Same Slot Cross-Dept</span>
                                )}
                                {basket.allow_lab_parallel && (
                                    <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>Parallel Labs Allowed</span>
                                )}
                            </div>

                            <div className="text-muted mb-2">
                                <strong>Departments:</strong> {basket.departments_involved && basket.departments_involved.map(d => d.code).join(', ') || 'None'}
                            </div>

                            <div className="text-muted mb-2">
                                <strong>Hours:</strong> {basket.theory_hours}h Theory, {basket.lab_hours}h Lab ({basket.continuous_lab_periods}h continuous block requested)
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {baskets.length === 0 && (
                <div className="empty-state">
                    <Layers size={48} />
                    <h3>No Structured Baskets</h3>
                    <p>Create an SCB to enforce multiday, multimode continuities.</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h2>{editingBasket ? 'Edit SCB' : 'New Structured Composite Basket'}</h2>
                            <button className="modal-close" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Basket Name *</label>
                                    <input className="form-input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. PP Basket" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Semester *</label>
                                    <select className="form-select" value={formData.semester} onChange={e => setFormData({ ...formData, semester: parseInt(e.target.value) })}>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Theory Hours</label>
                                    <input type="number" className="form-input" required min="0" value={formData.theory_hours} onChange={e => setFormData({ ...formData, theory_hours: parseInt(e.target.value) })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Lab Hours</label>
                                    <input type="number" className="form-input" required min="0" value={formData.lab_hours} onChange={e => setFormData({ ...formData, lab_hours: parseInt(e.target.value) })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Continuous Lab Periods</label>
                                    <input type="number" className="form-input" required min="1" max="4" value={formData.continuous_lab_periods} onChange={e => setFormData({ ...formData, continuous_lab_periods: parseInt(e.target.value) })} />
                                </div>
                            </div>

                            <div className="form-row">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.same_slot_across_departments}
                                        onChange={e => setFormData({ ...formData, same_slot_across_departments: e.target.checked })}
                                    />
                                    Same Slot Across Departments
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.allow_lab_parallel}
                                        onChange={e => setFormData({ ...formData, allow_lab_parallel: e.target.checked })}
                                    />
                                    Allow Lab Parallel Distribution
                                </label>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Departments Involved</label>
                                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '8px', borderRadius: '6px' }}>
                                        {departments.map(d => (
                                            <label key={d.id} style={{ display: 'block', marginBottom: '4px', fontSize: '13px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.department_ids.includes(d.id)}
                                                    onChange={e => {
                                                        const ids = new Set(formData.department_ids);
                                                        if (e.target.checked) ids.add(d.id); else ids.delete(d.id);
                                                        setFormData({ ...formData, department_ids: Array.from(ids) });
                                                    }}
                                                    style={{ marginRight: '8px' }}
                                                />
                                                {d.name} ({d.code})
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Subjects LinkedIn (from Depts)</label>
                                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '8px', borderRadius: '6px' }}>
                                        {subjects.filter(s => formData.department_ids.includes(s.dept_id) || !s.dept_id).map(s => (
                                            <label key={s.id} style={{ display: 'block', marginBottom: '4px', fontSize: '13px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.subject_ids.includes(s.id)}
                                                    onChange={e => {
                                                        const ids = new Set(formData.subject_ids);
                                                        if (e.target.checked) ids.add(s.id); else ids.delete(s.id);
                                                        setFormData({ ...formData, subject_ids: Array.from(ids) });
                                                    }}
                                                    style={{ marginRight: '8px' }}
                                                />
                                                {s.name} ({s.code})
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Basket</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
