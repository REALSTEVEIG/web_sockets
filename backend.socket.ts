import { type Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { listEvents } from '@/services/events/event.service';
import { getAllEvents } from '@/services/marketplace/apps/google-calendar';
import { getAllCalendarEventsServices } from '@/services/marketplace/apps/microsoft-outlook';
import EventsQueryDataModel from '@/models/eventsQuery.model';
import { type IEventsQueryData } from '@/types';

let io: SocketIOServer | null = null;

// Handle Local Events
async function handleLocalEvents(
  socket: any,
  session: any,
  data: IEventsQueryData,
) {
  const { _id: userId, email } = session.user;

  const localData: IEventsQueryData = {
    calendarType: 'Local',
    calendarId: data.calendarId,
    fromDate: data.fromDate,
    toDate: data.toDate,
    userId,
    userEmail: email,
    participant: false,
  };

  let query: any;

  try {
    const existingQuery = await EventsQueryDataModel.findOne({
      calendarType: localData.calendarType,
      calendarId: localData.calendarId,
      userId: localData.userId,
    });

    if (existingQuery) {
      query = await EventsQueryDataModel.findByIdAndUpdate(
        existingQuery._id,
        {
          $set: {
            fromDate: localData.fromDate,
            toDate: localData.toDate,
            participant: localData.participant,
          },
        },
        { new: true, runValidators: true },
      );
    } else {
      query = await EventsQueryDataModel.create({ ...localData });
    }

    if (!query) {
      throw new Error(
        'Failed to create or update EventsQueryData for local calen360 events',
      );
    }

    const localEvents = await listEvents(
      userId,
      query.fromDate,
      query.toDate,
      query.calendarId,
      query.userEmail,
      query.participant,
    );

    socket.emit('localResponse', {
      message: 'Local Events',
      data: localEvents,
    });
  } catch (error) {
    console.error('Error handling local events:', error);
    socket.emit('error', { message: 'Error fetching local events.' });
  }
}

// Handle Google Events
async function handleGoogleEvents(
  socket: any,
  session: any,
  data: IEventsQueryData,
) {
  const { _id: userId, email } = session.user;

  const googleData: IEventsQueryData = {
    calendarType: 'Google',
    calendarId: data.calendarId,
    fromDate: data.fromDate,
    toDate: data.toDate,
    userEmail: email,
    userId,
  };

  let query: any;

  try {
    const existingQuery = await EventsQueryDataModel.findOne({
      calendarType: googleData.calendarType,
      calendarId: googleData.calendarId,
      userId: googleData.userId,
    });

    if (existingQuery) {
      query = await EventsQueryDataModel.findByIdAndUpdate(
        existingQuery._id,
        {
          $set: {
            fromDate: googleData.fromDate,
            toDate: googleData.toDate,
          },
        },
        { new: true, runValidators: true },
      );
    } else {
      query = await EventsQueryDataModel.create({ ...googleData });
    }

    if (!query) {
      throw new Error('Failed to create or update EventsQueryData for google');
    }

    const googleEvents = await getAllEvents(
      query.calendarId,
      query.userEmail!,
      query.fromDate,
      query.toDate,
      userId,
    );

    // console.log('googleEvents', googleEvents);

    socket.emit('googleResponse', {
      message: 'Google Events',
      data: googleEvents,
    });
  } catch (error) {
    console.error('Error fetching Google events:', error);
    socket.emit('error', { message: 'Error fetching Google events.' });
  }
}

// Handle Outlook Events
async function handleOutlookEvents(
  socket: any,
  session: any,
  data: IEventsQueryData,
) {
  const { _id: userId, email } = session.user;

  const outlookData: IEventsQueryData = {
    calendarType: 'Outlook',
    calendarId: data.calendarId,
    userEmail: email,
    fromDate: data.fromDate,
    toDate: data.toDate,
    userId,
  };

  let query: any;

  try {
    const existingQuery = await EventsQueryDataModel.findOne({
      calendarType: outlookData.calendarType,
      calendarId: outlookData.calendarId,
      userId: outlookData.userId,
    });

    if (existingQuery) {
      query = await EventsQueryDataModel.findByIdAndUpdate(
        existingQuery._id,
        {
          $set: {
            fromDate: outlookData.fromDate,
            toDate: outlookData.toDate,
          },
        },
        { new: true, runValidators: true },
      );
    } else {
      query = await EventsQueryDataModel.create({ ...outlookData });
    }

    if (!query) {
      throw new Error('Failed to create or update EventsQueryData for outlook');
    }

    const fromDateAsDate = outlookData.fromDate
      ? new Date(query.fromDate.toString())
      : null;
    const toDateAsDate = outlookData.toDate
      ? new Date(query.toDate.toString())
      : null;

    const filterOptions = {
      fromDate: fromDateAsDate,
      toDate: toDateAsDate,
    };

    const outlookEvents = await getAllCalendarEventsServices(
      query.calendarId,
      query.userId,
      query.userEmail,
      filterOptions,
    );
    // console.log('outlookEvents', outlookEvents);

    socket.emit('outlookResponse', {
      message: 'Outlook Events',
      data: outlookEvents,
    });
  } catch (error) {
    console.error('Error fetching Outlook events:', error);
    socket.emit('error', { message: 'Error fetching Outlook events.' });
  }
}

export function initializeWebSocketServer(
  server: HttpServer,
  sessionMiddleware: any,
): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: ['https://dev.url.com'],
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Access-Control-Allow-Origin'],
    },
    allowEIO3: true,
  });

  io.engine.use(sessionMiddleware);

  io.on('connection', (socket) => {
    console.log('A user connected.');

    // @ts-expect-error no-error
    const { session } = socket.request;

    if (!session?.user?.email) {
      console.log('Invalid session data');
      return;
    }

    console.log('Session:', session);

    // Local Calendar Event Handling
    socket.on('localEvents', async (data) => {
      await handleLocalEvents(socket, session, data);
    });

    // Google Calendar Event Handling
    socket.on('googleEvents', async (data) => {
      await handleGoogleEvents(socket, session, data);
    });

    // Google Calendar Event Handling
    socket.on('outlookEvents', async (data) => {
      await handleOutlookEvents(socket, session, data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  return io;
}

// Send real-time updates for Local events
export const sendLocalEventUpdates = async (userId: any): Promise<void> => {
  const query = await EventsQueryDataModel.find({
    calendarType: 'Local',
    userId,
  });

  if (!io || !query.length) return;

  try {
    const allLocalUpdates = await Promise.all(
      query.map(async (elements) => {
        const { calendarId, fromDate, toDate, userEmail, participant } =
          elements;

        // Fetch the updated Local events
        const updatedLocalEvents = await listEvents(
          userId,
          fromDate,
          toDate,
          calendarId,
          userEmail,
          participant,
        );

        return updatedLocalEvents;
      }),
    );

    const flattenedUpdatedEvents = allLocalUpdates.flat();

    // Emit the updates only if there are events
    if (flattenedUpdatedEvents.length > 0) {
      io.emit('localEventUpdated', {
        message: 'Local events updated',
        data: flattenedUpdatedEvents,
      });
    }
  } catch (error) {
    console.error('Error fetching updated local events:', error);
  }
};

// Send real-time updates for Google events
export const sendGoogleEventUpdates = async (userId: any): Promise<void> => {
  const query = await EventsQueryDataModel.find({
    calendarType: 'Google',
    userId,
  });

  if (!io || !query.length) return;

  try {
    const allGoogleUpdates = await Promise.all(
      query.map(async (elements) => {
        const { calendarId, fromDate, toDate, userEmail } = elements;

        // Fetch the updated Google events
        const updatedGoogleEvents = await getAllEvents(
          calendarId,
          userEmail!,
          fromDate,
          toDate,
          userId,
        );

        return updatedGoogleEvents;
      }),
    );

    const flattenedUpdatedEvents = allGoogleUpdates.flat();

    // Emit the updates only if there are events
    if (flattenedUpdatedEvents.length > 0) {
      io.emit('googleEventUpdated', {
        message: 'Google Events',
        data: flattenedUpdatedEvents,
      });
    }
  } catch (error) {
    console.log('Error fetching Google events:', error);
  }
};

// Send real-time updates for Outlook events
export const sendOutlookEventUpdates = async (userId: any): Promise<void> => {
  const query = await EventsQueryDataModel.find({
    calendarType: 'Outlook',
    userId,
  });

  if (!io || !query.length) return;

  try {
    const allOutlookUpdates = await Promise.all(
      query.map(async (elements) => {
        const { calendarId, userEmail, fromDate, toDate } = elements;

        // Ensure proper date conversion
        const from = fromDate ? new Date(fromDate.toString()) : null;
        const to = toDate ? new Date(toDate.toString()) : null;

        const filteredOptions = {
          fromDate: from,
          toDate: to,
        };

        // Fetch the updated Outlook events
        const updatedOutlookEvents = await getAllCalendarEventsServices(
          calendarId,
          userId,
          userEmail!,
          filteredOptions,
        );

        return updatedOutlookEvents;
      }),
    );

    const flattenedUpdatedEvents = allOutlookUpdates.flat();

    console.log('flattenedUpdatedEvents', flattenedUpdatedEvents);

    // Emit the updates only if there are events
    if (flattenedUpdatedEvents.length > 0) {
      io.emit('outlookEventUpdated', {
        message: 'Outlook Events',
        data: flattenedUpdatedEvents,
      });
    }
  } catch (error) {
    console.log('Error fetching Outlook events:', error);
  }
};
