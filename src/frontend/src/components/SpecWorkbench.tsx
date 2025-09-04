import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings, GitBranch, Loader2, Save, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import AssignmentResult from './AssignmentResult'
import { Checkbox } from './ui/checkbox'
import { SWEAgentSelection } from './SWEAgentSelection'
import MDEditor from '@uiw/react-md-editor'

interface Spec {
  id: string
  title: string
  description: string
  content: string
  created_at: string
  updated_at: string
  tags: string[]
  phase: string
  specification?: string
  plan?: string
  tasks?: TaskBreakdown[]
  branch_name?: string
  feature_number?: string
  version?: number
  constitutional_compliance?: {
    is_compliant: boolean
    violations: Array<{article: string, violation: string}>
    recommendations: string[]
    gates_passed: Record<string, boolean>
  }
  tech_stack?: string
  architecture?: string
  constraints?: string
}

interface CustomizationRequest {
  customer_scenario: string
  brand_theme: string
  primary_color: string
  company_name: string
  industry: string
  use_case: string
  additional_requirements: string
  use_mcp_tools: boolean
  use_a2a: boolean
}

interface TaskBreakdown {
  id: string
  title: string
  description: string
  estimatedTime: string
  estimatedTokens: string
  priority: string
  status: string
  acceptanceCriteria?: string[]
}

