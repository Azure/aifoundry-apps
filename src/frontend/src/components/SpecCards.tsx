import { useState, useEffect, useCallback } from 'react'
import { Plus, FileText, Calendar, Tag } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Link } from 'react-router-dom'

interface PlanTemplate {
  technical_context?: Record<string, string>
  constitution_check?: Record<string, unknown>
  project_structure?: Record<string, unknown>
  research_content?: string
  data_model_content?: string
  contracts_content?: string
  quickstart_content?: string
  complexity_tracking?: Record<string, unknown>
  progress_tracking?: Record<string, unknown>
}

interface Spec {
  id: string
  title: string
  description: string
  content: string
  created_at: string
  updated_at: string
  tags: string[]
  plan_template?: PlanTemplate
}

export function SpecCards() {
  const [specs, setSpecs] = useState<Spec[]>([])
  const [loading, setLoading] = useState(true)

  const apiUrl = import.meta.env.VITE_API_URL

  const fetchSpecs = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/specs`)
      if (response.ok) {
        const data = await response.json()
        setSpecs(data)
      }
    } catch (error) {
      console.error('Error fetching specs:', error)
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    fetchSpecs()
  }, [fetchSpecs])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-figma-text-secondary">Loading specifications...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-figma-text-secondary">
          Follow the Spec-Driven Development methodology: Specify → Plan → Tasks → Implementation
        </p>
        <Button asChild className="bg-white text-black hover:bg-gray-200">
          <Link to="/spec/new" className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            New Specification
          </Link>
        </Button>
      </div>

      {specs.length === 0 ? (
        <Card className="bg-figma-medium-gray border-figma-light-gray">
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-figma-text-secondary mx-auto mb-4" />
            <h3 className="text-figma-text-primary text-lg font-medium mb-2">
              No specifications yet
            </h3>
            <p className="text-figma-text-secondary mb-6">
              Create your first spec to get started with Spec-Driven Development.
            </p>
            <Button asChild className="bg-white text-black hover:bg-gray-200">
              <Link to="/spec/new" className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Create First Spec
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specs.map((spec) => (
            <Card key={spec.id} className="bg-figma-medium-gray border-figma-light-gray hover:border-figma-text-secondary transition-colors flex flex-col h-full">
              <CardHeader>
                <CardTitle className="text-figma-text-primary text-lg">
                  {spec.title}
                </CardTitle>
                <CardDescription className="text-figma-text-secondary">
                  {spec.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow space-y-4">
                <div className="flex items-center text-sm text-figma-text-secondary">
                  <Calendar className="h-4 w-4 mr-2" />
                  Updated {formatDate(spec.updated_at)}
                </div>
                
                {spec.tags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-figma-text-secondary" />
                    <div className="flex flex-wrap gap-1">
                      {spec.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs bg-figma-dark-gray text-figma-text-secondary border-figma-light-gray">
                          {tag}
                        </Badge>
                      ))}
                      {spec.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-figma-dark-gray text-figma-text-secondary border-figma-light-gray">
                          +{spec.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex-grow"></div>

                <Button asChild variant="outline" className="w-full bg-figma-dark-gray text-figma-text-primary border-figma-light-gray hover:bg-figma-light-gray mt-auto">
                  <Link to={`/spec/${spec.id}`}>
                    Open Specification
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
