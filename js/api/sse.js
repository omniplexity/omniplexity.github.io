export async function readSse(res, { onData, signal } = {}) {
  const reader = res.body.getReader();
  const dec = new TextDecoder("utf-8");
  let buf = "";

  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { value, done } = await reader.read();
    if (done) break;

    buf += dec.decode(value, { stream: true });

    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);

      const lines = frame.split("\n");
      const dataLines = lines
        .map((l) => l.replace(/\r$/, ""))
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart());

      if (!dataLines.length) continue;

      const dataStr = dataLines.join("\n");
      if (dataStr === "[DONE]") return;

      let payload;
      try { payload = JSON.parse(dataStr); } catch { payload = dataStr; }
      onData?.(payload);
    }
  }
}
