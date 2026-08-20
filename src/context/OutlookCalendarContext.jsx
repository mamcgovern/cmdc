import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getOutlookCalendarEvents,
} from "../services/outlookCalendar";

const OutlookCalendarContext =
  createContext(null);

export function OutlookCalendarProvider({
  children,
}) {
  const [
    outlookEvents,
    setOutlookEvents,
  ] = useState([]);

  const [
    outlookLoading,
    setOutlookLoading,
  ] = useState(true);

  const [
    outlookError,
    setOutlookError,
  ] = useState(null);

  const loadOutlookCalendar =
    async () => {
      try {
        setOutlookLoading(true);
        setOutlookError(null);

        const events =
          await getOutlookCalendarEvents();

        setOutlookEvents(events);
      } catch (error) {
        console.error(
          "Unable to load Outlook calendar:",
          error
        );

        setOutlookEvents([]);

        setOutlookError(
          error.message ||
            "Unable to load Outlook calendar."
        );
      } finally {
        setOutlookLoading(false);
      }
    };

  useEffect(() => {
    loadOutlookCalendar();
  }, []);

  const value = {
    outlookEvents,
    outlookLoading,
    outlookError,
    refreshOutlookCalendar:
      loadOutlookCalendar,
  };

  return (
    <OutlookCalendarContext.Provider
      value={value}
    >
      {children}
    </OutlookCalendarContext.Provider>
  );
}

export function useOutlookCalendar() {
  const context =
    useContext(
      OutlookCalendarContext
    );

  if (!context) {
    throw new Error(
      "useOutlookCalendar must be used inside OutlookCalendarProvider."
    );
  }

  return context;
}