/**
 * ImportanceBar - Visual Vertical Level Indicator
 *
 * Replaces dropdown with a premium vertical pill-shaped bar
 * showing subject importance level and pass percentage.
 *
 * Design:
 * - Vertical pill-shaped bar (180px tall, 30px wide)
 * - Dark background with animated colored fill
 * - Dot markers along the bar for level steps
 * - Pass percentage text below
 * - Importance label below that
 */
import { useEffect, useState, useRef } from 'react';

const LEVELS = {
    LOW: { fill: 0.30, label: 'Low' },
    NORMAL: { fill: 0.60, label: 'Normal' },
    HIGH: { fill: 0.90, label: 'High' },
};

function getBarColor(passPercentage) {
    if (passPercentage == null || passPercentage === '') return '#627d98';
    const p = Number(passPercentage);
    if (p < 50) return '#ef4444';       // Red tone
    if (p <= 70) return '#f59e0b';      // Orange tone
    return '#22c55e';                    // Green tone
}

function getPriorityBadge(priorityScore) {
    if (priorityScore >= 3) return { text: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
    if (priorityScore >= 2) return { text: 'High', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
    if (priorityScore >= 1) return { text: 'Normal', color: '#627d98', bg: 'rgba(98,125,152,0.12)' };
    return { text: 'Low', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
}

export default function ImportanceBar({
    importanceLevel = 'NORMAL',
    passPercentage = null,
    priorityScore = 0,
    onImportanceChange,
    onPassPercentageChange,
    editable = false,
    compact = false,
}) {
    const [animatedFill, setAnimatedFill] = useState(0);
    const levelConfig = LEVELS[importanceLevel] || LEVELS.NORMAL;
    const barColor = getBarColor(passPercentage);
    const badge = getPriorityBadge(priorityScore);
    const barRef = useRef(null);

    // Animate fill on change
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedFill(levelConfig.fill);
        }, 60);
        return () => clearTimeout(timer);
    }, [importanceLevel, levelConfig.fill]);

    const barHeight = compact ? 100 : 180;
    const barWidth = compact ? 22 : 30;
    const dotPositions = [0.30, 0.60, 0.90]; // LOW, NORMAL, HIGH

    const containerStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? '6px' : '10px',
    };

    const barContainerStyle = {
        position: 'relative',
        width: `${barWidth}px`,
        height: `${barHeight}px`,
        borderRadius: `${barWidth / 2}px`,
        background: '#1e293b',
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)',
        cursor: editable ? 'pointer' : 'default',
    };

    const fillStyle = {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: `${animatedFill * 100}%`,
        background: `linear-gradient(to top, ${barColor}, ${barColor}cc)`,
        borderRadius: `${barWidth / 2}px`,
        transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.4s ease',
        boxShadow: `0 0 12px ${barColor}44`,
    };

    const handleBarClick = (e) => {
        if (!editable || !onImportanceChange || !barRef.current) return;
        const rect = barRef.current.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const ratio = 1 - clickY / rect.height;

        if (ratio < 0.40) onImportanceChange('LOW');
        else if (ratio < 0.75) onImportanceChange('NORMAL');
        else onImportanceChange('HIGH');
    };

    return (
        <div style={containerStyle}>
            {/* Bar */}
            <div
                ref={barRef}
                style={barContainerStyle}
                onClick={handleBarClick}
                title={editable ? 'Click to set importance level' : `Importance: ${levelConfig.label}`}
            >
                {/* Fill */}
                <div style={fillStyle} />

                {/* Dot markers */}
                {dotPositions.map((pos, i) => {
                    const dotBottom = pos * barHeight - 4;
                    const isActive = animatedFill >= pos;
                    return (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                bottom: `${dotBottom}px`,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: isActive ? '#fff' : 'rgba(255,255,255,0.2)',
                                transition: 'background 0.4s ease',
                                zIndex: 2,
                                boxShadow: isActive ? '0 0 6px rgba(255,255,255,0.5)' : 'none',
                            }}
                        />
                    );
                })}

                {/* Glow line at top of fill */}
                <div style={{
                    position: 'absolute',
                    bottom: `${animatedFill * 100}%`,
                    left: '10%',
                    width: '80%',
                    height: '2px',
                    background: `${barColor}`,
                    boxShadow: `0 0 8px ${barColor}88`,
                    transition: 'bottom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    borderRadius: '1px',
                    zIndex: 3,
                }} />
            </div>

            {/* Pass Percentage Display */}
            <div style={{
                fontSize: compact ? '14px' : '18px',
                fontWeight: '700',
                color: barColor,
                textAlign: 'center',
                lineHeight: 1,
                letterSpacing: '-0.5px',
            }}>
                {passPercentage != null && passPercentage !== '' ? `${passPercentage}%` : '—'}
            </div>

            {/* Importance Label */}
            <div style={{
                fontSize: compact ? '10px' : '11px',
                fontWeight: '600',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                textAlign: 'center',
            }}>
                {levelConfig.label}
            </div>

            {/* Priority Badge (only if non-compact) */}
            {!compact && (
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: '600',
                    color: badge.color,
                    background: badge.bg,
                    border: `1px solid ${badge.color}22`,
                }}>
                    <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: badge.color,
                    }} />
                    P{priorityScore}
                </div>
            )}

            {/* Editable Controls */}
            {editable && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    width: '100%',
                    marginTop: '4px',
                }}>
                    {/* Importance Level Selector (button-group) */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        justifyContent: 'center',
                    }}>
                        {['LOW', 'NORMAL', 'HIGH'].map(level => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => onImportanceChange && onImportanceChange(level)}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    borderRadius: '6px',
                                    border: importanceLevel === level
                                        ? `2px solid ${level === 'HIGH' ? '#ef4444' : level === 'NORMAL' ? '#f59e0b' : '#22c55e'}`
                                        : '1px solid #e2e8f0',
                                    background: importanceLevel === level
                                        ? (level === 'HIGH' ? 'rgba(239,68,68,0.08)' : level === 'NORMAL' ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)')
                                        : 'white',
                                    color: importanceLevel === level
                                        ? (level === 'HIGH' ? '#ef4444' : level === 'NORMAL' ? '#d97706' : '#16a34a')
                                        : '#94a3b8',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {level.charAt(0) + level.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    {/* Pass Percentage Input */}
                    <div style={{ textAlign: 'center' }}>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={passPercentage ?? ''}
                            onChange={(e) => onPassPercentageChange && onPassPercentageChange(
                                e.target.value === '' ? null : Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                            )}
                            placeholder="Pass %"
                            style={{
                                width: '70px',
                                padding: '4px 6px',
                                fontSize: '12px',
                                textAlign: 'center',
                                fontWeight: '600',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                outline: 'none',
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
