import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, FileText, GitBranch, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Link } from 'react-router-dom'

interface Spec {
  id: string
  title: string
  description: string
  phase: string
  feature_number?: string
  branch_name?: string
  created_at: string
  updated_at: string
  tags: string[]
  constitutional_compliance?: {
    is_compliant: boolean
    gates_passed: Record<string, boolean>
  }
}

export function SpecsPage() {
  const [specs, setSpecs] = useState<Spec[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSpecs()
  }, [])

  const fetchSpecs = async () => {
    try {
      const response = await fetch('/api/specs')
      if (response.ok) {
        const data = await response.json()
        setSpecs(data)
      }
    } catch (error) {
      console.error('Error fetching specs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'specification':
        return <FileText className="h-4 w-4" />
      case 'plan':
        return <GitBranch className="h-4 w-4" />
      case 'tasks':
        return <CheckCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'specification':
        return 'bg-blue-900/30 text-blue-400'
      case 'plan':
        return 'bg-yellow-900/30 text-yellow-400'
      case 'tasks':
        return 'bg-purple-900/30 text-purple-400'
      case 'completed':
        return 'bg-green-900/30 text-green-400'
      default:
        return 'bg-gray-900/30 text-gray-400'
    }
  }

  const getConstitutionalStatus = (spec: Spec) => {
    if (!spec.constitutional_compliance) return null
    
    const { is_compliant, gates_passed } = spec.constitutional_compliance
    const passedCount = Object.values(gates_passed).filter(Boolean).length
    const totalCount = Object.keys(gates_passed).length
    
    return (
      <div className="flex items-center gap-2 text-sm">
        {is_compliant ? (
          <CheckCircle className="h-4 w-4 text-green-400" />
        ) : (
          <AlertCircle className="h-4 w-4 text-yellow-400" />
        )}
        <span className={is_compliant ? 'text-green-400' : 'text-yellow-400'}>
          Constitutional: {passedCount}/{totalCount} gates
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-figma-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button variant="ghost" asChild className="mr-4">
              <Link to="/" className="flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-figma-text-primary">
                Spec-Kit: Spec-Driven Development
              </h1>
              <p className="text-figma-text-secondary mt-2">
                Transform ideas into executable specifications through the three-phase methodology
              </p>
            </div>
          </div>
          <Button asChild className="bg-white text-black hover:bg-gray-200">
            <Link to="/spec/new" className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Specification
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <Card className="bg-figma-medium-gray border-figma-light-gray">
            <CardHeader>
              <CardTitle className="text-figma-text-primary flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Spec-Kit Methodology
              </CardTitle>
              <CardDescription className="text-figma-text-secondary">
                Follow the three-phase workflow to transform natural language requirements into working implementations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-900/20 border border-blue-800/30">
                  <div className="w-8 h-8 bg-blue-900/50 rounded-full flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-blue-400">/specify</div>
                    <div className="text-sm text-figma-text-secondary">Define WHAT and WHY</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-900/20 border border-yellow-800/30">
                  <div className="w-8 h-8 bg-yellow-900/50 rounded-full flex items-center justify-center">
                    <GitBranch className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div>
                    <div className="font-medium text-yellow-400">/plan</div>
                    <div className="text-sm text-figma-text-secondary">Technical architecture</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-900/20 border border-purple-800/30">
                  <div className="w-8 h-8 bg-purple-900/50 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium text-purple-400">/tasks</div>
                    <div className="text-sm text-figma-text-secondary">Actionable breakdown</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-figma-text-secondary">Loading specifications...</div>
          </div>
        ) : specs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-figma-text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-medium text-figma-text-primary mb-2">No specifications yet</h3>
            <p className="text-figma-text-secondary mb-6">
              Create your first specification to start the spec-driven development workflow
            </p>
            <Button asChild className="bg-white text-black hover:bg-gray-200">
              <Link to="/spec/new">
                Create First Specification
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {specs.map((spec) => (
              <Card key={spec.id} className="bg-figma-medium-gray border-figma-light-gray hover:border-figma-text-secondary transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-figma-text-primary text-lg mb-1">
                        {spec.title}
                      </CardTitle>
                      <CardDescription className="text-figma-text-secondary text-sm">
                        {spec.description}
                      </CardDescription>
                    </div>
                    <Badge className={`ml-2 ${getPhaseColor(spec.phase)}`}>
                      {getPhaseIcon(spec.phase)}
                      <span className="ml-1 capitalize">{spec.phase}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {spec.feature_number && (
                      <div className="flex items-center gap-2 text-sm text-figma-text-secondary">
                        <GitBranch className="h-4 w-4" />
                        <span>Feature #{spec.feature_number}</span>
                        {spec.branch_name && (
                          <span className="text-xs bg-figma-light-gray px-2 py-1 rounded">
                            {spec.branch_name}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {getConstitutionalStatus(spec)}
                    
                    <div className="flex flex-wrap gap-1">
                      {spec.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-figma-text-secondary">
                        Updated {new Date(spec.updated_at).toLocaleDateString()}
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/spec/${spec.id}`}>
                          Open
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
