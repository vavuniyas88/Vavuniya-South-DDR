import {onAuthStateChanged} from 'firebase/auth';
import {useCallback, useEffect, useState} from 'react';
import {AdminDashboard} from './components/AdminDashboard.tsx';
import {LoginPage} from './components/LoginPage.tsx';
import {OfficerDashboard} from './components/OfficerDashboard.tsx';
import {auth} from './firebase.ts';
import {translations} from './i18n/translations.ts';
import {
  checkNeedsInitialSetup,
  fetchUserProfile,
  isSetupMutationInProgress,
  signOutCurrentUser,
} from './services/firestoreRegistry.ts';
import type {Language, User} from './types.ts';

export default function App() {
  const [language, setLanguage] = useState<Language>('ta');
  const [user, setUser] = useState<User | null>(null);
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  const t = translations[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const refreshSetupStatus = useCallback(async () => {
    try {
      const needed = await checkNeedsInitialSetup();
      setNeedsSetup(needed);
      setSetupError(null);
    } catch (err) {
      setNeedsSetup(false);
      setSetupError(err instanceof Error ? err.message : t.common.errorGeneric);
    }
  }, [t.common.errorGeneric]);

  useEffect(() => {
    let active = true;

    const fallbackTimer = window.setTimeout(() => {
      if (active) {
        setCheckingStatus(false);
      }
    }, 3500);

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) {
        return;
      }
      if (isSetupMutationInProgress()) {
        return;
      }

      if (!fbUser) {
        setUser(null);
        setCheckingStatus(false);
        void refreshSetupStatus();
        return;
      }

      try {
        const profile = await fetchUserProfile(fbUser.uid);
        if (!active) {
          return;
        }
        if (!profile) {
          await signOutCurrentUser();
          setUser(null);
          void refreshSetupStatus();
        } else {
          setUser(profile);
          setNeedsSetup(false);
          setSetupError(null);
        }
      } catch (err) {
        if (active) {
          setUser(null);
          setSetupError(err instanceof Error ? err.message : t.common.errorGeneric);
        }
      } finally {
        if (active) {
          setCheckingStatus(false);
        }
      }
    });

    return () => {
      active = false;
      window.clearTimeout(fallbackTimer);
      unsub();
    };
  }, [refreshSetupStatus, t.common.errorGeneric]);

  const handleAuthSuccess = (nextUser: User) => {
    setUser(nextUser);
    setNeedsSetup(false);
    setSetupError(null);
  };

  const handleLogout = async () => {
    await signOutCurrentUser();
    setUser(null);
    await refreshSetupStatus();
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-sm">
        {t.common.loading}
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        language={language}
        onLanguageChange={setLanguage}
        t={t}
        needsSetup={needsSetup}
        initialError={setupError}
        onRetryConnection={refreshSetupStatus}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  if (user.role === 'admin') {
    return (
      <AdminDashboard
        user={user}
        language={language}
        onLanguageChange={setLanguage}
        t={t}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <OfficerDashboard
      user={user}
      language={language}
      onLanguageChange={setLanguage}
      t={t}
      onLogout={handleLogout}
    />
  );
}
