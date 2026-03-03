/**
 * Accreditation Reports Page
 * Read-only reports generated from timetable allocations
 */
import { useEffect, useState } from 'react';
import { AlertCircle, Download, RefreshCw, Filter } from 'lucide-react';
import { reportsApi } from '../services/api';
import { useDepartmentContext } from '../context/DepartmentContext';
import './ReportsPage.css';

const EMPTY_REPORTS = {
    teacherWorkload: null,
    roomUtilization: null,
    subjectCoverage: null,
};

export default function ReportsPage() {
    const { departments, selectedDeptId, setSelectedDeptId, deptId } = useDepartmentContext();
    const [reports, setReports] = useState(EMPTY_REPORTS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const loadReports = async (deptValue = null) => {
        setLoading(true);
        setError(null);
        try {
            const [teacherRes, roomRes, subjectRes] = await Promise.all([
                reportsApi.getTeacherWorkload(deptValue),
                reportsApi.getRoomUtilization(deptValue),
                reportsApi.getSubjectCoverage(deptValue),
            ]);
            setReports({
                teacherWorkload: teacherRes.data,
                roomUtilization: roomRes.data,
                subjectCoverage: subjectRes.data,
            });
        } catch (err) {
            console.error('Failed to load reports', err);
            setError('Unable to load reports. Please check the server and try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports(deptId);
    }, [deptId]);

    const currentDeptLabel = deptId
        ? departments.find((dept) => dept.id === deptId)?.name || 'Selected Department'
        : 'All Departments';

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="reports-page">
            <div className="page-header">
                <div>
                    <h1>Accreditation Reports</h1>
                    <p>Read-only reports generated from the latest timetable allocations.</p>
                </div>
                <button className="btn btn-secondary" onClick={() => loadReports(deptId)}>
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

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
                    placeholder="Search in all reports..."
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

                {searchTerm && (
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setSearchTerm('')}
                        style={{ fontSize: '0.8rem' }}
                    >
                        Clear Search
                    </button>
                )}
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="report-section">
                <div className="report-header">
                    <div>
                        <h2>Teacher Workload Report</h2>
                        <p>{currentDeptLabel}</p>
                    </div>
                    <a
                        className="btn btn-secondary"
                        href={reportsApi.getTeacherWorkloadPdfUrl(deptId)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Download size={16} />
                        Download PDF
                    </a>
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
                                <th>Self Study</th>
                                <th>Seminar</th>
                                <th>Elective</th>
                                <th>Max Consecutive</th>
                                <th>Free Periods</th>
                                <th>Departments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.teacherWorkload?.rows?.length ? (
                                reports.teacherWorkload.rows
                                    .filter(row => !searchTerm || row.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) || (row.teacher_code || '').toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((row) => (
                                        <tr key={row.teacher_id}>
                                            <td>{row.teacher_name}</td>
                                            <td>{row.teacher_code || '-'}</td>
                                            <td>{row.total_hours}</td>
                                            <td>{row.theory_hours}</td>
                                            <td>{row.lab_hours}</td>
                                            <td>{row.tutorial_hours}</td>
                                            <td>{row.self_study_hours}</td>
                                            <td>{row.seminar_hours}</td>
                                            <td>{row.elective_hours}</td>
                                            <td>{row.max_consecutive_periods}</td>
                                            <td>{row.free_periods}</td>
                                            <td>
                                                {row.departments?.length
                                                    ? row.departments.map((dept) => dept.code).join(', ')
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))
                            ) : (
                                <tr>
                                    <td colSpan="12" className="text-center text-muted">
                                        No workload data available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="report-section">
                <div className="report-header">
                    <div>
                        <h2>Room Utilization Report</h2>
                        <p>{currentDeptLabel}</p>
                    </div>
                    <a
                        className="btn btn-secondary"
                        href={reportsApi.getRoomUtilizationPdfUrl(deptId)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Download size={16} />
                        Download PDF
                    </a>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Room</th>
                                <th>Type</th>
                                <th>Available</th>
                                <th>Used</th>
                                <th>Utilization</th>
                                <th>Peak Days</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.roomUtilization?.rows?.length ? (
                                reports.roomUtilization.rows
                                    .filter(row => !searchTerm || row.room_name.toLowerCase().includes(searchTerm.toLowerCase()) || row.room_type.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((row) => (
                                        <tr key={row.room_id}>
                                            <td>{row.room_name}</td>
                                            <td>{row.room_type}</td>
                                            <td>{row.total_available_periods}</td>
                                            <td>{row.periods_used}</td>
                                            <td>{row.utilization_percent}%</td>
                                            <td>
                                                {row.peak_usage_days?.length
                                                    ? row.peak_usage_days.join(', ')
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted">
                                        No room utilization data available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="report-section">
                <div className="report-header">
                    <div>
                        <h2>Subject Coverage Report</h2>
                        <p>{currentDeptLabel}</p>
                    </div>
                    <a
                        className="btn btn-secondary"
                        href={reportsApi.getSubjectCoveragePdfUrl(deptId)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Download size={16} />
                        Download PDF
                    </a>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Code</th>
                                <th>Class</th>
                                <th>Required</th>
                                <th>Assigned</th>
                                <th>Status</th>
                                <th>Teachers</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.subjectCoverage?.rows?.length ? (
                                reports.subjectCoverage.rows
                                    .filter(row => !searchTerm || row.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) || row.subject_code.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((row) => (
                                        <tr key={`${row.subject_id}-${row.semester_id}`}>
                                            <td>{row.subject_name}</td>
                                            <td>{row.subject_code}</td>
                                            <td>
                                                {row.semester_code
                                                    ? `${row.semester_code} (Y${row.year}${row.section || ''})`
                                                    : '-'}
                                            </td>
                                            <td>{row.required_hours}</td>
                                            <td>{row.assigned_hours}</td>
                                            <td>
                                                <span
                                                    className={`badge ${row.status === 'Complete'
                                                        ? 'badge-success'
                                                        : 'badge-warning'
                                                        }`}
                                                >
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td>
                                                {row.teacher_codes?.length
                                                    ? row.teacher_codes.join(', ')
                                                    : row.teacher_names?.join(', ') || '-'}
                                            </td>
                                        </tr>
                                    ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center text-muted">
                                        No subject coverage data available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
