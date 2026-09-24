# Cómo se sube DailyRecap al hackathon (paso a paso, para Rodrigo)

Hay tres entregas distintas y las tres tienen que estar antes del **28/9 23:59 PT**:

1. **El repo público con licencia MIT.** Hecho: https://github.com/rodrigoarias12/dailyrecap
2. **El listing en el Agent Index con reporte de uso.** Pasa por Plow, y Plow se activa con tu
   teléfono, así que esto lo hacés vos. Son los pasos de abajo.
3. **El video demo de 60 segundos o más**, público (YouTube alcanza), linkeado en el listing.

## A. Plow: cuenta, línea y credencial (10 minutos, con el teléfono a mano)

```bash
cd ~/Documents/GitHub
git clone https://github.com/plow-pbc/plow-agents
export PATH=$PWD/plow-agents/bin:$PATH
plow-agents login          # te manda un SMS
plow-agents lines          # lista de líneas disponibles; elegí una y anotá su LINE_UID
```

Guardá el `LINE_UID`. Es «la línea de teléfono» de tu instancia de DailyRecap en Plow.

## B. La imagen la construye GitHub Actions

`.github/workflows/image.yml` construye `cloud/Dockerfile` para linux/amd64 en cada push a
`main` que toque `cloud/`, `video/`, `skills/`, `AGENTS.md` o `HEARTBEAT.md`, y la sube a
`ghcr.io/rodrigoarias12/dailyrecap:v1` (y `:<sha>`). El paquete quedó público (se comprobó
bajando el manifest sin credenciales). Para forzar un build: `gh workflow run image`.

El digest de la versión desplegada se lee así:

```bash
TOKEN=$(curl -s "https://ghcr.io/token?scope=repository:rodrigoarias12/dailyrecap:pull" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -sI -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json" https://ghcr.io/v2/rodrigoarias12/dailyrecap/manifests/v1 | grep -i docker-content-digest
```

(Construirla en esta Mac también funciona con `docker buildx build --platform linux/amd64`,
pero es emulación lenta y el push necesita `gh auth refresh -s write:packages`.)

## C. Desplegarlo en tu propia línea y probarlo

```bash
plow-agents deploy ghcr.io/rodrigoarias12/dailyrecap@sha256:… --line LINE_UID
plow-agents agents                             # estado: provisioning → running
```

`mint` es sólo para correr la imagen local (escribe `./plow-credentials`); Plow admite un
agente por línea, así que antes de `deploy` hay que retirar el de `mint` con
`plow-agents revoke`. Hecho el 24/9: línea **ln_p1 (Willow, +1 650 346 6610)**, agente
hospedado `487a96ae524efd3c3ebc5243778e68c2`, imagen `@sha256:a605cc17…`.

Mandale un mensaje a ese número desde tu teléfono. Tu primer mensaje arranca la conversación.
Pedile «who are you» y después «daily-recap: run». Si el render no entra en el contenedor de
Plow (los límites no están publicados), el plan B está en `cloud/README.md` (Latch).

Verificado el 24/9 corriendo esta misma imagen en la Mac (emulación amd64, línea Willow):
arranca, resuelve la identidad de la línea, conecta el canal de Plow, y la voz y la música se
generan adentro. El render de Remotion no se pudo probar emulado porque Chrome no corre bajo
qemu (`type=gpu-process`); es un límite de la emulación, no de Plow. La primera corrida de
«daily-recap: run» en Plow real es la prueba que falta.

Para correr la imagen local: `docker compose -f cloud/compose.yml -f cloud/compose.local.yml up
--build -d` (el override saltea `tini`, que tampoco funciona emulado).

## D. El listing en el índice

En `cloud/Dockerfile` ya están `AGENT_ID=dailyrecap`, `AGENT_NAME` y `AGENT_BLURB`. Con eso, al
arrancar en Plow, el agente registra su página en aiworthusing.com/agent-index/dailyrecap y
reporta tokens cada cinco minutos.

Para que aparezca en el ranking del hackathon con «1-click deploy», un admin tiene que
bendecirlo. Se pide en el Discord de Plow (https://discord.gg/fDY2bBThRs, canal del agent
index, a Dane Delattre) con este mensaje:

> Publishing **DailyRecap** for the OpenClaw 2.0 hackathon.
> uid: `<salida de plow-agents profile --show>`
> slug: `dailyrecap`
> image: `ghcr.io/rodrigoarias12/dailyrecap@sha256:…`
> repo: https://github.com/rodrigoarias12/dailyrecap (MIT)
> demo: https://youtu.be/…
> Your startup's first chief of staff: every evening it asks your team and your other
> agents what happened, verifies it, and hands you a one-minute video of the day.

Actualizaciones después: `plow-agents image push ghcr.io/…:v2 --promote dailyrecap`.

## E. El video demo (≥ 60 s)

Lo hace el agente: el recap de un día real de PayDece más el lanzamiento de DailyRecap sobre
sí mismo. Guion en `docs/SUBMISSION.md`. Subilo a YouTube como público y pegá el link en el
mensaje de Discord y en el listing.

## F. Que los tokens cuenten

El ranking es usuarios válidos × tokens. Un usuario válido es una instalación con más de
200k tokens en 28 días. Cada persona que instale desde el índice («Set this up for me:
aiworthusing.com/agent-index/dailyrecap», por iMessage a Plow) es un contenedor propio con
su línea. Una corrida del recap anda en medio millón de tokens; con el cron diario, cada
instalador pasa el umbral el primer día.

## Base de Plow

La imagen base se publica una por commit de `plow-pbc/plow-openclaw-agent`, sin `latest`:
`public.ecr.aws/e1h7x4a2/plow-cloud-agents:base-<sha>@sha256:<digest>`. La primera línea de
`cloud/Dockerfile` tiene que apuntar a una concreta. Para ver la última:

```bash
gh api repos/plow-pbc/plow-openclaw-agent/commits --jq '.[0].sha'
```

y el digest se lee del registro (está anotado en el Dockerfile cuando se pineó).
