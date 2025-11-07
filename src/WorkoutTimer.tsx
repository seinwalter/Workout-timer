import React, { useState, useEffect } from 'react';
import { Timer, RotateCcw, SkipForward } from 'lucide-react';

const WorkoutTimer = () => {
  const [workoutType, setWorkoutType] = useState<'beach' | 'back'>('beach');
  const [currentExercise, setCurrentExercise] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [workoutStyle, setWorkoutStyle] = useState<'circuit' | 'individual'>('circuit');

  const workouts = {
    beach: [
      { name: 'Banded Push-Ups', reps: '12-15', band: '45lb', rest: 45 },
      { name: 'Standing Band Flyes', reps: '15', band: '35lb', rest: 45 },
      { name: 'Overhead Press', reps: '12-15', band: '45lb', rest: 45 },
      { name: 'Lateral Raises', reps: '15 each', band: '25lb', rest: 45 },
      { name: 'Bicep Curls', reps: '12-15', band: '45lb', rest: 45 },
      { name: 'Hammer Curls', reps: '12 each', band: '35lb', rest: 45 },
      { name: 'Tricep Extensions', reps: '15', band: '45lb', rest: 45 },
      { name: 'Tricep Pushdowns', reps: '15', band: '55lb', rest: 60 }
    ],
    back: [
      { name: 'Band-Assisted Pull-Ups', reps: '8-10', band: '65lb', rest: 60 },
      { name: 'Standing Lat Pulldowns', reps: '12-15', band: '55lb', rest: 45 },
      { name: 'Band Rows', reps: '15', band: '45lb', rest: 45 },
      { name: 'Face Pulls', reps: '15', band: '35lb', rest: 45 },
      { name: 'Band Squats', reps: '15', band: '65lb', rest: 60 },
      { name: 'Split Squats', reps: '12 each', band: '45lb', rest: 45 },
      { name: 'Romanian Deadlifts', reps: '12-15', band: '55lb', rest: 45 },
      { name: 'Calf Raises', reps: '20', band: '75lb', rest: 60 }
    ]
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(seconds => {
          if (seconds === 0) {
            if (isResting) {
              setIsResting(false);
              if (workoutStyle === 'circuit') {
                if (currentExercise === workouts[workoutType].length - 1) {
                  if (currentRound === 4) {
                    setIsActive(false);
                    return 0;
                  }
                  setCurrentRound(curr => curr + 1);
                  setCurrentExercise(0);
                } else {
                  setCurrentExercise(curr => curr + 1);
                }
              } else {
                if (currentRound === 4) {
                  if (currentExercise === workouts[workoutType].length - 1) {
                    setIsActive(false);
                    return 0;
                  }
                  setCurrentRound(1);
                  setCurrentExercise(curr => curr + 1);
                } else {
                  setCurrentRound(curr => curr + 1);
                }
              }
            } else {
              setIsResting(true);
              return workouts[workoutType][currentExercise].rest;
            }
            return 0;
          }
          return seconds - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds, currentExercise, currentRound, isResting, workoutType, workoutStyle]);

  const toggleTimer = () => {
    if (!isActive) {
      setSeconds(0);
      setCurrentExercise(0);
      setCurrentRound(1);
      setIsResting(false);
    }
    setIsActive(!isActive);
  };

  const resetWorkout = () => {
    setIsActive(false);
    setSeconds(0);
    setCurrentExercise(0);
    setCurrentRound(1);
    setIsResting(false);
  };

  const nextExercise = () => {
    if (workoutStyle === 'circuit') {
      if (currentExercise === workouts[workoutType].length - 1) {
        if (currentRound === 4) {
          resetWorkout();
        } else {
          setCurrentRound(curr => curr + 1);
          setCurrentExercise(0);
        }
      } else {
        setCurrentExercise(curr => curr + 1);
      }
    } else {
      if (currentRound === 4) {
        if (currentExercise === workouts[workoutType].length - 1) {
          resetWorkout();
        } else {
          setCurrentRound(1);
          setCurrentExercise(curr => curr + 1);
        }
      } else {
        setCurrentRound(curr => curr + 1);
      }
    }
    setIsResting(false);
    setSeconds(0);
  };

  const exercise = workouts[workoutType][currentExercise];

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <select
          className="p-2 border rounded"
          value={workoutType}
          onChange={(e) => {
            setWorkoutType(e.target.value as 'beach' | 'back');
            resetWorkout();
          }}
        >
          <option value="beach">Beach Muscles</option>
          <option value="back">Back & Legs</option>
        </select>
        <select
          className="p-2 border rounded"
          value={workoutStyle}
          onChange={(e) => {
            setWorkoutStyle(e.target.value as 'circuit' | 'individual');
            resetWorkout();
          }}
        >
          <option value="circuit">Circuit (All Exercises)</option>
          <option value="individual">Individual (4x Each)</option>
        </select>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">{exercise.name}</h2>
        <div className="text-gray-600 mb-1">Reps: {exercise.reps}</div>
        <div className="text-gray-600">Band: {exercise.band}</div>
      </div>

      <div className="text-center mb-8">
        <div className="text-5xl font-bold mb-2">
          {isResting ? seconds : "GO!"}
        </div>
        <div className="text-gray-600">
          {isResting ? "Rest Time" : "Work Time"}
        </div>
      </div>

      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={toggleTimer}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Timer className="w-5 h-5" />
          {isActive ? "Stop" : "Start"}
        </button>
        <button
          onClick={resetWorkout}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Reset
        </button>
        <button
          onClick={nextExercise}
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
        >
          <SkipForward className="w-5 h-5" />
          Next
        </button>
      </div>

      <div className="text-center text-gray-600">
        <div>Round {currentRound} of 4</div>
        <div>Exercise {currentExercise + 1} of {workouts[workoutType].length}</div>
      </div>
    </div>
  );
};

export default WorkoutTimer;
