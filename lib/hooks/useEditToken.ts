'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to manage edit token from localStorage
 * Returns the edit token for a given tree ID
 */
export function useEditToken(treeId: string) {
  const [editToken, setEditToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get token from localStorage
    try {
      const token = localStorage.getItem(`tree_token_${treeId}`)
      setEditToken(token)
    } catch (error) {
      console.error('Failed to get token from localStorage:', error)
      setEditToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [treeId])

  const saveToken = (token: string) => {
    try {
      localStorage.setItem(`tree_token_${treeId}`, token)
      setEditToken(token)
    } catch (error) {
      console.error('Failed to save token to localStorage:', error)
    }
  }

  const clearToken = () => {
    try {
      localStorage.removeItem(`tree_token_${treeId}`)
      setEditToken(null)
    } catch (error) {
      console.error('Failed to remove token from localStorage:', error)
    }
  }

  return {
    editToken,
    hasEditToken: !!editToken,
    isLoading,
    saveToken,
    clearToken,
  }
}
