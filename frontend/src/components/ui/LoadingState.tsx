type LoadingStateProps = {
  label?: string
}

export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <div className="flex min-h-56 items-center justify-center gap-3 text-sm font-medium text-slate-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />
      <span>{label}</span>
    </div>
  )
}