export function SpecWorkbench() {
  const params = useParams()
  const { specId } = params
  const navigate = useNavigate()
  const isNewSpec = window.location.pathname === '/spec/new' || specId === 'new'
  
  console.log('SpecWorkbench params:', params)
  console.log('SpecWorkbench specId:', specId)
  console.log('SpecWorkbench isNewSpec:', isNewSpec)
  console.log('Current pathname:', window.location.pathname)

  const [spec, setSpec] = useState<Spec | null>(null)
  const [loading, setLoading] = useState(!isNewSpec)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const [customization] = useState<CustomizationRequest>({
    customer_scenario: '',
    brand_theme: '',
    primary_color: '#3b82f6',
    company_name: '',
    industry: '',
    use_case: '',
    additional_requirements: '',
    use_mcp_tools: false,
    use_a2a: false
  })

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [endpoint, setEndpoint] = useState<string>('')
  const [githubPat, setGithubPat] = useState<string>('')
  const [preferImport, setPreferImport] = useState<boolean>(false)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)

  const [activeTab, setActiveTab] = useState<'details' | 'specify' | 'plan' | 'tasks'>('details')

  const [specPhase, setSpecPhase] = useState<'specification' | 'plan' | 'tasks' | 'completed'>('specification')
  const [requirements, setRequirements] = useState('')
  const [planContent, setPlanContent] = useState('')
  const [taskBreakdown, setTaskBreakdown] = useState<TaskBreakdown[]>([])
  const [workflowMode, setWorkflowMode] = useState<'breakdown' | 'oneshot'>('breakdown')
  const [isAssigningTasks, setIsAssigningTasks] = useState(false)
  const [assignmentPhase, setAssignmentPhase] = useState<'idle' | 'starting'>('idle')
  const [assignmentResponses, setAssignmentResponses] = useState<any[]>([])
  const [isAgentPanelExpanded, setIsAgentPanelExpanded] = useState(true)
  const [isBasicDetailsCollapsed, setIsBasicDetailsCollapsed] = useState(false)

  useEffect(() => {
    if (title && description && !isBasicDetailsCollapsed) {
      const timer = setTimeout(() => {
        setIsBasicDetailsCollapsed(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [title, description, isBasicDetailsCollapsed])

  const responseRef = useRef<HTMLDivElement>(null)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const fetchSpec = useCallback(async () => {
    if (isNewSpec || !specId) {
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch(`${apiUrl}/api/specs/${specId}`)
      if (response.ok) {
        const specData = await response.json()
        setSpec(specData)
        setTitle(specData.title || '')
        setDescription(specData.description || '')
        setContent(specData.content || '')
        setTags(specData.tags || [])
        setRequirements(specData.specification || '')
        setPlanContent(specData.plan || '')
        setTaskBreakdown(specData.tasks || [])
        setSpecPhase(specData.phase || 'specification')
      }
    } catch (error) {
      console.error('Error fetching spec:', error)
    } finally {
      setLoading(false)
    }
  }, [specId, isNewSpec, apiUrl])

  useEffect(() => {
    fetchSpec()
  }, [fetchSpec])

  const saveSpec = async () => {
    setSaving(true)
    try {
      const specData = {
        title,
        description,
        content,
        tags,
        specification: requirements,
        plan: planContent,
        tasks: taskBreakdown,
        phase: specPhase
      }

      console.log('Saving spec with data:', specData)
      console.log('Is new spec:', isNewSpec)
      console.log('Current specId:', specId)
      console.log('API endpoint:', `${apiUrl}/api/specs${isNewSpec ? '' : `/${specId}`}`)

      const response = await fetch(`${apiUrl}/api/specs${isNewSpec ? '' : `/${specId}`}`, {
        method: isNewSpec ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specData)
      })

      console.log('Save response status:', response.status)

      if (response.ok) {
        const savedSpec = await response.json()
        console.log('Saved spec response:', savedSpec)
        setSpec(savedSpec)
        if (isNewSpec) {
          console.log('Navigating to:', `/spec/${savedSpec.id}`)
          navigate(`/spec/${savedSpec.id}`)
        }
        toast({
          title: "Success",
          description: "Specification saved successfully"
        })
      } else {
        const errorText = await response.text()
        console.error('Save failed with status:', response.status, 'Error:', errorText)
        toast({
          title: "Error",
          description: `Failed to save specification: ${response.status}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error saving spec:', error)
      toast({
        title: "Error",
        description: "Failed to save specification",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSpecifyPhase = async () => {
    if (!requirements.trim()) {
      toast({
        title: "Requirements needed",
        description: "Please provide requirements before proceeding to planning phase",
        variant: "destructive"
      })
      return
    }

    try {
      let currentSpec = spec
      
      if (!currentSpec || isNewSpec || window.location.pathname.includes('/new')) {
        console.log('Saving spec first before specify phase...')
        await saveSpec()
        
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        if (window.location.pathname.includes('/new')) {
          toast({
            title: "Error",
            description: "Failed to save specification. Please try again.",
            variant: "destructive"
          })
          return
        }
        
        const urlParts = window.location.pathname.split('/')
        const specIdFromUrl = urlParts[urlParts.length - 1]
        
        if (specIdFromUrl && specIdFromUrl !== 'new') {
          console.log('Fetching saved spec with ID:', specIdFromUrl)
          try {
            const fetchResponse = await fetch(`${apiUrl}/api/specs/${specIdFromUrl}`)
            if (fetchResponse.ok) {
              currentSpec = await fetchResponse.json()
              console.log('Successfully fetched spec:', currentSpec)
            } else {
              console.error('Failed to fetch spec, using fallback')
              currentSpec = { 
                id: specIdFromUrl, 
                title, 
                description, 
                content, 
                tags,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                phase: 'specification'
              }
            }
          } catch (error) {
            console.error('Error fetching spec:', error)
            toast({
              title: "Error",
              description: "Failed to retrieve saved specification.",
              variant: "destructive"
            })
            return
          }
        } else {
          toast({
            title: "Error",
            description: "Unable to determine specification ID after saving.",
            variant: "destructive"
          })
          return
        }
      }

      if (!currentSpec?.id) {
        toast({
          title: "Error",
          description: "Unable to get specification ID. Please save the spec first.",
          variant: "destructive"
        })
        return
      }

      const response = await fetch(`${apiUrl}/api/specs/${currentSpec.id}/specify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements: requirements
        })
      })

      if (response.ok) {
        const result = await response.json()
        setSpec(result.spec)
        setSpecPhase('plan')
        setActiveTab('plan')
        toast({
          title: "Specification Complete",
          description: result.message || "Ready to proceed to planning phase"
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to complete specification phase')
      }
    } catch (error) {
      console.error('Error in specify phase:', error)
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to complete specification phase",
        variant: "destructive"
      })
    }
  }

  const handlePlanPhase = async () => {
    if (!spec?.id) {
      toast({
        title: "Error",
        description: "No specification ID found. Please complete the specify phase first.",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch(`${apiUrl}/api/specs/${spec.id}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_content: planContent || "Generate technical implementation plan"
        })
      })

      if (response.ok) {
        const result = await response.json()
        setPlanContent(result.plan || result.message)
        setSpecPhase('tasks')
        setActiveTab('tasks')
        toast({
          title: "Plan Generated",
          description: result.message || "Ready to break down into tasks"
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate plan')
      }
    } catch (error) {
      console.error('Error in plan phase:', error)
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to generate plan",
        variant: "destructive"
      })
    }
  }

  const handleTasksPhase = async () => {
    if (!spec?.id) {
      toast({
        title: "Error",
        description: "No specification ID found. Please complete previous phases first.",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch(`${apiUrl}/api/specs/${spec.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specification: requirements,
          plan: planContent,
          title,
          description
        })
      })

      if (response.ok) {
        const result = await response.json()
        setTaskBreakdown(result.tasks)
        setSpecPhase('completed')
        toast({
          title: "Tasks Generated",
          description: "Specification workflow complete"
        })
      }
    } catch (error) {
      console.error('Error in tasks phase:', error)
    }
  }

  const assignToSWEAgent = async () => {
    setIsAssigningTasks(true)
    setAssignmentPhase('starting')
    setAssignmentResponses([])

    try {
      const mappedCustomization = {
        ...customization,
        title,
        customer_scenario: customization.customer_scenario || description,
        additional_requirements: customization.additional_requirements || content
      }

      const payload = {
        spec_id: spec?.id || 'new',
        agent_type: selectedAgent,
        api_key: apiKey,
        endpoint: endpoint,
        customization: mappedCustomization,
        github_pat: githubPat,
        prefer_import: preferImport,
        selected_tasks: Array.from(selectedTasks),
        workflow_mode: workflowMode
      }

      const response = await fetch(`${apiUrl}/api/specs/assign-swe-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        setAssignmentResponses(prev => [...prev, result])
        
        toast({
          title: "Assignment Complete",
          description: "Specification assigned to SWE Agent successfully"
        })
      }
    } catch (error) {
      console.error('Error assigning to SWE agent:', error)
      toast({
        title: "Assignment Failed",
        description: "Failed to assign specification to SWE Agent",
        variant: "destructive"
      })
    } finally {
      setIsAssigningTasks(false)
      setAssignmentPhase('idle')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-figma-black flex items-center justify-center">
        <div className="flex items-center space-x-2 text-figma-text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading specification...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-figma-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link to="/specs" className="inline-flex items-center text-figma-text-secondary hover:text-figma-text-primary mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Specifications
          </Link>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">📝</div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {isNewSpec ? 'New Specification' : title || 'Specification'}
                </h1>
                <p className="text-gray-400 mt-2">
                  {isNewSpec ? 'Create a new spec following spec-kit methodology' : 'Edit and manage your specification'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={saveSpec}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className={`grid gap-8 transition-all duration-300 ${isAgentPanelExpanded ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          <div className={`space-y-6 ${isAgentPanelExpanded ? 'lg:col-span-2' : 'col-span-1'}`}>
            <Card className="bg-figma-medium-gray border-figma-light-gray">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-figma-text-primary">Spec-Kit Workflow</CardTitle>
                    <CardDescription className="text-figma-text-secondary">
                      Follow the three-phase methodology with constitutional governance
                    </CardDescription>
                  </div>
                  {spec?.branch_name && (
                    <div className="flex items-center gap-2 text-sm text-figma-text-secondary">
                      <GitBranch className="h-4 w-4" />
                      <span>Feature #{spec.feature_number}: {spec.branch_name}</span>
                      {spec.version && <span className="text-xs bg-figma-light-gray px-2 py-1 rounded">v{spec.version}</span>}
                    </div>
                  )}
                  
                  {spec?.constitutional_compliance && (
                    <div className="mt-3 p-3 rounded-lg bg-figma-light-gray">
                      <div className="flex items-center gap-2 mb-2">
                        {spec.constitutional_compliance.is_compliant ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-400" />
                        )}
                        <span className={`text-sm font-medium ${spec.constitutional_compliance.is_compliant ? 'text-green-400' : 'text-yellow-400'}`}>
                          Constitutional Compliance: {spec.constitutional_compliance.is_compliant ? 'PASSED' : 'NEEDS ATTENTION'}
                        </span>
                      </div>
                      
                      {spec.constitutional_compliance.violations && spec.constitutional_compliance.violations.length > 0 && (
                        <div className="text-xs text-figma-text-secondary">
                          <div className="font-medium mb-1">Violations:</div>
                          {spec.constitutional_compliance.violations.map((violation, idx) => (
                            <div key={idx} className="ml-2">• {violation.article}: {violation.violation}</div>
                          ))}
                        </div>
                      )}
                      
                      {spec.constitutional_compliance.gates_passed && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(spec.constitutional_compliance.gates_passed).map(([gate, passed]) => (
                            <Badge key={gate} className={`text-xs ${passed ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                              {gate}: {passed ? '✅' : '❌'}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('specify')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === 'specify' ? 'bg-blue-600 text-white' : 
                      specPhase === 'specification' ? 'bg-blue-500 text-white' :
                      (specPhase === 'plan' || specPhase === 'tasks' || specPhase === 'completed') ? 'bg-green-600 text-white hover:bg-green-500' : 
                      'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    1. Specify
                  </button>
                  <button
                    onClick={() => setActiveTab('plan')}
                    disabled={specPhase === 'specification' && !spec?.specification}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeTab === 'plan' ? 'bg-blue-600 text-white' :
                      specPhase === 'plan' ? 'bg-blue-500 text-white' :
                      (specPhase === 'tasks' || specPhase === 'completed') ? 'bg-green-600 text-white hover:bg-green-500' :
                      'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    2. Plan
                  </button>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    disabled={specPhase === 'specification' || (specPhase === 'plan' && !planContent)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeTab === 'tasks' ? 'bg-blue-600 text-white' :
                      (specPhase === 'tasks' || specPhase === 'completed') ? 'bg-green-600 text-white hover:bg-green-500' :
                      'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    3. Tasks
                  </button>
                </div>
              </CardContent>
            </Card>

            {showAdvanced && (
              <Card className="bg-figma-medium-gray border-figma-light-gray">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary">GitHub Integration</CardTitle>
                  <CardDescription className="text-figma-text-secondary">
                    Configure GitHub Personal Access Token for repository operations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="githubPat" className="text-white">GitHub Personal Access Token</Label>
                    <Input
                      id="githubPat"
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      value={githubPat}
                      onChange={(e) => setGithubPat(e.target.value)}
                      className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const token = githubPat.trim()
                        if (!token) {
                          alert('Please enter a GitHub token first')
                          return
                        }
                        try {
                          const r = await fetch(`${apiUrl}/api/github/test-token`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token })
                          })
                          const data = await r.json()
                          if (data.ok) {
                            alert(`GitHub token OK for ${data.login}\nScopes: ${(data.scopes || []).join(', ') || 'none'}`)
                          } else {
                            alert(`Token check failed: ${data.error || String(data.status)}`)
                          }
                        } catch (e: any) {
                          alert(`Token check error: ${String(e)}`)
                        }
                      }}
                    >
                      Test GitHub Token
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="preferImport" checked={preferImport} onCheckedChange={(checked) => setPreferImport(!!checked)} />
                    <Label htmlFor="preferImport" className="text-white text-sm">Prefer Import (copy) instead of Fork</Label>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-figma-medium-gray border-figma-light-gray">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-figma-text-primary">Basic Details</CardTitle>
                    <CardDescription className="text-figma-text-secondary">
                      Provide basic information about your specification
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setIsBasicDetailsCollapsed(!isBasicDetailsCollapsed)}
                    variant="ghost"
                    size="sm"
                    className="text-figma-text-secondary hover:text-figma-text-primary p-1"
                  >
                    {isBasicDetailsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {!isBasicDetailsCollapsed && (
                <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the specification..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                  />
                </div>

                <div>
                  <Label className="text-white">Tags</Label>
                  <div className="flex items-center space-x-2 mb-2">
                    <Input
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                    />
                    <Button onClick={addTag} size="sm" variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="bg-figma-dark-gray text-figma-text-secondary border-figma-light-gray">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-figma-text-secondary hover:text-white"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                </CardContent>
              )}
            </Card>

            {activeTab === 'specify' && (
              <Card className="bg-figma-medium-gray border-figma-light-gray border-2 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary">Phase 1: Specify Requirements</CardTitle>
                  <CardDescription className="text-figma-text-secondary">
                    Define what you want to build and why. Focus on the "what" and "why", not the tech stack.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="requirements" className="text-white">Requirements</Label>
                    <Textarea
                      id="requirements"
                      placeholder="Describe what you want to build. Be explicit about the problem, goals, and user needs..."
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary min-h-[120px]"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSpecifyPhase}
                      disabled={!requirements.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Complete Specification →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'plan' && (
              <Card className="bg-figma-medium-gray border-figma-light-gray border-2 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary">Phase 2: Plan Implementation</CardTitle>
                  <CardDescription className="text-figma-text-secondary">
                    Generate a detailed plan with constitutional governance validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {planContent ? (
                    <div className="space-y-4">
                      <div className="bg-figma-dark-gray p-4 rounded-lg">
                        <MDEditor.Markdown source={planContent} />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={handleTasksPhase}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Break Down into Tasks →
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Button
                        onClick={handlePlanPhase}
                        disabled={!requirements.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Generate Plan
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'tasks' && (
              <Card className="bg-figma-medium-gray border-figma-light-gray border-2 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary">Phase 3: Task Breakdown</CardTitle>
                  <CardDescription className="text-figma-text-secondary">
                    Break down the plan into actionable tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {taskBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      {taskBreakdown.map((task) => (
                        <div key={task.id} className="bg-figma-dark-gray p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-figma-text-primary">{task.title}</h4>
                            <Badge className={`text-xs ${
                              task.priority === 'high' ? 'bg-red-900/30 text-red-400' :
                              task.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-green-900/30 text-green-400'
                            }`}>
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-figma-text-secondary text-sm mb-2">{task.description}</p>
                          <div className="flex items-center gap-4 text-xs text-figma-text-secondary">
                            <span>Time: {task.estimatedTime}</span>
                            <span>Tokens: {task.estimatedTokens}</span>
                            <span>Status: {task.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Button
                        onClick={handleTasksPhase}
                        disabled={!planContent.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Generate Tasks
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'details' && (
              <Card className="bg-figma-medium-gray border-figma-light-gray">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary">Specification Details</CardTitle>
                  <CardDescription className="text-figma-text-secondary">
                    Basic information and content for your specification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-white">Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter specification title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                    />
                  </div>

                  <div>
                    <Label htmlFor="content" className="text-white">Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Additional specification content..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary min-h-[200px]"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {isAgentPanelExpanded && (
            <div className="lg:col-span-1">
              <Card className="bg-figma-medium-gray border-figma-light-gray sticky top-8">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      <CardTitle className="text-figma-text-primary">Agent Assignment</CardTitle>
                    </div>
                    <Button 
                      onClick={() => setIsAgentPanelExpanded(false)}
                      variant="outline"
                      size="sm"
                      className="text-figma-text-secondary hover:text-figma-text-primary border-figma-light-gray"
                    >
                      Hide Panel
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                  <CardDescription className="text-figma-text-secondary">
                    Assign this specification to a coding agent
                  </CardDescription>
                </CardHeader>
              <CardContent>
                <SWEAgentSelection
                  selectedAgent={selectedAgent}
                  setSelectedAgent={setSelectedAgent}
                  apiKey={apiKey}
                  setApiKey={setApiKey}
                  endpoint={endpoint}
                  setEndpoint={setEndpoint}
                  customization={{ ...customization, title }}
                  workflowMode={workflowMode}
                  selectedTasks={selectedTasks}
                  isAssigningTasks={isAssigningTasks}
                  onAssignToSWEAgent={assignToSWEAgent}
                  validationField="title"
                />

                {isAssigningTasks && (
                  <Card className="bg-figma-medium-gray border-figma-light-gray mt-4">
                    <CardHeader>
                      <CardTitle className="text-figma-text-primary flex items-center">
                        <Settings className="h-5 w-5 mr-2" />
                        Assignment In Progress
                      </CardTitle>
                      <CardDescription className="text-figma-text-secondary">Starting selected coding agent…</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm text-figma-text-secondary space-y-2">
                        <li className={`${assignmentPhase !== 'idle' ? 'text-white' : ''}`}>1. Start selected coding agent</li>
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {assignmentResponses.length > 0 && (
                  <div className="space-y-4 mt-4">
                    {assignmentResponses.map((resp, idx) => (
                      <Card key={idx} className="bg-figma-medium-gray border-figma-light-gray">
                        <CardHeader>
                          <CardTitle className="text-figma-text-primary">Assignment Result #{idx + 1}</CardTitle>
                        </CardHeader>
                        <CardContent ref={idx === assignmentResponses.length - 1 ? responseRef : undefined}>
                          <AssignmentResult result={resp} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
              </Card>
            </div>
          )}
        </div>
        
        {/* Show Panel Button - appears when agent panel is collapsed */}
        {!isAgentPanelExpanded && (
          <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAgentPanelExpanded(true)}
              className="text-figma-text-secondary hover:text-figma-text-primary border-figma-light-gray bg-figma-medium-gray shadow-lg rounded-l-md rounded-r-none border-r-0 px-3 py-6 flex flex-col items-center justify-center writing-mode-vertical"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              <ChevronLeft className="h-4 w-4 mb-1" />
              <span className="text-xs font-medium">Show Panel</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SpecWorkbench
