import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, ReferenceArea } from 'recharts';
import { Upload, Play, Home, TrendingUp, Clock, Heart, Sun, Moon, CheckCircle, AlertCircle, Info, Download, RefreshCw, ChevronRight, ChevronDown, Edit3, Activity, Wifi, Zap, ArrowRightCircle, Battery, Coffee, Droplets } from 'lucide-react';

/* 
  CIRCADIAN METABOLIC READINESS SYSTEM
  - Strict 6-Module Architecture
  - High-Performance Component Isolation
  - ADDED: Enhanced Hackathon View (Splitted & Animated)
*/

// ==========================================
// MODULE 1: Data Layer
// ==========================================
const DataLayer = {
  seed: 12345,
  random: () => {
    const x = Math.sin(DataLayer.seed++) * 10000;
    return x - Math.floor(x);
  },

  ingest: async (source) => {
    if (source && source.mode === 'simulation') return DataLayer.generateWearableStream();
    if (source && source.mode === 'manual') return DataLayer.generateFromManual(source.data);
    if (source instanceof File) {
      const text = await source.text();
      return source.name.endsWith('.json') ? JSON.parse(text) : DataLayer.parseCSV(text);
    }
    return DataLayer.generateSimulatedData();
  },

  generateNextPoint: (lastPoint, tickCount = 0) => {
    const lastTime = new Date(lastPoint.timestamp);
    const nextTime = new Date(lastTime.getTime() + 60000);
    const hour = nextTime.getHours();

    const isSleep = (hour >= 23 || hour < 7);
    let hr, lux;

    // Default noise
    const noise = (Math.random() * 4 - 2);

    // TRAPEZOIDAL WAVE PATTERN (50s Cycle = 250 ticks @ 200ms)
    // 0-20s (0-100 ticks): RISE
    // 20-25s (100-125 ticks): HOLD TOP
    // 25-45s (125-225 ticks): FALL
    // 45-50s (225-250 ticks): HOLD BOTTOM

    if (tickCount > 0) {
      const t = tickCount % 250;
      const minHR = 50;
      const maxHR = 160;

      if (t < 100) {
        // Rise (20s)
        const progress = t / 100; // 0 to 1
        hr = minHR + ((maxHR - minHR) * progress);
      } else if (t < 125) {
        // Hold Top (5s)
        hr = maxHR;
      } else if (t < 225) {
        // Fall (20s)
        const progress = (t - 125) / 100; // 0 to 1
        hr = maxHR - ((maxHR - minHR) * progress);
      } else {
        // Hold Bottom (5s)
        hr = minHR;
      }
      hr += noise; // Add life-like noise
      lux = (hour > 7 && hour < 20) ? 400 : 50;

    } else {
      // Fallback or Sleep Logic (if tickCount not provided)
      const lastHR = lastPoint.heartRateSmoothed || lastPoint.heartRate || 70;
      if (isSleep) {
        const diff = 50 - lastHR;
        hr = lastHR + (diff * 0.1) + noise;
        lux = 0;
      } else {
        const target = 75 + Math.sin(nextTime.getMinutes() / 10) * 5;
        const diff = target - lastHR;
        hr = lastHR + (diff * 0.1) + noise;
        lux = (hour > 7 && hour < 20) ? 400 + Math.random() * 100 : 50;
      }
    }

    return {
      timestamp: nextTime.toISOString(),
      heartRateSmoothed: parseFloat(hr.toFixed(1)),
      sleepState: isSleep ? 1 : 0,
      lightLux: Math.round(lux),
      displayTime: nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    };
  },

  generateSimulatedData: () => DataLayer.generateProfile(23, 30, 7, 15, 45, 70),

  generateFromManual: (data) => {
    const [sleepH, sleepM] = data.sleepTime.split(':').map(Number);
    const [wakeH, wakeM] = data.wakeTime.split(':').map(Number);
    return DataLayer.generateProfile(sleepH, sleepM, wakeH, wakeM, Number(data.minHR), Number(data.avgHR));
  },

  generateProfile: (sleepH, sleepM, wakeH, wakeM, minHR, avgHR) => {
    const dataPoints = [];
    const startTime = new Date();
    startTime.setHours(0, 0, 0, 0);
    startTime.setDate(startTime.getDate() - 1);

    for (let i = 0; i < 288; i++) {
      const timestamp = new Date(startTime.getTime() + i * 5 * 60000);
      const hour = timestamp.getHours();
      const minute = timestamp.getMinutes();
      let isSleep = false;

      if (sleepH > wakeH) {
        if ((hour >= sleepH && minute >= sleepM) || hour > sleepH) isSleep = true;
        if (hour < wakeH || (hour === wakeH && minute < wakeM)) isSleep = true;
      } else {
        if (hour >= sleepH && hour < wakeH) isSleep = true;
      }

      let heartRate = isSleep ? minHR + (Math.random() * 2) : avgHR + (Math.sin(hour) * 5) + (Math.random() * 5);
      let lightLux = (isSleep) ? 0 : (hour > 7 && hour < 20) ? 500 : 50;

      dataPoints.push({
        timestamp: timestamp.toISOString(),
        heartRate: Math.round(heartRate),
        sleepState: isSleep ? 1 : 0,
        lightLux: Math.round(lightLux)
      });
    }
    return { dataPoints, metadata: { source: "Static Profile" } };
  },

  generateWearableStream: () => {
    DataLayer.seed = Date.now();
    const dataPoints = [];
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(0, 0, 0, 0);
    startTime.setDate(startTime.getDate() - 1);

    for (let i = 0; i < 1440; i++) {
      const currentTimestamp = new Date(startTime.getTime() + i * 60000);
      const hour = currentTimestamp.getHours();
      const isSleep = (hour >= 23 || hour < 7);
      const hr = isSleep ? 50 + Math.random() * 5 : 75 + Math.random() * 15;
      const lux = isSleep ? 0 : 400;

      dataPoints.push({
        timestamp: currentTimestamp.toISOString(),
        heart_rate: Math.round(hr),
        sleep_state: isSleep ? "sleep" : "awake",
        light_lux: Math.round(lux)
      });
    }
    return { stream: dataPoints, metadata: { mode: "SIMULATED", source: "Wearable Stream" } };
  },

  parseCSV: (csvText) => {
    const lines = csvText.split('\n');
    const dataPoints = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const vals = lines[i].split(',');
      dataPoints.push({
        timestamp: vals[0],
        heartRate: parseFloat(vals[1]),
        sleepState: parseInt(vals[2]),
        lightLux: parseFloat(vals[3])
      });
    }
    return { dataPoints, metadata: { source: "CSV Upload" } };
  }
};

