import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'

interface Repository {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  stargazers_count: number
  forks_count: number
  updated_at: string
  private: boolean
  language?: string
  default_branch?: string
}

export function UserDashboard() {
  const { user, accessToken, isAuthenticated, login } = useAuth()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Repository[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [searchPage, setSearchPage] = useState(1)
  const [searchHasMore, setSearchHasMore] = useState(true)
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    try {
      const url = `${import.meta.env.VITE_API_URL}/api/user/assignments`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAssignments(data)
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error)
    } finally {
      setAssignmentsLoading(false)
    }
  }, [accessToken])

  const fetchRepositories = useCallback(async (nextPage = 1, append = false) => {
    try {
      const url = `${import.meta.env.VITE_API_URL}/api/user/repositories?limit=10&page=${nextPage}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRepositories((prev) => append ? [...prev, ...data] : data)
        setHasMore(Array.isArray(data) && data.length === 10)
        setPage(nextPage)
      }
    } catch (error) {
      console.error('Failed to fetch repositories:', error)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchRepositories()
      fetchAssignments()
    }
  }, [isAuthenticated, accessToken, fetchAssignments, fetchRepositories])

  const refreshSessionStatus = async (sessionId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/status`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (response.ok) {
        const sessionData = await response.json()
        setAssignments(prev => prev.map(assignment => 
          assignment.session_id === sessionId 
            ? { ...assignment, session_status: sessionData.status }
            : assignment
        ))
      }
    } catch (error) {
      console.error('Failed to refresh session status:', error)
    }
  }

  // Debounced search
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return
    const controller = new AbortController()
    const handler = setTimeout(async () => {
      const q = searchQuery.trim()
      if (q.length < 2) {
        setSearchResults(null)
        setSearchLoading(false)
        setSearchPage(1)
        setSearchHasMore(true)
        return
      }
      try {
        setSearchLoading(true)
        const url = `${import.meta.env.VITE_API_URL}/api/user/repositories/search?q=${encodeURIComponent(q)}&limit=10&page=1`
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          signal: controller.signal
        })
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data)
          setSearchHasMore(Array.isArray(data) && data.length === 10)
          setSearchPage(1)
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('Search failed:', e)
        }
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => {
      controller.abort()
      clearTimeout(handler)
    }
  }, [searchQuery, isAuthenticated, accessToken])

  const loadMoreRecent = async () => {
    await fetchRepositories(page + 1, true)
  }

  const loadMoreSearch = async () => {
    if (!searchResults) return
    const nextPage = searchPage + 1
    try {
      setSearchLoading(true)
      const url = `${import.meta.env.VITE_API_URL}/api/user/repositories/search?q=${encodeURIComponent(searchQuery.trim())}&limit=10&page=${nextPage}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (response.ok) {
        const data: Repository[] = await response.json()
        setSearchResults([...searchResults, ...data])
        setSearchHasMore(Array.isArray(data) && data.length === 10)
        setSearchPage(nextPage)
      }
    } catch (e) {
      console.error('Load more search failed:', e)
    } finally {
      setSearchLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-figma-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-figma-text-primary mb-4">
            Please sign in to view your dashboard
          </h1>
          <p className="text-figma-text-secondary">
            Sign in with GitHub to deploy AI agents to your repositories
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={login}
              aria-label="Sign in with GitHub"
              className="group flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium border border-gray-700 shadow-sm transition-all duration-200 hover:border-white/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-figma-black"
            >
              {/* GitHub mark */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="currentColor"
                stroke="none"
                aria-hidden="true"
                focusable="false"
                className="text-white fill-white block"
                shapeRendering="geometricPrecision"
              >
                <path d="M12 .297C5.37.297 0 5.667 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.016-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.775.42-1.306.763-1.606-2.665-.305-5.466-1.332-5.466-5.93 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.524.116-3.176 0 0 1.008-.322 3.3 1.23.957-.266 1.984-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.29-1.552 3.296-1.23 3.296-1.23.654 1.652.242 2.873.118 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.806 5.624-5.479 5.92.43.372.816 1.102.816 2.222 0 1.606-.014 2.902-.014 3.296 0 .322.216.694.826.576C20.565 22.094 24 17.6 24 12.297 24 5.667 18.627.297 12 .297z"/>
              </svg>
              Sign in with GitHub
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-figma-black py-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-figma-text-primary mb-2">
            Welcome back, {user?.name || user?.login}!
          </h1>
          <p className="text-figma-text-secondary">
            Deploy AI agents to your GitHub repositories and manage your automated workflows
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-figma-text-primary mb-1">
              Your Repositories
            </h2>
            <p className="text-xs text-figma-text-secondary mb-4">
              Showing your 10 most recently updated repositories. Use search to find others.
            </p>

            <div className="mb-4 flex items-center gap-2">
              <input
                className="w-full bg-figma-medium-gray border border-figma-light-gray rounded px-3 py-2 text-sm text-figma-text-primary placeholder-figma-text-secondary focus:outline-none"
                placeholder="Search your repositories (min 2 chars)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="text-figma-text-secondary border border-figma-light-gray hover:bg-figma-light-gray px-3 py-2 rounded text-sm"
                  onClick={() => setSearchQuery('')}
                >
                  Clear
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-figma-text-secondary">Loading repositories...</div>
            ) : (
              <div className="space-y-4">
                {(searchResults ?? repositories).map((repo) => (
                  <div key={repo.id} className="bg-figma-medium-gray border border-figma-light-gray rounded-lg p-4">
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-figma-text-primary text-lg font-medium">
                          {repo.name}
                        </h3>
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="View on GitHub"
                          title="View on GitHub"
                          className="text-figma-text-secondary hover:text-figma-text-primary"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="currentColor"
                            aria-hidden="true"
                            className="inline-block align-[-2px]"
                          >
                            <path d="M12 .297C5.37.297 0 5.667 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.016-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.775.42-1.306.763-1.606-2.665-.305-5.466-1.332-5.466-5.93 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.524.116-3.176 0 0 1.008-.322 3.3 1.23.957-.266 1.984-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.29-1.552 3.296-1.23 3.296-1.23.654 1.652.242 2.873.118 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.806 5.624-5.479 5.92.43.372.816 1.102.816 2.222 0 1.606-.014 2.902-.014 3.296 0 .322.216.694.826.576C20.565 22.094 24 17.6 24 12.297 24 5.667 18.627.297 12 .297z"/>
                          </svg>
                        </a>
                      </div>
                      <p className="text-figma-text-secondary text-sm">
                        {repo.description || 'No description available'}
                      </p>
                    </div>
                    <div className="flex items-center justify-start">
                      <div className="flex items-center space-x-4 text-sm text-figma-text-secondary">
                        <span className={`px-2 py-0.5 rounded border ${repo.private ? 'border-red-400 text-red-300' : 'border-green-400 text-green-300'}`}>
                          {repo.private ? 'Private' : 'Public'}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span>⭐</span>
                          <span>{repo.stargazers_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>🍴</span>
                          <span>{repo.forks_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>📅</span>
                          <span>{new Date(repo.updated_at).toLocaleDateString()}</span>
                        </div>
                        {repo.language && (
                          <div className="flex items-center space-x-1">
                            <span>🗣️</span>
                            <span>{repo.language}</span>
                          </div>
                        )}
                        {repo.default_branch && (
                          <div className="flex items-center space-x-1">
                            <span>🌿</span>
                            <span>{repo.default_branch}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {searchResults && !searchLoading && searchResults.length === 0 && (
                  <div className="text-figma-text-secondary text-sm">No repositories match "{searchQuery}"</div>
                )}
                {searchLoading && (
                  <div className="text-figma-text-secondary text-sm">Searching…</div>
                )}
                {!searchResults && hasMore && (
                  <div className="flex justify-center">
                    <button
                      className="text-figma-text-secondary border border-figma-light-gray hover:bg-figma-light-gray px-4 py-2 rounded text-sm"
                      onClick={loadMoreRecent}
                    >
                      Load more
                    </button>
                  </div>
                )}
                {searchResults && searchHasMore && (
                  <div className="flex justify-center">
                    <button
                      className="text-figma-text-secondary border border-figma-light-gray hover:bg-figma-light-gray px-4 py-2 rounded text-sm"
                      onClick={loadMoreSearch}
                      disabled={searchLoading}
                    >
                      {searchLoading ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-figma-text-primary mb-4">
              Deployed Agents
            </h2>
            {assignmentsLoading ? (
              <div className="text-figma-text-secondary">Loading assignments...</div>
            ) : assignments.length === 0 ? (
              <div className="bg-figma-medium-gray border border-figma-light-gray rounded-lg p-6">
                <div className="text-center text-figma-text-secondary">
                  <p>No agents deployed yet.</p>
                  <p className="mt-2">Browse templates and deploy your first AI agent!</p>
                  <Link to="/templates">
                    <button className="mt-4 bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-md">
                      Browse Templates
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={String((assignment as Record<string, unknown>).id)} className="bg-figma-medium-gray border border-figma-light-gray rounded-lg p-4">
                    <div className="mb-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-figma-text-primary text-lg font-medium">
                          {String((assignment as Record<string, unknown>).template_title)}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            (assignment as Record<string, unknown>).status === 'success' 
                              ? 'bg-green-900 text-green-300 border border-green-400' 
                              : 'bg-red-900 text-red-300 border border-red-400'
                          }`}>
                            {String((assignment as Record<string, unknown>).status)}
                          </span>
                          {(assignment as Record<string, unknown>).session_status ? (
                            <span className={`px-2 py-1 rounded text-xs ${
                              (assignment as Record<string, unknown>).session_status === 'completed' 
                                ? 'bg-blue-900 text-blue-300 border border-blue-400'
                                : (assignment as Record<string, unknown>).session_status === 'running'
                                ? 'bg-yellow-900 text-yellow-300 border border-yellow-400'
                                : 'bg-gray-900 text-gray-300 border border-gray-400'
                            }`}>
                              Session: {String((assignment as Record<string, unknown>).session_status)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-figma-text-secondary text-sm">
                        Agent: {String((assignment as Record<string, unknown>).agent_id)} • {String(((assignment as Record<string, unknown>).customization as Record<string, unknown>)?.company_name)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-figma-text-secondary">
                        <span>📅 {new Date(String((assignment as Record<string, unknown>).created_at)).toLocaleDateString()}</span>
                        {(assignment as Record<string, unknown>).repository_url ? (
                          <a href={String((assignment as Record<string, unknown>).repository_url)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                            📁 Repository
                          </a>
                        ) : null}
                        {(assignment as Record<string, unknown>).session_url ? (
                          <a href={String((assignment as Record<string, unknown>).session_url)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                            🔗 Session
                          </a>
                        ) : null}
                        {(assignment as Record<string, unknown>).session_id && (assignment as Record<string, unknown>).agent_id === 'devin' ? (
                          <button 
                            onClick={() => refreshSessionStatus(String((assignment as Record<string, unknown>).session_id))}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            🔄 Refresh Status
                          </button>
                        ) : null}
                        {(assignment as Record<string, unknown>).issue_url ? (
                          <a href={String((assignment as Record<string, unknown>).issue_url)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                            🐛 Issue #{String((assignment as Record<string, unknown>).issue_number)}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
