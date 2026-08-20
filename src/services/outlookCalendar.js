import ICAL from "ical.js";

const OUTLOOK_PROXY_URL =
  "http://localhost:3001/api/outlook-calendar";

const toDateString = (date) => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toTimeString = (date) => {
  const hour = String(
    date.getHours()
  ).padStart(2, "0");

  const minute = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${hour}:${minute}`;
};

const formatOutlookEvent = (
  event,
  startDate,
  occurrenceId = ""
) => {
  const jsDate =
    startDate.toJSDate();

  const isAllDay =
    startDate.isDate;

  return {
    id: `outlook-${event.uid}-${occurrenceId || jsDate.getTime()}`,

    externalId:
      event.uid,

    title:
      event.summary ||
      "Untitled Event",

    date:
      toDateString(jsDate),

    time:
      isAllDay
        ? null
        : toTimeString(jsDate),

    source:
      "Outlook",

    calendarName:
      "Outlook",

    readOnly:
      true,
  };
};

const expandRecurringEvent = (
  event,
  rangeStart,
  rangeEnd
) => {
  const results = [];

  const iterator =
    event.iterator();

  let next;

  let count = 0;

  const maxOccurrences =
    1000;

  while (
    (next = iterator.next()) &&
    count < maxOccurrences
  ) {
    const occurrenceDate =
      next.toJSDate();

    if (
      occurrenceDate >
      rangeEnd
    ) {
      break;
    }

    if (
      occurrenceDate >=
      rangeStart
    ) {
      const details =
        event.getOccurrenceDetails(
          next
        );

      results.push(
        formatOutlookEvent(
          details.item,
          details.startDate,
          String(count)
        )
      );
    }

    count++;
  }

  return results;
};

export const getOutlookCalendarEvents =
  async () => {
    const response =
      await fetch(
        OUTLOOK_PROXY_URL
      );

    if (!response.ok) {
      throw new Error(
        `Unable to load Outlook calendar. HTTP ${response.status}`
      );
    }

    const icsText =
      await response.text();

    const parsed =
      ICAL.parse(icsText);

    const calendar =
      new ICAL.Component(
        parsed
      );

    const vevents =
      calendar.getAllSubcomponents(
        "vevent"
      );

    const rangeStart =
      new Date();

    rangeStart.setMonth(
      rangeStart.getMonth() -
        1
    );

    rangeStart.setHours(
      0,
      0,
      0,
      0
    );

    const rangeEnd =
      new Date();

    rangeEnd.setMonth(
      rangeEnd.getMonth() +
        6
    );

    rangeEnd.setHours(
      23,
      59,
      59,
      999
    );

    const outlookEvents =
      [];

    for (
      const vevent of
      vevents
    ) {
      const event =
        new ICAL.Event(
          vevent
        );

      if (
        event.isRecurring()
      ) {
        const occurrences =
          expandRecurringEvent(
            event,
            rangeStart,
            rangeEnd
          );

        outlookEvents.push(
          ...occurrences
        );

        continue;
      }

      const start =
        event.startDate;

      if (!start) {
        continue;
      }

      const startJs =
        start.toJSDate();

      if (
        startJs <
          rangeStart ||
        startJs >
          rangeEnd
      ) {
        continue;
      }

      outlookEvents.push(
        formatOutlookEvent(
          event,
          start
        )
      );
    }

    return outlookEvents;
  };