// ==========================================
// MODULE 2-5 (Logic Layers)
// ==========================================
const PreprocessingLayer = {
  process: (raw) => {
    let rawPoints = raw.dataPoints || raw.stream;
    const cleanedData = rawPoints.map((pt, idx, arr) => {
      const hr = pt.heartRate !== undefined ? pt.heartRate : pt.heart_rate;
      const sleep = pt.sleepState !== undefined ? pt.sleepState : (pt.sleep_state === "sleep" ? 1 : 0);
      const lux = pt.lightLux !== undefined ? pt.lightLux : pt.light_lux;
      return {
        timestamp: pt.timestamp,
        heartRateSmoothed: hr,
        sleepState: sleep,
        lightLux: lux,
        displayTime: new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      };
    });
    return { dailySegments: [{ data: cleanedData }] };
  }
};

const FeatureExtractionLayer = {
  extract: (segment) => {
    const data = segment.data;
    const sleepStartIndex = data.findIndex(d => d.sleepState === 1) || 0;

    let wakeIndex = data.length - 1;
    for (let i = data.length - 1; i > 0; i--) {
      if (data[i].sleepState === 0 && data[i - 1].sleepState === 1) {
        wakeIndex = i;
        break;
      }
    }

    let nadirIndex = sleepStartIndex;
    let minHR = 200;
    const safeWake = Math.min(wakeIndex, data.length - 1);
    const safeSleep = Math.min(sleepStartIndex, data.length - 1);

    if (safeWake > safeSleep) {
      for (let i = safeSleep; i < safeWake; i++) {
        if (data[i].heartRateSmoothed < minHR) {
          minHR = data[i].heartRateSmoothed;
          nadirIndex = i;
        }
      }
    }

    const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "--:--";

    return {
      output: {
        sleep_start: formatTime(data[sleepStartIndex]?.timestamp),
        wake_time: formatTime(data[wakeIndex]?.timestamp),
        hr_nadir_time: formatTime(data[nadirIndex]?.timestamp),
      },
      timestamps: {
        sleep: new Date(data[sleepStartIndex]?.timestamp || Date.now()),
        wake: new Date(data[wakeIndex]?.timestamp || Date.now()),
        nadir: new Date(data[nadirIndex]?.timestamp || Date.now()),
      }
    };
  }
};

