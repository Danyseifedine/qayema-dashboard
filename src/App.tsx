import './App.css'
import { AuthGuard } from './auth/AuthGuard'
import { useAuth } from './auth/auth-context'

function Dashboard() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Logout didn't complete — keep the user here rather than pretending.
      window.alert('Could not log out. Please try again.')
    }
  }

  return (
    <main className="app">
      <h1>qayema-dashboard</h1>
      <p>
        Signed in as <strong>{user?.name}</strong> ({user?.email})
      </p>
      <button type="button" onClick={() => void handleLogout()}>
        Log out
      </button>
    </main>
  )
}

function App() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  )
}

export default App
