/**
 * Departments Management Page
 *
 * Allows admin to add/edit departments and (optionally) configure per-department rule toggles.
 * Note: No delete UI by default to avoid accidental data loss/orphaning.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, Edit2, X, Save } from 'lucide-react';
import { departmentsApi, ruleTogglesApi } from '../services/api';
import { useDepartmentContext } from '../context/DepartmentContext';
import './CrudPage.css';

const DEFAULT_TOGGLES = {
    lab_continuity_strict: false,
    teacher_gap_preference: false,
    max_consecutive_enabled: false,
    max_consecutive_limit: 3,
    lab_continuity_is_hard: false,
    teacher_gap_is_hard: false,
    max_consecutive_is_hard: false,
};

function normalizeToggle(value) {
    return {
        ...DEFAULT_TOGGLES,
        ...(value || {}),
    };
}

export default function DepartmentsPage() {
    const { departments, reloadDepartments, selectedDeptId, setSelectedDeptId } = useDepartmentContext();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Add/Edit modal state
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '' });

    // Rule toggles state (per dept)
    const [togglesByDeptId, setTogglesByDeptId] = useState({});
    const [savingTogglesFor, setSavingTogglesFor] = useState(null);
    const [savedAtByDeptId, setSavedAtByDeptId] = useState({});

    const deptIdSet = useMemo(() => new Set((departments || []).map((d) => d.id)), [departments]);

    const loadToggles = async () => {
        try {
            const res = await ruleTogglesApi.getAll();
            const map = {};
            (res.data || []).forEach((row) => {
                if (!row?.dept_id) return;
                map[row.dept_id] = normalizeToggle(row);
            });

            // Ensure every department has defaults even if no row exists yet.
            const withDefaults = {};
            (departments || []).forEach((dept) => {
                withDefaults[dept.id] = normalizeToggle(map[dept.id]);
            });
            setTogglesByDeptId(withDefaults);
        } catch (err) {
            console.error('Failed to load rule toggles', err);
        }
    };

    useEffect(() => {
        // Page-level loading: departments come from context; we still set a spinner briefly for toggle loading.
        setLoading(true);
        Promise.resolve()
            .then(() => loadToggles())
            .catch(() => {})
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [departments?.length]);

    const openModal = (dept = null) => {
        setEditing(dept);
        setFormData({
            name: dept?.name || '',
            code: dept?.code || '',
        });
        setError(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
        setFormData({ name: '', code: '' });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            if (editing) {
                await departmentsApi.update(editing.id, formData);
            } else {
                await departmentsApi.create(formData);
            }
            await reloadDepartments();
            closeModal();
        } catch (err) {
            console.error('Failed to save department', err);
            const detail = err.response?.data?.detail || err.message || 'Failed to save department';
            setError(typeof detail === 'object' ? JSON.stringify(detail) : detail);
        }
    };

    const updateToggleLocal = (deptId, patch) => {
        setTogglesByDeptId((prev) => ({
            ...prev,
            [deptId]: normalizeToggle({
                ...(prev?.[deptId] || DEFAULT_TOGGLES),
                ...patch,
            }),
        }));
    };

    const saveToggles = async (deptId) => {
        setSavingTogglesFor(deptId);
        setError(null);
        try {
            const toggle = normalizeToggle(togglesByDeptId[deptId]);
            const payload = {
                lab_continuity_strict: !!toggle.lab_continuity_strict,
                teacher_gap_preference: !!toggle.teacher_gap_preference,
                max_consecutive_enabled: !!toggle.max_consecutive_enabled,
                max_consecutive_limit: Number(toggle.max_consecutive_limit || 3),
                lab_continuity_is_hard: !!toggle.lab_continuity_is_hard,
                teacher_gap_is_hard: !!toggle.teacher_gap_is_hard,
                max_consecutive_is_hard: !!toggle.max_consecutive_is_hard,
            };
            const res = await ruleTogglesApi.update(deptId, payload);
            setTogglesByDeptId((prev) => ({
                ...prev,
                [deptId]: normalizeToggle(res.data),
            }));
            setSavedAtByDeptId((prev) => ({ ...prev, [deptId]: Date.now() }));
        } catch (err) {
            console.error('Failed to save rule toggles', err);
            const detail = err.response?.data?.detail || err.message || 'Failed to save rule toggles';
            setError(typeof detail === 'object' ? JSON.stringify(detail) : detail);
        } finally {
            setSavingTogglesFor(null);
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="crud-page">
            <div className="page-header">
                <div>
                    <h1>Departments</h1>
                    <p>Add/edit departments and configure optional department rules.</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Add Department
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} />
                    {error}
                    <button
                        onClick={() => setError(null)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="crud-grid">
                {departments.map((dept) => {
                    const toggle = normalizeToggle(togglesByDeptId[dept.id]);
                    const savedAt = savedAtByDeptId[dept.id];
                    const isSelected = selectedDeptId && Number(selectedDeptId) === dept.id;

                    return (
                        <div key={dept.id} className="crud-item">
                            <div className="crud-item-header">
                                <div>
                                    <h3 className="crud-item-title" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span>{dept.name}</span>
                                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                            {dept.code}
                                        </span>
                                        {isSelected && (
                                            <span className="text-xs bg-green-100 px-2 py-0.5 rounded text-green-700">
                                                Selected
                                            </span>
                                        )}
                                    </h3>
                                </div>
                                <div className="crud-item-actions">
                                    <button className="btn btn-sm btn-secondary" onClick={() => openModal(dept)}>
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setSelectedDeptId(String(dept.id))}
                                    disabled={isSelected}
                                    title="Set as current department context"
                                >
                                    Use This Department
                                </button>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => {
                                        // Force reload for both departments and toggles (safe, read-only).
                                        reloadDepartments().then(() => loadToggles());
                                    }}
                                    title="Refresh departments and rule settings"
                                >
                                    Refresh
                                </button>
                            </div>

                            <details style={{ marginTop: '12px' }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                                    Optional Rule Toggles (Stored Only)
                                </summary>
                                <p className="text-xs text-muted" style={{ marginTop: '6px' }}>
                                    These settings are saved per department. (Generation behavior is unchanged unless you explicitly wire rules into generation.)
                                </p>

                                <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                                    <div className="form-row" style={{ gridTemplateColumns: '1fr auto auto' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>Lab Continuity Strictness</div>
                                            <div className="text-xs text-muted">Labs must be continuous when enabled.</div>
                                        </div>
                                        <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input
                                                type="checkbox"
                                                checked={!!toggle.lab_continuity_strict}
                                                onChange={(e) => updateToggleLocal(dept.id, { lab_continuity_strict: e.target.checked })}
                                            />
                                            Enabled
                                        </label>
                                        <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input
                                                type="checkbox"
                                                checked={!!toggle.lab_continuity_is_hard}
                                                onChange={(e) => updateToggleLocal(dept.id, { lab_continuity_is_hard: e.target.checked })}
                                                disabled={!toggle.lab_continuity_strict}
                                            />
                                            Hard
                                        </label>
                                    </div>

                                    <div className="form-row" style={{ gridTemplateColumns: '1fr auto auto' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>Teacher Gap Preference</div>
                                            <div className="text-xs text-muted">Prefer gaps between classes instead of consecutive periods.</div>
                                        </div>
                                        <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input
                                                type="checkbox"
                                                checked={!!toggle.teacher_gap_preference}
                                                onChange={(e) => updateToggleLocal(dept.id, { teacher_gap_preference: e.target.checked })}
                                            />
                                            Enabled
                                        </label>
                                        <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input
                                                type="checkbox"
                                                checked={!!toggle.teacher_gap_is_hard}
                                                onChange={(e) => updateToggleLocal(dept.id, { teacher_gap_is_hard: e.target.checked })}
                                                disabled={!toggle.teacher_gap_preference}
                                            />
                                            Hard
                                        </label>
                                    </div>

                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        <div className="form-row" style={{ gridTemplateColumns: '1fr auto auto' }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>Max Consecutive Periods</div>
                                                <div className="text-xs text-muted">Enforce a department-defined maximum consecutive limit.</div>
                                            </div>
                                            <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!toggle.max_consecutive_enabled}
                                                    onChange={(e) => updateToggleLocal(dept.id, { max_consecutive_enabled: e.target.checked })}
                                                />
                                                Enabled
                                            </label>
                                            <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!toggle.max_consecutive_is_hard}
                                                    onChange={(e) => updateToggleLocal(dept.id, { max_consecutive_is_hard: e.target.checked })}
                                                    disabled={!toggle.max_consecutive_enabled}
                                                />
                                                Hard
                                            </label>
                                        </div>

                                        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Maximum Consecutive Limit</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    min={1}
                                                    max={7}
                                                    value={toggle.max_consecutive_limit}
                                                    onChange={(e) =>
                                                        updateToggleLocal(dept.id, {
                                                            max_consecutive_limit: Number(e.target.value),
                                                        })
                                                    }
                                                    disabled={!toggle.max_consecutive_enabled}
                                                />
                                                <p className="text-xs text-muted mt-1">
                                                    Applies only when the toggle is enabled.
                                                </p>
                                            </div>
                                            <div />
                                        </div>

                                        <div className="flex gap-2 items-center" style={{ justifyContent: 'flex-end' }}>
                                            {savedAt && (
                                                <span className="text-xs text-muted">
                                                    Saved {new Date(savedAt).toLocaleTimeString()}
                                                </span>
                                            )}
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => saveToggles(dept.id)}
                                                disabled={savingTogglesFor === dept.id || !deptIdSet.has(dept.id)}
                                            >
                                                <Save size={14} />
                                                {savingTogglesFor === dept.id ? 'Saving...' : 'Save Rules'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </details>
                        </div>
                    );
                })}

                {departments.length === 0 && (
                    <div className="empty-state">
                        <h3>No Departments Yet</h3>
                        <p>Add your first department to get started.</p>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <Plus size={18} />
                            Add Department
                        </button>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <h2>{editing ? 'Edit Department' : 'Add Department'}</h2>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Department Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g., Computer Science and Engineering"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Department Code *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                    placeholder="e.g., CSE"
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editing ? 'Update Department' : 'Create Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

