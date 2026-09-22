export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Fleetwise
        </h1>
        <p className="text-sm text-slate-400 mt-1">Supercharge your fleet operations ✨</p>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-3 gap-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl shadow-lg border border-slate-800 bg-slate-800/50 backdrop-blur-xl p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                <span className="text-indigo-400">{s.icon}</span>
              </div>
              <div className="text-3xl font-bold" style={{ color: '#6366F1' }}>
                {s.value}
              </div>
              <div className="text-sm text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl shadow-lg border border-slate-800 bg-slate-800/50 p-8">
          <h2 className="text-xl font-semibold mb-6">Active vehicles</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-2 font-medium">Unit</th>
                <th className="text-left py-2 font-medium">Driver</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-right py-2 font-medium">Miles</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.unit} className="border-b border-slate-800">
                  <td className="py-3">{r.unit}</td>
                  <td className="py-3 text-slate-400">{r.driver}</td>
                  <td className="py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">{r.miles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button className="mt-8 rounded-2xl shadow-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-semibold">
          Add vehicle 🚀
        </button>
      </main>
    </div>
  )
}
