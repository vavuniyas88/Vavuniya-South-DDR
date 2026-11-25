import {Eye, EyeOff, Landmark, Lock, ShieldCheck, User as UserIcon} from 'lucide-react';
import {motion, useReducedMotion} from 'motion/react';
import {useEffect, useState, type FormEvent} from 'react';
import type {TranslationDictionary} from '../i18n/translations.ts';
import {setupInitialAdmin, signInWithUsername} from '../services/firestoreRegistry.ts';
import type {Language, User} from '../types.ts';
import {AnimatedBackground} from './AnimatedBackground.tsx';
import {LanguageSwitcher} from './LanguageSwitcher.tsx';

interface LoginPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  t: TranslationDictionary;
  needsSetup: boolean;
  initialError?: string | null;
  onRetryConnection?: () => Promise<void>;
  onAuthSuccess: (user: User) => void;
}

function mapAuthError(err: unknown, t: TranslationDictionary): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (
    raw === 'INVALID_CREDENTIALS' ||
    raw.includes('auth/invalid-credential') ||
    raw.includes('auth/user-not-found') ||
    raw.includes('auth/wrong-password')
  ) {
    return t.auth.invalidCredentials;
  }
  if (raw === 'REQUIRED_FIELDS' || raw === 'INVALID_SETUP_INPUT') {
    return t.auth.requiredFields;
  }
  if (raw.includes('auth/email-already-in-use')) {
    return t.auth.usernameExists;
  }
  if (raw.includes('auth/weak-password')) {
    return t.auth.passwordMinLength;
  }
  if (raw.includes('auth/operation-not-allowed')) {
    return t.auth.authProviderDisabled;
  }
  if (raw === 'ACCOUNT_DISABLED') {
    return t.auth.accountDisabled;
  }
  if (
    raw.includes('client is offline') ||
    raw.includes('Missing or insufficient permissions') ||
    raw.includes('unavailable')
  ) {
    return t.auth.firestoreOfflineNotice;
  }
  return raw || t.common.errorGeneric;
}

export function LoginPage({
  language,
  onLanguageChange,
  t,
  needsSetup,
  initialError = null,
  onRetryConnection,
  onAuthSuccess,
}: LoginPageProps) {
  const prefersReducedMotion = useReducedMotion();
  const [setupMode, setSetupMode] = useState(needsSetup);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? mapAuthError(initialError, t) : null,
  );

  useEffect(() => {
    setSetupMode(needsSetup);
  }, [needsSetup]);

  useEffect(() => {
    if (initialError) {
      setError(mapAuthError(initialError, t));
    } else {
      setError(null);
    }
  }, [initialError, t]);

  const handleRetry = async () => {
    if (!onRetryConnection) {
      return;
    }
    setRetrying(true);
    try {
      await onRetryConnection();
    } finally {
      setRetrying(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError(t.auth.requiredFields);
      return;
    }

    setLoading(true);
    try {
      const signedInUser = await signInWithUsername(username.trim(), password);
      onAuthSuccess(signedInUser);
    } catch (err) {
      setError(mapAuthError(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !username.trim() || !designation.trim() || !password) {
      setError(t.auth.requiredFields);
      return;
    }
    if (password.length < 6) {
      setError(t.auth.passwordMinLength);
      return;
    }

    setLoading(true);
    try {
      const adminUser = await setupInitialAdmin({
        fullName: fullName.trim(),
        username: username.trim(),
        designation: designation.trim(),
        password,
      });
      onAuthSuccess(adminUser);
    } catch (err) {
      setError(mapAuthError(err, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-slate-100 overflow-x-hidden">
      <AnimatedBackground />

      {/* Top Bar with Language Switcher */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-end">
        <LanguageSwitcher
          language={language}
          onChange={onLanguageChange}
          variant="dark"
        />
      </header>

      {/* Center Content: Official Header + Square Login Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6">
        <motion.div
          initial={prefersReducedMotion ? false : {opacity: 0, y: 14}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.35, ease: [0.16, 1, 0.3, 1]}}
          className="text-center max-w-2xl mx-auto mb-8"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-400/30 text-teal-300 mb-4">
            <Landmark className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug text-balance">
            {t.header.secretariat}
          </h1>
          <p className="mt-2 text-lg sm:text-xl font-semibold text-teal-300 tracking-wide">
            {t.header.title}
          </p>
          <p className="mt-1 text-sm sm:text-base font-medium text-amber-300/95">
            {t.header.division}
          </p>
        </motion.div>

        {/* Square / Compact Auth Card */}
        <motion.div
          initial={prefersReducedMotion ? false : {opacity: 0, y: 18, scale: 0.98}}
          animate={{opacity: 1, y: 0, scale: 1}}
          transition={{duration: 0.4, delay: 0.06, ease: [0.16, 1, 0.3, 1]}}
          className="w-full max-w-[420px] bg-slate-900/85 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-7 shadow-2xl"
        >
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              {setupMode ? t.auth.setupTitle : t.auth.loginTitle}
            </h2>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              {setupMode ? t.auth.setupSubtitle : t.auth.loginSubtitle}
            </p>
          </div>

          {needsSetup && setupMode && (
            <div className="mb-4 rounded-lg bg-teal-950/60 border border-teal-700/60 px-3.5 py-2.5 text-xs text-teal-200 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>{t.auth.setupNotice}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-950/70 border border-red-700/70 px-3.5 py-2.5 text-xs text-red-200 break-words space-y-2"
            >
              <div>{error}</div>
              {initialError && onRetryConnection && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex items-center px-2.5 py-1 rounded bg-red-800/70 hover:bg-red-700/80 text-white text-[11px] font-medium cursor-pointer"
                >
                  {retrying ? t.common.loading : t.auth.retry}
                </button>
              )}
            </div>
          )}

          {setupMode ? (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1.5">
                  {t.common.fullName}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1.5">
                  {t.common.designation}
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1.5">
                  {t.auth.username}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1.5">
                  {t.auth.password}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                {loading ? t.auth.creatingAdmin : t.auth.createAdminBtn}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSetupMode(false);
                }}
                className="w-full text-center text-xs text-slate-300 hover:text-white py-1"
              >
                {t.auth.backToLogin}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-medium text-slate-200 mb-1.5"
                >
                  {t.auth.username}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.auth.usernamePlaceholder}
                    autoComplete="username"
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-slate-200 mb-1.5"
                >
                  {t.auth.password}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.auth.passwordPlaceholder}
                    autoComplete="current-password"
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                {loading ? t.auth.signingIn : t.auth.signIn}
              </button>

              {needsSetup && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSetupMode(true);
                  }}
                  className="w-full text-center text-xs text-teal-300 hover:text-teal-200 py-1 font-medium"
                >
                  {t.auth.switchToSetup}
                </button>
              )}
            </form>
          )}
        </motion.div>
      </main>

      <footer className="relative z-10 py-4 px-6 text-center text-xs text-slate-300/90 space-y-1">
        <div>{t.header.secretariat} · {t.header.division}</div>
        <div className="text-slate-400">Design by :Theesan Published :2026</div>
      </footer>
    </div>
  );
}
