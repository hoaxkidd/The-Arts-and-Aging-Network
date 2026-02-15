'use client'

import { FileText, Trash2, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { uploadDocument, deleteDocument } from '@/app/actions/staff'
import { useState } from 'react'

type Document = {
  id: string
  name: string
  url: string
  type: string
  verified: boolean
  createdAt: Date
}

export function DocumentManager({ documents }: { documents: Document[] }) {
  const [isUploading, setIsUploading] = useState(false)

  async function handleUpload(formData: FormData) {
    setIsUploading(true)
    await uploadDocument(formData)
    setIsUploading(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">My Documents</h3>
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
            {documents.filter(d => d.verified).length} Verified
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Upload Area */}
        <form action={handleUpload} className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
            <input type="file" name="file" id="file-upload" className="hidden" onChange={(e) => {
                if (e.target.files?.length) {
                    // Auto-submit or show selected
                    const form = e.target.closest('form')
                    if (form) form.requestSubmit()
                }
            }} />
            <input type="hidden" name="type" value="GENERAL" />
            <input type="hidden" name="name" value="Uploaded Document" />
            
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                    {isUploading ? 'Uploading...' : 'Click to upload a document'}
                </span>
                <span className="text-xs text-gray-500">PDF, JPG, PNG up to 10MB</span>
            </label>
        </form>

        {/* Document List */}
        <div className="space-y-3">
            {documents.length > 0 ? (
                documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{doc.name}</p>
                                <p className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleDateString()} • {doc.type}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {doc.verified ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                                    <CheckCircle className="w-3 h-3" /> Verified
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                    <AlertCircle className="w-3 h-3" /> Pending
                                </span>
                            )}
                            
                            <button 
                                onClick={() => deleteDocument(doc.id)}
                                className="text-gray-400 hover:text-red-500 p-1"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-center text-sm text-gray-500 py-4">No documents uploaded yet.</p>
            )}
        </div>
      </div>
    </div>
  )
}
