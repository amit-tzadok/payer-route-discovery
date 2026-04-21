'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  reconciledRoutes,
  routeData,
  PAYERS,
  getPayerDisplayName,
} from '@/lib/data'
import {
  loadCustomPayers, saveCustomPayer, deleteCustomPayer,
  loadDrugAdditions, saveDrugAddition,
  loadSourceAdditions, saveSourceAddition,
  type DrugAdditions, type SourceAdditions,
} from '@/lib/userdata'
import {
  loadTasks, saveTasks,
  type Task,
} from '@/lib/tasks'
import { reconcilePayer } from '@/lib/reconciler'
import { LanguageContext } from '@/lib/language-context'
import { LANGUAGES, type LanguageCode } from '@/lib/language'
import { getT } from '@/lib/i18n'
import type { ReconciledField, ReconciledRoute } from '@/lib/types'
import PayerDrugSelector from '@/components/PayerDrugSelector'
import RoutePanel        from '@/components/RoutePanel'
import AddPayerModal     from '@/components/AddPayerModal'
import AddDrugModal      from '@/components/AddDrugModal'
import AddSourceModal    from '@/components/AddSourceModal'
import ComparisonMode    from '@/components/ComparisonMode'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import EmptyState        from '@/components/EmptyState'
import SearchBar         from '@/components/SearchBar'
import Chatbot           from '@/components/Chatbot'
import PayerRiskChart    from '@/components/PayerRiskChart'
import Dashboard         from '@/components/Dashboard'
import TasksPanel        from '@/components/TasksPanel'
import AddTaskModal      from '@/components/AddTaskModal'

type View = 'dashboard' | 'detail'

const DEFAULT_PAYER = PAYERS[0]

