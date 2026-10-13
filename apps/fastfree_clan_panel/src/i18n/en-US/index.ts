/**
 * English is the master schema: every key the UI can show lives here, and the
 * Arabic bundle is typed against it so a missing translation is a type error
 * rather than a blank label at runtime.
 *
 * Every label is English first. The Arabic sits beside it in the template via
 * <BilingualLabel>, which renders both and sets dir="rtl" on the Arabic span.
 */
export default {
  app: {
    name: 'Clan Panel',
    tagline: 'Fleet control',
  },

  login: {
    title: 'Sign in',
    subtitle: 'Paste the panel token to continue',
    token: 'Access token',
    submit: 'Sign in',
    verifying: 'Checking token…',
    failed: 'That token was not accepted',
    hint: 'The token is the CLAN_PANEL_TOKEN environment variable of the server',
  },

  nav: {
    groups: {
      fleet: 'Fleet',
      operations: 'Operations',
      data: 'Data',
      security: 'Security',
      infrastructure: 'Infrastructure',
    },
    overview: 'Overview',
    machines: 'Machines',
    inventory: 'Inventory',
    services: 'Services',
    jobs: 'Jobs',
    build: 'Build',
    generations: 'Generations',
    backups: 'Backups',
    state: 'State',
    vars: 'Vars',
    varsHealth: 'Vars health',
    secrets: 'Secrets',
    access: 'Access',
    network: 'Network',
    monitoring: 'Monitoring',
    settings: 'Settings',
    signOut: 'Sign out',
  },

  common: {
    refresh: 'Refresh',
    loading: 'Loading…',
    empty: 'Nothing to show yet',
    error: 'Something went wrong',
    retry: 'Retry',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    run: 'Run',
    copy: 'Copy',
    copied: 'Copied',
    detail: 'Details',
    all: 'All',
    machine: 'Machine',
    status: 'Status',
    actions: 'Actions',
    duration: 'Duration',
    result: 'Result',
    never: 'Never',
    yes: 'Yes',
    no: 'No',
    unknown: 'Unknown',
    masked: '••••••••',
    experimental: 'Experimental',
    builtinTags: 'Built-in tags',
    managedBy: 'Managed by Clan',
    tokenAuthOn: 'token auth on',
  },

  status: {
    reachable: 'Reachable',
    unreachable: 'Unreachable',
    running: 'Running',
    updating: 'Updating',
    queued: 'Queued',
    succeeded: 'Succeeded',
    failed: 'Failed',
    cancelling: 'Cancelling',
    needsFix: 'Need fix',
    missing: 'Missing',
    valid: 'Valid',
  },

  overview: {
    title: 'Overview',
    needsAttention: 'Need attention',
    jobsToday: 'Jobs today',
    noRecentBackup: 'No recent backup',
    recentJobs: 'Recent jobs',
    fleetHealthy: 'Every machine answered',
    machinesCount: 'Machines',
    reachableCount: 'Reachable',
  },

  machines: {
    title: 'Machines',
    generation: 'Generation',
    lastBackup: 'Last backup',
    update: 'Update',
    updateConfirm:
      'This runs `clan machines update` against {machine}. It changes the running system.',
    detail: 'Machine detail',
  },

  machineDetail: {
    title: 'Machine detail',
    vars: 'Vars',
    secretsMasked: 'Secrets are always masked.',
    updateJob: 'Update job',
    startedAgo: 'Running · started {when}',
    cancelJob: 'Cancel job',
    copyLog: 'Copy log',
    noJob: 'No job has run for this machine yet',
  },

  inventory: {
    title: 'Inventory',
    class: 'Class',
    tags: 'Tags',
    targetHost: 'Target host',
    instances: 'Instances',
    noTarget: '—',
  },

  services: {
    title: 'Services',
    instance: 'Instance',
    module: 'Module',
    role: 'Role',
    instancesExperimental: 'Instances / Experimental',
  },

  jobs: {
    title: 'Jobs',
    everythingRun: 'Everything the panel has run',
    command: 'Command',
    started: 'Started',
    log: 'Log',
    noJobs: 'No job has run yet',
  },

  build: {
    title: 'Build',
    machine: 'Machine',
    buildHost: 'Build host',
    format: 'Format',
    dryRunOnly: 'Dry run only',
    runBuild: 'Run build',
    noResult: 'No build has run yet',
  },

  generations: {
    title: 'Generations',
    versionHistory: 'Version history of one machine',
    generation: 'Generation',
    built: 'Built',
    note: 'Note',
    none: 'No generations reported',
  },

  backups: {
    title: 'Backups',
    withBackups: 'With backups',
    without: 'Without',
    latestBackup: 'Latest backup',
    lastBackup: 'Last backup',
    createBackup: 'Create backup',
    destination: 'Destination',
    schedule: 'Schedule',
    excludes: 'Excludes',
    createConfirm: 'This starts a backup job for {machine}.',
    none: 'No backups configured',
  },

  state: {
    title: 'State',
    whatData: 'What data each service keeps',
    service: 'Service',
    folders: 'Folders',
    hooks: 'Hooks',
    none: 'This machine declares no state folders',
  },

  vars: {
    title: 'Vars',
    key: 'Key',
    scope: 'Scope',
    value: 'Value',
    secret: 'Secret',
    perMachine: 'per-machine',
    shared: 'shared',
    none: 'No vars',
  },

  varsHealth: {
    title: 'Vars health',
    machine: 'Machine',
    generator: 'Generator',
    result: 'Result',
    action: 'Action',
    check: 'Check',
    fix: 'Fix',
    fixConfirm: 'This runs `clan vars fix` for {machine}. It rewrites the vars store.',
    backUpKey:
      'Back up your age key. Losing it means every encrypted var in this repository is unreadable.',
    allValid: 'All vars are present and valid.',
  },

  secrets: {
    title: 'Secrets',
    whoCanDecrypt: 'Who can decrypt which secret',
    users: 'Users',
    groups: 'Groups',
    notAvailable: 'Not available here',
    disabledNotice:
      'Secret values are never exposed. This panel lists recipients only — `secrets get`, `secrets set` and `secrets remove` are disabled.',
  },

  access: {
    title: 'Access',
    sshAdmin: 'SSH, admin and emergency access',
    machinesWithAdmin: 'Machines with admin',
    emergencyAccess: 'Emergency access',
    caCertificates: 'CA certificates',
    sshdRole: 'sshd role',
    hostCertificate: 'Host certificate',
    adminUser: 'Admin user',
    users: 'Users',
    carefulKeys: 'Careful with authorized keys',
    carefulKeysBody:
      'Editing authorizedKeys on a remote machine can lock you out. Keep a second key and a working console.',
  },

  network: {
    title: 'Network',
    howReached: 'How each machine is reached',
    pingAll: 'Ping all',
    connectionOrder: 'Connection order',
    activeRoute: 'Active route',
    transport: 'Transport',
    roles: 'Roles',
    internet: 'Internet',
    zerotier: 'ZeroTier',
    tor: 'Tor',
    none: 'No transports reported',
  },

  monitoring: {
    title: 'Monitoring',
    clients: 'Clients',
    server: 'Server',
    grafanaEnabled: 'Grafana: {state}',
    openGrafana: 'Open Grafana',
    monitoredServices: 'Monitored services',
    ssl: 'SSL',
    notConfigured: 'Monitoring is not configured for this machine',
  },

  settings: {
    title: 'Settings',
    clanDetails: 'Clan details and panel safety',
    name: 'Name',
    description: 'Description',
    domain: 'Domain',
    panel: 'Panel',
    clanFolder: 'Clan folder',
    listensOn: 'Listens on',
    token: 'Token',
    tokenSource: 'CLAN_PANEL_TOKEN (env)',
    intentionallyDisabled: 'Intentionally disabled',
    disabledList:
      'machines install, machines delete, machines create, flash write, backups restore, vars get, vars set, secrets get/set/remove, templates apply, update --no-check',
  },
};