import { ArrowRight, Zap, Settings } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <section className="py-20 bg-figma-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-figma-text-primary mb-4">
            Build AI Solutions with SWE Agents
          </h1>
          <p className="text-xl text-figma-text-secondary max-w-3xl mx-auto">
            Choose your approach to customize AI solution accelerators for your scenario
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="bg-figma-dark-gray border-figma-medium-gray hover:shadow-xl transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-figma-text-primary">Customize Patterns</CardTitle>
              <CardDescription className="text-figma-text-secondary">
                Start with proven AI agent patterns and adapt them to your specific use case
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
                  Explore Patterns
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-figma-dark-gray border-figma-medium-gray hover:shadow-xl transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-green-400" />
              </div>
              <CardTitle className="text-2xl text-figma-text-primary">Customize Templates</CardTitle>
              <CardDescription className="text-figma-text-secondary">
                Browse and customize pre-built AI solution templates for rapid deployment
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
                  Browse Templates
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
