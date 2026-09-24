# Test scenario (English)

Two fixture colleagues on the Gateway: `ana` (support, answers with a source that can be
opened) and `sam` (sales, answers without a source). Session messages are passed in the
run message. The workspace repo itself is the code source.

Run one recap:

```bash
docker compose -f dev/compose.yml run -T --rm cli agent --agent dailyrecap --thinking low --timeout 900 -m "$(cat dev/run-message.txt)"
# (with Colima and no host socket: run the same from inside the VM, see dev/README.md)
```
