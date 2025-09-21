import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Header } from './components/Header'
import { LandingPage } from './components/LandingPage'
import { PatternsPage } from './components/PatternsPage'
import { TemplatesPage } from './components/TemplatesPage'
import { SpecsPage } from './components/SpecsPage'
import { PatternWorkbench } from './components/PatternWorkbench'
import { TemplateWorkbench } from './components/TemplateWorkbench'
import { SpecWorkbench } from './components/SpecWorkbench'
import { AuthCallback } from './components/AuthCallback'
import { UserDashboard } from './components/UserDashboard'
import { Footer } from './components/Footer'
import { Toaster } from './components/ui/toaster'
import { PostTrainingPage } from './components/PostTrainingPage'

export interface Template {
  id: string
  title: string
  description: string
  tags: string[]
  languages: string[]
  models: string[]
  databases: string[]
  collection: string
  task: string
  github_url: string
  fork_count: number
  star_count: number
  is_featured: boolean
  icon: string
  created_at: string
  planning?: {
    tech_stack?: string
    architecture?: string
    non_functional_requirements?: string
    gates?: {
      simplicity?: boolean
      anti_abstraction?: boolean
      integration_first?: boolean
    }
  }
}

export interface FilterOptions {
  tasks: string[]
  languages: string[]
  collections: string[]
  models: string[]
  databases: string[]
}

function App() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [featuredTemplates, setFeaturedTemplates] = useState<Template[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    tasks: [],
    languages: [],
    collections: [],
    models: [],
    databases: []
  })
  const [filters, setFilters] = useState({
    search: '',
    task: '',
    language: '',
    collection: '',
    model: '',
    database: '',
    sort: 'Most Popular'
  })
  const [loading, setLoading] = useState(true)

  const apiUrl = import.meta.env.VITE_API_URL

  const fetchData = useCallback(async () => {
    try {
      const [featuredRes, filtersRes] = await Promise.all([
        fetch(`${apiUrl}/api/templates/featured`),
        fetch(`${apiUrl}/api/filters`)
      ])

      if (featuredRes.ok && filtersRes.ok) {
        const featuredData = await featuredRes.json()
        const filtersData = await filtersRes.json()
        
        setFeaturedTemplates(featuredData)
        setFilterOptions(filtersData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }, [apiUrl])

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`${apiUrl}/api/templates?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchTemplates()
  }, [filters, fetchTemplates])

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-figma-black font-aptos">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/patterns" element={<PatternsPage />} />
            <Route path="/pattern/:patternId" element={<PatternWorkbench />} />
            <Route path="/templates" element={
              <TemplatesPage 
                templates={templates}
                featuredTemplates={featuredTemplates}
                filterOptions={filterOptions}
                filters={filters}
                onFiltersChange={updateFilters}
                loading={loading}
              />
            } />
            <Route path="/template/:templateId" element={<TemplateWorkbench />} />
            <Route path="/specs" element={<SpecsPage />} />
            <Route path="/spec/new" element={<SpecWorkbench />} />
            <Route path="/spec/:specId" element={<SpecWorkbench />} />
            <Route path="/auth/github/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/post-training" element={<PostTrainingPage />} />
          </Routes>
        </main>
        <Footer />
        <Toaster />
      </div>
    </AuthProvider>
  )
}

export default App
