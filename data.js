/* ============================================
   GymLog — Exercise Database & Cloud Storage
   ============================================ */

const DEFAULT_EXERCISES = {
  upperMachine: {
    push: [
      'Chest Press Machine',
      'Shoulder Press Machine',
      'Pec Fly Machine',
      'Tricep Pushdown (Cable)',
      'Assisted Dip Machine',
      'Cable Lateral Raise'
    ],
    pull: [
      'Lat Pulldown Machine',
      'Seated Cable Row',
      'Reverse Fly Machine (Rear Delt)',
      'Bicep Curl Machine',
      'Cable Face Pull',
      'Assisted Pull-up Machine'
    ],
    core: [
      'Ab Crunch Machine',
      'Cable Woodchop',
      'Rotary Torso Machine',
      'Cable Pallof Press'
    ]
  },
  upperFreeWeight: {
    push: [
      'Barbell Bench Press',
      'Dumbbell Bench Press',
      'Incline Barbell Press',
      'Incline Dumbbell Press',
      'Decline Bench Press',
      'Overhead Press (Barbell)',
      'Dumbbell Shoulder Press',
      'Arnold Press',
      'Close-Grip Bench Press',
      'Skull Crushers',
      'Dips',
      'Dumbbell Fly',
      'Dumbbell Lateral Raise',
      'Front Raise'
    ],
    pull: [
      'Barbell Bent-Over Row',
      'Dumbbell Row',
      'Pull-ups',
      'Chin-ups',
      'Barbell Curl',
      'Dumbbell Curl',
      'Hammer Curl',
      'Concentration Curl',
      'Preacher Curl (Barbell)',
      'Barbell Shrug',
      'Dumbbell Pullover',
      'Dumbbell Rear Delt Fly'
    ],
    core: [
      'Weighted Plank',
      'Dumbbell Side Bend',
      'Russian Twist (Dumbbell)',
      'Hanging Leg Raise',
      'Ab Wheel Rollout',
      'Decline Sit-up'
    ]
  },
  lowerMachine: {
    quads: [
      'Leg Press',
      'Leg Extension',
      'Hack Squat Machine',
      'Smith Machine Squat',
      'Sissy Squat Machine'
    ],
    hamstrings: [
      'Leg Curl (Lying)',
      'Leg Curl (Seated)',
      'Nordic Curl Machine'
    ],
    glutes: [
      'Glute Kickback Machine',
      'Hip Thrust (Machine)',
      'Smith Machine Hip Thrust'
    ],
    adductors: [
      'Hip Adduction Machine',
      'Hip Abduction Machine',
      'Cable Hip Adduction'
    ],
    calves: [
      'Calf Raise Machine',
      'Seated Calf Raise Machine',
      'Donkey Calf Raise'
    ],
    sprinting: [
      'Treadmill Sprints',
      'Curved Treadmill Max Sprints',
      'Assault / Fan Bike Sprints',
      'Sled Push Sprints',
      'Sled Pull Sprints'
    ]
  },
  lowerFreeWeight: {
    quads: [
      'Barbell Back Squat',
      'Front Squat',
      'Goblet Squat',
      'Bulgarian Split Squat',
      'Walking Lunges',
      'Reverse Lunges',
      'Step-ups'
    ],
    hamstrings: [
      'Romanian Deadlift',
      'Sumo Deadlift',
      'Conventional Deadlift',
      'Nordic Curl',
      'Good Mornings',
      'Single-Leg RDL'
    ],
    glutes: [
      'Hip Thrust (Barbell)',
      'Hip Thrust (Dumbbell)',
      'Cable Kickback',
      'Sumo Squat',
      'Frog Pumps'
    ],
    adductors: [
      'Wide-Stance Squat',
      'Cable Hip Adduction',
      'Lateral Lunge'
    ],
    calves: [
      'Standing Calf Raise (Barbell)',
      'Standing Calf Raise (Dumbbell)',
      'Seated Calf Raise',
      'Single-Leg Calf Raise'
    ],
    sprinting: [
      '100m Flat Sprints',
      '200m Flat Sprints',
      '400m Sprints',
      'Hill Sprints',
      'Flying 30m Speed Sprints',
      'Shuttle Runs / Suicides',
      'Interval Sprints (HIIT)',
      'Banded / Resistance Sprints',
      'Single Leg Bounds & Sprint Drills'
    ]
  }
};

