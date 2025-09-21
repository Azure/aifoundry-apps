import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'

export function Footer() {
  const [starCount, setStarCount] = useState<number | null>(null)

  useEffect(() => {
    const shouldFetch = import.meta.env.VITE_SHOW_STAR_COUNT === 'true'
    if (!shouldFetch) return
    const fetchStarCount = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/Azure/Aifoundry-apps')
        if (response.ok) {
          const data = await response.json()
          setStarCount(data.stargazers_count)
        }
      } catch {
        // silently ignore to avoid noisy 403s/rate limits in dev
      }
    }
    fetchStarCount()
  }, [])

  const formatStarCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  return (
    <footer className="bg-figma-dark-gray text-figma-text-primary py-6">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-center">
          <a 
            href="https://github.com/Azure/Aifoundry-apps" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-gray-400 hover:text-white text-sm transition-colors group"
          >
            <Star className="w-4 h-4 group-hover:fill-yellow-400 group-hover:text-yellow-400 transition-colors" />
            <span>Star on GitHub</span>
            {starCount !== null && (
              <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
                {formatStarCount(starCount)}
              </span>
            )}
          </a>
        </div>
      </div>
    </footer>
  )
}