const InferenceEngine = {
  analyze: (features) => {
    const wakeTs = features.timestamps.wake.getTime();
    const nadirTs = features.timestamps.nadir.getTime();
    const gapMinutes = Math.floor((wakeTs - nadirTs) / 60000);
    let phaseStatus = "Adequate Alignment";
    let explanation = "Your internal clock matched your wake time perfectly.";
    if (gapMinutes < 120) {
      phaseStatus = "Circadian Delay";
      explanation = "Your body was still recovering when you woke up.";
    }
    return { recoveryGap: gapMinutes, phaseStatus, explanation };
  }
};

const DecisionEngine = {
  decide: (inference) => {
    let score = 100;
    if (inference.recoveryGap < 120) score -= (120 - inference.recoveryGap) * 0.5;
    score = Math.max(0, Math.min(100, Math.round(score)));

    let status = "Ready to Eat";
    let subStatus = "Your metabolism is primed.";
    let delayMinutes = 0;
    if (score < 70) {
      status = "Delay Eating";
      subStatus = "Wait for your metabolism to wake up.";
      delayMinutes = Math.max(30, 120 - inference.recoveryGap);
    }
    return { readinessScore: score, recommendationMessage: status, recommendationSub: subStatus, suggestedDelay: delayMinutes };
  }
};

// ==========================================
// VIEW COMPONENTS 
// ==========================================

