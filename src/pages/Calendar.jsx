import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
import { useOutlookCalendar } from "../context/OutlookCalendarContext";

function Calendar() {
  const [view, setView] = useState("calendar");

  const [calendarView, setCalendarView] = useState(
    () =>
      localStorage.getItem("cmdc-calendar-view") ||
      "month"
  );

  const [currentDate, setCurrentDate] = useState(
    new Date()
  );

  const [events, setEvents] = useState([]);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");

  const [
    editingEventId,
    setEditingEventId,
  ] = useState(null);

  const [
    googleMenuOpen,
    setGoogleMenuOpen,
  ] = useState(false);

  const [
    selectedEvent,
    setSelectedEvent,
  ] = useState(null);

  const [
    selectedDay,
    setSelectedDay,
  ] = useState(null);

  const [
    favoriteEventIds,
    setFavoriteEventIds,
  ] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          "cmdc-favorite-events"
        ) || "[]"
      );
    } catch {
      return [];
    }
  });

  const googleMenuRef =
    useRef(null);

  const {
    googleEvents,
    googleCalendars,
    googleConnected,
    googleLoading,
    selectedGoogleCalendars,
    connectGoogle,
    toggleGoogleCalendar,
  } = useGoogleCalendar();

  const {
    outlookEvents,
    outlookLoading,
    outlookError,
  } = useOutlookCalendar();

  /*
   * REMEMBER CALENDAR VIEW
   */

  useEffect(() => {
    localStorage.setItem(
      "cmdc-calendar-view",
      calendarView
    );
  }, [calendarView]);

  /*
   * CMDC EVENTS
   */

  useEffect(() => {
    const eventsQuery = query(
      collection(db, "events"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe =
      onSnapshot(
        eventsQuery,
        (snapshot) => {
          setEvents(
            snapshot.docs.map(
              (eventDoc) => ({
                id: eventDoc.id,
                ...eventDoc.data(),
              })
            )
          );
        }
      );

    return unsubscribe;
  }, []);

  /*
   * GOOGLE MENU
   */

  useEffect(() => {
    const handleClickOutside =
      (event) => {
        if (
          googleMenuRef.current &&
          !googleMenuRef.current.contains(
            event.target
          )
        ) {
          setGoogleMenuOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /*
   * FORM
   */

  const resetForm = () => {
    setTitle("");
    setDate("");
    setTime("");
    setLocation("");
    setDetails("");
    setEditingEventId(null);
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!title.trim() || !date) {
      return;
    }

    const eventData = {
      title: title.trim(),
      date,
      time: time || null,
      location:
        location.trim(),
      details:
        details.trim(),
      source: "CMDC",
    };

    if (editingEventId) {
      await updateDoc(
        doc(
          db,
          "events",
          editingEventId
        ),
        {
          ...eventData,
          updatedAt:
            serverTimestamp(),
        }
      );
    } else {
      await addDoc(
        collection(
          db,
          "events"
        ),
        {
          ...eventData,
          createdAt:
            serverTimestamp(),
        }
      );
    }

    resetForm();
  };

  const handleEdit = (
    event
  ) => {
    if (event.readOnly) {
      return;
    }

    setEditingEventId(
      event.id
    );

    setTitle(
      event.title || ""
    );

    setDate(
      event.date || ""
    );

    setTime(
      event.time || ""
    );

    setLocation(
      event.location || ""
    );

    setDetails(
      event.details || ""
    );

    setSelectedEvent(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete =
    async (eventId) => {
      await deleteDoc(
        doc(
          db,
          "events",
          eventId
        )
      );

      if (
        editingEventId === eventId
      ) {
        resetForm();
      }

      setSelectedEvent(null);
    };

  /*
   * FAVORITES
   */

  const isFavorite = (
    eventId
  ) =>
    favoriteEventIds.includes(
      eventId
    );

  const toggleFavorite = (
    eventId
  ) => {
    const updatedFavorites =
      isFavorite(eventId)
        ? favoriteEventIds.filter(
          (id) =>
            id !== eventId
        )
        : [
          ...favoriteEventIds,
          eventId,
        ];

    setFavoriteEventIds(
      updatedFavorites
    );

    localStorage.setItem(
      "cmdc-favorite-events",
      JSON.stringify(
        updatedFavorites
      )
    );
  };

  /*
   * EVENTS
   */

  const allEvents = useMemo(
    () => [
      ...events,
      ...googleEvents,
      ...outlookEvents,
    ],
    [
      events,
      googleEvents,
      outlookEvents,
    ]
  );

  const sortedEvents = useMemo(
    () =>
      [...allEvents].sort(
        (a, b) => {
          const dateCompare =
            a.date.localeCompare(
              b.date
            );

          if (
            dateCompare !== 0
          ) {
            return dateCompare;
          }

          return (
            a.time || ""
          ).localeCompare(
            b.time || ""
          );
        }
      ),
    [allEvents]
  );

  const getTodayString = () => {
    const today = new Date();

    return getDateString(
      today
    );
  };

  const upcomingEvents =
    useMemo(() => {
      const todayString =
        getTodayString();

      return sortedEvents.filter(
        (event) =>
          event.date >=
          todayString
      );
    }, [sortedEvents]);

  const favoriteUpcomingEvents =
    useMemo(
      () =>
        upcomingEvents.filter(
          (event) =>
            favoriteEventIds.includes(
              event.id
            )
        ),
      [
        upcomingEvents,
        favoriteEventIds,
      ]
    );

  /*
   * FORMATTERS
   */

  const formatDate = (
    dateString
  ) => {
    if (!dateString) {
      return "";
    }

    const [
      year,
      month,
      day,
    ] = dateString.split("-");

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  const formatShortDate = (
    dateString
  ) => {
    if (!dateString) {
      return "";
    }

    const [
      year,
      month,
      day,
    ] = dateString.split("-");

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
      }
    );
  };

  const formatTime = (
    timeString
  ) => {
    if (!timeString) {
      return "";
    }

    const [
      hour,
      minute,
    ] = timeString
      .split(":")
      .map(Number);

    return new Date(
      2000,
      0,
      1,
      hour,
      minute
    ).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  const getEventTimeLabel = (
    event
  ) => {
    if (!event.time) {
      return "All day";
    }

    const start =
      formatTime(
        event.time
      );

    if (!event.endTime) {
      return start;
    }

    return `${start} – ${formatTime(
      event.endTime
    )}`;
  };

  const getDaysAway = (
    dateString
  ) => {
    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const [
      year,
      month,
      day,
    ] = dateString.split("-");

    const eventDate =
      new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );

    return Math.ceil(
      (
        eventDate -
        today
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    );
  };

  /*
   * DATE HELPERS
   */

  function getDateString(
    dateValue
  ) {
    const year =
      dateValue.getFullYear();

    const month = String(
      dateValue.getMonth() +
      1
    ).padStart(2, "0");

    const day = String(
      dateValue.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const isToday = (
    dateValue
  ) => {
    const today = new Date();

    return (
      dateValue.getFullYear() ===
      today.getFullYear() &&
      dateValue.getMonth() ===
      today.getMonth() &&
      dateValue.getDate() ===
      today.getDate()
    );
  };

  const getEventsForDate = (
    dateValue
  ) => {
    const dateString =
      typeof dateValue ===
        "string"
        ? dateValue
        : getDateString(
          dateValue
        );

    return sortedEvents.filter(
      (event) =>
        event.date ===
        dateString
    );
  };

  /*
   * MONTH
   */

  const getCalendarDays =
    () => {
      const year =
        currentDate.getFullYear();

      const month =
        currentDate.getMonth();

      const firstDay =
        new Date(
          year,
          month,
          1
        );

      const lastDay =
        new Date(
          year,
          month + 1,
          0
        );

      const startDay =
        firstDay.getDay();

      const days = [];

      for (
        let i =
          startDay - 1;
        i >= 0;
        i--
      ) {
        days.push({
          date:
            new Date(
              year,
              month,
              -i
            ),
          currentMonth:
            false,
        });
      }

      for (
        let day = 1;
        day <=
        lastDay.getDate();
        day++
      ) {
        days.push({
          date:
            new Date(
              year,
              month,
              day
            ),
          currentMonth:
            true,
        });
      }

      let nextMonthDay =
        1;

      while (
        days.length < 42
      ) {
        days.push({
          date:
            new Date(
              year,
              month + 1,
              nextMonthDay
            ),
          currentMonth:
            false,
        });

        nextMonthDay++;
      }

      return days;
    };

  /*
   * WEEK
   */

  const getWeekDays = () => {
    const start =
      new Date(
        currentDate
      );

    start.setHours(
      0,
      0,
      0,
      0
    );

    start.setDate(
      start.getDate() -
      start.getDay()
    );

    return Array.from(
      { length: 7 },
      (_, index) => {
        const date =
          new Date(start);

        date.setDate(
          start.getDate() +
          index
        );

        return date;
      }
    );
  };

  /*
   * NAVIGATION
   */

  const goPrevious = () => {
    if (
      calendarView ===
      "month"
    ) {
      setCurrentDate(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() -
          1,
          1
        )
      );

      return;
    }

    const newDate =
      new Date(
        currentDate
      );

    if (
      calendarView ===
      "week"
    ) {
      newDate.setDate(
        newDate.getDate() -
        7
      );
    } else {
      newDate.setDate(
        newDate.getDate() -
        1
      );
    }

    setCurrentDate(
      newDate
    );
  };

  const goNext = () => {
    if (
      calendarView ===
      "month"
    ) {
      setCurrentDate(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() +
          1,
          1
        )
      );

      return;
    }

    const newDate =
      new Date(
        currentDate
      );

    if (
      calendarView ===
      "week"
    ) {
      newDate.setDate(
        newDate.getDate() +
        7
      );
    } else {
      newDate.setDate(
        newDate.getDate() +
        1
      );
    }

    setCurrentDate(
      newDate
    );
  };

  const goToToday = () => {
    setCurrentDate(
      new Date()
    );
  };

  const openDayView = (
    dateValue
  ) => {
    setCurrentDate(
      new Date(
        dateValue
      )
    );

    setCalendarView(
      "day"
    );
  };

  /*
   * VIEW TITLES
   */

  const calendarDays =
    getCalendarDays();

  const weekDays =
    getWeekDays();

  const monthTitle =
    currentDate.toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    );

  const weekTitle = (() => {
    const first =
      weekDays[0];

    const last =
      weekDays[6];

    if (
      first.getMonth() ===
      last.getMonth() &&
      first.getFullYear() ===
      last.getFullYear()
    ) {
      return `${first.toLocaleDateString(
        "en-US",
        {
          month: "long",
          day: "numeric",
        }
      )} – ${last.toLocaleDateString(
        "en-US",
        {
          day: "numeric",
          year: "numeric",
        }
      )}`;
    }

    return `${first.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
      }
    )} – ${last.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    )}`;
  })();

  const dayTitle =
    currentDate.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );

  const currentCalendarTitle =
    calendarView === "month"
      ? monthTitle
      : calendarView ===
        "week"
        ? weekTitle
        : dayTitle;

  /*
   * MODALS
   */

  const openEvent = (
    event
  ) => {
    setSelectedDay(null);
    setSelectedEvent(event);
  };

  const closeEvent = () => {
    setSelectedEvent(null);
  };

  /*
   * RENDER EVENT BUTTON
   */

  const renderEventButton = (
    event
  ) => (
    <button
      type="button"
      key={event.id}
      className={`calendar-event calendar-event--${event.source.toLowerCase()}`}
      onClick={() =>
        openEvent(event)
      }
    >
      {isFavorite(
        event.id
      ) && (
          <span className="calendar-event-favorite">
            ★
          </span>
        )}

      {event.time && (
        <span className="calendar-event-time">
          {formatTime(
            event.time
          )}
        </span>
      )}

      <span className="calendar-event-title">
        {event.title}
      </span>
    </button>
  );

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">
          CMDC
        </p>

        <h1>
          Calendar
        </h1>

        <p className="date">
          View your work
          schedule in one
          place.
        </p>
      </header>

      <section className="calendar-layout">
        <form
          className="calendar-form"
          onSubmit={
            handleSubmit
          }
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
                onClick={
                  resetForm
                }
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
                setTitle(
                  event.target.value
                )
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
                setDate(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Time

            <input
              type="time"
              value={time}
              onChange={(event) =>
                setTime(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Location

            <input
              type="text"
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value
                )
              }
              placeholder="Optional location"
            />
          </label>

          <label>
            Details

            <textarea
              value={details}
              onChange={(event) =>
                setDetails(
                  event.target.value
                )
              }
              placeholder="Optional notes or details"
              rows="5"
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
              <div
                className="calendar-connection-wrapper"
                ref={
                  googleMenuRef
                }
              >
                {!googleConnected ? (
                  <button
                    type="button"
                    className="calendar-connect-button"
                    onClick={
                      connectGoogle
                    }
                    disabled={
                      googleLoading
                    }
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
                        <strong>
                          Google Connected
                        </strong>

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
                      onClick={() =>
                        setGoogleMenuOpen(
                          (current) =>
                            !current
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
                        Google Calendars
                      </div>

                      <div className="calendar-dropdown-options">
                        {googleCalendars.map(
                          (
                            calendar
                          ) => (
                            <label
                              key={
                                calendar.id
                              }
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
                                {
                                  calendar.summary
                                }

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

              <div className="calendar-connection-wrapper">
                <div
                  className={`calendar-connection-card ${outlookError
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
                  setView(
                    "calendar"
                  )
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
                  view ===
                    "countdown"
                    ? "calendar-view-button active"
                    : "calendar-view-button"
                }
                onClick={() =>
                  setView(
                    "countdown"
                  )
                }
              >
                Countdown
              </button>
            </div>
          </div>

          {outlookError && (
            <div className="calendar-error">
              <strong>
                Outlook calendar
                could not be loaded.
              </strong>

              <span>
                {outlookError}
              </span>
            </div>
          )}

          {view ===
            "calendar" && (
              <>
                <div className="calendar-subtoolbar">
                  <div className="calendar-period-toggle">
                    <button
                      type="button"
                      className={
                        calendarView ===
                          "month"
                          ? "calendar-period-button active"
                          : "calendar-period-button"
                      }
                      onClick={() =>
                        setCalendarView(
                          "month"
                        )
                      }
                    >
                      Month
                    </button>

                    <button
                      type="button"
                      className={
                        calendarView ===
                          "week"
                          ? "calendar-period-button active"
                          : "calendar-period-button"
                      }
                      onClick={() =>
                        setCalendarView(
                          "week"
                        )
                      }
                    >
                      Week
                    </button>

                    <button
                      type="button"
                      className={
                        calendarView ===
                          "day"
                          ? "calendar-period-button active"
                          : "calendar-period-button"
                      }
                      onClick={() =>
                        setCalendarView(
                          "day"
                        )
                      }
                    >
                      Day
                    </button>
                  </div>
                </div>

                <section className="calendar-display">
                  <div className="calendar-display-header">
                    <div>
                      <p className="eyebrow">
                        {calendarView.toUpperCase()}
                      </p>

                      <h2>
                        {
                          currentCalendarTitle
                        }
                      </h2>
                    </div>

                    <div className="month-navigation">
                      <button
                        type="button"
                        onClick={
                          goPrevious
                        }
                      >
                        ←
                      </button>

                      <button
                        type="button"
                        onClick={
                          goToToday
                        }
                      >
                        Today
                      </button>

                      <button
                        type="button"
                        onClick={
                          goNext
                        }
                      >
                        →
                      </button>
                    </div>
                  </div>

                  {/* MONTH VIEW */}

                  {calendarView ===
                    "month" && (
                      <>
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
                              date:
                              dayDate,
                              currentMonth,
                            }) => {
                              const dayEvents =
                                getEventsForDate(
                                  dayDate
                                );

                              const visibleEvents =
                                dayEvents.slice(
                                  0,
                                  5
                                );

                              const hiddenCount =
                                dayEvents.length -
                                visibleEvents.length;

                              return (
                                <div
                                  key={getDateString(
                                    dayDate
                                  )}
                                  className={`calendar-day ${currentMonth
                                      ? ""
                                      : "calendar-day--outside"
                                    } ${isToday(
                                      dayDate
                                    )
                                      ? "calendar-day--today"
                                      : ""
                                    }`}
                                >
                                  <button
                                    type="button"
                                    className="calendar-day-number calendar-day-number--button"
                                    onClick={() =>
                                      openDayView(
                                        dayDate
                                      )
                                    }
                                  >
                                    {
                                      dayDate.getDate()
                                    }
                                  </button>

                                  <div className="calendar-day-events">
                                    {visibleEvents.map(
                                      (
                                        event
                                      ) =>
                                        renderEventButton(
                                          event
                                        )
                                    )}

                                    {hiddenCount >
                                      0 && (
                                        <button
                                          type="button"
                                          className="calendar-more-button"
                                          onClick={() =>
                                            setSelectedDay(
                                              {
                                                date:
                                                  getDateString(
                                                    dayDate
                                                  ),

                                                events:
                                                  dayEvents,
                                              }
                                            )
                                          }
                                        >
                                          +{" "}
                                          {
                                            hiddenCount
                                          }{" "}
                                          more
                                        </button>
                                      )}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </>
                    )}

                  {/* WEEK VIEW */}

                  {calendarView ===
                    "week" && (
                      <div className="week-calendar">
                        {weekDays.map(
                          (
                            dayDate
                          ) => {
                            const dayEvents =
                              getEventsForDate(
                                dayDate
                              );

                            return (
                              <div
                                key={getDateString(
                                  dayDate
                                )}
                                className={`week-day ${isToday(
                                  dayDate
                                )
                                    ? "week-day--today"
                                    : ""
                                  }`}
                              >
                                <button
                                  type="button"
                                  className="week-day-header"
                                  onClick={() =>
                                    openDayView(
                                      dayDate
                                    )
                                  }
                                >
                                  <span>
                                    {dayDate.toLocaleDateString(
                                      "en-US",
                                      {
                                        weekday:
                                          "short",
                                      }
                                    )}
                                  </span>

                                  <strong>
                                    {
                                      dayDate.getDate()
                                    }
                                  </strong>
                                </button>

                                <div className="week-day-events">
                                  {dayEvents.length ===
                                    0 ? (
                                    <span className="week-day-empty">
                                      No events
                                    </span>
                                  ) : (
                                    dayEvents.map(
                                      (
                                        event
                                      ) =>
                                        renderEventButton(
                                          event
                                        )
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}

                  {/* DAY VIEW */}

                  {calendarView ===
                    "day" && (
                      <div className="day-calendar">
                        {getEventsForDate(
                          currentDate
                        ).length ===
                          0 ? (
                          <div className="day-calendar-empty">
                            <p>
                              Nothing scheduled
                              for this day.
                            </p>
                          </div>
                        ) : (
                          <div className="day-event-list">
                            {getEventsForDate(
                              currentDate
                            ).map(
                              (
                                event
                              ) => (
                                <button
                                  type="button"
                                  key={
                                    event.id
                                  }
                                  className="day-event-card"
                                  onClick={() =>
                                    openEvent(
                                      event
                                    )
                                  }
                                >
                                  <div className="day-event-time">
                                    {getEventTimeLabel(
                                      event
                                    )}
                                  </div>

                                  <div className="day-event-content">
                                    <div className="day-event-title-row">
                                      <strong>
                                        {
                                          event.title
                                        }
                                      </strong>

                                      {isFavorite(
                                        event.id
                                      ) && (
                                          <span>
                                            ★
                                          </span>
                                        )}
                                    </div>

                                    <div className="day-event-meta">
                                      {event.location && (
                                        <span>
                                          {
                                            event.location
                                          }
                                        </span>
                                      )}

                                      {event.calendarName && (
                                        <span>
                                          {
                                            event.calendarName
                                          }
                                        </span>
                                      )}

                                      <span
                                        className={`calendar-source calendar-source--${event.source.toLowerCase()}`}
                                      >
                                        {
                                          event.source
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}
                </section>
              </>
            )}

          {/* LIST VIEW */}

          {view === "list" && (
            <section className="calendar-list-card">
              <div className="card-header">
                <h2>
                  Upcoming Events
                </h2>

                <span>
                  {
                    upcomingEvents.length
                  }{" "}
                  events
                </span>
              </div>

              {upcomingEvents.length ===
                0 ? (
                <p className="empty-state">
                  No upcoming events.
                </p>
              ) : (
                <div className="calendar-event-list">
                  {upcomingEvents.map(
                    (
                      event
                    ) => (
                      <div
                        key={
                          event.id
                        }
                        className="calendar-event-row"
                      >
                        <button
                          type="button"
                          className="calendar-favorite-button"
                          onClick={() =>
                            toggleFavorite(
                              event.id
                            )
                          }
                        >
                          {isFavorite(
                            event.id
                          )
                            ? "★"
                            : "☆"}
                        </button>

                        <div className="calendar-event-date">
                          {formatShortDate(
                            event.date
                          )}
                        </div>

                        <button
                          type="button"
                          className="calendar-event-info-button"
                          onClick={() =>
                            openEvent(
                              event
                            )
                          }
                        >
                          <strong>
                            {
                              event.title
                            }
                          </strong>

                          <div className="calendar-event-meta">
                            <span>
                              {getEventTimeLabel(
                                event
                              )}
                            </span>

                            {event.location && (
                              <span>
                                {
                                  event.location
                                }
                              </span>
                            )}

                            {event.calendarName && (
                              <span>
                                {
                                  event.calendarName
                                }
                              </span>
                            )}

                            <span
                              className={`calendar-source calendar-source--${event.source.toLowerCase()}`}
                            >
                              {
                                event.source
                              }
                            </span>
                          </div>
                        </button>

                        {!event.readOnly && (
                          <div className="calendar-event-actions">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() =>
                                handleEdit(
                                  event
                                )
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

          {/* COUNTDOWN */}

          {view ===
            "countdown" && (
              <>
                {favoriteUpcomingEvents.length ===
                  0 ? (
                  <div className="countdown-empty">
                    <div className="countdown-empty-star">
                      ☆
                    </div>

                    <h2>
                      No favorited
                      events
                    </h2>

                    <p>
                      Favorite events
                      from the Calendar
                      or List view to add
                      them to your
                      countdown.
                    </p>
                  </div>
                ) : (
                  <section className="countdown-grid">
                    {favoriteUpcomingEvents.map(
                      (
                        event
                      ) => {
                        const daysAway =
                          getDaysAway(
                            event.date
                          );

                        return (
                          <button
                            type="button"
                            key={
                              event.id
                            }
                            className="countdown-card countdown-card--button"
                            onClick={() =>
                              openEvent(
                                event
                              )
                            }
                          >
                            <div className="countdown-favorite">
                              ★
                            </div>

                            <div className="countdown-number">
                              {
                                daysAway
                              }
                            </div>

                            <div className="countdown-label">
                              {daysAway ===
                                1
                                ? "day"
                                : "days"}
                            </div>

                            <h3>
                              {
                                event.title
                              }
                            </h3>

                            <p>
                              {formatShortDate(
                                event.date
                              )}

                              {" · "}

                              {getEventTimeLabel(
                                event
                              )}
                            </p>

                            {event.calendarName && (
                              <p className="calendar-name">
                                {
                                  event.calendarName
                                }
                              </p>
                            )}

                            <span
                              className={`calendar-source calendar-source--${event.source.toLowerCase()}`}
                            >
                              {
                                event.source
                              }
                            </span>
                          </button>
                        );
                      }
                    )}
                  </section>
                )}
              </>
            )}
        </div>
      </section>

      {/* DAY MODAL */}

      {selectedDay && (
        <div
          className="calendar-modal-backdrop"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedDay(
                null
              );
            }
          }}
        >
          <div className="calendar-modal calendar-day-modal">
            <div className="calendar-modal-header">
              <div>
                <p className="eyebrow">
                  EVENTS
                </p>

                <h2>
                  {formatDate(
                    selectedDay.date
                  )}
                </h2>
              </div>

              <button
                type="button"
                className="calendar-modal-close"
                onClick={() =>
                  setSelectedDay(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="calendar-day-modal-events">
              {selectedDay.events.map(
                (
                  event
                ) => (
                  <div
                    key={
                      event.id
                    }
                    className="calendar-day-modal-event"
                  >
                    <button
                      type="button"
                      className="calendar-favorite-button"
                      onClick={() =>
                        toggleFavorite(
                          event.id
                        )
                      }
                    >
                      {isFavorite(
                        event.id
                      )
                        ? "★"
                        : "☆"}
                    </button>

                    <button
                      type="button"
                      className="calendar-day-event-button"
                      onClick={() =>
                        openEvent(
                          event
                        )
                      }
                    >
                      <strong>
                        {
                          event.title
                        }
                      </strong>

                      <span>
                        {getEventTimeLabel(
                          event
                        )}
                      </span>
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* EVENT DETAILS MODAL */}

      {selectedEvent && (
        <div
          className="calendar-modal-backdrop"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEvent();
            }
          }}
        >
          <div className="calendar-modal">
            <div className="calendar-modal-header">
              <div>
                <div className="calendar-event-modal-source">
                  <span
                    className={`calendar-source calendar-source--${selectedEvent.source.toLowerCase()}`}
                  >
                    {
                      selectedEvent.source
                    }
                  </span>

                  {selectedEvent.calendarName && (
                    <span>
                      {
                        selectedEvent.calendarName
                      }
                    </span>
                  )}
                </div>

                <h2>
                  {
                    selectedEvent.title
                  }
                </h2>
              </div>

              <button
                type="button"
                className="calendar-modal-close"
                onClick={
                  closeEvent
                }
              >
                ×
              </button>
            </div>

            <div className="calendar-event-modal-details">
              <div className="calendar-detail-row">
                <span className="calendar-detail-label">
                  Date
                </span>

                <span>
                  {formatDate(
                    selectedEvent.date
                  )}
                </span>
              </div>

              <div className="calendar-detail-row">
                <span className="calendar-detail-label">
                  Time
                </span>

                <span>
                  {getEventTimeLabel(
                    selectedEvent
                  )}
                </span>
              </div>

              {selectedEvent.location && (
                <div className="calendar-detail-row">
                  <span className="calendar-detail-label">
                    Location
                  </span>

                  <span>
                    {
                      selectedEvent.location
                    }
                  </span>
                </div>
              )}

              {selectedEvent.details && (
                <div className="calendar-detail-description">
                  <span className="calendar-detail-label">
                    Details
                  </span>

                  <p>
                    {
                      selectedEvent.details
                    }
                  </p>
                </div>
              )}
            </div>

            <div className="calendar-modal-actions">
              <button
                type="button"
                className={`calendar-favorite-action ${isFavorite(
                  selectedEvent.id
                )
                    ? "calendar-favorite-action--active"
                    : ""
                  }`}
                onClick={() =>
                  toggleFavorite(
                    selectedEvent.id
                  )
                }
              >
                {isFavorite(
                  selectedEvent.id
                )
                  ? "★ Favorited"
                  : "☆ Add to Countdown"}
              </button>

              {!selectedEvent.readOnly && (
                <>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      handleEdit(
                        selectedEvent
                      )
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete-button calendar-modal-delete"
                    onClick={() =>
                      handleDelete(
                        selectedEvent.id
                      )
                    }
                  >
                    Delete
                  </button>
                </>
              )}

              {selectedEvent.externalUrl && (
                <a
                  href={
                    selectedEvent.externalUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="calendar-external-link"
                >
                  Open in Google
                  Calendar
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Calendar;