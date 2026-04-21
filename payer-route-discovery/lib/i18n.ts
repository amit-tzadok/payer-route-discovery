'use client'

import { useLanguage } from './language-context'
import type { LanguageCode } from './language'
import type { SourceType, ConfidenceStatus } from './types'

// ── Translation shape ─────────────────────────────────────────────────────────
export interface Translations {
  // App header
  appSubtitle:    string
  clickFieldHint: string

  // Search bar
  searchPlaceholder: string

  // Empty state
  emptyStateTitle: string
  emptyStateDesc:  string

  // Sidebar
  payerLabel:  string
  drugLabel:   string
  routeOnly:   string
  addPayer:    string
  addDrug:     string
  sidebarHint: string

  // Section headers (keyed by English label used in data.ts)
  sections: Record<string, string>

  // Field labels
  fields: Record<string, string>

  // Confidence status labels
  status: Record<ConfidenceStatus, string>

  // Source type labels
  sourceTypes: Record<SourceType, { label: string; short: string }>

  // Trust rank tooltip
  trustRank: Record<SourceType, string>

  // ConflictDrawer
  analyzingSources: string
  sourcesAgree:     (count: number, total: number) => string
  overriddenText:   (reason?: string) => string
  clearOverride:    string
  overrideValue:    string

  // FieldRow
  overriddenBadge: string

  // RoutePanel
  mostRecentData:   string
  drugSpecific:     string
  selectDrugPrompt: string
  addMedication:    string

  // OverrideModal
  overrideModalTitle:    string
  overrideModalSubtitle: string
  newValueLabel:         string
  reasonLabel:           string
  reasonOptional:        string
  cancelButton:          string
  applyOverrideButton:   string

  // Value format units
  fmtDays:   (n: number | string) => string
  fmtHrs:    (n: number | string) => string
  fmtMonths: (n: number | string) => string
  fmtYes:    string
  fmtNo:     string
}

