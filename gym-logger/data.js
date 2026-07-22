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
  lowerMachineAdductors: [], lowerMachineCalves: [],
  lowerFreeWeightQuads: [], lowerFreeWeightHamstrings: [], lowerFreeWeightGlutes: [],
  lowerFreeWeightAdductors: [], lowerFreeWeightCalves: []
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
    lowerMachineAdductors: [], lowerMachineCalves: [],
    lowerFreeWeightQuads: [], lowerFreeWeightHamstrings: [], lowerFreeWeightGlutes: [],
    lowerFreeWeightAdductors: [], lowerFreeWeightCalves: []
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