/* ---------- Default Warmup Activities ---------- */
const DEFAULT_WARMUP_ACTIVITIES = [
  { icon: '🚲', name: 'Cycling' },
  { icon: '🏃', name: 'Treadmill' },
  { icon: '🚶', name: 'Elliptical' },
  { icon: '🧘', name: 'Dynamic Stretching' },
  { icon: '🚣', name: 'Rowing' },
  { icon: '🏊', name: 'Swimming' }
];

/* ---------- In-Memory Cache ---------- */
let currentUid = null;
let workoutsCache = [];
let customExercisesCache = {
  upperMachinePush: [], upperMachinePull: [], upperMachineCore: [],
  upperFreeWeightPush: [], upperFreeWeightPull: [], upperFreeWeightCore: [],
  lowerMachineQuads: [], lowerMachineHamstrings: [], lowerMachineGlutes: [],
  lowerMachineAdductors: [], lowerMachineCalves: [], lowerMachineSprinting: [],
  lowerFreeWeightQuads: [], lowerFreeWeightHamstrings: [], lowerFreeWeightGlutes: [],
  lowerFreeWeightAdductors: [], lowerFreeWeightCalves: [], lowerFreeWeightSprinting: []
};
let customWarmupsCache = [];

let unsubWorkouts = null;
let unsubCustomExercises = null;
let unsubCustomWarmups = null;

/* ---------- Initialize Data Layer ---------- */
function initDataLayer(uid) {
  return new Promise((resolve) => {
    currentUid = uid;
    let workoutsLoaded = false;
    let customsLoaded = false;
    let warmupsLoaded = false;

    function checkReady() {
      if (workoutsLoaded && customsLoaded && warmupsLoaded) resolve();
    }

    unsubWorkouts = db.collection('users').doc(uid).collection('workouts')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        workoutsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        workoutsLoaded = true;
        checkReady();
        if (typeof calendarInstance !== 'undefined' && calendarInstance) {
          calendarInstance.refresh();
        }
      }, err => {
        console.error('Workouts listener error:', err);
        workoutsLoaded = true;
        checkReady();
      });

    unsubCustomExercises = db.collection('users').doc(uid).collection('settings')
      .doc('customExercises')
      .onSnapshot(doc => {
        if (doc.exists) {
          customExercisesCache = { ...customExercisesCache, ...doc.data() };
        }
        customsLoaded = true;
        checkReady();
      }, err => {
        console.error('Custom exercises listener error:', err);
        customsLoaded = true;
        checkReady();
      });

    unsubCustomWarmups = db.collection('users').doc(uid).collection('settings')
      .doc('customWarmups')
      .onSnapshot(doc => {
        customWarmupsCache = doc.exists ? (doc.data().activities || []) : [];
        warmupsLoaded = true;
        checkReady();
      }, err => {
        console.error('Custom warmups listener error:', err);
        warmupsLoaded = true;
        checkReady();
      });
  });
}

function teardownDataLayer() {
  if (unsubWorkouts) { unsubWorkouts(); unsubWorkouts = null; }
  if (unsubCustomExercises) { unsubCustomExercises(); unsubCustomExercises = null; }
  if (unsubCustomWarmups) { unsubCustomWarmups(); unsubCustomWarmups = null; }
  currentUid = null;
  workoutsCache = [];
  customWarmupsCache = [];
  customExercisesCache = {
    upperMachinePush: [], upperMachinePull: [], upperMachineCore: [],
    upperFreeWeightPush: [], upperFreeWeightPull: [], upperFreeWeightCore: [],
    lowerMachineQuads: [], lowerMachineHamstrings: [], lowerMachineGlutes: [],
    lowerMachineAdductors: [], lowerMachineCalves: [], lowerMachineSprinting: [],
    lowerFreeWeightQuads: [], lowerFreeWeightHamstrings: [], lowerFreeWeightGlutes: [],
    lowerFreeWeightAdductors: [], lowerFreeWeightCalves: [], lowerFreeWeightSprinting: []
  };
}

/* ---------- Workout CRUD ---------- */
function getWorkouts() { return workoutsCache; }

function saveWorkout(workout) {
  if (!currentUid) return workout;
  workout.createdAt = new Date().toISOString();
  const docRef = db.collection('users').doc(currentUid).collection('workouts').doc();
  workout.id = docRef.id;
  docRef.set(workout).catch(err => console.error('Save workout error:', err));
  workoutsCache.unshift(workout);
  return workout;
}

