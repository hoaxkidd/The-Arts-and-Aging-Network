'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  disconnectGoogleFormsConnection,
  getGoogleFormsConnectionStatus,
  importGoogleFormsBulk,
  listGoogleFormsForImport,
  previewGoogleFormsImport,
} from '@/app/actions/google-forms-import'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import type { FormTemplateField } from '@/lib/form-template-types'
import { RefreshCw, Link2, Unlink, Download, Search, AlertCircle, CheckCircle2 } from 'lucide-react'

type FormItem = {
  id: string
  title: string
  modifiedTime: string | null
  webViewLink: string | null
}

const CATEGORIES = [
  { value: 'EVENT_SIGNUP', label: 'Booking sign-up' },
  { value: 'INCIDENT', label: 'Incident Reports' },
  { value: 'FEEDBACK', label: 'Feedback Forms' },
  { value: 'EVALUATION', label: 'Evaluations' },
  { value: 'ADMINISTRATIVE', label: 'Administrative' },
  { value: 'HEALTH_SAFETY', label: 'Health & Safety' },
  { value: 'OTHER', label: 'Other' },
]

export function GoogleFormsImportPanel() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState(false)
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [forms, setForms] = useState<FormItem[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Array<{
    formId: string
    title: string
    description: string
    fieldCount: number
    warnings: string[]
    fields: FormTemplateField[]
  }>>([])
  const [result, setResult] = useState<{
    imported: number
    skipped: number
    failed: number
    results: Array<{
      formId: string
      title: string
      status: 'imported' | 'skipped' | 'failed'
      message?: string
      templateId?: string
      warningCount?: number
    }>
  } | null>(null)

  const filteredForms = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return forms
    return forms.filter((form) => form.title.toLowerCase().includes(q))
  }, [forms, search])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const loadStatus = useCallback(async () => {
    const status = await getGoogleFormsConnectionStatus()
    if (!status.success) {
      setConnected(false)
      setAccountEmail(null)
      if (status.error) setError(status.error)
      return
    }
    setConnected(status.connected)
    setAccountEmail(status.email)
  }, [])

  const loadForms = useCallback(async () => {
    if (!connected) return
    setLoading(true)
    setError(null)
    const response = await listGoogleFormsForImport('')
    if (!response.success) {
      setForms([])
      setError(response.error || 'Failed to load Google Forms')
    } else {
      setForms(response.forms)
    }
    setLoading(false)
  }, [connected])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    const oauthError = searchParams.get('googleFormsError')
    if (oauthError) {
      setError(oauthError)
    }
  }, [searchParams])

  useEffect(() => {
    if (connected) {
      void loadForms()
    }
  }, [connected, loadForms])

  useEffect(() => {
    setPreview([])
  }, [selected])

  function toggleForm(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  function toggleSelectVisible() {
    const ids = filteredForms.map((form) => form.id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedSet.has(id))
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !ids.includes(id)))
      return
    }
    setSelected((prev) => Array.from(new Set([...prev, ...ids])))
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    setError(null)
    const response = await disconnectGoogleFormsConnection()
    if (!response.success) {
      setError(response.error || 'Failed to disconnect Google account')
    } else {
      setConnected(false)
      setAccountEmail(null)
      setForms([])
      setSelected([])
      setPreview([])
      setResult(null)
    }
    setDisconnecting(false)
  }

  async function handlePreview() {
    if (selected.length === 0) return
    setPreviewing(true)
    setError(null)
    const response = await previewGoogleFormsImport(selected)
    if (!response.success) {
      setError(response.error || 'Failed to preview selected forms')
      setPreview([])
    } else {
      setPreview(response.previews)
    }
    setPreviewing(false)
  }

  async function handleImport() {
    if (selected.length === 0) return
    setImporting(true)
    setError(null)
    const response = await importGoogleFormsBulk({
      formIds: selected,
      category,
      isPublic,
      allowedRoles: [],
    })

    if (!response.success) {
      setError(response.error || 'Import failed')
      setImporting(false)
      return
    }

    setResult({
      imported: response.imported ?? 0,
      skipped: response.skipped ?? 0,
      failed: response.failed ?? 0,
      results: response.results ?? [],
    })

    await loadForms()
    setImporting(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Google Forms Import</h2>
            <p className="text-sm text-gray-600 mt-1">
              Connect your Google account and import forms directly into the current template builder format.
            </p>
          </div>
          {!connected ? (
            <a
              href="/api/integrations/google/forms/connect"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              <Link2 className="w-4 h-4" /> Connect Google
            </a>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              <Unlink className="w-4 h-4" /> {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}
        </div>

        {connected && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
            Connected{accountEmail ? ` as ${accountEmail}` : ''}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {connected && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search forms"
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={() => void loadForms()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" /> {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={toggleSelectVisible}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Select visible
              </button>
            </div>

            <div className="max-h-[360px] overflow-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Pick</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Title</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredForms.map((form) => (
                    <tr key={form.id}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(form.id)}
                          onChange={() => toggleForm(form.id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        <div className="font-medium">{form.title}</div>
                        <div className="text-xs text-gray-500">{form.id}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {form.modifiedTime ? new Date(form.modifiedTime).toLocaleString() : 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredForms.length === 0 && !loading && (
                <div className="p-4 text-sm text-gray-500">No Google Forms found.</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Imported category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Visibility</label>
                <select
                  value={isPublic ? 'public' : 'private'}
                  onChange={(e) => setIsPublic(e.target.value === 'public')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handlePreview}
                  disabled={previewing || selected.length === 0}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {previewing ? 'Previewing...' : `Preview (${selected.length})`}
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || selected.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> {importing ? 'Importing...' : `Import Selected (${selected.length})`}
                </button>
              </div>
            </div>
          </div>

          {preview.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Import Preview</h3>
              <div className="space-y-3">
                {preview.map((form) => (
                  <div key={form.formId} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="font-medium text-gray-900">{form.title}</div>
                    <div className="text-xs text-gray-500">{form.fieldCount} compatible fields</div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      <FormTemplateView
                        title={form.title}
                        description={form.description}
                        fields={form.fields}
                        preview={true}
                      />
                    </div>
                    {form.fieldCount === 0 && (
                      <div className="text-xs text-gray-500">No compatible fields found in this form.</div>
                    )}
                    {form.warnings.length > 0 && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                        {form.warnings.slice(0, 3).join(' ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Import Results</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                  <div className="text-xl font-semibold text-green-700">{result.imported}</div>
                  <div className="text-xs text-green-700">Imported</div>
                </div>
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-center">
                  <div className="text-xl font-semibold text-yellow-700">{result.skipped}</div>
                  <div className="text-xs text-yellow-700">Skipped</div>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
                  <div className="text-xl font-semibold text-red-700">{result.failed}</div>
                  <div className="text-xs text-red-700">Failed</div>
                </div>
              </div>

              <div className="space-y-2">
                {result.results.map((row) => (
                  <div key={`${row.formId}-${row.status}`} className="flex items-start gap-2 text-sm">
                    {row.status === 'imported' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                    )}
                    <div>
                      <div className="text-gray-900">{row.title}</div>
                      <div className="text-xs text-gray-600">
                        {row.status.toUpperCase()}
                        {row.message ? ` - ${row.message}` : ''}
                        {typeof row.warningCount === 'number' ? ` - ${row.warningCount} warning(s)` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