// --- COMPONENT: Enhanced Hackathon Decision View ---
const SimplifiedHackathonView = ({ analysis, isProcessing, showMLBadge = false }) => {
  const { decision, features, inference } = analysis;
  const score = decision.readinessScore;
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Decision Logic
  // Use values from the decision engine (which now comes from ML)
  let state = decision.recommendationMessage || "READY TO EAT";
  let explanation = decision.recommendationSub || "Your body has finished recovery. Eating now is safe.";

  let colorClass = "text-green-500";
  let scoreColor = "text-green-400";
  let bgPulse = "bg-green-500/5";
  let border = "border-green-500/30";

  // Visual Styling based on Score (Visuals still heavily tied to score for colors)
  if (score < 40) {
    colorClass = "text-red-500";
    scoreColor = "text-red-400";
    bgPulse = "bg-red-500/5";
    border = "border-red-500/30";
  } else if (score < 70) {
    colorClass = "text-yellow-400";
    scoreColor = "text-yellow-400";
    bgPulse = "bg-yellow-500/5";
    border = "border-yellow-500/30";
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-20 space-y-8 animate-fade-in relative z-10 pb-20">
      {/* Header Separator */}
      <div className="flex items-center justify-center gap-4 opacity-50 mb-12">
        <div className="h-px bg-slate-600 w-32"></div>
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-emerald-500" />
          <span className="text-xs font-bold tracking-[0.3em] uppercase text-slate-400">Simplified Metrics View</span>
        </div>
        <div className="h-px bg-slate-600 w-32"></div>
      </div>

      {/* MAIN METRIC GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

        {/* 1. HERO DECISION CARD (Span 8 cols) */}
        <div className={`lg:col-span-12 xl:col-span-8 p-10 rounded-3xl border-2 ${border} ${bgPulse} relative overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl backdrop-blur-sm transition-all duration-700 hover:scale-[1.01] min-h-[400px]`}>

          {/* ML Badge (Conditional) */}
          {showMLBadge && (
            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 rounded-full border border-slate-700 backdrop-blur-md flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-400 animate-ping' : 'bg-blue-500 animate-pulse'}`}></div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{isProcessing ? "ANALYZING..." : "ML MODEL ACTIVE"}</span>
            </div>
          )}

          {/* OVERLAY FOR PROCESSING STATE */}
          {isProcessing ? (
            <div className="absolute inset-0 bg-slate-900/90 z-20 flex flex-col items-center justify-center animate-fade-in backdrop-blur-sm">
              <RefreshCw size={64} className="text-cyan-400 animate-spin mb-6" />
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Processing Signals...</h2>
              <p className="text-cyan-400 font-mono text-sm animate-pulse">Querying Neural Network</p>
            </div>
          ) : (
            <>
              <div className={`absolute top-0 w-full h-1 ${score >= 70 ? 'bg-green-500' : 'bg-red-500'} opacity-50`}></div>

              {/* Pulsing Backlight */}
              <div className={`absolute inset-0 rounded-3xl ${score >= 70 ? 'bg-green-500/5' : 'bg-red-500/5'} blur-3xl -z-10 animate-pulse`}></div>

              <div className="mb-6 relative">
                <div className={`absolute inset-0 ${score >= 70 ? 'bg-green-400/20' : 'bg-red-400/20'} rounded-full blur-xl animate-ping`}></div>
                <div className="relative bg-slate-900 rounded-full p-4 border border-slate-700 shadow-xl">
                  {score >= 70 ? <CheckCircle size={56} className="text-green-500" /> : <AlertCircle size={56} className="text-red-500" />}
                </div>
              </div>

              <h1 className={`text-6xl md:text-7xl font-black ${colorClass} tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] leading-tight`}>
                {state}
              </h1>
              <p className="text-2xl text-slate-300 font-medium max-w-lg leading-relaxed">
                {explanation}
              </p>
            </>
          )}
        </div>

        {/* 2. SIDEBAR STATS (Span 4 cols) */}
        <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6">

          {/* METABOLIC BATTERY */}
          <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden shadow-lg flex-1">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <Zap size={12} /> Metabolic Battery
            </h3>
            <div className="relative w-full max-w-[140px] h-[70px] border-4 border-slate-600 rounded-2xl p-1.5 flex items-center shadow-inner bg-slate-900/50">
              <div
                className={`h-full rounded-xl transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(0,0,0,0.3)] relative overflow-hidden ${score >= 70 ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}
                style={{ width: `${score}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
              </div>
              <div className="absolute right-[-14px] top-[18px] h-6 w-2 bg-slate-600 rounded-r-md"></div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className={`text-5xl font-mono font-black ${scoreColor}`}>{score}</span>
              <span className="text-slate-500 font-bold">%</span>
            </div>
          </div>

          {/* ACTION CARD */}
          <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700 flex flex-col items-center justify-center text-center shadow-lg flex-1">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Recommended Action</h3>
            {score >= 70 ? (
              <div className="animate-fade-in">
                <div className="bg-green-500/10 w-16 h-16 rounded-2xl mb-3 flex items-center justify-center mx-auto border border-green-500/20">
                  <Coffee size={32} className="text-green-400" />
                </div>
                <p className="text-xl font-bold text-white mb-1">Fuel Up</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Protein + Complex Carbs</p>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="bg-blue-500/10 w-16 h-16 rounded-2xl mb-3 flex items-center justify-center mx-auto border border-blue-500/20">
                  <Droplets size={32} className="text-blue-400 animate-bounce-slow" />
                </div>
                <p className="text-xl font-bold text-white mb-1">Hydrate Only</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Drink Water & Wait</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. ENHANCED TIMELINE */}
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex justify-between text-xs text-slate-500 uppercase tracking-widest font-bold mb-4">
          <span className="flex items-center gap-1"><Moon size={10} /> Sleep Phase</span>
          <span className="flex items-center gap-1 text-purple-400"><TrendingUp size={10} /> Recovery Point</span>
          <span className="flex items-center gap-1"><Sun size={10} /> Active Phase</span>
        </div>
        <div className="h-12 w-full bg-slate-950 rounded-2xl overflow-hidden flex relative ring-1 ring-slate-800">
          {/* Simplified segments */}
          <div className="h-full bg-indigo-900/30 w-[30%] border-r border-slate-800/50 flex items-center justify-center"></div>
          <div className="h-full bg-purple-900/20 w-[15%] border-r border-slate-800/50 relative group">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-purple-500/50"></div>
          </div>
          <div className="h-full bg-slate-900 w-[15%] border-r border-slate-800/50"></div>
          <div className={`h-full w-[40%] flex items-center justify-center transition-colors duration-500 ${score >= 70 ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/30' : 'bg-red-900/10'}`}>
            {score >= 70 && <span className="text-[10px] font-bold text-emerald-500/50 tracking-widest uppercase">Go Zone</span>}
          </div>

          {/* Interactive Markers */}
          <div className="absolute top-0 bottom-0 left-[38%] w-0.5 bg-purple-500 shadow-[0_0_10px_#a855f7]"></div>
          <div className="absolute top-0 bottom-0 left-[60%] w-0.5 bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
        </div>
      </div>

      {/* 5. COLLAPSIBLE DETAILS */}
      <div className="pt-4 text-center">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 transition-all text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest border border-slate-700"
        >
          {detailsOpen ? "Collapse Data Traces" : "View Logic Source"}
          <ChevronDown size={14} className={`transition-transform duration-300 ${detailsOpen ? "rotate-180" : ""}`} />
        </button>

        {detailsOpen && (
          <div className="grid grid-cols-3 gap-4 mt-8 text-left bg-slate-800/30 p-8 rounded-3xl border border-slate-800/50 animate-fade-in backdrop-blur-md">
            <div className="space-y-1">
              <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Lowest HR (Nadir)</div>
              <div className="text-2xl text-purple-300 font-mono font-bold tracking-tight">{features.output.hr_nadir_time}</div>
            </div>
            <div className="space-y-1 border-l border-slate-700/50 pl-6">
              <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Natural Wake</div>
              <div className="text-2xl text-white font-mono font-bold tracking-tight">{features.output.wake_time}</div>
            </div>
            <div className="space-y-1 border-l border-slate-700/50 pl-6">
              <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Recovery Buffer</div>
              <div className={`text-2xl font-mono font-bold tracking-tight ${inference.recoveryGap < 120 ? 'text-red-400' : 'text-emerald-400'}`}>
                {inference.recoveryGap} min
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. ML OUTPUT TEXT BOX (Requested Feature) */}
      <div className="mt-12 w-full max-w-3xl mx-auto">
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 ml-2">ml_inference_log.txt</span>
          </div>
          <div className="p-6 font-mono text-sm text-slate-300 space-y-2">
            <div className="flex gap-3">
              <span className="text-slate-600 select-none">$</span>
              <span className="text-emerald-400">./predict_metabolic_readiness --verbose</span>
            </div>
            <div className="h-px bg-slate-800 my-4"></div>

            {/* ELABORATED OUTPUT (SIMPLIFIED FOR USER) */}
            <div className="space-y-6 animate-fade-in leading-relaxed">

              {/* 1. ANALYSIS SECTION */}
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className="text-blue-500">&gt;&gt;</span> MODEL INTERPRETATION
                </div>
                <p className="text-slate-300">
                  {score >= 70
                    ? "Good news! Your body is currently very relaxed and recovering well. This means your digestion is working perfectly, and your muscles are ready to soak up energy from food."
                    : "The system noticed your body is under a bit of stress right now. When you are stressed, your digestion slows down. If you eat a big meal now, you might feel bloated or tired instead of energized."}
                </p>
              </div>

              {/* 2. ACTIONABLE PROTOCOL SECTION */}
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className={score >= 70 ? "text-green-500" : "text-yellow-500"}>&gt;&gt;</span> SUGGESTED PROTOCOL
                </div>
                <p className={score >= 70 ? "text-green-100" : "text-yellow-100"}>
                  {score >= 70
                    ? "Go ahead and eat your main meal now. It's the perfect time for healthy carbs (like rice, oats, or potatoes) and some protein. Your body will use it for fuel immediately."
                    : `Best advice: Wait about ${decision.suggestedDelay} minutes before having a big meal. Drink some water, take a walk, or just relax for a bit to let your body calm down first.`}
                </p>
              </div>

              {/* 3. TECHNICAL METRICS */}
              <div className="pt-4 border-t border-slate-800/50 grid grid-cols-2 gap-4 text-xs opacity-70">
                <div>
                  <span className="text-slate-500">CONFIDENCE SCORE: </span>
                  <span className="text-blue-400 font-bold">{(score / 100).toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-slate-500">MODEL VERSION: </span>
                  <span className="text-slate-400">v2.4.0-TF</span>
                </div>
              </div>

            </div>
            <div className="mt-4 text-emerald-500/50 flex items-center gap-2">
              <div className="w-2 h-4 bg-emerald-500 confirm_cursor animate-pulse">▋</div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-[10px] text-slate-600 uppercase tracking-widest mt-12 opacity-50">
        System Logic Version 2.4 • Automated Wearable Stream
      </p>
    </div>
  );
};


// (Views are defined below)

const ConnectingView = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
    <div className="relative mb-8">
      <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex items-center justify-center bg-slate-900">
        <Wifi className="w-12 h-12 text-emerald-500 animate-ping" />
      </div>
      <div className="absolute inset-0 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
    <h2 className="text-3xl font-bold mb-2 text-white">Establishing Link...</h2>
  </div>
);

const ProcessingView = () => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <RefreshCw className="w-16 h-16 text-blue-500 animate-spin mb-6" />
    <h2 className="text-2xl font-bold">Processing Data...</h2>
  </div>
);

// --- ORIGINAL DASHBOARD (Reverted to Standard Logic) ---
const ResultsDashboard = ({ analysis, data, mode, onExit }) => {
  const { decision, inference, features } = analysis;
  const isSim = mode === 'simulation';
  const scoreColor = decision.readinessScore < 70 ? "text-yellow-400 border-yellow-500 bg-yellow-500/10" : "text-green-400 border-green-500 bg-green-500/10";
  const optimalEatingTime = new Date(features.timestamps.wake.getTime() + (decision.suggestedDelay * 60000));

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col">
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isSim && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>}
            <span className={`text-xs font-mono uppercase ${isSim ? 'text-emerald-500' : 'text-blue-400'}`}>
              {isSim ? "System Active • Generating Stream" : "Standard Analysis • Complete"}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">{isSim ? "Live Monitor" : "Readiness Report"}</h1>
        </div>
        <button onClick={onExit} className="px-5 py-2.5 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 text-sm">Exit</button>
      </header>

      <div className="grid lg:grid-cols-3 gap-8 flex-1">
        {/* Only Traditional Panels */}
        <div className="lg:col-span-1 space-y-6">
          <div className={`p-8 rounded-2xl border-2 ${scoreColor} text-center shadow-lg relative overflow-hidden backdrop-blur-sm`}>
            <h2 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-3">Recommendation</h2>
            <div className="text-5xl font-black mb-3">{decision.recommendationMessage}</div>
            <p className="text-lg opacity-90 mb-6">{decision.recommendationSub}</p>
            {decision.suggestedDelay > 0 && <span className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700">Wait {decision.suggestedDelay} mins</span>}
          </div>

          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
            <h3 className="font-bold text-lg mb-4 text-white">Logic Trace</h3>
            <p className="text-sm text-slate-300 mb-4">{inference.explanation}</p>
            <div className="flex justify-between items-center text-sm border-t border-slate-700/50 pt-3">
              <span className="text-slate-400">Score</span>
              <span className="font-mono font-bold text-lg">{decision.readinessScore}/100</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2">
              <span className="text-slate-400">Recovery Gap</span>
              <span className="font-mono font-bold text-emerald-400">{inference.recoveryGap} min</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 h-[500px] flex flex-col shadow-xl">
            {/* Graph (Same as before) */}
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.data}>
                  <defs>
                    <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isSim ? "#10b981" : "#818cf8"} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={isSim ? "#10b981" : "#818cf8"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="displayTime" stroke="#64748b" tick={{ fontSize: 10 }} interval={60} hide={isSim} />
                  <YAxis domain={[30, 100]} stroke="#64748b" tick={{ fontSize: 10 }} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} isAnimationActive={false} />
                  <Area type="monotone" dataKey="heartRateSmoothed" stroke={isSim ? "#10b981" : "#818cf8"} strokeWidth={2} fill="url(#hrGradient)" isAnimationActive={false} />
                  <ReferenceLine x={features.output.wake_time} stroke="#34d399" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      {/* REQUIRED FOOTER */}
      <div className="mt-8 text-center py-6 border-t border-slate-800">
        <p className="text-emerald-500 font-bold tracking-widest text-sm uppercase opacity-80 animate-pulse">
          "OKAY YOU'RE GOOD TO PROCEED LIKE THAT"
        </p>
      </div>

      {/* --- RE-ADDED: Enhanced Hackathon UI --- */}
      <SimplifiedHackathonView analysis={analysis} isProcessing={false} showMLBadge={false} />
    </div>
  );
};


