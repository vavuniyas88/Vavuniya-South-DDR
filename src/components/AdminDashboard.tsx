import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Landmark,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {useEffect, useMemo, useState, type FormEvent} from 'react';
import type {TranslationDictionary} from '../i18n/translations.ts';
import {
  approveDutyEntries,
  createManagedUser,
  deleteManagedUser,
  subscribeAllUsers,
  subscribeOfficerDutiesForAdmin,
  updateManagedUser,
} from '../services/firestoreRegistry.ts';
import type {DutyEntry, DutyStatus, Language, User, UserRole} from '../types.ts';
import {exportDailyDutyPdf, exportMonthlyDutyPdf} from '../utils/pdfExport.ts';
import {
  formatDuration,
  getCurrentMonthString,
  getDurationMinutes,
} from '../utils/time.ts';
import {DutySubmissionsChart} from './DutySubmissionsChart.tsx';
import {LanguageSwitcher} from './LanguageSwitcher.tsx';

interface AdminDashboardProps {
  user: User;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  t: TranslationDictionary;
  onLogout: () => void;
}

type AdminTab = 'approvals' | 'monthly' | 'users';
type ApprovalFilter = 'submitted' | 'approved' | 'all';

export function AdminDashboard({
  user,
  language,
  onLanguageChange,
  t,
  onLogout,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('approvals');

  const [users, setUsers] = useState<User[]>([]);
  const [duties, setDuties] = useState<DutyEntry[]>([]);
  const [loadingDuties, setLoadingDuties] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Approvals filter state
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<ApprovalFilter>('submitted');
  const [approvalOfficerFilter, setApprovalOfficerFilter] = useState<string>('all');
  const [approvalDateFilter, setApprovalDateFilter] = useState<string>('');
  const [approvalSearchQuery, setApprovalSearchQuery] = useState<string>('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvingBatch, setApprovingBatch] = useState(false);
  const [downloadingDailyPdf, setDownloadingDailyPdf] = useState(false);

  // Monthly report state
  const [reportMonth, setReportMonth] = useState<string>(getCurrentMonthString());
  const [reportOfficerId, setReportOfficerId] = useState<string>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | DutyStatus>('all');
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // User management form state (Admin Only)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('officer');
  const [savingUser, setSavingUser] = useState(false);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; message: string} | null>(
    null,
  );

  const showNotice = (type: 'success' | 'error', message: string) => {
    setFeedback({type, message});
  };

  useEffect(() => {
    setLoadingUsers(true);
    const unsubUsers = subscribeAllUsers(
      (list) => {
        setUsers(list);
        setLoadingUsers(false);
      },
      (err) => {
        setLoadingUsers(false);
        showNotice('error', err.message || t.common.errorGeneric);
      },
    );

    setLoadingDuties(true);
    const unsubDuties = subscribeOfficerDutiesForAdmin(
      (list) => {
        setDuties(list);
        setLoadingDuties(false);
      },
      (err) => {
        setLoadingDuties(false);
        showNotice('error', err.message || t.common.errorGeneric);
      },
    );

    return () => {
      unsubUsers();
      unsubDuties();
    };
  }, [t.common.errorGeneric]);

  const loadDuties = () => {
    setLoadingDuties(true);
    window.setTimeout(() => setLoadingDuties(false), 300);
  };

  const officerUsers = useMemo(
    () => users.filter((u) => u.role === 'officer'),
    [users],
  );

  const officerUserIds = useMemo(
    () => new Set(officerUsers.map((u) => u.id)),
    [officerUsers],
  );

  const pendingCount = useMemo(
    () =>
      duties.filter(
        (d) => d.status === 'submitted' && officerUserIds.has(d.userId),
      ).length,
    [duties, officerUserIds],
  );

  const matchesSearchTerm = (duty: DutyEntry, rawQuery: string): boolean => {
    const q = rawQuery.trim().toLowerCase();
    if (!q) {
      return true;
    }
    const localizedStatus = t.statuses[duty.status].toLowerCase();
    const haystack = [
      duty.officerName ?? '',
      duty.officerUsername ?? '',
      duty.officerDesignation ?? '',
      duty.date,
      duty.status,
      localizedStatus,
      duty.description,
      duty.remarks,
      duty.approvedByName ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  };

  const approvalTabCounts = useMemo(() => {
    let submitted = 0;
    let approved = 0;
    for (const d of duties) {
      if (!officerUserIds.has(d.userId) || d.status === 'saved') {
        continue;
      }
      if (approvalOfficerFilter !== 'all' && d.userId !== approvalOfficerFilter) {
        continue;
      }
      if (approvalDateFilter && d.date !== approvalDateFilter) {
        continue;
      }
      if (!matchesSearchTerm(d, approvalSearchQuery)) {
        continue;
      }
      if (d.status === 'submitted') {
        submitted += 1;
      } else if (d.status === 'approved') {
        approved += 1;
      }
    }
    return {submitted, approved, all: submitted + approved};
  }, [duties, officerUserIds, approvalOfficerFilter, approvalDateFilter, approvalSearchQuery, t.statuses]);

  const filteredApprovalDuties = useMemo(() => {
    return duties.filter((d) => {
      if (!officerUserIds.has(d.userId)) {
        return false;
      }
      if (d.status === 'saved') {
        return false;
      }
      if (approvalStatusFilter !== 'all' && d.status !== approvalStatusFilter) {
        return false;
      }
      if (approvalOfficerFilter !== 'all' && d.userId !== approvalOfficerFilter) {
        return false;
      }
      if (approvalDateFilter && d.date !== approvalDateFilter) {
        return false;
      }
      if (!matchesSearchTerm(d, approvalSearchQuery)) {
        return false;
      }
      return true;
    });
  }, [
    duties,
    officerUserIds,
    approvalStatusFilter,
    approvalOfficerFilter,
    approvalDateFilter,
    approvalSearchQuery,
    t.statuses,
  ]);

  const hasActiveApprovalFilters = Boolean(
    approvalSearchQuery.trim() ||
      approvalOfficerFilter !== 'all' ||
      approvalDateFilter ||
      approvalStatusFilter !== 'submitted',
  );

  const clearApprovalFilters = () => {
    setApprovalSearchQuery('');
    setApprovalOfficerFilter('all');
    setApprovalDateFilter('');
    setApprovalStatusFilter('submitted');
  };

  const filteredSubmittedIds = useMemo(
    () => filteredApprovalDuties.filter((d) => d.status === 'submitted').map((d) => d.id),
    [filteredApprovalDuties],
  );

  const chartOfficerDuties = useMemo(() => {
    return duties.filter((d) => {
      if (!officerUserIds.has(d.userId) || d.officerRole === 'admin') {
        return false;
      }
      if (approvalOfficerFilter !== 'all' && d.userId !== approvalOfficerFilter) {
        return false;
      }
      return true;
    });
  }, [duties, officerUserIds, approvalOfficerFilter]);

  const chartOfficerLabel = useMemo(() => {
    if (approvalOfficerFilter === 'all') {
      return t.common.allOfficers;
    }
    return (
      officerUsers.find((u) => u.id === approvalOfficerFilter)?.fullName ?? t.common.allOfficers
    );
  }, [approvalOfficerFilter, officerUsers, t.common.allOfficers]);

  const monthlyDuties = useMemo(() => {
    return duties.filter((d) => {
      if (!officerUserIds.has(d.userId) || d.officerRole === 'admin') {
        return false;
      }
      if (!d.date.startsWith(reportMonth)) {
        return false;
      }
      if (reportOfficerId !== 'all' && d.userId !== reportOfficerId) {
        return false;
      }
      if (reportStatusFilter !== 'all' && d.status !== reportStatusFilter) {
        return false;
      }
      if (!matchesSearchTerm(d, reportSearchQuery)) {
        return false;
      }
      return true;
    });
  }, [
    duties,
    officerUserIds,
    reportMonth,
    reportOfficerId,
    reportStatusFilter,
    reportSearchQuery,
    t.statuses,
  ]);

  const monthlyTotalMinutes = useMemo(
    () => monthlyDuties.reduce((sum, d) => sum + getDurationMinutes(d.startTime, d.endTime), 0),
    [monthlyDuties],
  );

  const handleApproveSingle = async (id: string) => {
    setFeedback(null);
    setApprovingId(id);
    try {
      await approveDutyEntries([id], user);
      showNotice('success', t.common.successApproved);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : t.common.errorGeneric);
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveAllFiltered = async () => {
    if (filteredSubmittedIds.length === 0) {
      return;
    }
    setFeedback(null);
    setApprovingBatch(true);
    try {
      await approveDutyEntries(filteredSubmittedIds, user);
      showNotice('success', t.common.successApproved);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : t.common.errorGeneric);
    } finally {
      setApprovingBatch(false);
    }
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setFormFullName('');
    setFormUsername('');
    setFormDesignation('');
    setFormPassword('');
    setFormRole('officer');
  };

  const handleStartEditUser = (target: User) => {
    setEditingUserId(target.id);
    setFormFullName(target.fullName);
    setFormUsername(target.username);
    setFormDesignation(target.designation);
    setFormPassword('');
    setFormRole(target.role);
    setConfirmDeleteUserId(null);
  };

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formFullName.trim() || !formDesignation.trim() || (!editingUserId && !formUsername.trim())) {
      showNotice('error', t.auth.requiredFields);
      return;
    }
    if (!editingUserId && formPassword.length < 6) {
      showNotice('error', t.auth.passwordMinLength);
      return;
    }

    setSavingUser(true);
    try {
      if (editingUserId) {
        await updateManagedUser(editingUserId, {
          fullName: formFullName.trim(),
          designation: formDesignation.trim(),
          role: formRole,
        });
        showNotice('success', t.common.successUserUpdated);
      } else {
        await createManagedUser({
          fullName: formFullName.trim(),
          username: formUsername.trim(),
          designation: formDesignation.trim(),
          role: formRole,
          password: formPassword,
        });
        showNotice('success', t.common.successUserCreated);
      }
      resetUserForm();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes('auth/email-already-in-use')) {
        showNotice('error', t.auth.usernameExists);
      } else if (raw.includes('auth/weak-password')) {
        showNotice('error', t.auth.passwordMinLength);
      } else if (raw.includes('auth/operation-not-allowed')) {
        showNotice('error', t.auth.authProviderDisabled);
      } else {
        showNotice('error', raw || t.common.errorGeneric);
      }
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (targetId: string) => {
    setFeedback(null);
    try {
      await deleteManagedUser(targetId);
      setConfirmDeleteUserId(null);
      if (editingUserId === targetId) {
        resetUserForm();
      }
      showNotice('success', t.common.successUserDeleted);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : t.common.errorGeneric);
    }
  };

  const handleDownloadMonthlyPdf = async () => {
    setDownloadingPdf(true);
    setFeedback(null);
    try {
      const selectedOfficer = officerUsers.find((u) => u.id === reportOfficerId);
      const officerLabel = selectedOfficer ? selectedOfficer.fullName : t.common.allOfficers;
      const designationLabel = selectedOfficer ? selectedOfficer.designation : undefined;

      await exportMonthlyDutyPdf({
        duties: monthlyDuties,
        month: reportMonth,
        officerLabel,
        designationLabel,
        t,
        includeOfficerColumn: reportOfficerId === 'all',
        fileName: `Duty_Register_${selectedOfficer ? selectedOfficer.username : 'All_Officers'}_${reportMonth}.pdf`,
      });
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : t.common.errorGeneric);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadDailyPdf = async () => {
    setDownloadingDailyPdf(true);
    setFeedback(null);
    try {
      const selectedOfficer = officerUsers.find((u) => u.id === approvalOfficerFilter);
      const officerLabel = selectedOfficer ? selectedOfficer.fullName : t.common.allOfficers;
      const designationLabel = selectedOfficer ? selectedOfficer.designation : undefined;
      const dateLabel = approvalDateFilter || t.pdf.allDates;
      const dateSlug = approvalDateFilter || 'All_Dates';

      await exportDailyDutyPdf({
        duties: filteredApprovalDuties,
        dateLabel,
        officerLabel,
        designationLabel,
        t,
        includeOfficerColumn: approvalOfficerFilter === 'all',
        fileName: `Daily_Duty_Register_${selectedOfficer ? selectedOfficer.username : 'All_Officers'}_${dateSlug}.pdf`,
      });
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : t.common.errorGeneric);
    } finally {
      setDownloadingDailyPdf(false);
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
              onClick={() => setActiveTab('approvals')}
              className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'approvals'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ClipboardCheck className="w-4 h-4 shrink-0" />
                <span>{t.nav.approvals}</span>
              </span>
              {pendingCount > 0 && (
                <span className="font-mono tabular-nums text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
                  {pendingCount}
                </span>
              )}
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

            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>{t.nav.userManagement}</span>
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
          <div className="text-xs sm:text-sm text-slate-600 font-medium truncate">
            <span>{t.header.secretariat}</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">
              {activeTab === 'approvals'
                ? t.nav.approvals
                : activeTab === 'monthly'
                  ? t.nav.monthlyReport
                  : t.nav.userManagement}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <LanguageSwitcher language={language} onChange={onLanguageChange} />
            <button
              type="button"
              onClick={onLogout}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
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

          {/* TAB 1: DUTY APPROVALS */}
          {activeTab === 'approvals' && (
            <section className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {t.admin.approvalsTitle}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">{t.admin.approvalsSubtitle}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={loadDuties}
                      disabled={loadingDuties}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingDuties ? 'animate-spin' : ''}`} />
                      <span>{t.common.refresh}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadDailyPdf}
                      disabled={downloadingDailyPdf}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-teal-600 bg-white hover:bg-teal-50 disabled:opacity-60 text-teal-700 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        {downloadingDailyPdf ? t.common.generatingPdf : t.admin.downloadDailyPdf}
                      </span>
                    </button>

                    {filteredSubmittedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleApproveAllFiltered}
                        disabled={approvingBatch}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {approvingBatch
                            ? t.common.approving
                            : `${t.common.approveAll} (${filteredSubmittedIds.length})`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Bar & Status / Officer / Date Filters */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={approvalSearchQuery}
                        onChange={(e) => setApprovalSearchQuery(e.target.value)}
                        placeholder={t.admin.searchPlaceholder}
                        aria-label={t.admin.searchPlaceholder}
                        className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      />
                      {approvalSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setApprovalSearchQuery('')}
                          aria-label={t.admin.clearFilters}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <select
                      value={approvalOfficerFilter}
                      onChange={(e) => setApprovalOfficerFilter(e.target.value)}
                      aria-label={t.admin.selectOfficer}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600"
                    >
                      <option value="all">{t.common.allOfficers}</option>
                      {officerUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.designation})
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={approvalDateFilter}
                      onChange={(e) => setApprovalDateFilter(e.target.value)}
                      aria-label={t.common.date}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-mono tabular-nums text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
                      {(
                        [
                          {
                            key: 'submitted',
                            label: t.admin.pendingTab,
                            count: approvalTabCounts.submitted,
                          },
                          {
                            key: 'approved',
                            label: t.admin.approvedTab,
                            count: approvalTabCounts.approved,
                          },
                          {
                            key: 'all',
                            label: t.admin.allTab,
                            count: approvalTabCounts.all,
                          },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setApprovalStatusFilter(tab.key)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            approvalStatusFilter === tab.key
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className="font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 tabular-nums">
                      <span>
                        {t.admin.matchingRecords}:{' '}
                        <strong className="text-slate-900">{filteredApprovalDuties.length}</strong>
                      </span>
                      {hasActiveApprovalFilters && (
                        <button
                          type="button"
                          onClick={clearApprovalFilters}
                          className="text-xs font-medium text-teal-700 hover:text-teal-800 underline cursor-pointer"
                        >
                          {t.admin.clearFilters}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 30-Day Officer Duty Submissions Visualization */}
              <DutySubmissionsChart
                duties={chartOfficerDuties}
                officerLabel={chartOfficerLabel}
                t={t}
              />

              {/* Approvals Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {loadingDuties && duties.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">{t.common.loading}</div>
                ) : filteredApprovalDuties.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {t.common.noSubmittedDuties}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4 w-28">{t.common.date}</th>
                          <th className="py-3 px-4 w-48">{t.common.officer}</th>
                          <th className="py-3 px-4 w-36">
                            {t.common.startTime} - {t.common.endTime}
                          </th>
                          <th className="py-3 px-4">{t.common.dutyDetails}</th>
                          <th className="py-3 px-4 w-40">{t.common.status}</th>
                          <th className="py-3 px-4 w-32 text-right">{t.common.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {filteredApprovalDuties.map((duty) => {
                          const dur = formatDuration(
                            getDurationMinutes(duty.startTime, duty.endTime),
                            t,
                          );
                          return (
                            <tr key={duty.id} className="hover:bg-slate-50/70 align-top">
                              <td className="py-3.5 px-4 font-mono tabular-nums text-xs sm:text-sm text-slate-900 whitespace-nowrap">
                                {duty.date}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-medium text-slate-900">
                                  {duty.officerName}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {duty.officerDesignation}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-mono tabular-nums text-xs sm:text-sm text-slate-900">
                                  {duty.startTime} – {duty.endTime}
                                </div>
                                <div className="text-xs text-slate-500 tabular-nums">{dur}</div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-800">
                                <p className="font-medium text-slate-900">{duty.description}</p>
                                {duty.remarks && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    {t.common.remarks}: {duty.remarks}
                                  </p>
                                )}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {duty.status === 'approved' ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>{t.statuses.approved}</span>
                                    </span>
                                    {duty.approvedByName && (
                                      <div className="text-xs text-slate-500 mt-0.5">
                                        {t.admin.approvedBy}: {duty.approvedByName}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                    <Clock className="w-4 h-4" />
                                    <span>{t.statuses.submitted}</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                {duty.status === 'submitted' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleApproveSingle(duty.id)}
                                    disabled={approvingId === duty.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>
                                      {approvingId === duty.id
                                        ? t.common.approving
                                        : t.common.approve}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 2: MONTHLY REPORTS & PDF */}
          {activeTab === 'monthly' && (
            <section className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {t.admin.monthlyReportTitle}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">{t.admin.monthlyReportSubtitle}</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadMonthlyPdf}
                    disabled={downloadingPdf}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {downloadingPdf ? t.common.generatingPdf : t.common.downloadPdf}
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={reportSearchQuery}
                      onChange={(e) => setReportSearchQuery(e.target.value)}
                      placeholder={t.admin.searchPlaceholder}
                      aria-label={t.admin.searchPlaceholder}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    />
                    {reportSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setReportSearchQuery('')}
                        aria-label={t.admin.clearFilters}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={reportOfficerId}
                    onChange={(e) => setReportOfficerId(e.target.value)}
                    aria-label={t.admin.selectOfficer}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600"
                  >
                    <option value="all">{t.common.allOfficers}</option>
                    {officerUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.designation})
                      </option>
                    ))}
                  </select>

                  <select
                    value={reportStatusFilter}
                    onChange={(e) => setReportStatusFilter(e.target.value as 'all' | DutyStatus)}
                    aria-label={t.common.status}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600"
                  >
                    <option value="all">{t.admin.statusFilterLabel}</option>
                    <option value="submitted">{t.statuses.submitted}</option>
                    <option value="approved">{t.statuses.approved}</option>
                    <option value="saved">{t.statuses.saved}</option>
                  </select>

                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    aria-label={t.common.month}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-600 tabular-nums">
                  <span>
                    {reportOfficerId === 'all'
                      ? t.common.allOfficers
                      : officerUsers.find((u) => u.id === reportOfficerId)?.fullName}
                  </span>
                  <div className="flex items-center gap-4">
                    <span>
                      {t.common.totalDuties}:{' '}
                      <strong className="text-slate-900">{monthlyDuties.length}</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>
                      {t.common.totalHours}:{' '}
                      <strong className="text-slate-900">
                        {formatDuration(monthlyTotalMinutes, t)}
                      </strong>
                    </span>
                  </div>
                </div>

                {monthlyDuties.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {t.common.noDutiesForMonth}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4 w-28">{t.common.date}</th>
                          <th className="py-3 px-4 w-44">{t.common.officer}</th>
                          <th className="py-3 px-4 w-36">
                            {t.common.startTime} - {t.common.endTime}
                          </th>
                          <th className="py-3 px-4">{t.common.dutyDetails}</th>
                          <th className="py-3 px-4 w-36">{t.common.status}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {monthlyDuties.map((duty) => (
                          <tr key={duty.id} className="hover:bg-slate-50/70 align-top">
                            <td className="py-3 px-4 font-mono tabular-nums text-xs sm:text-sm text-slate-900 whitespace-nowrap">
                              {duty.date}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900">{duty.officerName}</div>
                              <div className="text-xs text-slate-500">
                                {duty.officerDesignation}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-xs sm:text-sm text-slate-900 whitespace-nowrap">
                              {duty.startTime} – {duty.endTime}
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

          {/* TAB 3: USER MANAGEMENT (ADMIN ONLY) */}
          {activeTab === 'users' && (
            <section className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {editingUserId ? t.admin.editUserTitle : t.admin.createUserTitle}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">{t.admin.usersSubtitle}</p>
                  </div>
                  {editingUserId && (
                    <button
                      type="button"
                      onClick={resetUserForm}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {t.common.cancel}
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.common.fullName}
                    </label>
                    <input
                      type="text"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.common.username}
                    </label>
                    <input
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      disabled={Boolean(editingUserId)}
                      required={!editingUserId}
                      className="w-full rounded-lg border border-slate-300 disabled:bg-slate-100 disabled:text-slate-500 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.common.designation}
                    </label>
                    <input
                      type="text"
                      value={formDesignation}
                      onChange={(e) => setFormDesignation(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  {!editingUserId && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {t.common.password}
                      </label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.common.role}
                    </label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                    >
                      <option value="officer">{t.roles.officer}</option>
                      <option value="admin">{t.roles.admin}</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={savingUser}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>
                        {savingUser
                          ? t.common.saving
                          : editingUserId
                            ? t.admin.saveUserChangesBtn
                            : t.admin.createUserBtn}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Users Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">{t.admin.usersTitle}</h3>
                  <span className="text-xs text-slate-500 tabular-nums">{users.length}</span>
                </div>

                {loadingUsers && users.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">{t.common.loading}</div>
                ) : users.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {t.common.noUsersFound}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4">{t.common.fullName}</th>
                          <th className="py-3 px-4">{t.common.username}</th>
                          <th className="py-3 px-4">{t.common.designation}</th>
                          <th className="py-3 px-4">{t.common.role}</th>
                          <th className="py-3 px-4 text-right">{t.common.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {users.map((u) => {
                          const isSelf = u.id === user.id;
                          return (
                            <tr key={u.id} className="hover:bg-slate-50/70">
                              <td className="py-3.5 px-4 font-medium text-slate-900">
                                {u.fullName}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs sm:text-sm text-slate-700">
                                {u.username}
                              </td>
                              <td className="py-3.5 px-4 text-slate-700">{u.designation}</td>
                              <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                                {t.roles[u.role]}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                {confirmDeleteUserId === u.id ? (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 cursor-pointer"
                                    >
                                      {t.common.confirmDelete}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteUserId(null)}
                                      className="px-2 py-1 rounded border border-slate-300 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                                    >
                                      {t.common.cancel}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditUser(u)}
                                      aria-label={t.common.edit}
                                      className="p-1.5 rounded text-slate-600 hover:text-teal-700 hover:bg-teal-50 cursor-pointer"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    {!isSelf && (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteUserId(u.id)}
                                        aria-label={t.common.delete}
                                        className="p-1.5 rounded text-slate-600 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
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
