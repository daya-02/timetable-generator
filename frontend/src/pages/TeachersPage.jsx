/**
 * Teachers Management Page
 * CRUD operations for teachers
 */
import { useEffect, useState } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    X,
    User,
    Mail,
    Clock,
    Star,
    AlertCircle,
    Filter,
} from 'lucide-react';
import { teachersApi, subjectsApi, semestersApi } from '../services/api';
import { roomsApi } from '../services/api';
import { useDepartmentContext } from '../context/DepartmentContext';
import './CrudPage.css';

export default function TeachersPage() {
    const { departments, selectedDeptId, setSelectedDeptId, deptId, reloadDepartments } = useDepartmentContext();
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterName, setFilterName] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [assignmentComponentType, setAssignmentComponentType] = useState('theory');
    const [formData, setFormData] = useState({
        name: '',
        teacher_code: '',
        dept_id: '',
        email: '',
        phone: '',
        max_hours_per_week: 20,
        experience_years: 1,
        experience_score: 0.5,
        available_days: '0,1,2,3,4',
        subject_ids: [],
    });

    useEffect(() => {
        reloadDepartments();
        fetchData();
    }, []);

    useEffect(() => {
        fetchData();
    }, [deptId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const semParams = {};
            if (deptId) semParams.deptId = deptId;

            const teacherActive = true;
            const teacherDept = deptId;

            const [teachersRes, subjectsRes, semestersRes, roomsRes] = await Promise.all([
                teachersApi.getAll(teacherActive, teacherDept),
                subjectsApi.getAll({ deptId }),
                semestersApi.getAll(semParams),
                roomsApi.getAll({ deptId }),
            ]);
            setTeachers(teachersRes.data);
            setSubjects(subjectsRes.data);
            setSemesters(semestersRes.data);
            setRooms(roomsRes.data);
        } catch (err) {
            setError('Failed to load data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (teacher = null) => {
        setAssignmentComponentType('theory');
        if (teacher) {
            setEditingTeacher(teacher);
            setFormData({
                name: teacher.name,
                teacher_code: teacher.teacher_code || '',
                dept_id: teacher.dept_id || '',
                email: teacher.email || '',
                phone: teacher.phone || '',
                max_hours_per_week: teacher.max_hours_per_week,
                experience_years: teacher.experience_years,
                experience_score: teacher.experience_score,
                available_days: teacher.available_days,
                subject_ids: teacher.subjects?.map(s => s.id) || [],
            });
        } else {
            setEditingTeacher(null);
            setFormData({
                name: '',
                teacher_code: '',
                dept_id: deptId ? String(deptId) : '',
                email: '',
                phone: '',
                max_hours_per_week: 20,
                experience_years: 1,
                experience_score: 0.5,
                available_days: '0,1,2,3,4',
                subject_ids: [],
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTeacher(null);
        setAssignmentComponentType('theory');
    };

    const getErrorMessage = (err) => {
        if (typeof err === 'string') return err;
        const data = err?.response?.data;
        if (typeof data === 'string') return data;
        if (data?.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        if (data?.message) return data.message;
        if (Array.isArray(data)) return data.map(e => e.msg || JSON.stringify(e)).join('; ');
        return err?.message || 'An error occurred';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Ensure dept_id and teacher_code are handled correctly
            const payload = {
                ...formData,
                dept_id: formData.dept_id ? parseInt(formData.dept_id) : null,
                // generate teacher code if empty? No, backend handles it or requires it.
                // It is required in schema, but nullable in model.
                // Let's assume user inputs it or handle in backend.
            };

            if (editingTeacher) {
                await teachersApi.update(editingTeacher.id, payload);
            } else {
                await teachersApi.create(payload);
            }
            fetchData();
            closeModal();
        } catch (err) {
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to remove this teacher?')) return;
        try {
            await teachersApi.delete(id);
            fetchData();
        } catch (err) {
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
            console.error(err);
        }
    };



    // Filter Logic
    const filteredTeachers = teachers.filter(t => {
        if (filterName) {
            const search = filterName.toLowerCase();
            const matchesName = t.name.toLowerCase().includes(search);
            const matchesCode = (t.teacher_code || '').toLowerCase().includes(search);
            const matchesEmail = (t.email || '').toLowerCase().includes(search);
            return matchesName || matchesCode || matchesEmail;
        }
        return true;
    });

    // State for assignment form
    const [availableBatches, setAvailableBatches] = useState([]);

    const handleClassSelect = async (e) => {
        const semesterId = e.target.value;
        setAvailableBatches([]);
        if (semesterId) {
            try {
                const res = await semestersApi.getBatches(semesterId);
                setAvailableBatches(res.data);
            } catch (err) {
                console.error("Failed to fetch batches", err);
            }
        }
    };

    const handleAddAssignment = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const data = {
            semester_id: parseInt(formData.get('semester_id')),
            subject_id: parseInt(formData.get('subject_id')),
            component_type: formData.get('component_type'),
        };

        const batchId = formData.get('batch_id');
        if (batchId) data.batch_id = parseInt(batchId);

        const roomId = formData.get('room_id');
        if (roomId) data.room_id = parseInt(roomId);

        const parallelGroup = formData.get('parallel_lab_group');
        if (parallelGroup) data.parallel_lab_group = parallelGroup;

        try {
            await teachersApi.addAssignment(editingTeacher.id, data);

            // Refresh editingTeacher
            const updated = await teachersApi.getById(editingTeacher.id);
            setEditingTeacher(updated.data);

            // Refetch main list to update counts
            fetchData();

            e.target.reset();
            setAssignmentComponentType('theory');
            setAvailableBatches([]);
        } catch (err) {
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        try {
            await teachersApi.removeAssignment(assignmentId);
            fetchData();
            // Refresh editingTeacher
            const updated = await teachersApi.getById(editingTeacher.id);
            setEditingTeacher(updated.data);
        } catch (err) {
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="crud-page">
            <div className="page-header">
                <div>
                    <h1>Teachers</h1>
                    <p>Manage faculty members and their subjects</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Add Teacher
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

                {/* Department Filter - Integrated */}
                <select
                    className="form-select"
                    value={selectedDeptId || ''}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    style={{ width: 'auto', minWidth: '180px', fontSize: '0.85rem' }}
                >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>

                {filterName && (
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setFilterName('')}
                        style={{ fontSize: '0.8rem' }}
                    >
                        Clear Search
                    </button>
                )}

                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                    {filteredTeachers.length} / {teachers.length} teachers
                </span>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="crud-grid">
                {filteredTeachers.map((teacher) => (
                    <div key={teacher.id} className={`crud-item ${!teacher.is_active ? 'inactive' : ''}`}>
                        <div className="crud-item-header">
                            <div>
                                <h3 className="crud-item-title">{teacher.name}</h3>
                                {!teacher.is_active && <span className="badge badge-error">Inactive</span>}
                            </div>
                            <div className="crud-item-actions">
                                <button className="btn btn-sm btn-secondary" onClick={() => openModal(teacher)}>
                                    <Edit2 size={14} />
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(teacher.id)}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="crud-item-details">
                            {teacher.teacher_code && (
                                <span className="crud-item-detail" style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                    ID: {teacher.teacher_code}
                                </span>
                            )}
                            {teacher.email && (
                                <span className="crud-item-detail">
                                    <Mail size={14} /> {teacher.email}
                                </span>
                            )}
                            <span className="crud-item-detail">
                                <Clock size={14} /> Max {teacher.max_hours_per_week} hrs/week
                            </span>
                            <span className="crud-item-detail">
                                <Star size={14} /> {teacher.experience_years} yrs exp
                            </span>
                        </div>

                        {
                            teacher.class_assignments?.length > 0 && (
                                <div className="crud-item-assignments" style={{ marginTop: '10px', fontSize: '0.8rem', borderTop: '1px solid #f3f4f6', paddingTop: '8px' }}>
                                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#4b5563' }}>Teaching Classes:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {[...new Set(teacher.class_assignments.map(a => a.semester?.name))].map((name, i) => (
                                            <span key={i} style={{
                                                background: '#f3f4f6',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                color: '#374151'
                                            }}>{name}</span>
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                    </div>
                ))
                }
            </div >

            {
                teachers.length === 0 && (
                    <div className="empty-state">
                        <User size={48} />
                        <h3>No Teachers Yet</h3>
                        <p>Add your first teacher to get started</p>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <Plus size={18} />
                            Add Teacher
                        </button>
                    </div>
                )
            }

            {/* Modal */}
            {
                showModal && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{editingTeacher ? 'Edit Teacher' : 'Add Teacher'}</h2>
                                <button className="modal-close" onClick={closeModal}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Teacher Code *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.teacher_code}
                                            onChange={(e) => setFormData({ ...formData, teacher_code: e.target.value })}
                                            placeholder="e.g. CSE001"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <select
                                        className="form-input"
                                        value={formData.dept_id || ''}
                                        onChange={(e) => setFormData({ ...formData, dept_id: e.target.value })}
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Max Hours/Week</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.max_hours_per_week}
                                            onChange={(e) => setFormData({ ...formData, max_hours_per_week: parseInt(e.target.value) })}
                                            min={1}
                                            max={40}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Experience (Years)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.experience_years}
                                            onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) })}
                                            min={0}
                                        />
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingTeacher ? 'Update Info' : 'Create Teacher'}
                                    </button>
                                </div>
                            </form>

                            {
                                editingTeacher && (
                                    <div className="teacher-assignments-section" style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                                        <h3>Class Assignments</h3>
                                        <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                                            Assign this teacher to specific subjects in specific classes.
                                        </p>

                                        <div className="assignments-list" style={{ marginBottom: '1.5rem' }}>
                                            {editingTeacher.class_assignments?.map(assignment => (
                                                <div key={assignment.id} className="assignment-item" style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '0.75rem',
                                                    background: '#f9fafb',
                                                    borderRadius: '0.5rem',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    <div>
                                                        <strong style={{ display: 'block' }}>{assignment.semester?.name}</strong>
                                                        <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                                            {assignment.subject?.code} - {assignment.subject?.name} ({assignment.component_type}{assignment.room?.name ? `, ${assignment.room.name}` : ''})
                                                            {assignment.batch && (
                                                                <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', color: '#5b21b6', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                                    Batch {assignment.batch.name}
                                                                </span>
                                                            )}
                                                            {assignment.parallel_lab_group && (
                                                                <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: '#ffedd5', color: '#9a3412', padding: '1px 4px', borderRadius: '4px' }}>
                                                                    ∥ {assignment.parallel_lab_group}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleRemoveAssignment(assignment.id)}
                                                        title="Remove Assignment"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!editingTeacher.class_assignments || editingTeacher.class_assignments.length === 0) && (
                                                <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No classes assigned yet.</p>
                                            )}
                                        </div>

                                        <form onSubmit={handleAddAssignment} className="add-assignment-form" style={{
                                            display: 'grid',
                                            gridTemplateColumns: assignmentComponentType === 'lab'
                                                ? '1fr 1fr 1fr 1fr 1fr 1fr auto'
                                                : '1fr 1fr 1fr 1fr auto',
                                            gap: '0.5rem',
                                            alignItems: 'end'
                                        }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Class</label>
                                                <select
                                                    name="semester_id"
                                                    className="form-input"
                                                    required
                                                    onChange={handleClassSelect}
                                                >
                                                    <option value="">Select Class</option>
                                                    {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>

                                            {/* Batch Dropdown */}
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Batch (Opt)</label>
                                                <select name="batch_id" className="form-input" disabled={availableBatches.length === 0}>
                                                    <option value="">All / None</option>
                                                    {availableBatches.map(b => (
                                                        <option key={b.id} value={b.id}>{b.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Subject</label>
                                                <select name="subject_id" className="form-input" required>
                                                    <option value="">Select Subject</option>
                                                    {subjects.map(s => (
                                                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Type</label>
                                                <select
                                                    name="component_type"
                                                    className="form-input"
                                                    value={assignmentComponentType}
                                                    onChange={(event) => setAssignmentComponentType(event.target.value)}
                                                >
                                                    <option value="theory">Theory</option>
                                                    <option value="lab">Lab</option>
                                                    <option value="tutorial">Tutorial</option>
                                                </select>
                                            </div>
                                            {assignmentComponentType === 'lab' && (
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Lab Room</label>
                                                    <select name="room_id" className="form-input" required>
                                                        <option value="">Select Lab</option>
                                                        {rooms
                                                            .filter((room) => room.room_type === 'lab')
                                                            .map((room) => (
                                                                <option key={room.id} value={room.id}>
                                                                    {room.name}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            )}
                                            {assignmentComponentType === 'lab' && (
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Parallel Group (Opt)</label>
                                                    <input
                                                        type="text"
                                                        name="parallel_lab_group"
                                                        className="form-input"
                                                        placeholder="e.g. G1"
                                                        title="Assign same group name to different lab subjects to schedule them in parallel"
                                                    />
                                                </div>
                                            )}
                                            <button type="submit" className="btn btn-primary" title="Add Assignment">
                                                <Plus size={18} />
                                            </button>
                                        </form>
                                    </div>
                                )
                            }
                        </div >
                    </div >
                )
            }
        </div >
    );
}
