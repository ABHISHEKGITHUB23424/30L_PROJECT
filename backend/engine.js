// engine.js
// Signal Processing & Inference Layer

function processData(data) {
    // 1. Detect Sleep Window (Simplified Rule-Based)
    // Look for sustained low activity and low light

    let sleepOnset = null;
    let wakeTime = null;
    const sleepReadings = [];

    // We'll analyze the last 24 hours of data
    const recentData = data.slice(-1440);

    for (let i = 0; i < recentData.length; i++) {
        const reading = recentData[i];

        // Simple heuristic: If activity is 0 and light is 0 for > 15 mins, we are likely asleep
        if (reading.activity < 5 && reading.light_lux < 10) {
            if (!sleepOnset) sleepOnset = reading.timestamp;
            sleepReadings.push(reading);
        } else if (sleepOnset && reading.activity > 20) {
            // If we see significant activity after sleep, assume wake
            // In a real system, we'd need a buffer to avoid waking on tossing/turning
            wakeTime = reading.timestamp;
        }
    }

    // Fallback if no clear wake detected (still asleep), use last data point
    if (sleepOnset && !wakeTime) {
        wakeTime = recentData[recentData.length - 1].timestamp;
    }

    // 2. Detect HR Nadir (Lowest Heart Rate during sleep)
    let nadir = { heart_rate: 1000, timestamp: null };

    if (sleepReadings.length > 0) {
        for (const reading of sleepReadings) {
            if (reading.heart_rate < nadir.heart_rate) {
                nadir = reading;
            }
        }
    } else {
        // Fallback if no sleep detected
        nadir = { heart_rate: 60, timestamp: null };
    }

    // 3. Metabolic Readiness Score (0-100)
    // Factors: Total Sleep, Nadir depth (lower is better generally, but within range), Regularity (mocked)

    let score = 70; // Base score

    const sleepDurationMinutes = sleepReadings.length;
    if (sleepDurationMinutes > 420) score += 10; // > 7 hours
    if (sleepDurationMinutes < 300) score -= 20; // < 5 hours

    if (nadir.heart_rate < 55) score += 10; // Good recovery
    if (nadir.heart_rate > 65) score -= 10; // Poor recovery

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // 4. Decision: Eating Window
    // Rule: Wait 60 mins after wake time, or 4 hours after Nadir, whichever is later is "safer"
    // For this hackathon, let's say: Optimal eating starts 1 hour after wake.

    let eatingWindowStart = null;
    if (wakeTime) {
        const wakeDate = new Date(wakeTime);
        eatingWindowStart = new Date(wakeDate.getTime() + 60 * 60 * 1000); // +1 hour
    }

    return {
        analysis_timestamp: new Date().toISOString(),
        sleep_onset: sleepOnset,
        wake_time: wakeTime,
        sleep_duration_minutes: sleepDurationMinutes,
        heart_rate_nadir: nadir,
        metabolic_readiness_score: score,
        eating_window_start: eatingWindowStart,
        recommendation: score > 75 ? "Metabolic State Prime. You can follow standard eating windows." : "Recovery Detected. Delay first meal by 2 hours."
    };
}

module.exports = { processData };
