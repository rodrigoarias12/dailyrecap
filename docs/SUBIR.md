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

## B. Construir y subir la imagen (en esta Mac o en la otra)

La imagen es `cloud/Dockerfile`: la base de Plow más ffmpeg, Chromium, edge-tts y el paquete
de video. Antes de construir, revisá que la primera línea tenga el digest pineado (ver el
apartado «Base de Plow» abajo). Después:

```bash
cd ~/Documents/GitHub/dailyrecap
gh auth token | docker login ghcr.io -u rodrigoarias12 --password-stdin   # registro propio
plow-agents image build ghcr.io/rodrigoarias12/dailyrecap:v1
plow-agents image push  ghcr.io/rodrigoarias12/dailyrecap:v1
```

`push` imprime la referencia con digest (`ghcr.io/…/dailyrecap@sha256:…`). Anotala. Hacé el
paquete público en GitHub (Packages → dailyrecap → Package settings → Change visibility),
porque Plow tiene que poder bajarlo sin credenciales.

Ojo: Plow corre **linux/amd64** y esta Mac es arm64. Si `image build` no cruza de
arquitectura solo, construí con buildx: `docker buildx build --platform linux/amd64 -f
cloud/Dockerfile -t ghcr.io/rodrigoarias12/dailyrecap:v1 --push .`

## C. Desplegarlo en tu propia línea y probarlo

```bash
plow-agents mint LINE_UID                      # escribe ./plow-credentials (PLOW_AGENT_TOKEN)
plow-agents deploy ghcr.io/rodrigoarias12/dailyrecap@sha256:… --line LINE_UID
```

Mandale un mensaje a ese número desde tu teléfono. Tu primer mensaje arranca la conversación.
Pedile «who are you» y después «daily-recap: run». Si el render no entra en el contenedor de
Plow (los límites no están publicados), el plan B está en `cloud/README.md` (Latch).

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
