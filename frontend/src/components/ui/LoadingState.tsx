type LoadingStateProps = {
  label?: string
  /**
   * Compact variant for inline contexts (e.g. table headers). Defaults to the
   * standard padded box.
   */
  compact?: boolean
}

export function LoadingState({
  compact = false,
  label = 'Loading',
}: LoadingStateProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <Spinner />
        <span>{label}</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-stone-200/70 bg-white/60 px-6 py-12 text-sm font-medium text-slate-600">
      <Spinner large />
      <span>{label}</span>
    </div>
  )
}

function Spinner({ large = false }: { large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        large
          ? 'h-7 w-7 animate-spin rounded-full border-[3px] border-stone-200 border-t-emerald-700'
          : 'h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-emerald-700'
      }
    />
  )
}
