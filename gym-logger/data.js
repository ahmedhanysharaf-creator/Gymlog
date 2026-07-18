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
  upperFreeWeight: [
    'Barbell Bench Press',
    'Dumbbell Bench Press',
    'Incline Dumbbell Press',
    'Overhead Press (Barbell)',
    'Dumbbell Shoulder Press',
    'Barbell Bent-Over Row',
    'Dumbbell Row',
    'Barbell Curl',
    'Dumbbell Curl',
    'Skull Crushers',
    'Dumbbell Lateral Raise',
    'Pull-ups',
    'Dips'
  ],
  lowerMachine: [
    'Leg Press',
    'Leg Extension',
    'Leg Curl (Lying / Seated)',
    'Hip Abduction Machine',
    'Hip Adduction Machine',
    'Calf Raise Machine',
    'Smith Machine Squat',
    'Hack Squat Machine',
    'Glute Kickback Machine'
  ],
  lowerFreeWeight: [
    'Barbell Back Squat',
    'Front Squat',
    'Romanian Deadlift',
    'Bulgarian Split Squat',
    'Walking Lunges',
    'Goblet Squat',
    'Sumo Deadlift',
    'Hip Thrust (Barbell)',
    'Calf Raise (Dumbbell)',
    'Step-ups'
  ]
};

/* ---------- In-Memory Cache ---------- */
// Data is loaded from Firestore on login and kept in sync via realtime listeners.
// Reads are instant from cache; writes update both cache and Firestore.

let currentUid = null;
let workoutsCache = [];
let customExercisesCache = {
  upperFreeWeight: [],
  lowerFreeWeight: [],
  upperMachinePush: [],
  upperMachinePull: [],
  upperMachineCore: [],
  lowerMachine: []
};

// Firestore listener unsubscribers
let unsubWorkouts = null;
let unsubCustomExercises = null;

/* ---------- Initialize Data Layer ---------- */

/**
 * Sets up realtime Firestore listeners for the authenticated user.
 * Returns a Promise that resolves once initial data is loaded.
 */
function initDataLayer(uid) {
  return new Promise((resolve) => {
    currentUid = uid;
    let workoutsLoaded = false;
    let customsLoaded = false;

    function checkReady() {
      if (workoutsLoaded && customsLoaded) resolve();
    }

    // Listen to workouts collection
    unsubWorkouts = db.collection('users').doc(uid).collection('workouts')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        workoutsCache = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        workoutsLoaded = true;
        checkReady();

        // Refresh UI if calendar is visible
        if (typeof calendarInstance !== 'undefined' && calendarInstance) {
          calendarInstance.refresh();
        }
      }, err => {
        console.error('Workouts listener error:', err);
        workoutsLoaded = true;
        checkReady();
      });

    // Listen to custom exercises document
    unsubCustomExercises = db.collection('users').doc(uid).collection('settings')
      .doc('customExercises')
      .onSnapshot(doc => {
        if (doc.exists) {
          customExercisesCache = doc.data();
        } else {
          customExercisesCache = {
            upperFreeWeight: [],
            lowerFreeWeight: [],
            upperMachinePush: [],
            upperMachinePull: [],
            upperMachineCore: [],
            lowerMachine: []
          };
        }
        customsLoaded = true;
        checkReady();
      }, err => {
        console.error('Custom exercises listener error:', err);
        customsLoaded = true;
        checkReady();
      });
  });
}

/**
 * Tears down Firestore listeners and clears cache.
 */
function teardownDataLayer() {
  if (unsubWorkouts) { unsubWorkouts(); unsubWorkouts = null; }
  if (unsubCustomExercises) { unsubCustomExercises(); unsubCustomExercises = null; }
  currentUid = null;
  workoutsCache = [];
  customExercisesCache = {
    upperFreeWeight: [],
    lowerFreeWeight: [],
    upperMachinePush: [],
    upperMachinePull: [],
    upperMachineCore: [],
    lowerMachine: []
  };
}

/* ---------- Workout CRUD ---------- */

function getWorkouts() {
  return workoutsCache;
}

function saveWorkout(workout) {
  if (!currentUid) return workout;

  workout.createdAt = new Date().toISOString();

  // Write to Firestore (auto-generates ID)
  const docRef = db.collection('users').doc(currentUid).collection('workouts').doc();
  workout.id = docRef.id;
  docRef.set(workout).catch(err => console.error('Save workout error:', err));

  // Optimistic update to cache
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

  // Delete from Firestore
  db.collection('users').doc(currentUid).collection('workouts')
    .doc(id).delete()
    .catch(err => console.error('Delete workout error:', err));

  // Optimistic update to cache
  workoutsCache = workoutsCache.filter(w => w.id !== id);
}

/* ---------- Custom Exercises ---------- */

function getCustomExercises() {
  return customExercisesCache;
}

function addCustomExercise(key, exerciseName) {
  if (!currentUid) return false;

  const customs = { ...customExercisesCache };
  if (!customs[key]) customs[key] = [];
  const trimmed = exerciseName.trim();

  if (trimmed && !customs[key].includes(trimmed)) {
    customs[key] = [...customs[key], trimmed];
    customExercisesCache = customs;

    // Write to Firestore
    db.collection('users').doc(currentUid).collection('settings')
      .doc('customExercises').set(customs, { merge: true })
      .catch(err => console.error('Add custom exercise error:', err));

    return true;
  }
  return false;
}

/**
 * Returns the storage key for custom exercises based on the current state.
 */
function getCustomKey(bodyPart, equipmentType, category) {
  if (equipmentType === 'freeweight') {
    return bodyPart === 'upper' ? 'upperFreeWeight' : 'lowerFreeWeight';
  }
  if (bodyPart === 'upper') {
    return 'upperMachine' + capitalize(category);
  }
  return 'lowerMachine';
}

/**
 * Returns the combined list of default + custom exercises for the given context.
 */
function getExercises(bodyPart, equipmentType, category) {
  const customs = getCustomExercises();
  let exercises = [];
  let customKey = getCustomKey(bodyPart, equipmentType, category);

  if (bodyPart === 'upper' && equipmentType === 'machine') {
    exercises = [...DEFAULT_EXERCISES.upperMachine[category]];
  } else if (bodyPart === 'upper' && equipmentType === 'freeweight') {
    exercises = [...DEFAULT_EXERCISES.upperFreeWeight];
  } else if (bodyPart === 'lower' && equipmentType === 'machine') {
    exercises = [...DEFAULT_EXERCISES.lowerMachine];
  } else if (bodyPart === 'lower' && equipmentType === 'freeweight') {
    exercises = [...DEFAULT_EXERCISES.lowerFreeWeight];
  }

  if (customs[customKey]) {
    exercises = [...exercises, ...customs[customKey]];
  }

  return exercises;
}

/* ---------- Helpers ---------- */

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
