# Test scenario (English)

Two fixture colleagues on the Gateway: `ana` (support, answers with a source that can be
opened) and `sam` (sales, answers without a source). Session messages are passed in the
run message. The workspace repo itself is the code source.

Run one recap:

```bash
docker compose -f dev/compose.yml run -T --rm cli agent --agent dailyrecap --thinking low --timeout 900 -m "$(cat dev/run-message.txt)"
# (with Colima and no host socket: run the same from inside the VM, see dev/README.md)
```

## A2A: sam as an agent on "another OpenClaw"

`dev/a2a.json5` exposes `sam` over the Agent2Agent protocol to a peer called `dailyrecap`
(token `A2A_DAILYRECAP_TOKEN` in `dev/.env`; apply with `config patch --file` and recreate
the gateway so the env var is there). The same Gateway plays both sides here for memory's
sake; across machines only the URL changes. Verified 24/9: `sources/a2a.mjs` asked sam and
got `TASK_STATE_COMPLETED` with "Booked 12 demos for next week" in the artifact.