function getWorkoutsByDate(dateStr) {
  return workoutsCache.filter(w => w.date === dateStr);
}

function getWorkoutDates() {
  return [...new Set(workoutsCache.map(w => w.date))];
}

function updateWorkout(id, updatedData) {
  if (!currentUid || !id) return;
  updatedData.updatedAt = new Date().toISOString();
  db.collection('users').doc(currentUid).collection('workouts')
    .doc(id).set(updatedData, { merge: true })
    .catch(err => console.error('Update workout error:', err));

  const idx = workoutsCache.findIndex(w => w.id === id);
  if (idx !== -1) {
    workoutsCache[idx] = { ...workoutsCache[idx], ...updatedData };
  }
}

function deleteWorkout(id) {
  if (!currentUid) return;
  db.collection('users').doc(currentUid).collection('workouts')
    .doc(id).delete()
    .catch(err => console.error('Delete workout error:', err));
  workoutsCache = workoutsCache.filter(w => w.id !== id);
}

/* ---------- Custom Exercises ---------- */
function getCustomExercises() { return customExercisesCache; }

function addCustomExercise(key, exerciseName) {
  if (!currentUid) return false;
  const customs = { ...customExercisesCache };
  if (!customs[key]) customs[key] = [];
  const trimmed = exerciseName.trim();
  if (trimmed && !customs[key].includes(trimmed)) {
    customs[key] = [...customs[key], trimmed];
    customExercisesCache = customs;
    db.collection('users').doc(currentUid).collection('settings')
      .doc('customExercises').set(customs, { merge: true })
      .catch(err => console.error('Add custom exercise error:', err));
    return true;
  }
  return false;
}

function deleteCustomExercise(key, exerciseName) {
  if (!currentUid) return false;
  const customs = { ...customExercisesCache };
  if (!customs[key]) return false;
  customs[key] = customs[key].filter(ex => ex !== exerciseName);
  customExercisesCache = customs;
  db.collection('users').doc(currentUid).collection('settings')
    .doc('customExercises').set(customs, { merge: true })
    .catch(err => console.error('Delete custom exercise error:', err));
  return true;
}

function editCustomExercise(oldKey, oldName, newKey, newName) {
  if (!currentUid) return false;
  const customs = { ...customExercisesCache };
  const trimmedNew = newName.trim();
  if (!trimmedNew) return false;

  if (oldKey === newKey) {
    if (!customs[oldKey]) return false;
    const idx = customs[oldKey].indexOf(oldName);
    if (idx !== -1) {
      customs[oldKey][idx] = trimmedNew;
      customExercisesCache = customs;
      db.collection('users').doc(currentUid).collection('settings')
        .doc('customExercises').set(customs, { merge: true })
        .catch(err => console.error('Edit custom exercise error:', err));
      return true;
    }
    return false;
  } else {
    if (customs[oldKey]) {
      customs[oldKey] = customs[oldKey].filter(ex => ex !== oldName);
    }
    if (!customs[newKey]) customs[newKey] = [];
    if (!customs[newKey].includes(trimmedNew)) {
      customs[newKey].push(trimmedNew);
    }
    customExercisesCache = customs;
    db.collection('users').doc(currentUid).collection('settings')
      .doc('customExercises').set(customs, { merge: true })
      .catch(err => console.error('Move custom exercise error:', err));
    return true;
  }
}

function getCustomKey(bodyPart, equipmentType, category) {
  const equip = equipmentType === 'machine' ? 'Machine' : 'FreeWeight';
  const cat = capitalize(category || '');
  return bodyPart === 'upper' ? `upper${equip}${cat}` : `lower${equip}${cat}`;
}

function getExercises(bodyPart, equipmentType, category) {
  const customs = getCustomExercises();
  const customKey = getCustomKey(bodyPart, equipmentType, category);
  let exercises = [];

  if (bodyPart === 'upper' && equipmentType === 'machine') {
    exercises = [...(DEFAULT_EXERCISES.upperMachine[category] || [])];
  } else if (bodyPart === 'upper' && equipmentType === 'freeweight') {
    exercises = [...(DEFAULT_EXERCISES.upperFreeWeight[category] || [])];
  } else if (bodyPart === 'lower' && equipmentType === 'machine') {
    exercises = [...(DEFAULT_EXERCISES.lowerMachine[category] || [])];
  } else if (bodyPart === 'lower' && equipmentType === 'freeweight') {
    exercises = [...(DEFAULT_EXERCISES.lowerFreeWeight[category] || [])];
  }

  if (customs[customKey]) exercises = [...exercises, ...customs[customKey]];
  return exercises;
}

