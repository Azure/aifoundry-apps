import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Settings, GitBranch, Loader2, X, ExternalLink } from 'lucide-react'
import { Progress } from './ui/progress'
import { Button } from './ui/button'
import { useToast } from '../hooks/use-toast'
import { ToastAction } from './ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { Template } from '../App'
import { SWEAgentSelection } from './SWEAgentSelection'

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
  owner?: string
  repo?: string
  [key: string]: unknown
}

interface TaskBreakdown {
  id: string
  title: string
  description: string
  estimatedTime: string
  estimatedTokens: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'assigned' | 'completed'
}

export function TemplateWorkbench() {
  const { templateId } = useParams<{ templateId: string }>()
  const { accessToken, user } = useAuth()
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [customization, setCustomization] = useState<CustomizationRequest>({
    customer_scenario: '',
    brand_theme: '',
    primary_color: '#3b82f6',
    company_name: '',
    industry: '',
    use_case: '',
    additional_requirements: '',
    use_mcp_tools: false,
    use_a2a: false,
    owner: '',
    repo: ''
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
  const [workflowMode, setWorkflowMode] = useState<'breakdown' | 'oneshot'>('oneshot')
  const [assignmentResponse, setAssignmentResponse] = useState<Record<string, unknown> | null>(null)
  const [assignmentPhase, setAssignmentPhase] = useState<'idle' | 'fork' | 'write' | 'agent' | 'done'>('idle')
  const [banner, setBanner] = useState<{ repoUrl?: string; sessionUrl?: string; agent?: string } | null>(null)
  const [progressLog, setProgressLog] = useState<string[]>([])
  const [progressJob, setProgressJob] = useState<string | null>(null)
  const [progressPercent, setProgressPercent] = useState<number | undefined>(undefined)
  const [lastProgressAt, setLastProgressAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState<boolean>(false)
  const [manualForkInfo, setManualForkInfo] = useState<null | { fork_url: string; suggested_owner?: string; suggested_repo?: string }>(null)
  const responseRef = useRef<HTMLDivElement | null>(null)
  const { toast } = useToast()

  const apiUrl = import.meta.env.VITE_API_URL

  const fetchTemplate = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/templates/${templateId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplate(data)
      }
    } catch (error) {
      console.error('Error fetching template:', error)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, templateId])

  useEffect(() => {
    if (templateId) {
      fetchTemplate()
    }
  }, [templateId, fetchTemplate])

  const generateTaskBreakdown = async () => {
    setIsGeneratingTasks(true)
    try {
      const requestPayload = {
        customer_scenario: customization.customer_scenario,
        company_name: customization.company_name,
        industry: customization.industry,
        brand_theme: customization.brand_theme,
        primary_color: customization.primary_color,
        use_case: customization.use_case,
        additional_requirements: customization.additional_requirements,
        use_mcp_tools: customization.use_mcp_tools,
        use_a2a: customization.use_a2a
      }
      
      const response = await fetch(`${apiUrl}/api/templates/${templateId}/breakdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
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
      // Start progress stream
      const jobId = (window.crypto && 'randomUUID' in crypto)
        ? (crypto as Crypto).randomUUID()
        : Math.random().toString(36).slice(2)
      ;(window as Window & { _currentProgressJob?: string })._currentProgressJob = jobId
      const es = new EventSource(`${apiUrl}/api/progress/${jobId}/stream`)
      setProgressJob(jobId)
      const esRefLocal = es
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
      es.addEventListener('done', () => { setAssignmentPhase('done'); setProgressPercent(100); mark(); esRefLocal.close() })

      // Timeout watcher (e.g., 60s of no progress)
      const interval = window.setInterval(() => {
        if (!lastProgressAt) return
        if (Date.now() - (lastProgressAt || 0) > 60000 && !timedOut) {
          setTimedOut(true)
          try { esRefLocal.close() } catch {
            // Ignore errors during cleanup
          }
          window.clearInterval(interval)
        }
      }, 5000)
      const payload = {
        agent_id: selectedAgent,
        api_key: (selectedAgent === 'codex-cli' || selectedAgent === 'devin') ? apiKey : accessToken,
        github_token: accessToken || undefined,
        github_pat: githubPat || undefined,
        prefer_import: preferImport,
        endpoint: endpointParam || endpoint,
        template_id: templateId,
        customization,
        ...(taskId ? { task_id: taskId } : { 
          mode: workflowMode === 'oneshot' ? 'oneshot' : 'breakdown'
        })
      }

      const response = await fetch(`${apiUrl}/api/templates/${templateId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Progress-Job': jobId,
          // Avoid sending Devin/Codex API key as Authorization header accidentally
          ...(accessToken && selectedAgent !== 'devin' && selectedAgent !== 'codex-cli' 
            ? { 'Authorization': `Bearer ${accessToken}` } 
            : {})
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

        if (result.agent === 'github-copilot' && result.status === 'success') {
          toast({
            title: "GitHub Copilot Assignment Successful",
            description: (
              <div className="space-y-2">
                <p>Repository forked and issue created successfully!</p>
                <div className="flex flex-col space-y-1">
                  <a 
                    href={result.repository_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View Forked Repository
                  </a>
                  <a 
                    href={result.issue_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View Created Issue #{result.issue_number}
                  </a>
                  <a 
                    href={result.setup_instructions} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 underline"
                  >
                    Enable GitHub Copilot Coding Agent
                  </a>
                </div>
              </div>
            ),
            duration: 10000,
          })
        } else {
          // Toast with quick links for other agents
          const repoUrl = result.repository_url as string | undefined
          const sessionUrl = (result.session_url || (result.session_id ? `https://app.devin.ai/sessions/${result.session_id}` : '')) as string | undefined
          const agentName = (result.agent || selectedAgent || 'agent') as string
          const repoName = repoUrl ? (new URL(repoUrl).pathname.replace(/^\//, '')) : ''
          const copyPayload = [repoUrl, sessionUrl].filter(Boolean).join('\n')

          toast({
            title: repoName ? `Deployed to ${repoName}` : `Assignment started${template?.title ? ` for ${template.title}` : ''}`,
            description: (
              <div className="space-x-3">
                <span className="mr-2 text-figma-text-secondary">Agent: {agentName}</span>
                {result.repository_url && (
                  <a
                    className="underline"
                    href={result.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Repo
                  </a>
                )}
                {(result.session_url || result.session_id) && (
                  <a
                    className="underline"
                    href={result.session_url || `https://app.devin.ai/sessions/${result.session_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Devin Session
                  </a>
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
        }
        
        // Set persistent banner for all agents
        const repoUrl = result.repository_url as string | undefined
        const sessionUrl = (result.session_url || (result.session_id ? `https://app.devin.ai/sessions/${result.session_id}` : '')) as string | undefined
        const agentName = (result.agent || selectedAgent || 'agent') as string
        setBanner({ repoUrl, sessionUrl, agent: agentName })
        
        if (!taskId && workflowMode === 'breakdown') {
          setSelectedTasks(new Set())
        }
      } else {
        const error = await response.json()
        console.error('Assignment failed:', error)
        // If backend returns partial_success in an error code (defensive)
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
          title: `Assignment failed${template?.title ? ` for ${template.title}` : ''}`,
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
        title: `Assignment error${template?.title ? ` for ${template.title}` : ''}`,
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
    setProgressJob(jobId)
    try {
      const es = new EventSource(`${apiUrl}/api/progress/${jobId}/stream`)
      es.addEventListener('write-agents', () => setAssignmentPhase('write'))
      es.addEventListener('agent-start', () => setAssignmentPhase('agent'))
      es.addEventListener('done', () => { setAssignmentPhase('done'); es.close() })
    } catch {
      // Ignore errors during EventSource setup
    }
    const payload = {
      agent_id: 'devin',
      api_key: apiKey,
      github_token: accessToken || undefined,
      github_pat: githubPat || undefined,
      endpoint,
      template_id: templateId,
      customization,
      mode: workflowMode === 'oneshot' ? 'oneshot' : 'breakdown'
    }
    try {
      const response = await fetch(`${apiUrl}/api/templates/${templateId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Progress-Job': jobId,
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.detail || 'Resume failed')
      }
      setAssignmentResponse(result)
      setIsAssigningTasks(false)
      setTimedOut(false)
      setManualForkInfo(null)
      const repoUrl = result.repository_url as string | undefined
      const sessionUrl = (result.session_url || (result.session_id ? `https://app.devin.ai/sessions/${result.session_id}` : '')) as string | undefined
      setBanner({ repoUrl, sessionUrl, agent: 'devin' })
      toast({ title: 'Resumed successfully', description: 'Started Devin session with your forked repo' })
    } catch (e) {
      toast({ title: 'Resume failed', description: String(e), variant: 'destructive' as "destructive" })
      setIsAssigningTasks(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-figma-text-secondary" />
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Template not found</h1>
          <Link to="/" className="text-figma-text-secondary hover:text-figma-text-primary">
            Return to templates
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center text-figma-text-secondary hover:text-figma-text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Link>
        
        {banner && (
          <div className="mb-3 rounded border border-figma-light-gray bg-figma-medium-gray p-3 flex items-center justify-between">
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

        <div className="flex items-center space-x-4 mb-6">
          <div className="text-4xl">{template.icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-white">{template.title}</h1>
              {template.github_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-figma-text-primary hover:text-white hover:bg-figma-light-gray p-1 h-7 w-7"
                  asChild
                >
                  <a href={template.github_url} target="_blank" rel="noopener noreferrer" aria-label="Open GitHub repository">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
            <p className="text-gray-400 mt-2">{template.description}</p>
            <div className="flex items-center space-x-2 mt-3">
              <Badge variant="outline" className="bg-gray-700 text-gray-300 border-gray-600">
                {template.collection}
              </Badge>
              <Badge variant="outline" className="bg-gray-700 text-gray-300 border-gray-600">
                {template.task}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
                      <Card className="bg-figma-medium-gray border-figma-light-gray">
              <CardHeader>
                <CardTitle className="text-figma-text-primary flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Customization Details
                </CardTitle>
                <CardDescription className="text-figma-text-secondary">
                  Describe your customer scenario and customization requirements
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerScenario" className="text-white">Customer Scenario</Label>
                <Textarea
                  id="customerScenario"
                  placeholder="Describe the customer use case, business requirements, and specific needs..."
                  value={customization.customer_scenario}
                  onChange={(e) => setCustomization(prev => ({ ...prev, customer_scenario: e.target.value }))}
                  className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName" className="text-white">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Contoso Corp"
                    value={customization.company_name}
                    onChange={(e) => setCustomization(prev => ({ ...prev, company_name: e.target.value }))}
                    className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                  />
                </div>
                <div>
                  <Label htmlFor="industry" className="text-white">Industry</Label>
                  <Select value={customization.industry} onValueChange={(value) => setCustomization(prev => ({ ...prev, industry: value }))}>
                    <SelectTrigger className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent className="bg-figma-input-gray border-figma-light-gray">
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="brandTheme" className="text-white">Brand Theme & Guidelines</Label>
                <Textarea
                  id="brandTheme"
                  placeholder="Brand colors, fonts, styling preferences, UI/UX guidelines..."
                  value={customization.brand_theme}
                  onChange={(e) => setCustomization(prev => ({ ...prev, brand_theme: e.target.value }))}
                  className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor" className="text-white">Primary Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={customization.primary_color}
                      onChange={(e) => setCustomization(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-12 h-10 bg-figma-input-gray border-figma-light-gray"
                    />
                    <Input
                      value={customization.primary_color}
                      onChange={(e) => setCustomization(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="useCase" className="text-white">Primary Use Case</Label>
                  <Input
                    id="useCase"
                    placeholder="Customer support, data analysis, etc."
                    value={customization.use_case}
                    onChange={(e) => setCustomization(prev => ({ ...prev, use_case: e.target.value }))}
                    className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="additionalRequirements" className="text-white">Additional Requirements</Label>
                <Textarea
                  id="additionalRequirements"
                  placeholder="Any specific technical requirements, integrations, or constraints..."
                  value={customization.additional_requirements}
                  onChange={(e) => setCustomization(prev => ({ ...prev, additional_requirements: e.target.value }))}
                  className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useMCPTools"
                    checked={customization.use_mcp_tools}
                    onCheckedChange={(checked) => setCustomization(prev => ({ ...prev, use_mcp_tools: !!checked }))}
                  />
                  <Label htmlFor="useMCPTools" className="text-white text-sm">
                    Use MCP Tools (Azure AI Foundry Agent Service)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useA2A"
                    checked={customization.use_a2a}
                    onCheckedChange={(checked) => setCustomization(prev => ({ ...prev, use_a2a: !!checked }))}
                  />
                  <Label htmlFor="useA2A" className="text-white text-sm">
                    Use A2A (Agent-to-Agent Communication)
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="targetOwner" className="text-white">Target Owner (user or org)</Label>
                  <Input
                    id="targetOwner"
                    placeholder="e.g. thegovind or my-org"
                    value={customization.owner || ''}
                    onChange={(e) => setCustomization(prev => ({ ...prev, owner: e.target.value }))}
                    className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                  />
                </div>
                <div>
                  <Label htmlFor="targetRepo" className="text-white">Target Repo Name</Label>
                  <Input
                    id="targetRepo"
                    placeholder="Optional; will default based on template"
                    value={customization.repo || ''}
                    onChange={(e) => setCustomization(prev => ({ ...prev, repo: e.target.value }))}
                    className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                  />
                </div>
              </div>

              {customization.use_mcp_tools && (
                <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700 rounded-md">
                  <p className="text-blue-200 text-sm mb-2">
                    <strong>MCP Tools Integration:</strong> This will create a prompt for the SWE Agent to leverage MCP tools that Azure AI Foundry Agent service supports, enabling enhanced tool integration and workflow automation.
                  </p>
                  <ul className="text-blue-300 text-sm list-disc list-inside mb-3">
                    <li>Enhanced tool integration via Model Context Protocol</li>
                    <li>Azure AI Foundry Agent service compatibility</li>
                    <li>Automated workflow generation with MCP support</li>
                  </ul>
                  <p className="text-blue-300 text-xs">
                    The SWE Agent will be configured to use MCP tools for improved development workflows and Azure service integration.
                  </p>
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
                Choose how to approach the customization task
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setWorkflowMode('breakdown')}
                  className={`flex-1 ${workflowMode === 'breakdown' ? 'bg-white text-black hover:bg-gray-100 border-white' : 'bg-figma-dark-gray text-figma-text-primary border-figma-light-gray hover:bg-figma-light-gray'}`}
                >
                  Task Breakdown
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWorkflowMode('oneshot')}
                  className={`flex-1 ${workflowMode === 'oneshot' ? 'bg-white text-black hover:bg-gray-100 border-white' : 'bg-figma-dark-gray text-figma-text-primary border-figma-light-gray hover:bg-figma-light-gray'}`}
                >
                  One-Shot
                </Button>
              </div>

              {workflowMode === 'breakdown' && (
                <div className="space-y-4">
                  <Button
                    onClick={generateTaskBreakdown}
                    disabled={!customization.customer_scenario || isGeneratingTasks}
                    className="w-full"
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
                        <h4 className="text-white font-medium">Generated Tasks:</h4>
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
                          <span className="text-white text-sm">Select All</span>
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
            validationField="customer_scenario"
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
                  Token scopes: <span className="text-white">public_repo</span> (for public repos). Use <span className="text-white">repo</span> if you need private repos or Actions secrets later.
                  {' '}<a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-400 hover:text-blue-300 ml-1"
                  >Get a GitHub token</a>.
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="preferImport"
                    checked={preferImport}
                    onCheckedChange={(checked) => setPreferImport(!!checked)}
                  />
                  <Label htmlFor="preferImport" className="text-white text-sm">Prefer Import (copy) instead of Fork</Label>
                </div>
              </CardContent>
            </Card>
          )}

          {isAssigningTasks && (
            <Card className="bg-figma-medium-gray border-figma-light-gray">
              <CardHeader>
                <CardTitle className="text-figma-text-primary flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Deployment In Progress
                </CardTitle>
                <CardDescription className="text-figma-text-secondary">Forking/copying repo, adding agents.md, and starting agent…</CardDescription>
              </CardHeader>
          <CardContent ref={responseRef}>
            {/* Progress bar */}
            <div className="mb-3">
              <Progress value={progressPercent} />
            </div>
            <ul className="text-sm text-figma-text-secondary space-y-2">
              <li className={`${assignmentPhase !== 'idle' ? 'text-white' : ''}`}>1. Fork template into your GitHub</li>
              <li className={`${assignmentPhase === 'write' || assignmentPhase === 'agent' || assignmentPhase === 'done' ? 'text-white' : ''}`}>2. Add agents.md with customization</li>
              <li className={`${assignmentPhase === 'agent' || assignmentPhase === 'done' ? 'text-white' : ''}`}>3. Start selected coding agent</li>
            </ul>
            {progressLog.length > 0 && (
              <div className="mt-3 p-3 bg-figma-dark-gray rounded border border-figma-light-gray max-h-48 overflow-auto">
                <p className="text-xs text-figma-text-secondary mb-1">Live progress</p>
                <ul className="text-xs text-figma-text-primary space-y-1">
                  {progressLog.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={async () => {
                  try {
                    if (progressJob) await fetch(`${apiUrl}/api/progress/${progressJob}/cancel`, { method: 'POST' })
                  } catch {
                    // Ignore cancellation errors
                  }
                  setIsAssigningTasks(false)
                  setAssignmentPhase('idle')
                  setProgressLog(prev => [...prev, 'Cancelled'])
                }}
              >
                Cancel
              </Button>
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
            {!manualForkInfo?.fork_url && template.github_url && (
              <a className="underline text-blue-400" href={`${template.github_url}/fork`} target="_blank" rel="noopener noreferrer">Fork on GitHub</a>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner" className="text-white">Your GitHub owner/org</Label>
                <Input id="owner" value={customization.owner} onChange={(e) => setCustomization(prev => ({ ...prev, owner: e.target.value }))} placeholder={manualForkInfo?.suggested_owner || user?.login || ''} />
              </div>
              <div>
                <Label htmlFor="repo" className="text-white">Repo name</Label>
                <Input id="repo" value={customization.repo} onChange={(e) => setCustomization(prev => ({ ...prev, repo: e.target.value }))} placeholder={manualForkInfo?.suggested_repo || ''} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="bg-white text-black hover:bg-gray-200" onClick={resumeAfterManualFork}>Continue</Button>
            </div>
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
        </div>
      </div>
    </div>
  )
}

export default TemplateWorkbench
