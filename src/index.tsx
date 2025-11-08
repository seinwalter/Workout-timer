import React from 'react';
import ReactDOM from 'react-dom/client';
import WorkoutTimer from './WorkoutTimer';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <WorkoutTimer />
  </React.StrictMode>
);
