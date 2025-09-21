import { ArrowRight, Zap, Settings, Github, X, ExternalLink } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

export function LandingPage() {
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    // Check if user has dismissed the popup before
    const hasDismissed = localStorage.getItem('aifoundry-popup-dismissed')
    if (!hasDismissed) {
      setShowPopup(true)
    }
  }, [])

  const handleDismiss = () => {
    setShowPopup(false)
    localStorage.setItem('aifoundry-popup-dismissed', 'true')
  }

  const handleFork = () => {
    window.open('https://github.com/Azure/aifoundry-apps', '_blank')
  }

  return (
    <section className="py-12 bg-figma-black relative">
      {/* Glass-like popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleDismiss}
          />
          
          {/* Popup */}
          <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Github className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">
                Self-Host for Optimal Experience
              </h3>
              
              <p className="text-white/80 mb-6 leading-relaxed">
                For the best experience and to avoid rate limits, we recommend forking and self-hosting this application. 
                The demo at <span className="text-yellow-400 font-semibold">aifoundry.app</span> has heavy rate limiting.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={handleFork}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  <Github className="h-5 w-5 mr-2" />
                  Fork on GitHub
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
                
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 py-3 rounded-lg"
                >
                  Continue to Demo
                </Button>
              </div>
              
              <p className="text-xs text-white/60 mt-4">
                You can always fork later from the repository
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-figma-text-primary mb-4">
            Build AI Solutions with SWE Agents
          </h1>
          <p className="text-xl text-figma-text-secondary max-w-3xl mx-auto">
            Build high-quality software faster with Spec-Driven Development
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <Card className="bg-figma-medium-gray border-figma-light-gray hover:border-figma-text-secondary transition-colors flex flex-col h-full">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl" aria-hidden>🌱</span>
              </div>
              <CardTitle className="text-2xl text-figma-text-primary">Specs</CardTitle>
              <CardDescription className="text-figma-text-secondary">
                <a href="https://github.com/github/spec-kit" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">Spec-Kit</a> inspired approach to Spec-Driven Development that transforms specs into apps and agents
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center flex-1 flex flex-col justify-between">
              <ul className="text-sm text-figma-text-secondary mb-6 space-y-2">
                <li>• Define problem space and outcomes</li>
                <li>• Design architecture and contracts</li>
                <li>• Break down into actionable tasks</li>
              </ul>
              <Button asChild className="w-full bg-white text-black hover:bg-gray-800 hover:text-white border border-gray-300 hover:border-gray-800 transition-colors py-3 mt-auto">
                <Link to="/specs" className="flex items-center justify-center">
                  Start Spec-Driven Development
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-figma-medium-gray border-figma-light-gray hover:border-figma-text-secondary transition-colors flex flex-col h-full">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-green-400" />
              </div>
              <CardTitle className="text-2xl text-figma-text-primary">Configure Templates</CardTitle>
              <CardDescription className="text-figma-text-secondary">
                Browse and configure pre-built AI solution templates and workflows for rapid deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center flex-1 flex flex-col justify-between">
              <ul className="text-sm text-figma-text-secondary mb-6 space-y-2">
                <li>• Ready-to-use AI workflows</li>
                <li>• Multiple languages & frameworks</li>
                <li>• SWE agent integration</li>
              </ul>
              <Button asChild className="w-full bg-white text-black hover:bg-gray-800 hover:text-white border border-gray-300 hover:border-gray-800 transition-colors py-3 mt-auto">
                <Link to="/templates" className="flex items-center justify-center">
                  Configure Templates
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-figma-medium-gray border-figma-light-gray hover:border-figma-text-secondary transition-colors flex flex-col h-full">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-figma-text-primary flex items-center justify-center gap-2">
                Design Patterns
                <span className="text-sm bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded-full" title="Work in Progress">WIP</span>
              </CardTitle>
              <CardDescription className="text-figma-text-secondary">
                Start with proven AI agent patterns and tailor them to your specific workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center flex-1 flex flex-col justify-between">
              <ul className="text-sm text-figma-text-secondary mb-6 space-y-2">
                <li>• Prompt Chaining & Routing</li>
                <li>• Parallelization & Orchestration</li>
                <li>• Evaluator-Optimizer patterns</li>
              </ul>
              <Button asChild className="w-full bg-white text-black hover:bg-gray-800 hover:text-white border border-gray-300 hover:border-gray-800 transition-colors py-3 mt-auto">
                <Link to="/patterns" className="flex items-center justify-center">
                  Design Patterns
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-figma-medium-gray border-figma-light-gray hover:border-figma-text-secondary transition-colors flex flex-col h-full">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl" aria-hidden>🧠</span>
              </div>
              <CardTitle className="text-2xl text-figma-text-primary flex items-center justify-center gap-2">
                Post-training with RFT
                <span className="text-sm bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded-full" title="Work in Progress">WIP</span>
              </CardTitle>
              <CardDescription className="text-figma-text-secondary">
                Generate notebooks for RFT workflows to optimize small models using user feedback and data mix
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center flex-1 flex flex-col justify-between">
              <ul className="text-sm text-figma-text-secondary mb-6 space-y-2">
                <li>• SFT warmup with HuggingFace integration</li>
                <li>• Unsloth-AzureML-Phi4 integration</li>
                <li>• RFT with GRPO, less regression via RL</li>
              </ul>
              <Button asChild className="w-full bg-white text-black hover:bg-gray-800 hover:text-white border border-gray-300 hover:border-gray-800 transition-colors py-3 mt-auto">
                <Link to="/post-training" className="flex items-center justify-center">
                  Start Post-training
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
