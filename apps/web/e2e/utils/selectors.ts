/**
 * Common selectors for Olympus E2E tests
 *
 * Centralized test selectors using semantic selectors and data-testid attributes.
 * Prefer semantic selectors (getByRole, getByLabel) over CSS selectors.
 */

/**
 * Authentication selectors
 */
export const auth = {
  // Login page
  loginEmailInput: '[name="email"]',
  loginPasswordInput: '[name="password"]',
  loginSubmitButton: 'button[type="submit"]',
  loginErrorMessage: '[data-testid="login-error"]',

  // Signup page
  signupNameInput: '[name="name"]',
  signupEmailInput: '[name="email"]',
  signupPasswordInput: '[name="password"]',
  signupConfirmPasswordInput: '[name="confirmPassword"]',
  signupSubmitButton: 'button[type="submit"]',

  // Password reset
  forgotPasswordLink: 'a[href="/forgot-password"]',
  resetPasswordEmailInput: '[name="email"]',
  resetPasswordSubmitButton: 'button[type="submit"]',

  // User menu
  userMenu: '[data-testid="user-menu"]',
  userMenuButton: '[data-testid="user-menu-button"]',
  logoutButton: '[data-testid="logout-button"]',
} as const;

/**
 * Navigation selectors
 */
export const navigation = {
  // Sidebar
  sidebar: '[data-testid="app-sidebar"]',
  sidebarToggle: '[data-testid="sidebar-toggle"]',

  // Main nav items
  dashboardLink: '[href="/dashboard"]',
  spacesLink: '[href="/spaces"]',
  documentsLink: '[href="/documents"]',
  threadsLink: '[href="/threads"]',

  // Breadcrumbs
  breadcrumbs: '[data-testid="breadcrumbs"]',
  breadcrumbItem: '[data-testid="breadcrumb-item"]',
} as const;

/**
 * Spaces selectors
 */
export const spaces = {
  // Space list
  spaceList: '[data-testid="space-list"]',
  spaceCard: '[data-testid="space-card"]',
  spaceCardTitle: '[data-testid="space-card-title"]',
  spaceCardDocumentCount: '[data-testid="space-card-document-count"]',
  createSpaceButton: '[data-testid="create-space-button"]',

  // Space form
  spaceNameInput: '[name="name"]',
  spaceDescriptionInput: '[name="description"]',
  spaceSubmitButton: 'button[type="submit"]',

  // Space detail
  spaceDetailHeader: '[data-testid="space-detail-header"]',
  spaceDetailTitle: '[data-testid="space-detail-title"]',
  spaceDetailDescription: '[data-testid="space-detail-description"]',

  // Space members
  spaceMembersList: '[data-testid="space-members-list"]',
  inviteMemberButton: '[data-testid="invite-member-button"]',
} as const;

/**
 * Documents selectors
 */
export const documents = {
  // Document list
  documentList: '[data-testid="document-list"]',
  documentListItem: '[data-testid="document-list-item"]',
  documentTitle: '[data-testid="document-title"]',
  documentStatus: '[data-testid="document-status"]',
  uploadButton: '[data-testid="upload-button"]',

  // Document upload
  fileInput: 'input[type="file"]',
  uploadForm: '[data-testid="upload-form"]',
  uploadProgress: '[data-testid="upload-progress"]',
  uploadSuccessMessage: '[data-testid="upload-success"]',
  uploadErrorMessage: '[data-testid="upload-error"]',

  // Document viewer
  documentViewer: '[data-testid="document-viewer"]',
  documentContent: '[data-testid="document-content"]',
  documentMetadata: '[data-testid="document-metadata"]',

  // Document actions
  deleteDocumentButton: '[data-testid="delete-document-button"]',
  downloadDocumentButton: '[data-testid="download-document-button"]',
} as const;

/**
 * Threads (AI chat) selectors
 */
export const threads = {
  // Thread list
  threadList: '[data-testid="thread-list"]',
  threadListItem: '[data-testid="thread-item"]',
  newThreadButton: '[data-testid="new-thread-button"]',

  // Thread chat
  threadInput: '[data-testid="thread-input"]',
  threadSubmitButton: '[data-testid="thread-submit-button"]',
  threadMessages: '[data-testid="thread-messages"]',
  threadMessage: '[data-testid="thread-message"]',

  // Streaming response
  streamingResponse: '[data-testid="streaming-response"]',
  streamingIndicator: '[data-testid="streaming-indicator"]',
  responseComplete: '[data-testid="response-complete"]',

  // Citations
  citationBadge: '[data-testid="citation-badge"]',
  citationList: '[data-testid="citation-list"]',
  citationItem: '[data-testid="citation-item"]',

  // Confidence score
  confidenceScore: '[data-testid="confidence-score"]',
} as const;

