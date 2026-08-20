import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import {
  Link,
} from "react-router-dom";

import {
  db,
} from "../services/firebase";

import {
  useGoogleCalendar,
} from "../context/GoogleCalendarContext";

import {
  useOutlookCalendar,
} from "../context/OutlookCalendarContext";

import {
  getWeather,
  getWeatherIcon,
  getWeatherLabel,
} from "../services/weather";

function Dashboard() {
  const [
    tasks,
    setTasks,
  ] = useState([]);

  const [
    notes,
    setNotes,
  ] = useState([]);

  const [
    cmdcEvents,
    setCmdcEvents,
  ] = useState([]);

  const [
    weather,
    setWeather,
  ] = useState(null);

  const [
    weatherLoading,
    setWeatherLoading,
  ] = useState(true);

  const [
    weatherError,
    setWeatherError,
  ] = useState(null);

  const {
    googleEvents,
  } = useGoogleCalendar();

  const {
    outlookEvents,
  } = useOutlookCalendar();

  /*
   * FIRESTORE
   */

  useEffect(() => {
    const tasksQuery =
      query(
        collection(
          db,
          "tasks"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        tasksQuery,
        (snapshot) => {
          setTasks(
            snapshot.docs.map(
              (taskDoc) => ({
                id:
                  taskDoc.id,

                ...taskDoc.data(),
              })
            )
          );
        }
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const notesQuery =
      query(
        collection(
          db,
          "notes"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        notesQuery,
        (snapshot) => {
          setNotes(
            snapshot.docs.map(
              (noteDoc) => ({
                id:
                  noteDoc.id,

                ...noteDoc.data(),
              })
            )
          );
        }
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const eventsQuery =
      query(
        collection(
          db,
          "events"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        eventsQuery,
        (snapshot) => {
          setCmdcEvents(
            snapshot.docs.map(
              (eventDoc) => ({
                id:
                  eventDoc.id,

                ...eventDoc.data(),
              })
            )
          );
        }
      );

    return unsubscribe;
  }, []);

  /*
   * WEATHER
   */

  useEffect(() => {
    let cancelled =
      false;

    const loadWeather =
      async () => {
        try {
          setWeatherLoading(
            true
          );

          setWeatherError(
            null
          );

          const data =
            await getWeather();

          if (!cancelled) {
            setWeather(data);
          }
        } catch (error) {
          console.error(
            "Unable to load weather:",
            error
          );

          if (!cancelled) {
            setWeatherError(
              error.message
            );
          }
        } finally {
          if (!cancelled) {
            setWeatherLoading(
              false
            );
          }
        }
      };

    loadWeather();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * DATE HELPERS
   */

  const getDateString =
    (dateValue) => {
      const year =
        dateValue.getFullYear();

      const month =
        String(
          dateValue.getMonth() +
            1
        ).padStart(
          2,
          "0"
        );

      const day =
        String(
          dateValue.getDate()
        ).padStart(
          2,
          "0"
        );

      return `${year}-${month}-${day}`;
    };

  const getEventStartDateTime =
    (event) => {
      const [
        year,
        month,
        day,
      ] = event.date
        .split("-")
        .map(Number);

      /*
       * All-day events:
       * treat them as starting at
       * midnight of that date.
       */
      if (!event.time) {
        return new Date(
          year,
          month - 1,
          day,
          0,
          0,
          0,
          0
        );
      }

      const [
        hour,
        minute,
      ] = event.time
        .split(":")
        .map(Number);

      return new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        0,
        0
      );
    };

  const today =
    new Date();

  const todayString =
    getDateString(today);

  const tomorrow =
    new Date(today);

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  const tomorrowString =
    getDateString(
      tomorrow
    );

  /*
   * TASKS
   */

  const taskIsComplete =
    (task) => {
      if (
        task.completed === true
      ) {
        return true;
      }

      const status =
        String(
          task.status || ""
        ).toLowerCase();

      return [
        "done",
        "complete",
        "completed",
      ].includes(status);
    };

  const openTasks =
    useMemo(
      () =>
        tasks.filter(
          (task) =>
            !taskIsComplete(
              task
            )
        ),
      [tasks]
    );

  const todayTasks =
    useMemo(
      () =>
        openTasks
          .filter(
            (task) =>
              task.dueDate ===
              todayString
          )
          .sort(
            (a, b) => {
              const order = {
                high: 0,
                medium: 1,
                low: 2,
              };

              return (
                (
                  order[
                    a.priority
                  ] ?? 3
                ) -
                (
                  order[
                    b.priority
                  ] ?? 3
                )
              );
            }
          ),
      [
        openTasks,
        todayString,
      ]
    );

  const overdueTasks =
    useMemo(
      () =>
        openTasks.filter(
          (task) =>
            task.dueDate &&
            task.dueDate <
              todayString
        ),
      [
        openTasks,
        todayString,
      ]
    );

  /*
   * CALENDAR
   */

  const allEvents =
    useMemo(
      () => [
        ...cmdcEvents,
        ...googleEvents,
        ...outlookEvents,
      ],
      [
        cmdcEvents,
        googleEvents,
        outlookEvents,
      ]
    );

  const upcomingEvents =
    useMemo(
      () =>
        [...allEvents]
          .filter(
            (event) =>
              event.date >=
              todayString
          )
          .sort(
            (a, b) => {
              const first =
                getEventStartDateTime(
                  a
                );

              const second =
                getEventStartDateTime(
                  b
                );

              return (
                first -
                second
              );
            }
          ),
      [
        allEvents,
        todayString,
      ]
    );

  const todayEvents =
    useMemo(
      () =>
        upcomingEvents.filter(
          (event) =>
            event.date ===
            todayString
        ),
      [
        upcomingEvents,
        todayString,
      ]
    );

  /*
   * REAL NEXT EVENT
   */

  const nextEventId =
    useMemo(() => {
      const now =
        new Date();

      const nextEvent =
        upcomingEvents.find(
          (event) => {
            /*
             * All-day event today
             * can still count as current.
             */
            if (
              !event.time &&
              event.date ===
                todayString
            ) {
              return true;
            }

            const eventStart =
              getEventStartDateTime(
                event
              );

            return (
              eventStart >= now
            );
          }
        );

      return (
        nextEvent?.id ||
        null
      );
    }, [
      upcomingEvents,
      todayString,
    ]);

  /*
   * NOTES
   */

  const pinnedNotes =
    useMemo(
      () =>
        notes.filter(
          (note) =>
            note.pinned
        ),
      [notes]
    );

  /*
   * FORMATTERS
   */

  const formatTime =
    (timeString) => {
      if (!timeString) {
        return "All day";
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
          hour:
            "numeric",

          minute:
            "2-digit",
        }
      );
    };

  const formatEventDate =
    (dateString) => {
      if (
        dateString ===
        todayString
      ) {
        return "Today";
      }

      if (
        dateString ===
        tomorrowString
      ) {
        return "Tomorrow";
      }

      const [
        year,
        month,
        day,
      ] =
        dateString.split(
          "-"
        );

      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      ).toLocaleDateString(
        "en-US",
        {
          weekday:
            "short",

          month:
            "short",

          day:
            "numeric",
        }
      );
    };

  const displayDate =
    today.toLocaleDateString(
      "en-US",
      {
        weekday:
          "long",

        month:
          "long",

        day:
          "numeric",

        year:
          "numeric",
      }
    );

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            CMDC
          </p>

          <h1>
            Command Center
          </h1>

          <p className="date">
            {displayDate}
          </p>
        </div>

        <div className="dashboard-stats">
          <Link
            to="/tasks"
            className="dashboard-stat"
          >
            <strong>
              {openTasks.length}
            </strong>

            <span>
              Open Tasks
            </span>
          </Link>

          <Link
            to="/tasks"
            className="dashboard-stat"
          >
            <strong>
              {todayTasks.length}
            </strong>

            <span>
              Due Today
            </span>
          </Link>

          <Link
            to="/calendar"
            className="dashboard-stat"
          >
            <strong>
              {todayEvents.length}
            </strong>

            <span>
              Events Today
            </span>
          </Link>

          <Link
            to="/notes"
            className="dashboard-stat"
          >
            <strong>
              {pinnedNotes.length}
            </strong>

            <span>
              Pinned Notes
            </span>
          </Link>
        </div>
      </header>

      <section className="dashboard-grid">
        {/* TASKS */}

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="eyebrow">
                TODAY
              </p>

              <h2>
                Tasks
              </h2>
            </div>

            <Link
              to="/tasks"
              className="dashboard-view-link"
            >
              View all →
            </Link>
          </div>

          {todayTasks.length ===
          0 ? (
            <div className="dashboard-empty">
              <span className="dashboard-empty-icon">
                ✓
              </span>

              <strong>
                Nothing due today
              </strong>

              <span>
                {overdueTasks.length >
                0
                  ? `${overdueTasks.length} overdue task${
                      overdueTasks.length ===
                      1
                        ? ""
                        : "s"
                    } remain.`
                  : "Your task list is clear."}
              </span>
            </div>
          ) : (
            <div className="dashboard-task-list">
              {todayTasks
                .slice(
                  0,
                  4
                )
                .map(
                  (task) => (
                    <Link
                      key={
                        task.id
                      }
                      to="/tasks"
                      className="dashboard-task-row"
                    >
                      <div className="dashboard-task-title">
                        {
                          task.title
                        }
                      </div>

                      <div className="dashboard-task-meta">
                        {task.priority && (
                          <span
                            className={`dashboard-priority dashboard-priority--${task.priority}`}
                          >
                            {
                              task.priority
                            }
                          </span>
                        )}

                        {task.status && (
                          <span>
                            {
                              task.status
                            }
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                )}

              {todayTasks.length >
                4 && (
                <Link
                  to="/tasks"
                  className="dashboard-more-link"
                >
                  +{" "}
                  {todayTasks.length -
                    4}{" "}
                  more
                </Link>
              )}
            </div>
          )}
        </article>

        {/* SCHEDULE */}

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="eyebrow">
                NEXT UP
              </p>

              <h2>
                Schedule
              </h2>
            </div>

            <Link
              to="/calendar"
              className="dashboard-view-link"
            >
              Calendar →
            </Link>
          </div>

          {upcomingEvents.length ===
          0 ? (
            <div className="dashboard-empty">
              <span className="dashboard-empty-icon">
                ○
              </span>

              <strong>
                Nothing scheduled
              </strong>

              <span>
                Your calendar is
                clear.
              </span>
            </div>
          ) : (
            <div className="dashboard-event-list">
              {upcomingEvents
                .slice(
                  0,
                  8
                )
                .map(
                  (event) => {
                    const isNext =
                      event.id ===
                      nextEventId;

                    return (
                      <Link
                        key={
                          event.id
                        }
                        to="/calendar"
                        className={`dashboard-event-row ${
                          isNext
                            ? "dashboard-event-row--next"
                            : ""
                        }`}
                      >
                        <div className="dashboard-event-date">
                          {isNext && (
                            <span className="dashboard-next-label">
                              NEXT
                            </span>
                          )}

                          <strong>
                            {formatEventDate(
                              event.date
                            )}
                          </strong>

                          <span>
                            {formatTime(
                              event.time
                            )}
                          </span>
                        </div>

                        <div className="dashboard-event-info">
                          <strong>
                            {
                              event.title
                            }
                          </strong>

                          <div className="dashboard-event-meta">
                            {event.location && (
                              <span className="dashboard-event-location">
                                {
                                  event.location
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
                      </Link>
                    );
                  }
                )}
            </div>
          )}
        </article>

        {/* WEATHER */}

        <article className="dashboard-panel dashboard-weather">
          <div className="dashboard-panel-header">
            <div>
              <p className="eyebrow">
                WEATHER
              </p>

              <h2>
                Today
              </h2>
            </div>
          </div>

          {weatherLoading ? (
            <div className="dashboard-empty">
              <span>
                Loading weather...
              </span>
            </div>
          ) : weatherError ||
            !weather ? (
            <div className="dashboard-empty">
              <strong>
                Weather unavailable
              </strong>
            </div>
          ) : (
            <div className="weather-content">
              <div className="weather-main">
                <div className="weather-icon">
                  {getWeatherIcon(
                    weather.weatherCode
                  )}
                </div>

                <div>
                  <div className="weather-temperature">
                    {Math.round(
                      weather.temperature
                    )}
                    °
                  </div>

                  <div className="weather-condition">
                    {getWeatherLabel(
                      weather.weatherCode
                    )}
                  </div>

                  <div className="weather-location">
                    {
                      weather.location
                    }
                  </div>
                </div>
              </div>

              <div className="weather-details">
                <div>
                  <span>
                    Feels
                  </span>

                  <strong>
                    {Math.round(
                      weather.feelsLike
                    )}
                    °
                  </strong>
                </div>

                <div>
                  <span>
                    High
                  </span>

                  <strong>
                    {Math.round(
                      weather.high
                    )}
                    °
                  </strong>
                </div>

                <div>
                  <span>
                    Low
                  </span>

                  <strong>
                    {Math.round(
                      weather.low
                    )}
                    °
                  </strong>
                </div>

                <div>
                  <span>
                    Rain
                  </span>

                  <strong>
                    {
                      weather.precipitation
                    }
                    %
                  </strong>
                </div>
              </div>
            </div>
          )}
        </article>

        {/* PINNED NOTES */}

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="eyebrow">
                QUICK REFERENCE
              </p>

              <h2>
                Pinned Notes
              </h2>
            </div>

            <Link
              to="/notes"
              className="dashboard-view-link"
            >
              Notes →
            </Link>
          </div>

          {pinnedNotes.length ===
          0 ? (
            <div className="dashboard-empty">
              <span className="dashboard-empty-icon">
                ☆
              </span>

              <strong>
                No pinned notes
              </strong>

              <span>
                Pin something you
                use often.
              </span>
            </div>
          ) : (
            <div className="dashboard-notes-grid">
              {pinnedNotes
                .slice(
                  0,
                  3
                )
                .map(
                  (note) => (
                    <Link
                      key={
                        note.id
                      }
                      to="/notes"
                      className="dashboard-note-card"
                    >
                      <div className="dashboard-note-title">
                        <span>
                          ★
                        </span>

                        <strong>
                          {note.title ||
                            "Untitled Note"}
                        </strong>
                      </div>

                      {note.content && (
                        <p>
                          {
                            note.content
                          }
                        </p>
                      )}
                    </Link>
                  )
                )}

              {pinnedNotes.length >
                3 && (
                <Link
                  to="/notes"
                  className="dashboard-more-link"
                >
                  +{" "}
                  {pinnedNotes.length -
                    3}{" "}
                  more
                </Link>
              )}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

export default Dashboard;