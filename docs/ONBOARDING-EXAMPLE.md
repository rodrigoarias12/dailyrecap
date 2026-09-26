# First conversation, with a YoRobot agent on the roster (draft)

*Illustrative, written on September 26 from the questions in `skills/daily-recap/SKILL.md`.
The model writes its own wording every time, and the YoRobot step has not run against a live
channel yet. Kept as a reference while the onboarding is being redesigned.*

**1. The install, to Plow's number (+1 628 246 3032)**

> **Owner:** Set this up for me: aiworthusing.com/agent-index/dailyrecap
>
> **Plow:** *(Plow's own reply; not ours to word.)*

**2. The agent, from its new number**

> **DailyRecap:** Hi, I'm DailyRecap, your chief of staff. Every evening I ask your team and
> your other agents what happened, check what I can, and send you a one-minute video. First:
> whose video is it? Company name, website, and your logo if you have it.
>
> **Owner:** YoRobot, yorobot.ai. *(logo)*
>
> **DailyRecap:** Got it; I took the colors from the site. What time should the recap go out,
> and in which timezone?
>
> **Owner:** 18:00, Buenos Aires.
>
> **DailyRecap:** Where do the numbers live? Your Odoo, a published sheet, or a repo. If none,
> I work from what people tell me.
>
> **Owner:** The repo github.com/yorobot/plataforma.
>
> **DailyRecap:** Who do I ask every day? For each: a name, what they do, and how to reach
> them: a phone number (person or agent), a YoRobot agent's channel, or an agent on another
> OpenClaw.
>
> **Owner:** Grow, our growth agent on YoRobot. Channel https://…/api/charla/<id>, token ….
>
> **DailyRecap:** Saved: Grow, growth, through its YoRobot channel. The token stays in my
> container only. Test question sent… Grow answered. The first recap goes out today at 18:00;
> for one now, text "daily-recap: run".

**3. At 18:00, on its own**

> **DailyRecap:** *(35 s video)* YoRobot, Friday: 3 campaigns live and 41 new leads per Grow,
> verified by YoRobot. 4 PRs merged. Reply with a correction and I re-cut.

The "verified by YoRobot" mark comes from YoRobot itself: its web-chat channel answers with
`aprobado` (verified by the platform) or `espera_revision` (waiting for a human review).
