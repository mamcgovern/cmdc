import {
  createContext,
  useContext,
  useState,
} from "react";

import {
  getGoogleCalendarEvents,
  getGoogleCalendars,
  requestGoogleCalendarAccess,
} from "../services/googleCalendar";

const GoogleCalendarContext =
  createContext(null);

export function GoogleCalendarProvider({
  children,
}) {
  const [googleEvents, setGoogleEvents] =
    useState([]);

  const [
    googleCalendars,
    setGoogleCalendars,
  ] = useState([]);

  const [
    googleAccessToken,
    setGoogleAccessToken,
  ] = useState(null);

  const [
    googleConnected,
    setGoogleConnected,
  ] = useState(false);

  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  const [
    selectedGoogleCalendars,
    setSelectedGoogleCalendars,
  ] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          "cmdc-google-calendars"
        ) || "[]"
      );
    } catch {
      return [];
    }
  });

  const formatGoogleEvent = (
    event,
    calendar
  ) => {
    const startValue =
      event.start?.dateTime ||
      event.start?.date;

    if (!startValue) {
      return null;
    }

    const isAllDay =
      Boolean(event.start?.date);

    let eventDate;
    let eventTime = null;

    if (isAllDay) {
      eventDate = startValue;
    } else {
      const startDate =
        new Date(startValue);

      const year =
        startDate.getFullYear();

      const month = String(
        startDate.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        startDate.getDate()
      ).padStart(2, "0");

      eventDate =
        `${year}-${month}-${day}`;

      const hour = String(
        startDate.getHours()
      ).padStart(2, "0");

      const minute = String(
        startDate.getMinutes()
      ).padStart(2, "0");

      eventTime =
        `${hour}:${minute}`;
    }

    return {
      id: `google-${calendar.id}-${event.id}`,
      externalId: event.id,

      calendarId: calendar.id,
      calendarName:
        calendar.summary,

      title:
        event.summary ||
        "Untitled Event",

      date: eventDate,
      time: eventTime,

      source: "Google",
      readOnly: true,
    };
  };

  const loadSelectedGoogleCalendars =
    async (
      accessToken,
      calendarIds,
      calendars = googleCalendars
    ) => {
      const loadedEvents = [];

      for (const calendarId of calendarIds) {
        const calendar =
          calendars.find(
            (item) =>
              item.id === calendarId
          );

        if (!calendar) {
          continue;
        }

        try {
          const calendarEvents =
            await getGoogleCalendarEvents(
              accessToken,
              calendarId
            );

          const formattedEvents =
            calendarEvents
              .map((event) =>
                formatGoogleEvent(
                  event,
                  calendar
                )
              )
              .filter(Boolean);

          loadedEvents.push(
            ...formattedEvents
          );
        } catch (error) {
          console.error(
            `Unable to load ${calendar.summary}:`,
            error
          );
        }
      }

      setGoogleEvents(
        loadedEvents
      );
    };

  const connectGoogle =
    async () => {
      try {
        setGoogleLoading(true);

        const accessToken =
          await requestGoogleCalendarAccess(
            ""
          );

        setGoogleAccessToken(
          accessToken
        );

        const calendars =
          await getGoogleCalendars(
            accessToken
          );

        setGoogleCalendars(
          calendars
        );

        setGoogleConnected(true);

        localStorage.setItem(
          "cmdc-google-connected",
          "true"
        );

        let calendarsToLoad =
          selectedGoogleCalendars;

        /*
         * First-time connection:
         * default to primary calendar.
         */
        if (
          calendarsToLoad.length === 0
        ) {
          const primaryCalendar =
            calendars.find(
              (calendar) =>
                calendar.primary
            );

          if (primaryCalendar) {
            calendarsToLoad = [
              primaryCalendar.id,
            ];

            setSelectedGoogleCalendars(
              calendarsToLoad
            );

            localStorage.setItem(
              "cmdc-google-calendars",
              JSON.stringify(
                calendarsToLoad
              )
            );
          }
        }

        await loadSelectedGoogleCalendars(
          accessToken,
          calendarsToLoad,
          calendars
        );
      } catch (error) {
        console.error(
          "Google Calendar connection failed:",
          error
        );

        setGoogleConnected(
          false
        );
      } finally {
        setGoogleLoading(false);
      }
    };

  const toggleGoogleCalendar =
    async (calendarId) => {
      const alreadySelected =
        selectedGoogleCalendars.includes(
          calendarId
        );

      const updatedCalendars =
        alreadySelected
          ? selectedGoogleCalendars.filter(
              (id) =>
                id !== calendarId
            )
          : [
              ...selectedGoogleCalendars,
              calendarId,
            ];

      setSelectedGoogleCalendars(
        updatedCalendars
      );

      localStorage.setItem(
        "cmdc-google-calendars",
        JSON.stringify(
          updatedCalendars
        )
      );

      if (googleAccessToken) {
        await loadSelectedGoogleCalendars(
          googleAccessToken,
          updatedCalendars,
          googleCalendars
        );
      }
    };

  const disconnectGoogle = () => {
    setGoogleEvents([]);
    setGoogleCalendars([]);
    setGoogleAccessToken(null);
    setGoogleConnected(false);

    localStorage.removeItem(
      "cmdc-google-connected"
    );
  };

  const value = {
    googleEvents,
    googleCalendars,
    googleAccessToken,
    googleConnected,
    googleLoading,
    selectedGoogleCalendars,

    connectGoogle,
    disconnectGoogle,
    toggleGoogleCalendar,
  };

  return (
    <GoogleCalendarContext.Provider
      value={value}
    >
      {children}
    </GoogleCalendarContext.Provider>
  );
}

export function useGoogleCalendar() {
  const context = useContext(
    GoogleCalendarContext
  );

  if (!context) {
    throw new Error(
      "useGoogleCalendar must be used inside GoogleCalendarProvider."
    );
  }

  return context;
}