/**
 * Semesters/Classes Management Page
 * CRUD operations for classes with integrated batch management
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, GraduationCap, Users, AlertCircle, Layers, Filter } from 'lucide-react';
import { semestersApi } from '../services/api';
import { useDepartmentContext } from '../context/DepartmentContext';
import './CrudPage.css';

export default function SemestersPage() {
    const { departments, deptId } = useDepartmentContext();
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingSemester, setEditingSemester] = useState(null);

    // Filter state
    const [filterName, setFilterName] = useState('');
    const [filterYear, setFilterYear] = useState('');

    // Inline batch management state
    const [batches, setBatches] = useState([]);
    const [batchesLoading, setBatchesLoading] = useState(false);
    const [newBatchName, setNewBatchName] = useState('');
    const [batchError, setBatchError] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        year: 2,
        semester_number: 3,
        section: 'A',
        student_count: 60,
        dept_id: null,
    });

    useEffect(() => {
        fetchData();
    }, [deptId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (deptId) params.deptId = deptId;
            const res = await semestersApi.getAll(params);
            setSemesters(res.data);
        } catch (err) {
            setError('Failed to load classes');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // -- Batch management (inline) --
    const fetchBatches = async (semesterId) => {
        setBatchesLoading(true);
        setBatchError(null);
        try {
            const res = await semestersApi.getBatches(semesterId);
            setBatches(res.data);
        } catch (err) {
            console.error(err);
            setBatchError('Failed to load batches');
        } finally {
            setBatchesLoading(false);
        }
    };

    const handleAddBatch = async (e) => {
        e.preventDefault();
        if (!newBatchName.trim() || !editingSemester) return;
        setBatchError(null);
        try {
            await semestersApi.createBatch(editingSemester.id, { name: newBatchName.trim() });
            setNewBatchName('');
            await fetchBatches(editingSemester.id);
        } catch (err) {
            console.error(err);
            setBatchError(err.response?.data?.detail || 'Failed to create batch');
        }
    };

    const handleDeleteBatch = async (batchId) => {
        if (!confirm('Delete this batch? All associated teacher assignments will be lost.')) return;
        setBatchError(null);
        try {
            await semestersApi.deleteBatch(editingSemester.id, batchId);
            await fetchBatches(editingSemester.id);
        } catch (err) {
            console.error(err);
            setBatchError('Failed to delete batch');
        }
    };

    const openModal = (semester = null) => {
        if (semester) {
            setEditingSemester(semester);
            setFormData({
                name: semester.name,
                code: semester.code,
                year: semester.year,
                semester_number: semester.semester_number || (semester.year * 2 - 1),
                section: semester.section,
                student_count: semester.student_count,
                dept_id: semester.dept_id ?? deptId ?? null,
            });
            // Fetch batches for editing
            fetchBatches(semester.id);
        } else {
            setEditingSemester(null);
            setFormData({
                name: '',
                code: '',
                year: 2,
                semester_number: 3,
                section: 'A',
                student_count: 60,
                dept_id: deptId ?? null,
            });
            setBatches([]);
        }
        setBatchError(null);
        setNewBatchName('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSemester(null);
        setBatches([]);
        setNewBatchName('');
        setBatchError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const submitData = {
                ...formData,
                dept_id: editingSemester ? formData.dept_id : (deptId ?? formData.dept_id ?? null),
            };
            if (editingSemester) {
                await semestersApi.update(editingSemester.id, submitData);
            } else {
                await semestersApi.create(submitData);
            }
            fetchData();
            closeModal();
        } catch (err) {
            setError('Failed to save class');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this class?')) return;
        try {
            await semestersApi.delete(id);
            fetchData();
        } catch (err) {
            setError('Failed to delete class');
            console.error(err);
        }
    };

    // -- Filtering --
    const filteredSemesters = semesters.filter(s => {
        if (filterName) {
            const search = filterName.toLowerCase();
            if (!s.name.toLowerCase().includes(search) && !s.code.toLowerCase().includes(search)) return false;
        }
        if (filterYear && s.year !== parseInt(filterYear)) return false;
        return true;
    });

    // Count batches display from existing semesters data
    // We'll show batch count on cards if the semester data includes batches
    const getBatchCount = (semester) => {
        // If the API returns batches in the semester object
        return semester.batches?.length || 0;
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="crud-page">
            <div className="page-header">
                <div>
                    <h1>Classes (Semesters)</h1>
                    <p>Manage student classes, sections, and lab batches for parallel scheduling</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Add Class
                </button>
            </div>

            {/* Filter Bar */}
            <div style={{
                display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap',
                marginBottom: '1rem', padding: '0.75rem 1rem',
                background: 'var(--gray-50)', borderRadius: 'var(--radius)',
                border: '1px solid var(--gray-200)'
            }}>
                <Filter size={16} style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
                <input
                    type="text"
                    className="form-input"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    placeholder="Search by name or code..."
                    style={{ width: 'auto', minWidth: '200px', fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                />
                <select
                    className="form-select"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    style={{ width: 'auto', minWidth: '120px', fontSize: '0.85rem' }}
                >
                    <option value="">All Years</option>
                    {[1, 2, 3, 4, 5, 6].map(y => (
                        <option key={y} value={y}>Year {y}</option>
                    ))}
                </select>
                {(filterName || filterYear) && (
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => { setFilterName(''); setFilterYear(''); }}
                        style={{ fontSize: '0.8rem' }}
                    >
                        Clear
                    </button>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                    {filteredSemesters.length} / {semesters.length} classes
                </span>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="crud-grid">
                {filteredSemesters.map((semester) => {
                    const batchCount = getBatchCount(semester);
                    return (
                        <div key={semester.id} className="crud-item">
                            <div className="crud-item-header">
                                <div>
                                    <h3 className="crud-item-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {semester.name}
                                        {batchCount > 0 && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                                                padding: '0.1rem 0.45rem', borderRadius: '99px',
                                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                color: 'white', fontSize: '0.6rem', fontWeight: 600,
                                                boxShadow: '0 1px 3px rgba(99,102,241,0.3)'
                                            }}>
                                                <Layers size={10} />
                                                {batchCount} Batch{batchCount > 1 ? 'es' : ''}
                                            </span>
                                        )}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                        <span className="badge badge-info">{semester.code}</span>
                                        <span className="badge badge-success">Sem {semester.semester_number || '?'}</span>
                                    </div>
                                </div>
                                <div className="crud-item-actions">
                                    <button className="btn btn-sm btn-secondary" onClick={() => openModal(semester)}>
                                        <Edit2 size={14} />
                                    </button>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(semester.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="crud-item-details">
                                <span className="crud-item-detail">
                                    <GraduationCap size={14} /> Year {semester.year}
                                </span>
                                <span className="crud-item-detail">
                                    Section {semester.section}
                                </span>
                                <span className="crud-item-detail">
                                    <Users size={14} /> {semester.student_count} students
                                </span>
                            </div>
                            {/* Show batch names if available */}
                            {semester.batches?.length > 0 && (
                                <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                    {semester.batches.map(b => (
                                        <span key={b.id} style={{
                                            padding: '0.1rem 0.4rem', borderRadius: '4px',
                                            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                                            fontSize: '0.7rem', color: '#4338ca', fontWeight: 500
                                        }}>
                                            Batch {b.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {semesters.length === 0 && (
                <div className="empty-state">
                    <GraduationCap size={48} />
                    <h3>No Classes Yet</h3>
                    <p>Add your first class to get started</p>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} />
                        Add Class
                    </button>
                </div>
            )}

            {/* Unified Modal: Edit Class + Manage Batches */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                        <div className="modal-header">
                            <h2>{editingSemester ? 'Edit Class' : 'Add Class'}</h2>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Class Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g., 3rd Semester - Section A"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <select
                                        className="form-select"
                                        value={formData.dept_id ?? ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                dept_id: e.target.value ? parseInt(e.target.value) : null,
                                            })
                                        }
                                        disabled={!!deptId && !editingSemester}
                                    >
                                        <option value="">(None)</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name} ({d.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Code *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        required
                                        placeholder="e.g., CS3A"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Year</label>
                                    <select
                                        className="form-select"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                    >
                                        {[1, 2, 3, 4, 5, 6].map((y) => (
                                            <option key={y} value={y}>Year {y}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Semester Number *</label>
                                    <select
                                        className="form-select"
                                        value={formData.semester_number}
                                        onChange={(e) => setFormData({ ...formData, semester_number: parseInt(e.target.value) })}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                            <option key={s} value={s}>Semester {s}</option>
                                        ))}
                                    </select>
                                    <small style={{ color: '#666', fontSize: '12px' }}>This determines which semester subjects can be assigned</small>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Section</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.section}
                                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                        maxLength={5}
                                        placeholder="A"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Student Count</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.student_count}
                                        onChange={(e) => setFormData({ ...formData, student_count: parseInt(e.target.value) })}
                                        min={1}
                                        max={200}
                                    />
                                </div>
                            </div>

                            {/* ======= INLINE BATCH MANAGEMENT (only when editing) ======= */}
                            {editingSemester && (
                                <div style={{
                                    marginTop: '1.5rem',
                                    padding: '1rem',
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04))',
                                    borderRadius: '0.75rem',
                                    border: '1px solid rgba(99,102,241,0.15)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <Layers size={18} style={{ color: '#6366f1' }} />
                                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#312e81' }}>
                                            Lab Batches
                                        </h3>
                                        <span style={{
                                            marginLeft: 'auto',
                                            padding: '0.15rem 0.5rem', borderRadius: '99px',
                                            background: '#6366f1', color: 'white',
                                            fontSize: '0.65rem', fontWeight: 600
                                        }}>
                                            {batches.length} batch{batches.length !== 1 ? 'es' : ''}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                                        Create batches to split this class for <strong>parallel lab scheduling</strong>.
                                        Assign the same <em>Parallel Group ID</em> in the Teachers page to link labs together.
                                    </p>

                                    {batchError && (
                                        <div className="alert alert-error" style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                                            {batchError}
                                        </div>
                                    )}

                                    {/* Existing Batches */}
                                    {batchesLoading ? (
                                        <div style={{ textAlign: 'center', padding: '0.75rem' }}>
                                            <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
                                        </div>
                                    ) : batches.length === 0 ? (
                                        <div style={{
                                            textAlign: 'center', padding: '0.75rem',
                                            background: 'rgba(255,255,255,0.7)', borderRadius: '0.5rem',
                                            color: '#9ca3af', fontSize: '0.8rem',
                                            border: '1px dashed rgba(99,102,241,0.2)'
                                        }}>
                                            No batches yet. Add batches below to enable parallel lab scheduling.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                            {batches.map(batch => (
                                                <div key={batch.id} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '0.5rem 0.75rem',
                                                    background: 'rgba(255,255,255,0.8)',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid rgba(99,102,241,0.12)',
                                                    transition: 'all 0.15s ease'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{
                                                            width: '26px', height: '26px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                            color: 'white',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.7rem', fontWeight: 700
                                                        }}>
                                                            {batch.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Batch {batch.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDeleteBatch(batch.id)}
                                                        title="Delete Batch"
                                                        style={{ padding: '0.2rem 0.4rem' }}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add Batch Inline */}
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={newBatchName}
                                            onChange={(e) => setNewBatchName(e.target.value)}
                                            placeholder="Batch name (e.g., A, B, 1, 2)"
                                            style={{ flex: 1, fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={handleAddBatch}
                                            disabled={!newBatchName.trim()}
                                            style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}
                                        >
                                            <Plus size={14} />
                                            Add Batch
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Tip for new classes */}
                            {!editingSemester && (
                                <div style={{
                                    marginTop: '1rem', padding: '0.75rem 1rem',
                                    background: 'rgba(59,130,246,0.05)', borderRadius: '0.5rem',
                                    border: '1px solid rgba(59,130,246,0.15)',
                                    fontSize: '0.78rem', color: '#1e40af'
                                }}>
                                    <strong>💡 Tip:</strong> After creating this class, edit it to add <strong>lab batches</strong> for parallel scheduling.
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingSemester ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
