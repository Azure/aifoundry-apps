import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Settings, GitBranch, Loader2, Save, FileText, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from './ui/toast'
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
  // Spec-kit phases
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
  const { accessToken } = useAuth()
  const { specId } = useParams()
  const navigate = useNavigate()
  const isNewSpec = specId === 'new'

  const [spec, setSpec] = useState<Spec | null>(null)
  const [loading, setLoading] = useState(!isNewSpec)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const [customization, _setCustomization] = useState<CustomizationRequest>({
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
  const [taskBreakdown, setTaskBreakdown] = useState<TaskBreakdown[]>([])
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false)
  const [isAssigningTasks, setIsAssigningTasks] = useState(false)
  const [assignmentPhase, setAssignmentPhase] = useState<'idle' | 'agent' | 'done'>('idle')
  const [workflowMode, setWorkflowMode] = useState<'breakdown' | 'oneshot'>('breakdown')
  const [assignmentResponses, setAssignmentResponses] = useState<any[]>([])
  const [banner, setBanner] = useState<{ sessionUrl?: string; agent?: string } | null>(null)
  const responseRef = useRef<HTMLDivElement | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [preEnhanceContent, setPreEnhanceContent] = useState<string | null>(null)
  
  // Spec-kit phase state
  const [specPhase, setSpecPhase] = useState<'specification' | 'plan' | 'tasks' | 'completed'>('specification')
  const [requirements, setRequirements] = useState('')
  const [techStack, setTechStack] = useState('')
  const [architecture, setArchitecture] = useState('')
  const [constraints, setConstraints] = useState('')
  const [isProcessingPhase, setIsProcessingPhase] = useState(false)
  
  // UI state
  const [activeTab, setActiveTab] = useState<'details' | 'specify' | 'plan' | 'tasks'>('details')
  const [showBasicDetails, setShowBasicDetails] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [planExpanded, setPlanExpanded] = useState(false)
  
  const apiUrl = import.meta.env.VITE_API_URL

  const fetchSpec = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/specs/${specId}`)
      if (response.ok) {
        const data = await response.json()
        setSpec(data)
        setTitle(data.title)
        setDescription(data.description)
        setContent(data.content)
        setTags(data.tags || [])
        // Set spec-kit phase state
        setSpecPhase(data.phase || 'specification')
        setRequirements(data.specification || '')
        if (data.plan) {
          setContent(data.plan)
        }
        if (data.tasks) {
          setTaskBreakdown(data.tasks)
          setSidebarCollapsed(false) // Show sidebar when tasks are ready
        }
        // Update active tab based on phase
        if (data.phase === 'specification') {
          setActiveTab('specify')
        } else if (data.phase === 'plan') {
          setActiveTab('plan')
        } else if (data.phase === 'tasks' || data.phase === 'completed') {
          setActiveTab('tasks')
          setShowBasicDetails(false) // Hide basic details when advanced
        }
      }
    } catch (error) {
      console.error('Error fetching spec:', error)
    } finally {
      setLoading(false)
    }
  }, [specId, apiUrl])

  useEffect(() => {
    if (!isNewSpec && specId) {
      fetchSpec()
    }
  }, [specId, isNewSpec, fetchSpec])

  const saveSpec = async () => {
    setSaving(true)
    try {
      const specData = {
        title,
        description,
        content,
        tags
      }

      const url = isNewSpec ? `${apiUrl}/api/specs` : `${apiUrl}/api/specs/${specId}`
      const method = isNewSpec ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(specData)
      })

      if (response.ok) {
        const savedSpec = await response.json()
        if (isNewSpec) {
          navigate(`/spec/${savedSpec.id}`)
        } else {
          setSpec(savedSpec)
        }
      }
    } catch (error) {
      console.error('Error saving spec:', error)
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

  const generateTaskBreakdown = async () => {
    if (!spec && isNewSpec) {
      await saveSpec()
      return
    }

    setIsGeneratingTasks(true)
    setTaskBreakdown([])
    try {
      const mappedCustomization = {
        ...customization,
        customer_scenario: customization.customer_scenario || `Implement specification: ${title}`,
        use_case: customization.use_case || 'Specification Implementation',
        additional_requirements: `${customization.additional_requirements}\n\nSpecification Content:\n${content}`
      }

      console.debug('[breakdown] start', { id: spec?.id || specId })
      const ctrl = new AbortController()
      const response = await fetch(`${apiUrl}/api/specs/${spec?.id || specId}/breakdown?stream=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappedCustomization),
        signal: ctrl.signal
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (!response.body) {
        const data = await response.json()
        console.debug('[breakdown] non-stream JSON', data)
        setTaskBreakdown(Array.isArray(data) ? data : (data.tasks || []))
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let gotFirst = false
      const fallbackTimer = setTimeout(async () => {
        if (!gotFirst) {
          console.debug('[breakdown] no first chunk; falling back to non-stream')
          try { ctrl.abort() } catch {}
          try {
            const r2 = await fetch(`${apiUrl}/api/specs/${spec?.id || specId}/breakdown`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mappedCustomization)
            })
            const data2 = await r2.json()
            setTaskBreakdown(Array.isArray(data2) ? data2 : (data2.tasks || []))
          } catch (e) {
            console.error('[breakdown] non-stream fallback failed', e)
          } finally {
            setIsGeneratingTasks(false)
          }
        }
      }, 2500)
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        if (!gotFirst && value && value.length) gotFirst = true
        let idx
        while ((idx = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 1)
          if (!line) continue
          try {
            const obj = JSON.parse(line)
            console.debug('[breakdown] task line', obj)
            setTaskBreakdown(prev => {
              const exists = prev.some(t => t.id === obj.id)
              return exists ? prev : [...prev, obj]
            })
          } catch { /* wait for more */ }
        }
      }
      clearTimeout(fallbackTimer)
      // Final flush: try NDJSON leftover or JSON array/object
      const tail = buf.trim()
      if (tail) {
        // Try NDJSON lines
        const lines = tail.split('\n').map(l => l.trim()).filter(Boolean)
        let appended = 0
        for (const line of lines) {
          try {
            const obj = JSON.parse(line)
            console.debug('[breakdown] tail line', obj)
            setTaskBreakdown(prev => {
              const exists = prev.some(t => t.id === obj.id)
              if (!exists) appended++
              return exists ? prev : [...prev, obj]
            })
          } catch {}
        }
        if (!appended) {
          try {
            const parsed = JSON.parse(tail)
            const arr = Array.isArray(parsed) ? parsed : (parsed.tasks || [])
            console.debug('[breakdown] tail as JSON', { count: Array.isArray(arr) ? arr.length : 0 })
            if (Array.isArray(arr) && arr.length) setTaskBreakdown(arr)
          } catch {}
        }
      }
      console.debug('[breakdown] done')
    } catch (error) {
      console.error('Error generating task breakdown:', error)
    } finally {
      setIsGeneratingTasks(false)
    }
  }

  const enhanceSpecStream = async () => {
    if (!spec || isEnhancing) return
    setPreEnhanceContent(content)
    setContent('')
    setIsEnhancing(true)
    try {
      const response = await fetch(`${apiUrl}/api/specs/${spec.id}/enhance?stream=true`, {
        method: 'POST'
      })
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setContent(prev => (prev || '') + chunk)
      }
      toast({ title: 'Enhanced', description: 'Streaming complete.' })
    } catch (err) {
      console.error('Streaming enhance failed:', err)
      if (preEnhanceContent !== null) setContent(preEnhanceContent)
      toast({ title: 'Enhance failed', description: String(err), variant: 'destructive' as any })
    } finally {
      setIsEnhancing(false)
    }
  }

  // Spec-kit phase functions
  const handleSpecifyPhase = async () => {
    if (!requirements.trim()) return
    
    setIsProcessingPhase(true)
    try {
      let currentSpec = spec
      if (!currentSpec && isNewSpec) {
        const specData = {
          title,
          description,
          content: '',
          tags
        }

        const createResponse = await fetch(`${apiUrl}/api/specs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(specData)
        })

        if (createResponse.ok) {
          currentSpec = await createResponse.json()
          setSpec(currentSpec)
          
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          const errorText = await createResponse.text()
          throw new Error(`Failed to create specification: ${errorText}`)
        }
      }

      if (!currentSpec) {
        throw new Error('No specification available')
      }

      const response = await fetch(`${apiUrl}/api/specs/${currentSpec.id}/specify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requirements: requirements.trim(),
          tech_stack: techStack,
          architecture: architecture
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setSpec(result.spec)
        setContent(result.spec.specification || '')
        setSpecPhase('plan')
        setActiveTab('plan')
        setShowBasicDetails(false)
        toast({ title: '/specify Phase Complete', description: 'Feature specification created following spec-kit methodology.' })
      } else {
        const errorText = await response.text()
        throw new Error(`Failed to process specification: ${response.status} ${errorText}`)
      }
    } catch (error) {
      console.error('Error in specify phase:', error)
      toast({ 
        title: 'Specification Error', 
        description: `Failed to process specification: ${error.message}`,
        variant: 'destructive' as any 
      })
    } finally {
      setIsProcessingPhase(false)
    }
  }

  const handlePlanPhase = async () => {
    if (!spec || !techStack.trim()) return
    
    setIsProcessingPhase(true)
    try {
      const response = await fetch(`${apiUrl}/api/specs/${spec.id}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tech_stack: techStack,
          architecture: architecture,
          constraints: constraints
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setSpec(result.spec)
        setContent(result.spec.plan)
        setSpecPhase('tasks')
        setActiveTab('tasks')
        toast({ title: '/plan Phase Complete', description: 'Technical plan generated with constitutional validation.' })
      } else {
        throw new Error('Failed to generate plan')
      }
    } catch (error) {
      console.error('Error in plan phase:', error)
      toast({ title: 'Error', description: 'Failed to generate plan', variant: 'destructive' as any })
    } finally {
      setIsProcessingPhase(false)
    }
  }

  const handleTasksPhase = async () => {
    if (!spec) return
    
    setIsProcessingPhase(true)
    try {
      const response = await fetch(`${apiUrl}/api/specs/${spec.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: workflowMode })
      })
      
      if (response.ok) {
        const result = await response.json()
        setSpec(result.spec)
        setTaskBreakdown(result.tasks)
        setSpecPhase('completed')
        setSidebarCollapsed(false) // Show sidebar when tasks are ready
        toast({ title: 'Tasks Generated', description: result.next_step })
      } else {
        throw new Error('Failed to generate tasks')
      }
    } catch (error) {
      console.error('Error in tasks phase:', error)
      toast({ title: 'Error', description: 'Failed to generate tasks', variant: 'destructive' as any })
    } finally {
      setIsProcessingPhase(false)
    }
  }

  const assignToSWEAgent = async (taskId?: string, endpointParam?: string) => {

    // Validate auth requirements
    if (selectedAgent === 'codex-cli' || selectedAgent === 'devin') {
      if (!selectedAgent || !apiKey) return
    } else {
      if (!selectedAgent || !accessToken) return
    }

    // Helper to post one assignment (optionally scoped to a task)
    const postOne = async (task?: TaskBreakdown) => {
      setIsAssigningTasks(true)
      setAssignmentPhase('agent')
      try {
      const mappedCustomization = {
        ...customization,
        customer_scenario: customization.customer_scenario || `Implement specification: ${title}`,
        use_case: customization.use_case || 'Specification Implementation',
        additional_requirements: `${customization.additional_requirements}\n\nSpecification Content:\n${content}`
      }

      const payload = {
        agent_id: selectedAgent,
        api_key: (selectedAgent === 'codex-cli' || selectedAgent === 'devin') ? apiKey : accessToken,
        github_token: accessToken || undefined,
        github_pat: githubPat || undefined,
        prefer_import: preferImport,
        endpoint: endpointParam || endpoint,
        template_id: spec?.id || specId,
        customization: mappedCustomization,
        ...(task ? { task_id: task.id, task_details: task } : taskId ? { task_id: taskId } : { 
          mode: workflowMode === 'oneshot' ? 'oneshot' : 'breakdown'
        })
      }

      const response = await fetch(`${apiUrl}/api/specs/${spec?.id || specId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && selectedAgent !== 'devin' && selectedAgent !== 'codex-cli' ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        setAssignmentPhase('done')
        console.log('Assignment successful:', result)
        setAssignmentResponses(prev => [...prev, result])

        const sessionUrl = (result.session_url || (result.session_id ? `https://app.devin.ai/sessions/${result.session_id}` : '')) as string | undefined
        const agentName = (result.agent || selectedAgent || 'agent') as string
        setBanner({ sessionUrl, agent: agentName })
        toast({
          title: 'Agent session started',
          description: (
            <div className="space-x-3">
              <span className="mr-2 text-figma-text-secondary">Agent: {agentName}</span>
              {(result.session_url || result.session_id) && (
                <a className="underline" href={result.session_url || `https://app.devin.ai/sessions/${result.session_id}`} target="_blank" rel="noopener noreferrer">Open Devin Session</a>
              )}
            </div>
          ),
          action: (
            <ToastAction
              altText="Copy link"
              onClick={async () => {
                try {
                  if (sessionUrl) {
                    await navigator.clipboard.writeText(sessionUrl)
                    toast({ title: 'Link copied' })
                  }
                } catch {}
              }}
            >
              Copy Link
            </ToastAction>
          ),
        })
      } else {
        const error = await response.json()
        console.error('Assignment failed:', error)
        setAssignmentResponses(prev => [...prev, {
          status: 'error',
          message: error.detail || 'Unknown error occurred',
          agent: selectedAgent
        }])
        toast({
          title: 'Assignment failed',
          description: 'View details below',
          action: (
            <ToastAction altText="View details" onClick={() => responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              View details
            </ToastAction>
          ),
          variant: 'destructive' as any,
        })
      }
    } catch (error) {
      console.error('Error assigning to SWE agent:', error)
      setAssignmentResponses(prev => [...prev, {
        status: 'error',
        message: `Error assigning to SWE agent: ${error}`,
        agent: selectedAgent
      }])
      toast({
        title: 'Assignment error',
        description: 'View details below',
        action: (
          <ToastAction altText="View details" onClick={() => responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            View details
          </ToastAction>
        ),
        variant: 'destructive' as any,
      })
    } finally {
      setIsAssigningTasks(false)
      setAssignmentPhase('idle')
    }
    }

    // Reset previous results when starting a new assignment batch
    setAssignmentResponses([])

    // If multiple tasks are selected in breakdown mode and no explicit taskId provided,
    // create a Devin session per selected task, sequentially.
    if (!taskId && workflowMode === 'breakdown' && selectedTasks.size > 0) {
      for (const id of selectedTasks) {
        const task = taskBreakdown.find(t => t.id === id)
        await postOne(task)
      }
      // Clear selection after dispatching
      setSelectedTasks(new Set())
      return
    }

    // Otherwise, single assignment (oneshot or single task)
    await postOne()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-figma-text-secondary" />
        </div>
        {banner && (
          <div className="mb-4 rounded border border-figma-light-gray bg-figma-medium-gray p-3 flex items-center justify-between">
            <div className="text-sm text-figma-text-secondary space-x-3">
              <span>Agent session ready{banner.agent ? ` • Agent: ${banner.agent}` : ''}</span>
              {banner.sessionUrl && (<a className="underline" href={banner.sessionUrl} target="_blank" rel="noopener noreferrer">Open Devin Session</a>)}
            </div>
            <button className="text-figma-text-secondary hover:text-white" onClick={() => setBanner(null)}>×</button>
          </div>
        )}
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
                  {isNewSpec ? 'Create a new specification with markdown editor' : description}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4"></div>
          </div>
        </div>

        <div className={`flex gap-8 ${sidebarCollapsed ? '' : 'pr-80'} transition-all duration-300`}>
          <div className="flex-1 space-y-6">
            {/* Spec-Kit Phase Progress */}
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
                    disabled={specPhase === 'specification' || (specPhase === 'plan' && !spec?.plan)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeTab === 'tasks' ? 'bg-blue-600 text-white' :
                      specPhase === 'tasks' ? 'bg-blue-500 text-white' :
                      specPhase === 'completed' ? 'bg-green-600 text-white hover:bg-green-500' :
                      'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    3. Tasks
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <Card className="bg-figma-medium-gray border-figma-light-gray">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-figma-text-primary flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Basic Details
                    </CardTitle>
                    <Button 
                      onClick={saveSpec} 
                      disabled={saving || !title.trim()}
                      className="bg-white text-black hover:bg-gray-200"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <CardDescription className="text-figma-text-secondary">
                    Project title and description
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

            {/* Advanced GitHub options toggle */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm underline text-figma-text-secondary hover:text-white"
              >
                {showAdvanced ? 'Hide Advanced GitHub Options' : 'Show Advanced GitHub Options'}
              </button>
            </div>

            {showAdvanced && (
              <Card className="bg-figma-medium-gray border-figma-light-gray">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary">Advanced GitHub Options</CardTitle>
                  <CardDescription className="text-figma-text-secondary">
                    If authenticated but API calls fail with 403, provide a classic Personal Access Token or choose import instead of fork.
                    <br />
                    Token scopes: <span className="text-white">public_repo</span> (for public repos). Use <span className="text-white">repo</span> for private repos or managing Actions secrets.
                    {' '}<a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline text-blue-400 hover:text-blue-300 ml-1">Get a GitHub token</a>.
                  </CardDescription>
                </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="githubPat" className="text-white">GitHub Personal Access Token (optional)</Label>
                  <Input
                    id="githubPat"
                    type="password"
                    placeholder="github_pat_… or ghp_… (public_repo or repo scope)"
                    value={githubPat}
                    onChange={(e) => setGithubPat(e.target.value)}
                    className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs"
                    onClick={async () => {
                      const token = githubPat || accessToken
                      if (!token) return
                      try {
                        const r = await fetch(`${apiUrl}/api/github/test-token`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ token })
                        })
                        const data = await r.json()
                        if (data.ok) {
                          // simple confirmation
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
                </div>

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
            </Card>
            )}

            {/* Phase 1: Specify */}
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
                  <Button
                    onClick={handleSpecifyPhase}
                    disabled={!requirements.trim() || isProcessingPhase}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessingPhase ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing Specification...
                      </>
                    ) : (
                      'Complete Specification Phase'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Phase 2: Plan */}
            {activeTab === 'plan' && (
              <Card className="bg-figma-medium-gray border-figma-light-gray border-2 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary">Phase 2: Technical Planning</CardTitle>
                  <CardDescription className="text-figma-text-secondary">
                    Define your tech stack, architecture, and technical constraints.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="techStack" className="text-white">Technology Stack</Label>
                    <Textarea
                      id="techStack"
                      placeholder="e.g., React with TypeScript, Node.js backend, PostgreSQL database..."
                      value={techStack}
                      onChange={(e) => setTechStack(e.target.value)}
                      className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                    />
                  </div>
                  <div>
                    <Label htmlFor="architecture" className="text-white">Architecture (Optional)</Label>
                    <Textarea
                      id="architecture"
                      placeholder="e.g., Microservices, REST API, Event-driven architecture..."
                      value={architecture}
                      onChange={(e) => setArchitecture(e.target.value)}
                      className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                    />
                  </div>
                  <div>
                    <Label htmlFor="constraints" className="text-white">Constraints (Optional)</Label>
                    <Textarea
                      id="constraints"
                      placeholder="e.g., Must run on AWS, No external dependencies, Performance requirements..."
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                    />
                  </div>
                  <Button
                    onClick={handlePlanPhase}
                    disabled={!techStack.trim() || isProcessingPhase}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessingPhase ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Plan...
                      </>
                    ) : (
                      'Generate Technical Plan'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Phase 3: Tasks */}
            {activeTab === 'tasks' && (
              <Card className="bg-figma-medium-gray border-figma-light-gray border-2 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary">Phase 3: Task Breakdown</CardTitle>
                  <CardDescription className="text-figma-text-secondary">
                    Generate actionable implementation tasks based on your specification and plan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex space-x-3">
                      <div
                        onClick={() => setWorkflowMode('breakdown')}
                        className={`flex-1 relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                          workflowMode === 'breakdown' 
                            ? 'border-green-500 bg-green-500/10' 
                            : 'border-figma-light-gray bg-figma-dark-gray hover:border-green-400'
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-medium ${workflowMode === 'breakdown' ? 'text-white' : 'text-figma-text-primary'}`}>
                              Task Breakdown
                            </span>
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-medium">
                              Recommended
                            </span>
                          </div>
                          <span className="text-xs text-figma-text-secondary">
                            Structured, actionable tasks with detailed acceptance criteria
                          </span>
                        </div>
                      </div>

                      <div
                        onClick={() => setWorkflowMode('oneshot')}
                        className={`flex-1 relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                          workflowMode === 'oneshot' 
                            ? 'border-yellow-500 bg-yellow-500/10' 
                            : 'border-figma-light-gray bg-figma-dark-gray hover:border-yellow-400'
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-medium ${workflowMode === 'oneshot' ? 'text-white' : 'text-figma-text-primary'}`}>
                              One-Shot
                            </span>
                            <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full font-medium">
                              Not Recommended
                            </span>
                          </div>
                          <span className="text-xs text-figma-text-secondary">
                            Single comprehensive task, less structured
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-figma-text-secondary bg-figma-dark-gray/50 p-3 rounded-lg">
                      <p>💡 <strong>Task Breakdown</strong> follows spec-kit methodology with structured, detailed tasks that improve implementation quality and learning outcomes.</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleTasksPhase}
                    disabled={isProcessingPhase}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessingPhase ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Tasks...
                      </>
                    ) : (
                      'Generate Implementation Tasks'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Show content/plan when appropriate */}
            {(activeTab === 'plan' || activeTab === 'tasks') && spec?.plan && (
              <Card className="bg-figma-medium-gray border-figma-light-gray">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-figma-text-primary">Technical Plan</CardTitle>
                      <CardDescription className="text-figma-text-secondary">
                        Generated implementation plan
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPlanExpanded(!planExpanded)}
                      className="text-figma-text-secondary hover:text-white"
                    >
                      {planExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Expand
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mt-2" data-color-mode="dark">
                    <MDEditor
                      value={content}
                      onChange={(val: string | undefined) => setContent(val || '')}
                      preview="preview"
                      hideToolbar={true}
                      height={planExpanded ? 600 : 300}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Task List - only show in tasks tab */}
            {activeTab === 'tasks' && (isGeneratingTasks || taskBreakdown.length > 0) && (
              <Card className="bg-figma-medium-gray border-figma-light-gray">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary">Task List</CardTitle>
                  <CardDescription className="text-figma-text-secondary">Select tasks to assign to an AI agent</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedTasks.size === taskBreakdown.length && taskBreakdown.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedTasks(new Set(taskBreakdown.map(t => t.id)))
                          else setSelectedTasks(new Set())
                        }}
                      />
                      <span className="text-white text-sm">Select All</span>
                    </div>
                    <span className="text-figma-text-secondary text-xs">{selectedTasks.size} selected</span>
                  </div>
                  <div className="space-y-2">
                    {isGeneratingTasks && taskBreakdown.length === 0 && (
                      <div className="text-figma-text-secondary text-sm">Waiting for first tasks…</div>
                    )}
                    {taskBreakdown.map((task) => (
                      <div key={task.id} className="bg-figma-dark-gray p-3 rounded border border-figma-light-gray">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedTasks.has(task.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedTasks)
                                if (checked) newSelected.add(task.id)
                                else newSelected.delete(task.id)
                                setSelectedTasks(newSelected)
                              }}
                            />
                            <h5 className="text-figma-text-primary font-medium">{task.title}</h5>
                          </div>
                          <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-figma-text-secondary text-sm mb-2">{task.description}</p>
                        {Array.isArray(task.acceptanceCriteria) && task.acceptanceCriteria.length > 0 && (
                          <ul className="list-disc ml-6 text-figma-text-secondary text-xs mb-2">
                            {task.acceptanceCriteria.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-figma-text-secondary text-xs">Est. {task.estimatedTime}</span>
                          <span className="text-figma-text-secondary text-xs">{task.estimatedTokens} tokens</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Show sidebar button when collapsed */}
          {sidebarCollapsed && taskBreakdown.length > 0 && (
            <Button
              onClick={() => setSidebarCollapsed(false)}
              className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              SWE Agent
            </Button>
          )}

          {/* Collapsible Right Sidebar for SWE Agent Selection */}
          <div className={`fixed right-0 top-0 h-full w-80 bg-figma-black border-l border-figma-light-gray transform transition-transform duration-300 ease-in-out z-50 ${sidebarCollapsed ? 'translate-x-full' : 'translate-x-0'} overflow-y-auto`}>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-figma-text-primary">SWE Agent</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(true)}
                  className="text-figma-text-secondary hover:text-white"
                >
                  ×
                </Button>
              </div>
              
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
                <Card className="bg-figma-medium-gray border-figma-light-gray">
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
                <div className="space-y-4">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
