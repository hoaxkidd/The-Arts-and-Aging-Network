'use client'

import { useState } from 'react'
import {
  Heart,
  Search,
  DollarSign,
  History,
  Receipt,
  Calendar,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  type: string
  tier: string
  status: string
  isRecurring: boolean
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
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [donationHistoryDonor, setDonationHistoryDonor] = useState<DonorRow | null>(null)

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
      </div>

      <div className="flex-1 min-h-0 overflow-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Donor / Organization</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tier</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Payment method</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Campaign / Event</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total donated</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Donations</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last donation</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">
                  {initialDonors.length === 0 ? 'No donors yet.' : 'No donors match your filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((donor) => (
                <tr key={donor.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-sm text-gray-600">{donor.type}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded font-medium', TIER_STYLES[donor.tier] || 'bg-gray-100 text-gray-700')}>
                      {donor.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{latestMethod(donor)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{latestCampaign(donor)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDonationHistoryDonor(donor)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"
                    >
                      ${donor.totalDonated.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      <History className="w-4 h-4" aria-hidden />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">{donor.donationCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {donor.lastDonation
                      ? new Date(donor.lastDonation).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
                      {new Date(donation.donationDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
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