/* ---------- Custom Warmups ---------- */
function getCustomWarmups() { return customWarmupsCache; }

function addCustomWarmup(activity) {
  if (!currentUid) return false;
  const trimmed = activity.trim();
  if (!trimmed || customWarmupsCache.includes(trimmed)) return false;
  customWarmupsCache = [...customWarmupsCache, trimmed];
  db.collection('users').doc(currentUid).collection('settings')
    .doc('customWarmups').set({ activities: customWarmupsCache })
    .catch(err => console.error('Add custom warmup error:', err));
  return true;
}

/* ---------- Helpers ---------- */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ---------- Data Export & Import ---------- */
function exportDataToJson() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userUid: currentUid,
    workouts: workoutsCache,
    customExercises: customExercisesCache,
    customWarmups: customWarmupsCache
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = getTodayStr();
  a.download = `gymlog_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importDataFromJson(jsonObj) {
  if (!currentUid) throw new Error("User must be signed in to import data.");
  if (!jsonObj || !Array.isArray(jsonObj.workouts)) {
    throw new Error("Invalid backup file. Workout data array missing.");
  }
  
  let count = 0;
  const workoutsColl = db.collection('users').doc(currentUid).collection('workouts');
  
  // Save workouts to Firestore
  for (const w of jsonObj.workouts) {
    if (!w.date || !w.exercise) continue;
    const docId = w.id || generateId();
    const cleanWorkout = { ...w, id: docId, updatedAt: new Date().toISOString() };
    await workoutsColl.doc(docId).set(cleanWorkout, { merge: true });
    count++;
  }

  // Save custom exercises if present
  if (jsonObj.customExercises && typeof jsonObj.customExercises === 'object') {
    const custRef = db.collection('users').doc(currentUid).collection('settings').doc('customExercises');
    await custRef.set(jsonObj.customExercises, { merge: true });
  }

  // Save custom warmups if present
  if (Array.isArray(jsonObj.customWarmups)) {
    const warmRef = db.collection('users').doc(currentUid).collection('settings').doc('customWarmups');
    await warmRef.set({ activities: jsonObj.customWarmups }, { merge: true });
  }

  return count;
}

/* ---------- AI Training Export & Analysis Report Generation ---------- */

function getPeriodRange(period, customStart = null, customEnd = null) {
  const now = new Date();
  let startDate = '';
  let endDate = '';
  let label = '';

  const toIso = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (period === 'week') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = d.getDay(); // 0 is Sunday
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    startDate = toIso(start);
    endDate = toIso(end);
    label = 'This Week';
  } else if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    startDate = toIso(start);
    endDate = toIso(end);
    label = 'This Month';
  } else if (period === 'all') {
    const dates = workoutsCache.map(w => w.date).filter(Boolean).sort();
    startDate = dates.length > 0 ? dates[0] : toIso(now);
    endDate = dates.length > 0 ? dates[dates.length - 1] : toIso(now);
    label = 'All Time';
  } else if (period === 'custom') {
    startDate = customStart || toIso(new Date(now.getTime() - 30 * 86400000));
    endDate = customEnd || toIso(now);
    label = `Custom Range`;
  }

  return { startDate, endDate, label, period };
}

function getWorkoutsForPeriod(period, customStart = null, customEnd = null) {
  const range = getPeriodRange(period, customStart, customEnd);
  const filtered = workoutsCache.filter(w => {
    if (!w.date) return false;
    if (period === 'all') return true;
    return w.date >= range.startDate && w.date <= range.endDate;
  });

  // Sort chronologically ascending (oldest to newest for progressive overload tracking)
  filtered.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
  return { ...range, workouts: filtered };
}

function generateAiTrainingReport(workouts, rangeInfo, athleteName = 'Athlete') {
  let totalWorkingSets = 0;
  let totalWarmupSets = 0;
  let totalVolumeKg = 0;
  let maxWeight = { weight: 0, exercise: 'None' };
  let highStrainSets = [];
  const exerciseSetCounts = {};
  const categorySetCounts = {};
  const bodyPartCounts = { upper: 0, lower: 0, warmup: 0 };
  const equipmentCounts = { machine: 0, freeweight: 0, cardio: 0 };

  workouts.forEach(w => {
    const bp = w.bodyPart || 'other';
    if (bodyPartCounts[bp] !== undefined) bodyPartCounts[bp]++;
    else bodyPartCounts[bp] = (bodyPartCounts[bp] || 0) + 1;

    const eq = w.equipmentType || 'other';
    if (equipmentCounts[eq] !== undefined) equipmentCounts[eq]++;

    if (w.warmupSets && Array.isArray(w.warmupSets)) {
      totalWarmupSets += w.warmupSets.length;
    }

    if (w.sets && Array.isArray(w.sets)) {
      w.sets.forEach((s, idx) => {
        totalWorkingSets++;
        const weight = parseFloat(s.weight) || 0;
        const reps = parseInt(s.reps, 10) || 0;
        if (weight > 0 && reps > 0) {
          totalVolumeKg += weight * reps;
          if (weight > maxWeight.weight) {
            maxWeight = { weight, exercise: w.exercise || 'Unknown' };
          }
        }

        const pain = parseInt(s.painLevel, 10) || 7;
        if (pain >= 8) {
          highStrainSets.push({
            date: w.date,
            exercise: w.exercise || 'Unnamed Exercise',
            setNum: idx + 1,
            pain,
            weight,
            reps
          });
        }

        const exName = w.exercise || 'General Session';
        exerciseSetCounts[exName] = (exerciseSetCounts[exName] || 0) + 1;

        const cat = w.category || (w.bodyPart === 'warmup' ? 'Warm-up / Cardio' : 'General');
        categorySetCounts[cat] = (categorySetCounts[cat] || 0) + 1;
      });
    }
  });

  const uniqueDays = [...new Set(workouts.map(w => w.date))].length;

  let md = `# 🏋️ ATHLETE TRAINING & PERFORMANCE REPORT (FOR AI ANALYSIS)\n\n`;
  md += `**Athlete / Account:** ${athleteName}\n`;
  md += `**Analysis Period:** ${rangeInfo.label} (${rangeInfo.startDate} to ${rangeInfo.endDate})\n`;
  md += `**Export Generated:** ${new Date().toLocaleString()}\n`;
  md += `**Source:** GymLog Workout Tracker\n\n`;

  md += `---\n\n`;
  md += `## 🎯 SYSTEM PROMPT FOR THE AI COACH / ANALYZER\n`;
  md += `> You are an elite Strength & Conditioning Coach, Sports Scientist, and Biomechanics Specialist.\n`;
  md += `> Analyze the athlete's verified workout log below and provide a structured, in-depth evaluation covering:\n`;
  md += `> 1. **Volume & Frequency**: Evaluate volume load (${totalVolumeKg.toLocaleString()} kg, ${totalWorkingSets} working sets across ${uniqueDays} training days). Are muscle group weekly sets within optimal MEV to MRV?\n`;
  md += `> 2. **Progressive Overload & Intensity**: Evaluate loads, rep ranges, intensity distribution, and progression across sessions.\n`;
  md += `> 3. **Fatigue & Injury Prevention**: Assess logged strain ratings (scale 1-10: 1-4 Low Effort, 5-6 Moderate, 7-8 Optimal training stimulus, 9-10 High Strain/Fatigue Risk). Highlight potential injury or overtraining flags.\n`;
  md += `> 4. **Structural & Muscle Balance**: Review Push vs Pull ratios, Upper vs Lower distribution, and any neglected muscle groups.\n`;
  md += `> 5. **Prioritized Action Plan**: Provide 3 to 5 clear, actionable recommendations for their next mesocycle.\n\n`;

  md += `---\n\n`;
  md += `## 📊 SUMMARY OVERVIEW\n`;
  md += `- **Active Training Days:** ${uniqueDays} days\n`;
  md += `- **Total Workout Entries:** ${workouts.length} entries\n`;
  md += `- **Total Working Sets:** ${totalWorkingSets} sets\n`;
  md += `- **Total Warm-up Sets:** ${totalWarmupSets} sets\n`;
  md += `- **Total Volume Load:** ${totalVolumeKg.toLocaleString()} kg\n`;
  md += `- **Heaviest Lift Recorded:** ${maxWeight.weight > 0 ? `${maxWeight.weight} kg (${maxWeight.exercise})` : 'N/A'}\n`;
  md += `- **High Strain Sets (>= 8/10):** ${highStrainSets.length} sets flagged\n\n`;

  md += `### Session Breakdown by Type:\n`;
  md += `- **Upper Body:** ${bodyPartCounts.upper || 0} exercises/entries\n`;
  md += `- **Lower Body:** ${bodyPartCounts.lower || 0} exercises/entries\n`;
  md += `- **Warm-up & Cardio:** ${bodyPartCounts.warmup || 0} sessions\n\n`;

  md += `### Sets Logged by Muscle Group / Category:\n`;
  const catEntries = Object.entries(categorySetCounts);
  if (catEntries.length > 0) {
    catEntries.forEach(([cat, count]) => {
      md += `- **${capitalize(cat)}**: ${count} working sets\n`;
    });
  } else {
    md += `- *No working sets logged.*\n`;
  }
  md += `\n`;

  if (highStrainSets.length > 0) {
    md += `### ⚠️ Flagged High Effort / Strain Sets:\n`;
    highStrainSets.forEach(h => {
      md += `- **${h.date}** | ${h.exercise} (Set ${h.setNum}): ${h.weight} kg × ${h.reps} reps | Strain: **${h.pain}/10**\n`;
    });
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## 📅 CHRONOLOGICAL WORKOUT LOG\n\n`;

  if (workouts.length === 0) {
    md += `*No workouts recorded during this time period.*\n`;
    return md;
  }

  // Group workouts by date
  const groupedByDate = {};
  workouts.forEach(w => {
    if (!groupedByDate[w.date]) groupedByDate[w.date] = [];
    groupedByDate[w.date].push(w);
  });

  let dayIdx = 1;
  for (const [dateStr, dayWorkouts] of Object.entries(groupedByDate)) {
    md += `### 🗓️ Day ${dayIdx}: ${dateStr} (${formatDate(dateStr)})\n`;

    dayWorkouts.forEach((w, exIdx) => {
      const isWarmup = w.bodyPart === 'warmup';
      const isSprint = w.category === 'sprinting';

      if (isWarmup) {
        md += `#### ${exIdx + 1}. General Warm-up / Cardio\n`;
        if (w.details) md += `- **Routine / Notes:** ${w.details}\n`;
        md += `\n`;
        return;
      }

      const bodyPartStr = w.bodyPart ? capitalize(w.bodyPart) : 'General';
      const equipStr = w.equipmentType === 'machine' ? 'Machine' : 'Free Weight';
      const catStr = w.category ? capitalize(w.category) : '';

      md += `#### ${exIdx + 1}. ${w.exercise || 'Exercise'}\n`;
      md += `- **Classification:** ${bodyPartStr} | ${equipStr}${catStr ? ` | ${catStr}` : ''}\n`;
      if (w.attachment) md += `- **Attachment / Grip:** ${w.attachment}\n`;

      if (w.warmupSets && w.warmupSets.length > 0) {
        md += `- **Warm-up Sets:**\n`;
        w.warmupSets.forEach((ws, wi) => {
          md += `  - Warmup ${wi + 1}: ${ws.weight || 0} kg × ${ws.reps || 0} reps\n`;
        });
      }

      if (w.sets && w.sets.length > 0) {
        md += `- **Working Sets:**\n`;
        let exVolume = 0;
        w.sets.forEach((s, si) => {
          const painVal = parseInt(s.painLevel, 10) || 7;
          let strainLabel = 'Optimal';
          if (painVal <= 4) strainLabel = 'Low effort';
          else if (painVal <= 6) strainLabel = 'Moderate';
          else if (painVal >= 9) strainLabel = 'High strain';

          if (isSprint) {
            md += `  - Set ${si + 1}: Distance: ${s.distance || 0}m | Time: ${s.time || 0}s | Load: ${s.weight || 0}kg | Strain: ${painVal}/10 (${strainLabel})\n`;
          } else {
            const wt = parseFloat(s.weight) || 0;
            const rp = parseInt(s.reps, 10) || 0;
            const vol = wt * rp;
            exVolume += vol;
            md += `  - Set ${si + 1}: ${wt} kg × ${rp} reps | Volume: ${vol.toLocaleString()} kg | Strain: ${painVal}/10 (${strainLabel})\n`;
          }
        });
        if (!isSprint && exVolume > 0) {
          md += `  - **Exercise Total Volume:** ${exVolume.toLocaleString()} kg\n`;
        }
      }
      md += `\n`;
    });

    dayIdx++;
  }

  return md;
}

function downloadAiReportFile(filename, content, format = 'md') {
  const mimeType = format === 'txt' ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

