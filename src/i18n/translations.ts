import type {DutyStatus, Language, UserRole} from '../types.ts';

export interface TranslationDictionary {
  header: {
    secretariat: string;
    title: string;
    division: string;
  };
  languages: {
    ta: string;
    en: string;
    si: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    username: string;
    usernamePlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    signIn: string;
    signingIn: string;
    logout: string;
    setupTitle: string;
    setupSubtitle: string;
    setupNotice: string;
    createAdminBtn: string;
    creatingAdmin: string;
    backToLogin: string;
    switchToSetup: string;
    invalidCredentials: string;
    requiredFields: string;
    usernameExists: string;
    passwordMinLength: string;
    authProviderDisabled: string;
    accountDisabled: string;
    firestoreOfflineNotice: string;
    retry: string;
  };
  roles: Record<UserRole, string>;
  statuses: Record<DutyStatus, string>;
  nav: {
    dailyEntry: string;
    monthlyReport: string;
    approvals: string;
    userManagement: string;
  };
  common: {
    date: string;
    month: string;
    startTime: string;
    endTime: string;
    duration: string;
    dutyDetails: string;
    remarks: string;
    remarksOptional: string;
    status: string;
    actions: string;
    add: string;
    save: string;
    saving: string;
    submit: string;
    submitting: string;
    edit: string;
    update: string;
    delete: string;
    cancel: string;
    confirmDelete: string;
    approve: string;
    approving: string;
    approveAll: string;
    refresh: string;
    downloadPdf: string;
    generatingPdf: string;
    all: string;
    officer: string;
    allOfficers: string;
    designation: string;
    fullName: string;
    username: string;
    password: string;
    newPasswordHint: string;
    role: string;
    totalDuties: string;
    totalHours: string;
    hoursShort: string;
    minutesShort: string;
    lockedApproved: string;
    noDutiesForDate: string;
    noDutiesForMonth: string;
    noSubmittedDuties: string;
    noUsersFound: string;
    loading: string;
    successSaved: string;
    successSubmitted: string;
    successUpdated: string;
    successDeleted: string;
    successApproved: string;
    successUserCreated: string;
    successUserUpdated: string;
    successUserDeleted: string;
    errorInvalidTimeRange: string;
    errorEmptyDuty: string;
    errorGeneric: string;
  };
  officer: {
    entryFormTitle: string;
    entryFormSubtitle: string;
    addAnotherDuty: string;
    saveAllEntries: string;
    recordedDutiesTitle: string;
    submitDayDuties: string;
    submittedPendingNotice: string;
    approvedLockedNotice: string;
    monthlyPreviewTitle: string;
    monthlyPreviewSubtitle: string;
  };
  admin: {
    approvalsTitle: string;
    approvalsSubtitle: string;
    pendingTab: string;
    approvedTab: string;
    allTab: string;
    approvedBy: string;
    usersTitle: string;
    usersSubtitle: string;
    createUserTitle: string;
    editUserTitle: string;
    createUserBtn: string;
    saveUserChangesBtn: string;
    deleteUserConfirm: string;
    monthlyReportTitle: string;
    monthlyReportSubtitle: string;
    selectOfficer: string;
    chartTitle: string;
    chartSubtitle: string;
    chartTotal30Days: string;
    chartPendingLabel: string;
    chartApprovedLabel: string;
    chartTotalLabel: string;
    chartNoSubmissions30Days: string;
    downloadDailyPdf: string;
    searchPlaceholder: string;
    clearFilters: string;
    matchingRecords: string;
    statusFilterLabel: string;
  };
  pdf: {
    reportTitle: string;
    dailyReportTitle: string;
    generatedOn: string;
    reportPeriod: string;
    allDates: string;
    officerDetails: string;
    summarySection: string;
    signatureOfficer: string;
    signatureAdmin: string;
    pageLabel: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  ta: {
    header: {
      secretariat: 'பிரதேச செயலகம் வவுனியா தெற்கு',
      title: 'நாளாந்த கடமை விபரம்',
      division: 'திட்டமிடல் பிரிவு',
    },
    languages: {
      ta: 'தமிழ்',
      en: 'English',
      si: 'සිංහල',
    },
    auth: {
      loginTitle: 'உள்நுழைவு',
      loginSubtitle: 'உங்கள் கணக்கு விபரங்களை உள்ளிட்டு தொடரவும்',
      username: 'யூசர் நேம்',
      usernamePlaceholder: 'யூசர் நேம் உள்ளிடவும்',
      password: 'பாஸ்வேர்ட்',
      passwordPlaceholder: 'பாஸ்வேர்ட் உள்ளிடவும்',
      signIn: 'உள்நுழைக',
      signingIn: 'சரிபார்க்கப்படுகிறது...',
      logout: 'வெளியேறு',
      setupTitle: 'ஆரம்ப நிர்வாகி கணக்கு உருவாக்கம்',
      setupSubtitle: 'முதல் தடவையாக பிரதான நிர்வாகி கணக்கை உருவாக்கவும்',
      setupNotice: 'கணினியில் இன்னும் நிர்வாகி கணக்கு உருவாக்கப்படவில்லை. முதலில் நிர்வாகி விபரங்களைப் பதிவு செய்யவும்.',
      createAdminBtn: 'நிர்வாகி கணக்கை உருவாக்குக',
      creatingAdmin: 'உருவாக்கப்படுகிறது...',
      backToLogin: 'உள்நுழைவு பக்கத்திற்குச் செல்ல',
      switchToSetup: 'முதல் தடவை நிர்வாகி அமைப்பு',
      invalidCredentials: 'தவறான யூசர் நேம் அல்லது பாஸ்வேர்ட்',
      requiredFields: 'அனைத்து கட்டாய விபரங்களையும் நிரப்பவும்',
      usernameExists: 'இந்த யூசர் நேம் ஏற்கனவே பயன்பாட்டில் உள்ளது.',
      passwordMinLength: 'பாஸ்வேர்ட் குறைந்தது 6 எழுத்துகள் கொண்டதாக இருக்க வேண்டும்.',
      authProviderDisabled: 'Firebase Console-இல் Email/Password உள்நுழைவு இயக்கப்படவில்லை.',
      accountDisabled: 'இந்தக் கணக்கு நீக்கப்பட்டது அல்லது அனுமதி இல்லை.',
      firestoreOfflineNotice:
        'Firebase Firestore தரவுத்தளத்துடன் இணைக்க முடியவில்லை. Firebase Console (vavuniyasouth-775b2)-இல் Firestore Database உருவாக்கப்பட்டு, Rules Publish செய்யப்பட்டுள்ளதா எனச் சரிபார்க்கவும்.',
      retry: 'மீண்டும் முயற்சிக்கவும்',
    },
    roles: {
      admin: 'நிர்வாகி',
      officer: 'உத்தியோகத்தர்',
    },
    statuses: {
      saved: 'சேமிக்கப்பட்டது',
      submitted: 'சமர்ப்பிக்கப்பட்டது',
      approved: 'அனுமதிக்கப்பட்டது',
    },
    nav: {
      dailyEntry: 'நாளாந்த கடமைப் பதிவு',
      monthlyReport: 'மாதாந்த அறிக்கை & PDF',
      approvals: 'கடமை அனுமதி',
      userManagement: 'பயனர் முகாமைத்துவம்',
    },
    common: {
      date: 'திகதி',
      month: 'மாதம்',
      startTime: 'ஆரம்ப நேரம்',
      endTime: 'முடிவு நேரம்',
      duration: 'கால அளவு',
      dutyDetails: 'கடமை விபரம்',
      remarks: 'குறிப்பு',
      remarksOptional: 'குறிப்பு (விருப்பத்திற்குரியது)',
      status: 'நிலை',
      actions: 'செயல்கள்',
      add: 'ADD',
      save: 'Save',
      saving: 'சேமிக்கப்படுகிறது...',
      submit: 'Submit',
      submitting: 'சமர்ப்பிக்கப்படுகிறது...',
      edit: 'திருத்து',
      update: 'புதுப்பி',
      delete: 'நீக்கு',
      cancel: 'ரத்து செய்',
      confirmDelete: 'உறுதியாக நீக்கவா?',
      approve: 'Approve',
      approving: 'அனுமதிக்கப்படுகிறது...',
      approveAll: 'அனைத்தையும் Approve செய்',
      refresh: 'புதுப்பி',
      downloadPdf: 'PDF பதிவிறக்கம்',
      generatingPdf: 'PDF தயாராகிறது...',
      all: 'அனைத்தும்',
      officer: 'உத்தியோகத்தர்',
      allOfficers: 'அனைத்து உத்தியோகத்தர்கள்',
      designation: 'பதவி',
      fullName: 'பயனர் பெயர்',
      username: 'யூசர் நேம்',
      password: 'பாஸ்வேர்ட்',
      newPasswordHint: 'புதிய பாஸ்வேர்ட் (மாற்ற விரும்பினால் மட்டும்)',
      role: 'பங்கு',
      totalDuties: 'மொத்த கடமைகள்',
      totalHours: 'மொத்த நேரம்',
      hoursShort: 'மணி',
      minutesShort: 'நிமி',
      lockedApproved: 'அனுமதிக்கப்பட்டது · பூட்டப்பட்டது',
      noDutiesForDate: 'தேர்ந்தெடுக்கப்பட்ட திகதியில் கடமைகள் எதுவும் பதிவு செய்யப்படவில்லை.',
      noDutiesForMonth: 'தேர்ந்தெடுக்கப்பட்ட மாதத்தில் கடமைப் பதிவுகள் எதுவும் இல்லை.',
      noSubmittedDuties: 'அனுமதிக்காக காத்திருக்கும் கடமைகள் எதுவும் இல்லை.',
      noUsersFound: 'பயனர்கள் எவரும் பதிவு செய்யப்படவில்லை.',
      loading: 'தரவுகள் ஏற்றப்படுகின்றன...',
      successSaved: 'கடமைகள் வெற்றிகரமாக சேமிக்கப்பட்டன.',
      successSubmitted: 'கடமைகள் நிர்வாகிக்கு சமர்ப்பிக்கப்பட்டன.',
      successUpdated: 'கடமை விபரம் புதுப்பிக்கப்பட்டது.',
      successDeleted: 'கடமைப் பதிவு நீக்கப்பட்டது.',
      successApproved: 'கடமை வெற்றிகரமாக அனுமதிக்கப்பட்டது.',
      successUserCreated: 'புதிய பயனர் உருவாக்கப்பட்டார்.',
      successUserUpdated: 'பயனர் விபரங்கள் புதுப்பிக்கப்பட்டன.',
      successUserDeleted: 'பயனர் நீக்கப்பட்டார்.',
      errorInvalidTimeRange: 'முடிவு நேரம் ஆரம்ப நேரத்தை விட அதிகமாக இருக்க வேண்டும்.',
      errorEmptyDuty: 'தயவுசெய்து கடமை விபரத்தை உள்ளிடவும்.',
      errorGeneric: 'செயல்பாட்டின் போது பிழை ஏற்பட்டது.',
    },
    officer: {
      entryFormTitle: 'புதிய நாளாந்த கடமைகளைப் பதிவு செய்தல்',
      entryFormSubtitle: 'ஒரே நாளில் பல கடமைகளைச் சேர்க்க ADD பொத்தானை அழுத்தி, பின்னர் Save மற்றும் Submit செய்யவும்.',
      addAnotherDuty: 'ADD (மற்றொரு கடமை)',
      saveAllEntries: 'Save',
      recordedDutiesTitle: 'பதிவு செய்யப்பட்ட கடமைகள்',
      submitDayDuties: 'சேமிக்கப்பட்டவற்றை Submit செய்',
      submittedPendingNotice: 'நிர்வாகியின் அனுமதிக்காக சமர்ப்பிக்கப்பட்டது. அனுமதிக்கும் வரை திருத்தலாம்.',
      approvedLockedNotice: 'நிர்வாகியால் அனுமதிக்கப்பட்டதால் இக்கடமையை திருத்தவோ நீக்கவோ முடியாது.',
      monthlyPreviewTitle: 'மாதாந்த கடமை அறிக்கை',
      monthlyPreviewSubtitle: 'மாதத்தைத் தேர்ந்தெடுத்து உங்கள் கடமை விபரங்களை PDF வடிவில் பதிவிறக்கம் செய்யவும்.',
    },
    admin: {
      approvalsTitle: 'சமர்ப்பிக்கப்பட்ட கடமைகள் & அனுமதி',
      approvalsSubtitle: 'உத்தியோகத்தர்கள் சமர்ப்பித்த நாளாந்த கடமைகளைப் பரிசீலித்து அனுமதி வழங்கவும்.',
      pendingTab: 'அனுமதிக்கப்பட வேண்டியவை',
      approvedTab: 'அனுமதிக்கப்பட்டவை',
      allTab: 'அனைத்தும்',
      approvedBy: 'அனுமதித்தவர்',
      usersTitle: 'பயனர் முகாமைத்துவம்',
      usersSubtitle: 'புதிய உத்தியோகத்தர்கள் மற்றும் பயனர்களை உருவாக்குதல், திருத்துதல் மற்றும் நீக்குதல்.',
      createUserTitle: 'புதிய பயனரை உருவாக்குக',
      editUserTitle: 'பயனர் விபரங்களைத் திருத்துக',
      createUserBtn: 'பயனரை உருவாக்கு',
      saveUserChangesBtn: 'மாற்றங்களைச் சேமி',
      deleteUserConfirm: 'இந்தப் பயனரையும் அவரது பதிவுகளையும் நீக்கவா?',
      monthlyReportTitle: 'மாதாந்த கடமை அறிக்கைகள் & PDF',
      monthlyReportSubtitle: 'மாதம் மற்றும் உத்தியோகத்தர் வாரியாக கடமை விபரங்களைப் பார்வையிட்டு PDF பதிவிறக்கவும்.',
      selectOfficer: 'உத்தியோகத்தரைத் தெரிவு செய்க',
      chartTitle: 'கடந்த 30 நாட்களில் சமர்ப்பிக்கப்பட்ட கடமைகள்',
      chartSubtitle: 'உத்தியோகத்தர்களால் தினசரி சமர்ப்பிக்கப்பட்ட கடமைகளின் எண்ணிக்கை',
      chartTotal30Days: '30 நாட்கள் மொத்தம்',
      chartPendingLabel: 'அனுமதிக்காக காத்திருப்பவை',
      chartApprovedLabel: 'அனுமதிக்கப்பட்டவை',
      chartTotalLabel: 'சமர்ப்பிக்கப்பட்டவை',
      chartNoSubmissions30Days: 'கடந்த 30 நாட்களில் சமர்ப்பிக்கப்பட்ட கடமைகள் எதுவும் இல்லை.',
      downloadDailyPdf: 'நாளாந்த PDF பதிவிறக்கம்',
      searchPlaceholder: 'உத்தியோகத்தர் பெயர், திகதி, நிலை அல்லது கடமை தேடுக...',
      clearFilters: 'வடிகட்டல்களை அழி',
      matchingRecords: 'பொருந்தும் பதிவுகள்',
      statusFilterLabel: 'அனைத்து நிலைகள்',
    },
    pdf: {
      reportTitle: 'மாதாந்த நாளாந்த கடமைப் பதிவேடு',
      dailyReportTitle: 'நாளாந்த கடமைப் பதிவேட்டு அறிக்கை',
      generatedOn: 'அறிக்கை திகதி',
      reportPeriod: 'மாதம்',
      allDates: 'அனைத்து திகதிகள்',
      officerDetails: 'உத்தியோகத்தர்',
      summarySection: 'சுருக்கம்',
      signatureOfficer: 'உத்தியோகத்தர் கையொப்பம்',
      signatureAdmin: 'திட்டமிடல் பிரிவு / நிர்வாகி கையொப்பம்',
      pageLabel: 'பக்கம்',
    },
  },
  en: {
    header: {
      secretariat: 'Divisional Secretariat Vavuniya South',
      title: 'Daily Duty Details',
      division: 'Planning Division',
    },
    languages: {
      ta: 'தமிழ்',
      en: 'English',
      si: 'සිංහල',
    },
    auth: {
      loginTitle: 'Sign In',
      loginSubtitle: 'Enter your username and password to access the register',
      username: 'Username',
      usernamePlaceholder: 'Enter username',
      password: 'Password',
      passwordPlaceholder: 'Enter password',
      signIn: 'Sign In',
      signingIn: 'Verifying...',
      logout: 'Sign Out',
      setupTitle: 'Initial Administrator Setup',
      setupSubtitle: 'Create the primary administrator account for first-time access',
      setupNotice: 'No administrator account exists yet. Complete this one-time setup to begin.',
      createAdminBtn: 'Create Admin Account',
      creatingAdmin: 'Creating...',
      backToLogin: 'Back to Sign In',
      switchToSetup: 'First-time Admin Setup',
      invalidCredentials: 'Invalid username or password',
      requiredFields: 'Please complete all required fields',
      usernameExists: 'This username is already in use.',
      passwordMinLength: 'Password must be at least 6 characters.',
      authProviderDisabled: 'Email/Password sign-in is not enabled in Firebase Console.',
      accountDisabled: 'This account has been removed or is not authorized.',
      firestoreOfflineNotice:
        'Unable to reach Firebase Firestore. Please confirm that Firestore Database is created and firestore.rules are published in Firebase Console (vavuniyasouth-775b2).',
      retry: 'Retry Connection',
    },
    roles: {
      admin: 'Admin',
      officer: 'Officer',
    },
    statuses: {
      saved: 'Saved',
      submitted: 'Submitted',
      approved: 'Approved',
    },
    nav: {
      dailyEntry: 'Daily Duty Entry',
      monthlyReport: 'Monthly Report & PDF',
      approvals: 'Duty Approvals',
      userManagement: 'User Management',
    },
    common: {
      date: 'Date',
      month: 'Month',
      startTime: 'Start Time',
      endTime: 'End Time',
      duration: 'Duration',
      dutyDetails: 'Duty Description',
      remarks: 'Remarks',
      remarksOptional: 'Remarks (Optional)',
      status: 'Status',
      actions: 'Actions',
      add: 'ADD',
      save: 'Save',
      saving: 'Saving...',
      submit: 'Submit',
      submitting: 'Submitting...',
      edit: 'Edit',
      update: 'Update',
      delete: 'Delete',
      cancel: 'Cancel',
      confirmDelete: 'Confirm delete?',
      approve: 'Approve',
      approving: 'Approving...',
      approveAll: 'Approve All',
      refresh: 'Refresh',
      downloadPdf: 'Download PDF',
      generatingPdf: 'Generating PDF...',
      all: 'All',
      officer: 'Officer',
      allOfficers: 'All Officers',
      designation: 'Designation',
      fullName: 'Full Name',
      username: 'Username',
      password: 'Password',
      newPasswordHint: 'New Password (leave blank to keep unchanged)',
      role: 'Role',
      totalDuties: 'Total Duties',
      totalHours: 'Total Hours',
      hoursShort: 'h',
      minutesShort: 'm',
      lockedApproved: 'Approved · Locked',
      noDutiesForDate: 'No duties recorded for the selected date.',
      noDutiesForMonth: 'No duties found for the selected month.',
      noSubmittedDuties: 'No duties pending approval.',
      noUsersFound: 'No users registered yet.',
      loading: 'Loading records...',
      successSaved: 'Duties saved successfully.',
      successSubmitted: 'Duties submitted to Admin.',
      successUpdated: 'Duty entry updated.',
      successDeleted: 'Duty entry deleted.',
      successApproved: 'Duty approved and locked.',
      successUserCreated: 'User account created.',
      successUserUpdated: 'User details updated.',
      successUserDeleted: 'User account deleted.',
      errorInvalidTimeRange: 'End time must be later than start time.',
      errorEmptyDuty: 'Please enter a duty description.',
      errorGeneric: 'An error occurred while processing your request.',
    },
    officer: {
      entryFormTitle: 'Record Daily Duties',
      entryFormSubtitle: 'Click ADD to add multiple duties for the day, then Save and Submit to Admin.',
      addAnotherDuty: 'ADD Duty',
      saveAllEntries: 'Save',
      recordedDutiesTitle: 'Recorded Duties',
      submitDayDuties: 'Submit Saved Duties',
      submittedPendingNotice: 'Submitted for Admin approval. Editable until approved.',
      approvedLockedNotice: 'Approved by Admin. Editing and deletion are disabled.',
      monthlyPreviewTitle: 'Monthly Duty Report',
      monthlyPreviewSubtitle: 'Select a month to inspect your records and download the official PDF.',
    },
    admin: {
      approvalsTitle: 'Submitted Duties & Approvals',
      approvalsSubtitle: 'Review daily duty submissions from officers and grant approval.',
      pendingTab: 'Pending Approval',
      approvedTab: 'Approved',
      allTab: 'All Records',
      approvedBy: 'Approved By',
      usersTitle: 'User Management',
      usersSubtitle: 'Create, edit, and remove officer and administrator accounts.',
      createUserTitle: 'Create New User',
      editUserTitle: 'Edit User Details',
      createUserBtn: 'Create User',
      saveUserChangesBtn: 'Save Changes',
      deleteUserConfirm: 'Delete this user and all their duty records?',
      monthlyReportTitle: 'Monthly Duty Reports & PDF',
      monthlyReportSubtitle: 'Filter monthly duty records by officer and export as an official PDF.',
      selectOfficer: 'Select Officer',
      chartTitle: 'Officer Duty Submissions (Last 30 Days)',
      chartSubtitle: 'Daily count of duties submitted by officers over the past 30 days',
      chartTotal30Days: '30-Day Total',
      chartPendingLabel: 'Pending Approval',
      chartApprovedLabel: 'Approved',
      chartTotalLabel: 'Total Submitted',
      chartNoSubmissions30Days: 'No duties submitted by officers in the last 30 days.',
      downloadDailyPdf: 'Export Daily PDF',
      searchPlaceholder: 'Search by officer name, date (YYYY-MM-DD), status, or duty...',
      clearFilters: 'Clear Filters',
      matchingRecords: 'Matching Records',
      statusFilterLabel: 'All Statuses',
    },
    pdf: {
      reportTitle: 'Monthly Daily Duty Register',
      dailyReportTitle: 'Official Daily Duty Register Report',
      generatedOn: 'Generated On',
      reportPeriod: 'Report Month',
      allDates: 'All Dates',
      officerDetails: 'Officer',
      summarySection: 'Summary',
      signatureOfficer: 'Officer Signature',
      signatureAdmin: 'Planning Division / Admin Signature',
      pageLabel: 'Page',
    },
  },
  si: {
    header: {
      secretariat: 'ප්‍රාදේශීය ලේකම් කාර්යාලය වවුනියාව දකුණ',
      title: 'දෛනික රාජකාරි විස්තර',
      division: 'සැලසුම් අංශය',
    },
    languages: {
      ta: 'தமிழ்',
      en: 'English',
      si: 'සිංහල',
    },
    auth: {
      loginTitle: 'පිවිසීම',
      loginSubtitle: 'ඉදිරියට යාමට ඔබගේ පරිශීලක නාමය සහ මුරපදය ඇතුළත් කරන්න',
      username: 'පරිශීලක නාමය',
      usernamePlaceholder: 'පරිශීලක නාමය ඇතුළත් කරන්න',
      password: 'මුරපදය',
      passwordPlaceholder: 'මුරපදය ඇතුළත් කරන්න',
      signIn: 'පිවිසෙන්න',
      signingIn: 'පරීක්ෂා කරමින්...',
      logout: 'පිටවන්න',
      setupTitle: 'මූලික පරිපාලක ගිණුම සැකසීම',
      setupSubtitle: 'පළමු වරට ප්‍රධාන පරිපාලක ගිණුම සාදන්න',
      setupNotice: 'තවමත් පරිපාලක ගිණුමක් සාදා නොමැත. ආරම්භ කිරීමට මෙම සැකසුම සම්පූර්ණ කරන්න.',
      createAdminBtn: 'පරිපාලක ගිණුම සාදන්න',
      creatingAdmin: 'සාදමින්...',
      backToLogin: 'පිවිසුම් පිටුවට ආපසු යන්න',
      switchToSetup: 'පළමු වර පරිපාලක සැකසුම',
      invalidCredentials: 'වැරදි පරිශීලක නාමයක් හෝ මුරපදයක්',
      requiredFields: 'කරුණාකර සියලුම අවශ්‍ය ක්ෂේත්‍ර සම්පූර්ණ කරන්න',
      usernameExists: 'මෙම පරිශීලක නාමය දැනටමත් භාවිතයේ ඇත.',
      passwordMinLength: 'මුරපදය අවම වශයෙන් අක්ෂර 6 ක් විය යුතුය.',
      authProviderDisabled: 'Firebase Console හි Email/Password පිවිසුම සක්‍රීය කර නොමැත.',
      accountDisabled: 'මෙම ගිණුම ඉවත් කර ඇත හෝ අවසර නොමැත.',
      firestoreOfflineNotice:
        'Firebase Firestore දත්ත ගබඩාවට සම්බන්ධ විය නොහැක. Firebase Console (vavuniyasouth-775b2) හි Firestore Database සාදා Rules Publish කර ඇත්දැයි පරීක්ෂා කරන්න.',
      retry: 'නැවත උත්සාහ කරන්න',
    },
    roles: {
      admin: 'පරිපාලක',
      officer: 'නිලධාරී',
    },
    statuses: {
      saved: 'සුරැකි',
      submitted: 'ඉදිරිපත් කළ',
      approved: 'අනුමත කළ',
    },
    nav: {
      dailyEntry: 'දෛනික රාජකාරි සටහන',
      monthlyReport: 'මාසික වාර්තාව & PDF',
      approvals: 'රාජකාරි අනුමැතිය',
      userManagement: 'පරිශීලක කළමනාකරණය',
    },
    common: {
      date: 'දිනය',
      month: 'මාසය',
      startTime: 'ආරම්භක වේලාව',
      endTime: 'අවසන් වේලාව',
      duration: 'කාලසීමාව',
      dutyDetails: 'රාජකාරි විස්තරය',
      remarks: 'සටහන්',
      remarksOptional: 'සටහන් (විකල්ප)',
      status: 'තත්ත්වය',
      actions: 'ක්‍රියාමාර්ග',
      add: 'ADD',
      save: 'Save',
      saving: 'සුරකිමින්...',
      submit: 'Submit',
      submitting: 'ඉදිරිපත් කරමින්...',
      edit: 'සංස්කරණය',
      update: 'යාවත්කාලීන කරන්න',
      delete: 'මකන්න',
      cancel: 'අවලංගු කරන්න',
      confirmDelete: 'මකා දැමීම තහවුරු කරන්නද?',
      approve: 'Approve',
      approving: 'අනුමත කරමින්...',
      approveAll: 'සියල්ල Approve කරන්න',
      refresh: 'නැවුම් කරන්න',
      downloadPdf: 'PDF බාගන්න',
      generatingPdf: 'PDF සකසමින්...',
      all: 'සියල්ල',
      officer: 'නිලධාරී',
      allOfficers: 'සියලුම නිලධාරීන්',
      designation: 'තනතුර',
      fullName: 'සම්පූර්ණ නම',
      username: 'පරිශීලක නාමය',
      password: 'මුරපදය',
      newPasswordHint: 'නව මුරපදය (වෙනස් කිරීමට පමණක්)',
      role: 'භූමිකාව',
      totalDuties: 'මුළු රාජකාරි',
      totalHours: 'මුළු කාලය',
      hoursShort: 'පැය',
      minutesShort: 'මිනි',
      lockedApproved: 'අනුමත කළ · අගුළු දමා ඇත',
      noDutiesForDate: 'තෝරාගත් දිනය සඳහා රාජකාරි සටහන් කර නොමැත.',
      noDutiesForMonth: 'තෝරාගත් මාසය සඳහා රාජකාරි සටහන් නොමැත.',
      noSubmittedDuties: 'අනුමැතිය සඳහා රාජකාරි නොමැත.',
      noUsersFound: 'පරිශීලකයින් ලියාපදිංචි වී නොමැත.',
      loading: 'දත්ත පූරණය වෙමින්...',
      successSaved: 'රාජකාරි සාර්ථකව සුරකින ලදී.',
      successSubmitted: 'රාජකාරි පරිපාලක වෙත ඉදිරිපත් කරන ලදී.',
      successUpdated: 'රාජකාරි විස්තර යාවත්කාලීන කරන ලදී.',
      successDeleted: 'රාජකාරි සටහන මකා දමන ලදී.',
      successApproved: 'රාජකාරිය අනුමත කර අගුළු දමන ලදී.',
      successUserCreated: 'නව පරිශීලක ගිණුම සාදන ලදී.',
      successUserUpdated: 'පරිශීලක විස්තර යාවත්කාලීන කරන ලදී.',
      successUserDeleted: 'පරිශීලක ගිණුම මකා දමන ලදී.',
      errorInvalidTimeRange: 'අවසන් වේලාව ආරම්භක වේලාවට වඩා පසුව විය යුතුය.',
      errorEmptyDuty: 'කරුණාකර රාජකාරි විස්තරය ඇතුළත් කරන්න.',
      errorGeneric: 'කාර්යය සිදු කිරීමේදී දෝෂයක් ඇති විය.',
    },
    officer: {
      entryFormTitle: 'දෛනික රාජකාරි සටහන් කිරීම',
      entryFormSubtitle: 'එක් දිනක් තුළ රාජකාරි කිහිපයක් එක් කිරීමට ADD බොත්තම ඔබා Save සහ Submit කරන්න.',
      addAnotherDuty: 'ADD (තවත් රාජකාරියක්)',
      saveAllEntries: 'Save',
      recordedDutiesTitle: 'සටහන් කළ රාජකාරි',
      submitDayDuties: 'සුරැකි රාජකාරි Submit කරන්න',
      submittedPendingNotice: 'පරිපාලකගේ අනුමැතිය සඳහා ඉදිරිපත් කර ඇත. අනුමත කරන තෙක් සංස්කරණය කළ හැක.',
      approvedLockedNotice: 'පරිපාලක විසින් අනුමත කර ඇති බැවින් සංස්කරණය කිරීමට හෝ මැකීමට නොහැක.',
      monthlyPreviewTitle: 'මාසික රාජකාරි වාර්තාව',
      monthlyPreviewSubtitle: 'මාසය තෝරා ඔබගේ රාජකාරි විස්තර PDF ලෙස බාගන්න.',
    },
    admin: {
      approvalsTitle: 'ඉදිරිපත් කළ රාජකාරි & අනුමැතිය',
      approvalsSubtitle: 'නිලධාරීන් ඉදිරිපත් කළ දෛනික රාජකාරි පරීක්ෂා කර අනුමත කරන්න.',
      pendingTab: 'අනුමැතිය බලාපොරොත්තු වන',
      approvedTab: 'අනුමත කළ',
      allTab: 'සියලුම සටහන්',
      approvedBy: 'අනුමත කළේ',
      usersTitle: 'පරිශීලක කළමනාකරණය',
      usersSubtitle: 'නව නිලධාරීන් සහ පරිපාලකයින් සෑදීම, සංස්කරණය කිරීම සහ මැකීම.',
      createUserTitle: 'නව පරිශීලකයෙකු සාදන්න',
      editUserTitle: 'පරිශීලක විස්තර සංස්කරණය කරන්න',
      createUserBtn: 'පරිශීලක සාදන්න',
      saveUserChangesBtn: 'වෙනස්කම් සුරකින්න',
      deleteUserConfirm: 'මෙම පරිශීලකයා සහ ඔහුගේ සියලුම සටහන් මකා දමන්නද?',
      monthlyReportTitle: 'මාසික රාජකාරි වාර්තා & PDF',
      monthlyReportSubtitle: 'මාසය සහ නිලධාරියා අනුව වාර්තා බලා PDF ලෙස බාගන්න.',
      selectOfficer: 'නිලධාරියා තෝරන්න',
      chartTitle: 'පසුගිය දින 30 තුළ ඉදිරිපත් කළ රාජකාරි',
      chartSubtitle: 'නිලධාරීන් විසින් දිනපතා ඉදිරිපත් කළ රාජකාරි සංඛ්‍යාව',
      chartTotal30Days: 'දින 30 මුළු ගණන',
      chartPendingLabel: 'අනුමැතිය බලාපොරොත්තු වන',
      chartApprovedLabel: 'අනුමත කළ',
      chartTotalLabel: 'මුළු ඉදිරිපත් කිරීම්',
      chartNoSubmissions30Days: 'පසුගිය දින 30 තුළ නිලධාරීන් රාජකාරි ඉදිරිපත් කර නොමැත.',
      downloadDailyPdf: 'දෛනික PDF බාගන්න',
      searchPlaceholder: 'නිලධාරී නම, දිනය, තත්ත්වය හෝ රාජකාරිය සොයන්න...',
      clearFilters: 'පෙරහන් හිස් කරන්න',
      matchingRecords: 'ගැළපෙන සටහන්',
      statusFilterLabel: 'සියලුම තත්ත්වයන්',
    },
    pdf: {
      reportTitle: 'මාසික දෛනික රාජකාරි ලේඛනය',
      dailyReportTitle: 'නිල දෛනික රාජකාරි වාර්තාව',
      generatedOn: 'නිකුත් කළ දිනය',
      reportPeriod: 'මාසය',
      allDates: 'සියලුම දිනයන්',
      officerDetails: 'නිලධාරී',
      summarySection: 'සාරාංශය',
      signatureOfficer: 'නිලධාරී අත්සන',
      signatureAdmin: 'සැලසුම් අංශය / පරිපාලක අත්සන',
      pageLabel: 'පිටුව',
    },
  },
};
