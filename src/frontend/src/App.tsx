import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { LandingPage } from './components/LandingPage'
import { PatternsPage } from './components/PatternsPage'
import { TemplatesPage } from './components/TemplatesPage'
import { PatternWorkbench } from './components/PatternWorkbench'
import { TemplateWorkbench } from './components/TemplateWorkbench'
import { Footer } from './components/Footer'

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

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [filters])

  const fetchData = async () => {
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
  }

  const fetchTemplates = async () => {
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
  }

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  return (
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
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
