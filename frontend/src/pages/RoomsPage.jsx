/**
 * Rooms Management Page
 * CRUD operations for rooms + Section-wise Default Classroom
 * Supports multi-department room sharing (e.g., shared labs)
 */
import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Building2, Users, AlertCircle, Home, Filter, ChevronDown } from 'lucide-react';
import { roomsApi } from '../services/api';
import { useDepartmentContext } from '../context/DepartmentContext';
import './CrudPage.css';

export default function RoomsPage() {
    const { departments, deptId } = useDepartmentContext();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        capacity: 60,
        room_type: 'lecture',
        is_available: true,
        dept_ids: [],
        assigned_year: null,
        assigned_section: '',
        is_default_classroom: false,
    });

    // Multi-dept dropdown state
    const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
    const deptDropdownRef = useRef(null);

    // Filter state
    const [filterYear, setFilterYear] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [filterDefault, setFilterDefault] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterName, setFilterName] = useState('');

    useEffect(() => {
        fetchData();
    }, [deptId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target)) {
                setDeptDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (deptId) params.deptId = deptId;
            const res = await roomsApi.getAll(params);
            setRooms(res.data);
        } catch (err) {
            setError('Failed to load rooms');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (room = null) => {
        setError(null);
        if (room) {
            setEditingRoom(room);
            setFormData({
                name: room.name,
                capacity: room.capacity,
                room_type: room.room_type,
                is_available: room.is_available,
                dept_ids: room.dept_ids?.length ? room.dept_ids : (room.dept_id ? [room.dept_id] : []),
                assigned_year: room.assigned_year ?? null,
                assigned_section: room.assigned_section ?? '',
                is_default_classroom: room.is_default_classroom ?? false,
            });
        } else {
            setEditingRoom(null);
            setFormData({
                name: '',
                capacity: 60,
                room_type: 'lecture',
                is_available: true,
                dept_ids: deptId ? [deptId] : [],
                assigned_year: null,
                assigned_section: '',
                is_default_classroom: false,
            });
        }
        setDeptDropdownOpen(false);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingRoom(null);
        setError(null);
        setDeptDropdownOpen(false);
    };

    const toggleDeptId = (id) => {
        setFormData(prev => {
            const current = prev.dept_ids || [];
            if (current.includes(id)) {
                return { ...prev, dept_ids: current.filter(d => d !== id) };
            } else {
                return { ...prev, dept_ids: [...current, id] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const submitData = {
                ...formData,
                dept_id: formData.dept_ids.length > 0 ? formData.dept_ids[0] : null,
                assigned_section: formData.assigned_section || null,
                assigned_year: formData.assigned_year || null,
            };

            // If not default classroom, clear section assignment fields
            if (!submitData.is_default_classroom) {
                submitData.assigned_year = null;
                submitData.assigned_section = null;
            }

            if (editingRoom) {
                await roomsApi.update(editingRoom.id, submitData);
            } else {
                await roomsApi.create(submitData);
            }
            fetchData();
            closeModal();
        } catch (err) {
            const detail = err.response?.data?.detail || 'Failed to save room';
            setError(detail);
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this room?')) return;
        try {
            await roomsApi.delete(id);
            fetchData();
        } catch (err) {
            setError('Failed to delete room');
            console.error(err);
        }
    };

    // Helper: get dept names for a room
    const getDeptNames = (room) => {
        const ids = room.dept_ids?.length ? room.dept_ids : (room.dept_id ? [room.dept_id] : []);
        if (ids.length === 0) return null;
        return ids.map(id => {
            const d = departments.find(dep => dep.id === id);
            return d ? d.code : `#${id}`;
        });
    };

    // Apply client-side filters
    const filteredRooms = rooms.filter(room => {
        if (filterName && !room.name.toLowerCase().includes(filterName.toLowerCase())) return false;
        if (filterType && room.room_type !== filterType) return false;
        if (filterYear && room.assigned_year !== parseInt(filterYear)) return false;
        if (filterSection && (room.assigned_section || '').toLowerCase() !== filterSection.toLowerCase()) return false;
        if (filterDefault === 'true' && !room.is_default_classroom) return false;
        if (filterDefault === 'false' && room.is_default_classroom) return false;
        return true;
    });

    // Unique sections from current rooms for filter dropdown
    const uniqueSections = [...new Set(rooms.map(r => r.assigned_section).filter(Boolean))].sort();
    const hasActiveFilters = filterYear || filterSection || filterDefault || filterType || filterName;

    // Selected department names for the dropdown display
    const selectedDeptLabels = (formData.dept_ids || []).map(id => {
        const d = departments.find(dep => dep.id === id);
        return d ? d.code : `#${id}`;
    });

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="crud-page">
            <div className="page-header">
                <div>
                    <h1>Rooms</h1>
                    <p>Manage classrooms, labs, and section assignments</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Add Room
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
                    placeholder="Search by name..."
                    style={{ width: 'auto', minWidth: '150px', fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                />
                <select
                    className="form-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ width: 'auto', minWidth: '130px', fontSize: '0.85rem' }}
                >
                    <option value="">All Types</option>
                    <option value="lecture">Lecture</option>
                    <option value="lab">Lab</option>
                    <option value="self_study">Self Study</option>
                </select>
                <select
                    className="form-select"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    style={{ width: 'auto', minWidth: '120px', fontSize: '0.85rem' }}
                >
                    <option value="">All Years</option>
                    {[1, 2, 3, 4].map(y => (
                        <option key={y} value={y}>Year {y}</option>
                    ))}
                </select>
                <select
                    className="form-select"
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    style={{ width: 'auto', minWidth: '120px', fontSize: '0.85rem' }}
                >
                    <option value="">All Sections</option>
                    {uniqueSections.map(s => (
                        <option key={s} value={s}>Section {s}</option>
                    ))}
                </select>
                <select
                    className="form-select"
                    value={filterDefault}
                    onChange={(e) => setFilterDefault(e.target.value)}
                    style={{ width: 'auto', minWidth: '150px', fontSize: '0.85rem' }}
                >
                    <option value="">All Rooms</option>
                    <option value="true">Default Classrooms</option>
                    <option value="false">Shared Rooms</option>
                </select>
                {hasActiveFilters && (
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => { setFilterYear(''); setFilterSection(''); setFilterDefault(''); setFilterType(''); setFilterName(''); }}
                        style={{ fontSize: '0.8rem' }}
                    >
                        Clear Filters
                    </button>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                    {filteredRooms.length} / {rooms.length} rooms
                </span>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="crud-grid">
                {filteredRooms.map((room) => {
                    const deptNames = getDeptNames(room);
                    return (
                        <div key={room.id} className={`crud-item ${!room.is_available ? 'inactive' : ''}`}>
                            <div className="crud-item-header">
                                <div>
                                    <h3 className="crud-item-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {room.name}
                                        {room.is_default_classroom && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                padding: '0.15rem 0.5rem', borderRadius: '99px',
                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                color: 'white', fontSize: '0.65rem', fontWeight: 600,
                                                textTransform: 'uppercase', letterSpacing: '0.3px',
                                                boxShadow: '0 1px 3px rgba(16,185,129,0.3)'
                                            }}>
                                                <Home size={10} />
                                                Default
                                            </span>
                                        )}
                                    </h3>
                                    {!room.is_available && <span className="badge badge-error">Unavailable</span>}
                                </div>
                                <div className="crud-item-actions">
                                    <button className="btn btn-sm btn-secondary" onClick={() => openModal(room)}>
                                        <Edit2 size={14} />
                                    </button>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(room.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="crud-item-details">
                                <span className={`badge badge-${room.room_type}`}>
                                    {room.room_type}
                                </span>
                                <span className="crud-item-detail">
                                    <Users size={14} /> Capacity: {room.capacity}
                                </span>
                            </div>
                            {/* Department Tags */}
                            {deptNames && deptNames.length > 0 && (
                                <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                    {deptNames.map((name, i) => (
                                        <span key={i} style={{
                                            padding: '0.1rem 0.4rem', borderRadius: '4px',
                                            background: 'var(--primary-50)', border: '1px solid var(--primary-200)',
                                            fontSize: '0.7rem', color: 'var(--primary-700)', fontWeight: 500
                                        }}>
                                            {name}
                                        </span>
                                    ))}
                                    {deptNames.length > 1 && (
                                        <span style={{
                                            padding: '0.1rem 0.4rem', borderRadius: '4px',
                                            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                                            fontSize: '0.65rem', color: '#b45309', fontWeight: 600
                                        }}>
                                            Shared
                                        </span>
                                    )}
                                </div>
                            )}
                            {/* Section Assignment Info */}
                            {room.is_default_classroom && room.assigned_year && room.assigned_section && (
                                <div style={{
                                    marginTop: '0.5rem', padding: '0.375rem 0.625rem',
                                    background: 'var(--primary-50)', border: '1px solid var(--primary-200)',
                                    borderRadius: 'var(--radius-sm)', fontSize: '0.75rem',
                                    color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '0.375rem'
                                }}>
                                    <Home size={12} />
                                    Default for <strong>Year {room.assigned_year}, Section {room.assigned_section}</strong>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredRooms.length === 0 && (
                <div className="empty-state">
                    <Building2 size={48} />
                    <h3>{rooms.length === 0 ? 'No Rooms Yet' : 'No Rooms Match Filters'}</h3>
                    <p>{rooms.length === 0 ? 'Add your first room to get started' : 'Adjust your filters to see rooms'}</p>
                    {rooms.length === 0 && (
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <Plus size={18} />
                            Add Room
                        </button>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>{editingRoom ? 'Edit Room' : 'Add Room'}</h2>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-content-scroll" style={{ maxHeight: '80vh', overflowY: 'auto', padding: '0 20px' }}>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Room Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="e.g., LH-101"
                                    />
                                </div>

                                {/* Multi-Department Selector */}
                                <div className="form-group">
                                    <label className="form-label">Departments</label>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '-4px', marginBottom: '6px' }}>
                                        Select one or more departments that use this room. Labs can be shared across departments.
                                    </p>
                                    <div ref={deptDropdownRef} style={{ position: 'relative' }}>
                                        <div
                                            onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '0.5rem 0.75rem', border: '1px solid var(--gray-300)',
                                                borderRadius: 'var(--radius)', cursor: 'pointer',
                                                background: 'white', minHeight: '40px', flexWrap: 'wrap', gap: '0.25rem',
                                                ...(deptDropdownOpen ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 2px rgba(59,130,246,0.15)' } : {})
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', flex: 1 }}>
                                                {selectedDeptLabels.length === 0 ? (
                                                    <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>Select departments...</span>
                                                ) : (
                                                    selectedDeptLabels.map((label, i) => (
                                                        <span key={i} style={{
                                                            padding: '0.15rem 0.5rem', borderRadius: '4px',
                                                            background: 'var(--primary-50)', border: '1px solid var(--primary-200)',
                                                            fontSize: '0.75rem', color: 'var(--primary-700)', fontWeight: 500,
                                                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                                                        }}>
                                                            {label}
                                                            <span
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleDeptId(formData.dept_ids[i]);
                                                                }}
                                                                style={{ cursor: 'pointer', opacity: 0.6, fontWeight: 700 }}
                                                            >×</span>
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                            <ChevronDown size={16} style={{
                                                color: 'var(--gray-400)', flexShrink: 0,
                                                transform: deptDropdownOpen ? 'rotate(180deg)' : 'none',
                                                transition: 'transform 150ms'
                                            }} />
                                        </div>

                                        {/* Dropdown List */}
                                        {deptDropdownOpen && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                                background: 'white', border: '1px solid var(--gray-200)',
                                                borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                marginTop: '4px', maxHeight: '200px', overflowY: 'auto'
                                            }}>
                                                {departments.length === 0 ? (
                                                    <div style={{ padding: '0.75rem', color: 'var(--gray-400)', fontSize: '0.85rem', textAlign: 'center' }}>
                                                        No departments available
                                                    </div>
                                                ) : (
                                                    departments.map(d => {
                                                        const isSelected = (formData.dept_ids || []).includes(d.id);
                                                        return (
                                                            <div
                                                                key={d.id}
                                                                onClick={() => toggleDeptId(d.id)}
                                                                style={{
                                                                    padding: '0.5rem 0.75rem', cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                                    background: isSelected ? 'var(--primary-50)' : 'transparent',
                                                                    borderBottom: '1px solid var(--gray-100)',
                                                                    transition: 'background 100ms'
                                                                }}
                                                                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--gray-50)'; }}
                                                                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    readOnly
                                                                    style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                                                                />
                                                                <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 400 }}>
                                                                    {d.name} <span style={{ color: 'var(--gray-400)' }}>({d.code})</span>
                                                                </span>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Capacity</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.capacity}
                                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                            min={1}
                                            max={500}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Type</label>
                                        <select
                                            className="form-select"
                                            value={formData.room_type}
                                            onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                                        >
                                            <option value="lecture">Lecture Hall</option>
                                            <option value="lab">Laboratory</option>
                                            <option value="self_study">Self Study Room</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_available}
                                            onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                                        />
                                        Available for scheduling
                                    </label>
                                </div>

                                {/* ---- Default Classroom Assignment ---- */}
                                <div style={{
                                    marginTop: '0.75rem', padding: '1rem',
                                    background: formData.is_default_classroom
                                        ? 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(5,150,105,0.04))'
                                        : 'var(--gray-50)',
                                    border: `1px solid ${formData.is_default_classroom ? 'rgba(16,185,129,0.3)' : 'var(--gray-200)'}`,
                                    borderRadius: 'var(--radius)', transition: 'all 200ms ease'
                                }}>
                                    <label style={{
                                        display: 'flex', alignItems: 'center', gap: '0.625rem',
                                        cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                                        color: formData.is_default_classroom ? '#059669' : 'var(--gray-700)'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_default_classroom}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                is_default_classroom: e.target.checked,
                                                ...(e.target.checked ? {} : { assigned_year: null, assigned_section: '' })
                                            })}
                                            style={{ width: '18px', height: '18px', accentColor: '#059669' }}
                                        />
                                        <Home size={16} />
                                        Assign as default classroom for a section
                                    </label>
                                    <p style={{
                                        fontSize: '0.75rem', color: 'var(--gray-500)',
                                        marginTop: '0.375rem', marginLeft: '2.5rem', marginBottom: 0
                                    }}>
                                        This room will be automatically used for that section's theory classes during timetable generation.
                                    </p>

                                    {formData.is_default_classroom && (
                                        <div className="form-row" style={{ marginTop: '0.75rem' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Year *</label>
                                                <select
                                                    className="form-select"
                                                    value={formData.assigned_year ?? ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        assigned_year: e.target.value ? parseInt(e.target.value) : null
                                                    })}
                                                    required={formData.is_default_classroom}
                                                >
                                                    <option value="">Select Year</option>
                                                    {[1, 2, 3, 4].map(y => (
                                                        <option key={y} value={y}>Year {y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Section *</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.assigned_section}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        assigned_section: e.target.value.toUpperCase()
                                                    })}
                                                    placeholder="e.g., A"
                                                    maxLength={10}
                                                    required={formData.is_default_classroom}
                                                    style={{ textTransform: 'uppercase' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="alert alert-error" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingRoom ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
