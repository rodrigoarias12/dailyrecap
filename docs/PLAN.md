# Plan — hackathon OpenClaw 2.0 «Build your startup's first hire»

Estado al 23/9/2026 (noche). Cierre: **28/9 23:59 PT**. Foto del ranking: 30/9.
Ranking: **usuarios válidos × tokens** (usuario válido = instaló el agente y quemó 200k+
tokens en 28 días; tope 100M por persona). Al 23/9 el líder del hackathon tenía 2 usuarios
y 7,4M tokens. Ranking en vivo: https://aiworthusing.com/agent-index → «OpenClaw 2.0
Hackathon» → «View all N agents».

## La idea, en una frase

El primer chief of staff: todos los días le pregunta a la gente y a los otros agentes qué
pasó, verifica lo que puede y le entrega al fundador el recap del día en video (el TikTok
de la empresa); el día uno hace además el video de lanzamiento desde el repo, y cuando se
lo piden el clip «building in public», con lo que pasó de verdad (commits, reuniones, cifras, lo que el equipo escribió en la sesión compartida, y lo
que **los otros agentes de la empresa** le reportan cuando les pregunta).

Por qué el recap diario y no sólo el lanzamiento: la fórmula multiplica tokens por usuario,
y un video de lanzamiento es una ráfaga única; un recap diario es una ráfaga por día hasta
la foto del 30 y después. The Founder Times (un «diario de la mañana» en texto) lleva 608M
de tokens con 5 usuarios: el contenido diario es lo que más quema, y el nuestro es en video.

## Qué está hecho (verificado con render local)

- `video/`: paquete Remotion, nueve tipos de escena, 16:9 y 9:16, música sintetizada en
  código, narración opcional. Tres ejemplos renderizados: lanzamiento, recap, clip vertical.
- Workspace del agente: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`,
  `skills/launch-video`, `skills/daily-recap` (con el cron y la puerta de aprobación sólo
  para lo externo).
- `dev/`: Gateway descartable en Docker sobre la imagen oficial, **verificado el 23/9**:
  Gateway sano, Control UI pareado, agente registrado, y el render corre adentro del
  contenedor Linux (clip vertical en 34 s). Se borra con `compose down -v --rmi local`.
- `cloud/`: Dockerfile sobre la base de Plow, sin verificar en Plow (misma base y mismo
  paquete que `dev/`, que sí renderiza; falta la prueba en amd64 y con sus límites).

## Qué falta, en orden

### Día 1 (24/9) — que corra de punta a punta
1. ~~Instalar OpenClaw~~ Hecho en Docker (`dev/`). Para una instalación nativa en otra
   máquina sirve `openclaw.example.json5`.
2. Video de lanzamiento contra un repo real (YoRobot o Cueva). Ajustar el SKILL.md con lo
   que el modelo hace mal la primera vez.
3. **Recap diario contra PayDece real**: conectar dos o tres repos, correr el cron a mano,
   ver que lea diffs y sesión y que el video diga cosas ciertas. Corregir la skill.
4. **Preguntarle a los otros agentes.** Registrar a Eddie (marketing-agent) en el mismo
   Gateway, habilitar `tools.agentToAgent.allow`, y ver que el recap le pregunte y que su
   respuesta salga con su nombre y con «reported, not verified» cuando no hay fuente.
5. **Medir tokens** de una corrida completa (agentsview los cuenta, es lo que reporta el
   índice). Meta: más de 500k por día por empresa. Si da menos, hacer que lea más (docs,
   issues, changelog) y que revise cuadros del render como imagen.
6. Multiplayer: sesión compartida desde dos identidades (Tailscale Serve +
   `gateway.auth.allowTailscale`), Suggest y `assign_owner`.

### Día 2 (25/9) — Plow
6. `plow-agents login`, `mint`, `docker compose -f cloud/compose.yml up --build`. Pinear
   el digest de la base. Ver si el render entra en el contenedor.
7. Si no entra: camino Latch (render en la Mac del dueño). Documentarlo.
8. `AGENT_ID=dailyrecap`, verificar que el reporte llegue al índice.
9. Evaluar el port a HyperFrames (Apache 2.0, render en la nube de HeyGen): resuelve la
   licencia de Remotion y el render en Plow. Sólo si el día 1 cerró bien.

### Día 3 (26/9) — publicar
10. Repo público (MIT). Push de la imagen (`plow-agents image push`).
11. Postear uid + slug + imagen en el Discord de Plow para la bendición del listing.
12. **El video demo lo hace el agente**: un día real de PayDece contado por el recap, más
    el lanzamiento de DailyRecap sobre sí mismo. Mínimo 60 s. YouTube, link en el listing.

### Días 4 a 6 (27 a 29/9) — instaladores, con el cron corriendo
El código ya no importa. Cuentan las empresas que instalen y dejen el recap corriendo
todos los días.
- Equipo PayDece / YoRobot / Cueva: cada uno instala en su Mac con sus repos.
- Clientes y amigos con producto y equipo (la lista es privada, vive fuera del repo).
- Comunidades: Discord de OpenClaw, Discord de Plow, X y LinkedIn con el clip del día
  (cada clip público lleva «made with DailyRecap»: pedir que lo posteen).
- El «top user» del Mac Mini es la empresa con más días seguidos de recap: decirlo.

## Riesgos conocidos

- **Plow sin ffmpeg ni Chromium y sin límites publicados.** El render en el contenedor es
  la parte no verificada. Plan B: Latch.
- **Datos internos en un video.** El recap es interno y no sale del canal de la empresa; el
  clip público pasa por aprobación y por filtro (sin clientes, sin nombres, sin cifras fuera
  de la lista permitida). Hay que decirlo claro en el listing.
- **Licencia de Remotion.** MIT el código nuestro; Remotion pide licencia de empresa para
  más de 3 personas. Está dicho en el README. HyperFrames lo resolvería.
- **Sin Plow no hay token del índice.** La entrega práctica es Plow aunque Luma lo llame
  opcional.
- **Multiplayer no es un flag.** Aparece con dos identidades en el Gateway; hay que
  configurar el sign-in por persona para el demo.

## Referencias

- Docs OpenClaw: https://docs.openclaw.ai (install, concepts/multi-user, tools/skills, tools/exec, tools/cron, providers/bedrock)
- Base de Plow: https://github.com/plow-pbc/plow-openclaw-agent
- CLI: https://github.com/plow-pbc/plow-agents
- Cliente de reporte: https://github.com/plow-pbc/agent-index-client
- Publicar: https://aiworthusing.com/agent-index/publish
- Molde de agente OpenClaw nativo con Plow: https://github.com/yasuhito/bluepencil
- HyperFrames: https://github.com/heygen-com/hyperframes
- Luma del hackathon: https://luma.com/zhkhsnpa