/**
 * Organizations selectors
 */
export const organizations = {
  // Organization list
  organizationList: '[data-testid="organization-list"]',
  organizationCard: '[data-testid="organization-card"]',
  createOrganizationButton: '[data-testid="create-organization-button"]',

  // Organization settings
  organizationSettings: '[data-testid="organization-settings"]',
  organizationNameInput: '[name="organizationName"]',
  organizationSlugInput: '[name="organizationSlug"]',

  // Organization members
  membersList: '[data-testid="members-list"]',
  memberListItem: '[data-testid="member-list-item"]',
  inviteMemberButton: '[data-testid="invite-member-button"]',
  removeMemberButton: '[data-testid="remove-member-button"]',
} as const;

/**
 * Common UI component selectors
 */
export const common = {
  // Buttons
  primaryButton: 'button[data-variant="primary"]',
  secondaryButton: 'button[data-variant="secondary"]',
  dangerButton: 'button[data-variant="danger"]',

  // Forms
  submitButton: 'button[type="submit"]',
  cancelButton: '[data-testid="cancel-button"]',
  formError: '[data-testid="form-error"]',
  fieldError: '[data-testid="field-error"]',

  // Modals
  modal: '[role="dialog"]',
  modalTitle: '[data-testid="modal-title"]',
  modalClose: '[data-testid="modal-close"]',
  modalConfirm: '[data-testid="modal-confirm"]',
  modalCancel: '[data-testid="modal-cancel"]',

  // Toasts/Notifications
  toast: '[data-testid="toast"]',
  toastSuccess: '[data-testid="toast-success"]',
  toastError: '[data-testid="toast-error"]',
  toastWarning: '[data-testid="toast-warning"]',

  // Loading states
  loading: '[data-testid="loading"]',
  skeleton: '[data-testid="skeleton"]',
  spinner: '[data-testid="spinner"]',

  // Empty states
  emptyState: '[data-testid="empty-state"]',
  emptyStateMessage: '[data-testid="empty-state-message"]',
} as const;

/**
 * Helper to create semantic selectors
 *
 * Use these helpers to create accessible selectors that follow best practices.
 */
export const helpers = {
  /**
   * Get button by text content
   * @param text - Button text
   */
  buttonByText: (text: string) => `button:has-text("${text}")`,

  /**
   * Get link by text content
   * @param text - Link text
   */
  linkByText: (text: string) => `a:has-text("${text}")`,

  /**
   * Get heading by text content
   * @param text - Heading text
   */
  headingByText: (text: string) =>
    `h1:has-text("${text}"), h2:has-text("${text}"), h3:has-text("${text}")`,

  /**
   * Get input by label text
   * @param label - Label text
   */
  inputByLabel: (label: string) => `label:has-text("${label}") input`,

  /**
   * Get element by test ID
   * @param testId - data-testid value
   */
  byTestId: (testId: string) => `[data-testid="${testId}"]`,

  /**
   * Get element by role and name
   * @param role - ARIA role
   * @param name - Accessible name
   */
  byRoleAndName: (role: string, name: string) =>
    `[role="${role}"][aria-label="${name}"]`,
} as const;

/**
 * Semantic selector utilities
 *
 * These provide type-safe wrappers around Playwright's semantic selectors.
 * Prefer using page.getByRole(), page.getByLabel(), etc. directly in tests.
 */
export const semantic = {
  /**
   * Common roles for semantic selectors
   */
  roles: {
    button: 'button',
    link: 'link',
    heading: 'heading',
    textbox: 'textbox',
    checkbox: 'checkbox',
    radio: 'radio',
    listitem: 'listitem',
    list: 'list',
    navigation: 'navigation',
    main: 'main',
    dialog: 'dialog',
    alert: 'alert',
  },

  /**
   * Common test ID patterns
   */
  testIdPatterns: {
    list: (entity: string) => `${entity}-list`,
    item: (entity: string) => `${entity}-item`,
    button: (action: string) => `${action}-button`,
    form: (name: string) => `${name}-form`,
    error: (field: string) => `${field}-error`,
  },
} as const;
