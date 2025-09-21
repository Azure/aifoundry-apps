import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Wrench, GitBranch, Loader2, Save, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import AssignmentResult from './AssignmentResult'
import { Checkbox } from './ui/checkbox'
import { SWEAgentSelection } from './SWEAgentSelection'
import MDEditor from '@uiw/react-md-editor'
import { Template } from '../App'

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
  phase: string
  specification?: string
  plan?: string
  plan_template?: PlanTemplate
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
  phase?: string
  parallel?: boolean
  filePath?: string
}

export function SpecWorkbench() {
  const params = useParams()
  const { specId } = params
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isNewSpec = window.location.pathname === '/spec/new' || specId === 'new'
  
  console.log('SpecWorkbench params:', params)
  console.log('SpecWorkbench specId:', specId)
  console.log('SpecWorkbench isNewSpec:', isNewSpec)
  console.log('Current pathname:', window.location.pathname)
  console.log('Search params:', searchParams.toString())

  const [spec, setSpec] = useState<Spec | null>(null)
  const [loading, setLoading] = useState(!isNewSpec)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // Function to extract planning information from template
  const extractPlanningFromTemplate = (template: Template) => {
    console.log('Extracting planning from template:', template) // Debug log
    console.log('Template planning data:', template.planning) // Debug log
    
    if (!template.planning) {
      console.log('No planning data found in template') // Debug log
      return null
    }
    
    const planningInfo = {
      techStack: template.planning.tech_stack || '',
      architecture: template.planning.architecture || '',
      nonFunctional: template.planning.non_functional_requirements || '',
      gates: {
        simplicity: template.planning.gates?.simplicity || false,
        antiAbstraction: template.planning.gates?.anti_abstraction || false,
        integrationFirst: template.planning.gates?.integration_first || false
      }
    }
    
    console.log('Extracted planning info:', planningInfo) // Debug log
    return planningInfo
  }

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
  const [showAdvanced] = useState<boolean>(false)

  // Agent Configuration (matches CLI --ai flag)
  const [ignoreAgentTools] = useState<boolean>(false)
  const [projectName, setProjectName] = useState<string>('')

  const [activeTab, setActiveTab] = useState<'specify' | 'plan' | 'tasks'>('specify')

  const [specPhase, setSpecPhase] = useState<'specification' | 'plan' | 'tasks' | 'completed'>('specification')
  const [requirements, setRequirements] = useState('')
  const [planContent, setPlanContent] = useState('')
  const [researchContent, setResearchContent] = useState('')
  const [dataModelContent, setDataModelContent] = useState('')
  const [contractsContent, setContractsContent] = useState('')
  const [taskBreakdown, setTaskBreakdown] = useState<TaskBreakdown[]>([])
  const [workflowMode] = useState<'breakdown' | 'oneshot'>('breakdown')
  const [isAssigningTasks, setIsAssigningTasks] = useState(false)
  const [assignmentPhase, setAssignmentPhase] = useState<'idle' | 'starting'>('idle')
  const [assignmentResponses, setAssignmentResponses] = useState<Record<string, unknown>[]>([])
  const [isAgentPanelExpanded, setIsAgentPanelExpanded] = useState(true)
  const [isBasicDetailsCollapsed, setIsBasicDetailsCollapsed] = useState(false)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false)
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false)
  const [showSpecification, setShowSpecification] = useState(false)

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

  const fetchTemplate = useCallback(async (templateId: string) => {
    console.log('fetchTemplate called with templateId:', templateId) // Debug log
    try {
      console.log('Fetching template from:', `${apiUrl}/api/templates/${templateId}`) // Debug log
      const response = await fetch(`${apiUrl}/api/templates/${templateId}`)
      console.log('Template fetch response status:', response.status) // Debug log
      if (response.ok) {
        const template = await response.json()
        console.log('Fetched template:', template) // Debug log
        setSelectedTemplate(template)
        
        // Pre-populate title and description from template
        if (template.title) setTitle(template.title)
        if (template.description) setDescription(template.description)
        
        // Pre-populate planning information
        const planningInfo = extractPlanningFromTemplate(template)
        console.log('Planning info extracted:', planningInfo) // Debug log
        if (planningInfo) {
          setTechStack(planningInfo.techStack)
          setArchitectureNotes(planningInfo.architecture)
          setNonFunctional(planningInfo.nonFunctional)
          setGateSimplicity(planningInfo.gates.simplicity)
          setGateAntiAbstraction(planningInfo.gates.antiAbstraction)
          setGateIntegrationFirst(planningInfo.gates.integrationFirst)
          console.log('Plan fields pre-populated') // Debug log
        }
      }
    } catch (error) {
      console.error('Error fetching template:', error)
    }
  }, [apiUrl])

  // Load template information if templateId is provided
  useEffect(() => {
    const templateId = searchParams.get('templateId')
    console.log('Template ID from URL:', templateId) // Debug log
    console.log('Search params object:', searchParams) // Debug log
    console.log('Search params toString:', searchParams.toString()) // Debug log
    console.log('Current URL:', window.location.href) // Debug log
    if (templateId) {
      console.log('Calling fetchTemplate with:', templateId) // Debug log
      fetchTemplate(templateId)
    } else {
      console.log('No templateId found in URL') // Debug log
    }
  }, [searchParams])

  // Also load template when component mounts if templateId is in URL
  useEffect(() => {
    const templateId = searchParams.get('templateId')
    if (templateId && !selectedTemplate) {
      console.log('Loading template on mount:', templateId) // Debug log
      fetchTemplate(templateId)
    }
  }, [searchParams, selectedTemplate])

  // Spec Kit wizard configuration fields (align with CLI flags & templates)
  const [aiPreference] = useState<'claude' | 'gemini' | 'copilot'>('copilot')
  const [useMcpTools, setUseMcpTools] = useState<boolean>(false)
  const [useA2A, setUseA2A] = useState<boolean>(false)
  const [techStack, setTechStack] = useState<string>('')
  const [architectureNotes, setArchitectureNotes] = useState<string>('')
  const [nonFunctional, setNonFunctional] = useState<string>('')
  const [gateSimplicity, setGateSimplicity] = useState<boolean>(false)
  const [gateAntiAbstraction, setGateAntiAbstraction] = useState<boolean>(false)
  const [gateIntegrationFirst, setGateIntegrationFirst] = useState<boolean>(false)

  // Debug: Log plan field changes
  useEffect(() => {
    console.log('Plan fields updated:', {
      techStack,
      architectureNotes,
      nonFunctional,
      gateSimplicity,
      gateAntiAbstraction,
      gateIntegrationFirst
    })
  }, [techStack, architectureNotes, nonFunctional, gateSimplicity, gateAntiAbstraction, gateIntegrationFirst])

  // If spec doesn't have planning data but we have a selected template, copy it over
  useEffect(() => {
    if (spec && selectedTemplate && !spec.planning && selectedTemplate.planning) {
      console.log('Copying planning data from template to spec') // Debug log
      const updatedSpec = {
        ...spec,
        planning: selectedTemplate.planning
      }
      setSpec(updatedSpec)
      
      // Also pre-populate the form fields
      const planningInfo = extractPlanningFromTemplate(selectedTemplate)
      if (planningInfo) {
        setTechStack(planningInfo.techStack)
        setArchitectureNotes(planningInfo.architecture)
        setNonFunctional(planningInfo.nonFunctional)
        setGateSimplicity(planningInfo.gates.simplicity)
        setGateAntiAbstraction(planningInfo.gates.antiAbstraction)
        setGateIntegrationFirst(planningInfo.gates.integrationFirst)
        console.log('Plan fields pre-populated from template') // Debug log
      }
    }
  }, [spec, selectedTemplate])

  const fetchSpec = useCallback(async () => {
    if (isNewSpec || !specId) {
      // For new specs, we need to create one first if we have a template
      const templateId = searchParams.get('templateId')
      if (templateId) {
        console.log('New spec with template, creating spec first...')
        // Create a new spec first
        try {
          const response = await fetch(`${apiUrl}/api/specs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'New Spec',
              description: 'Generated from template',
              content: ''
            })
          })
          if (response.ok) {
            const newSpec = await response.json()
            console.log('Created new spec:', newSpec)
            setSpec(newSpec)
            // Update the URL to include the new spec ID
            window.history.replaceState({}, '', `/spec/${newSpec.id}?templateId=${templateId}`)
            // Now load the template
            fetchTemplate(templateId)
          }
        } catch (error) {
          console.error('Error creating new spec:', error)
        }
      }
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
        
        // Populate planning fields from spec data
        if (specData.planning) {
          console.log('Populating planning fields from spec data:', specData.planning)
          if (specData.planning.tech_stack) {
            setTechStack(specData.planning.tech_stack)
          }
          if (specData.planning.architecture) {
            setArchitectureNotes(specData.planning.architecture)
          }
          if (specData.planning.non_functional_requirements) {
            setNonFunctional(specData.planning.non_functional_requirements)
          }
          if (specData.planning.gates) {
            setGateSimplicity(specData.planning.gates.simplicity || false)
            setGateAntiAbstraction(specData.planning.gates.anti_abstraction || false)
            setGateIntegrationFirst(specData.planning.gates.integration_first || false)
          }
        }
        
        // Populate research and plan components if available
        if (specData.research) {
          setResearchContent(specData.research)
        }
        if (specData.data_model) {
          setDataModelContent(specData.data_model)
        }
        if (specData.contracts) {
          setContractsContent(specData.contracts)
        }
      }
    } catch (error) {
      console.error('Error fetching spec:', error)
    } finally {
      setLoading(false)
    }
  }, [specId, isNewSpec, apiUrl, searchParams])

  const insertSpecTemplate = useCallback(() => {
    if (content && content.trim().length > 0) return
    const template = `# Feature Specification

## Overview
- What and why in plain language.

## Users & Personas
- Primary users
- Secondary users

## User Stories
- As a [user], I want [goal], so that [reason].

## Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Non-Functional Requirements
- Performance, security, accessibility, reliability.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Assumptions
- Assumption 1

## Out-of-Scope
- Not included in this feature

## Clarifications
- [NEEDS CLARIFICATION: list questions here]

## Review & Acceptance Checklist
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
`
    setContent(template)
  }, [content])

  useEffect(() => {
    fetchSpec()
  }, [specId, isNewSpec])

  useEffect(() => {
    if (isNewSpec && !projectName && !description) {
      setProjectName("task-management-system")
      setTitle("Task Management System")
      setDescription("A modern task management application that helps users organize, prioritize, and complete their tasks efficiently.")
      setTechStack("React, Node.js, PostgreSQL")
      if (!content || content.trim().length === 0) {
        insertSpecTemplate()
      }
    }
  }, [isNewSpec, projectName, description, content, insertSpecTemplate])

  // Sync project name with title
  useEffect(() => {
    if (title) {
      // Convert Title Case to kebab-case project name
      const projectFromTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
      setProjectName(projectFromTitle)
    }
  }, [title])

  const saveSpec = async (): Promise<Spec | null> => {
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
      // Prefer updating if there's a concrete id; otherwise create
      let method: 'POST' | 'PUT' = 'POST'
      let url = `${apiUrl}/api/specs`
      const candidateId = (spec && 'id' in spec && spec.id) ? spec.id : (specId && specId !== 'new' ? specId : null)
      if (!isNewSpec && candidateId) {
        method = 'PUT'
        url = `${apiUrl}/api/specs/${candidateId}`
      }
      console.log('Saving via', method, url)

      let response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specData)
      })

      // If attempting PUT but backend doesn't have it, fallback to POST
      if (method === 'PUT' && response.status === 404) {
        console.warn('PUT 404 — falling back to POST create')
        response = await fetch(`${apiUrl}/api/specs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(specData)
        })
      }

      console.log('Save response status:', response.status)

      if (response.ok) {
        const savedSpec = await response.json()
        console.log('Saved spec response:', savedSpec)
        setSpec(savedSpec)
        if (isNewSpec || !candidateId) {
          console.log('Navigating to:', `/spec/${savedSpec.id}`)
          navigate(`/spec/${savedSpec.id}`)
        }
        return savedSpec
      } else {
        const errorText = await response.text()
        console.error('Save failed with status:', response.status, 'Error:', errorText)
        return null
      }
    } catch (error) {
      console.error('Error saving spec:', error)
      return null
    } finally {
      setSaving(false)
    }
  }

  const ensureSpecExists = async (): Promise<string | null> => {
    const saved = await saveSpec()
    return saved?.id || spec?.id || null
  }

  const handleEnhanceContent = async () => {
    const id = await ensureSpecExists()
    if (!id) {
      return
    }
    setIsEnhancing(true)
    try {
      const url = `${apiUrl.replace(/\/$/, '')}/api/specs/${id}/enhance?stream=true`
      
      // Try POST first, then GET as fallback
      let success = false
      let lastError: Error | null = null

      for (const method of ['POST', 'GET'] as const) {
        try {
          const resp = await fetch(url, { method })
          if (!resp.ok || !resp.body) {
            lastError = new Error(`Enhance ${method} ${url} failed: ${resp.status}`)
            continue
          }
          const reader = resp.body.getReader()
          const decoder = new TextDecoder('utf-8')
          // Start with a divider so user sees progress clearly
          setContent((prev) => (prev && prev.trim().length > 0 ? prev + '\n\n' : ''))
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            if (chunk) setContent((prev) => (prev ?? '') + chunk)
          }
          success = true
          break
        } catch (e) {
          lastError = e as Error
          continue
        }
      }
      if (!success) throw lastError || new Error('Enhance failed')
    } catch (err) {
      console.error('Enhance error:', err)
    } finally {
      setIsEnhancing(false)
    }
  }

  const toggleTaskSelection = (taskId: string) => {
    const newSelectedTasks = new Set(selectedTasks)
    if (newSelectedTasks.has(taskId)) {
      newSelectedTasks.delete(taskId)
    } else {
      newSelectedTasks.add(taskId)
    }
    setSelectedTasks(newSelectedTasks)
  }

  const selectAllTasks = () => {
    const allTaskIds = new Set(taskBreakdown.map(task => task.id))
    setSelectedTasks(allTaskIds)
  }

  const clearTaskSelection = () => {
    setSelectedTasks(new Set())
  }

  const handleSpecifyPhase = async () => {
    if (!content.trim()) {
      return
    }

    setIsGeneratingSpec(true)

    try {
      let currentSpec = spec
      
      if (!currentSpec || isNewSpec || window.location.pathname.includes('/new')) {
        console.log('Saving spec first before specify phase...')
        await saveSpec()
        
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        if (window.location.pathname.includes('/new')) {
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
            return
          }
        } else {
          return
        }
      }

      if (!currentSpec?.id) {
        return
      }

      // Use the spec template prompt to generate a proper specification
      console.log('Calling specify endpoint with template_id:', selectedTemplate?.id) // Debug log
      console.log('Current URL search params:', searchParams.toString()) // Debug log
      
      // If selectedTemplate is null but we have templateId in URL, try to get it
      let templateId = selectedTemplate?.id
      if (!templateId) {
        const urlTemplateId = searchParams.get('templateId')
        console.log('URL templateId:', urlTemplateId) // Debug log
        if (urlTemplateId) {
          console.log('No selectedTemplate but found templateId in URL:', urlTemplateId)
          templateId = urlTemplateId
        }
      }
      
      console.log('Final templateId being sent:', templateId) // Debug log
      
      const response = await fetch(`${apiUrl}/api/specs/${currentSpec.id}/specify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements: content, // Use the markdown content as input
          title: title,
          description: description,
          template_id: templateId
        })
      })

      if (response.ok) {
        const result = await response.json()
        setSpec(result.spec)
        
        // Update requirements with the generated specification
        if (result.spec?.specification) {
          setRequirements(result.spec.specification)
          console.log('Updated requirements with generated specification')
        }
        
        // Extract planning data from spec and update form fields
        if (result.spec?.planning) {
          console.log('Extracting planning data from spec response:', result.spec.planning)
          const planning = result.spec.planning
          
          if (planning.tech_stack) {
            setTechStack(planning.tech_stack)
            console.log('Set tech stack:', planning.tech_stack)
          }
          if (planning.architecture) {
            setArchitectureNotes(planning.architecture)
            console.log('Set architecture:', planning.architecture)
          }
          if (planning.non_functional_requirements) {
            setNonFunctional(planning.non_functional_requirements)
            console.log('Set non-functional:', planning.non_functional_requirements)
          }
          if (planning.gates) {
            setGateSimplicity(planning.gates.simplicity || false)
            setGateAntiAbstraction(planning.gates.anti_abstraction || false)
            setGateIntegrationFirst(planning.gates.integration_first || false)
            console.log('Set gates:', planning.gates)
          }
        } else if (selectedTemplate?.planning) {
          // Fallback: use planning data from selected template
          console.log('Using planning data from selected template:', selectedTemplate.planning)
          const planning = selectedTemplate.planning
          
          if (planning.tech_stack) {
            setTechStack(planning.tech_stack)
            console.log('Set tech stack from template:', planning.tech_stack)
          }
          if (planning.architecture) {
            setArchitectureNotes(planning.architecture)
            console.log('Set architecture from template:', planning.architecture)
          }
          if (planning.non_functional_requirements) {
            setNonFunctional(planning.non_functional_requirements)
            console.log('Set non-functional from template:', planning.non_functional_requirements)
          }
          if (planning.gates) {
            setGateSimplicity(planning.gates.simplicity || false)
            setGateAntiAbstraction(planning.gates.anti_abstraction || false)
            setGateIntegrationFirst(planning.gates.integration_first || false)
            console.log('Set gates from template:', planning.gates)
          }
        }
        
        setSpecPhase('plan')
        setActiveTab('plan')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to complete specification phase')
      }
    } catch (error) {
      console.error('Error in specify phase:', error)
    } finally {
      setIsGeneratingSpec(false)
    }
  }

  const handlePlanPhase = async (planRequest?: Record<string, unknown>) => {
    if (!spec?.id) {
      return
    }

    setIsGeneratingPlan(true)
    
    try {
      // Include both specification and plan fields in the request
      const requestBody = planRequest || {
        tech_stack: techStack || "Modern web application",
        architecture: architectureNotes || undefined,
        constraints: nonFunctional || undefined,
        constitution_gates: {
          simplicity: gateSimplicity,
          anti_abstraction: gateAntiAbstraction,
          integration_first: gateIntegrationFirst
        },
        // Include the specification for context
        specification: spec?.specification || spec?.content,
        // Include development options
        use_mcp_tools: useMcpTools,
        use_a2a: useA2A
      }
      
      const response = await fetch(`${apiUrl}/api/specs/${spec.id}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Plan generation result:', result) // Debug log
        
        // Store the full plan response for spec-kit workflow
        // The plan content is nested in spec.plan
        const planContent = result.spec?.plan || result.plan || result.message || 'Plan generated successfully'
        setPlanContent(planContent)
        
        // Store individual plan components if available
        if (result.spec?.research || result.research) {
          setResearchContent(result.spec?.research || result.research)
        }
        if (result.spec?.data_model || result.data_model) {
          setDataModelContent(result.spec?.data_model || result.data_model)
        }
        if (result.spec?.contracts || result.contracts) {
          setContractsContent(result.spec?.contracts || result.contracts)
        }
        
        // Update the spec with the plan components for persistence
        if (spec?.id) {
          const updatedSpec = {
            ...spec,
            research: result.spec?.research || result.research,
            data_model: result.spec?.data_model || result.data_model,
            contracts: result.spec?.contracts || result.contracts
          }
          setSpec(updatedSpec)
        }
        
      } else {
        const errorData = await response.json()
        console.error('Plan generation error:', errorData)
        throw new Error(errorData.detail || 'Failed to generate plan')
      }
    } catch (error) {
      console.error('Error in plan phase:', error)
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  const handleTasksPhase = async () => {
    if (!spec?.id) {
      return
    }

    setIsGeneratingTasks(true)

    try {
      // Build comprehensive payload with all collected data
      // Prioritize the actual content over placeholder values
      const getSpecificationContent = () => {
        if (requirements && requirements !== 'test') return requirements
        if (spec?.specification && spec.specification !== 'test') return spec.specification
        if (spec?.content) return spec.content
        return requirements || spec?.specification || spec?.content || ''
      }

      const tasksPayload = {
        specification: getSpecificationContent(),
        plan: planContent || spec?.plan,
        title,
        description,
        // Include constitution/planning data
        constitution: {
          tech_stack: techStack,
          architecture: architectureNotes,
          constraints: nonFunctional,
          gates: {
            simplicity: gateSimplicity,
            anti_abstraction: gateAntiAbstraction,
            integration_first: gateIntegrationFirst
          }
        },
        // Include development options
        development_options: {
          use_mcp_tools: useMcpTools,
          use_a2a: useA2A,
          ai_preference: aiPreference,
          ignore_agent_tools: ignoreAgentTools
        },
        // Include template context if available
        template_context: selectedTemplate ? {
          id: selectedTemplate.id,
          title: selectedTemplate.title,
          planning: selectedTemplate.planning
        } : null,
        // Include research and other plan components
        research: researchContent,
        data_model: dataModelContent,
        contracts: contractsContent
      }

      console.log('Tasks payload debug:', {
        requirements,
        specSpecification: spec?.specification,
        specContent: spec?.content,
        finalSpecification: getSpecificationContent(),
        planContent,
        specPlan: spec?.plan
      })
      console.log('Tasks payload:', tasksPayload)

      const response = await fetch(`${apiUrl}/api/specs/${spec.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasksPayload)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Tasks generation result:', result) // Debug log
        
        // Handle both nested and direct task responses
        const rawTasks = result.spec?.tasks || result.tasks || []
        console.log('Raw tasks from API:', rawTasks)
        
        // Transform tasks to match expected format
        const tasks = rawTasks.map((task: Record<string, unknown>, index: number) => ({
          id: task.id || `task-${index}`,
          title: task.title || 'Untitled Task',
          description: task.description || '',
          estimatedTime: task.estimatedTime || task.estimated_time || 'Unknown',
          estimatedTokens: task.estimatedTokens || task.estimated_tokens || 'Unknown',
          priority: task.priority || 'medium',
          status: task.status || 'To Do',
          acceptanceCriteria: task.acceptanceCriteria || task.acceptance_criteria || [],
          phase: task.phase || 'core',
          parallel: task.parallel || false,
          filePath: task.filePath || task.file_path
        }))
        
        console.log('Transformed tasks:', tasks)
        console.log('Tasks length:', tasks.length)
        setTaskBreakdown(tasks)
        setSpecPhase('tasks')
        setActiveTab('tasks')
        
      } else {
        const errorData = await response.json()
        console.error('Tasks generation error:', errorData)
        throw new Error(errorData.detail || 'Failed to generate tasks')
      }
    } catch (error) {
      console.error('Error in tasks phase:', error)
    } finally {
      setIsGeneratingTasks(false)
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

      // Create individual assignments for each selected task
      const selectedTasksArray = Array.from(selectedTasks)
      const assignmentPromises = selectedTasksArray.map(async (taskId, index) => {
        // Find the task details
        const task = taskBreakdown.find(t => t.id === taskId)
        
        const payload = {
          agent_id: selectedAgent,
          api_key: apiKey,
          endpoint: endpoint,
          customization: mappedCustomization,
          github_pat: githubPat,
          prefer_import: preferImport,
          selected_tasks: [taskId], // Only this specific task
          workflow_mode: workflowMode,
          task_details: task ? {
            title: task.title,
            description: task.description,
            acceptanceCriteria: task.acceptanceCriteria,
            estimatedTime: task.estimatedTime,
            priority: task.priority
          } : null
        }

        const response = await fetch(`${apiUrl}/api/specs/${spec?.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          const result = await response.json()
          return {
            ...result,
            taskId: taskId,
            taskTitle: task?.title || 'Unknown Task',
            assignmentNumber: index + 1
          }
        } else {
          const errorData = await response.json()
          throw new Error(`Task ${taskId} assignment failed: ${errorData.detail || 'Unknown error'}`)
        }
      })

      // Wait for all assignments to complete
      const results = await Promise.all(assignmentPromises)
      setAssignmentResponses(results)
      
    } catch (error) {
      console.error('Error assigning to SWE agent:', error)
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
                  {isNewSpec ? 'New Spec-Kit Project' : title || 'Spec-Kit Project'}
                </h1>
                <p className="text-gray-400 mt-2">
                  {isNewSpec ? 'Follow the spec-kit three-phase methodology: /specify → /plan → /tasks' : 'Manage your spec-driven development workflow'}
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

        <div className={`grid gap-8 transition-all duration-300 ${isAgentPanelExpanded && taskBreakdown.length > 0 && selectedTasks.size > 0 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          <div className={`space-y-6 ${isAgentPanelExpanded && taskBreakdown.length > 0 && selectedTasks.size > 0 ? 'lg:col-span-2' : 'col-span-1'}`}>
            <Card className="bg-figma-medium-gray border-figma-light-gray">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-figma-text-primary">Spec Kit Workflow</CardTitle>
                    <CardDescription className="text-figma-text-secondary">
                      Follow the three-phase methodology with constitutional governance
                    </CardDescription>
                  </div>
                  {spec?.branch_name && (
                    <div className="flex items-center gap-2 text-sm text-figma-text-secondary">
                      <GitBranch className="h-4 w-4" />
                      <span>Feature #{spec.feature_number}: {spec.branch_name}</span>
                    </div>
                  )}
                  
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('specify')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === 'specify' ? 'bg-blue-600 text-white' : 
                      specPhase === 'specification' ? 'bg-blue-500 text-white' :
                      (specPhase === 'plan' || specPhase === 'tasks' || specPhase === 'completed') ? 'bg-green-600 text-white hover:bg-green-500' : 
                      'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    <span className="mr-2">📝</span>
                    /specify
                  </button>
                  <button
                    onClick={() => setActiveTab('plan')}
                    disabled={(specPhase === 'specification' && !spec?.specification)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeTab === 'plan' ? 'bg-blue-600 text-white' :
                      specPhase === 'plan' ? 'bg-blue-500 text-white' :
                      (specPhase === 'tasks' || specPhase === 'completed') ? 'bg-green-600 text-white hover:bg-green-500' :
                      'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    <span className="mr-2">🏗️</span>
                    /plan
                  </button>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    disabled={specPhase === 'specification' || (specPhase === 'plan' && !planContent)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeTab === 'tasks' ? 'bg-blue-600 text-white' :
                      (specPhase === 'tasks' || specPhase === 'completed') ? 'bg-green-600 text-white hover:bg-green-500' :
                      'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    <span className="mr-2">✅</span>
                    /tasks
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
                        } catch (e: unknown) {
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


            {activeTab === 'specify' && (
              <div className="space-y-6">
                {/* Agent Configuration Section */}
                <Card className="bg-figma-medium-gray border-figma-light-gray">
                  <CardHeader>
                    <CardTitle className="text-figma-text-primary flex items-center gap-2">
                      <span>🤖</span>
                      Agent Configuration
                    </CardTitle>
                    <CardDescription className="text-figma-text-secondary">
                      Configure your AI agent and project settings (equivalent to <code className="bg-figma-light-gray/20 px-1 rounded">specify init</code>)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title" className="text-white">Project Title</Label>
                        <Input
                          id="title"
                          placeholder="e.g., AI-Powered Customer Support System"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-white">Project Description</Label>
                        <Input
                          id="description"
                          placeholder="Brief description of the project..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary"
                        />
                      </div>
                    </div>
                    
                  </CardContent>
                </Card>

                {/* Specification Content Section */}
                <Card className="bg-figma-medium-gray border-figma-light-gray border-2 border-blue-500">
                  <CardHeader>
                    <CardTitle className="text-figma-text-primary flex items-center gap-2">
                      <span>📝</span>
                      /specify - Define WHAT and WHY
                    </CardTitle>
                    <CardDescription className="text-figma-text-secondary">
                      Focus on <strong>what</strong> you want to build and <strong>why</strong> it's needed. 
                      <strong className="text-yellow-400"> Do NOT focus on tech stack</strong> - that comes in the /plan phase.
                    </CardDescription>
                    <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                      <p className="text-xs text-blue-300/80">
                        <strong>CLI equivalent:</strong> <code className="bg-figma-light-gray/20 px-1 rounded">/specify Build an application that...</code> - <a href="https://github.com/github/spec-kit" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">try it in CLI with spec-kit</a>
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="content" className="text-white">Specification (Markdown)</Label>
                      <p className="text-xs text-figma-text-secondary mb-2">
                        Describe what you want to build and why it's needed. Be explicit about user requirements and scenarios.
                      </p>
                      <div data-color-mode="dark" className="bg-figma-dark-gray rounded-md p-1">
                        <MDEditor
                          value={content}
                          onChange={(val) => setContent(val || '')}
                          previewOptions={{ disallowedElements: ['script', 'style'] }}
                          height={260}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Button
                          type="button"
                          onClick={handleEnhanceContent}
                          disabled={isEnhancing || !title.trim()}
                          className="px-5 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white shadow hover:opacity-90 disabled:opacity-50"
                        >
                          {isEnhancing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Enhancing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Enhance
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Button variant="outline" onClick={() => navigate('/specs')}>← Back to Specifications</Button>
                      <Button
                        onClick={handleSpecifyPhase}
                        disabled={!content.trim() || isGeneratingSpec}
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      >
                        {isGeneratingSpec ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Specification...
                          </>
                        ) : (
                          'Complete Specification →'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

      {/* Specification Display - Collapsible View - Only show on Plan tab */}
      {activeTab === 'plan' && spec?.specification && (
        <Card className="bg-figma-medium-gray border-figma-light-gray">
          <CardHeader>
            <CardTitle className="text-figma-text-primary flex items-center gap-2">
              <span>📋</span>
              Generated Specification
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSpecification(!showSpecification)}
                className="ml-auto text-figma-text-secondary hover:text-figma-text-primary"
              >
                {showSpecification ? '▼' : '▶'}
              </Button>
            </CardTitle>
            <CardDescription className="text-figma-text-secondary">
              The specification generated from your requirements
            </CardDescription>
          </CardHeader>
          {showSpecification && (
            <CardContent>
              <div className="bg-figma-dark-gray p-4 rounded-lg max-h-96 overflow-y-auto">
                <MDEditor.Markdown source={spec.specification} />
              </div>
            </CardContent>
          )}
        </Card>
      )}

            {activeTab === 'plan' && (
              <Card className="bg-figma-medium-gray border-figma-light-gray border-2 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary flex items-center gap-2">
                    <span>🏗️</span>
                    /plan - Define HOW to Build It
                  </CardTitle>
                  <CardDescription className="text-figma-text-secondary">
                    Now specify your tech stack and architecture choices. This is where you define the <strong>HOW</strong>.
                    {selectedTemplate && (
                      <div className="mt-2 p-2 bg-green-900/20 border border-green-800/30 rounded-lg">
                        <p className="text-xs text-green-300">
                          📋 Pre-populated from template: <strong>{selectedTemplate.title}</strong>
                        </p>
                      </div>
                    )}
                  </CardDescription>
                  <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                    <p className="text-xs text-blue-300/80">
                      <strong>CLI equivalent:</strong> <code className="bg-figma-light-gray/20 px-1 rounded">/plan The application uses Vite with minimal libraries. Use vanilla HTML, CSS, and JavaScript...</code> - <a href="https://github.com/github/spec-kit" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">try it in CLI with spec-kit</a>
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Planning Input Form - Always Visible */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Input Fields */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white">Tech stack & architecture</Label>
                        <Textarea
                          placeholder="e.g., Vite + React, .NET Aspire, PostgreSQL"
                          value={techStack}
                          onChange={(e) => setTechStack(e.target.value)}
                          className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary min-h-[100px]"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Architecture notes</Label>
                        <Textarea
                          placeholder="Key components, boundaries, data flows"
                          value={architectureNotes}
                          onChange={(e) => setArchitectureNotes(e.target.value)}
                          className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary min-h-[100px]"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Non-functional requirements</Label>
                        <Textarea
                          placeholder="Performance, security, accessibility, SLAs"
                          value={nonFunctional}
                          onChange={(e) => setNonFunctional(e.target.value)}
                          className="bg-figma-input-gray border-figma-light-gray text-figma-text-primary placeholder-figma-text-secondary min-h-[100px]"
                        />
                      </div>
                    </div>

                    {/* Right Column - Checkboxes */}
                    <div className="space-y-4">
                      <div className="bg-figma-dark-gray rounded-md p-4 space-y-3">
                        <div className="text-sm text-figma-text-primary font-medium">Phase -1 Gates</div>
                        <label className="flex items-center justify-between text-sm text-figma-text-secondary">
                          <span>Simplicity Gate (≤3 projects, no future-proofing)</span>
                          <input type="checkbox" checked={gateSimplicity} onChange={(e) => setGateSimplicity(e.target.checked)} />
                        </label>
                        <label className="flex items-center justify-between text-sm text-figma-text-secondary">
                          <span>Anti-Abstraction Gate (use framework directly)</span>
                          <input type="checkbox" checked={gateAntiAbstraction} onChange={(e) => setGateAntiAbstraction(e.target.checked)} />
                        </label>
                        <label className="flex items-center justify-between text-sm text-figma-text-secondary">
                          <span>Integration-First Gate (contracts & tests first)</span>
                          <input type="checkbox" checked={gateIntegrationFirst} onChange={(e) => setGateIntegrationFirst(e.target.checked)} />
                        </label>
                      </div>
                      
                      <div className="bg-figma-dark-gray rounded-md p-4 space-y-3">
                        <div className="text-sm text-figma-text-primary font-medium">Development Options</div>
                        <label className="flex items-center justify-between text-sm text-figma-text-secondary">
                          <span>Use MCP tools</span>
                          <input type="checkbox" checked={useMcpTools} onChange={(e) => setUseMcpTools(e.target.checked)} />
                        </label>
                        <label className="flex items-center justify-between text-sm text-figma-text-secondary">
                          <span>Agent-to-Agent (A2A)</span>
                          <input type="checkbox" checked={useA2A} onChange={(e) => setUseA2A(e.target.checked)} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Generate Plan Button */}
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" onClick={() => setActiveTab('specify')}>← Back</Button>
                    <Button
                      onClick={() => {
                        // Create spec-kit compliant plan request
                        const planRequest = {
                          tech_stack: techStack || "Modern web application",
                          architecture: architectureNotes || undefined,
                          constraints: nonFunctional || undefined,
                          constitution_gates: {
                            simplicity: gateSimplicity,
                            anti_abstraction: gateAntiAbstraction,
                            integration_first: gateIntegrationFirst
                          },
                          ai_preference: aiPreference,
                          use_mcp_tools: useMcpTools,
                          use_a2a: useA2A,
                          ignore_agent_tools: ignoreAgentTools
                        };
                        
                        // Generate plan using spec-kit methodology
                        handlePlanPhase(planRequest)
                      }}
                      disabled={!techStack.trim() || isGeneratingPlan}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    >
                      {isGeneratingPlan ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating Plan...
                        </>
                      ) : (
                        'Generate Implementation Plan'
                      )}
                    </Button>
                  </div>

                  {/* Generated Plan Display - Spec-Kit Components */}
                  {(planContent || researchContent || dataModelContent || contractsContent) && (
                    <div className="space-y-4">
                      <div className="border-t border-figma-light-gray pt-4">
                        <h3 className="text-lg font-semibold text-figma-text-primary mb-4">Implementation Plan (Spec-Kit Methodology)</h3>
                        
                        {/* Plan Overview */}
                        {planContent && (
                          <div className="mb-6">
                            <h4 className="text-md font-medium text-figma-text-primary mb-2">📋 Plan Overview</h4>
                            <div className="bg-figma-dark-gray p-4 rounded-lg">
                              <MDEditor.Markdown source={planContent} />
                            </div>
                          </div>
                        )}

                        {/* Research Document */}
                        {researchContent && (
                          <div className="mb-6">
                            <h4 className="text-md font-medium text-figma-text-primary mb-2">🔬 Research & Decisions</h4>
                            <div className="bg-figma-dark-gray p-4 rounded-lg">
                              <MDEditor.Markdown source={researchContent} />
                            </div>
                          </div>
                        )}

                        {/* Data Model */}
                        {dataModelContent && (
                          <div className="mb-6">
                            <h4 className="text-md font-medium text-figma-text-primary mb-2">🗃️ Data Model</h4>
                            <div className="bg-figma-dark-gray p-4 rounded-lg">
                              <MDEditor.Markdown source={dataModelContent} />
                            </div>
                          </div>
                        )}

                        {/* API Contracts */}
                        {contractsContent && (
                          <div className="mb-6">
                            <h4 className="text-md font-medium text-figma-text-primary mb-2">📡 API Contracts</h4>
                            <div className="bg-figma-dark-gray p-4 rounded-lg">
                              <MDEditor.Markdown source={contractsContent} />
                            </div>
                          </div>
                        )}

                        {/* Fallback when no content is available */}
                        {!planContent && !researchContent && !dataModelContent && !contractsContent && (
                          <div className="mb-6">
                            <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-4">
                              <h4 className="text-md font-medium text-yellow-300 mb-2">⚠️ Plan Generated</h4>
                              <p className="text-sm text-yellow-300/80">
                                Plan generation completed, but no content was returned. Check the console for details.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={() => setActiveTab('specify')}>← Back</Button>
                        <Button
                          onClick={handleTasksPhase}
                          disabled={isGeneratingTasks}
                          className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                        >
                          {isGeneratingTasks ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Generating Tasks...
                            </>
                          ) : (
                            'Generate Tasks →'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            )}

            {activeTab === 'tasks' && (
              <Card className="bg-figma-medium-gray border-figma-light-gray border-2 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary flex items-center gap-2">
                    <span>✅</span>
                    /tasks - Create Actionable Implementation Tasks
                  </CardTitle>
                  <CardDescription className="text-figma-text-secondary">
                    Generate actionable tasks from the implementation plan following spec-kit methodology. Tasks are created from contracts, data models, and research documents.
                  </CardDescription>
                  <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                    <p className="text-xs text-blue-300/80">
                      <strong>CLI equivalent:</strong> <code className="bg-figma-light-gray/20 px-1 rounded">/tasks</code> creates actionable task list for implementation - <a href="https://github.com/github/spec-kit" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">try it in CLI with spec-kit</a>
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {taskBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      {/* Task Selection Controls */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={selectAllTasks}
                            className="text-xs"
                          >
                            Select All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearTaskSelection}
                            className="text-xs"
                          >
                            Clear All
                          </Button>
                        </div>
                        <div className="text-sm text-figma-text-secondary">
                          {selectedTasks.size} of {taskBreakdown.length} tasks selected
                        </div>
                      </div>

                      {/* Spec-Kit Task Overview */}
                      <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-medium text-blue-300 mb-2">📋 Spec-Kit Task Generation</h4>
                        <p className="text-xs text-blue-300/80">
                          Tasks generated following spec-kit methodology: Setup → Tests → Models → Services → Integration → Polish
                        </p>
                      </div>

                      {/* Task List with Spec-Kit Phases */}
                      <div className="space-y-4">
                        {['Setup', 'Tests', 'Core', 'Integration', 'Polish'].map(phase => {
                          const phaseTasks = taskBreakdown.filter(task => task.phase === phase.toLowerCase())
                          if (phaseTasks.length === 0) return null
                          
                          return (
                            <div key={phase} className="space-y-2">
                              <h5 className="text-sm font-medium text-figma-text-primary border-b border-figma-light-gray pb-1">
                                Phase 3.{['Setup', 'Tests', 'Core', 'Integration', 'Polish'].indexOf(phase) + 1}: {phase}
                                {phase === 'Tests' && ' (TDD - Must Complete First)'}
                              </h5>
                              {phaseTasks.map((task) => (
                                <div 
                                  key={task.id} 
                                  className={`bg-figma-dark-gray p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                    selectedTasks.has(task.id) 
                                      ? 'border-blue-500 bg-blue-900/20' 
                                      : 'border-transparent hover:border-figma-light-gray'
                                  }`}
                                  onClick={() => toggleTaskSelection(task.id)}
                                >
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      checked={selectedTasks.has(task.id)}
                                      onChange={() => toggleTaskSelection(task.id)}
                                      className="mt-1"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-figma-text-primary">{task.title}</h4>
                                        <div className="flex items-center gap-2">
                                          {task.parallel && (
                                            <Badge className="text-xs bg-green-900/30 text-green-400">
                                              [P]
                                            </Badge>
                                          )}
                                          <Badge className={`text-xs ${
                                            task.priority === 'high' ? 'bg-red-900/30 text-red-400' :
                                            task.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                                            'bg-green-900/30 text-green-400'
                                          }`}>
                                            {task.priority}
                                          </Badge>
                                        </div>
                                      </div>
                                      <p className="text-figma-text-secondary text-sm mb-2">{task.description}</p>
                                      <div className="flex items-center gap-4 text-xs text-figma-text-secondary">
                                        <span>Time: {task.estimatedTime}</span>
                                        <span>Tokens: {task.estimatedTokens}</span>
                                        <span>Status: {task.status}</span>
                                        {task.filePath && (
                                          <span className="text-blue-400">📁 {task.filePath}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-4">
                        <Button variant="outline" onClick={() => setActiveTab('plan')}>← Back</Button>
                        {selectedTasks.size > 0 ? (
                          <Button 
                            onClick={() => setIsAgentPanelExpanded(true)} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Assign {selectedTasks.size} Task{selectedTasks.size > 1 ? 's' : ''} to SWE Agent →
                          </Button>
                        ) : (
                          <Button 
                            disabled
                            className="bg-gray-600 text-gray-400 cursor-not-allowed"
                          >
                            Select tasks to assign
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Button
                        onClick={handleTasksPhase}
                        disabled={!planContent.trim() || isGeneratingTasks}
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      >
                        {isGeneratingTasks ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating Tasks...
                          </>
                        ) : (
                          'Generate Tasks from Plan'
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>

          {isAgentPanelExpanded && taskBreakdown.length > 0 && selectedTasks.size > 0 && (
            <div className="lg:col-span-1 animate-in slide-in-from-right duration-300">
              <Card className="bg-figma-medium-gray border-figma-light-gray sticky top-8">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Wrench className="h-5 w-5 mr-2 text-emerald-400" />
                      <CardTitle className="text-figma-text-primary">Agent Assignment</CardTitle>
                    </div>
                    <Button 
                      onClick={() => setIsAgentPanelExpanded(false)}
                      variant="outline"
                      size="sm"
                      className="bg-figma-input-gray text-figma-text-primary border-figma-light-gray hover:bg-figma-light-gray/20 hover:text-white"
                    >
                      Hide Panel
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                  <CardDescription className="text-figma-text-secondary">
                    Assign {selectedTasks.size} selected task{selectedTasks.size > 1 ? 's' : ''} to a cloud-based coding agent
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
                        <Wrench className="h-5 w-5 mr-2 text-emerald-400" />
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
                          <CardTitle className="text-figma-text-primary">
                            Assignment Result #{String((resp as Record<string, unknown>).assignmentNumber) || idx + 1}
                            {(resp as Record<string, unknown>).taskTitle ? (
                              <span className="text-sm font-normal text-figma-text-secondary ml-2">
                                - {String((resp as Record<string, unknown>).taskTitle)}
                              </span>
                            ) : null}
                          </CardTitle>
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
          <div className="fixed right-0 top-1/2 -translate-y-1/2 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAgentPanelExpanded(true)}
              className="relative w-10 h-36 rounded-l-md rounded-r-none border-r-0 bg-figma-medium-gray text-figma-text-primary border-figma-light-gray hover:bg-figma-black hover:text-white shadow-lg"
            >
              <div className="absolute inset-0 flex items-center justify-center -rotate-90">
                <div className="flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-xs font-medium">Show Panel</span>
                </div>
              </div>
            </Button>
          </div>
        )}

        {/* Constitution Editor Modal */}

      </div>
    </div>
  )
}

export default SpecWorkbench