// ── Per-language translation maps ─────────────────────────────────────────────
const T: Record<LanguageCode, Translations> = {

  // ──────────────────────────────────────────────────────────────────── EN ───
  en: {
    appSubtitle:    'Payer Route Discovery',
    clickFieldHint: 'Click any field to see source evidence',

    searchPlaceholder: 'Search payers or drugs...',
    emptyStateTitle:   'Infusion Route Lookup',
    emptyStateDesc:    'Select a payer to see prior authorization routes and requirements',

    payerLabel:  'Payer',
    drugLabel:   'Drug',
    routeOnly:   'Route only',
    addPayer:    'Add payer',
    addDrug:     'Add drug',
    sidebarHint: 'Click any field to view source evidence',

    sections: {
      Submission:   'Submission',
      Contact:      'Contact',
      Documentation:'Documentation',
      Timelines:    'Timelines',
      Requirements: 'Requirements',
      Notes:        'Notes',
    },

    fields: {
      submission_methods:       'Submission Methods',
      fax_number:               'Fax Number',
      portal_url:               'Portal',
      pa_form:                  'PA Form',
      chart_note_window_days:   'Chart Note Window',
      turnaround_standard_days: 'Standard Turnaround',
      turnaround_fax_days:      'Fax Turnaround',
      turnaround_urgent_hours:  'Urgent Turnaround',
      phone_urgent:             'Urgent Phone',
      phone_status_only:        'Status Phone',
      step_therapy_required:    'Step Therapy Required',
      biosimilar_required:      'Biosimilar Required',
      biosimilar_preferred:     'Biosimilar Preferred',
      biosimilar_attestation:   'Biosimilar Attestation',
      auth_period_months:       'Auth Period',
      notes:                    'Notes',
    },

    status: {
      verified:   'Verified',
      likely:     'Likely',
      conflicted: 'Conflict',
      stale:      'Stale',
      deprecated: 'Deprecated',
      overridden: 'Overridden',
    },

    sourceTypes: {
      denial_letter:    { label: 'Denial Letter',   short: 'DL' },
      phone_transcript: { label: 'Phone Call',       short: 'PC' },
      web_page:         { label: 'Web Page',         short: 'WP' },
      provider_manual:  { label: 'Provider Manual',  short: 'PM' },
    },

    trustRank: {
      denial_letter:    'Trust rank 4/4',
      phone_transcript: 'Trust rank 3/4',
      web_page:         'Trust rank 2/4',
      provider_manual:  'Trust rank 1/4',
    },

    analyzingSources: 'Analyzing sources',
    sourcesAgree:     (c, t) => `${c} of ${t} sources agree`,
    overriddenText:   (r)    => r ? `Overridden · ${r}` : 'Overridden',
    clearOverride:    'Clear override',
    overrideValue:    'Override value →',

    overriddenBadge: 'overridden',

    mostRecentData:   'Most recent data:',
    drugSpecific:     'Drug-specific',
    selectDrugPrompt: 'Select a drug to see drug-specific requirements',
    addMedication:    'Add Medication',

    overrideModalTitle:    'Override',
    overrideModalSubtitle: 'Stored locally for this session. A full audit trail would persist this to your EHR.',
    newValueLabel:         'New value',
    reasonLabel:           'Reason',
    reasonOptional:        '(optional)',
    cancelButton:          'Cancel',
    applyOverrideButton:   'Apply Override',

    fmtDays:   n => `${n} days`,
    fmtHrs:    n => `${n} hrs`,
    fmtMonths: n => `${n} months`,
    fmtYes:    'Yes',
    fmtNo:     'No',
  },

  // ──────────────────────────────────────────────────────────────────── ES ───
  es: {
    appSubtitle:    'Descubrimiento de Ruta del Pagador',
    clickFieldHint: 'Haz clic en cualquier campo para ver evidencia',

    searchPlaceholder: 'Buscar pagadores o medicamentos...',
    emptyStateTitle:   'Búsqueda de Rutas de Infusión',
    emptyStateDesc:    'Selecciona un pagador para ver rutas de autorización previa y requisitos',

    payerLabel:  'Pagador',
    drugLabel:   'Medicamento',
    routeOnly:   'Solo ruta',
    addPayer:    'Agregar pagador',
    addDrug:     'Agregar medicamento',
    sidebarHint: 'Haz clic en cualquier campo para ver evidencia',

    sections: {
      Submission:    'Envío',
      Contact:       'Contacto',
      Documentation: 'Documentación',
      Timelines:     'Plazos',
      Requirements:  'Requisitos',
      Notes:         'Notas',
    },

    fields: {
      submission_methods:       'Métodos de Envío',
      fax_number:               'Número de Fax',
      portal_url:               'Portal',
      pa_form:                  'Formulario PA',
      chart_note_window_days:   'Ventana de Notas',
      turnaround_standard_days: 'Tiempo Estándar',
      turnaround_fax_days:      'Tiempo Vía Fax',
      turnaround_urgent_hours:  'Tiempo Urgente',
      phone_urgent:             'Teléfono Urgente',
      phone_status_only:        'Teléfono de Estado',
      step_therapy_required:    'Terapia Escalonada Requerida',
      biosimilar_required:      'Biosimilar Requerido',
      biosimilar_preferred:     'Biosimilar Preferido',
      biosimilar_attestation:   'Atestación de Biosimilar',
      auth_period_months:       'Período de Autorización',
      notes:                    'Notas',
    },

    status: {
      verified:   'Verificado',
      likely:     'Probable',
      conflicted: 'Conflicto',
      stale:      'Desactualizado',
      deprecated: 'Obsoleto',
      overridden: 'Modificado',
    },

    sourceTypes: {
      denial_letter:    { label: 'Carta de Denegación',  short: 'CD' },
      phone_transcript: { label: 'Llamada Telefónica',   short: 'LT' },
      web_page:         { label: 'Página Web',           short: 'PW' },
      provider_manual:  { label: 'Manual del Proveedor', short: 'MP' },
    },

    trustRank: {
      denial_letter:    'Confianza 4/4',
      phone_transcript: 'Confianza 3/4',
      web_page:         'Confianza 2/4',
      provider_manual:  'Confianza 1/4',
    },

    analyzingSources: 'Analizando fuentes',
    sourcesAgree:     (c, t) => `${c} de ${t} fuentes coinciden`,
    overriddenText:   (r)    => r ? `Modificado · ${r}` : 'Modificado',
    clearOverride:    'Eliminar modificación',
    overrideValue:    'Modificar valor →',

    overriddenBadge: 'modificado',

    mostRecentData:   'Datos más recientes:',
    drugSpecific:     'Específico del medicamento',
    selectDrugPrompt: 'Selecciona un medicamento para ver requisitos específicos',
    addMedication:    'Agregar Medicamento',

    overrideModalTitle:    'Modificar',
    overrideModalSubtitle: 'Guardado localmente para esta sesión. Un historial completo persistiría esto en su EHR.',
    newValueLabel:         'Nuevo valor',
    reasonLabel:           'Razón',
    reasonOptional:        '(opcional)',
    cancelButton:          'Cancelar',
    applyOverrideButton:   'Aplicar Modificación',

    fmtDays:   n => `${n} días`,
    fmtHrs:    n => `${n} hrs`,
    fmtMonths: n => `${n} meses`,
    fmtYes:    'Sí',
    fmtNo:     'No',
  },

  // ──────────────────────────────────────────────────────────────────── FR ───
  fr: {
    appSubtitle:    'Découverte de Parcours Payeur',
    clickFieldHint: 'Cliquez sur un champ pour voir les preuves',

    searchPlaceholder: 'Rechercher un payeur ou un médicament...',
    emptyStateTitle:   'Recherche de Parcours d\'Infusion',
    emptyStateDesc:    'Sélectionnez un payeur pour voir les parcours d\'autorisation préalable et les exigences',

    payerLabel:  'Payeur',
    drugLabel:   'Médicament',
    routeOnly:   'Route uniquement',
    addPayer:    'Ajouter payeur',
    addDrug:     'Ajouter médicament',
    sidebarHint: 'Cliquez sur un champ pour voir les preuves',

    sections: {
      Submission:    'Soumission',
      Contact:       'Contact',
      Documentation: 'Documentation',
      Timelines:     'Délais',
      Requirements:  'Exigences',
      Notes:         'Notes',
    },

    fields: {
      submission_methods:       'Méthodes de Soumission',
      fax_number:               'Numéro de Fax',
      portal_url:               'Portail',
      pa_form:                  'Formulaire PA',
      chart_note_window_days:   'Fenêtre de Notes',
      turnaround_standard_days: 'Délai Standard',
      turnaround_fax_days:      'Délai Fax',
      turnaround_urgent_hours:  'Délai Urgent',
      phone_urgent:             'Téléphone Urgent',
      phone_status_only:        'Téléphone Statut',
      step_therapy_required:    'Thérapie Progressive Requise',
      biosimilar_required:      'Biosimilaire Requis',
      biosimilar_preferred:     'Biosimilaire Préféré',
      biosimilar_attestation:   'Attestation Biosimilaire',
      auth_period_months:       'Période d\'Autorisation',
      notes:                    'Notes',
    },

    status: {
      verified:   'Vérifié',
      likely:     'Probable',
      conflicted: 'Conflit',
      stale:      'Obsolète',
      deprecated: 'Déprécié',
      overridden: 'Remplacé',
    },

    sourceTypes: {
      denial_letter:    { label: 'Lettre de Refus',         short: 'LR' },
      phone_transcript: { label: 'Appel Téléphonique',      short: 'AT' },
      web_page:         { label: 'Page Web',                short: 'PW' },
      provider_manual:  { label: 'Manuel du Prestataire',   short: 'MP' },
    },

    trustRank: {
      denial_letter:    'Confiance 4/4',
      phone_transcript: 'Confiance 3/4',
      web_page:         'Confiance 2/4',
      provider_manual:  'Confiance 1/4',
    },

    analyzingSources: 'Analyse des sources',
    sourcesAgree:     (c, t) => `${c} sur ${t} sources concordent`,
    overriddenText:   (r)    => r ? `Remplacé · ${r}` : 'Remplacé',
    clearOverride:    'Effacer le remplacement',
    overrideValue:    'Remplacer la valeur →',

    overriddenBadge: 'remplacé',

    mostRecentData:   'Données les plus récentes :',
    drugSpecific:     'Spécifique au médicament',
    selectDrugPrompt: 'Sélectionnez un médicament pour voir les exigences spécifiques',
    addMedication:    'Ajouter Médicament',

    overrideModalTitle:    'Remplacer',
    overrideModalSubtitle: 'Stocké localement pour cette session. Un historique complet persisterait vers votre DSE.',
    newValueLabel:         'Nouvelle valeur',
    reasonLabel:           'Raison',
    reasonOptional:        '(optionnel)',
    cancelButton:          'Annuler',
    applyOverrideButton:   'Appliquer le remplacement',

    fmtDays:   n => `${n} jours`,
    fmtHrs:    n => `${n} h`,
    fmtMonths: n => `${n} mois`,
    fmtYes:    'Oui',
    fmtNo:     'Non',
  },

  // ──────────────────────────────────────────────────────────────────── ZH ───
  zh: {
    appSubtitle:    '支付方路由查询',
    clickFieldHint: '点击任意字段查看来源证据',

    searchPlaceholder: '搜索支付方或药物...',
    emptyStateTitle:   '输液路由查询',
    emptyStateDesc:    '选择一个支付方来查看先期授权路由和要求',

    payerLabel:  '支付方',
    drugLabel:   '药物',
    routeOnly:   '仅路由',
    addPayer:    '添加支付方',
    addDrug:     '添加药物',
    sidebarHint: '点击任意字段查看来源证据',

    sections: {
      Submission:    '提交方式',
      Contact:       '联系方式',
      Documentation: '文件要求',
      Timelines:     '时间节点',
      Requirements:  '药物要求',
      Notes:         '备注',
    },

    fields: {
      submission_methods:       '提交方式',
      fax_number:               '传真号码',
      portal_url:               '门户网站',
      pa_form:                  '预授权表格',
      chart_note_window_days:   '病历窗口期',
      turnaround_standard_days: '标准处理时间',
      turnaround_fax_days:      '传真处理时间',
      turnaround_urgent_hours:  '紧急处理时间',
      phone_urgent:             '紧急电话',
      phone_status_only:        '状态查询电话',
      step_therapy_required:    '需要阶梯疗法',
      biosimilar_required:      '需要生物类似药',
      biosimilar_preferred:     '优先生物类似药',
      biosimilar_attestation:   '生物类似药证明',
      auth_period_months:       '授权期限',
      notes:                    '备注',
    },

    status: {
      verified:   '已验证',
      likely:     '可能准确',
      conflicted: '数据冲突',
      stale:      '数据过期',
      deprecated: '已弃用',
      overridden: '已覆盖',
    },

    sourceTypes: {
      denial_letter:    { label: '拒绝信',    short: '拒' },
      phone_transcript: { label: '电话记录',  short: '话' },
      web_page:         { label: '网页',      short: '网' },
      provider_manual:  { label: '提供者手册', short: '册' },
    },

    trustRank: {
      denial_letter:    '信任等级 4/4',
      phone_transcript: '信任等级 3/4',
      web_page:         '信任等级 2/4',
      provider_manual:  '信任等级 1/4',
    },

    analyzingSources: '正在分析来源',
    sourcesAgree:     (c, t) => `${t} 个来源中有 ${c} 个一致`,
    overriddenText:   (r)    => r ? `已覆盖 · ${r}` : '已覆盖',
    clearOverride:    '清除覆盖',
    overrideValue:    '覆盖值 →',

    overriddenBadge: '已覆盖',

    mostRecentData:   '最新数据：',
    drugSpecific:     '药物特定',
    selectDrugPrompt: '选择药物以查看特定要求',
    addMedication:    '添加药物',

    overrideModalTitle:    '覆盖',
    overrideModalSubtitle: '仅在本会话中本地存储。完整审计记录将持久化到您的 EHR。',
    newValueLabel:         '新值',
    reasonLabel:           '原因',
    reasonOptional:        '（可选）',
    cancelButton:          '取消',
    applyOverrideButton:   '应用覆盖',

    fmtDays:   n => `${n} 天`,
    fmtHrs:    n => `${n} 小时`,
    fmtMonths: n => `${n} 个月`,
    fmtYes:    '是',
    fmtNo:     '否',
  },

  // ──────────────────────────────────────────────────────────────────── PT ───
  pt: {
    appSubtitle:    'Descoberta de Rota do Pagador',
    clickFieldHint: 'Clique em qualquer campo para ver evidências',

    searchPlaceholder: 'Procurar pagador ou medicamento...',
    emptyStateTitle:   'Descoberta de Rota de Infusão',
    emptyStateDesc:    'Selecione um pagador para ver rotas de autorização prévia e requisitos',

    payerLabel:  'Pagador',
    drugLabel:   'Medicamento',
    routeOnly:   'Somente rota',
    addPayer:    'Adicionar pagador',
    addDrug:     'Adicionar medicamento',
    sidebarHint: 'Clique em qualquer campo para ver evidências',

    sections: {
      Submission:    'Envio',
      Contact:       'Contato',
      Documentation: 'Documentação',
      Timelines:     'Prazos',
      Requirements:  'Requisitos',
      Notes:         'Notas',
    },

    fields: {
      submission_methods:       'Métodos de Envio',
      fax_number:               'Número de Fax',
      portal_url:               'Portal',
      pa_form:                  'Formulário PA',
      chart_note_window_days:   'Janela de Notas',
      turnaround_standard_days: 'Prazo Padrão',
      turnaround_fax_days:      'Prazo Via Fax',
      turnaround_urgent_hours:  'Prazo Urgente',
      phone_urgent:             'Telefone Urgente',
      phone_status_only:        'Telefone de Status',
      step_therapy_required:    'Terapia Escalonada Obrigatória',
      biosimilar_required:      'Biossimilar Obrigatório',
      biosimilar_preferred:     'Biossimilar Preferido',
      biosimilar_attestation:   'Atestado de Biossimilar',
      auth_period_months:       'Período de Autorização',
      notes:                    'Notas',
    },

    status: {
      verified:   'Verificado',
      likely:     'Provável',
      conflicted: 'Conflito',
      stale:      'Desatualizado',
      deprecated: 'Obsoleto',
      overridden: 'Substituído',
    },

    sourceTypes: {
      denial_letter:    { label: 'Carta de Negação',      short: 'CN' },
      phone_transcript: { label: 'Ligação Telefônica',    short: 'LT' },
      web_page:         { label: 'Página Web',            short: 'PW' },
      provider_manual:  { label: 'Manual do Prestador',   short: 'MP' },
    },

    trustRank: {
      denial_letter:    'Confiança 4/4',
      phone_transcript: 'Confiança 3/4',
      web_page:         'Confiança 2/4',
      provider_manual:  'Confiança 1/4',
    },

    analyzingSources: 'Analisando fontes',
    sourcesAgree:     (c, t) => `${c} de ${t} fontes concordam`,
    overriddenText:   (r)    => r ? `Substituído · ${r}` : 'Substituído',
    clearOverride:    'Limpar substituição',
    overrideValue:    'Substituir valor →',

    overriddenBadge: 'substituído',

    mostRecentData:   'Dados mais recentes:',
    drugSpecific:     'Específico do medicamento',
    selectDrugPrompt: 'Selecione um medicamento para ver os requisitos específicos',
    addMedication:    'Adicionar Medicamento',

    overrideModalTitle:    'Substituir',
    overrideModalSubtitle: 'Armazenado localmente para esta sessão. Um histórico completo persistiria no seu EHR.',
    newValueLabel:         'Novo valor',
    reasonLabel:           'Motivo',
    reasonOptional:        '(opcional)',
    cancelButton:          'Cancelar',
    applyOverrideButton:   'Aplicar Substituição',

    fmtDays:   n => `${n} dias`,
    fmtHrs:    n => `${n} h`,
    fmtMonths: n => `${n} meses`,
    fmtYes:    'Sim',
    fmtNo:     'Não',
  },
}

// ── Direct access (for components that own the language value) ────────────────
export function getT(language: LanguageCode): Translations {
  return T[language]
}

// ── Hook (for components inside LanguageContext.Provider) ─────────────────────
export function useT(): Translations {
  return T[useLanguage()]
}

// ── Localized value formatter ─────────────────────────────────────────────────
export function formatFieldValueT(
  field: string,
  value: unknown,
  t: Translations,
): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) {
    return value
      .map(v =>
        String(v)
          .replace(/_/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase()),
      )
      .join(' · ')
  }
  if (typeof value === 'boolean') return value ? t.fmtYes : t.fmtNo
  if (field.endsWith('_days'))   return typeof value === 'number' ? t.fmtDays(value) : String(value)
  if (field.endsWith('_hours'))  return typeof value === 'number' ? t.fmtHrs(value)  : String(value)
  if (field.endsWith('_months')) return typeof value === 'number' ? t.fmtMonths(value) : String(value)
  return String(value)
}
