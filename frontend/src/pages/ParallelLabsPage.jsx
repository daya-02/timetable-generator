import { useState, useEffect } from 'react';
import { parallelLabBasketsApi, departmentsApi, subjectsApi, teachersApi, roomsApi } from '../services/api';
import { Plus, Trash2, Save, X } from 'lucide-react';
import './ParallelLabsPage.css';

export default function ParallelLabsPage() {
    const [baskets, setBaskets] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState('');

    // For Form
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        dept_id: '',
        year: 1,
        section: 'A',
        slot_day: 0,
        slot_period_start: 0,
        slot_period_count: 2,
        subjects: [{ subject_id: '', batch_name: '', teacher_id: '', room_id: '' }]
    });

    // Form Data Lookup
    const [allSubjects, setAllSubjects] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [allRooms, setAllRooms] = useState([]);

    useEffect(() => {
        fetchDepartments();
        fetchAllFormData();
    }, []);

    useEffect(() => {
        fetchBaskets();
    }, [selectedDeptId]);

    const fetchDepartments = async () => {
        try {
            const res = await departmentsApi.getAll();
            setDepartments(res.data);
            if (res.data.length > 0) {
                setSelectedDeptId(res.data[0].id);
                setFormData(f => ({ ...f, dept_id: res.data[0].id }));
            }
        } catch (err) {
            console.error('Failed to fetch departments:', err);
        }
    };

    const fetchAllFormData = async () => {
        try {
            const [subjRes, teachRes, roomRes] = await Promise.all([
                subjectsApi.getAll(),
                teachersApi.getAll(),
                roomsApi.getAll()
            ]);
            setAllSubjects(subjRes.data);
            setAllTeachers(teachRes.data);
            setAllRooms(roomRes.data);
        } catch (err) {
            console.error('Failed to fetch form data details:', err);
        }
    };

    const fetchBaskets = async () => {
        try {
            const res = await parallelLabBasketsApi.getAll(selectedDeptId);
            setBaskets(res.data);
        } catch (err) {
            console.error('Failed to fetch baskets:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this parallel lab basket?')) return;
        try {
            await parallelLabBasketsApi.delete(id);
            fetchBaskets();
        } catch (err) {
            alert('Failed to delete basket.');
        }
    };

    const addSubjectRow = () => {
        setFormData({
            ...formData,
            subjects: [...formData.subjects, { subject_id: '', batch_name: '', teacher_id: '', room_id: '' }]
        });
    };

    const updateSubjectRow = (index, field, value) => {
        const newSubjects = [...formData.subjects];
        newSubjects[index][field] = value;
        setFormData({ ...formData, subjects: newSubjects });
    };

    const removeSubjectRow = (index) => {
        const newSubjects = [...formData.subjects];
        newSubjects.splice(index, 1);
        setFormData({ ...formData, subjects: newSubjects });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Clean up empty optional fields
            const payload = {
                ...formData,
                subjects: formData.subjects.map(s => ({
                    ...s,
                    room_id: s.room_id ? parseInt(s.room_id) : null
                }))
            };
            await parallelLabBasketsApi.create(payload);
            setShowForm(false);
            fetchBaskets();
            // Reset form
            setFormData({
                dept_id: selectedDeptId,
                year: 1,
                section: 'A',
                slot_day: 0,
                slot_period_start: 0,
                slot_period_count: 2,
                subjects: [{ subject_id: '', batch_name: '', teacher_id: '', room_id: '' }]
            });
        } catch (err) {
            console.error(err);
            alert('Failed to create basket. Ensure all required fields are filled.');
        }
    };

    return (
        <div className="parallel-labs-page">
            <div className="page-header">
                <div>
                    <h1>Parallel Lab Baskets</h1>
                    <p>Manage multi-subject coordinated practical sessions</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <Plus size={16} /> New Basket
                </button>
            </div>

            <div className="filters card">
                <div className="form-group">
                    <label>Department:</label>
                    <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} className="form-input">
                        <option value="">All Departments</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                    </select>
                </div>
            </div>

            {showForm && (
                <div className="card form-card">
                    <form onSubmit={handleSubmit}>
                        <h3>Create Parallel Lab Basket</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Department</label>
                                <select
                                    className="form-input"
                                    value={formData.dept_id}
                                    onChange={e => setFormData({ ...formData, dept_id: parseInt(e.target.value) })}
                                    required
                                >
                                    <option value="">Select Dept</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Year</label>
                                <input type="number" className="form-input" min="1" max="4" value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} required />
                            </div>
                            <div className="form-group">
                                <label>Section</label>
                                <input type="text" className="form-input" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Day</label>
                                <select className="form-input" value={formData.slot_day} onChange={e => setFormData({ ...formData, slot_day: parseInt(e.target.value) })} required>
                                    <option value="0">Monday</option>
                                    <option value="1">Tuesday</option>
                                    <option value="2">Wednesday</option>
                                    <option value="3">Thursday</option>
                                    <option value="4">Friday</option>
                                    <option value="5">Saturday</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Start Period (0-index)</label>
                                <input type="number" className="form-input" value={formData.slot_period_start} onChange={e => setFormData({ ...formData, slot_period_start: parseInt(e.target.value) })} required />
                            </div>
                            <div className="form-group">
                                <label>Period Count</label>
                                <input type="number" className="form-input" value={formData.slot_period_count} onChange={e => setFormData({ ...formData, slot_period_count: parseInt(e.target.value) })} required />
                            </div>
                        </div>

                        <h4>Parallel Subjects</h4>
                        <div className="subjects-list">
                            {formData.subjects.map((subj, idx) => (
                                <div key={idx} className="subject-row">
                                    <select className="form-input" required value={subj.subject_id} onChange={e => updateSubjectRow(idx, 'subject_id', parseInt(e.target.value))}>
                                        <option value="">Select Subject</option>
                                        {allSubjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                                    </select>
                                    <input type="text" className="form-input" placeholder="Batch Name (e.g. B1)" required value={subj.batch_name} onChange={e => updateSubjectRow(idx, 'batch_name', e.target.value)} />
                                    <select className="form-input" required value={subj.teacher_id} onChange={e => updateSubjectRow(idx, 'teacher_id', parseInt(e.target.value))}>
                                        <option value="">Select Teacher</option>
                                        {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <select className="form-input" value={subj.room_id} onChange={e => updateSubjectRow(idx, 'room_id', e.target.value)}>
                                        <option value="">Select Room (Optional)</option>
                                        {allRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                    <button type="button" className="btn btn-icon btn-danger" onClick={() => removeSubjectRow(idx)} disabled={formData.subjects.length === 1}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button type="button" className="btn btn-secondary mt-2" onClick={addSubjectRow}>+ Add Subject</button>

                        <div className="form-actions mt-4">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}><X size={16} /> Cancel</button>
                            <button type="submit" className="btn btn-primary"><Save size={16} /> Save Basket</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="baskets-grid card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Dept/Year/Sec</th>
                            <th>Time Slot</th>
                            <th>Allocated Subjects</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {baskets.length === 0 ? (
                            <tr><td colSpan="4" className="text-center text-muted">No baskets found.</td></tr>
                        ) : baskets.map(b => (
                            <tr key={b.id}>
                                <td>Dept {b.dept_id} / Yr {b.year} / Sec {b.section}</td>
                                <td>Day {b.slot_day} | Start: {b.slot_period_start} | Dur: {b.slot_period_count}</td>
                                <td>
                                    <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                                        {b.basket_subjects.map(s => (
                                            <li key={s.id}><strong>{s.batch_name}</strong> - Subj {s.subject_id} - Tchr {s.teacher_id}</li>
                                        ))}
                                    </ul>
                                </td>
                                <td>
                                    <button className="btn btn-icon btn-danger" onClick={() => handleDelete(b.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
