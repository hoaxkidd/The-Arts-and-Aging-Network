import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

type TabNavigationProps = {
  tabs: { id: string; label: string; icon?: React.ElementType; count?: number }[]
  activeTab: string
  onChange: (id: string) => void
}

export function TabNavigation({ tabs, activeTab, onChange }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200 mb-4 sm:mb-6 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto overscroll-x-contain">
      <nav className="-mb-px flex gap-4 sm:gap-8 min-w-max" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors min-h-[44px] touch-manipulation",
                isActive
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 active:text-gray-900"
              )}
            >
              {Icon && <Icon className={cn("w-4 h-4", isActive ? "text-primary-500" : "text-gray-400")} />}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "ml-1.5 py-0.5 px-2 rounded-full text-xs",
                  isActive ? "bg-primary-100 text-primary-600" : "bg-gray-100 text-gray-600"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
