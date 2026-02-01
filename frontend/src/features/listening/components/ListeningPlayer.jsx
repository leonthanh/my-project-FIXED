import React, { useRef, useEffect, useState } from 'react';

const ListeningPlayer = ({ audioUrl, onTimeUpdate, onDurationChange, autoPlay = false }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration);
      onDurationChange?.(audio.duration);
    };

    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onDurationChange]);

  // Auto-play when requested by parent
  useEffect(() => {
    if (autoPlay && audioRef.current && !isPlaying) {
      // try to play, ignore errors (browser may block autoplay without user gesture)
      const playPromise = audioRef.current.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {
          // ignore autoplay failure
        });
      }
      setIsPlaying(true);
    }
  }, [autoPlay]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playerStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    gap: '10px'
  };

  const buttonStyle = {
    background: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px'
  };

  const sliderStyle = {
    flex: 1,
    height: '4px',
    borderRadius: '2px'
  };

  return (
    <div style={playerStyle}>
      <button onClick={togglePlay} style={buttonStyle}>
        {isPlaying ? '⏸' : '▶️'}
      </button>
      <input
        type="range"
        min="0"
        max={duration || 0}
        value={currentTime}
        onChange={handleSeek}
        style={sliderStyle}
      />
      <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
      <audio ref={audioRef} src={audioUrl} />
    </div>
  );
};

export default ListeningPlayer;
