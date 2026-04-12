import React, { useState, useRef, useEffect } from 'react';
import InlineIcon from '../../../shared/components/InlineIcon.jsx';

const AudioPlayer = ({ audioFiles, onTimeUpdate, startTimes = {} }) => {
  const [activeFile, setActiveFile] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Tự động chuyển sang file tiếp theo nếu có
      if (Array.isArray(audioFiles) && activeFile < audioFiles.length - 1) {
        setActiveFile(prev => prev + 1);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [activeFile, audioFiles, onTimeUpdate]);

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

  const listenFromHere = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = {
    container: {
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px'
    },
    playerWrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginBottom: '10px'
    },
    button: {
      backgroundColor: '#0e276f',
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
    },
    slider: {
      flex: 1,
      height: '4px',
      borderRadius: '2px'
    },
    fileList: {
      marginTop: '15px',
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap'
    },
    fileButton: {
      padding: '8px 16px',
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '20px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    activeFile: {
      backgroundColor: '#0e276f',
      color: 'white',
      border: 'none'
    },
    listenPoints: {
      marginTop: '15px',
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap'
    },
    listenPoint: {
      padding: '5px 10px',
      backgroundColor: '#e3f2fd',
      borderRadius: '15px',
      cursor: 'pointer',
      fontSize: '13px',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    }
  };

  // Chuẩn bị mảng startTimes để hiển thị nút "Listen from here"
  const listenPoints = Object.entries(startTimes).map(([questionNum, time]) => ({
    label: `Question ${questionNum}`,
    time: time
  }));

  return (
    <div style={styles.container}>
      <div style={styles.playerWrapper}>
        <button onClick={togglePlay} style={styles.button}>
          <InlineIcon name={isPlaying ? 'pause' : 'play'} size={18} style={{ color: 'currentColor' }} />
        </button>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          style={styles.slider}
        />
        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>

      {/* Hiển thị danh sách file nếu có nhiều file */}
      {Array.isArray(audioFiles) && audioFiles.length > 1 && (
        <div style={styles.fileList}>
          {audioFiles.map((file, index) => (
            <button
              key={index}
              onClick={() => setActiveFile(index)}
              style={{
                ...styles.fileButton,
                ...(activeFile === index ? styles.activeFile : {})
              }}
            >
              Part {index + 1}
            </button>
          ))}
        </div>
      )}

      {/* Hiển thị các điểm "Listen from here" */}
      {listenPoints.length > 0 && (
        <div style={styles.listenPoints}>
          {listenPoints.map((point, index) => (
            <button
              key={index}
              onClick={() => listenFromHere(point.time)}
              style={styles.listenPoint}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="target" size={14} />{point.label}</span>
            </button>
          ))}
        </div>
      )}

      <audio
        ref={audioRef}
        src={Array.isArray(audioFiles) ? audioFiles[activeFile] : audioFiles}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default AudioPlayer;
