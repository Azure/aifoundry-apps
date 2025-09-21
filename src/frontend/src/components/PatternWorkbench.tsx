import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import mermaid from 'mermaid'
import { ArrowLeft, Settings, GitBranch, Loader2, X } from 'lucide-react'
import { Progress } from './ui/progress'
import { Button } from './ui/button'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from './ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { SWEAgentSelection } from './SWEAgentSelection'

interface PatternCustomization {
  patternType: string
  scenarioDescription: string
  inputFormat: string
  outputFormat: string
  agentConfiguration: string
  azureFoundryConfig: string
  useMCPTools: boolean
  useA2A: boolean
  owner?: string
  repo?: string
  [key: string]: unknown
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
}

export function PatternWorkbench() {
  const { accessToken } = useAuth()
  const { patternId } = useParams()
  const mermaidRef = useRef<HTMLDivElement>(null)

  const patterns = [
    {
      id: 'prompt-chaining',
      title: 'Prompt Chaining',
      description: 'Sequential processing where the output of one agent becomes the input for the next, with conditional gates and error handling for complex multi-step workflows.',
      mermaidCode: `
        flowchart LR
          In[In] --> A[🧠]
          A --> |Output 1| Gate{Gate}
          Gate --> |Pass| B[🧠]
          Gate --> |Fail| Exit[Exit]
          B --> |Output 2| C[🧠]
          C --> Out[Out]
          
          style In fill:#374151,stroke:#9CA3AF,color:#F3F4F6
          style Out fill:#1F2937,stroke:#9CA3AF,color:#F3F4F6
          style Exit fill:#1F2937,stroke:#9CA3AF,color:#F3F4F6
          style Gate fill:#374151,stroke:#9CA3AF,color:#F3F4F6
          style A fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
          style B fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
          style C fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
      `
    },
    {
      id: 'routing',
      title: 'Routing',
      description: 'Intelligent request routing where a central router agent directs tasks to specialized agents based on content analysis and agent capabilities.',
      mermaidCode: `
        flowchart TD
          In[In] --> Router[🧠<br/>Router]
          Router --> A[🧠]
          Router --> B[🧠]
          Router --> C[🧠]
          Router --> D[🧠]
          A --> Out[Out]
          B --> Out
          C --> Out
          D --> Out
          
          style In fill:#374151,stroke:#9CA3AF,color:#F3F4F6
          style Out fill:#1F2937,stroke:#9CA3AF,color:#F3F4F6
          style Router fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
          style A fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
          style B fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
          style C fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
          style D fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
      `
    },
    {
      id: 'parallelization',
      title: 'Parallelization',
      description: 'Concurrent processing where multiple agents work simultaneously on different aspects of a task, with results aggregated for comprehensive output.',
      mermaidCode: `
        flowchart LR
          In[Input] --> A[Agent A]
          In --> B[Agent B]
          In --> C[Agent C]
          A --> Agg[Aggregator]
          B --> Agg
          C --> Agg
          Agg --> Out[Output]
          
          style In fill:#4B5563,stroke:#9CA3AF,color:#F9FAFB
          style Out fill:#1F2937,stroke:#9CA3AF,color:#F9FAFB
          style Agg fill:#4B5563,stroke:#9CA3AF,color:#F9FAFB
          style A fill:#6B7280,stroke:#9CA3AF,color:#F9FAFB
          style B fill:#6B7280,stroke:#9CA3AF,color:#F9FAFB
          style C fill:#6B7280,stroke:#9CA3AF,color:#F9FAFB
      `
    },
    {
      id: 'orchestrator',
      title: 'Orchestrator',
      description: 'Complex workflow management where an orchestrator coordinates multiple specialized agents and synthesizes their outputs into cohesive results.',
      mermaidCode: `
        flowchart TD
          In[In] --> Orch[🧠<br/>Orchestrator]
          Orch --> A[🧠]
          Orch --> B[🧠]
          A --> Synth[🧠<br/>Synthesizer]
          B --> Synth
          Orch --> C[🧠]
          C --> Synth
          Synth --> Out[Out]
          
          style In fill:#374151,stroke:#9CA3AF,color:#F3F4F6
          style Out fill:#1F2937,stroke:#9CA3AF,color:#F3F4F6
          style Orch fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
          style Synth fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
          style A fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
          style B fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
          style C fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
      `
    },
    {
      id: 'evaluator-optimizer',
      title: 'Evaluator-optimizer',
      description: 'Iterative improvement system where a generator creates solutions and an evaluator provides feedback, creating a continuous optimization loop.',
      mermaidCode: `
        flowchart TD
          In[In] --> Gen[🧠<br/>Generator]
          Gen --> |Solution| Eval[🧠<br/>Evaluator]
          Eval --> |Accepted| Out[Out]
          Eval --> |Rejected +<br/>Feedback| Gen
          
          style In fill:#374151,stroke:#9CA3AF,color:#F3F4F6
          style Out fill:#1F2937,stroke:#9CA3AF,color:#F3F4F6
          style Gen fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
          style Eval fill:#4B5563,stroke:#9CA3AF,color:#F3F4F6
      `
    }
  ]

  const currentPattern = patterns.find(p => p.id === patternId)

  useEffect(() => {
    console.log('PatternWorkbench useEffect - checking conditions:', {
      mermaidRef: !!mermaidRef.current,
      currentPattern: !!currentPattern,
      patternId: currentPattern?.id,
      mermaid: !!mermaid
    })
    
    if (mermaidRef.current && currentPattern && mermaid) {
      if (typeof mermaid.initialize !== 'function') {
        console.error('Mermaid not properly loaded')
        return
      }

      // Clear previous content
      mermaidRef.current.innerHTML = ''

      try {
        // Initialize mermaid with dark theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#4B5563',
            primaryTextColor: '#F9FAFB',
            primaryBorderColor: '#9CA3AF',
            lineColor: '#9CA3AF',
            secondaryColor: '#6B7280',
            tertiaryColor: '#9CA3AF',
            background: '#1F2937',
            mainBkg: '#4B5563',
            secondBkg: '#6B7280',
            tertiaryBkg: '#9CA3AF'
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true
          }
        })
        
        const renderDiagram = async () => {
          try {
            console.log('Rendering diagram for pattern:', currentPattern.id)
            console.log('Mermaid code:', currentPattern.mermaidCode)
            
            const result = await mermaid.render(`mermaid-pattern-${currentPattern.id}-${Date.now()}`, currentPattern.mermaidCode)
            console.log('Mermaid render successful, SVG length:', result.svg.length)
            
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = result.svg
              
              const svg = mermaidRef.current.querySelector('svg')
              console.log('SVG element found:', !!svg)
              
              if (svg) {
                svg.style.width = '100%'
                svg.style.height = 'auto'
                svg.style.maxWidth = '100%'
                svg.style.display = 'block'
                console.log('Applied styles to SVG')
              }
            }
          } catch (error) {
            console.error('Mermaid rendering error:', error)
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = `
                <div class="text-gray-400 text-sm p-4 border border-gray-600 rounded">
                  <p class="mb-2">Diagram preview not available</p>
                  <p class="text-xs text-red-400 mb-2">Error: ${error instanceof Error ? error.message : String(error)}</p>
                  <pre class="text-xs overflow-x-auto bg-gray-800 p-2 rounded">${currentPattern.mermaidCode}</pre>
                </div>
              `
            }
          }
        }
        
        renderDiagram()
      } catch (initError) {
        console.error('Mermaid initialization error:', initError)
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `
            <div class="text-gray-400 text-sm p-4 border border-gray-600 rounded">
              <p class="mb-2">Failed to initialize diagram</p>
              <p class="text-xs text-red-400">Error: ${initError instanceof Error ? initError.message : String(initError)}</p>
            </div>
          `
        }
      }
    }
  }, [currentPattern?.id, currentPattern?.mermaidCode, currentPattern])

  const getDefaultScenario = (patternId: string | undefined) => {
    switch (patternId) {
      case 'prompt-chaining':
        return 'Process customer support tickets by first analyzing sentiment, then categorizing the issue, and finally generating appropriate responses'
      case 'routing':
        return 'Route incoming user queries to specialized agents based on intent classification and complexity analysis'
      case 'parallelization':
        return 'Analyze multiple documents simultaneously for compliance checking and risk assessment'
      case 'orchestrator':
        return 'Coordinate multiple AI agents to complete a complex workflow like order processing and fulfillment'
      case 'evaluator-optimizer':
        return 'Continuously evaluate and optimize marketing campaign performance across multiple channels'
      default:
        return 'Describe your specific use case and scenario for this AI agent pattern'
    }
  }

  const getDefaultInputFormat = (patternId: string | undefined) => {
    switch (patternId) {
      case 'prompt-chaining':
        return 'Customer support ticket with text content and metadata'
      case 'routing':
        return 'User query with context and priority level'
      case 'parallelization':
        return 'Array of documents or data sources to process'
      case 'orchestrator':
        return 'Workflow request with parameters and requirements'
      case 'evaluator-optimizer':
        return 'Performance metrics and campaign data'
      default:
        return 'JSON object with required fields'
    }
  }

  const getDefaultOutputFormat = (patternId: string | undefined) => {
    switch (patternId) {
      case 'prompt-chaining':
        return 'Structured response with sentiment, category, and suggested reply'
      case 'routing':
        return 'Agent assignment with confidence score and reasoning'
      case 'parallelization':
        return 'Aggregated results from all parallel processing tasks'
      case 'orchestrator':
        return 'Workflow status with completed steps and next actions'
      case 'evaluator-optimizer':
        return 'Optimization recommendations with performance metrics'
      default:
        return 'JSON response with results and metadata'
    }
  }

  const getDefaultAgentConfig = (patternId: string | undefined) => {
    switch (patternId) {
      case 'prompt-chaining':
        return 'Temperature: 0.3, Max tokens: 500, Chain depth: 3 steps'
      case 'routing':
        return 'Classification threshold: 0.8, Fallback agent: general-purpose'
      case 'parallelization':
        return 'Max concurrent tasks: 5, Timeout: 30s, Retry attempts: 2'
      case 'orchestrator':
        return 'Coordination strategy: sequential, Error handling: rollback'
      case 'evaluator-optimizer':
        return 'Evaluation frequency: hourly, Optimization threshold: 5% improvement'
      default:
        return 'Configure agent-specific parameters and settings'
    }
  }

  const [customization, setCustomization] = useState<PatternCustomization>({
    patternType: patternId || '',
    scenarioDescription: getDefaultScenario(patternId),
    inputFormat: getDefaultInputFormat(patternId),
    outputFormat: getDefaultOutputFormat(patternId),
    agentConfiguration: getDefaultAgentConfig(patternId),
    azureFoundryConfig: '',
    useMCPTools: false,
    useA2A: false
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
  const [assignmentPhase, setAssignmentPhase] = useState<'idle' | 'fork' | 'write' | 'agent' | 'done'>('idle')
  const [workflowMode, setWorkflowMode] = useState<'breakdown' | 'oneshot'>('breakdown')
  const [assignmentResponse, setAssignmentResponse] = useState<Record<string, unknown> | null>(null)
  const [banner, setBanner] = useState<{ repoUrl?: string; sessionUrl?: string; agent?: string } | null>(null)
  const responseRef = useRef<HTMLDivElement | null>(null)
  const [progressLog, setProgressLog] = useState<string[]>([])
  const [progressPercent, setProgressPercent] = useState<number | undefined>(undefined)
  const [lastProgressAt, setLastProgressAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState<boolean>(false)
  const [manualForkInfo, setManualForkInfo] = useState<null | { fork_url: string; suggested_owner?: string; suggested_repo?: string }>(null)

  const apiUrl = import.meta.env.VITE_API_URL

  const mapPatternToCustomizationRequest = (): CustomizationRequest => {
    return {
      customer_scenario: customization.scenarioDescription,
      brand_theme: `${customization.inputFormat} → ${customization.outputFormat}`,
      primary_color: '#6b7280',
      company_name: `Pattern: ${formatPatternTitle(patternId || '')}`,
      industry: 'AI/Technology',
      use_case: customization.patternType,
      additional_requirements: customization.agentConfiguration,
      use_mcp_tools: customization.useMCPTools,
      use_a2a: customization.useA2A
    }
  }

  const generateTaskBreakdown = async () => {
    setIsGeneratingTasks(true)
    try {
      const mappedCustomization = mapPatternToCustomizationRequest()
      console.log('DEBUG: Sending payload:', mappedCustomization)
      console.log('DEBUG: Payload JSON:', JSON.stringify(mappedCustomization, null, 2))
      const response = await fetch(`${apiUrl}/api/templates/${patternId}/breakdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mappedCustomization)
      })
      
      if (response.ok) {
        const tasks = await response.json()
        setTaskBreakdown(tasks)
      }
    } catch (error) {
      console.error('Error generating task breakdown:', error)
    } finally {
      setIsGeneratingTasks(false)
    }
  }

  const resumeAfterManualFork = async () => {
    if (!apiKey) return
    const jobId = (window.crypto && 'randomUUID' in crypto)
      ? (crypto as Crypto).randomUUID()
      : Math.random().toString(36).slice(2)
    setIsAssigningTasks(true)
    setTimedOut(false)
    setProgressLog([])
    setProgressPercent(undefined)
    setAssignmentPhase('write')
    try {
      const es = new EventSource(`${apiUrl}/api/progress/${jobId}/stream`)
      es.addEventListener('write-agents', () => setAssignmentPhase('write'))
      es.addEventListener('agent-start', () => setAssignmentPhase('agent'))
      es.addEventListener('done', () => { setAssignmentPhase('done'); es.close() })
    } catch {
      // Ignore errors during EventSource setup
    }
    const mappedCustomization = mapPatternToCustomizationRequest()
    const payload = {
      agent_id: 'devin',
      api_key: apiKey,
      github_token: accessToken || undefined,
      github_pat: githubPat || undefined,
      endpoint,
      template_id: patternId,
      customization: mappedCustomization,
      mode: workflowMode === 'oneshot' ? 'oneshot' : 'breakdown'
    }
    try {
      const response = await fetch(`${apiUrl}/api/templates/${patternId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify(payload)
      })
      
      if (response.ok) {
        const result = await response.json()
        setAssignmentResponse(result)
        setAssignmentPhase('done')
      }
    } catch (error) {
      console.error('Error resuming after manual fork:', error)
      setAssignmentPhase('idle')
    }
    setIsAssigningTasks(false)
  }

  const assignToSWEAgent = async (taskId?: string, endpointParam?: string) => {
    
    if (selectedAgent === 'codex-cli' || selectedAgent === 'devin') {
      if (!selectedAgent || !apiKey) return
    } else {
      if (!selectedAgent || !accessToken) return
    }

    setIsAssigningTasks(true)
    setAssignmentPhase('fork')
    setShowAdvanced(false)
    setManualForkInfo(null)
    setTimedOut(false)
    setProgressPercent(undefined)
    setLastProgressAt(Date.now())
    try {
      const mappedCustomization = mapPatternToCustomizationRequest()
      const payload = {
        agent_id: selectedAgent,
        api_key: (selectedAgent === 'codex-cli' || selectedAgent === 'devin') ? apiKey : accessToken,
        github_token: accessToken || undefined,
        github_pat: githubPat || undefined,
        prefer_import: preferImport,
        endpoint: endpointParam || endpoint,
        template_id: patternId,
        customization: mappedCustomization,
        ...(taskId ? { task_id: taskId } : { 
          mode: workflowMode === 'oneshot' ? 'oneshot' : 'breakdown'
        })
      }

      const jobId = crypto.randomUUID()
      const es = new EventSource(`${apiUrl}/api/progress/${jobId}/stream`)
      const mark = () => setLastProgressAt(Date.now())
      const bump = (p: number) => setProgressPercent(prev => Math.max(prev ?? 0, p))
      es.addEventListener('fork-start', () => { setProgressLog(prev => [...prev, 'Forking repository…']); mark(); bump(10) })
      es.addEventListener('fork-ok', () => { setProgressLog(prev => [...prev, 'Fork complete']); mark(); bump(30) })
      es.addEventListener('create-start', () => { setProgressLog(prev => [...prev, 'Creating repository…']); mark(); bump(20) })
      es.addEventListener('populate-start', () => { setProgressLog(prev => [...prev, 'Populating repository contents…']); mark(); bump(40) })
      es.addEventListener('import-ok', () => { setProgressLog(prev => [...prev, 'Import completed']); mark(); bump(60) })
      es.addEventListener('copy-ok', () => { setProgressLog(prev => [...prev, 'Copy completed']); mark(); bump(70) })
      es.addEventListener('copy-progress', (e: MessageEvent) => {
        try {
          const data = JSON.parse((e as MessageEvent).data)
          const { copied, total } = data || {}
          if (copied) {
            setProgressLog(prev => [...prev, `Copied ${copied}${total ? ` / ${total}` : ''} files…`])
            if (total) setProgressPercent(Math.max(70, Math.min(90, Math.round((copied / total) * 90))))
            mark()
          }
        } catch {
          // Ignore errors during progress updates
        }
      })
      es.addEventListener('write-agents', () => { setAssignmentPhase('write'); bump(85); mark() })
      es.addEventListener('agent-start', () => { setAssignmentPhase('agent'); bump(90); mark() })
      es.addEventListener('done', () => { setAssignmentPhase('done'); setProgressPercent(100); mark(); es.close() })

      const interval = window.setInterval(() => {
        if (!lastProgressAt) return
        if (Date.now() - (lastProgressAt || 0) > 60000 && !timedOut) {
          setTimedOut(true)
          try { es.close() } catch {
            // Ignore errors during cleanup
          }
          window.clearInterval(interval)
        }
      }, 5000)

      const response = await fetch(`${apiUrl}/api/templates/${patternId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Progress-Job': jobId,
          ...(accessToken && selectedAgent !== 'devin' && selectedAgent !== 'codex-cli' ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setAssignmentPhase('agent')
        const result = await response.json()
        setAssignmentPhase('done')
        console.log('Assignment successful:', result)
        if (result?.status === 'partial_success' && result?.action === 'manual_fork_required') {
          setManualForkInfo({ fork_url: result.fork_url, suggested_owner: result.suggested_owner, suggested_repo: result.suggested_repo })
          setIsAssigningTasks(false)
          setTimedOut(true)
          setAssignmentResponse(result)
          return
        }
        
        // Store the response for display
        setAssignmentResponse(result)

        const repoUrl = result.repository_url as string | undefined
        const sessionUrl = (result.session_url || (result.session_id ? `https://app.devin.ai/sessions/${result.session_id}` : '')) as string | undefined
        const agentName = (result.agent || selectedAgent || 'agent') as string
        const repoName = repoUrl ? (new URL(repoUrl).pathname.replace(/^\//, '')) : ''
        const copyPayload = [repoUrl, sessionUrl].filter(Boolean).join('\n')

        toast({
          title: repoName ? `Deployed to ${repoName}` : `Assignment started for ${formatPatternTitle(patternId || '')}`,
          description: (
            <div className="space-x-3">
              <span className="mr-2 text-figma-text-secondary">Agent: {agentName}</span>
              {result.repository_url && (
                <a className="underline" href={result.repository_url} target="_blank" rel="noopener noreferrer">Open Repo</a>
              )}
              {(result.session_url || result.session_id) && (
                <a className="underline" href={result.session_url || `https://app.devin.ai/sessions/${result.session_id}`} target="_blank" rel="noopener noreferrer">Open Devin Session</a>
              )}
            </div>
          ),
          action: (
            <ToastAction
              altText="Copy links"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(copyPayload)
                  toast({ title: 'Links copied' })
                } catch {
                  // Ignore clipboard errors
                }
              }}
            >
              Copy Links
            </ToastAction>
          ),
        })
        
        // persistent banner
        setBanner({ repoUrl, sessionUrl, agent: agentName })
        
        if (!taskId && workflowMode === 'breakdown') {
          setSelectedTasks(new Set())
        }
      } else {
        const error = await response.json()
        console.error('Assignment failed:', error)
        if (error?.action === 'manual_fork_required' && error?.fork_url) {
          setManualForkInfo({ fork_url: error.fork_url, suggested_owner: error.suggested_owner, suggested_repo: error.suggested_repo })
          setIsAssigningTasks(false)
          setTimedOut(true)
        }
        
        // Store the error response for display
        setAssignmentResponse({
          status: 'error',
          message: error.detail || 'Unknown error occurred',
          agent: selectedAgent
        })
        
        toast({
          title: `Assignment failed for ${formatPatternTitle(patternId || '')}`,
          description: 'View details below',
          action: (
            <ToastAction altText="View details" onClick={() => responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              View details
            </ToastAction>
          ),
          variant: 'destructive' as "destructive",
        })
      }
    } catch (error) {
      console.error('Error assigning to SWE agent:', error)
      
      // Store the error response for display
      setAssignmentResponse({
        status: 'error',
        message: `Error assigning to SWE agent: ${error}`,
        agent: selectedAgent
      })
      
      toast({
        title: `Assignment error for ${formatPatternTitle(patternId || '')}`,
        description: 'View details below',
        action: (
          <ToastAction altText="View details" onClick={() => responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            View details
          </ToastAction>
        ),
        variant: 'destructive' as "destructive",
      })
    } finally {
      setIsAssigningTasks(false)
      setAssignmentPhase('idle')
    }
  }


  const formatPatternTitle = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <div className="min-h-screen bg-figma-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" asChild className="mr-4">
            <Link to="/patterns" className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patterns
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-figma-text-primary flex items-center gap-3">
            Configure {patternId ? formatPatternTitle(patternId) : 'Pattern'}
            <span className="text-sm bg-yellow-600/20 text-yellow-400 px-3 py-1 rounded-full" title="Work in Progress">WIP</span>
          </h1>
        </div>

        {banner && (
          <div className="mb-4 rounded border border-figma-light-gray bg-figma-medium-gray p-3 flex items-center justify-between">
            <div className="text-sm text-figma-text-secondary space-x-3">
              <span>Deployment ready{banner.agent ? ` • Agent: ${banner.agent}` : ''}</span>
              {banner.repoUrl && (<a className="underline" href={banner.repoUrl} target="_blank" rel="noopener noreferrer">Open Repo</a>)}
              {banner.sessionUrl && (<a className="underline" href={banner.sessionUrl} target="_blank" rel="noopener noreferrer">Open Devin Session</a>)}
            </div>
            <button className="text-figma-text-secondary hover:text-white" onClick={() => setBanner(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-figma-medium-gray border-figma-light-gray">
              <CardHeader>
                <CardTitle className="flex items-center text-figma-text-primary">
                  <Settings className="h-5 w-5 mr-2" />
                  Pattern Configuration
                </CardTitle>
                <CardDescription className="text-figma-text-secondary">
                  Customize this AI agent pattern for your specific scenario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="scenario" className="text-figma-text-primary">Scenario Description</Label>
                  <Textarea
                    id="scenario"
                    placeholder="Describe your specific use case and requirements..."
                    value={customization.scenarioDescription}
                    onChange={(e) => setCustomization(prev => ({ ...prev, scenarioDescription: e.target.value }))}
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
                <div className="flex items-center space-x-2">
                  <Checkbox id="preferImport" checked={preferImport} onCheckedChange={(checked) => setPreferImport(!!checked)} />
                  <Label htmlFor="preferImport" className="text-white text-sm">Prefer Import (copy) instead of Fork</Label>
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
                          toast({ title: `GitHub token OK for ${data.login}`, description: `Scopes: ${(data.scopes || []).join(', ') || 'none'}` })
                        } else {
                          toast({ title: 'Token check failed', description: data.error || String(data.status), variant: 'destructive' as "destructive" })
                        }
                      } catch (e: unknown) {
                        toast({ title: 'Token check error', description: String(e), variant: 'destructive' as "destructive" })
                      }
                    }}
                  >
                    Test GitHub Token
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
                </div>
                
                <div>
                  <Label htmlFor="input-format" className="text-figma-text-primary">Input Format</Label>
                  <Input
                    id="input-format"
                    placeholder="e.g., JSON, text, API endpoint"
                    value={customization.inputFormat}
                    onChange={(e) => setCustomization(prev => ({ ...prev, inputFormat: e.target.value }))}
                    className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                  />
                </div>

                <div>
                  <Label htmlFor="output-format" className="text-figma-text-primary">Expected Output Format</Label>
                  <Input
                    id="output-format"
                    placeholder="e.g., structured data, report, API response"
                    value={customization.outputFormat}
                    onChange={(e) => setCustomization(prev => ({ ...prev, outputFormat: e.target.value }))}
                    className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                  />
                </div>

                <div>
                  <Label htmlFor="agent-config" className="text-figma-text-primary">Agent Configuration</Label>
                  <Textarea
                    id="agent-config"
                    placeholder="Specify agent roles, capabilities, and interactions..."
                    value={customization.agentConfiguration}
                    onChange={(e) => setCustomization(prev => ({ ...prev, agentConfiguration: e.target.value }))}
                    className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useMCPTools"
                      checked={customization.useMCPTools}
                      onCheckedChange={(checked) => setCustomization(prev => ({ ...prev, useMCPTools: !!checked }))}
                    />
                    <Label htmlFor="useMCPTools" className="text-figma-text-primary text-sm">
                      Use MCP Tools (GitHub Copilot via MCP)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useA2A"
                      checked={customization.useA2A}
                      onCheckedChange={(checked) => setCustomization(prev => ({ ...prev, useA2A: !!checked }))}
                    />
                    <Label htmlFor="useA2A" className="text-figma-text-primary text-sm">
                      Use A2A (Agent-to-Agent Communication)
                    </Label>
                  </div>
                </div>

                {customization.useMCPTools && (
                  <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700 rounded-md">
                    <p className="text-blue-200 text-sm mb-2">
                      <strong>GitHub PAT Required:</strong> To use GitHub Copilot via MCP, you'll need a GitHub Personal Access Token with the following scopes:
                    </p>
                    <ul className="text-blue-300 text-sm list-disc list-inside mb-3">
                      <li>repo (Full control of private repositories)</li>
                      <li>workflow (Update GitHub Action workflows)</li>
                    </ul>
                    <a 
                      href="https://github.com/settings/tokens" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline text-sm"
                    >
                      Create GitHub Personal Access Token →
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-figma-medium-gray border-figma-light-gray">
              <CardHeader>
                <CardTitle className="text-figma-text-primary flex items-center">
                  <GitBranch className="h-5 w-5 mr-2" />
                  Workflow Configuration
                </CardTitle>
                <CardDescription className="text-figma-text-secondary">
                  Choose how to approach the pattern implementation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => setWorkflowMode('breakdown')}
                    className={`flex-1 ${workflowMode === 'breakdown' ? 'bg-white text-black hover:bg-gray-200 border-gray-300' : 'bg-gray-700 text-white border-gray-500 hover:bg-gray-600 hover:text-white'}`}
                  >
                    Task Breakdown
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setWorkflowMode('oneshot')}
                    className={`flex-1 ${workflowMode === 'oneshot' ? 'bg-white text-black hover:bg-gray-200 border-gray-300' : 'bg-gray-700 text-white border-gray-500 hover:bg-gray-600 hover:text-white'}`}
                  >
                    One-Shot
                  </Button>
                </div>

                {workflowMode === 'breakdown' && (
                  <div className="space-y-4">
                    <Button
                      onClick={generateTaskBreakdown}
                      disabled={!customization.scenarioDescription || isGeneratingTasks}
                      className="w-full bg-white text-black hover:bg-gray-200 border border-gray-300"
                    >
                      {isGeneratingTasks ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating Tasks...
                        </>
                      ) : (
                        'Generate Task Breakdown'
                      )}
                    </Button>

                    {taskBreakdown.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-figma-text-primary font-medium">Generated Tasks:</h4>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedTasks.size === taskBreakdown.length && taskBreakdown.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTasks(new Set(taskBreakdown.map(task => task.id)))
                                } else {
                                  setSelectedTasks(new Set())
                                }
                              }}
                            />
                            <span className="text-figma-text-primary text-sm">Select All</span>
                          </div>
                        </div>
                        {taskBreakdown.map((task) => (
                          <div key={task.id} className="bg-figma-dark-gray p-3 rounded border border-figma-light-gray">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={selectedTasks.has(task.id)}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedTasks)
                                    if (checked) {
                                      newSelected.add(task.id)
                                    } else {
                                      newSelected.delete(task.id)
                                    }
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
                            <div className="flex items-center justify-between">
                              <span className="text-figma-text-secondary text-xs">Est. {task.estimatedTime}</span>
                              <span className="text-figma-text-secondary text-xs">Est. {task.estimatedTokens}</span>
                            </div>
                          </div>
                        ))}

                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <SWEAgentSelection
              selectedAgent={selectedAgent}
              setSelectedAgent={setSelectedAgent}
              apiKey={apiKey}
              setApiKey={setApiKey}
              endpoint={endpoint}
              setEndpoint={setEndpoint}
              customization={customization}
              workflowMode={workflowMode}
              selectedTasks={selectedTasks}
              isAssigningTasks={isAssigningTasks}
              onAssignToSWEAgent={assignToSWEAgent}
              validationField="scenarioDescription"
            />

            {isAssigningTasks && (
              <Card className="bg-figma-medium-gray border-figma-light-gray">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Deployment In Progress
                  </CardTitle>
                  <CardDescription className="text-figma-text-secondary">Forking repo, adding agents.md, and starting agent…</CardDescription>
                </CardHeader>
                <CardContent ref={responseRef}>
                  <ul className="text-sm text-figma-text-secondary space-y-2">
                    <li className={`${assignmentPhase !== 'idle' ? 'text-white' : ''}`}>1. Fork template into your GitHub</li>
                    <li className={`${assignmentPhase === 'write' || assignmentPhase === 'agent' || assignmentPhase === 'done' ? 'text-white' : ''}`}>2. Add agents.md with customization</li>
                    <li className={`${assignmentPhase === 'agent' || assignmentPhase === 'done' ? 'text-white' : ''}`}>3. Start selected coding agent</li>
                  </ul>
                </CardContent>
              </Card>
            )}

            {assignmentResponse && (
              <Card className="bg-figma-medium-gray border-figma-light-gray">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary flex items-center">
                  <GitBranch className="h-5 w-5 mr-2" />
                  Assignment Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`p-4 rounded-lg border ${
                    assignmentResponse.status === 'success' 
                      ? 'bg-green-900/20 border-green-600' 
                      : assignmentResponse.status === 'partial_success'
                      ? 'bg-yellow-900/20 border-yellow-600'
                      : 'bg-red-900/20 border-red-600'
                  }`}>
                    <div className="flex items-center mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        assignmentResponse.status === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : assignmentResponse.status === 'partial_success'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {assignmentResponse.status === 'success' ? 'Success' : 
                         assignmentResponse.status === 'partial_success' ? 'Partial Success' : 'Error'}
                      </span>
                      {(assignmentResponse as Record<string, unknown>).agent ? (
                        <span className="ml-2 text-figma-text-secondary text-sm">
                          Agent: {String((assignmentResponse as Record<string, unknown>).agent)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-figma-text-primary text-sm leading-relaxed">
                      {String((assignmentResponse as Record<string, unknown>).message)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {(assignmentResponse as Record<string, unknown>).repository_url ? (
                        <a
                          href={String((assignmentResponse as Record<string, unknown>).repository_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline text-figma-text-secondary hover:text-white"
                        >
                          Open GitHub Repository
                        </a>
                      ) : null}
                      {((assignmentResponse as Record<string, unknown>).session_url || (assignmentResponse as Record<string, unknown>).session_id) ? (
                        <a
                          href={String((assignmentResponse as Record<string, unknown>).session_url) || `https://app.devin.ai/sessions/${String((assignmentResponse as Record<string, unknown>).session_id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline text-figma-text-secondary hover:text-white"
                        >
                          Open Devin Session
                        </a>
                      ) : null}
                    </div>
                    {(assignmentResponse as Record<string, unknown>).result ? (
                      <div className="mt-3 p-3 bg-figma-dark-gray rounded border border-figma-light-gray">
                        <p className="text-figma-text-secondary text-xs mb-1">Response Details:</p>
                        <pre className="text-figma-text-primary text-xs overflow-x-auto">
                          {JSON.stringify((assignmentResponse as Record<string, unknown>).result, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}

            {isAssigningTasks && (
              <Card className="bg-figma-medium-gray border-figma-light-gray">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary">Live Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-2"><Progress value={progressPercent} /></div>
                  <div className="p-3 bg-figma-dark-gray rounded border border-figma-light-gray max-h-48 overflow-auto">
                    <ul className="text-xs text-figma-text-primary space-y-1">
                      {progressLog.map((line, idx) => (
                        <li key={idx}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {timedOut && (
              <Card className="bg-figma-medium-gray border-figma-light-gray">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary">GitHub rate limit or timeout</CardTitle>
                  <CardDescription className="text-figma-text-secondary">Please fork the template manually, then click Continue to resume.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {manualForkInfo?.fork_url && (
                    <a className="underline text-blue-400" href={manualForkInfo.fork_url} target="_blank" rel="noopener noreferrer">Fork on GitHub</a>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="owner" className="text-white">Your GitHub owner/org</Label>
                      <Input id="owner" value={(customization as Record<string, unknown>).owner as string || ''} onChange={(e) => setCustomization(prev => ({ ...prev, owner: e.target.value }))} placeholder={manualForkInfo?.suggested_owner || ''} />
                    </div>
                    <div>
                      <Label htmlFor="repo" className="text-white">Repo name</Label>
                      <Input id="repo" value={(customization as Record<string, unknown>).repo as string || ''} onChange={(e) => setCustomization(prev => ({ ...prev, repo: e.target.value }))} placeholder={manualForkInfo?.suggested_repo || ''} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-white text-black hover:bg-gray-200" onClick={resumeAfterManualFork}>Continue</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {currentPattern && (
          <Card className="mt-8 bg-figma-medium-gray border border-figma-light-gray">
            <CardHeader>
              <CardTitle className="text-figma-text-primary">Pattern Overview</CardTitle>
              <p className="text-figma-text-secondary text-sm leading-relaxed">{currentPattern.description}</p>
            </CardHeader>
            <CardContent>
              <div className="bg-figma-dark-gray rounded-lg p-4 overflow-hidden">
                <div ref={mermaidRef} className="flex justify-center h-64 items-center overflow-hidden" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default PatternWorkbench
