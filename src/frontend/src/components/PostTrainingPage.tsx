import { useState, useRef } from 'react'
import { ArrowLeft, Upload, Search, Download, Settings, Database, Zap, ChevronRight, Info } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Link } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'

interface Dataset {
  id: string
  name: string
  description: string
  downloads: number
  likes: number
  tags: string[]
}

interface HyperParameters {
  learning_rate: number
  batch_size: number
  num_epochs: number
  max_seq_length: number
  lora_r: number
  lora_alpha: number
  lora_dropout: number
  warmup_steps: number
  grpo_beta: number
  grpo_group_size: number
}

export function PostTrainingPage() {
  const [step, setStep] = useState<'upload' | 'search' | 'configure' | 'generate'>('upload')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Dataset[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hyperParams, setHyperParams] = useState<HyperParameters>({
    learning_rate: 5e-5,
    batch_size: 4,
    num_epochs: 3,
    max_seq_length: 2048,
    lora_r: 16,
    lora_alpha: 32,
    lora_dropout: 0.1,
    warmup_steps: 100,
    grpo_beta: 0.1,
    grpo_group_size: 64
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      toast({
        title: "Dataset uploaded",
        description: `${file.name} has been uploaded successfully.`
      })
    }
  }

  const searchSimilarDatasets = async () => {
    if (!uploadedFile && !searchQuery) return
    
    setIsSearching(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/post-training/search-datasets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          uploaded_file: uploadedFile?.name || null
        })
      })
      
      if (response.ok) {
        const results = await response.json()
        setSearchResults(results.datasets)
        setStep('search')
      } else {
        toast({
          title: "Search failed",
          description: "Failed to search for similar datasets.",
          variant: "destructive"
        })
      }
    } catch {
      toast({
        title: "Search error",
        description: "An error occurred while searching for datasets.",
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
    }
  }

  const generateNotebook = async () => {
    if (!selectedDataset && !uploadedFile) return
    
    setIsGenerating(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/post-training/generate-notebook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataset: selectedDataset || { name: uploadedFile?.name },
          hyperparameters: hyperParams
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = 'post_training_grpo_notebook.ipynb'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast({
          title: "Notebook generated",
          description: "Your GRPO training notebook has been downloaded."
        })
      } else {
        toast({
          title: "Generation failed",
          description: "Failed to generate the notebook.",
          variant: "destructive"
        })
      }
    } catch {
      toast({
        title: "Generation error",
        description: "An error occurred while generating the notebook.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const getStepNumber = (currentStep: string) => {
    const steps = ['upload', 'search', 'configure', 'generate']
    return steps.indexOf(currentStep) + 1
  }

  return (
    <div className="min-h-screen bg-figma-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" asChild className="mr-4">
            <Link to="/" className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-figma-text-primary">
            Post-training with RL
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Progress Steps */}
          <div className="lg:col-span-4">
            <div className="flex items-center justify-between mb-8 bg-figma-medium-gray rounded-lg p-4">
              <div className={`flex items-center ${step === 'upload' ? 'text-purple-400' : getStepNumber(step) > 1 ? 'text-green-400' : 'text-figma-text-secondary'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${step === 'upload' ? 'bg-purple-500' : getStepNumber(step) > 1 ? 'bg-green-500' : 'bg-figma-light-gray'}`}>
                  {getStepNumber(step) > 1 ? '✓' : '1'}
                </div>
                <span className="font-medium">Upload Dataset</span>
              </div>
              <ChevronRight className="h-4 w-4 text-figma-text-secondary" />
              <div className={`flex items-center ${step === 'search' ? 'text-purple-400' : getStepNumber(step) > 2 ? 'text-green-400' : 'text-figma-text-secondary'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${step === 'search' ? 'bg-purple-500' : getStepNumber(step) > 2 ? 'bg-green-500' : 'bg-figma-light-gray'}`}>
                  {getStepNumber(step) > 2 ? '✓' : '2'}
                </div>
                <span className="font-medium">Find Similar</span>
              </div>
              <ChevronRight className="h-4 w-4 text-figma-text-secondary" />
              <div className={`flex items-center ${step === 'configure' ? 'text-purple-400' : getStepNumber(step) > 3 ? 'text-green-400' : 'text-figma-text-secondary'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${step === 'configure' ? 'bg-purple-500' : getStepNumber(step) > 3 ? 'bg-green-500' : 'bg-figma-light-gray'}`}>
                  {getStepNumber(step) > 3 ? '✓' : '3'}
                </div>
                <span className="font-medium">Configure</span>
              </div>
              <ChevronRight className="h-4 w-4 text-figma-text-secondary" />
              <div className={`flex items-center ${step === 'generate' ? 'text-purple-400' : 'text-figma-text-secondary'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${step === 'generate' ? 'bg-purple-500' : 'bg-figma-light-gray'}`}>
                  4
                </div>
                <span className="font-medium">Generate</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          {step === 'upload' && (
            <>
              <div className="lg:col-span-3">
                <Card className="bg-figma-medium-gray border-figma-light-gray">
                  <CardHeader>
                    <CardTitle className="text-figma-text-primary flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Dataset Upload
                    </CardTitle>
                    <CardDescription className="text-figma-text-secondary">
                      Upload your dataset or use an example dataset to get started with post-training
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="file-upload" className="text-figma-text-primary">Upload Dataset</Label>
                      <div className="mt-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          id="file-upload"
                          accept=".json,.jsonl,.csv,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          className="w-full h-32 border-dashed border-2 border-figma-light-gray hover:border-purple-400 bg-transparent"
                        >
                          <div className="text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-figma-text-secondary" />
                            <p className="text-figma-text-primary">Click to upload dataset</p>
                            <p className="text-sm text-figma-text-secondary">JSON, JSONL, CSV, or TXT files</p>
                          </div>
                        </Button>
                      </div>
                      {uploadedFile && (
                        <div className="mt-2 p-3 bg-figma-black rounded-lg">
                          <p className="text-figma-text-primary">Uploaded: {uploadedFile.name}</p>
                          <p className="text-sm text-figma-text-secondary">Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="text-figma-text-secondary mb-4">Or use an example dataset</p>
                      <Button
                        onClick={() => {
                          setSelectedDataset({
                            id: 'OpenAssistant/oasst1',
                            name: 'OpenAssistant Conversations',
                            description: 'High-quality conversational dataset for instruction tuning with human feedback',
                            downloads: 50000,
                            likes: 1200,
                            tags: ['conversational', 'instruction-tuning', 'human-feedback']
                          })
                          setStep('search')
                        }}
                        variant="outline"
                        className="bg-figma-black border-figma-light-gray text-figma-text-primary hover:bg-figma-light-gray"
                      >
                        Use Example Dataset
                      </Button>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          if (uploadedFile) {
                            setSearchQuery(uploadedFile.name.replace(/\.[^/.]+$/, ""))
                            searchSimilarDatasets()
                          } else {
                            toast({
                              title: "No dataset",
                              description: "Please upload a dataset or use the example dataset.",
                              variant: "destructive"
                            })
                          }
                        }}
                        disabled={!uploadedFile || isSearching}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        {isSearching ? 'Searching...' : 'Continue'}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <Card className="bg-figma-medium-gray border-figma-light-gray">
                  <CardHeader>
                    <CardTitle className="text-figma-text-primary flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      About Post-training
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-figma-text-primary mb-2">What is GRPO?</h4>
                      <p className="text-xs text-figma-text-secondary">Group Relative Policy Optimization stabilizes RL training by comparing responses within groups rather than absolute rewards.</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-figma-text-primary mb-2">SFT Warmup</h4>
                      <p className="text-xs text-figma-text-secondary">Supervised Fine-Tuning prepares the model before RL training, improving stability and convergence.</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-figma-text-primary mb-2">Phi-4 + Unsloth</h4>
                      <p className="text-xs text-figma-text-secondary">Optimized training with Microsoft's Phi-4 model and Unsloth's efficient LoRA implementation.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {step === 'search' && (
            <>
              <div className="lg:col-span-3">
                <Card className="bg-figma-medium-gray border-figma-light-gray">
                  <CardHeader>
                    <CardTitle className="text-figma-text-primary flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Similar Datasets
                    </CardTitle>
                    <CardDescription className="text-figma-text-secondary">
                      {selectedDataset ? 'Selected dataset or search for alternatives' : 'Search for datasets similar to your upload'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedDataset && (
                      <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-purple-300">{selectedDataset.name}</h3>
                            <p className="text-sm text-figma-text-secondary mt-1">{selectedDataset.description}</p>
                            <div className="flex gap-2 mt-2">
                              {selectedDataset.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            onClick={() => setSelectedDataset(null)}
                            variant="ghost"
                            size="sm"
                            className="text-figma-text-secondary hover:text-figma-text-primary"
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="search-query" className="text-figma-text-primary">Search for similar datasets</Label>
                      <div className="flex gap-2">
                        <Input
                          id="search-query"
                          placeholder="e.g., conversational AI, instruction tuning, code generation"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                        />
                        <Button
                          onClick={searchSimilarDatasets}
                          disabled={isSearching || !searchQuery}
                          className="bg-purple-500 hover:bg-purple-600 text-white"
                        >
                          {isSearching ? 'Searching...' : 'Search'}
                        </Button>
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-figma-text-primary font-medium">Search Results</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {searchResults.map((dataset) => (
                            <div
                              key={dataset.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedDataset?.id === dataset.id
                                  ? 'border-purple-500 bg-purple-900/20'
                                  : 'border-figma-light-gray bg-figma-black hover:border-purple-400'
                              }`}
                              onClick={() => setSelectedDataset(dataset)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-figma-text-primary text-sm">{dataset.name}</h4>
                                  <p className="text-xs text-figma-text-secondary mt-1 line-clamp-2">{dataset.description}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-figma-text-secondary">
                                    <span>↓ {dataset.downloads.toLocaleString()}</span>
                                    <span>♥ {dataset.likes.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <Button
                        onClick={() => setStep('upload')}
                        variant="outline"
                        className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        onClick={() => setStep('configure')}
                        disabled={!selectedDataset}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        Configure Training
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <Card className="bg-figma-medium-gray border-figma-light-gray">
                  <CardHeader>
                    <CardTitle className="text-figma-text-primary flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Dataset Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedDataset ? (
                      <>
                        <div>
                          <h4 className="text-sm font-medium text-figma-text-primary mb-1">Selected Dataset</h4>
                          <p className="text-xs text-figma-text-secondary">{selectedDataset.name}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-figma-text-primary mb-1">Downloads</h4>
                          <p className="text-xs text-figma-text-secondary">{selectedDataset.downloads.toLocaleString()}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-figma-text-primary mb-1">Tags</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedDataset.tags.slice(0, 4).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-figma-text-secondary">Select a dataset to see details</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {step === 'configure' && (
            <>
              <div className="lg:col-span-3">
                <Card className="bg-figma-medium-gray border-figma-light-gray">
                  <CardHeader>
                    <CardTitle className="text-figma-text-primary flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Training Configuration
                    </CardTitle>
                    <CardDescription className="text-figma-text-secondary">
                      Configure hyperparameters for SFT warmup and GRPO training
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-figma-text-primary">Basic Parameters</h3>
                        
                        <div className="space-y-2">
                          <Label className="text-figma-text-primary">Learning Rate</Label>
                          <Input
                            type="number"
                            value={hyperParams.learning_rate}
                            onChange={(e) => setHyperParams(prev => ({ ...prev, learning_rate: parseFloat(e.target.value) || 5e-5 }))}
                            step="0.00001"
                            min="0.00001"
                            max="0.001"
                            className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                          />
                          <p className="text-xs text-figma-text-secondary">Controls how fast the model learns. Lower values are more stable.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-figma-text-primary">Batch Size</Label>
                          <Input
                            type="number"
                            value={hyperParams.batch_size}
                            onChange={(e) => setHyperParams(prev => ({ ...prev, batch_size: parseInt(e.target.value) || 4 }))}
                            min="1"
                            max="16"
                            className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                          />
                          <p className="text-xs text-figma-text-secondary">Number of samples processed together. Higher values need more memory.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-figma-text-primary">Epochs</Label>
                          <Input
                            type="number"
                            value={hyperParams.num_epochs}
                            onChange={(e) => setHyperParams(prev => ({ ...prev, num_epochs: parseInt(e.target.value) || 3 }))}
                            min="1"
                            max="10"
                            className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                          />
                          <p className="text-xs text-figma-text-secondary">Number of complete passes through the dataset.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-figma-text-primary">Max Sequence Length: {hyperParams.max_seq_length}</Label>
                          <Select value={hyperParams.max_seq_length.toString()} onValueChange={(value) => setHyperParams(prev => ({ ...prev, max_seq_length: parseInt(value) }))}>
                            <SelectTrigger className="bg-figma-black border-figma-light-gray text-figma-text-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1024">1024</SelectItem>
                              <SelectItem value="2048">2048</SelectItem>
                              <SelectItem value="4096">4096</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-figma-text-secondary">Maximum input length. Longer sequences need more memory.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-figma-text-primary">LoRA Parameters</h3>
                        
                        <div className="space-y-2">
                          <Label className="text-figma-text-primary">LoRA Rank (r)</Label>
                          <Input
                            type="number"
                            value={hyperParams.lora_r}
                            onChange={(e) => setHyperParams(prev => ({ ...prev, lora_r: parseInt(e.target.value) || 16 }))}
                            min="4"
                            max="64"
                            step="4"
                            className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                          />
                          <p className="text-xs text-figma-text-secondary">Dimensionality of LoRA adaptation. Higher values = more parameters.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-figma-text-primary">LoRA Alpha</Label>
                          <Input
                            type="number"
                            value={hyperParams.lora_alpha}
                            onChange={(e) => setHyperParams(prev => ({ ...prev, lora_alpha: parseInt(e.target.value) || 32 }))}
                            min="8"
                            max="128"
                            step="8"
                            className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                          />
                          <p className="text-xs text-figma-text-secondary">Scaling factor for LoRA. Usually 2x the rank value.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-figma-text-primary">LoRA Dropout</Label>
                          <Input
                            type="number"
                            value={hyperParams.lora_dropout}
                            onChange={(e) => setHyperParams(prev => ({ ...prev, lora_dropout: parseFloat(e.target.value) || 0.1 }))}
                            min="0"
                            max="0.5"
                            step="0.05"
                            className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                          />
                          <p className="text-xs text-figma-text-secondary">Dropout rate for LoRA layers. Helps prevent overfitting.</p>
                        </div>

                        <h3 className="text-lg font-medium text-figma-text-primary mt-6">GRPO Parameters</h3>
                        
                        <div className="space-y-2">
                          <Label className="text-figma-text-primary">GRPO Beta</Label>
                          <Input
                            type="number"
                            value={hyperParams.grpo_beta}
                            onChange={(e) => setHyperParams(prev => ({ ...prev, grpo_beta: parseFloat(e.target.value) || 0.1 }))}
                            min="0.01"
                            max="0.5"
                            step="0.01"
                            className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                          />
                          <p className="text-xs text-figma-text-secondary">KL divergence penalty weight. Controls how much the model can deviate.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-figma-text-primary">Group Size</Label>
                          <Input
                            type="number"
                            value={hyperParams.grpo_group_size}
                            onChange={(e) => setHyperParams(prev => ({ ...prev, grpo_group_size: parseInt(e.target.value) || 64 }))}
                            min="16"
                            max="128"
                            step="16"
                            className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                          />
                          <p className="text-xs text-figma-text-secondary">Number of responses per group for comparison in GRPO.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button
                        onClick={() => setStep('search')}
                        variant="outline"
                        className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        onClick={() => setStep('generate')}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        Generate Notebook
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <Card className="bg-figma-medium-gray border-figma-light-gray">
                  <CardHeader>
                    <CardTitle className="text-figma-text-primary flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Training Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-figma-text-primary mb-1">Dataset</h4>
                      <p className="text-xs text-figma-text-secondary">{selectedDataset?.name || uploadedFile?.name || 'None selected'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-figma-text-primary mb-1">Model</h4>
                      <p className="text-xs text-figma-text-secondary">Microsoft Phi-4 with LoRA</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-figma-text-primary mb-1">Training Steps</h4>
                      <div className="text-xs text-figma-text-secondary space-y-1">
                        <div>1. SFT Warmup ({hyperParams.num_epochs} epochs)</div>
                        <div>2. GRPO Training</div>
                        <div>3. Model Export</div>
                        <div>4. Azure ML Deployment</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-figma-text-primary mb-1">Estimated Time</h4>
                      <p className="text-xs text-figma-text-secondary">2-4 hours on Azure GPU</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {step === 'generate' && (
            <div className="lg:col-span-4">
              <Card className="bg-figma-medium-gray border-figma-light-gray">
                <CardHeader>
                  <CardTitle className="text-figma-text-primary flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Generate Training Notebook
                  </CardTitle>
                  <CardDescription className="text-figma-text-secondary">
                    Generate a complete Jupyter notebook with SFT warmup, GRPO training, and Azure deployment instructions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-figma-black rounded-lg p-6">
                    <h3 className="text-lg font-medium text-figma-text-primary mb-4">Notebook Contents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-figma-text-secondary">Environment setup & dependencies</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-figma-text-secondary">Phi-4 model loading with Unsloth</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-figma-text-secondary">Dataset preparation & formatting</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-figma-text-secondary">LoRA configuration</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className="text-figma-text-secondary">SFT warmup training</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className="text-figma-text-secondary">GRPO training configuration</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-figma-text-secondary">Model saving & export</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-figma-text-secondary">Azure ML deployment guide</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                    <h4 className="text-yellow-300 font-medium mb-2">Azure Deployment Options</h4>
                    <div className="text-sm text-figma-text-secondary space-y-1">
                      <div>• <strong>Azure Machine Learning:</strong> Managed training with auto-scaling</div>
                      <div>• <strong>Azure Nvidia GPUs:</strong> Standard_NC6s_v3, Standard_NC12s_v3 instances</div>
                      <div>• <strong>Cost Optimization:</strong> Spot instances and scheduled training</div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      onClick={() => setStep('configure')}
                      variant="outline"
                      className="bg-figma-black border-figma-light-gray text-figma-text-primary"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Configure
                    </Button>
                    <Button
                      onClick={generateNotebook}
                      disabled={isGenerating}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download Notebook
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
