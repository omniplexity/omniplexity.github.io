export function createRouter(store) {
  function parse() {
    const raw = location.hash.replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean);
    const route = parts[0] || "chat";
    const id = parts[1] || null;
    return { route, id };
  }

  function onHash() {
    const r = parse();
    const authed = !!store.get().authenticated;

    if (!authed && r.route !== "login") {
      location.hash = "#/login";
      return;
    }
    if (authed && r.route === "login") {
      location.hash = "#/chat";
      return;
    }

    store.set({ route: r.route, routeId: r.id });
  }

  return {
    start() {
      window.addEventListener("hashchange", onHash);
      if (!location.hash) location.hash = "#/chat";
      onHash();
    },
    go(path) { location.hash = path.startsWith("#/") ? path : `#/${path}`; }
  };
}
