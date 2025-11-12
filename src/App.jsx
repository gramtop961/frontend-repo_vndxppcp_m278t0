import { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function App() {
  const [view, setView] = useState('dashboard')
  const [children, setChildren] = useState([])
  const [users, setUsers] = useState([])
  const [sessions, setSessions] = useState([])
  const [goals, setGoals] = useState([])
  const [donations, setDonations] = useState([])
  const [donationSummary, setDonationSummary] = useState({ total: 0, count: 0 })
  const [weeklyReport, setWeeklyReport] = useState(null)

  const [newChild, setNewChild] = useState({ first_name: '', last_name: '', diagnosis: '' })
  const [newSession, setNewSession] = useState({ child_id: '', therapist_id: '', date: '', duration_minutes: 60, notes: '' })
  const [newGoal, setNewGoal] = useState({ child_id: '', title: '', description: '', target_metric: '' })
  const [progressForm, setProgressForm] = useState({ child_id: '', session_id: '', goal_id: '', rating: 3, comment: '' })
  const [newDonation, setNewDonation] = useState({ amount: '', message: '', child_id: '' })

  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', username: '', password: '', role: 'parent' })
  const [currentUser, setCurrentUser] = useState(null)

  // derived
  const therapists = useMemo(() => users.filter(u => u.role === 'therapist'), [users])
  const myChildren = useMemo(() => {
    if (!currentUser) return children
    if (currentUser.role === 'therapist') return children.filter(c => c.therapist_ids?.includes?.(currentUser.id))
    if (currentUser.role === 'parent') return children.filter(c => c.parent_ids?.includes?.(currentUser.id))
    return children
  }, [children, currentUser])

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

  const refreshGoalsForChild = async (childId) => {
    if (!childId) { setGoals([]); return }
    const res = await fetch(`${API}/goals?child_id=${childId}`)
    const data = await res.json()
    setGoals(data)
  }

  const refreshDonations = async () => {
    let url = `${API}/donations`
    const params = []
    if (currentUser?.role === 'donor') params.push(`donor_id=${currentUser.id}`)
    if (params.length) url += `?${params.join('&')}`
    const list = await fetch(url).then(r => r.json())
    setDonations(list)

    // summary
    let sumUrl = `${API}/donations/summary`
    const sParams = []
    if (currentUser?.role === 'donor') sParams.push(`donor_id=${currentUser.id}`)
    if (sParams.length) sumUrl += `?${sParams.join('&')}`
    const sum = await fetch(sumUrl).then(r => r.json())
    setDonationSummary(sum)
  }

  const fetchWeeklyReport = async () => {
    if (!currentUser) return
    if (currentUser.role !== 'parent') { setWeeklyReport(null); return }
    const rep = await fetch(`${API}/reports/weekly?parent_id=${currentUser.id}`).then(r => r.json())
    setWeeklyReport(rep)
  }

  // creates
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

  const createGoal = async (e) => {
    e.preventDefault()
    const res = await fetch(`${API}/goals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newGoal, status: 'active' }) })
    if (res.ok) {
      await refreshGoalsForChild(newGoal.child_id)
      setNewGoal({ child_id: newGoal.child_id, title: '', description: '', target_metric: '' })
    }
  }

  const addProgress = async (e) => {
    e.preventDefault()
    if (!progressForm.session_id || !progressForm.goal_id) { alert('Select session and goal'); return }
    const res = await fetch(`${API}/sessions/${progressForm.session_id}/goals-progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ goal_id: progressForm.goal_id, rating: Number(progressForm.rating), comment: progressForm.comment }] })
    })
    if (res.ok) {
      alert('Progress added')
      setProgressForm(p => ({ ...p, goal_id: '', rating: 3, comment: '' }))
      await fetchInitial()
    }
  }

  const createDonation = async (e) => {
    e.preventDefault()
    const payload = { amount: Number(newDonation.amount), message: newDonation.message || undefined, child_id: newDonation.child_id || undefined, donor_id: currentUser?.id || undefined, date: new Date().toISOString().slice(0,10) }
    const res = await fetch(`${API}/donations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) {
      await refreshDonations()
      setNewDonation({ amount: '', message: '', child_id: '' })
    }
  }

  // auth handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    try {
      if (authMode === 'signup') {
        const res = await fetch(`${API}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: authForm.name,
            email: authForm.email,
            username: authForm.username,
            password: authForm.password,
            role: authForm.role,
          })
        })
        if (!res.ok) throw new Error('Signup failed')
        const data = await res.json()
        setCurrentUser({ id: data.id, name: data.name, role: data.role, username: authForm.username })
        setShowAuth(false)
      } else {
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: authForm.username, password: authForm.password })
        })
        if (!res.ok) throw new Error('Login failed')
        const data = await res.json()
        setCurrentUser(data)
        setShowAuth(false)
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setView('dashboard')
  }

  // filters (role-based)
  const filteredSessions = sessions.filter(s => {
    if (!currentUser) return true
    if (currentUser.role === 'therapist') return s.therapist_id === currentUser.id
    if (currentUser.role === 'parent') {
      const myChildrenIds = children.filter(c => c.parent_ids?.includes?.(currentUser.id)).map(c => c.id)
      return myChildrenIds.includes(s.child_id)
    }
    return true
  })

  const filteredChildren = myChildren

  // react to view changes for data
  useEffect(() => {
    if (view === 'goals') {
      const firstChild = filteredChildren[0]?.id
      setNewGoal(g => ({ ...g, child_id: g.child_id || firstChild || '' }))
      setProgressForm(p => ({ ...p, child_id: p.child_id || firstChild || '' }))
      if (firstChild) refreshGoalsForChild(firstChild)
    }
    if (view === 'donor') {
      refreshDonations()
    }
    if (view === 'reports') {
      fetchWeeklyReport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentUser])

  useEffect(() => {
    if (newGoal.child_id) refreshGoalsForChild(newGoal.child_id)
  }, [newGoal.child_id])

  const role = currentUser?.role

  // Navigation items based on role
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', show: true },
    { key: 'children', label: 'Children', show: role !== 'donor' },
    { key: 'sessions', label: 'Sessions', show: role !== 'donor' },
    { key: 'goals', label: 'Goals', show: role === 'therapist' || role === 'parent' || role === 'admin' },
    { key: 'donor', label: 'Donor', show: role === 'donor' || role === 'admin' },
    { key: 'users', label: 'Users', show: role === 'admin' || !currentUser },
    { key: 'reports', label: 'Reports', show: role === 'parent' },
  ].filter(i => i.show)

  return (
    <div className="min-h-screen bg-white sm:bg-gradient-to-br sm:from-indigo-50 sm:to-cyan-50">
      <header className="bg-white/90 backdrop-blur sticky top-0 z-10 border-b">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">Therapy Center</h1>
          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm text-gray-600">Hi, {currentUser.name} <span className="ml-2 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs">{currentUser.role}</span></span>
                <button onClick={logout} className="px-2 sm:px-3 py-1 rounded hover:bg-gray-100 text-xs sm:text-sm">Logout</button>
              </div>
            ) : (
              <button onClick={() => {setShowAuth(true); setAuthMode('login')}} className="px-3 py-1 rounded bg-indigo-600 text-white text-sm">Login</button>
            )}
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-2 sm:pb-3">
          <nav className="flex flex-wrap gap-2 text-sm">
            {navItems.map(item => (
              <button key={item.key} onClick={() => setView(item.key)} className={`px-3 py-1 rounded ${view===item.key?'bg-indigo-600 text-white':'hover:bg-gray-100'}`}>{item.label}</button>
            ))}
            <a href="/test" className="px-3 py-1 rounded hover:bg-gray-100">Connection</a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-3 sm:p-4">
        {view === 'dashboard' && (
          <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-500">Children</p>
              <p className="text-2xl sm:text-3xl font-bold">{filteredChildren.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-500">Users</p>
              <p className="text-2xl sm:text-3xl font-bold">{users.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-500">Sessions</p>
              <p className="text-2xl sm:text-3xl font-bold">{filteredSessions.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-500">Therapists</p>
              <p className="text-2xl sm:text-3xl font-bold">{users.filter(u=>u.role==='therapist').length}</p>
            </div>
          </section>
        )}

        {view === 'children' && (
          <section className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {(role === 'admin' || role === 'therapist') && (
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
            )}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">Children</h2>
              <ul className="divide-y">
                {filteredChildren.map(c=> (
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
          <section className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {(role === 'therapist' || role === 'admin') && (
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
                      {therapists.map(u=> <option key={u.id} value={u.id}>{u.name}</option>)}
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
            )}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">Recent Sessions</h2>
              <ul className="divide-y">
                {filteredSessions.map(s=> (
                  <li key={s.id} className="py-2">
                    <p className="font-medium">{children.find(c=>c.id===s.child_id)?.first_name} - {users.find(u=>u.id===s.therapist_id)?.name}</p>
                    <p className="text-sm text-gray-500">{s.date} • {s.duration_minutes} min</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {view === 'goals' && (
          <section className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">Goals</h2>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm">Child</label>
                  <select className="w-full border rounded px-3 py-2" value={newGoal.child_id} onChange={e=>{ setNewGoal(g=>({...g, child_id:e.target.value})); setProgressForm(p=>({...p, child_id:e.target.value})) }}>
                    <option value="">Select child</option>
                    {filteredChildren.map(c=> <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                {(role === 'therapist' || role === 'admin') && (
                  <div>
                    <label className="block text-sm">New goal title</label>
                    <input className="w-full border rounded px-3 py-2" value={newGoal.title} onChange={e=>setNewGoal(g=>({...g, title:e.target.value}))} placeholder="e.g., Eye contact" />
                  </div>
                )}
              </div>
              {(role === 'therapist' || role === 'admin') && (
                <form onSubmit={createGoal} className="grid sm:grid-cols-2 gap-3 mb-4">
                  <input className="w-full border rounded px-3 py-2" placeholder="Description" value={newGoal.description} onChange={e=>setNewGoal(g=>({...g, description:e.target.value}))} />
                  <input className="w-full border rounded px-3 py-2" placeholder="Target metric" value={newGoal.target_metric} onChange={e=>setNewGoal(g=>({...g, target_metric:e.target.value}))} />
                  <div className="sm:col-span-2">
                    <button disabled={!newGoal.child_id || !newGoal.title} className="bg-indigo-600 disabled:opacity-50 text-white px-4 py-2 rounded">Add Goal</button>
                  </div>
                </form>
              )}
              <ul className="divide-y">
                {goals.map(g => (
                  <li key={g.id} className="py-2">
                    <p className="font-medium">{g.title}</p>
                    {g.target_metric && <p className="text-xs text-gray-500">Target: {g.target_metric}</p>}
                    {g.description && <p className="text-xs text-gray-500">{g.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">Log Progress</h2>
              <form onSubmit={addProgress} className="space-y-3">
                <div>
                  <label className="block text-sm">Session</label>
                  <select className="w-full border rounded px-3 py-2" value={progressForm.session_id} onChange={e=>setProgressForm(p=>({...p, session_id:e.target.value}))}>
                    <option value="">Select session</option>
                    {filteredSessions.filter(s=>!progressForm.child_id || s.child_id === progressForm.child_id).map(s => (
                      <option key={s.id} value={s.id}>{s.date} • {children.find(c=>c.id===s.child_id)?.first_name} - {users.find(u=>u.id===s.therapist_id)?.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Goal</label>
                  <select className="w-full border rounded px-3 py-2" value={progressForm.goal_id} onChange={e=>setProgressForm(p=>({...p, goal_id:e.target.value}))}>
                    <option value="">Select goal</option>
                    {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Rating (1-5)</label>
                  <input type="number" min={1} max={5} className="w-full border rounded px-3 py-2" value={progressForm.rating} onChange={e=>setProgressForm(p=>({...p, rating:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm">Comment</label>
                  <textarea className="w-full border rounded px-3 py-2" value={progressForm.comment} onChange={e=>setProgressForm(p=>({...p, comment:e.target.value}))} />
                </div>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded">Save Progress</button>
              </form>
            </div>
          </section>
        )}

        {view === 'donor' && (
          <section className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Impact Summary</h2>
              <p className="text-2xl font-bold">${'{'}donationSummary.total.toFixed(2){'}'}</p>
              <p className="text-sm text-gray-500">{donationSummary.count} donations</p>
              {(role === 'donor' || role === 'admin') && (
                <>
                  <h3 className="text-md font-semibold mt-4 mb-2">Make a Donation</h3>
                  <form onSubmit={createDonation} className="space-y-3">
                    <div>
                      <label className="block text-sm">Amount</label>
                      <input type="number" step="0.01" className="w-full border rounded px-3 py-2" value={newDonation.amount} onChange={e=>setNewDonation(d=>({...d, amount:e.target.value}))} required />
                    </div>
                    <div>
                      <label className="block text-sm">Message (optional)</label>
                      <input className="w-full border rounded px-3 py-2" value={newDonation.message} onChange={e=>setNewDonation(d=>({...d, message:e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-sm">Support a child (optional)</label>
                      <select className="w-full border rounded px-3 py-2" value={newDonation.child_id} onChange={e=>setNewDonation(d=>({...d, child_id:e.target.value}))}>
                        <option value="">None</option>
                        {children.map(c=> <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                      </select>
                    </div>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded">Donate</button>
                  </form>
                </>
              )}
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">Donations</h2>
              <ul className="divide-y">
                {donations.map(d => (
                  <li key={d.id} className="py-2">
                    <p className="font-medium">${'{'}Number(d.amount).toFixed(2){'}'} <span className="text-xs text-gray-500">{d.date}</span></p>
                    {d.child_id && <p className="text-xs text-gray-500">For child: {children.find(c=>c.id===d.child_id)?.first_name || d.child_id}</p>}
                    {d.message && <p className="text-sm">“{d.message}”</p>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {view === 'users' && (
          <section className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Users</h2>
              {!currentUser && (
                <button onClick={() => {setShowAuth(true); setAuthMode('signup')}} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Create account</button>
              )}
            </div>
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

        {view === 'reports' && role === 'parent' && (
          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Weekly Report</h2>
            {!weeklyReport ? (
              <p className="text-sm text-gray-500">No data yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="border rounded p-3">
                    <p className="text-xs text-gray-500">Total Sessions</p>
                    <p className="text-2xl font-bold">{weeklyReport.total_sessions}</p>
                  </div>
                  <div className="border rounded p-3">
                    <p className="text-xs text-gray-500">Progress Updates</p>
                    <p className="text-2xl font-bold">{weeklyReport.total_progress_updates}</p>
                  </div>
                </div>
                <ul className="divide-y">
                  {weeklyReport.children.map(ch => (
                    <li key={ch.child_id} className="py-2">
                      <p className="font-medium">{ch.name}</p>
                      <p className="text-sm text-gray-500">{ch.sessions} sessions • {ch.goals} goals • {ch.progress_updates} updates</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>

      {showAuth && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">{authMode === 'login' ? 'Login' : 'Create Account'}</h3>
              <button onClick={()=>setShowAuth(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleAuthSubmit} className="p-4 space-y-3">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm">Name</label>
                    <input className="w-full border rounded px-3 py-2" value={authForm.name} onChange={e=>setAuthForm(v=>({...v, name:e.target.value}))} required />
                  </div>
                  <div>
                    <label className="block text-sm">Email</label>
                    <input type="email" className="w-full border rounded px-3 py-2" value={authForm.email} onChange={e=>setAuthForm(v=>({...v, email:e.target.value}))} required />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm">Username</label>
                <input className="w-full border rounded px-3 py-2" value={authForm.username} onChange={e=>setAuthForm(v=>({...v, username:e.target.value}))} required />
              </div>
              <div>
                <label className="block text-sm">Password</label>
                <input type="password" className="w-full border rounded px-3 py-2" value={authForm.password} onChange={e=>setAuthForm(v=>({...v, password:e.target.value}))} required />
              </div>
              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm">Role</label>
                  <select className="w-full border rounded px-3 py-2" value={authForm.role} onChange={e=>setAuthForm(v=>({...v, role:e.target.value}))}>
                    <option value="parent">Parent</option>
                    <option value="therapist">Therapist</option>
                    <option value="donor">Donor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">{authMode === 'login' ? 'Login' : 'Create'}</button>
                <button type="button" onClick={() => setAuthMode(m => m === 'login' ? 'signup' : 'login')} className="text-sm text-indigo-700 hover:underline">
                  {authMode === 'login' ? 'Create an account' : 'Have an account? Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
