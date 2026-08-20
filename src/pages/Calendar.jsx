import { useEffect, useMemo, useRef, useState } from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../services/firebase";

import { useGoogleCalendar } from "../context/GoogleCalendarContext";

import { getOutlookCalendarEvents } from "../services/outlookCalendar";

function Calendar() {
  const [view, setView] = useState("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [events, setEvents] = useState([]);

  const [outlookEvents, setOutlookEvents] = useState([]);
  const [outlookLoading, setOutlookLoading] = useState(true);
  const [outlookError, setOutlookError] = useState(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [editingEventId, setEditingEventId] = useState(null);

  const [googleMenuOpen, setGoogleMenuOpen] = useState(false);

  const googleMenuRef = useRef(null);

  const {
    googleEvents,
    googleCalendars,
    googleConnected,
    googleLoading,
    selectedGoogleCalendars,
    connectGoogle,
    toggleGoogleCalendar,
  } = useGoogleCalendar();

  /*
   * CMDC EVENTS
   */

  useEffect(() => {
    const eventsQuery = query(
      collection(db, "events"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      setEvents(
        snapshot.docs.map((eventDoc) => ({
          id: eventDoc.id,
          ...eventDoc.data(),
        }))
      );
    });

    return unsubscribe;
  }, []);

  /*
   * OUTLOOK ICS
   */

  useEffect(() => {
    let cancelled = false;

    const loadOutlook = async () => {
      try {
        setOutlookLoading(true);
        setOutlookError(null);

        const loadedEvents = await getOutlookCalendarEvents();

        if (!cancelled) {
          setOutlookEvents(loadedEvents);
        }
      } catch (error) {
        console.error(
          "Unable to load Outlook calendar:",
          error
        );

        if (!cancelled) {
          setOutlookEvents([]);
          setOutlookError(error.message);
        }
      } finally {
        if (!cancelled) {
          setOutlookLoading(false);
        }
      }
    };

    loadOutlook();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * CLOSE GOOGLE MENU WHEN CLICKING OUTSIDE
   */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        googleMenuRef.current &&
        !googleMenuRef.current.contains(event.target)
      ) {
        setGoogleMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /*
   * CMDC EVENT FORM
   */

  const resetForm = () => {
    setTitle("");
    setDate("");
    setTime("");
    setEditingEventId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim() || !date) {
      return;
    }

    const eventData = {
      title: title.trim(),
      date,
      time: time || null,
      source: "CMDC",
    };

    if (editingEventId) {
      await updateDoc(
        doc(db, "events", editingEventId),
        {
          ...eventData,
          updatedAt: serverTimestamp(),
        }
      );
    } else {
      await addDoc(collection(db, "events"), {
        ...eventData,
        createdAt: serverTimestamp(),
      });
    }

    resetForm();
  };

  const handleEdit = (event) => {
    if (event.readOnly) {
      return;
    }

    setEditingEventId(event.id);
    setTitle(event.title || "");
    setDate(event.date || "");
    setTime(event.time || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (eventId) => {
    await deleteDoc(doc(db, "events", eventId));

    if (editingEventId === eventId) {
      resetForm();
    }
  };

  /*
   * COMBINED EVENTS
   */

  const allEvents = useMemo(() => {
    return [
      ...events,
      ...googleEvents,
      ...outlookEvents,
    ];
  }, [events, googleEvents, outlookEvents]);

  const sortedEvents = useMemo(() => {
    return [...allEvents].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return (a.time || "").localeCompare(b.time || "");
    });
  }, [allEvents]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();

    const todayString = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(
      2,
      "0"
    )}`;

    return sortedEvents.filter(
      (event) => event.date >= todayString
    );
  }, [sortedEvents]);

  /*
   * FORMATTING
   */

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split("-");

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) {
      return "";
    }

    const [hour, minute] = timeString.split(":").map(Number);

    return new Date(
      2000,
      0,
      1,
      hour,
      minute
    ).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getDaysAway = (dateString) => {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const [year, month, day] = dateString.split("-");

    const eventDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return Math.ceil(
      (eventDate - today) /
        (1000 * 60 * 60 * 24)
    );
  };

  /*
   * MONTH GRID
   */

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDay = firstDay.getDay();

    const days = [];

    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        currentMonth: false,
      });
    }

    for (
      let day = 1;
      day <= lastDay.getDate();
      day++
    ) {
      days.push({
        date: new Date(year, month, day),
        currentMonth: true,
      });
    }

    let nextMonthDay = 1;

    while (days.length < 42) {
      days.push({
        date: new Date(
          year,
          month + 1,
          nextMonthDay
        ),
        currentMonth: false,
      });

      nextMonthDay++;
    }

    return days;
  };

  const getDateString = (dateValue) => {
    const year = dateValue.getFullYear();

    const month = String(
      dateValue.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      dateValue.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const isToday = (dateValue) => {
    const today = new Date();

    return (
      dateValue.getFullYear() === today.getFullYear() &&
      dateValue.getMonth() === today.getMonth() &&
      dateValue.getDate() === today.getDate()
    );
  };

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      )
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
      )
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const calendarDays = getCalendarDays();

  const monthTitle = currentDate.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );

  /*
   * RENDER
   */

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">CMDC</p>

        <h1>Calendar</h1>

        <p className="date">
          View your work schedule in one place.
        </p>
      </header>

      <section className="calendar-layout">
        <form
          className="calendar-form"
          onSubmit={handleSubmit}
        >
          <div className="task-form-header">
            <h2>
              {editingEventId
                ? "Edit Event"
                : "Add Event"}
            </h2>

            {editingEventId && (
              <button
                type="button"
                className="text-button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>

          <label>
            Event

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Event title"
            />
          </label>

          <label>
            Date

            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
            />
          </label>

          <label>
            Time

            <input
              type="time"
              value={time}
              onChange={(event) =>
                setTime(event.target.value)
              }
            />
          </label>

          <button
            type="submit"
            className="primary-button"
          >
            {editingEventId
              ? "Save Changes"
              : "Add Event"}
          </button>
        </form>

        <div className="calendar-main">
          <div className="calendar-toolbar">
            <div className="calendar-connections">
              {/* Google */}

              <div
                className="calendar-connection-wrapper"
                ref={googleMenuRef}
              >
                {!googleConnected ? (
                  <button
                    type="button"
                    className="calendar-connect-button"
                    onClick={connectGoogle}
                    disabled={googleLoading}
                  >
                    {googleLoading
                      ? "Connecting..."
                      : "Connect Google Calendar"}
                  </button>
                ) : (
                  <div className="calendar-connection-card">
                    <div className="calendar-connection-info">
                      <span className="calendar-connection-dot calendar-connection-dot--google" />

                      <div>
                        <strong>Google Connected</strong>

                        <span>
                          {
                            selectedGoogleCalendars.length
                          }{" "}
                          {selectedGoogleCalendars.length ===
                          1
                            ? "calendar"
                            : "calendars"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="calendar-menu-button"
                      aria-label="Google calendar options"
                      aria-expanded={googleMenuOpen}
                      onClick={() =>
                        setGoogleMenuOpen(
                          (current) => !current
                        )
                      }
                    >
                      ⋯
                    </button>
                  </div>
                )}

                {googleConnected &&
                  googleMenuOpen && (
                    <div className="calendar-dropdown-menu">
                      <div className="calendar-dropdown-header">
                        <span>
                          Google Calendars
                        </span>
                      </div>

                      <div className="calendar-dropdown-options">
                        {googleCalendars.map(
                          (calendar) => (
                            <label
                              key={calendar.id}
                              className="calendar-dropdown-option"
                            >
                              <input
                                type="checkbox"
                                checked={selectedGoogleCalendars.includes(
                                  calendar.id
                                )}
                                onChange={() =>
                                  toggleGoogleCalendar(
                                    calendar.id
                                  )
                                }
                              />

                              <span>
                                {calendar.summary}

                                {calendar.primary
                                  ? " (Primary)"
                                  : ""}
                              </span>
                            </label>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Outlook */}

              <div className="calendar-connection-wrapper">
                <div
                  className={`calendar-connection-card ${
                    outlookError
                      ? "calendar-connection-card--error"
                      : ""
                  }`}
                >
                  <div className="calendar-connection-info">
                    <span className="calendar-connection-dot calendar-connection-dot--outlook" />

                    <div>
                      <strong>
                        {outlookLoading
                          ? "Loading Outlook..."
                          : outlookError
                            ? "Outlook unavailable"
                            : "Outlook Connected"}
                      </strong>

                      {!outlookLoading &&
                        !outlookError && (
                          <span>
                            {
                              outlookEvents.length
                            }{" "}
                            events loaded
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="calendar-view-toggle">
              <button
                type="button"
                className={
                  view === "calendar"
                    ? "calendar-view-button active"
                    : "calendar-view-button"
                }
                onClick={() =>
                  setView("calendar")
                }
              >
                Calendar
              </button>

              <button
                type="button"
                className={
                  view === "list"
                    ? "calendar-view-button active"
                    : "calendar-view-button"
                }
                onClick={() =>
                  setView("list")
                }
              >
                List
              </button>

              <button
                type="button"
                className={
                  view === "countdown"
                    ? "calendar-view-button active"
                    : "calendar-view-button"
                }
                onClick={() =>
                  setView("countdown")
                }
              >
                Countdown
              </button>
            </div>
          </div>

          {outlookError && (
            <div className="calendar-error">
              <strong>
                Outlook calendar could not be loaded.
              </strong>

              <span>{outlookError}</span>
            </div>
          )}

          {view === "calendar" && (
            <section className="month-calendar">
              <div className="month-calendar-header">
                <div>
                  <p className="eyebrow">MONTH</p>
                  <h2>{monthTitle}</h2>
                </div>

                <div className="month-navigation">
                  <button
                    type="button"
                    onClick={goToPreviousMonth}
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    onClick={goToToday}
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={goToNextMonth}
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="calendar-weekdays">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              <div className="calendar-grid">
                {calendarDays.map(
                  ({
                    date: dayDate,
                    currentMonth,
                  }) => {
                    const dateString =
                      getDateString(dayDate);

                    const dayEvents =
                      allEvents.filter(
                        (event) =>
                          event.date === dateString
                      );

                    return (
                      <div
                        key={dateString}
                        className={`calendar-day ${
                          currentMonth
                            ? ""
                            : "calendar-day--outside"
                        } ${
                          isToday(dayDate)
                            ? "calendar-day--today"
                            : ""
                        }`}
                      >
                        <div className="calendar-day-number">
                          {dayDate.getDate()}
                        </div>

                        <div className="calendar-day-events">
                          {dayEvents.map(
                            (event) => (
                              <button
                                type="button"
                                key={event.id}
                                className={`calendar-event calendar-event--${event.source.toLowerCase()}`}
                                title={`${event.title}${
                                  event.calendarName
                                    ? ` · ${event.calendarName}`
                                    : ""
                                }`}
                                onClick={() => {
                                  if (
                                    !event.readOnly
                                  ) {
                                    handleEdit(
                                      event
                                    );
                                  }
                                }}
                              >
                                {event.time && (
                                  <span className="calendar-event-time">
                                    {formatTime(
                                      event.time
                                    )}
                                  </span>
                                )}

                                <span>
                                  {event.title}
                                </span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {view === "list" && (
            <section className="calendar-list-card">
              <div className="card-header">
                <h2>Upcoming Events</h2>

                <span>
                  {upcomingEvents.length} events
                </span>
              </div>

              {upcomingEvents.length === 0 ? (
                <p className="empty-state">
                  No upcoming events.
                </p>
              ) : (
                <div className="calendar-event-list">
                  {upcomingEvents.map(
                    (event) => (
                      <div
                        key={event.id}
                        className="calendar-event-row"
                      >
                        <div className="calendar-event-date">
                          {formatDate(event.date)}
                        </div>

                        <div className="calendar-event-info">
                          <strong>
                            {event.title}
                          </strong>

                          <div className="calendar-event-meta">
                            {event.time && (
                              <span>
                                {formatTime(
                                  event.time
                                )}
                              </span>
                            )}

                            {event.calendarName && (
                              <span>
                                {event.calendarName}
                              </span>
                            )}

                            <span
                              className={`calendar-source calendar-source--${event.source.toLowerCase()}`}
                            >
                              {event.source}
                            </span>
                          </div>
                        </div>

                        {!event.readOnly && (
                          <div className="calendar-event-actions">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() =>
                                handleEdit(event)
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="delete-button"
                              onClick={() =>
                                handleDelete(
                                  event.id
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          )}

          {view === "countdown" && (
            <section className="countdown-grid">
              {upcomingEvents.map((event) => {
                const daysAway =
                  getDaysAway(event.date);

                return (
                  <div
                    key={event.id}
                    className="countdown-card"
                  >
                    <div className="countdown-number">
                      {daysAway}
                    </div>

                    <div className="countdown-label">
                      {daysAway === 1
                        ? "day"
                        : "days"}
                    </div>

                    <h3>{event.title}</h3>

                    <p>
                      {formatDate(event.date)}

                      {event.time
                        ? ` · ${formatTime(
                            event.time
                          )}`
                        : ""}
                    </p>

                    {event.calendarName && (
                      <p className="calendar-name">
                        {event.calendarName}
                      </p>
                    )}

                    <span
                      className={`calendar-source calendar-source--${event.source.toLowerCase()}`}
                    >
                      {event.source}
                    </span>

                    {!event.readOnly && (
                      <div className="countdown-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            handleEdit(event)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            handleDelete(
                              event.id
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </section>
    </>
  );
}

export default Calendar;