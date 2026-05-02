import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSteps(taskId) {
  const [steps, setSteps]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!taskId) { setSteps([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('task_steps')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true })
    setSteps(data || [])
    setLoading(false)
  }, [taskId])

  useEffect(() => { fetch() }, [fetch])

  const addStep = async (userId, title, picEmail = '') => {
    const position = steps.length
    const { data, error } = await supabase
      .from('task_steps')
      .insert({ task_id: taskId, user_id: userId, title: title.trim(), pic_email: picEmail.trim(), position })
      .select().single()
    if (error) throw error
    setSteps(prev => [...prev, data])
    return data
  }

  const updateStep = async (id, updates) => {
    const { data, error } = await supabase
      .from('task_steps')
      .update(updates)
      .eq('id', id)
      .select().single()
    if (error) throw error
    setSteps(prev => prev.map(s => s.id === id ? data : s))
    return data
  }

  const deleteStep = async (id) => {
    await supabase.from('task_steps').delete().eq('id', id)
    setSteps(prev => {
      const filtered = prev.filter(s => s.id !== id)
      // reorder positions
      filtered.forEach((s, i) => {
        if (s.position !== i) {
          supabase.from('task_steps').update({ position: i }).eq('id', s.id)
        }
      })
      return filtered.map((s, i) => ({ ...s, position: i }))
    })
  }

  const reorderSteps = async (fromIdx, toIdx) => {
    const reordered = [...steps]
    const [moved]   = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const updated   = reordered.map((s, i) => ({ ...s, position: i }))
    setSteps(updated)
    await Promise.all(updated.map(s =>
      supabase.from('task_steps').update({ position: s.position }).eq('id', s.id)
    ))
  }

  const cycleStatus = async (id) => {
    const step    = steps.find(s => s.id === id)
    if (!step) return
    const next    = { todo: 'inprogress', inprogress: 'done', done: 'todo' }[step.status]
    await updateStep(id, { status: next })
  }

  return { steps, loading, addStep, updateStep, deleteStep, reorderSteps, cycleStatus, refetch: fetch }
}
