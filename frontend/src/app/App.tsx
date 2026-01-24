import BackendBanner from "../components/BackendBanner";
import ProbeDebugPanel from "../components/ProbeDebugPanel";

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <BackendBanner />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">OmniAI</h1>
          <p className="text-sm text-slate-500">Phase 0 scaffold</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
          Offline-ready shell
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold">Vite + React + Tailwind</h2>
          <p className="mt-2 text-sm text-slate-600">
            The frontend boots with a minimal shell. Feature modules will land in the next phases.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Status</div>
              <div className="mt-2 font-medium text-slate-700">Backend connection not configured</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Next</div>
              <div className="mt-2 font-medium text-slate-700">Auth + sessions + chat streaming</div>
            </div>
          </div>
        </section>
      </main>
      <ProbeDebugPanel />
    </div>
  );
};

export default App;
