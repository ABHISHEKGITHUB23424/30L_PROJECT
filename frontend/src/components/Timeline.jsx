import React from 'react';
import PropTypes from 'prop-types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { format, parseISO } from 'date-fns';

const Timeline = ({ data, markers, recommendation }) => {
    if (!data || data.length === 0) return <div>Loading timeline...</div>;

    // Formatting for chart
    const chartData = data.map(d => ({
        ...d,
        time: format(parseISO(d.timestamp), 'HH:mm'),
        timestampObs: parseISO(d.timestamp).getTime()
    }));

    return (
        <div className="card" style={{ height: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2>24h Physiological Signal</h2>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                    <span style={{ color: '#ef4444' }}>● Heart Rate</span>
                    <span style={{ color: '#f59e0b' }}>● Light</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="time" stroke="#a0aec0" interval={24} />
                    <YAxis yAxisId="hr" stroke="#ef4444" domain={['dataMin - 10', 'dataMax + 10']} />
                    <YAxis yAxisId="lux" orientation="right" stroke="#f59e0b" hide />

                    <Tooltip
                        contentStyle={{ backgroundColor: '#1a1d2d', border: '1px solid #23273a', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#a0aec0', marginBottom: '0.5rem' }}
                    />

                    {/* Sleep Window Highlight */}
                    {markers?.sleepStart && markers?.wakeTime && (
                        <ReferenceArea
                            yAxisId="hr"
                            x1={format(parseISO(markers.sleepStart.timestamp), 'HH:mm')}
                            x2={format(parseISO(markers.wakeTime.timestamp), 'HH:mm')}
                            fill="#6366f1"
                            fillOpacity={0.1}
                            strokeOpacity={0}
                        />
                    )}

                    {/* Lines */}
                    <Line yAxisId="hr" type="basis" dataKey="heartRateSmoothed" stroke="#ef4444" dot={false} strokeWidth={2} name="HR (Smoothed)" />
                    <Line yAxisId="lux" type="basis" dataKey="lightLux" stroke="#f59e0b" dot={false} strokeWidth={1} strokeOpacity={0.5} name="Light (Lux)" />

                    {/* Markers */}
                    {markers?.hrNadir?.timestamp && (
                        <ReferenceLine yAxisId="hr" x={format(parseISO(markers.hrNadir.timestamp), 'HH:mm')} stroke="#8b5cf6" strokeDasharray="3 3" label={{ value: 'Nadir', position: 'top', fill: '#8b5cf6', fontSize: 12 }} />
                    )}

                    {/* Eating Window */}
                    {recommendation?.optimalWindow && (
                        <ReferenceArea
                            yAxisId="hr"
                            x1={format(parseISO(recommendation.optimalWindow.start), 'HH:mm')}
                            x2={format(parseISO(recommendation.optimalWindow.end), 'HH:mm')}
                            fill="#10b981"
                            fillOpacity={0.2}
                        />
                    )}

                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

Timeline.propTypes = {
    data: PropTypes.array,
    markers: PropTypes.object,
    recommendation: PropTypes.object
};

export default Timeline;