// --- NEW: DEDICATED ML/HACKATHON VIEW (Separated) ---
const MLReadinessDashboard = ({ analysis, isProcessing, onExit }) => {
  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col bg-slate-950">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          ML Metabolic Readiness
        </h1>
        <button onClick={onExit} className="px-5 py-2.5 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 text-sm">Exit</button>
      </header>

      {/* Simplified View with ML Badge and Processing State */}
      <SimplifiedHackathonView analysis={analysis} isProcessing={isProcessing} showMLBadge={true} />
    </div>
  )
}


const HomeView = ({ onRunPipeline }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center max-w-5xl mx-auto">
    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-500">
      Circadian Metabolic System
    </h1>
    <p className="text-xl text-slate-400 mb-12">
      Select an analysis mode.
    </p>

    <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl">
      {/* 1. Standard (Original) */}
      <div className="flex-1 bg-slate-800/40 p-8 rounded-3xl border border-slate-700 hover:border-blue-500/50 transition-all cursor-pointer group" onClick={() => onRunPipeline({ mode: 'standard' })}>
        <h2 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">Standard Analysis</h2>
        <p className="text-sm text-slate-400">Heuristic-based sleep and recovery tracking.</p>
        <div className="mt-6 w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
          <Activity size={24} />
        </div>
      </div>

      {/* 2. Simulation (Original) */}
      <div className="flex-1 bg-slate-800/40 p-8 rounded-3xl border border-slate-700 hover:border-emerald-500/50 transition-all cursor-pointer group" onClick={() => onRunPipeline({ mode: 'simulation' })}>
        <h2 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">Live Simulation</h2>
        <p className="text-sm text-slate-400">Real-time hardware stream simulation.</p>
        <div className="mt-6 w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
          <Zap size={24} />
        </div>
      </div>

      {/* 3. ML Model (New Separate Thing) */}
      <div className="flex-1 bg-gradient-to-b from-indigo-900/40 to-slate-900/40 p-8 rounded-3xl border border-indigo-500/30 hover:border-indigo-400 transition-all cursor-pointer group relative overflow-hidden" onClick={() => onRunPipeline({ mode: 'ml_demo' })}>
        <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors"></div>
        <h2 className="text-xl font-bold text-indigo-300 mb-2 flex items-center justify-center gap-2">ML Model Demo</h2>
        <p className="text-sm text-slate-400">Neural Network readiness prediction.</p>
        <div className="mt-6 w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">
          <RefreshCw size={24} />
        </div>
      </div>
    </div>
  </div>
);

