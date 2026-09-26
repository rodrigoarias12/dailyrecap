"""Free neural voice with word timings, through edge-tts (Microsoft voices, no key).

  tts.py <voice> <out.mp3> <out.json> < text

Writes the mp3 and a JSON list of words [{"w": "Hello", "s": 0.05, "e": 0.31}] in seconds
from the start of the clip, from the service's own word boundaries. The renderer uses them
for captions that light up with the voice.
"""
import asyncio, json, os, sys
import edge_tts

voice, out_mp3, out_json = sys.argv[1], sys.argv[2], sys.argv[3]
text = sys.stdin.read().strip()

async def run():
    words = []
    with open(out_mp3, "wb") as f:
        async for chunk in edge_tts.Communicate(text, voice, rate=os.environ.get("TTS_RATE", "+4%"), boundary="WordBoundary").stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                s = chunk["offset"] / 1e7
                words.append({"w": chunk["text"], "s": round(s, 3), "e": round(s + chunk["duration"] / 1e7, 3)})
    json.dump(words, open(out_json, "w"))
    print(f"{len(words)} words · {words[-1]['e'] if words else 0}s")

asyncio.run(run())
