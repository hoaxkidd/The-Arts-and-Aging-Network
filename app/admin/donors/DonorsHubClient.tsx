'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Heart,
  Search,
  DollarSign,
  History,
  Receipt,
  Calendar,
  X,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { createDonor, deleteDonor, recordDonation, updateDonor } from '@/app/actions/donors'

type DonationRow = {
  id: string
  amount: number
  currency: string
  type: string
  method: string | null
  campaign: string | null
  programType: string | null
  receiptNumber: string | null
  receiptIssued: boolean
  donationDate: string
  notes: string | null
}

type DonorRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address?: string | null
  type: string
  tier: string
  status: string
  isRecurring: boolean
  notes?: string | null
  totalDonated: number
  donationCount: number
  firstDonation: string | null
  lastDonation: string | null
  donations: DonationRow[]
}

type Props = {
  donors: DonorRow[]
}

const TIER_STYLES: Record<string, string> = {
  CHAMPION: 'bg-purple-100 text-purple-700',
  BENEFACTOR: 'bg-blue-100 text-blue-700',
  PATRON: 'bg-green-100 text-green-700',
  SUPPORTER: 'bg-gray-100 text-gray-700',
}

export function DonorsHubClient({ donors: initialDonors }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [donationHistoryDonor, setDonationHistoryDonor] = useState<DonorRow | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDonor, setEditingDonor] = useState<DonorRow | null>(null)
  const [donationDonor, setDonationDonor] = useState<DonorRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const tiers = ['ALL', ...Array.from(new Set(initialDonors.map((d) => d.tier)))]
  const statuses = ['ALL', ...Array.from(new Set(initialDonors.map((d) => d.status)))]

  const filtered = initialDonors.filter((d) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      (d.email && d.email.toLowerCase().includes(q))
    const matchTier = tierFilter === 'ALL' || d.tier === tierFilter
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter
    return matchSearch && matchTier && matchStatus
  })

  const totalRaised = initialDonors.reduce((sum, d) => sum + d.totalDonated, 0)

  const handleDeleteDonor = (donor: DonorRow) => {
    if (!confirm(`Delete donor "${donor.name}" and all donation history?`)) return
    startTransition(async () => {
      const result = await deleteDonor(donor.id)
      if (result?.error) {
        alert(result.error)
        return
      }
      router.refresh()
    })
  }

  const latestDonation = (d: DonorRow) => d.donations[0] ?? null
  const latestMethod = (d: DonorRow) => latestDonation(d)?.method ?? '—'
  const latestCampaign = (d: DonorRow) => {
    const lat = latestDonation(d)
    if (!lat) return '—'
    return lat.campaign || lat.programType || '—'
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex gap-4 py-3 text-sm">
        <span className="text-gray-500">
          <strong className="text-gray-900">{initialDonors.length}</strong> donors
        </span>
        <span className="text-gray-500">
          Total raised <strong className="text-gray-900">${totalRaised.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</strong>
        </span>
        <span className="text-gray-500">
          <strong className="text-gray-900">{initialDonors.filter((d) => d.isRecurring).length}</strong> recurring
        </span>
      </div>

      <div className="flex-shrink-0 flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500"
        >
          {tiers.map((t) => (
            <option key={t} value={t}>{t === 'ALL' ? 'All tiers' : t}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" /> Add donor
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="table-scroll-wrapper h-full max-h-[calc(100vh-320px)]">
        <table className={STYLES.table}>
          <thead className="bg-gray-50">
            <tr>
              <th className={STYLES.tableHeader}>Donor / Organization</th>
              <th className={STYLES.tableHeader}>Type</th>
              <th className={STYLES.tableHeader}>Tier</th>
              <th className={STYLES.tableHeader}>Payment method</th>
              <th className={STYLES.tableHeader}>Campaign / Event</th>
              <th className={cn(STYLES.tableHeader, "text-right")}>Total donated</th>
              <th className={cn(STYLES.tableHeader, "text-center")}>Donations</th>
              <th className={STYLES.tableHeader}>Last donation</th>
              <th className={STYLES.tableHeader}>Status</th>
              <th className={cn(STYLES.tableHeader, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className={cn(STYLES.tableCell, "text-center py-12")}>
                  {initialDonors.length === 0 ? 'No donors yet.' : 'No donors match your filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((donor) => (
                <tr key={donor.id} className={STYLES.tableRow}>
                  <td className={STYLES.tableCell}>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{donor.name}</p>
                        {donor.email && (
                          <p className="text-xs text-gray-500">{donor.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={STYLES.tableCell}>{donor.type}</td>
                  <td className={STYLES.tableCell}>
                    <span className={cn('text-xs px-2 py-1 rounded font-medium', TIER_STYLES[donor.tier] || 'bg-gray-100 text-gray-700')}>
                      {donor.tier}
                    </span>
                  </td>
                  <td className={STYLES.tableCell}>{latestMethod(donor)}</td>
                  <td className={STYLES.tableCell}>{latestCampaign(donor)}</td>
                  <td className={cn(STYLES.tableCell, "text-right")}>
                    <button
                      type="button"
                      onClick={() => setDonationHistoryDonor(donor)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"
                    >
                      ${donor.totalDonated.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      <History className="w-4 h-4" aria-hidden />
                    </button>
                  </td>
                  <td className={cn(STYLES.tableCell, "text-center")}>{donor.donationCount}</td>
                  <td className={STYLES.tableCell}>
                    {donor.lastDonation
                      ? new Date(donor.lastDonation).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className={STYLES.tableCell}>
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded',
                        donor.status === 'ACTIVE' && 'bg-green-100 text-green-700',
                        donor.status === 'INACTIVE' && 'bg-gray-100 text-gray-600',
                        donor.status === 'LAPSED' && 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {donor.status}
                    </span>
                  </td>
                  <td className={cn(STYLES.tableCell, "text-right")}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setDonationDonor(donor)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        title="Record donation"
                        disabled={isPending}
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDonor(donor)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                        title="Edit donor"
                        disabled={isPending}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDonor(donor)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete donor"
                        disabled={isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showAddModal && (
        <DonorModal
          mode="create"
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            router.refresh()
          }}
        />
      )}

      {editingDonor && (
        <DonorModal
          mode="edit"
          donor={editingDonor}
          onClose={() => setEditingDonor(null)}
          onSuccess={() => {
            setEditingDonor(null)
            router.refresh()
          }}
        />
      )}

      {donationDonor && (
        <RecordDonationModal
          donor={donationDonor}
          onClose={() => setDonationDonor(null)}
          onSuccess={() => {
            setDonationDonor(null)
            router.refresh()
          }}
        />
      )}

      {donationHistoryDonor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDonationHistoryDonor(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Donation history</h2>
                <p className="text-sm text-gray-500">{donationHistoryDonor.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setDonationHistoryDonor(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total donated</span>
                <span className="text-lg font-bold text-gray-900">
                  ${donationHistoryDonor.totalDonated.toLocaleString('en-CA', { minimumFractionDigits: 2 })} ({donationHistoryDonor.donationCount} donation{donationHistoryDonor.donationCount !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="space-y-3">
                {donationHistoryDonor.donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="border border-gray-200 rounded-lg p-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-gray-900">
                        ${donation.amount.toLocaleString('en-CA', { minimumFractionDigits: 2 })} {donation.currency}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(donation.donationDate).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    {donation.method && (
                      <span className="text-gray-600">Method: {donation.method}</span>
                    )}
                    {(donation.campaign || donation.programType) && (
                      <span className="text-gray-600">
                        Campaign: {donation.campaign || donation.programType}
                      </span>
                    )}
                    {donation.receiptNumber && (
                      <span className="flex items-center gap-1 text-gray-600">
                        <Receipt className="w-4 h-4" /> Receipt #{donation.receiptNumber}
                        {donation.receiptIssued && <span className="text-green-600 text-xs">(issued)</span>}
                      </span>
                    )}
                    {donation.notes && (
                      <p className="w-full text-xs text-gray-500 mt-1">{donation.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DonorModal({
  mode,
  donor,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit'
  donor?: DonorRow
  onClose: () => void
  onSuccess: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const payload = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim() || undefined,
      phone: String(formData.get('phone') || '').trim() || undefined,
      address: String(formData.get('address') || '').trim() || undefined,
      type: String(formData.get('type') || 'INDIVIDUAL').trim(),
      tier: String(formData.get('tier') || 'SUPPORTER').trim(),
      status: String(formData.get('status') || 'ACTIVE').trim(),
      isRecurring: formData.get('isRecurring') === 'on',
      notes: String(formData.get('notes') || '').trim() || undefined,
    }

    if (!payload.name) {
      setError('Name is required')
      return
    }

    startTransition(async () => {
      const result = mode === 'create'
        ? await createDonor(payload)
        : await updateDonor(donor!.id, payload)

      if (result?.error) {
        setError(result.error)
        return
      }
      onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{mode === 'create' ? 'Add donor' : 'Edit donor'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3 overflow-y-auto">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
          <input name="name" defaultValue={donor?.name || ''} placeholder="Name *" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
          <div className="grid grid-cols-2 gap-3">
            <input name="email" defaultValue={donor?.email || ''} placeholder="Email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input name="phone" defaultValue={donor?.phone || ''} placeholder="Phone" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <input name="address" defaultValue={donor?.address || ''} placeholder="Address" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-3">
            <select name="type" defaultValue={donor?.type || 'INDIVIDUAL'} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="INDIVIDUAL">Individual</option>
              <option value="ORGANIZATION">Organization</option>
              <option value="FOUNDATION">Foundation</option>
            </select>
            <select name="tier" defaultValue={donor?.tier || 'SUPPORTER'} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="SUPPORTER">Supporter</option>
              <option value="PATRON">Patron</option>
              <option value="BENEFACTOR">Benefactor</option>
              <option value="CHAMPION">Champion</option>
            </select>
            <select name="status" defaultValue={donor?.status || 'ACTIVE'} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="LAPSED">Lapsed</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="isRecurring" defaultChecked={donor?.isRecurring || false} className="rounded border-gray-300" />
            Recurring donor
          </label>
          <textarea name="notes" defaultValue={donor?.notes || ''} rows={3} placeholder="Notes" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'create' ? 'Create donor' : 'Save donor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RecordDonationModal({ donor, onClose, onSuccess }: { donor: DonorRow; onClose: () => void; onSuccess: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const amount = Number.parseFloat(String(formData.get('amount') || '0'))

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid donation amount')
      return
    }

    startTransition(async () => {
      const result = await recordDonation({
        donorId: donor.id,
        amount,
        type: String(formData.get('type') || 'MONETARY'),
        method: String(formData.get('method') || '').trim() || undefined,
        campaign: String(formData.get('campaign') || '').trim() || undefined,
        notes: String(formData.get('notes') || '').trim() || undefined,
      })
      if (result?.error) {
        setError(result.error)
        return
      }
      onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Record donation</h2>
          <p className="text-sm text-gray-500">{donor.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
          <input name="amount" type="number" step="0.01" min="0" placeholder="Amount" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
          <div className="grid grid-cols-2 gap-3">
            <select name="type" defaultValue="MONETARY" className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="MONETARY">Monetary</option>
              <option value="IN_KIND">In kind</option>
            </select>
            <input name="method" placeholder="Method" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <input name="campaign" placeholder="Campaign / Program" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <textarea name="notes" rows={3} placeholder="Notes" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save donation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
