// IPM Client-Side Logic Core
// Implements Modules 1-5

// ----------------------------------------------------
// Module 1: Data Layer (Ingestion & Simulation)
// ----------------------------------------------------
export const generateDemoData = () => {
    const dataPoints = [];
    const now = new Date();

    // Align to yesterday midnight for clean 24h window
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1);

    // Simulation Parameters
    const sleepStartHour = 23; // 11 PM
    const wakeHour = 7; // 7 AM

    // Total 24 hours * 12 points/hr (5 min interval) = 288 points
    const points = 288;

    for (let i = 0; i < points; i++) {
        const timestamp = new Date(start.getTime() + i * 5 * 60000); // 5 min increment
        const hour = timestamp.getHours() + timestamp.getMinutes() / 60;

        // Circadian Logic
        // Sleep: 23:00 to 07:00
        let isSleepEnd = hour >= wakeHour && hour < wakeHour + 1; // Transition out
        let isSleepStart = hour >= sleepStartHour;

        // Handle wrap around midnight for "isNight" logic
        let isNight = (hour >= sleepStartHour) || (hour < wakeHour);

        // Heart Rate: 60-100 Awake, 45-60 Asleep (Nadir around 4 AM)
        let heartRate;
        let lightLux;
        let sleepState;

        if (isNight) {
            sleepState = 1;
            // Nadir dip calculation (deepest at 4 AM)
            const nadirHour = 4;
            const distFromNadir = Math.min(Math.abs(hour - nadirHour), Math.abs(hour + 24 - nadirHour));

            heartRate = 48 + (distFromNadir * 2.5) + (Math.random() * 2);
            lightLux = 0;
        } else {
            sleepState = 0;
            // Wake spike + daily variation
            heartRate = 70 + (Math.sin(hour) * 10) + (Math.random() * 5);
            if (isSleepEnd) heartRate += 10; // Morning cortisol spike

            // Light pattern
            if (hour > 7 && hour < 19) lightLux = 300 + Math.random() * 500;
            else lightLux = 50; // Dim evening
        }

        dataPoints.push({
            timestamp: timestamp.toISOString(),
            heartRate: Math.round(heartRate),
            sleepState: sleepState,
            lightLux: Math.round(lightLux)
        });
    }

    return {
        dataPoints,
        metadata: { startTime: start.toISOString(), totalPoints: points }
    };
};

export const parseCSV = (csvText) => {
    const lines = csvText.split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    // valid columns: timestamp, heart_rate, sleep_state, light_lux
    const colMap = {};
    headers.forEach((h, i) => {
        if (h.includes('time')) colMap.timestamp = i;
        if (h.includes('heart') || h.includes('hr')) colMap.heartRate = i;
        if (h.includes('sleep')) colMap.sleepState = i;
        if (h.includes('light') || h.includes('lux')) colMap.lightLux = i;
    });

    if (Object.keys(colMap).length < 4) {
        throw new Error("Invalid CSV format. Required columns: timestamp, heart_rate, sleep_state, light_lux");
    }

    const dataPoints = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const pts = lines[i].split(',').map(p => p.trim());

        try {
            dataPoints.push({
                timestamp: new Date(pts[colMap.timestamp]).toISOString(),
                heartRate: parseInt(pts[colMap.heartRate]),
                sleepState: parseInt(pts[colMap.sleepState]),
                lightLux: parseInt(pts[colMap.lightLux])
            });
        } catch (e) {
            console.warn(`Skipping malformed line ${i}: ${lines[i]}`);
        }
    }

    // Sort by time just in case
    dataPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return {
        dataPoints,
        metadata: {
            startTime: dataPoints[0].timestamp,
            endTime: dataPoints[dataPoints.length - 1].timestamp,
            totalPoints: dataPoints.length
        }
    };
};


// ----------------------------------------------------
// Module 2: Preprocessing Layer (Cleaning & Smoothing)
// ----------------------------------------------------
export const preprocessData = (rawData) => {
    // 15-minute moving average (3 data points at 5-min intervals)
    const windowSize = 3;

    const cleanedData = rawData.dataPoints.map((point, index, array) => {
        // Simple smoothing for HR
        let sumHR = 0;
        let count = 0;
        for (let i = Math.max(0, index - 1); i <= Math.min(array.length - 1, index + 1); i++) {
            sumHR += array[i].heartRate;
            count++;
        }

        return {
            ...point,
            heartRateSmoothed: parseFloat((sumHR / count).toFixed(1)),
            dataQuality: "good"
        };
    });

    return { cleanedData };
};


