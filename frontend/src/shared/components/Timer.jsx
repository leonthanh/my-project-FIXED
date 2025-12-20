import React, { useState, useEffect, useCallback } from 'react';

const Timer = ({ 
  duration = 40 * 60, // Default 40 minutes in seconds
  onTimeUp,
  warningTime = 5 * 60 // Warning when 5 minutes left
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          onTimeUp?.();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeUp]);

  useEffect(() => {
    if (timeLeft <= warningTime && !isWarning) {
      setIsWarning(true);
      // Optional: Play warning sound
      const audio = new Audio('/warning.mp3');
      audio.play().catch(err => console.log('Warning sound not available'));
    }
  }, [timeLeft, warningTime, isWarning]);

  const formatTime = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }, []);

  const getTimerStyle = () => {
    // Base styles
    const baseStyle = {
      padding: '12px 20px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };

    // Color variations based on time left
    if (timeLeft <= 60) {
      return {
        ...baseStyle,
        backgroundColor: '#dc3545',
        color: 'white',
        animation: 'pulse 1s infinite'
      };
    } else if (timeLeft <= warningTime) {
      return {
        ...baseStyle,
        backgroundColor: '#ffc107',
        color: '#000'
      };
    }
    return {
      ...baseStyle,
      backgroundColor: '#28a745',
      color: 'white'
    };
  };

  return (
    <div style={getTimerStyle()}>
      <span style={{ fontSize: '1.4rem' }}>⏱️</span>
      <span>{formatTime(timeLeft)}</span>
      {timeLeft <= warningTime && (
        <span style={{ marginLeft: 'auto', fontSize: '0.9rem' }}>
          {timeLeft <= 60 ? '⚠️ Sắp hết giờ!' : '⚠️ Còn 5 phút!'}
        </span>
      )}
    </div>
  );
};

export default Timer;
