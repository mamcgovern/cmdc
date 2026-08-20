const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

let tokenClient = null;

export const requestGoogleCalendarAccess = (prompt = "") => {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(
        new Error(
          "Google Client ID is missing. Check VITE_GOOGLE_CLIENT_ID in your .env file."
        )
      );
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      reject(
        new Error("Google Identity Services has not loaded.")
      );
      return;
    }

    tokenClient =
      window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: CALENDAR_SCOPE,

        callback: (response) => {
          if (response.error) {
            reject(response);
            return;
          }

          resolve(response.access_token);
        },
      });

    tokenClient.requestAccessToken({
      prompt,
    });
  });
};

export const getGoogleCalendars = async (accessToken) => {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Unable to load Google calendars.");
  }

  const data = await response.json();

  return data.items || [];
};

export const getGoogleCalendarEvents = async (
  accessToken,
  calendarId
) => {
  const start = new Date();
  start.setMonth(start.getMonth() - 1);

  const end = new Date();
  end.setMonth(end.getMonth() + 6);

  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const encodedCalendarId =
    encodeURIComponent(calendarId);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to load events for calendar ${calendarId}.`
    );
  }

  const data = await response.json();

  return data.items || [];
};