import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Loader2, Save, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import MDEditor from '@uiw/react-md-editor'

interface ConstitutionEditorProps {
  isOpen: boolean
  onClose: () => void
  specId?: string
  initialConstitution?: string
}

interface ConstitutionalArticle {
  title: string
  description: string
  checks: string[]
}

interface ConstitutionalData {
  library_first: ConstitutionalArticle
  cli_interface: ConstitutionalArticle
  test_first: ConstitutionalArticle
  simplicity: ConstitutionalArticle
  anti_abstraction: ConstitutionalArticle
  integration_first: ConstitutionalArticle
}

export function ConstitutionEditor({ isOpen, onClose, specId, initialConstitution }: ConstitutionEditorProps) {
  const [constitution, setConstitution] = useState(initialConstitution || '')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const fetchConstitution = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch the current constitutional articles
      const response = await fetch(`${apiUrl}/api/constitution`)
      if (response.ok) {
        const data: ConstitutionalData = await response.json()

        // Convert to markdown format
        const markdown = generateMarkdownFromArticles(data)
        setConstitution(markdown)
      } else {
        // If no constitution exists, provide a default template
        setConstitution(getDefaultConstitution())
      }
    } catch (error) {
      console.error('Error fetching constitution:', error)
      setConstitution(getDefaultConstitution())
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    if (isOpen) {
      if (initialConstitution) {
        setConstitution(initialConstitution)
      } else {
        fetchConstitution()
      }
    }
  }, [isOpen, initialConstitution, fetchConstitution])

  const generateMarkdownFromArticles = (data: ConstitutionalData): string => {
    let markdown = '# Constitutional Framework\n\n'
    markdown += 'This document defines the constitutional principles that govern spec-driven development.\n\n'

    Object.entries(data).forEach(([, article]) => {
      markdown += `## ${article.title}\n\n`
      markdown += `${article.description}\n\n`
      markdown += '**Checks:**\n'
      article.checks.forEach((check: string) => {
        markdown += `- ${check}\n`
      })
      markdown += '\n'
    })

    return markdown
  }

  const getDefaultConstitution = (): string => {
    return `# Constitutional Framework

*Inspired by [spec-kit](https://github.com/github/spec-kit) - A constitutional approach to spec-driven development*

This document defines the constitutional principles that govern spec-driven development, based on the spec-kit methodology.

## Core Principles

### I. Library-First Principle
Every feature starts as a standalone library. Libraries must be self-contained, independently testable, and documented. Each library requires a clear, defined purpose.

**Checks:**
- Using existing libraries over custom implementations
- Clear module boundaries defined
- Minimal dependencies specified
- Libraries are self-contained and testable

### II. CLI Interface Mandate
Every library exposes functionality via CLI. Implements a text-based input/output protocol using stdin/args → stdout, with errors directed to stderr.

**Checks:**
- Command-line interface defined
- All functionality accessible via CLI
- Proper argument parsing implemented
- Text I/O protocol followed (stdin/args → stdout)

### III. Test-First Imperative (NON-NEGOTIABLE)
Test-Driven Development (TDD) is mandatory. Workflow follows: Tests written → User approved → Tests fail → Implementation.

**Checks:**
- Unit tests defined before implementation
- Test coverage plan specified
- Integration tests included
- Red-Green-Refactor cycle enforced

### IV. Integration Testing Priority
Prioritizes integration tests in key areas: new library contract tests, contract change verification, inter-service communication validation.

**Checks:**
- Integration tests for new library contracts
- Contract change verification tests
- Inter-service communication validation
- Real environment testing over mocks

### V. Observability & Simplicity
Emphasizes debuggability through text I/O, structured logging, and "start simple" philosophy.

**Checks:**
- Structured logging implemented
- Debuggable text I/O protocols
- YAGNI (You Aren't Gonna Need It) principles followed
- Semantic versioning (MAJOR.MINOR.BUILD)

### VI. Simplicity Gates
Maximum 3 projects, no future-proofing patterns, direct framework usage.

**Checks:**
- Using ≤3 projects
- No future-proofing patterns
- Simple, direct implementation approach
- Using frameworks directly with minimal wrapping

## Constitution Update Checklist

When amending this constitution, ensure all dependent documents are updated:

### Templates to Update:
- [ ] Plan templates - Update Constitution Check section
- [ ] Spec templates - Update if requirements/scope affected
- [ ] Task templates - Update if new task types needed
- [ ] Command documentation - Update if planning process changes

### Article-specific Updates:
- [ ] **Library-First**: Emphasize library creation in templates
- [ ] **CLI Interface**: Update CLI flag requirements and text I/O protocols
- [ ] **Test-First**: Update test order and TDD requirements
- [ ] **Integration Testing**: List integration test triggers and priorities
- [ ] **Observability**: Add logging and monitoring requirements
- [ ] **Simplicity**: Update project limits and pattern prohibitions

### Validation Steps:
1. [ ] All templates reference new requirements
2. [ ] Examples updated to match new rules
3. [ ] No contradictions between documents
4. [ ] Run sample implementation plan
5. [ ] Verify templates are self-contained

## Governance
- Constitution supersedes all other practices
- Amendments require comprehensive documentation update
- Approval process for changes
- Mandatory migration planning for breaking changes

---
*Based on spec-kit constitutional framework | Version: 2.1.1*
*For more information: https://github.com/github/spec-kit*
`
  }

  const saveConstitution = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${apiUrl}/api/constitution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          constitution: constitution,
          spec_id: specId
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Constitution updated successfully"
        })
        onClose()
      } else {
        throw new Error('Failed to save constitution')
      }
    } catch (error) {
      console.error('Error saving constitution:', error)
      toast({
        title: "Error",
        description: "Failed to save constitution",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-figma-medium-gray border-figma-light-gray [&>button]:text-white [&>button]:hover:text-gray-200 [&>button]:hover:bg-gray-700/50">
        <DialogHeader>
          <DialogTitle className="text-figma-text-primary flex items-center gap-2">
            <span>⚖️</span>
            Constitution Editor
          </DialogTitle>
          <DialogDescription className="text-figma-text-secondary">
            Edit the constitutional framework inspired by <a href="https://github.com/github/spec-kit" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">spec-kit</a> that governs spec-driven development compliance
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2 text-figma-text-primary">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading constitution...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Label className="text-white">Constitutional Framework (Markdown)</Label>
              <div data-color-mode="dark" className="bg-figma-dark-gray rounded-md p-1">
                <MDEditor
                  value={constitution}
                  onChange={(val) => setConstitution(val || '')}
                  previewOptions={{ disallowedElements: ['script', 'style'] }}
                  height={400}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-figma-light-gray">
          <div className="text-xs text-figma-text-secondary">
            Changes will be applied to constitutional compliance validation
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700/50 hover:text-white hover:border-gray-500"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={saveConstitution}
              disabled={saving || !constitution.trim()}
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
                  Save Constitution
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
