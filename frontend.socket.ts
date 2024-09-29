'use client';

import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

// Example multiple calendar data
const defaultLocalData = {
  fromDate: '2024-09-15',
  toDate: '2024-10-01',
  calendarId: '66e192d67bdf773f49f29e4a',
  participant: false,
};

const defaultLocalData2 = {
  fromDate: '2024-09-15',
  toDate: '2024-10-01',
  calendarId: '66ef1ed557a92095f625519b',
  participant: false,
};

const defaultGoogleData = {
  fromDate: '2025-01-17',
  toDate: '2025-01-01',
  calendarId: '@group.calendar.google.com',
};

const defaultGoogleData2 = {
  fromDate: '2025-01-17',
  toDate: '2025-02-01',
  calendarId: '@group.calendar.google.com',
};

const defaultOutlookData = {
  calendarId:
    '-un6eMt9nSr8XjQvbqJVBAAAAAAEGAAB-un6eMt9nSr8XjQvbqJVBAADK3_lxAAA=',
  fromDate: '2025-01-17',
  toDate: '2025-02-01',
};

const defaultOutlookData2 = {
  calendarId:
    '-434BteHwNwcA1RH9MHYYeUCplv7DWncRZAAAAgEGAAAA1RH9MHYYeUCplv7DWncRZAAAAiaYAAAA',
  fromDate: '2025-01-17',
  toDate: '2025-02-01',
};

function Plugins() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localEvents, setLocalEvents] = useState<object[]>([]); // Store local events
  const [googleEvents, setGoogleEvents] = useState<object[]>([]); // Store Google events
  const [outlookEvents, setOutlookEvents] = useState<object[]>([]); // Store Outlook events
  const [error, setError] = useState<string | null>(null); // Error handling

  useEffect(() => {
    // Initialize socket connection
    const socketIo = io('https://api.dev.calen360.com/', {
      withCredentials: true,
    });

    setSocket(socketIo);

    // Emit default values for local and Google events on mount
    socketIo.emit('localEvents', defaultLocalData);
    socketIo.emit('localEvents', defaultLocalData2);
    socketIo.emit('googleEvents', defaultGoogleData);
    socketIo.emit('googleEvents', defaultGoogleData2);
    socketIo.emit('outlookEvents', defaultOutlookData);
    socketIo.emit('outlookEvents', defaultOutlookData2);

    // Listen for local events form submission response
    socketIo.on('localResponse', (data) => {
      try {
        console.log('Local events response:', data);
        // Ensure that incoming data is always an array before spreading
        const events = Array.isArray(data) ? data : [data];
        setLocalEvents((prevEvents) => [...prevEvents, ...events]);
      } catch (error) {
        console.error('Error fetching local events:', error);
        setError('Error fetching local events.');
      }
    });

    // Listen for Google events form submission response
    socketIo.on('googleResponse', (data) => {
      try {
        console.log('Google events response:', data);
        // Ensure that incoming data is always an array before spreading
        const events = Array.isArray(data) ? data : [data];
        setGoogleEvents((prevEvents) => [...prevEvents, ...events]);
      } catch (error) {
        console.error('Error fetching Google events:', error);
        setError('Error fetching Google events.');
      }
    });

    // Listen for Outlook events form submission response
    socketIo.on('outlookResponse', (data) => {
      try {
        console.log('Outlook events response:', data);
        // Ensure that incoming data is always an array before spreading
        const events = Array.isArray(data) ? data : [data];
        setOutlookEvents((prevEvents) => [...prevEvents, ...events]);
      } catch (error) {
        console.error('Error fetching Outlook events:', error);
        setError('Error fetching Outlook events.');
      }
    });

    // Listen for real-time updates for local events
    socketIo.on('localEventUpdated', (updatedEvents) => {
      try {
        console.log('Local Event updates:', updatedEvents);
        // Ensure that incoming data is always an array before spreading
        const updated = Array.isArray(updatedEvents)
          ? updatedEvents
          : [updatedEvents];
        setLocalEvents(updated);
      } catch (error) {
        console.error('Error processing local event updates:', error);
        setError('Error updating local events.');
      }
    });

    // Listen for real-time updates for Google events
    socketIo.on('googleEventUpdated', (updatedEvents) => {
      try {
        console.log('Google Event updates:', updatedEvents);
        // Ensure that incoming data is always an array before spreading
        const updated = Array.isArray(updatedEvents)
          ? updatedEvents
          : [updatedEvents];
        setGoogleEvents(updated);
      } catch (error) {
        console.error('Error processing Google event updates:', error);
        setError('Error updating Google events.');
      }
    });

    // Listen for real-time updates for Outlook events
    socketIo.on('outlookEventUpdated', (updatedEvents) => {
      try {
        console.log('Outlook Event updates:', updatedEvents);
        // Ensure that incoming data is always an array before spreading
        const updated = Array.isArray(updatedEvents)
          ? updatedEvents
          : [updatedEvents];
        setOutlookEvents(updated);
      } catch (error) {
        console.error('Error processing Outlook event updates:', error);
        setError('Error updating Outlook events.');
      }
    });

    return () => {
      socketIo.disconnect();
    };
  }, []);

  // Combine events from all calendars to display
  const combinedEvents = [...localEvents, ...googleEvents, ...outlookEvents];

  return (
    <div style={{ padding: '20px' }}>
      <h2>All Events from Local, Google, and Outlook Calendars</h2>

      {/* Display errors if any */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Display real-time combined events */}
      {combinedEvents.length > 0 ? (
        <pre>Combined Events: {JSON.stringify(combinedEvents, null, 2)}</pre>
      ) : (
        <p>No events to display.</p>
      )}
    </div>
  );
}

export default Plugins;
