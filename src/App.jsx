import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function App() {
  const [view, setView] = useState('dashboard')
  const [children, setChildren] = useState([])
  const [users, setUsers] = useState([])
  const [sessions, setSessions] = useState([])
  const [newChild, setNewChild] = useState({ first_name: '', last_name: '', diagnosis: '' })
  const [newSession, setNewSession] = useState({ child_id: '', therapist_id: '', date: '', duration_minutes: 60, notes: '' })

  useEffect(() => {
    fetchInitial()
  }, [])

  const fetchInitial = async () => {
    await Promise.all([
      fetch(`${API}/children`).then(r => r.json()).then(setChildren),
      fetch(`${API}/users`).then(r => r.json()).then(setUsers),
      fetch(`${API}/sessions`).then(r => r.json()).then(setSessions),
    ])
  }

  const createChild = async (e) => {
    e.preventDefault()
    const res = await fetch(`${API}/children`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newChild, parent_ids: [], therapist_ids: [] }) })
    if (res.ok) {
      await fetchInitial()
      setNewChild({ first_name: '', last_name: '', diagnosis: '' })
      setView('children')
    }
  }

  const createSession = async (e) => {
    e.preventDefault()
    const res = await fetch(`${API}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSession) })
    if (res.ok) {
      await fetchInitial()
      setNewSession({ child_id: '', therapist_id: '', date: '', duration_minutes: 60, notes: '' })
      setView('sessions')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur sticky top-0 z-10 border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Therapy Center</h1>
          <nav className="space-x-2 text-sm">
            <button onClick={() => setView('dashboard')} className={`px-3 py-1 rounded ${view==='dashboard'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`}>Dashboard</button>
            <button onClick={() => setView('children')} className={`px-3 py-1 rounded ${view==='children'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`}>Children</button>
            <button onClick={() => setView('sessions')} className={`px-3 py-1 rounded ${view==='sessions'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`}>Sessions</button>
            <button onClick={() => setView('users')} className={`px-3 py-1 rounded ${view==='users'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`}>Users</button>
            <a href="/test" className="px-3 py-1 rounded hover:bg-gray-100">Connection</a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {view === 'dashboard' && (
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Children</p>
              <p className="text-3xl font-bold">{children.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Users</p>
              <p className="text-3xl font-bold">{users.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Sessions</p>
              <p className="text-3xl font-bold">{sessions.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Therapists</p>
              <p className="text-3xl font-bold">{users.filter(u=>u.role==='therapist').length}</p>
            </div>
          </section>
        )}

        {view === 'children' && (
          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">Add Child</h2>
              <form onSubmit={createChild} className="space-y-3">
                <div>
                  <label className="block text-sm">First name</label>
                  <input className="w-full border rounded px-3 py-2" value={newChild.first_name} onChange={e=>setNewChild(v=>({...v, first_name:e.target.value}))} required />
                </div>
                <div>
                  <label className="block text-sm">Last name</label>
                  <input className="w-full border rounded px-3 py-2" value={newChild.last_name} onChange={e=>setNewChild(v=>({...v, last_name:e.target.value}))} required />
                </div>
                <div>
                  <label className="block text-sm">Diagnosis</label>
                  <input className="w-full border rounded px-3 py-2" value={newChild.diagnosis} onChange={e=>setNewChild(v=>({...v, diagnosis:e.target.value}))} />
                </div>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded">Save</button>
              </form>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">Children</h2>
              <ul className="divide-y">
                {children.map(c=> (
                  <li key={c.id} className="py-2">
                    <p className="font-medium">{c.first_name} {c.last_name}</p>
                    <p className="text-sm text-gray-500">{c.diagnosis || 'No diagnosis'}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {view === 'sessions' && (
          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">Log Session</h2>
              <form onSubmit={createSession} className="space-y-3">
                <div>
                  <label className="block text-sm">Child</label>
                  <select className="w-full border rounded px-3 py-2" value={newSession.child_id} onChange={e=>setNewSession(v=>({...v, child_id:e.target.value}))} required>
                    <option value="">Select child</option>
                    {children.map(c=> <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Therapist</label>
                  <select className="w-full border rounded px-3 py-2" value={newSession.therapist_id} onChange={e=>setNewSession(v=>({...v, therapist_id:e.target.value}))} required>
                    <option value="">Select therapist</option>
                    {users.filter(u=>u.role==='therapist').map(u=> <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Date</label>
                  <input type="date" className="w-full border rounded px-3 py-2" value={newSession.date} onChange={e=>setNewSession(v=>({...v, date:e.target.value}))} required />
                </div>
                <div>
                  <label className="block text-sm">Duration (min)</label>
                  <input type="number" className="w-full border rounded px-3 py-2" value={newSession.duration_minutes} onChange={e=>setNewSession(v=>({...v, duration_minutes:Number(e.target.value)}))} required />
                </div>
                <div>
                  <label className="block text-sm">Notes</label>
                  <textarea className="w-full border rounded px-3 py-2" value={newSession.notes} onChange={e=>setNewSession(v=>({...v, notes:e.target.value}))} />
                </div>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded">Save</button>
              </form>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">Recent Sessions</h2>
              <ul className="divide-y">
                {sessions.map(s=> (
                  <li key={s.id} className="py-2">
                    <p className="font-medium">{children.find(c=>c.id===s.child_id)?.first_name} - {users.find(u=>u.id===s.therapist_id)?.name}</p>
                    <p className="text-sm text-gray-500">{s.date} • {s.duration_minutes} min</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {view === 'users' && (
          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Users</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {users.map(u=> (
                <div key={u.id} className="border rounded p-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <span className="inline-block mt-2 text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700">{u.role}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
