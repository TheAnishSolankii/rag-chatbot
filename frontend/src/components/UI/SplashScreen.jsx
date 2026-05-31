import { Bot } from 'lucide-react'

export default function SplashScreen({ message = 'Loading…' }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-base gap-5 animate-fade-in">
      {/* Outer glow ring */}
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-accent-500/20 blur-xl animate-pulse-slow" />
        <div className="relative w-16 h-16 rounded-2xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center shadow-glow">
          <Bot className="w-8 h-8 text-accent-400 animate-pulse" />
        </div>
      </div>

      {/* Spinner dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-accent-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </div>

      <p className="text-text-muted text-sm">{message}</p>
    </div>
  )
}
