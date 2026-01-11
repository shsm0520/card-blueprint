'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import TokenDisplay from './TokenDisplay'

export default function CreateTreeForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdTree, setCreatedTree] = useState<{
    id: string
    editToken: string
    title: string
  } | null>(null)

  // Form state
  const [useTemplate, setUseTemplate] = useState<string>('')
  const [title, setTitle] = useState('My Card Strategy')
  const [ssnStatus, setSsnStatus] = useState<string>('')
  const [goal, setGoal] = useState<string>('')
  const [chase524Status, setChase524Status] = useState<string>('')
  const [creditProfile, setCreditProfile] = useState<string>('')
  const [note, setNote] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate password
    if (password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }
    if (password.length > 50) {
      setError('Password must be less than 50 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/card/api/trees/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          ssnStatus,
          useTemplate: useTemplate === 'yes',
          goal: useTemplate === 'yes' ? goal : undefined,
          chase524Status: useTemplate === 'yes' ? chase524Status : undefined,
          creditProfile: useTemplate === 'yes' ? creditProfile : undefined,
          note,
          password,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create tree')
      }

      // Save password to localStorage for this tree
      localStorage.setItem(`tree_token_${data.data.id}`, password)

      // Show success screen
      setCreatedTree({
        id: data.data.id,
        editToken: password, // Pass password as editToken for compatibility
        title: data.data.title,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  // If tree was created, show token display
  if (createdTree) {
    return <TokenDisplay tree={createdTree} />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Use Template */}
      <div className="space-y-2">
        <Label htmlFor="useTemplate">Start with Template? *</Label>
        <Select value={useTemplate} onValueChange={setUseTemplate} required>
          <SelectTrigger id="useTemplate">
            <SelectValue placeholder="Choose an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes - Generate recommended cards based on my profile</SelectItem>
            <SelectItem value="no">No - Start with an empty tree</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Templates provide personalized card recommendations
        </p>
      </div>

      {/* SSN/ITIN Status */}
      <div className="space-y-2">
        <Label htmlFor="ssnStatus">SSN/ITIN Status *</Label>
        <Select value={ssnStatus} onValueChange={setSsnStatus} required>
          <SelectTrigger id="ssnStatus">
            <SelectValue placeholder="Select your status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ssn">I have a Social Security Number (SSN)</SelectItem>
            <SelectItem value="itin">I have an Individual Taxpayer Identification Number (ITIN)</SelectItem>
            <SelectItem value="none">I don't have SSN or ITIN</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Some cards require SSN for approval
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Tree Title</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., My 2026 Card Strategy"
          maxLength={100}
          required
        />
        <p className="text-xs text-gray-500">
          Give your strategy a memorable name
        </p>
      </div>

      {/* Template Options - Only show if template is selected */}
      {useTemplate === 'yes' && (
        <>
          {/* Goal */}
      <div className="space-y-2">
        <Label htmlFor="goal">Primary Goal *</Label>
        <Select value={goal} onValueChange={setGoal} required>
          <SelectTrigger id="goal">
            <SelectValue placeholder="Select your goal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cashback">Cashback</SelectItem>
            <SelectItem value="airline">Airline Miles</SelectItem>
            <SelectItem value="hotel">Hotel Points</SelectItem>
            <SelectItem value="status">Hotel Lifetime Status</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          What do you want to optimize for?
        </p>
      </div>

      {/* Chase 5/24 Status */}
      <div className="space-y-2">
        <Label htmlFor="chase524">Chase 5/24 Status *</Label>
        <Select value={chase524Status} onValueChange={setChase524Status} required>
          <SelectTrigger id="chase524">
            <SelectValue placeholder="Select your 5/24 status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="under">Under 5/24</SelectItem>
            <SelectItem value="over">Over/At 5/24</SelectItem>
            <SelectItem value="unknown">Unknown/Not Sure</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Number of new credit cards in the last 24 months
        </p>
      </div>

      {/* Credit Profile */}
      <div className="space-y-2">
        <Label htmlFor="creditProfile">Credit History *</Label>
        <Select value={creditProfile} onValueChange={setCreditProfile} required>
          <SelectTrigger id="creditProfile">
            <SelectValue placeholder="Select your credit history" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thin">
              No/Thin File (0-12 months)
            </SelectItem>
            <SelectItem value="1to3">1-3 Years</SelectItem>
            <SelectItem value="3plus">3+ Years</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          How long have you had credit accounts?
        </p>
      </div>
        </>
      )}

      {/* Note (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="note">Notes (Optional)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any additional context or goals for your strategy..."
          maxLength={1000}
          rows={4}
        />
        <p className="text-xs text-gray-500">
          {note.length}/1000 characters
        </p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Edit Password *</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password to edit your tree"
          minLength={4}
          maxLength={50}
          required
        />
        <p className="text-xs text-gray-500">
          4-50 characters. You'll need this to edit your tree later.
        </p>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          minLength={4}
          maxLength={50}
          required
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={
          isLoading ||
          !useTemplate ||
          !ssnStatus ||
          !password ||
          !confirmPassword ||
          (useTemplate === 'yes' && (!goal || !chase524Status || !creditProfile))
        }
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Your Tree...
          </>
        ) : (
          'Create Strategy Tree'
        )}
      </Button>

      <p className="text-xs text-center text-gray-500">
        Your tree will be created instantly. You'll receive a unique link to
        view and edit it.
      </p>
    </form>
  )
}
