import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { X, ExternalLink } from 'lucide-react'
import MDEditor from '@uiw/react-md-editor'

interface ConstitutionViewerProps {
  isOpen: boolean
  onClose: () => void
  constitution: string
  projectName?: string
}

export function ConstitutionViewer({ isOpen, onClose, constitution, projectName }: ConstitutionViewerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-figma-medium-gray border-figma-light-gray [&>button]:text-white [&>button]:hover:text-gray-200 [&>button]:hover:bg-gray-700/50 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-figma-text-primary flex items-center gap-2 text-lg">
            <span>⚖️</span>
            {projectName ? `${projectName} Constitution` : 'Constitutional Framework'}
          </DialogTitle>
          <DialogDescription className="text-figma-text-secondary text-sm">
            Constitutional framework based on <a href="https://github.com/github/spec-kit" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1">
              spec-kit methodology <ExternalLink className="h-3 w-3" />
            </a> that governs spec-driven development compliance
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="bg-figma-dark-gray rounded-md p-4">
            <div data-color-mode="dark" className="text-sm text-white [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white [&_p]:text-gray-200 [&_li]:text-gray-200 [&_strong]:text-blue-300 [&_em]:text-gray-300 [&_a]:text-blue-400 [&_a:hover]:text-blue-300 [&_code]:text-green-300 [&_pre]:bg-gray-800 [&_pre]:text-gray-200">
              <MDEditor.Markdown 
                source={constitution}
                style={{ 
                  backgroundColor: 'transparent',
                  color: '#ffffff'
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t border-figma-light-gray">
          <div className="text-xs text-figma-text-secondary">
            Read-only view • Based on spec-kit constitutional framework
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-white bg-transparent hover:bg-gray-700/50 hover:text-white hover:border-gray-500"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
