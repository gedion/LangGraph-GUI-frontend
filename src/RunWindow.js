// RunWindow.js

import React, { useState, useEffect } from 'react';
import { useGraphManager } from './GraphManagerContext';

function RunWindow({ onClose }) {
  const [responseMessage, setResponseMessage] = useState('');
  const [running, setRunning] = useState(false);
  const {
    filename
  } = useGraphManager();
  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setResponseMessage('');

    try {
      console.log("Attempting to send request to Flask server...");
      const response = await fetch('http://127.0.0.1:5000/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Specify JSON in the request
        },
        body: JSON.stringify({file: filename })
      });

      if (!response.body) {
        throw new Error('ReadableStream not yet supported in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          console.log("Received chunk:", chunk);
          setResponseMessage(prev => prev + chunk);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setResponseMessage(prev => prev + '\nError: ' + error.message);
      alert('Error: ' + error.message);
    } finally {
      setRunning(false);  // Ensure running is set to false when done or if there's an error
    }
  };

  const handleStop = async () => {
    if (!running) return;

    try {
      const response = await fetch('http://127.0.0.1:5000/stop', {
        method: 'POST',
      });
      const message = await response.text();
      console.log(message);
      setResponseMessage(prev => prev + '\n' + message);
      if (response.ok) {
        setRunning(false);  // Reset running state if stop was successful
      } else {
        console.error('Failed to stop script:', message);
      }
    } catch (error) {
      console.error('Error:', error);
      setResponseMessage(prev => prev + '\nError: ' + error.message);
      alert('Error: ' + error.message);
    }
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/status', {
          method: 'GET',
        });
        const status = await response.json();
        setRunning(status.running);
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async () => {
    await handleStop();
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.window}>
        <h2>Run Script</h2>
        <button onClick={handleRun} disabled={running}>Run</button>
        <button onClick={handleStop} disabled={!running}>Stop</button>
        <button onClick={handleCancel}>Cancel</button>
        <div style={styles.response}>
          <pre
            dangerouslySetInnerHTML={{ __html: responseMessage}}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  window: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '5px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)',
    width: '80%',
    height: '80%',
    display: 'flex',
    flexDirection: 'column',
  },
  response: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#f0f0f0',
    padding: '10px',
    borderRadius: '5px',
    marginTop: '10px',
  },
};

export default RunWindow;
