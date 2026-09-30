
// DailyRecap's overrides, appended to the base's /opt/plow/boot/config.js by cloud/Dockerfile
// (the base's function is renamed renderConfigBase; boot imports this renderConfig). Same
// mechanism as Milo's boot/milo-config.js.
export function renderConfig(identity, apiBase, ...rest) {
  const config = renderConfigBase(identity, apiBase, ...rest);
  // Claude Sonnet 5 first, GLM 5.2 as the fallback. On GLM, between 28 and 30/9, the agent skipped
  // the "on it" message before the first video, thanked another agent in a group thread (which
  // answered three times), and told the owner the line could not open threads after it had.
  // Both models are the base's own, served by Plow.
  config.agents.defaults.model = { primary: "plow/anthropic/claude-sonnet-5", fallbacks: ["plow/z-ai/glm-5.2"] };
  return config;
}
