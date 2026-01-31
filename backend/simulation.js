// simulation.js
// Generates realistic simulated physiological data for Internal Phase Mapping

function generateData(hours = 48) {
  const data = [];
  const now = new Date();
  const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
  
  // Simulation parameters
  let sleepState = false;
  
  for (let i = 0; i < hours * 60; i++) { // Minute-by-minute resolution
    const currentTime = new Date(startTime.getTime() + i * 60000);
    const hour = currentTime.getHours();
    
    // Circadian Logic:
    // Sleep usually between 11 PM (23) and 7 AM (7)
    // Deepest sleep (lowest HR) around 3-4 AM
    
    const isNight = hour >= 23 || hour < 7;
    
    // Random variations
    const noise = Math.random() * 5;
    
    let heartRate;
    let lightLux;
    let activity;

    if (isNight) {
      sleepState = true;
      // HR drops during night, nadir around 3-4 AM
      const distFromNadir = Math.abs(hour - 3.5); // 3:30 AM is ideal nadir
      heartRate = 50 + (distFromNadir * 3) + Math.random() * 2;
      lightLux = 0; // Dark room
      activity = 0;
    } else {
      sleepState = false;
      // Active day HR
      heartRate = 70 + (Math.sin(hour) * 10) + noise; 
      // Light varies by day time
      if (hour > 7 && hour < 18) {
          lightLux = 500 + Math.random() * 200; // Daylight
      } else {
          lightLux = 100; // Indoor evening light
      }
      activity = Math.random() * 100;
    }
    
    // Occasional "Wakeup" during night
    if (isNight && Math.random() > 0.98) {
        heartRate += 15;
        activity += 20;
    }

    data.push({
      timestamp: currentTime.toISOString(),
      heart_rate: Math.round(heartRate),
      light_lux: Math.round(lightLux),
      activity: Math.round(activity),
      is_night_window: isNight
    });
  }
  
  return data;
}

module.exports = { generateData };
