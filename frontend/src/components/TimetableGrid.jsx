/**
 * Timetable Grid Component
 * Displays a weekly timetable in grid format with college timings
 * 
 * COLLEGE TIME STRUCTURE:
 * 1st Period  : 08:45 – 09:45
 * 2nd Period  : 09:45 – 10:45
 * BREAK       : 10:45 – 11:00
 * 3rd Period  : 11:00 – 12:00
 * LUNCH       : 12:00 – 01:00
 * 4th Period  : 01:00 – 02:00
 * 5th Period  : 02:00 – 02:50
 * BREAK       : 02:50 – 03:05
 * 6th Period  : 03:05 – 03:55
 * 7th Period  : 03:55 – 04:45
 */
import { Clock, User, MapPin, BookOpen, AlertTriangle, Coffee, UtensilsCrossed } from 'lucide-react';
import './TimetableGrid.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableGrid({ timetable, viewType = 'semester' }) {
    if (!timetable || !timetable.days) {
        return (
            <div className="empty-state">
                <Clock size={48} />
                <h3>No Timetable Data</h3>
                <p>Generate a timetable to see it here.</p>
            </div>
        );
    }

    // Dynamic Periods computation based on template
    const breakSlots = timetable.break_slots || [1, 4]; // Default EVEN
    const lunchSlot = timetable.lunch_slot !== undefined ? timetable.lunch_slot : 3;

    const PERIODS = [];
    const SLOT_TO_PERIOD_INDEX = {};
    let currentPeriodIdx = 0;

    // Simplistic time simulation
    let currentHour = 8;
    let currentMinute = 45;

    const addMinutes = (h, m, mins) => {
        let newM = m + mins;
        let newH = h + Math.floor(newM / 60);
        newM = newM % 60;
        return { h: newH, m: newM };
    };

    const formatTime = (h, m) => {
        let displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        const ampm = h >= 12 ? 'PM' : 'AM';
        return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    for (let slot = 0; slot < 7; slot++) {
        const isLastTwoPeriods = slot >= 4;
        const duration = isLastTwoPeriods ? 50 : 60; // Just mimic the current static

        const startTimeStr = formatTime(currentHour, currentMinute);
        const endTime = addMinutes(currentHour, currentMinute, duration);
        const endTimeStr = formatTime(endTime.h, endTime.m);

        PERIODS.push({
            period: slot + 1,
            time: `${startTimeStr} - ${endTimeStr}`,
            label: `${slot + 1}${slot === 0 ? 'st' : slot === 1 ? 'nd' : slot === 2 ? 'rd' : 'th'} Period`
        });

        SLOT_TO_PERIOD_INDEX[slot] = currentPeriodIdx;
        currentPeriodIdx++;

        currentHour = endTime.h;
        currentMinute = endTime.m;

        // Add Break if needed (AFTER this slot)
        if (breakSlots.includes(slot)) {
            const breakEnd = addMinutes(currentHour, currentMinute, 15);
            PERIODS.push({
                type: 'break',
                time: `${formatTime(currentHour, currentMinute)} - ${formatTime(breakEnd.h, breakEnd.m)}`,
                label: 'Break'
            });
            currentHour = breakEnd.h;
            currentMinute = breakEnd.m;
            currentPeriodIdx++;
        }

        // Add Lunch if needed (AFTER this slot)
        if (lunchSlot === slot) {
            const lunchEnd = addMinutes(currentHour, currentMinute, 60);
            PERIODS.push({
                type: 'lunch',
                time: `${formatTime(currentHour, currentMinute)} - ${formatTime(lunchEnd.h, lunchEnd.m)}`,
                label: 'Lunch'
            });
            currentHour = lunchEnd.h;
            currentMinute = lunchEnd.m;
            currentPeriodIdx++;
        }
    }

    // Function to get slot data for a specific period
    const getSlotData = (day, periodIndex) => {
        for (const [slotIdx, pIdx] of Object.entries(SLOT_TO_PERIOD_INDEX)) {
            if (pIdx === periodIndex) {
                return day.slots[parseInt(slotIdx)];
            }
        }
        return null;
    };

    return (
        <div className="timetable-container">
            <div className="timetable-header-info">
                <h2>{timetable.entity_name}</h2>
                <span className="badge badge-info">{timetable.entity_type}</span>
            </div>

            <div className="timetable-grid-wrapper">
                <table className="timetable-grid">
                    <thead>
                        <tr>
                            <th className="time-header">
                                <Clock size={16} />
                                <span>Time</span>
                            </th>
                            {DAYS.map((day, idx) => (
                                <th key={idx} className="day-header">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {PERIODS.map((periodInfo, periodIdx) => {
                            // Check if this is a break or lunch row
                            if (periodInfo.type === 'break') {
                                return (
                                    <tr key={`break-${periodIdx}`} className="break-row">
                                        <td className="time-cell break-cell">
                                            <Coffee size={14} />
                                            <span className="slot-time">{periodInfo.time}</span>
                                        </td>
                                        <td colSpan={5} className="break-content">
                                            <Coffee size={16} />
                                            <span>{periodInfo.label}</span>
                                        </td>
                                    </tr>
                                );
                            }

                            if (periodInfo.type === 'lunch') {
                                return (
                                    <tr key={`lunch-${periodIdx}`} className="lunch-row">
                                        <td className="time-cell lunch-cell">
                                            <UtensilsCrossed size={14} />
                                            <span className="slot-time">{periodInfo.time}</span>
                                        </td>
                                        <td colSpan={5} className="lunch-content">
                                            <UtensilsCrossed size={16} />
                                            <span>{periodInfo.label}</span>
                                        </td>
                                    </tr>
                                );
                            }

                            // Regular period row
                            return (
                                <tr key={periodIdx}>
                                    <td className="time-cell">
                                        <span className="slot-number">{periodInfo.label}</span>
                                        <span className="slot-time">{periodInfo.time}</span>
                                    </td>
                                    {timetable.days.map((day, dayIdx) => {
                                        const slot = getSlotData(day, periodIdx);
                                        const isElective = slot?.is_elective;
                                        const isEmpty = !slot || (!slot.subject_name && !isElective);
                                        const academicComponent = slot?.academic_component || slot?.component_type || null;
                                        const isLab = slot?.is_lab || academicComponent === 'lab';
                                        const isTutorial = academicComponent === 'tutorial';
                                        const isProject = academicComponent === 'project';
                                        const isReport = academicComponent === 'report';
                                        const isSelfStudy = academicComponent === 'self_study';
                                        const isSeminar = academicComponent === 'seminar';
                                        const isSubstituted = slot?.is_substituted;

                                        // Determine cell type class for color coding
                                        let typeClass = '';
                                        if (isEmpty) typeClass = 'free';
                                        else if (isLab) typeClass = 'lab';
                                        else if (isTutorial) typeClass = 'tutorial';
                                        else if (isElective) typeClass = 'elective';
                                        else typeClass = 'theory';



                                        return (
                                            <td
                                                key={dayIdx}
                                                className={`slot-cell ${typeClass} ${isSubstituted ? 'substituted' : ''}`}
                                            >
                                                {!isEmpty && (
                                                    <div className="slot-content">
                                                        <div className="slot-subject">
                                                            <BookOpen size={14} />
                                                            <span>{isElective && viewType === 'semester' ? 'ELECTIVE' : slot.subject_name}</span>
                                                        </div>
                                                        {(!isElective || viewType !== 'semester') && slot.subject_code && (
                                                            <span className="slot-code">{slot.subject_code}</span>
                                                        )}

                                                        {/* Batch Display Logic */}
                                                        {slot.batch_allocations && slot.batch_allocations.length > 0 ? (
                                                            <div className="batch-list">
                                                                {slot.batch_allocations.map((batch, bIdx) => (
                                                                    <div key={bIdx} className="batch-item">
                                                                        <div className="batch-header">
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                <span className="batch-badge">{batch.batch_name}</span>
                                                                                {batch.subject_code && (
                                                                                    <span className="batch-subject" style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                                                        {batch.subject_code}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {batch.room_name && <span className="batch-room"><MapPin size={10} /> {batch.room_name}</span>}
                                                                        </div>
                                                                        <div className="batch-teacher">
                                                                            <User size={10} /> {batch.teacher_name}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {viewType === 'semester' && slot.teacher_name && (
                                                                    <div className="slot-teacher">
                                                                        <User size={12} />
                                                                        <span>
                                                                            {isSubstituted ? (
                                                                                <>
                                                                                    <span className="original-teacher">{slot.teacher_name}</span>
                                                                                    <span className="substitute-teacher">
                                                                                        → {slot.substitute_teacher_name}
                                                                                    </span>
                                                                                </>
                                                                            ) : (
                                                                                slot.teacher_name
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {slot.room_name && (
                                                                    <div className="slot-room">
                                                                        <MapPin size={12} />
                                                                        <span>{slot.room_name}</span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}

                                                        <div className="slot-badges">
                                                            {isLab && (
                                                                <span className="slot-badge lab-badge">LAB</span>
                                                            )}
                                                            {isTutorial && (
                                                                <span className="slot-badge tutorial-badge">TUT</span>
                                                            )}
                                                            {isProject && (
                                                                <span className="slot-badge elective-badge">PRJ</span>
                                                            )}
                                                            {isReport && (
                                                                <span className="slot-badge elective-badge">RPT</span>
                                                            )}
                                                            {isSelfStudy && (
                                                                <span className="slot-badge elective-badge">SS</span>
                                                            )}
                                                            {isSeminar && (
                                                                <span className="slot-badge elective-badge">SEM</span>
                                                            )}
                                                            {isElective && (
                                                                <span className="slot-badge elective-badge">ELECTIVE</span>
                                                            )}
                                                            {isSubstituted && (
                                                                <span className="slot-badge sub-badge">
                                                                    <AlertTriangle size={10} />
                                                                    SUB
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {isEmpty && (
                                                    <span className="empty-slot">Free Period</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="timetable-legend">
                <div className="legend-item">
                    <span className="legend-color theory-color"></span>
                    <span>Theory</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color lab-color"></span>
                    <span>Lab</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color elective-color"></span>
                    <span>Elective</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color free-color"></span>
                    <span>Free Period</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color sub-color"></span>
                    <span>Substituted</span>
                </div>
            </div>
        </div>
    );
}