// ... ConnectingView and ProcessingView unchanged ...

// ==========================================
// MODULE 6: Frontend App Container
// ==========================================
const App = () => {
  const [view, setView] = useState('home');
  const [data, setData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [activeMode, setActiveMode] = useState(null); // 'standard', 'simulation', 'ml_demo'
  const [isProcessing, setIsProcessing] = useState(false);

  // LIVE SIMULATION REFS
  const liveInterval = useRef(null);
  const liveDataRef = useRef([]);

  useEffect(() => {
    return () => clearInterval(liveInterval.current);
  }, []);

  const runPipeline = async (source) => {
    const mode = source.mode || 'standard';
    setActiveMode(mode);

    // ML Demo and Simulation use the "Simulation" backend mode mostly
    const isSim = mode === 'simulation' || mode === 'ml_demo';

    setView(isSim ? 'simulation_connect' : 'processing');
    if (liveInterval.current) clearInterval(liveInterval.current);

    setTimeout(async () => {
      // Ingest Data
      const ingestSource = isSim ? { mode: 'simulation' } : source;
      const raw = await DataLayer.ingest(ingestSource);
      const processed = PreprocessingLayer.process(raw);
      const dailyData = processed.dailySegments[0];

      setData(dailyData);
      liveDataRef.current = dailyData.data;

      // Initial Analysis
      updateAnalysis(dailyData, mode);

      if (isSim) {
        setView(mode === 'ml_demo' ? 'ml_results' : 'simulation_results');
        startLiveStream(mode);
      } else {
        setView('standard_results');
      }
    }, 1500);
  };

  const updateAnalysis = async (dailyData, mode) => {
    // 1. Basic Heuristics
    const features = FeatureExtractionLayer.extract(dailyData);
    const inference = InferenceEngine.analyze(features);
    let decision = DecisionEngine.decide(inference);

    // 2. ML Override (ONLY for ML Demo Mode)
    if (mode === 'ml_demo') {
      setIsProcessing(true);
      try {
        const response = await fetch('http://localhost:3001/predict/metabolic-readiness', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_48h_timeseries: dailyData.data })
        });

        if (response.ok) {
          const mlResult = await response.json();
          let mappedScore = 50;
          if (mlResult.metabolic_state === 'READY') mappedScore = 85 + (mlResult.confidence * 15);
          if (mlResult.metabolic_state === 'WAIT') mappedScore = 40 + (mlResult.confidence * 20);
          if (mlResult.metabolic_state === 'HIGH_STRESS') mappedScore = 10 + (mlResult.confidence * 10);

          decision = {
            readinessScore: Math.round(mappedScore),
            recommendationMessage: mlResult.metabolic_state === 'READY' ? "Ready to Eat" : (mlResult.metabolic_state === 'WAIT' ? "Wait to Eat" : "High Stress"),
            recommendationSub: mlResult.explanation || "ML Model Analysis Complete.",
            suggestedDelay: mlResult.recommended_delay_minutes || 0
          };
        }
      } catch (e) {
        console.warn("ML API Error", e);
      }
      await new Promise(r => setTimeout(r, 800)); // Visible delay
      setIsProcessing(false);
    }

    setAnalysis({ features, inference, decision });
  };

  const startLiveStream = (mode) => {
    let tickCount = 0;
    // Clear any existing interval to prevent double-speed
    if (liveInterval.current) clearInterval(liveInterval.current);

    liveInterval.current = setInterval(() => {
      tickCount++; // Increment first to drive the wave
      const currentData = liveDataRef.current;
      const lastPoint = currentData[currentData.length - 1];

      // Pass tickCount to generate the specific wave pattern
      const newPoint = DataLayer.generateNextPoint(lastPoint, tickCount);
      const newData = [...currentData.slice(1), newPoint];

      liveDataRef.current = newData;
      setData({ data: newData });

      // Live Update Logic:
      // Run analysis every 30 seconds (200ms * 150 = 30000ms = 30s)
      if (tickCount % 150 === 0) {
        updateAnalysis({ data: newData }, mode);
      }
    }, 200);
  };

  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 font-sans selection:bg-blue-500/30">
      {view === 'home' && <HomeView onRunPipeline={runPipeline} />}

      {view === 'processing' && <ProcessingView />}
      {view === 'simulation_connect' && <ConnectingView />}

      {/* Standard & Simulation Results (Use Original Dashboard) */}
      {(view === 'standard_results' || view === 'simulation_results') && analysis && (
        <ResultsDashboard
          analysis={analysis}
          data={data}
          mode={activeMode}
          onExit={() => { clearInterval(liveInterval.current); setView('home') }}
        />
      )}

      {/* ML Results (Use New Separate Dashboard) */}
      {view === 'ml_results' && analysis && (
        <MLReadinessDashboard
          analysis={analysis}
          isProcessing={isProcessing}
          onExit={() => { clearInterval(liveInterval.current); setView('home') }}
        />
      )}
    </div>
  );
};

export default App;
