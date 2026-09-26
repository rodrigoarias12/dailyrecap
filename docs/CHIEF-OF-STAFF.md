# What "chief of staff" means, and which part DailyRecap does

*Research of September 26, 2026, for talks and for the roadmap.*

## The job

A startup chief of staff runs the operating cadence and keeps the CEO's picture of the
company true: "connective tissue across teams", air cover, special projects
([a16z, 2026](https://a16z.com/newsletter/how-to-hire-a-chief-of-staff/)). Three pillars:
strategic alignment, operational execution, and communication and filtering
([Chief of Staff Network](https://www.chiefofstaff.network/blog/what-does-a-chief-of-staff-do-a-guide-to-the-most-versatile-role-in-business)).
Calendar and inbox work is at most about a fifth of it; that is the executive assistant's job.

The artifacts a chief of staff produces, week after week
([HashiCorp's playbook, First Round](https://review.firstround.com/focus-on-your-first-10-systems-not-just-your-first-10-hires-this-chief-of-staff-shares-his-playbook/)):

1. The weekly update or reporting pack: numbers, wins, what is stuck.
2. Weekly and quarterly business reviews.
3. The board and investor update; pre-reads for meetings.
4. The action-item tracker: who committed to what, and whether it happened.
5. The decision log.

## What DailyRecap does today

The daily slice of "communication and filtering": it asks every person and every agent what
happened, checks each claim against the systems of record (git, CI, issues, Odoo, the KPI
sheet), marks the rest "reported, not verified", and gives the CEO one minute that says which
is which.

**On stage:** "A chief of staff makes sure the CEO knows what is really happening and that what
was decided actually gets done. DailyRecap does the first half every evening: it asks everyone,
people and agents, what happened, checks it against the systems, and tells the CEO in one minute
what is verified and what is only claimed."

## Who else is building it

Most "AI chief of staff" products are executive assistants: inbox, calendar, meeting notes
(alfred_, Lindy, Read AI, Granola, Motion). The ones that do the chief of staff's job read tools
over OAuth or sit in meetings: Bond (YC S25, a daily brief for CEOs from Slack, Jira, GitHub,
Salesforce), Mesmer (YC X25, a weekly report for CTOs), Ambient (initiative tracking, $100 per
user per month). On the Agent Index, Founder Agent is the closest (a technical chief of staff
for solo founders); Repro Relay turns meeting notes into action items.

None of them asks people and agents directly and labels each claim verified or reported.
That is DailyRecap's difference.

## Next, in order

1. **Did it happen?** Pull tomorrow's commitments out of each recap, ask their owner the next
   evening, check the system, report closed, slipped or unverifiable.
2. **Friday business review.** The five recaps rolled up: KPI deltas, the verified-to-reported
   ratio, the top three blockers. A 60–90 s video and a one-page memo.
3. **Monthly investor update draft.** Highlights, lowlights, asks, KPIs, every number tagged;
   sent only after the CEO approves.
4. **Meeting pre-reads** from the calendar on the owner's Mac: three bullets 30 minutes before.
5. **Decision log.** A blocker that needs the CEO becomes a question, the answer goes to the
   agents concerned, and the next recap confirms it was acted on.
