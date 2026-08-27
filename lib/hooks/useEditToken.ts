'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to manage the edit password from localStorage.
 *
 * The legacy `tree_token_*` key and editToken return values are kept as
 * compatibility aliases so existing saved edit sessions and editor components
 * keep working while the UI uses password wording.
 */
export function useEditToken(treeId: string) {
  const [editPassword, setEditPassword] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Prefer the password key, then fall back to the legacy token key.
    try {
      const password =
        localStorage.getItem(`tree_edit_password_${treeId}`) ||
        localStorage.getItem(`tree_token_${treeId}`)
      setEditPassword(password)
    } catch (error) {
      console.error('Failed to get edit password from localStorage:', error)
      setEditPassword(null)
    } finally {
      setIsLoading(false)
    }
  }, [treeId])

  const savePassword = (password: string) => {
    try {
      localStorage.setItem(`tree_edit_password_${treeId}`, password)
      localStorage.setItem(`tree_token_${treeId}`, password)
      setEditPassword(password)
    } catch (error) {
      console.error('Failed to save edit password to localStorage:', error)
    }
  }

  const clearPassword = () => {
    try {
      localStorage.removeItem(`tree_edit_password_${treeId}`)
      localStorage.removeItem(`tree_token_${treeId}`)
      setEditPassword(null)
    } catch (error) {
      console.error('Failed to remove edit password from localStorage:', error)
    }
  }

  return {
    editPassword,
    hasEditPassword: !!editPassword,
    savePassword,
    clearPassword,

    // Backward-compatible aliases used by existing editor components.
    editToken: editPassword,
    hasEditToken: !!editPassword,
    isLoading,
    saveToken: savePassword,
    clearToken: clearPassword,
  }
}