// ----------------------------------------------------
// Module 3: Feature Extraction Layer (Biological Timing)
// ----------------------------------------------------
export const extractBioMarkers = (cleanedData) => {
    let sleepStart = null;
    let wakeTime = null;
    let hrNadir = { value: 999, timestamp: null };
    let firstLight = null;

    // Find sleep windows
    // Heuristic: continuous sleepState = 1

    let currentSleepStreak = [];

    cleanedData.forEach((d) => {
        if (d.sleepState === 1) {
            if (!sleepStart) sleepStart = d; // First incidence
            currentSleepStreak.push(d);

            // Check for Nadir
            if (d.heartRateSmoothed < hrNadir.value) {
                hrNadir = { value: d.heartRateSmoothed, timestamp: d.timestamp };
            }
        } else {
            // IF we were sleeping and now just woke up
            if (currentSleepStreak.length > 5 && !wakeTime) { // Must assume sleep > 25 mins
                wakeTime = d; // Use first wake point
            }
        }

        // Light Onset (after wake)
        if (wakeTime && !firstLight && d.lightLux > 100) {
            firstLight = d;
        }
    });

    // Safety check if no sleep detected (e.g. partial data)
    // Fallback: Use simple min/max
    if (hrNadir.value === 999) hrNadir = { value: 60, timestamp: cleanedData[0].timestamp };

    return {
        sleepStart: sleepStart ? { timestamp: sleepStart.timestamp, confidence: 0.9 } : null,
        wakeTime: wakeTime ? { timestamp: wakeTime.timestamp, confidence: 0.9 } : null,
        hrNadir: { ...hrNadir, confidence: 0.95, depth: 0.7 },
        lightOnset: firstLight ? { timestamp: firstLight.timestamp, lux: firstLight.lightLux } : null
    };
};


// ----------------------------------------------------
// Module 4: Circadian Inference Engine (Core Logic)
// ----------------------------------------------------
export const assessCircadianAlignment = (markers) => {
    if (!markers.wakeTime || !markers.hrNadir.timestamp) {
        return { alignmentScore: 50, explanation: "Insufficient data for detailed analysis" };
    }

    const wakeTime = new Date(markers.wakeTime.timestamp).getTime();
    const nadirTime = new Date(markers.hrNadir.timestamp).getTime();

    // Recovery Gap: Wake - Nadir
    // Ideal: 2-3 hours (120 - 180 mins)
    const recoveryGapMs = wakeTime - nadirTime;
    const recoveryGapMinutes = Math.floor(recoveryGapMs / 60000);

    // Scoring
    let recoveryScore = 0;
    if (recoveryGapMinutes >= 120 && recoveryGapMinutes <= 180) recoveryScore = 100; // Optimal
    else if (recoveryGapMinutes >= 90 && recoveryGapMinutes < 120) recoveryScore = 80;
    else if (recoveryGapMinutes > 180) recoveryScore = 70; // Too long gap (lazy wake?)
    else if (recoveryGapMinutes < 90 && recoveryGapMinutes > 60) recoveryScore = 60;
    else recoveryScore = 40; // < 60 mins gap (Incomplete recovery)

    let alignmentScore = recoveryScore; // Weighted simpler for this prototype

    let phase = "aligned";
    if (recoveryGapMinutes < 90) phase = "delayed"; // Nadir too close to wake
    if (recoveryGapMinutes > 200) phase = "advanced"; // Nadir way before wake

    return {
        recoveryGap: recoveryGapMinutes,
        circadianPhase: phase,
        alignmentScore,
        metrics: {
            recovery: recoveryScore,
            // Mocking these for demo completeness if not calculated fully
            sleepDuration: 85,
            lightTiming: 90,
            nadirDepth: 88
        },
        interpretation: `Recovery gap of ${recoveryGapMinutes} minutes indicates ${phase} circadian rhythm.`
    };
};


// ----------------------------------------------------
// Module 5: Decision & Recommendation Layer
// ----------------------------------------------------
export const calculateReadiness = (inference, markers) => {
    const { alignmentScore, recoveryGap } = inference;

    let status = "significant_delay";
    let optimalEatingStart = null;
    let delayMinutes = 0;

    const wakeDate = markers.wakeTime ? new Date(markers.wakeTime.timestamp) : new Date();

    if (recoveryGap >= 120) {
        status = "ready";
        // Optimal: 45 min after wake
        optimalEatingStart = new Date(wakeDate.getTime() + 45 * 60000);
    } else if (recoveryGap >= 60) {
        status = "delay";
        // Wait until gap would be theoretical 120? Or just fixed delay
        delayMinutes = 60;
        optimalEatingStart = new Date(wakeDate.getTime() + 120 * 60000); // Push to 2 hours post wake
    } else {
        // Significant delay
        delayMinutes = 120;
        optimalEatingStart = new Date(wakeDate.getTime() + 180 * 60000); // Push to 3 hours post wake
    }

    // Construct recommendation object
    return {
        readinessScore: alignmentScore, // Map alignment directly to readiness for now
        status: status,
        recommendation: {
            action: status === "ready" ? "Ready to Eat" : "Delay Meal",
            message: status === "ready"
                ? "Your metabolic phase is aligned. You can consume nutrients immediately."
                : `Incomplete recovery detected. Wait ${delayMinutes} mins for optimal insulin sensitivity.`,
            optimalWindow: {
                start: optimalEatingStart.toISOString(),
                end: new Date(optimalEatingStart.getTime() + 60 * 60000).toISOString() // 1 hour window
            }
        }
    };
};
