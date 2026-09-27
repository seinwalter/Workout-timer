// Workout programs. Steady days use `blocks` (minutes, mph, % incline);
// circuits use exercises × rounds with workTime/restTime in seconds.
const PROGRAMS = {
  fightclub: { name: 'Fight Club', days: {
    1: {
        title: "Upper Body KB",
        duration: "25-30 min",
        type: "circuit",
        warmup: ["Arm circles • Shoulder rolls • KB halos", "10 squats • 5 push-ups"],
        exercises: [
            { name: "KB Swings", details: "Focus on hips, powerful movement" },
            { name: "KB Clean & Press", details: "Alt arms each round" },
            { name: "KB Rows", details: "Single arm, alt sides" },
            { name: "Push-ups", details: "Modify as needed" },
            { name: "KB High Pulls", details: "Explosive, full extension" },
            { name: "KB Halos", details: "Slow circles around head, elbows tight" }
        ],
        rounds: 4,
        workTime: 45,
        restTime: 15
    },
    2: {
        title: "HIIT Treadmill (Incline)",
        duration: "30 min",
        type: "circuit",
        exercises: [
            { name: "Hill Push", details: "4.0 mph · 10-12% incline · no handrails", speed: 4.0, grade: 11 }
        ],
        restName: "Recovery",
        restDetails: "3.0 mph · 3% incline · breathe",
        restSpeed: 3.0,
        restGrade: 3,
        blocksBefore: [{ min: 5, name: "Warm-up", speed: 3.2, grade: 2, details: "Easy pace, loosen up" }],
        blocksAfter: [{ min: 5, name: "Cool-down", speed: 2.8, grade: 0, details: "Bring the heart rate down" }],
        rounds: 10,
        workTime: 60,
        restTime: 60
    },
    3: {
        title: "Lower & Core",
        duration: "25-30 min",
        type: "circuit",
        warmup: ["McGill Big 3: curl-up, side plank, bird dog — 3 × 10 s holds each", "Leg swings • Hip circles • Bodyweight squats"],
        exercises: [
            { name: "KB Goblet Squats", details: "Deep position, chest up" },
            { name: "Single-leg Deadlifts", details: "KB opposite hand, balance" },
            { name: "KB Swings", details: "Hip hinge, explosive" },
            { name: "KB Reverse Lunges", details: "Goblet hold, alt legs" },
            { name: "Plank", details: "Progress from knees to full" },
            { name: "KB Figure-8s", details: "Around legs, smooth motion" }
        ],
        rounds: 4,
        workTime: 45,
        restTime: 15
    },
    4: {
        title: "Steady Cardio",
        duration: "45 min",
        type: "steady",
        blocks: [
            { min: 5, name: "Warm-up", speed: 3.2, grade: 1, details: "Easy pace" },
            { min: 10, name: "Build", speed: 3.8, grade: 3, details: "Settle into a steady pace" },
            { min: 10, name: "Climb", speed: 3.8, grade: 5, details: "Nose-breathing effort" },
            { min: 15, name: "Hold", speed: 3.8, grade: 7, details: "Steady · no handrails" },
            { min: 5, name: "Cool-down", speed: 3.0, grade: 2, details: "Bring it down" }
        ]
    },
    5: {
        title: "Full Body",
        duration: "30 min",
        type: "circuit",
        warmup: ["Dynamic full body movements"],
        exercises: [
            { name: "KB Clean & Squat", details: "Explosive, full movement" },
            { name: "Push-ups to T", details: "Rotate to side plank each rep" },
            { name: "KB Single Swing", details: "Alt arms, control" },
            { name: "KB Gorilla Rows", details: "Hinge position, alt arms, flat back" },
            { name: "KB Windmill", details: "Light weight, perfect form" },
            { name: "Mountain Climbers", details: "Fast feet, core tight" }
        ],
        rounds: 5,
        workTime: 40,
        restTime: 20
    },
    6: {
        title: "Active Recovery",
        duration: "50 min",
        type: "steady",
        blocks: [
            { min: 5, name: "Warm-up", speed: 3.0, grade: 1, details: "Easy pace" },
            { min: 40, name: "Brisk Walk", speed: 3.3, grade: 3, details: "Easy effort · mix the incline if you like" },
            { min: 5, name: "Cool-down", speed: 3.0, grade: 0, details: "Bring it down" }
        ]
    },
    7: {
        title: "Rest Day",
        type: "rest",
        message: "Your body grows during rest. Recovery is part of the process.",
        activities: ["Light stretching or yoga", "Meal prep for the week", "Get 8+ hours of quality sleep", "Hydrate and reflect on your progress"]
    }
  }},

  upperlower: { name: 'Upper/Lower', days: {
    1: {
        title: "Incline Walk",
        duration: "45 min",
        type: "steady",
        blocks: [
            { min: 5, name: "Warm-up", speed: 3.2, grade: 2, details: "Easy pace, loosen up" },
            { min: 20, name: "Climb", speed: 3.8, grade: 8, details: "The incline does the fat-burning, not speed" },
            { min: 15, name: "Peak", speed: 3.8, grade: 10, details: "The incline does the work · no handrails" },
            { min: 5, name: "Cool-down", speed: 3.0, grade: 3, details: "Bring it down" }
        ]
    },
    2: {
        title: "Incline Walk",
        duration: "45 min",
        type: "steady",
        blocks: [
            { min: 5, name: "Warm-up", speed: 3.2, grade: 2, details: "Easy pace, loosen up" },
            { min: 20, name: "Climb", speed: 3.8, grade: 8, details: "Low joint stress, high burn" },
            { min: 15, name: "Peak", speed: 3.8, grade: 10, details: "The incline does the work · no handrails" },
            { min: 5, name: "Cool-down", speed: 3.0, grade: 3, details: "Bring it down" }
        ]
    },
    3: {
        title: "Rest Day",
        type: "rest",
        message: "Easy day so the weekend lifts have something to recover on.",
        activities: ["Light stretching or a short stroll", "Protein at every meal — never get ravenous", "Glass of water before eating", "Protect your sleep — it protects the deficit"]
    },
    4: {
        title: "Incline Walk",
        duration: "45 min",
        type: "steady",
        blocks: [
            { min: 5, name: "Warm-up", speed: 3.2, grade: 2, details: "Easy pace, loosen up" },
            { min: 20, name: "Climb", speed: 3.8, grade: 8, details: "Podcast pace — just keep moving" },
            { min: 15, name: "Peak", speed: 3.8, grade: 10, details: "The incline does the work · no handrails" },
            { min: 5, name: "Cool-down", speed: 3.0, grade: 3, details: "Bring it down" }
        ]
    },
    5: {
        title: "Easy Cardio",
        duration: "40 min",
        type: "steady",
        blocks: [
            { min: 5, name: "Warm-up", speed: 3.0, grade: 1, details: "Easy pace" },
            { min: 25, name: "Easy Walk", speed: 3.4, grade: 4, details: "Lighter effort — save legs for the weekend" },
            { min: 10, name: "Mobility", details: "Hips + shoulders, off the treadmill (optional)" }
        ]
    },
    6: {
        title: "Upper (Push + Pull)",
        duration: "~45 min",
        type: "circuit",
        warmup: ["March 2 min • Arm circles • KB halos ×8 each way", "Push-ups ×10 • Dead hang 20 sec"],
        exercises: [
            { name: "KB Overhead Press", details: "Double 25s or single 35 • 8-10 reps, no lean-back" },
            { name: "Pull-Ups", details: "Dead hang start, pull shoulder blades down first • 6-10" },
            { name: "KB Floor/Bench Press", details: "Double 35s or single 50 • 8-12, slow negative" },
            { name: "KB Bent-Over Row", details: "50 lb • 10-12 each side, squeeze at top" },
            { name: "KB Lateral Raise", details: "25 lb • 12-15, lead with the elbow" },
            { name: "KB High Pull", details: "35 lb • 12-15, elbows lead to collarbone" },
            { name: "Push-Ups", details: "AMRAP — chest to floor, full range" },
            { name: "KB Shrugs", details: "Heavy • 15-20, hold 1 sec at top" }
        ],
        rounds: 4,
        workTime: 40,
        restTime: 40,
        finisher: ["2-3 rounds, minimal rest:", "KB Lateral Raise — 20 reps", "KB Curls — 25/35 • 12-15 reps", "Bench Dips — max reps"],
        cooldown: ["Doorway chest stretch • Cross-body shoulder stretch", "Overhead lat/tricep stretch • Deep breathing"]
    },
    7: {
        title: "Lower (Back-Friendly)",
        duration: "~45 min",
        type: "circuit",
        warmup: ["McGill Big 3: curl-up, side plank, bird dog — 3 × 10 s holds each", "March 2 min • Bodyweight squats ×15 • Leg swings ×10", "Glute bridges ×15 • Cat-cow ×10 — wake the spine up"],
        exercises: [
            { name: "KB Goblet Squat", details: "35/50 • 12-15, chest up, full depth" },
            { name: "KB Reverse Lunge", details: "35 goblet • 10-12 each leg, knee over ankle" },
            { name: "KB Swing", details: "35/50 • 15-20 — hip snap powers it, NOT the low back" },
            { name: "Bulgarian Split Squat", details: "Rear foot on bench • 8-12 each leg, torso upright" },
            { name: "Single-Leg RDL", details: "35 • 10-12 each leg, hinge at hip, flat back" },
            { name: "Goblet Pulse / Wall Sit", details: "Bottom-third pulses ×15 or 45 sec hold" },
            { name: "Calf Raises", details: "50 held • 20-25, full stretch, squeeze at top" }
        ],
        rounds: 4,
        workTime: 40,
        restTime: 50,
        finisher: ["2-3 rounds, minimal rest:", "KB Swings — 35 • 20 reps", "Jump squats or fast goblet squats — 15", "Glute bridge hold — 30 sec"],
        cooldown: ["Hamstring • quad • hip flexor stretches", "Child's pose — ease in, respect the back"]
    }
  }},

  home45: { name: 'Home 45', days: {
    1: {
        title: "Full Body 45",
        duration: "45 min",
        type: "circuit",
        warmup: ["Jumping jacks 1 min • Arm circles", "10 squats • 5 push-ups • KB halos"],
        exercises: [
            { name: "KB Swings", details: "Hip snap, flat back" },
            { name: "KB Goblet Squat", details: "Full depth, chest up" },
            { name: "Push-Ups", details: "Chest to floor" },
            { name: "KB Bent-Over Row", details: "Alt arms each round" },
            { name: "KB Clean & Press", details: "Alt arms, explosive" },
            { name: "KB Reverse Lunge", details: "Alt legs, goblet hold" },
            { name: "Plank", details: "Straight line, tight core" },
            { name: "Mountain Climbers", details: "Fast feet" }
        ],
        rounds: 5,
        workTime: 40,
        restTime: 20,
        cooldown: ["Full body stretch • Deep breathing"]
    },
    2: {
        title: "Easy Walk + Mobility",
        duration: "35 min",
        type: "steady",
        blocks: [
            { min: 25, name: "Easy Walk", speed: 3.2, grade: 0, details: "Easy pace · outside is fine" },
            { min: 10, name: "Mobility", details: "Hips + shoulders" }
        ]
    },
    3: {
        title: "Full Body 45",
        duration: "45 min",
        type: "circuit",
        warmup: ["Jumping jacks 1 min • Arm circles", "10 squats • 5 push-ups • KB halos"],
        exercises: [
            { name: "KB Swings", details: "Hip snap, flat back" },
            { name: "KB Goblet Squat", details: "Full depth, chest up" },
            { name: "Push-Ups", details: "Chest to floor" },
            { name: "KB Bent-Over Row", details: "Alt arms each round" },
            { name: "KB Clean & Press", details: "Alt arms, explosive" },
            { name: "KB Reverse Lunge", details: "Alt legs, goblet hold" },
            { name: "Plank", details: "Straight line, tight core" },
            { name: "Mountain Climbers", details: "Fast feet" }
        ],
        rounds: 5,
        workTime: 40,
        restTime: 20,
        cooldown: ["Full body stretch • Deep breathing"]
    },
    4: {
        title: "Easy Walk + Mobility",
        duration: "35 min",
        type: "steady",
        blocks: [
            { min: 25, name: "Easy Walk", speed: 3.2, grade: 0, details: "Easy pace · outside is fine" },
            { min: 10, name: "Mobility", details: "Hips + shoulders" }
        ]
    },
    5: {
        title: "Full Body 45",
        duration: "45 min",
        type: "circuit",
        warmup: ["Jumping jacks 1 min • Arm circles", "10 squats • 5 push-ups • KB halos"],
        exercises: [
            { name: "KB Swings", details: "Hip snap, flat back" },
            { name: "KB Goblet Squat", details: "Full depth, chest up" },
            { name: "Push-Ups", details: "Chest to floor" },
            { name: "KB Bent-Over Row", details: "Alt arms each round" },
            { name: "KB Clean & Press", details: "Alt arms, explosive" },
            { name: "KB Reverse Lunge", details: "Alt legs, goblet hold" },
            { name: "Plank", details: "Straight line, tight core" },
            { name: "Mountain Climbers", details: "Fast feet" }
        ],
        rounds: 5,
        workTime: 40,
        restTime: 20,
        cooldown: ["Full body stretch • Deep breathing"]
    },
    6: {
        title: "Active Recovery",
        duration: "45 min",
        type: "steady",
        blocks: [
            { min: 35, name: "Brisk Walk", speed: 3.4, grade: 0, details: "Easy effort, enjoy the movement" },
            { min: 10, name: "Stretch", details: "Anything tight from the week" }
        ]
    },
    7: {
        title: "Rest Day",
        type: "rest",
        message: "Your body grows during rest. Recovery is part of the process.",
        activities: ["Light stretching or yoga", "Meal prep for the week", "Get 8+ hours of quality sleep", "Hydrate and reflect on your progress"]
    }
  }}
};

if (typeof module !== 'undefined' && module.exports) module.exports = { PROGRAMS };
