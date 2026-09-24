# The demo opener: a founder reads her phone, and the recap is on it

Twenty seconds that say what DailyRecap is without a word: a founder sits back at the end
of the day, picks up her phone, reads; the camera goes into the phone and the day's recap
is playing there, then fills the frame as a vertical feed. Built on 2026-09-24. The working
files live in `work/demo/` (not committed); the outputs are in the GitHub release `v0.1-demo`.

## What worked, in order of importance

1. **First and last frame, not a text prompt.** Two stills with `nano-banana-pro` (1k,
   16:9), the same character sheet word for word in both prompts, then
   `veo3.1-image-to-video` with `image_url` (first) and `last_image` (last). Veo interpolates
   the camera move and the gesture between them instead of inventing them. Text-to-video
   alone, even with the standard model, gave "showing the phone to the camera" instead of
   reading it, and the fast model added dust and grain. Cost: two stills plus US$ 2.50.
2. **The screen is a plain bright green** in the still, so the recap can be keyed in.
   The key is applied **only inside the phone's rectangle** (crop, `colorkey` by RGB
   distance, overlay the clip behind, paste back). Keying the whole frame ate the city
   bokeh and the lamp: the first opener had black holes everywhere.
3. **The camera enters the phone with a digital push-in**, not with a Veo move: the last
   0.8 s are scaled 2× and driven by `zoompan` toward the screen center, then a hard cut
   to the clip full-frame at the same clip time. The clip on the phone runs on the
   composition's clock, so the full-frame part continues from that time (7.95 s), and so
   does its audio.
4. **The feed panel** is the 9:16 clip on a blurred, darkened copy of itself, corners
   rounded with a `geq` alpha mask. Music: the engine's synthesized bed under everything,
   at 0.22, faded in and out. The founder shot keeps its own ambient sound until the phone
   lights up.

Recipe (measures for `founder-04.mp4`): screen rect x 886 y 436 w 158 h 262, screen
center 965×567, key `#C1EAC5`, clip shown from 7.45 s, push-in 7.15→7.95 s, cut at 7.95 s.
The exact ffmpeg command is in the session log; `work/demo/enter-phone.sh` has the shape.

## Costs of this opener

| step | model | cost |
|---|---|---|
| two stills | nano-banana-pro 1k | ~US$ 2 |
| the shot | veo3.1-image-to-video 1080p 8 s | US$ 2.50 |
| three discarded text-to-video tries | fast ×1, standard ×2 | US$ 5.60 |
| everything else | ffmpeg, the engine | free |
