import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTasks(userId) {
  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
    setTasks(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const addTask = async (payload) => {
    const maxPos = tasks.filter(t => t.status === payload.status).length
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...payload, user_id: userId, position: maxPos })
      .select()
      .single()
    if (error) throw error
    setTasks(prev => [...prev, data])
    await logActivity(data.id, userId, 'created', { title: data.title })
    return data
  }

  const updateTask = async (id, updates, logMeta = null) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setTasks(prev => prev.map(t => t.id === id ? data : t))
    if (logMeta) await logActivity(id, userId, logMeta.action, logMeta.meta)
    return data
  }

  const deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  // moveTask: reorder within same column, no log needed
  const moveTask = async (id, newStatus, newPosition) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, position: newPosition } : t))
    await supabase.from('tasks').update({ status: newStatus, position: newPosition }).eq('id', id)
  }

  // moveTaskWithReason: cross-column move after user confirms reason
  const moveTaskWithReason = async (id, newStatus, newPosition, reason) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const oldStatus = task.status
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, position: newPosition } : t))
    await supabase.from('tasks').update({ status: newStatus, position: newPosition }).eq('id', id)
    const labels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }
    await logActivity(id, userId, 'moved', { from: labels[oldStatus], to: labels[newStatus], reason })
  }

  const addNote = async (taskId, note) => {
    await logActivity(taskId, userId, 'note', { text: note })
  }

  return { tasks, loading, addTask, updateTask, deleteTask, moveTask, moveTaskWithReason, addNote, refetch: fetchTasks }
}

export async function logActivity(taskId, userId, action, meta = {}) {
  await supabase.from('task_activities').insert({ task_id: taskId, user_id: userId, action, meta })
}

export async function fetchActivities(taskId) {
  const { data } = await supabase
    .from('task_activities')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  return data || []
}
