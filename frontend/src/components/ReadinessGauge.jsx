import React from 'react';
import PropTypes from 'prop-types';

const ReadinessGauge = ({ score, recommendation }) => {
    let statusClass = "status-good";
    if (score < 70) statusClass = "status-warn";
    if (score < 50) statusClass = "status-bad"; // Add CSS for this if needed

    return (
        <div className="card gauge-container">
            <h2>Metabolic Readiness</h2>
            <div className="score-display">{score}</div>
            <div className="score-label">Phase Alignment Index</div>
            <div className={`status-badge ${statusClass}`}>
                {score > 75 ? "PRIME STATE" : "RECOVERY MODE"}
            </div>
            <p style={{ marginTop: '1rem', color: '#a0aec0' }}>{recommendation}</p>
        </div>
    );
};

ReadinessGauge.propTypes = {
    score: PropTypes.number.isRequired,
    recommendation: PropTypes.string.isRequired
};

export default ReadinessGauge;
