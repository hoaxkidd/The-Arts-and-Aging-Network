'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, X } from 'lucide-react'
import { FormPreviewButton } from '@/components/forms/FormPreviewButton'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

type DashboardProgram = {
  id: string
  title: string
  description?: string | null
  descriptionHtml?: string | null
  formFields?: string | null
}

export function DashboardProgramBrowser({ forms }: { forms: DashboardProgram[] }) {
  const [query, setQuery] = useState('')

  const filteredForms = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return forms

    return forms.filter((form) => {
      const title = (form.title || '').toLowerCase()
      const description = (form.description || '').toLowerCase()
      return title.includes(normalized) || description.includes(normalized)
    })
  }, [forms, query])

  return (
    <section className="space-y-4">
      <div className="sticky top-0 z-20 -mx-1 border-b border-gray-200 bg-gray-50/95 px-1 py-2 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search programs"
            className={cn(STYLES.input, 'pl-9 pr-10 bg-white')}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-gray-900">No booking programs are available right now.</p>
          <p className="text-xs text-gray-500 mt-1">Please contact the office if you expected booking forms to appear.</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-gray-900">No programs match your search.</p>
          <p className="text-xs text-gray-500 mt-1">Try a different keyword or clear the search field.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredForms.map((form) => (
            <article key={form.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">{form.title}</h3>
              <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                {form.description?.trim() || 'Fill this booking form and select your preferred dates.'}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <FormPreviewButton
                  template={{
                    title: form.title,
                    description: form.description,
                    descriptionHtml: form.descriptionHtml,
                    formFields: form.formFields,
                  }}
                />
                <Link
                  href={`/dashboard/requests/new?formTemplateId=${form.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                >
                  Book This Program
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
