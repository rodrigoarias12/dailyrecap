# HEARTBEAT.md

When a heartbeat or a cron wakes you (the same rule lives in `AGENTS.md`, "When you wake up
on your own", for Gateways that do not copy this file):

- **`daily-recap: run`** → run `skills/daily-recap/SKILL.md` end to end for today.
- **A plain heartbeat past the recap hour** (`Recap hour` in `MEMORY.md`), with no
  `shipped/<today>-recap/` yet → the same: run it now and deliver it. Once a day, never twice.
- **Any other heartbeat** → check the session for corrections to the last recap (re-cut if
  there are any), for a clip approval you are waiting on (render if it came), and for a new
  launch-video brief. Nothing to do: your whole reply is exactly `NO_REPLY`, alone, with no
   sentence before or after it. Any other text is delivered to the owner's phone: a status line
   every half hour is spam, and "recap hour has not passed yet" is not news.