export default function App() {
  const [view,          setView]         = useState<View>('dashboard')
  const mainRef = useRef<HTMLElement>(null)
  const [selectedPayer, setSelectedPayer] = useState<string>(DEFAULT_PAYER)
  const [selectedDrug,  setSelectedDrug]  = useState<string | null>(null)
  const [language,      setLanguage]      = useState<LanguageCode>('en')
  const [showAddPayer,   setShowAddPayer]   = useState(false)
  const [showAddDrug,    setShowAddDrug]    = useState(false)
  const [showAddSource,  setShowAddSource]  = useState(false)
  const [showAddTask,    setShowAddTask]    = useState(false)
  const [comparisonPayer, setComparisonPayer] = useState<string | null>(null)
  const [showRiskChart,   setShowRiskChart]   = useState(false)
  const [showTasksPanel,  setShowTasksPanel]  = useState(true)

  // User-managed data — persisted in localStorage
  const [customPayers,    setCustomPayers]    = useState<Record<string, ReconciledRoute>>(loadCustomPayers)
  const [drugAdditions,   setDrugAdditions]   = useState<DrugAdditions>(loadDrugAdditions)
  const [sourceAdditions, setSourceAdditions] = useState<SourceAdditions>(loadSourceAdditions)
  const [tasks,           setTasks]           = useState<Task[]>(loadTasks)

  // Merge static routes with user additions
  const allRoutes = useMemo<Record<string, ReconciledRoute>>(() => {
    const applyDrugAdditions = (route: ReconciledRoute, payerKey: string): ReconciledRoute => {
      const additions = drugAdditions[payerKey]
      if (!additions) return route
      return {
        ...route,
        drugFields:    { ...route.drugFields, ...additions },
        availableDrugs: [...new Set([...route.availableDrugs, ...Object.keys(additions)])].sort(),
      }
    }

    const result: Record<string, ReconciledRoute> = {}

    // Static payers — re-reconcile if extra sources were added
    for (const key of PAYERS) {
      const extra = sourceAdditions[key] ?? []
      let route: ReconciledRoute
      if (extra.length > 0) {
        const raw = routeData[key]
        route = reconcilePayer({ ...raw, sources: [...raw.sources, ...extra] }, key)
      } else {
        route = reconciledRoutes[key]
      }
      result[key] = applyDrugAdditions(route, key)
    }

    // Custom payers (stored as ReconciledRoute — drug additions only)
    for (const [key, route] of Object.entries(customPayers)) {
      result[key] = applyDrugAdditions(route, key)
    }

    return result
  }, [customPayers, drugAdditions, sourceAdditions])

  const allPayers = useMemo(
    () => [...PAYERS, ...Object.keys(customPayers).filter(k => !PAYERS.includes(k))],
    [customPayers],
  )

  const route = allRoutes[selectedPayer]
  const drugs = route?.availableDrugs ?? []

  // ── Callbacks ──────────────────────────────────────────────────────────────

  const handlePayerChange = (payer: string) => {
    setSelectedPayer(payer)
    setSelectedDrug(null)
    setView('detail')
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAddPayer = (newRoute: ReconciledRoute) => {
    saveCustomPayer(newRoute.payerKey, newRoute)
    setCustomPayers(prev => ({ ...prev, [newRoute.payerKey]: newRoute }))
    handlePayerChange(newRoute.payerKey)
    setShowAddPayer(false)
  }

  const handleDeletePayer = (payerKey: string) => {
    deleteCustomPayer(payerKey)
    setCustomPayers(prev => { const n = { ...prev }; delete n[payerKey]; return n })
    if (selectedPayer === payerKey) handlePayerChange(PAYERS[0])
  }

  const handleAddDrug = (payerKey: string, drugName: string, fields: Record<string, ReconciledField>) => {
    saveDrugAddition(payerKey, drugName, fields)
    setDrugAdditions(prev => ({
      ...prev,
      [payerKey]: { ...(prev[payerKey] ?? {}), [drugName]: fields },
    }))
    setSelectedDrug(drugName)
  }

  const handleAddSource = (source: import('@/lib/types').Source) => {
    saveSourceAddition(selectedPayer, source)
    setSourceAdditions(prev => ({
      ...prev,
      [selectedPayer]: [...(prev[selectedPayer] ?? []), source],
    }))
    setShowAddSource(false)
  }

  // ── Task callbacks ──────────────────────────────────────────────────────────

  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const task: Task = {
      ...taskData,
      id:        `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setTasks(prev => {
      const next = [task, ...prev]
      saveTasks(next)
      return next
    })
    setShowAddTask(false)
  }

  const handleTaskStatusChange = (taskId: string, status: Task['status']) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === taskId ? { ...t, status } : t)
      saveTasks(next)
      return next
    })
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== taskId)
      saveTasks(next)
      return next
    })
  }

  const isCustomPayer = (key: string) => key in customPayers

  // App owns the language state, so use getT() directly (not the hook)
  const t = getT(language)

  // Overdue task count for badge
  const overdueCount = tasks.filter(t => {
    if (t.status === 'done') return false
    const diff = Math.round((new Date(t.deadline + 'T00:00:00').setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86_400_000)
    return diff < 0
  }).length

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + M: Toggle comparison mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyM') {
        e.preventDefault()
        setComparisonPayer(prev => prev ? null : PAYERS[1] || PAYERS[0])
      }
      // Cmd/Ctrl + K: Focus search bar (detail view only)
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyK') {
        e.preventDefault()
        document.getElementById('payer-search')?.focus()
      }
      // Cmd/Ctrl + D: Toggle dashboard / detail
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyD') {
        e.preventDefault()
        setView(v => v === 'dashboard' ? 'detail' : 'dashboard')
        mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  return (
    <LanguageContext.Provider value={language}>
      <div className="flex flex-col h-screen overflow-hidden">

        {/* ── Top nav ──────────────────────────────────────────────── */}
        <header className="h-14 bg-white border-b border-ruma-border flex items-center px-5 shrink-0 z-10 gap-3">

          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img src="/logos/ruma-care.png" alt="Ruma Care" className="w-7 h-7 shrink-0" />
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-gray-900 tracking-tight">Ruma Care</p>
              <p className="text-[10px] text-gray-400 font-medium">{t.appSubtitle}</p>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="h-6 w-px bg-ruma-border shrink-0" />

          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-lg shrink-0">
            <button
              onClick={() => { setView('dashboard'); mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all
                ${view === 'dashboard'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="4" height="4" rx="0.75" fill="currentColor" opacity={view === 'dashboard' ? '1' : '0.5'}/>
                <rect x="7" y="1" width="4" height="4" rx="0.75" fill="currentColor" opacity={view === 'dashboard' ? '1' : '0.5'}/>
                <rect x="1" y="7" width="4" height="4" rx="0.75" fill="currentColor" opacity={view === 'dashboard' ? '1' : '0.5'}/>
                <rect x="7" y="7" width="4" height="4" rx="0.75" fill="currentColor" opacity={view === 'dashboard' ? '1' : '0.5'}/>
              </svg>
              Dashboard
            </button>
            <button
              onClick={() => { setView('detail'); mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all
                ${view === 'detail'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="3" height="10" rx="0.75" fill="currentColor" opacity={view === 'detail' ? '1' : '0.5'}/>
                <rect x="5" y="1" width="6" height="4" rx="0.75" fill="currentColor" opacity={view === 'detail' ? '1' : '0.5'}/>
                <rect x="5" y="7" width="6" height="4" rx="0.75" fill="currentColor" opacity={view === 'detail' ? '1' : '0.5'}/>
              </svg>
              Detail
            </button>
          </div>

          {/* Breadcrumb — detail view only */}
          {view === 'detail' && route && (
            <div className="flex items-center gap-1.5 min-w-0 text-[12px]">
              <span className="text-gray-600 font-medium truncate">{route.payer}</span>
              {selectedDrug && (
                <>
                  <svg className="w-3 h-3 text-gray-300 shrink-0" viewBox="0 0 12 12" fill="none">
                    <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-ruma-cyan-dark font-semibold truncate">{selectedDrug}</span>
                </>
              )}
            </div>
          )}

          {/* Right-side actions */}
          <div className="ml-auto flex items-center gap-2 shrink-0">

            {/* Compare toggle — detail view only */}
            {view === 'detail' && (
              <button
                onClick={() => setComparisonPayer(prev => prev ? null : PAYERS[1] || PAYERS[0])}
                title="Compare payers side by side"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
                  border transition-colors
                  ${comparisonPayer
                    ? 'bg-ruma-blue text-white border-ruma-blue shadow-sm'
                    : 'text-gray-600 border-ruma-border hover:bg-ruma-bg hover:border-gray-300'}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
                Compare
              </button>
            )}

            {/* Risk Overview toggle — detail view only */}
            {view === 'detail' && (
              <button
                onClick={() => setShowRiskChart(v => !v)}
                title="Toggle payer risk overview chart"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
                  border transition-colors
                  ${showRiskChart
                    ? 'bg-ruma-blue text-white border-ruma-blue shadow-sm'
                    : 'text-gray-600 border-ruma-border hover:bg-ruma-bg hover:border-gray-300'}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="9" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.6"/>
                  <rect x="6" y="5" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.8"/>
                  <rect x="11" y="1" width="3" height="14" rx="0.5" fill="currentColor"/>
                </svg>
                Risk Overview
              </button>
            )}

            {/* Tasks panel toggle */}
            <button
              onClick={() => setShowTasksPanel(v => !v)}
              title="Toggle priority board"
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
                border transition-colors
                ${showTasksPanel
                  ? 'bg-ruma-blue text-white border-ruma-blue shadow-sm'
                  : 'text-gray-600 border-ruma-border hover:bg-ruma-bg hover:border-gray-300'}`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Tasks
              {overdueCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {overdueCount > 9 ? '9+' : overdueCount}
                </span>
              )}
            </button>

            {/* Vertical divider */}
            <div className="h-5 w-px bg-ruma-border" />

            {/* Language selector */}
            <div className="relative">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as LanguageCode)}
                className="appearance-none pl-2.5 pr-7 py-1.5 rounded-lg border border-ruma-border bg-white
                  text-[12px] font-medium text-gray-600
                  focus:outline-none focus:ring-2 focus:ring-ruma-blue/20 focus:border-transparent
                  hover:border-gray-300 cursor-pointer transition-all"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label} · {l.full}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"
                viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

          </div>
        </header>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* ── Dashboard view ─────────────────────────────────────── */}
          {view === 'dashboard' && (
            <>
              <main ref={mainRef} className="flex-1 overflow-y-auto px-6 py-5">
                <Dashboard
                  payers={allPayers}
                  routes={allRoutes}
                  tasks={tasks}
                  onPayerSelect={handlePayerChange}
                />
              </main>
            </>
          )}

          {/* ── Detail view ────────────────────────────────────────── */}
          {view === 'detail' && (
            <>
              <aside className="w-72 bg-white border-r border-ruma-border shrink-0 overflow-y-auto flex flex-col">
                <div className="px-3 pt-3 pb-1 shrink-0">
                  <SearchBar
                    payers={allPayers}
                    drugs={drugs}
                    getPayerDisplayName={key => customPayers[key]?.payer ?? getPayerDisplayName(key)}
                    onPayerSelect={handlePayerChange}
                    onDrugSelect={setSelectedDrug}
                  />
                </div>
                <PayerDrugSelector
                  payers={allPayers}
                  selectedPayer={selectedPayer}
                  selectedDrug={selectedDrug}
                  drugs={drugs}
                  onPayerChange={handlePayerChange}
                  onDrugChange={setSelectedDrug}
                  getDisplayName={key => customPayers[key]?.payer ?? getPayerDisplayName(key)}
                  onAddPayer={() => setShowAddPayer(true)}
                  onAddDrug={() => setShowAddDrug(true)}
                  onDeletePayer={handleDeletePayer}
                  isCustomPayer={isCustomPayer}
                />
              </aside>

              <main ref={mainRef} className="flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-4">
                  {showRiskChart && (
                    <PayerRiskChart
                      routes={allRoutes}
                      selectedDrug={selectedDrug}
                      onPayerClick={key => { handlePayerChange(key); setShowRiskChart(false) }}
                    />
                  )}
                  {route ? (
                    <RoutePanel
                      route={route}
                      selectedDrug={selectedDrug}
                      onAddDrug={(drugName, fields) => handleAddDrug(selectedPayer, drugName, fields)}
                      onAddSource={() => setShowAddSource(true)}
                    />
                  ) : (
                    <EmptyState
                      payers={allPayers}
                      getPayerDisplayName={key => customPayers[key]?.payer ?? getPayerDisplayName(key)}
                      onSelectPayer={handlePayerChange}
                    />
                  )}
                </div>
              </main>
            </>
          )}

          {/* ── Tasks panel (right sidebar, both views) ─────────────── */}
          {showTasksPanel && (
            <div className="w-64 shrink-0 overflow-hidden flex flex-col">
              <TasksPanel
                tasks={tasks}
                onAddTask={() => setShowAddTask(true)}
                onSelectPayer={handlePayerChange}
                onStatusChange={handleTaskStatusChange}
                onDeleteTask={handleDeleteTask}
              />
            </div>
          )}
        </div>
      </div>

      {showAddPayer && (
        <AddPayerModal
          onConfirm={handleAddPayer}
          onCancel={() => setShowAddPayer(false)}
        />
      )}

      {showAddSource && route && (
        <AddSourceModal
          payerName={route.payer}
          payerKey={selectedPayer}
          onConfirm={handleAddSource}
          onCancel={() => setShowAddSource(false)}
        />
      )}

      {showAddDrug && (
        <AddDrugModal
          payerName={allRoutes[selectedPayer]?.payer ?? selectedPayer}
          onConfirm={(drugName, fields) => {
            handleAddDrug(selectedPayer, drugName, fields)
            setShowAddDrug(false)
          }}
          onCancel={() => setShowAddDrug(false)}
        />
      )}

      {showAddTask && (
        <AddTaskModal
          payers={allPayers}
          routes={allRoutes}
          initialPayerKey={view === 'detail' ? selectedPayer : undefined}
          onConfirm={handleAddTask}
          onCancel={() => setShowAddTask(false)}
        />
      )}

      {comparisonPayer && route && (
        <ComparisonMode
          route1={route}
          payer1Key={selectedPayer}
          allRoutes={allRoutes}
          allPayers={allPayers}
          getDisplayName={key => customPayers[key]?.payer ?? getPayerDisplayName(key)}
          onClose={() => setComparisonPayer(null)}
        />
      )}

      <KeyboardShortcuts />

      <Chatbot
        payerKey={selectedPayer}
        drugName={selectedDrug}
        payerName={route?.payer ?? null}
      />
    </LanguageContext.Provider>
  )
}
