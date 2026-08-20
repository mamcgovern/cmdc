import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());

app.get("/api/outlook-calendar", async (req, res) => {
  try {
    const outlookUrl =
      process.env.OUTLOOK_CALENDAR_ICS;

    if (!outlookUrl) {
      return res.status(500).json({
        error:
          "OUTLOOK_CALENDAR_ICS is missing from the server environment.",
      });
    }

    const response = await fetch(outlookUrl);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Outlook returned HTTP ${response.status}.`,
      });
    }

    const icsText =
      await response.text();

    res.setHeader(
      "Content-Type",
      "text/calendar; charset=utf-8"
    );

    res.send(icsText);
  } catch (error) {
    console.error(
      "Outlook proxy failed:",
      error
    );

    res.status(500).json({
      error:
        "Unable to load Outlook calendar.",
    });
  }
});

const PORT =
  process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(
    `CMDC server running at http://localhost:${PORT}`
  );
});