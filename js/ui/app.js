import { clear } from "./dom.js";
import { mountLogin } from "./pages/login.js";
import { mountChat } from "./pages/chat.js";

export function mountApp({ root, store, router }) {
  let unmount = null;
  let lastKey = "";

  function render() {
    const s = store.get();
    const key = `${s.route}:${s.routeId || ""}:${s.authenticated ? "1" : "0"}`;
    if (key === lastKey) return;
    lastKey = key;

    if (unmount) { unmount(); unmount = null; }
    clear(root);

    if (s.route === "login") unmount = mountLogin(root, store, router);
    else unmount = mountChat(root, store, router);
  }

  store.subscribe(render);
  render();
}
