export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Personal Execution OS</h1>
        <p className="text-neutral-300 mb-8">
          Phase 0 dashboard shell for study, job search, health, and life admin.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-2xl font-semibold mb-2">Today</h2>
            <p className="text-neutral-400">Daily plan will appear here.</p>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-2xl font-semibold mb-2">Approvals</h2>
            <p className="text-neutral-400">Pending approvals will appear here.</p>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-2xl font-semibold mb-2">Agent Runs</h2>
            <p className="text-neutral-400">Recent agent activity will appear here.</p>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-2xl font-semibold mb-2">Goals</h2>
            <p className="text-neutral-400">Your goals summary will appear here.</p>
          </section>
        </div>
      </div>
    </main>
  );
}