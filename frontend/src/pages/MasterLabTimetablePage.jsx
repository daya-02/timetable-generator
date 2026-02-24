import { useState, useEffect, useCallback } from 'react';
import { useDepartmentContext } from '../context/DepartmentContext';
import { reportsApi } from '../services/api';
import { Download, Printer, AlertCircle } from 'lucide-react';
import './MasterLabTimetablePage.css';

export default function MasterLabTimetablePage() {
    const { selectedDeptId, departments } = useDepartmentContext();
    const [semesterType, setSemesterType] = useState('EVEN');
    const [academicYear, setAcademicYear] = useState(new Date().getFullYear());

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState({ rooms: [], grid: {} });

    const fetchTimetable = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await reportsApi.getMasterLabTimetable({
                deptId: selectedDeptId,
                semesterType,
            });
            setData(response.data);
        } catch (err) {
            console.error(err);
            setError('Failed to load master lab timetable.');
        } finally {
            setLoading(false);
        }
    }, [selectedDeptId, semesterType]);

    useEffect(() => {
        fetchTimetable();
    }, [fetchTimetable]);

    const handlePrintPdf = () => {
        window.print();
    };

    const handleDownloadExcel = () => {
        // Generate CSV compatible with Excel
        let csvContent = "data:text/csv;charset=utf-8,";
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

        // Header
        let headers = ["Day", "Period"];
        data.rooms.forEach(r => headers.push(r.name));
        csvContent += headers.map(h => `"${h}"`).join(",") + "\r\n";

        for (let d = 0; d < 5; d++) {
            for (let s = 0; s < 7; s++) {
                let row = `"${days[d]}",${s + 1},`;
                data.rooms.forEach(room => {
                    const allocs = data.grid[d]?.[s]?.[room.id] || [];
                    if (allocs.length === 0) {
                        row += '"Free",';
                    } else {
                        // stacked format
                        const cellText = allocs.map(a => `${a.class_name} ${a.batch ? ' - ' + a.batch : ''} | ${a.subject_code} | ${a.teacher}`).join('\n');
                        row += `"${cellText.replace(/"/g, '""')}",`;
                    }
                });
                csvContent += row + "\r\n";
            }
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Master_Lab_Timetable_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getDeptName = () => {
        if (!selectedDeptId) return "All Departments";
        const dept = departments.find(d => d.id === parseInt(selectedDeptId));
        return dept ? dept.name : "Unknown Department";
    };

    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    return (
        <div className="page-container lab-master-page">
            <div className="page-header no-print">
                <div className="header-title">
                    <h1>Lab Master View</h1>
                    <p>Master scheduling view for all laboratory and practical rooms.</p>
                </div>

                <div className="header-actions">
                    <button className="base-btn secondary-btn" onClick={handleDownloadExcel} disabled={loading || data.rooms.length === 0}>
                        <Download size={18} />
                        Export Excel
                    </button>
                    <button className="base-btn primary-btn" onClick={handlePrintPdf} disabled={loading || data.rooms.length === 0}>
                        <Printer size={18} />
                        Print PDF
                    </button>
                </div>
            </div>

            <div className="filters-card no-print">
                <div className="filters-grid">
                    <div className="form-group">
                        <label>Semester Type</label>
                        <select
                            className="base-input"
                            value={semesterType}
                            onChange={e => setSemesterType(e.target.value)}
                        >
                            <option value="ODD">ODD Semester</option>
                            <option value="EVEN">EVEN Semester</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Academic Year</label>
                        <input
                            type="number"
                            className="base-input"
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="empty-state">
                    <div className="spinner"></div>
                    <p>Loading master timetable...</p>
                </div>
            ) : error ? (
                <div className="error-message">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            ) : data.rooms.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><AlertCircle size={48} /></div>
                    <h3>No Lab Rooms Found</h3>
                    <p>There are no rooms assigned as 'LAB' type, or no data for this criteria.</p>
                </div>
            ) : (
                <div className="master-timetable-container">
                    <div className="print-header">
                        <h2>COLLEGE TIMETABLE SYSTEM</h2>
                        <h3>MASTER LAB TIMETABLE - {academicYear}</h3>
                        <div className="print-meta">
                            <span>Department: {getDeptName()}</span>
                            <span>Semester: {semesterType}</span>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="master-lab-table">
                            <thead>
                                <tr>
                                    <th className="day-col">Day</th>
                                    <th className="period-col">Period</th>
                                    {data.rooms.map(room => (
                                        <th key={room.id} className="room-col">{room.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {DAYS.map((dayName, dayIdx) => {
                                    return Array.from({ length: 7 }).map((_, slotIdx) => (
                                        <tr key={`${dayIdx}-${slotIdx}`} className={slotIdx === 0 ? 'new-day-row' : ''}>
                                            {slotIdx === 0 && (
                                                <td rowSpan={7} className="day-cell">
                                                    {dayName}
                                                </td>
                                            )}
                                            <td className="period-cell">Period {slotIdx + 1}</td>
                                            {data.rooms.map(room => {
                                                const allocs = data.grid[dayIdx]?.[slotIdx]?.[room.id] || [];

                                                if (allocs.length === 0) {
                                                    return <td key={room.id} className="alloc-cell free-cell">Free</td>;
                                                }

                                                return (
                                                    <td key={room.id} className="alloc-cell">
                                                        {allocs.length > 1 ? (
                                                            <div className="alloc-stack">
                                                                <div className="stack-classes">
                                                                    {allocs.map((a, i) => (
                                                                        <div key={i} className="stack-item">
                                                                            <strong>{a.class_name} {a.batch ? ` - ${a.batch}` : ''}</strong>
                                                                            <span className="small-code">{a.subject_code} ({a.teacher})</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="alloc-single">
                                                                <div className="class-name">{allocs[0].class_name} {allocs[0].batch ? `" ${allocs[0].batch} "` : ''}</div>
                                                                <div className="subject-line">
                                                                    {allocs[0].subject_code} <span className="teacher-code">({allocs[0].teacher})</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ));
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
