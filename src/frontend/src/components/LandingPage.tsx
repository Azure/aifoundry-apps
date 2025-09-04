import { ArrowRight, Zap, Settings, FileText } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <section className="py-12 bg-figma-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-figma-text-primary mb-4">
            Build AI Solutions with SWE Agents
          </h1>
          <p className="text-xl text-figma-text-secondary max-w-3xl mx-auto">
            Build high-quality software faster with Spec-Driven Development - where specifications become executable
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="bg-gradient-to-br from-orange-900/20 to-orange-800/10 border-orange-600/30 hover:border-orange-500/50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/20">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FileText className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl text-figma-text-primary mb-2">Spec-Kit: Spec-Driven Development</CardTitle>
              <CardDescription className="text-figma-text-secondary text-base">
                Transform ideas into executable specifications through constitutional governance and three-phase methodology
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="bg-figma-black/50 rounded-lg p-4 mb-6">
                <div className="text-sm text-figma-text-secondary space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <span className="text-blue-400 text-xs font-bold">1</span>
                    </div>
                    <span className="text-blue-400 font-medium">/specify</span>
                    <span>- Define WHAT and WHY</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <span className="text-yellow-400 text-xs font-bold">2</span>
                    </div>
                    <span className="text-yellow-400 font-medium">/plan</span>
                    <span>- Technical architecture + governance</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <span className="text-purple-400 text-xs font-bold">3</span>
                    </div>
                    <span className="text-purple-400 font-medium">/tasks</span>
                    <span>- Actionable implementation</span>
                  </div>
                </div>
              </div>
              <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-medium py-3">
                <Link to="/specs" className="flex items-center justify-center">
                  Start Spec-Driven Development
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-figma-medium-gray border-figma-light-gray hover:border-figma-text-secondary transition-colors">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-green-400" />
              </div>
              <CardTitle className="text-2xl text-figma-text-primary">Configure Templates</CardTitle>
              <CardDescription className="text-figma-text-secondary">
                Browse and configure pre-built AI solution templates for rapid deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-figma-text-secondary mb-6 space-y-2">
                <li>• Ready-to-use AI solutions</li>
                <li>• Multiple languages & frameworks</li>
                <li>• SWE agent integration</li>
              </ul>
              <Button asChild className="w-full bg-white text-black hover:bg-gray-800 hover:text-white border border-gray-300 hover:border-gray-800 transition-colors">
                <Link to="/templates" className="flex items-center justify-center">
                  Configure Templates
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-figma-medium-gray border-figma-light-gray hover:border-figma-text-secondary transition-colors">
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
            <CardContent className="text-center">
              <ul className="text-sm text-figma-text-secondary mb-6 space-y-2">
                <li>• Prompt Chaining & Routing</li>
                <li>• Parallelization & Orchestration</li>
                <li>• Evaluator-Optimizer patterns</li>
              </ul>
              <Button asChild className="w-full bg-white text-black hover:bg-gray-800 hover:text-white border border-gray-300 hover:border-gray-800 transition-colors">
                <Link to="/patterns" className="flex items-center justify-center">
                  Design Patterns
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
