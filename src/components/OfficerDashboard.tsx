import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Landmark,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import {useEffect, useMemo, useState, type FormEvent} from 'react';
import type {TranslationDictionary} from '../i18n/translations.ts';
import {
  createDutyEntries,
  deleteDutyEntry,
  subscribeOfficerDuties,
  submitDutyEntries,
  updateDutyEntry,
} from '../services/firestoreRegistry.ts';
import type {DraftDutyRow, DutyEntry, Language, User} from '../types.ts';
import {exportMonthlyDutyPdf} from '../utils/pdfExport.ts';
import {
  formatDuration,
  getCurrentMonthString,
  getDurationMinutes,
  getTodayDateString,
} from '../utils/time.ts';
import {LanguageSwitcher} from './LanguageSwitcher.tsx';

interface OfficerDashboardProps {
  user: User;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  t: TranslationDictionary;
  onLogout: () => void;
}

type OfficerTab = 'daily' | 'monthly';

function createBlankDraftRow(): DraftDutyRow {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startTime: '08:30',
    endTime: '09:30',
    description: '',
    remarks: '',
  };
}

export function OfficerDashboard({
  user,
  language,
  onLanguageChange,
  t,
  onLogout,
}: OfficerDashboardProps) {
  const [activeTab, setActiveTab] = useState<OfficerTab>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());

  const [draftRows, setDraftRows] = useState<DraftDutyRow[]>([createBlankDraftRow()]);
  const [allDuties, setAllDuties] = useState<DutyEntry[]>([]);

  const [loadingDuties, setLoadingDuties] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; message: string} | null>(
    null,
  );

  const showNotice = (type: 'success' | 'error', message: string) => {
    setFeedback({type, message});
  };

  useEffect(() => {
    setLoadingDuties(true);
    const unsub = subscribeOfficerDuties(
      user.id,
      (list) => {
        setAllDuties(list);
        setLoadingDuties(false);
      },
      (err) => {
        setLoadingDuties(false);
        showNotice('error', err.message || t.common.errorGeneric);
      },
    );
    return () => unsub();
  }, [user.id, t.common.errorGeneric]);

  const dayDuties = useMemo(
    () => allDuties.filter((d) => d.date === selectedDate),
    [allDuties, selectedDate],
  );

  const monthDuties = useMemo(
    () => allDuties.filter((d) => d.date.startsWith(selectedMonth)),
    [allDuties, selectedMonth],
  );

  const loadingDay = loadingDuties;
  const loadingMonth = loadingDuties;

  const savedDayDuties = useMemo(
    () => dayDuties.filter((d) => d.status === 'saved'),
    [dayDuties],
  );

  const dayTotalMinutes = useMemo(
    () => dayDuties.reduce((sum, d) => sum + getDurationMinutes(d.startTime, d.endTime), 0),
    [dayDuties],
  );

  const monthTotalMinutes = useMemo(
    () => monthDuties.reduce((sum, d) => sum + getDurationMinutes(d.startTime, d.endTime), 0),
    [monthDuties],
  );

  const handleAddDraftRow = () => {
    setDraftRows((prev) => {
      const last = prev[prev.length - 1];
      const nextStart = last && last.endTime ? last.endTime : '08:30';
      return [
        ...prev,
        {
          localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          startTime: nextStart,
          endTime: '',
          description: '',
          remarks: '',
        },
      ];
    });
  };

  const handleRemoveDraftRow = (localId: string) => {
    setDraftRows((prev) => (prev.length > 1 ? prev.filter((r) => r.localId !== localId) : prev));
  };

  const handleDraftChange = (
    localId: string,
    field: keyof Omit<DraftDutyRow, 'localId'>,
    value: string,
  ) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.localId === localId ? {...row, [field]: value} : row)),
    );
  };

  const handleSaveDrafts = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    for (const row of draftRows) {
      if (!row.description.trim()) {
        showNotice('error', t.common.errorEmptyDuty);
        return;
      }
      if (getDurationMinutes(row.startTime, row.endTime) <= 0) {
        showNotice('error', t.common.errorInvalidTimeRange);
        return;
      }
    }

    setSaving(true);
    try {
      await createDutyEntries(
        user,
        selectedDate,
        draftRows.map((row) => ({
          startTime: row.startTime,
          endTime: row.endTime,
          description: row.description.trim(),
          remarks: row.remarks.trim(),
        })),
      );
      setDraftRows([createBlankDraftRow()]);
      showNotice('success', t.common.successSaved);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : t.common.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitSaved = async (ids?: string[]) => {
    setFeedback(null);
    const targetIds = ids && ids.length > 0 ? ids : savedDayDuties.map((d) => d.id);
    if (targetIds.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      await submitDutyEntries(targetIds);
      showNotice('success', t.common.successSubmitted);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : t.common.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (duty: DutyEntry) => {
    setEditingId(duty.id);
    setEditStartTime(duty.startTime);
    setEditEndTime(duty.endTime);
    setEditDescription(duty.description);
    setEditRemarks(duty.remarks);
    setConfirmDeleteId(null);
  };

  const handleUpdateDuty = async (id: string) => {
    setFeedback(null);
    if (!editDescription.trim()) {
      showNotice('error', t.common.errorEmptyDuty);
      return;
    }
    if (getDurationMinutes(editStartTime, editEndTime) <= 0) {
      showNotice('error', t.common.errorInvalidTimeRange);
      return;
    }

    try {
      await updateDutyEntry(id, {
        startTime: editStartTime,
        endTime: editEndTime,
        description: editDescription.trim(),
        remarks: editRemarks.trim(),
      });
      setEditingId(null);
      showNotice('success', t.common.successUpdated);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : t.common.errorGeneric);
    }
  };

  const handleDeleteDuty = async (id: string) => {
    setFeedback(null);
    try {
      await deleteDutyEntry(id);
      setConfirmDeleteId(null);
      showNotice('success', t.common.successDeleted);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : t.common.errorGeneric);
    }
  };

  const handleDownloadMonthlyPdf = async () => {
    setDownloadingPdf(true);
    setFeedback(null);
    try {
      await exportMonthlyDutyPdf({
        duties: monthDuties,
        month: selectedMonth,
        officerLabel: user.fullName,
        designationLabel: user.designation,
        t,
        includeOfficerColumn: false,
        fileName: `Duty_Register_${user.username}_${selectedMonth}.pdf`,
      });
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : t.common.errorGeneric);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-100 shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
        <div>
          <div className="px-5 py-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5 text-teal-400 mb-2">
              <Landmark className="w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold tracking-wide text-teal-300">
                {t.header.division}
              </span>
            </div>
            <h1 className="text-sm font-bold text-white leading-snug">{t.header.secretariat}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{t.header.title}</p>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>{t.nav.dailyEntry}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'monthly'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>{t.nav.monthlyReport}</span>
            </button>
          </nav>
        </div>

        <div className="hidden lg:block p-4 border-t border-slate-800">
          <div className="text-xs font-semibold text-white truncate">{user.fullName}</div>
          <div className="text-xs text-slate-400 truncate mt-0.5">
            {user.designation} · {t.roles[user.role]}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.auth.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="text-xs sm:text-sm text-slate-600 font-medium truncate">
              <span>{t.header.secretariat}</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-900 font-semibold">
                {activeTab === 'daily' ? t.nav.dailyEntry : t.nav.monthlyReport}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                <UserRound className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{user.fullName}</span>
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                |
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <span className="text-slate-400">{t.common.designation}:</span>
                <span className="font-medium text-teal-700">{user.designation}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <LanguageSwitcher language={language} onChange={onLanguageChange} />
            <button
              type="button"
              onClick={onLogout}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.auth.logout}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7 max-w-6xl w-full mx-auto space-y-6">
          {feedback && (
            <div
              role="status"
              className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <span>{feedback.message}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Dismiss message"
                className="p-1 opacity-70 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'daily' ? (
            <>
              {/* Date & Day Summary Bar */}
              <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label htmlFor="duty-date" className="text-sm font-semibold text-slate-700">
                    {t.common.date}:
                  </label>
                  <input
                    id="duty-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-5 text-xs sm:text-sm text-slate-600 tabular-nums">
                  <div>
                    <span className="text-slate-500">{t.common.totalDuties}: </span>
                    <span className="font-semibold text-slate-900">{dayDuties.length}</span>
                  </div>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <div>
                    <span className="text-slate-500">{t.common.totalHours}: </span>
                    <span className="font-semibold text-slate-900">
                      {formatDuration(dayTotalMinutes, t)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Multi-Duty Entry Form */}
              <section className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {t.officer.entryFormTitle}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">{t.officer.entryFormSubtitle}</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDraftRow}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.common.add}</span>
                  </button>
                </div>

                <form onSubmit={handleSaveDrafts} className="space-y-4">
                  <div className="space-y-3">
                    {draftRows.map((row, idx) => (
                      <div
                        key={row.localId}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 items-start"
                      >
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            {t.common.startTime}
                          </label>
                          <input
                            type="time"
                            value={row.startTime}
                            onChange={(e) =>
                              handleDraftChange(row.localId, 'startTime', e.target.value)
                            }
                            required
                            className="w-full rounded-lg bg-white border border-slate-300 px-2.5 py-2 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            {t.common.endTime}
                          </label>
                          <input
                            type="time"
                            value={row.endTime}
                            onChange={(e) =>
                              handleDraftChange(row.localId, 'endTime', e.target.value)
                            }
                            required
                            className="w-full rounded-lg bg-white border border-slate-300 px-2.5 py-2 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div className="md:col-span-5">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            {t.common.dutyDetails} ({idx + 1})
                          </label>
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) =>
                              handleDraftChange(row.localId, 'description', e.target.value)
                            }
                            placeholder={t.common.dutyDetails}
                            required
                            className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            {t.common.remarksOptional}
                          </label>
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) =>
                              handleDraftChange(row.localId, 'remarks', e.target.value)
                            }
                            placeholder={t.common.remarks}
                            className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div className="md:col-span-1 flex md:justify-end md:pt-6">
                          {draftRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftRow(row.localId)}
                              aria-label="Remove row"
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleAddDraftRow}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.officer.addAnotherDuty}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{saving ? t.common.saving : t.officer.saveAllEntries}</span>
                    </button>
                  </div>
                </form>
              </section>

              {/* Recorded Duties Table for Selected Date */}
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {t.officer.recordedDutiesTitle}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                      {selectedDate}
                    </p>
                  </div>

                  {savedDayDuties.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSubmitSaved()}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {submitting
                          ? t.common.submitting
                          : `${t.officer.submitDayDuties} (${savedDayDuties.length})`}
                      </span>
                    </button>
                  )}
                </div>

                {loadingDay ? (
                  <div className="p-8 text-center text-sm text-slate-500">{t.common.loading}</div>
                ) : dayDuties.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {t.common.noDutiesForDate}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4 w-36">{t.common.startTime} - {t.common.endTime}</th>
                          <th className="py-3 px-4 w-28">{t.common.duration}</th>
                          <th className="py-3 px-4">{t.common.dutyDetails}</th>
                          <th className="py-3 px-4 w-44">{t.common.status}</th>
                          <th className="py-3 px-4 w-44 text-right">{t.common.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {dayDuties.map((duty) => {
                          const isEditing = editingId === duty.id;
                          const isApproved = duty.status === 'approved';
                          const mins = getDurationMinutes(duty.startTime, duty.endTime);

                          return (
                            <tr key={duty.id} className="hover:bg-slate-50/70 align-top">
                              <td className="py-3.5 px-4 font-mono tabular-nums text-xs sm:text-sm text-slate-900 whitespace-nowrap">
                                {isEditing ? (
                                  <div className="flex flex-col gap-1.5">
                                    <input
                                      type="time"
                                      value={editStartTime}
                                      onChange={(e) => setEditStartTime(e.target.value)}
                                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                                    />
                                    <input
                                      type="time"
                                      value={editEndTime}
                                      onChange={(e) => setEditEndTime(e.target.value)}
                                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                                    />
                                  </div>
                                ) : (
                                  `${duty.startTime} – ${duty.endTime}`
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                                {formatDuration(mins, t)}
                              </td>

                              <td className="py-3.5 px-4 text-slate-800">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={editDescription}
                                      onChange={(e) => setEditDescription(e.target.value)}
                                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={editRemarks}
                                      onChange={(e) => setEditRemarks(e.target.value)}
                                      placeholder={t.common.remarksOptional}
                                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <p className="font-medium text-slate-900">{duty.description}</p>
                                    {duty.remarks && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        {t.common.remarks}: {duty.remarks}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {duty.status === 'approved' && (
                                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>{t.statuses.approved}</span>
                                  </div>
                                )}
                                {duty.status === 'submitted' && (
                                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                    <Clock className="w-4 h-4 shrink-0" />
                                    <span>{t.statuses.submitted}</span>
                                  </div>
                                )}
                                {duty.status === 'saved' && (
                                  <div className="text-xs font-semibold text-slate-600">
                                    {t.statuses.saved}
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                {isApproved ? (
                                  <span
                                    title={t.officer.approvedLockedNotice}
                                    className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>{t.common.lockedApproved}</span>
                                  </span>
                                ) : isEditing ? (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDuty(duty.id)}
                                      className="px-2.5 py-1 rounded bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 cursor-pointer"
                                    >
                                      {t.common.update}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="px-2.5 py-1 rounded border border-slate-300 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                                    >
                                      {t.common.cancel}
                                    </button>
                                  </div>
                                ) : confirmDeleteId === duty.id ? (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDuty(duty.id)}
                                      className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 cursor-pointer"
                                    >
                                      {t.common.confirmDelete}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-2 py-1 rounded border border-slate-300 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                                    >
                                      {t.common.cancel}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5">
                                    {duty.status === 'saved' && (
                                      <button
                                        type="button"
                                        onClick={() => handleSubmitSaved([duty.id])}
                                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium cursor-pointer"
                                      >
                                        {t.common.submit}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => startEdit(duty)}
                                      aria-label={t.common.edit}
                                      className="p-1.5 rounded text-slate-600 hover:text-teal-700 hover:bg-teal-50 cursor-pointer"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(duty.id)}
                                      aria-label={t.common.delete}
                                      className="p-1.5 rounded text-slate-600 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : (
            /* Monthly Report & PDF View */
            <section className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {t.officer.monthlyPreviewTitle}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">{t.officer.monthlyPreviewSubtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="officer-month" className="text-sm font-medium text-slate-700">
                    {t.common.month}:
                  </label>
                  <input
                    id="officer-month"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-teal-600"
                  />

                  <button
                    type="button"
                    onClick={handleDownloadMonthlyPdf}
                    disabled={downloadingPdf || loadingMonth}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {downloadingPdf ? t.common.generatingPdf : t.common.downloadPdf}
                    </span>
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-600 tabular-nums">
                  <span>
                    {user.fullName} · {user.designation}
                  </span>
                  <div className="flex items-center gap-4">
                    <span>
                      {t.common.totalDuties}:{' '}
                      <strong className="text-slate-900">{monthDuties.length}</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>
                      {t.common.totalHours}:{' '}
                      <strong className="text-slate-900">
                        {formatDuration(monthTotalMinutes, t)}
                      </strong>
                    </span>
                  </div>
                </div>

                {loadingMonth ? (
                  <div className="p-8 text-center text-sm text-slate-500">{t.common.loading}</div>
                ) : monthDuties.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {t.common.noDutiesForMonth}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4 w-32">{t.common.date}</th>
                          <th className="py-3 px-4 w-36">
                            {t.common.startTime} - {t.common.endTime}
                          </th>
                          <th className="py-3 px-4 w-28">{t.common.duration}</th>
                          <th className="py-3 px-4">{t.common.dutyDetails}</th>
                          <th className="py-3 px-4 w-40">{t.common.status}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {monthDuties.map((duty) => (
                          <tr key={duty.id} className="hover:bg-slate-50/70 align-top">
                            <td className="py-3 px-4 font-mono tabular-nums text-xs sm:text-sm text-slate-900 whitespace-nowrap">
                              {duty.date}
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-xs sm:text-sm text-slate-900 whitespace-nowrap">
                              {duty.startTime} – {duty.endTime}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                              {formatDuration(
                                getDurationMinutes(duty.startTime, duty.endTime),
                                t,
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-800">
                              <p className="font-medium text-slate-900">{duty.description}</p>
                              {duty.remarks && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {t.common.remarks}: {duty.remarks}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {duty.status === 'approved' && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{t.statuses.approved}</span>
                                </span>
                              )}
                              {duty.status === 'submitted' && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                  <Clock className="w-4 h-4" />
                                  <span>{t.statuses.submitted}</span>
                                </span>
                              )}
                              {duty.status === 'saved' && (
                                <span className="text-xs font-semibold text-slate-600">
                                  {t.statuses.saved}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
        <footer className="border-t border-slate-200 bg-white px-6 py-3.5 text-center text-xs text-slate-500">
          Design by :Theesan Published :2026
        </footer>
      </div>
    </div>
  );
}
