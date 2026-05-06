import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useProjects(userId) {
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    // owned projects
    const { data: owned } = await supabase
      .from('projects').select('*').eq('owner_id', userId)
    // member projects
    const { data: memberships } = await supabase
      .from('project_members').select('project_id').eq('user_id', userId).eq('status', 'active')
    const memberIds = (memberships || []).map(m => m.project_id)
    let memberProjects = []
    if (memberIds.length > 0) {
      const { data } = await supabase.from('projects').select('*').in('id', memberIds)
      memberProjects = data || []
    }
    // merge, dedupe
    const all = [...(owned || []), ...memberProjects]
    const unique = all.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
    setProjects(unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const createProject = async ({ name, description, color }) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, description, color, owner_id: userId })
      .select().single()
    if (error) throw error
    setProjects(prev => [data, ...prev])
    return data
  }

  const updateProject = async (id, updates) => {
    const { data, error } = await supabase
      .from('projects').update(updates).eq('id', id).select().single()
    if (error) throw error
    setProjects(prev => prev.map(p => p.id === id ? data : p))
    return data
  }

  const deleteProject = async (id) => {
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  return { projects, loading, createProject, updateProject, deleteProject, refetch: fetch }
}

export function useMembers(projectId) {
  const [members, setMembers]   = useState([])
  const [loading, setLoading]   = useState(true)

  const fetch = useCallback(async () => {
    if (!projectId) { setMembers([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('project_members').select('*').eq('project_id', projectId)
      .order('invited_at', { ascending: true })
    setMembers(data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  const inviteMember = async (email) => {
    const trimmed = email.trim().toLowerCase()
    // check duplicate
    const exists = members.find(m => m.email === trimmed)
    if (exists) throw new Error('Email sudah diundang')

    const { data, error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, email: trimmed, role: 'member', status: 'pending' })
      .select().single()
    if (error) throw error
    setMembers(prev => [...prev, data])
    return data
  }

  const removeMember = async (memberId) => {
    await supabase.from('project_members').delete().eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  return { members, loading, inviteMember, removeMember, refetch: fetch }
}
