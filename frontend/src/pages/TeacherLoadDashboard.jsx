/**
 * Teacher Load Dashboard
 * Read-only analytics derived from timetable allocations
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, AlertTriangle, Filter } from 'lucide-react';
import { teacherLoadApi } from '../services/api';
import { useDepartmentContext } from '../context/DepartmentContext';
import './TeacherLoadDashboard.css';

export default function TeacherLoadDashboard() {
    const { departments, selectedDeptId, setSelectedDeptId, deptId } = useDepartmentContext();
    const [selectedYear, setSelectedYear] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const year = useMemo(
        () => (selectedYear ? Number(selectedYear) : null),
        [selectedYear]
    );

    const loadDashboard = async (deptValue = null, yearValue = null) => {
        setLoading(true);
        setError(null);
        try {
            const res = await teacherLoadApi.getDashboard({
                deptId: deptValue,
                year: yearValue,
            });
            setDashboard(res.data);
        } catch (err) {
            console.error('Failed to load teacher dashboard', err);
            setError('Unable to load teacher dashboard. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard(deptId, year);
    }, [deptId, year]);

    const filteredRows = useMemo(() => {
        if (!dashboard?.rows) return [];
        return dashboard.rows.filter(row => {
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                return row.teacher_name.toLowerCase().includes(lower) || (row.teacher_code || '').toLowerCase().includes(lower);
            }
            return true;
        });
    }, [dashboard, searchTerm]);

    const statusCounts = useMemo(() => {
        const counts = { normal: 0, high: 0, overload: 0 };
        if (!filteredRows.length) return counts;
        filteredRows.forEach((row) => {
            if (counts[row.status] !== undefined) counts[row.status] += 1;
        });
        return counts;
    }, [filteredRows]);

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="teacher-load-page">
            <div className="page-header">
                <div>
                    <h1>Teacher Load Dashboard</h1>
                    <p>Live workload visibility based on generated timetables.</p>
                </div>
                <button className="btn btn-secondary" onClick={() => loadDashboard(deptId, year)}>
                    <RefreshCw size={16} />
                    Refresh
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
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Teacher..."
                    style={{ width: 'auto', minWidth: '200px', fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                />

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

                <select
                    className="form-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    style={{ width: 'auto', minWidth: '120px', fontSize: '0.85rem' }}
                >
                    <option value="">All Years</option>
                    {[1, 2, 3, 4].map((value) => (
                        <option key={value} value={value}>
                            Year {value}
                        </option>
                    ))}
                </select>

                {searchTerm && (
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setSearchTerm('')}
                        style={{ fontSize: '0.8rem' }}
                    >
                        Clear
                    </button>
                )}
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">T</div>
                    <div className="stat-content">
                        <h3>{filteredRows.length || 0}</h3>
                        <p>Total Teachers</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">N</div>
                    <div className="stat-content">
                        <h3>{statusCounts.normal}</h3>
                        <p>Normal Load</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">H</div>
                    <div className="stat-content">
                        <h3>{statusCounts.high}</h3>
                        <p>High Load</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon danger">O</div>
                    <div className="stat-content">
                        <h3>{statusCounts.overload}</h3>
                        <p>Overload</p>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Teacher</th>
                            <th>Code</th>
                            <th>Total</th>
                            <th>Theory</th>
                            <th>Lab</th>
                            <th>Tutorial</th>
                            <th>Project</th>
                            <th>Report</th>
                            <th>Self Study</th>
                            <th>Internship</th>
                            <th>Elective</th>
                            <th>Max Consecutive</th>
                            <th>Days w/ Overload</th>
                            <th>Max Allowed</th>
                            <th>Load Ratio</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.length > 0 ? (
                            filteredRows.map((row) => (
                                <tr key={row.teacher_id}>
                                    <td>
                                        <div className="teacher-name">
                                            <span>{row.teacher_name}</span>
                                            {row.consecutive_overload && (
                                                <span className="consecutive-warning">
                                                    <AlertTriangle size={14} />
                                                    Consecutive overload
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{row.teacher_code || '-'}</td>
                                    <td>{row.total_hours}</td>
                                    <td>{row.theory_hours}</td>
                                    <td>{row.lab_hours}</td>
                                    <td>{row.tutorial_hours}</td>
                                    <td>{row.project_hours}</td>
                                    <td>{row.report_hours}</td>
                                    <td>{row.self_study_hours}</td>
                                    <td>{row.self_study_hours}</td>
                                    <td>{row.elective_hours}</td>
                                    <td>{row.max_consecutive_periods}</td>
                                    <td>{row.days_with_overload}</td>
                                    <td>{row.max_hours_per_week}</td>
                                    <td>{row.load_ratio}</td>
                                    <td>
                                        <span className={`load-status ${row.status}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="16" className="text-center text-muted">
                                    No teacher load data available.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
