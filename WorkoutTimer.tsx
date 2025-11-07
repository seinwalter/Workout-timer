import React, { useState, useEffect } from 'react';
import { Timer, Settings, RotateCcw, SkipForward } from 'lucide-react';

const WorkoutTimer = () => {
  const [workoutType, setWorkoutType] = useState('beach');
  const [currentExercise, setCurrentExercise] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [workoutStyle, setWorkoutStyle] = useState('circuit');

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

  // Get next exercise info
  const getNextExercise = () => {
    if (workoutStyle === 'circuit') {
      if (currentExercise === workouts[workoutType].length - 1) {
        if (currentRound === 4) return null;
        return { exercise: workouts[workoutType][0], round: currentRound + 1 };
      }
      return { exercise: workouts[workoutType][currentExercise + 1], round: currentRound };
    } else {
      if (currentRound === 4) {
        if (currentExercise === workouts[workoutType].length - 1) return null;
        return { exercise: workouts[workoutType][currentExercise + 1], round: 1 };
      }
      return { exercise: workouts[workoutType][currentExercise], round: currentRound + 1 };
    }
  };

  const nextExerciseInfo = getNextExercise();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header Controls */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 mb-2 sm:mb-4">
          <div className="flex flex-col gap-2 sm:gap-3">
            <select
              className="w-full p-3 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={workoutType}
              onChange={(e) => {
                setWorkoutType(e.target.value);
                resetWorkout();
              }}
            >
              <option value="beach">Beach Muscles</option>
              <option value="back">Back & Legs</option>
            </select>
            <select
              className="w-full p-3 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={workoutStyle}
              onChange={(e) => {
                setWorkoutStyle(e.target.value);
                resetWorkout();
              }}
            >
              <option value="circuit">Circuit (All Exercises)</option>
              <option value="individual">Individual (4x Each)</option>
            </select>
          </div>
        </div>

        {/* Main Timer Card */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-xl p-4 sm:p-6 mb-2 sm:mb-4">
          {/* Progress Bar */}
          <div className="mb-4 sm:mb-6">
            <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
              <span>Round {currentRound}/4</span>
              <span>Exercise {currentExercise + 1}/{workouts[workoutType].length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentRound - 1) * workouts[workoutType].length + currentExercise + 1) / (4 * workouts[workoutType].length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Current Exercise Display */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mb-2">
              {isResting ? "Rest Period" : "Current Exercise"}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4 leading-tight px-2">
              {exercise.name}
            </h1>
            <div className="flex justify-center gap-3 sm:gap-6 text-sm sm:text-base flex-wrap">
              <div className="bg-blue-50 px-3 sm:px-4 py-2 rounded-lg">
                <span className="text-gray-600">Reps:</span>{' '}
                <span className="font-semibold text-blue-700">{exercise.reps}</span>
              </div>
              <div className="bg-purple-50 px-3 sm:px-4 py-2 rounded-lg">
                <span className="text-gray-600">Band:</span>{' '}
                <span className="font-semibold text-purple-700">{exercise.band}</span>
              </div>
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-center mb-6 sm:mb-8">
            <div className={`text-6xl sm:text-7xl md:text-8xl font-bold mb-2 ${isResting ? 'text-orange-500' : 'text-green-500'}`}>
              {isResting ? seconds : "GO!"}
            </div>
            <div className={`text-lg sm:text-xl font-medium ${isResting ? 'text-orange-600' : 'text-green-600'}`}>
              {isResting ? "Rest Time" : "Work Time"}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center gap-2 sm:gap-3">
            <button
              onClick={toggleTimer}
              className="px-4 sm:px-6 py-3 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 flex items-center gap-2 shadow-lg transition-all text-sm sm:text-base min-h-[48px]"
            >
              <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">{isActive ? "Stop" : "Start"}</span>
              <span className="inline xs:hidden">{isActive ? "Stop" : "Start"}</span>
            </button>
            <button
              onClick={resetWorkout}
              className="px-4 sm:px-6 py-3 sm:py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 active:bg-gray-700 flex items-center gap-2 shadow-lg transition-all text-sm sm:text-base min-h-[48px]"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Reset</span>
            </button>
            <button
              onClick={nextExercise}
              className="px-4 sm:px-6 py-3 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 active:bg-green-700 flex items-center gap-2 shadow-lg transition-all text-sm sm:text-base min-h-[48px]"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Next</span>
            </button>
          </div>
        </div>

        {/* Next Up Card */}
        {nextExerciseInfo && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide mb-2 sm:mb-3">
              Next Up - Round {nextExerciseInfo.round}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-xl font-semibold text-gray-800 truncate">
                  {nextExerciseInfo.exercise.name}
                </h3>
                <div className="flex gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600 flex-wrap">
                  <span>Reps: {nextExerciseInfo.exercise.reps}</span>
                  <span>Band: {nextExerciseInfo.exercise.band}</span>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl text-gray-300 flex-shrink-0">→</div>
            </div>
          </div>
        )}

        {!nextExerciseInfo && isActive && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-700">Last Exercise!</div>
            <div className="text-green-600 mt-2 text-sm sm:text-base">Finish strong!</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutTimer;
