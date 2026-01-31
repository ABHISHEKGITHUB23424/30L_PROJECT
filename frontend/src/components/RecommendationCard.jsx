import React, { useState, useEffect } from 'react';
import { Utensils, Clock, AlertCircle, CheckCircle } from 'lucide-react';

const RecommendationCard = ({ status, recommendation }) => {
    // Simple countdown logic
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        if (status !== 'ready' && recommendation.optimalWindow) {
            const interval = setInterval(() => {
                const start = new Date(recommendation.optimalWindow.start);
                const now = new Date();
                const diff = start - now;

                if (diff <= 0) {
                    setTimeLeft("Window Opening Now");
                } else {
                    const mins = Math.floor(diff / 60000);
                    const secs = Math.floor((diff % 60000) / 1000);
                    setTimeLeft(`${mins}m ${secs}s`);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [status, recommendation]);

    // Styles
    const isReady = status === 'ready';
    const bgColor = isReady ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    const borderColor = isReady ? '#10b981' : '#ef4444';
    const icon = isReady ? <CheckCircle color="#10b981" /> : <Clock color="#ef4444" />;

    return (
        <div className="card" style={{
            borderLeft: `4px solid ${borderColor}`,
            background: `linear-gradient(90deg, ${bgColor} 0%, rgba(35, 39, 58, 0) 100%)`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                {icon}
                <div>
                    <h2 style={{ margin: 0, color: 'white' }}>{recommendation.action}</h2>
                    <div style={{ fontSize: '0.9rem', color: '#a0aec0' }}>{recommendation.message}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                <div style={{ padding: '1rem', background: '#1a1d2d', borderRadius: '8px' }}>
                    <div style={{ color: '#a0aec0', fontSize: '0.8rem', marginBottom: '0.25rem' }}>OPTIMAL WINDOW</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {new Date(recommendation.optimalWindow.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6366f1' }}>
                        to {new Date(recommendation.optimalWindow.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>

                {!isReady && (
                    <div style={{ padding: '1rem', background: '#1a1d2d', borderRadius: '8px' }}>
                        <div style={{ color: '#a0aec0', fontSize: '0.8rem', marginBottom: '0.25rem' }}>WAIT TIME</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                            {timeLeft || "Calculating..."}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#a0aec0' }}>
                            until metabolic prime
                        </div>
                    </div>
                )}

                {isReady && (
                    <div style={{ padding: '1rem', background: '#1a1d2d', borderRadius: '8px' }}>
                        <div style={{ color: '#a0aec0', fontSize: '0.8rem', marginBottom: '0.25rem' }}>METABOLIC STATE</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Utensils size={18} /> PRIMED
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecommendationCard;
