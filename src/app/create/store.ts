import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// Types
// ============================================

export type SourceType = 'quick_idea' | 'feedly' | 'guide' | 'episode' | 'product' | 'success_story' | 'trucktales';
export type WizardMode = 'quick_post' | 'campaign';
export type Platform = 'instagram_feed' | 'instagram_story' | 'facebook' | 'linkedin' | 'twitter' | 'tiktok';
export type ContentType = 'stat' | 'quote' | 'hook' | 'tip' | 'testimonial' | 'teaser' | 'educational' | 'news_commentary' | 'article';
export type ContentLength = 'short' | 'medium' | 'long' | 'article';
export type QuickIdeaType = 'idea' | 'news_article' | 'stat' | 'quote' | 'tip';
export type PublishOption = 'now' | 'schedule' | 'queue' | 'draft';

// Backward compatibility aliases
export type WizardStep = number;

export interface ContentOption {
  id: string;
  text: string;
  type: ContentType;
  emotion: string;
  cta: string;
  hashtags: string[];
}

export interface PlatformConfig {
  platform: Platform;
  enabled: boolean;
  format: string;
  characterLimit: number;
  hashtagLimit: number;
  adaptedText?: string;
}

export interface GammaVisual {
  platform: Platform;
  generationId?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  gammaUrl?: string;
  imageUrl?: string;
  exportUrl?: string;
  error?: string;
}

export interface ComplianceIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  autoFixable?: boolean;
}

export interface AIMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  actions?: { label: string; action: string }[];
}

// Campaign-specific types
export interface CampaignConfig {
  name: string;
  duration: number;
  style: string | null; // launch, education, problem_solution
  platforms: string[];
  frequency: Record<string, number>;
  includeEmail: boolean;
  emailLength: number;
  productId: string | null;
  productName: string | null;
  ctaType: string;
  ctaUrl: string | null;
  ctaText: string | null;
  // Episode-specific
  selectedExtractions?: string[];
  // Success story specific
  storyDetails?: {
    clientAlias: string;
    transformationSummary: string;
    beforeMetrics: Record<string, string>;
    afterMetrics: Record<string, string>;
  };
}

export interface ContentStrategy {
  campaignName: string;
  phases: Array<{
    name: string;
    dayRange: [number, number];
    purpose: string;
    themes: string[];
    hooks: string[];
    postsPerDay: Record<string, number>;
  }>;
  keyMessages: string[];
  landingPageCopy?: {
    headline: string;
    subhead: string;
    cta: string;
    bullets: string[];
  };
  emailSubjects?: string[];
}

export interface LandingPageConfig {
  headline: string;
  subhead: string;
  cta: string;
  bullets: string[];
  template: string;
  useGamma: boolean;
}

export interface EmailSequenceConfig {
  length: number;
  productId: string | null;
  productName: string | null;
  emails: Array<{
    day: number;
    purpose: string;
    subject: string;
    preheader?: string;
  }>;
}

export interface GeneratedCampaignContent {
  id: string;
  platform: string;
  text: string;
  variant: number;
  dayNumber?: number;
  phaseId?: string;
}

export interface StepConfig {
  number: number;
  name: string;
  path: string;
  showInProgress?: boolean;
}

// ============================================
// Defaults
// ============================================

const DEFAULT_PLATFORMS: PlatformConfig[] = [
  { platform: 'instagram_feed', enabled: true, format: '4:5', characterLimit: 2200, hashtagLimit: 30 },
  { platform: 'instagram_story', enabled: false, format: '9:16', characterLimit: 500, hashtagLimit: 10 },
  { platform: 'facebook', enabled: false, format: '1.91:1', characterLimit: 63206, hashtagLimit: 5 },
  { platform: 'linkedin', enabled: false, format: '1.91:1', characterLimit: 3000, hashtagLimit: 5 },
  { platform: 'twitter', enabled: false, format: '16:9', characterLimit: 280, hashtagLimit: 3 },
  { platform: 'tiktok', enabled: false, format: '9:16', characterLimit: 2200, hashtagLimit: 5 },
];

const DEFAULT_CAMPAIGN_CONFIG: CampaignConfig = {
  name: '',
  duration: 7,
  style: null,
  platforms: ['twitter', 'facebook', 'instagram'],
  frequency: { twitter: 2, facebook: 1, instagram: 1 },
  includeEmail: false,
  emailLength: 5,
  productId: null,
  productName: null,
  ctaType: 'email_signup',
  ctaUrl: null,
  ctaText: null,
};

const SOURCE_DEFAULTS: Record<SourceType, Partial<CampaignConfig>> = {
  guide: { duration: 14, includeEmail: true, emailLength: 5 },
  product: { duration: 7, includeEmail: false },
  episode: { duration: 5, includeEmail: false },
  quick_idea: { duration: 7, includeEmail: false },
  feedly: { duration: 7, includeEmail: false },
  success_story: { duration: 5, includeEmail: false },
  trucktales: { duration: 7, includeEmail: false },
};

// ============================================
// Store Interface
// ============================================

export interface WizardState {
  // Session
  sessionId: string | null;
  currentStep: number;
  mode: WizardMode | null;
  canProceed: boolean;
  isLoading: boolean;

  // Source
  sourceType: SourceType | null;
  sourceId: string | null;
  sourceContent: string;
  sourceTitle: string;
  sourceData: Record<string, unknown> | null;

  // Quick Idea Options
  quickIdeaType: QuickIdeaType;
  contentLength: ContentLength;

  // Campaign config (campaign mode)
  campaignConfig: CampaignConfig;

  // Interview (both modes)
  interviewMessages: AIMessage[];
  interviewAnswers: Record<string, unknown>;
  interviewComplete: boolean;
  interviewData: {
    primaryMessage: string;
    targetEmotion: string;
    supportingEvidence: string;
    callToAction: string;
    targetAudience: string;
    tone: string;
    // Guide-specific (for download_guide CTA)
    guideTitle?: string;
    guideTopic?: string;
    // Product-specific (for visit_store CTA)
    selectedProductId?: string;
    selectedProductName?: string;
    selectedProductUrl?: string;
    selectedProductPrice?: string;
  };

  // Quick landing page (for download_guide CTA in quick post mode)
  quickLandingPage: {
    generating: boolean;
    url?: string;
    gammaUrl?: string;
    guideUrl?: string;
    error?: string;
  } | null;

  // Content strategy (campaign mode)
  contentStrategy: ContentStrategy | null;

  // Content options (quick post mode)
  contentOptions: ContentOption[];
  selectedContentId: string | null;
  editedContent: string | null;

  // Generated content (campaign mode)
  generatedCampaignContent: GeneratedCampaignContent[];
  selectedVariantIds: string[];

  // Platforms
  platforms: PlatformConfig[];

  // Landing page (campaign mode)
  landingPageConfig: LandingPageConfig | null;

  // Email sequence (campaign mode)
  emailSequence: EmailSequenceConfig | null;

  // Visuals
  visuals: GammaVisual[];

  // Review
  finalContent: {
    text: string;
    hashtags: string[];
    platforms: Platform[];
  } | null;
  complianceIssues: ComplianceIssue[];

  // Publish
  publishOption: PublishOption;
  scheduledTime: Date | null;

  // AI Assistant
  aiPanelOpen: boolean;
  aiMessages: AIMessage[];
  aiSuggestions: { id: string; message: string; priority: 'high' | 'medium' | 'low' }[];

  // Actions - Session
  setSessionId: (id: string) => void;
  setMode: (mode: WizardMode) => void;

  // Actions - Navigation
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  getSteps: () => StepConfig[];

  // Actions - Source
  setSource: (type: SourceType, content: string, title?: string, id?: string, data?: Record<string, unknown>) => void;
  setQuickIdeaType: (type: QuickIdeaType) => void;
  setContentLength: (length: ContentLength) => void;

  // Actions - Campaign Config
  updateCampaignConfig: (config: Partial<CampaignConfig>) => void;

  // Actions - Interview
  addInterviewMessage: (message: AIMessage) => void;
  setInterviewAnswer: (questionId: string, answer: unknown) => void;
  setInterviewData: (data: Partial<WizardState['interviewData']>) => void;
  setInterviewComplete: (complete: boolean) => void;
  completeInterview: () => void;

  // Actions - Content Strategy
  setContentStrategy: (strategy: ContentStrategy) => void;

  // Actions - Content Options (quick post)
  setContentOptions: (options: ContentOption[]) => void;
  selectContent: (id: string) => void;
  editContent: (text: string) => void;

  // Actions - Generated Content (campaign)
  setGeneratedCampaignContent: (content: GeneratedCampaignContent[]) => void;
  toggleVariantSelection: (contentId: string) => void;

  // Actions - Platforms
  togglePlatform: (platform: Platform) => void;
  setPlatformConfig: (platform: Platform, config: Partial<PlatformConfig>) => void;

  // Actions - Landing Page
  setLandingPageConfig: (config: LandingPageConfig) => void;

  // Actions - Quick Landing Page (for download_guide CTA)
  setQuickLandingPage: (data: WizardState['quickLandingPage']) => void;

  // Actions - Email Sequence
  setEmailSequence: (sequence: EmailSequenceConfig) => void;

  // Actions - Visuals
  setVisual: (platform: Platform, visual: Partial<GammaVisual>) => void;

  // Actions - Review
  setFinalContent: (content: WizardState['finalContent']) => void;
  setComplianceIssues: (issues: ComplianceIssue[]) => void;

  // Actions - Publish
  setPublishOption: (option: PublishOption) => void;
  setScheduledTime: (time: Date | null) => void;

  // Actions - AI Panel
  toggleAIPanel: () => void;
  addAIMessage: (message: AIMessage) => void;
  setAISuggestions: (suggestions: WizardState['aiSuggestions']) => void;

  // Actions - Global
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState = {
  sessionId: null,
  currentStep: 1,
  mode: null,
  canProceed: false,
  isLoading: false,

  sourceType: null,
  sourceId: null,
  sourceContent: '',
  sourceTitle: '',
  sourceData: null,

  quickIdeaType: 'idea' as QuickIdeaType,
  contentLength: 'short' as ContentLength,

  campaignConfig: { ...DEFAULT_CAMPAIGN_CONFIG },

  interviewMessages: [],
  interviewAnswers: {},
  interviewComplete: false,
  interviewData: {
    primaryMessage: '',
    targetEmotion: '',
    supportingEvidence: '',
    callToAction: '',
    targetAudience: '',
    tone: '',
    guideTitle: '',
    guideTopic: '',
  },

  quickLandingPage: null,

  contentStrategy: null,

  contentOptions: [],
  selectedContentId: null,
  editedContent: null,

  generatedCampaignContent: [],
  selectedVariantIds: [],

  platforms: DEFAULT_PLATFORMS,

  landingPageConfig: null,

  emailSequence: null,

  visuals: [],

  finalContent: null,
  complianceIssues: [],

  publishOption: 'schedule' as PublishOption,
  scheduledTime: null,

  aiPanelOpen: false,
  aiMessages: [],
  aiSuggestions: [],
};

// ============================================
// Store
// ============================================

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Session Actions
      setSessionId: (id) => set({ sessionId: id }),

      setMode: (mode) => set({ mode }),

      // Navigation Actions
      setStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const { currentStep, getSteps } = get();
        const steps = getSteps();
        const maxStep = steps.length;
        if (currentStep < maxStep) {
          set({ currentStep: currentStep + 1 });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },

      goToStep: (step) => set({ currentStep: step }),

      getSteps: () => {
        const { mode, sourceType, campaignConfig } = get();

        // Quick post mode - original 7-step flow
        if (mode === 'quick_post') {
          return [
            { number: 1, name: 'Source', path: '/create' },
            { number: 2, name: 'Mode', path: '/create/mode' },
            { number: 3, name: 'Interview', path: '/create/interview' },
            { number: 4, name: 'Content', path: '/create/content' },
            { number: 5, name: 'Platforms', path: '/create/platforms' },
            { number: 6, name: 'Visuals', path: '/create/visuals' },
            { number: 7, name: 'Review', path: '/create/review' },
            { number: 8, name: 'Publish', path: '/create/publish' },
          ];
        }

        // Campaign mode - dynamic steps
        const steps: StepConfig[] = [
          { number: 1, name: 'Source', path: '/create' },
          { number: 2, name: 'Mode', path: '/create/mode' },
          { number: 3, name: 'Configure', path: '/create/configure' },
          { number: 4, name: 'Interview', path: '/create/interview' },
          { number: 5, name: 'Strategy', path: '/create/strategy' },
          { number: 6, name: 'Platforms', path: '/create/platforms' },
        ];

        let stepNum = 7;

        // Landing page for guide and product campaigns
        if (sourceType === 'guide' || sourceType === 'product') {
          steps.push({ number: stepNum++, name: 'Landing Page', path: '/create/landing-page' });
        }

        // Email for campaigns with email enabled
        if (campaignConfig.includeEmail) {
          steps.push({ number: stepNum++, name: 'Email', path: '/create/email' });
        }

        steps.push({ number: stepNum++, name: 'Review', path: '/create/review' });
        steps.push({ number: stepNum++, name: 'Generate', path: '/create/generate' });

        return steps;
      },

      // Source Actions
      setSource: (type, content, title = '', id = undefined, data = undefined) => {
        const defaults = SOURCE_DEFAULTS[type] || {};
        set({
          sourceType: type,
          sourceContent: content,
          sourceTitle: title,
          sourceId: id,
          sourceData: data || null,
          canProceed: content.length > 0,
          campaignConfig: {
            ...DEFAULT_CAMPAIGN_CONFIG,
            ...defaults,
            name: title ? `${title} Campaign` : '',
          },
        });
      },

      // Quick Idea Options Actions
      setQuickIdeaType: (type) => set({ quickIdeaType: type }),
      setContentLength: (length) => set({ contentLength: length }),

      // Campaign Config Actions
      updateCampaignConfig: (config) => set((state) => ({
        campaignConfig: { ...state.campaignConfig, ...config },
      })),

      // Interview Actions
      addInterviewMessage: (message) => set((state) => ({
        interviewMessages: [...state.interviewMessages, message],
      })),

      setInterviewAnswer: (questionId, answer) => set((state) => ({
        interviewAnswers: { ...state.interviewAnswers, [questionId]: answer },
      })),

      setInterviewData: (data) => set((state) => ({
        interviewData: { ...state.interviewData, ...data },
      })),

      setInterviewComplete: (complete) => set({ interviewComplete: complete }),

      completeInterview: () => set({ interviewComplete: true, canProceed: true }),

      // Content Strategy Actions
      setContentStrategy: (strategy) => set({ contentStrategy: strategy }),

      // Content Options Actions (quick post)
      setContentOptions: (options) => set({ contentOptions: options }),

      selectContent: (id) => set({ selectedContentId: id, canProceed: true }),

      editContent: (text) => set({ editedContent: text }),

      // Generated Content Actions (campaign)
      setGeneratedCampaignContent: (content) => set({ generatedCampaignContent: content }),

      toggleVariantSelection: (contentId) => set((state) => ({
        selectedVariantIds: state.selectedVariantIds.includes(contentId)
          ? state.selectedVariantIds.filter((id) => id !== contentId)
          : [...state.selectedVariantIds, contentId],
      })),

      // Platform Actions
      togglePlatform: (platform) => set((state) => ({
        platforms: state.platforms.map((p) =>
          p.platform === platform ? { ...p, enabled: !p.enabled } : p
        ),
        canProceed: state.platforms.some((p) => p.platform === platform ? !p.enabled : p.enabled),
      })),

      setPlatformConfig: (platform, config) => set((state) => ({
        platforms: state.platforms.map((p) =>
          p.platform === platform ? { ...p, ...config } : p
        ),
      })),

      // Landing Page Actions
      setLandingPageConfig: (config) => set({ landingPageConfig: config }),

      // Quick Landing Page Actions
      setQuickLandingPage: (data) => set({ quickLandingPage: data }),

      // Email Sequence Actions
      setEmailSequence: (sequence) => set({ emailSequence: sequence }),

      // Visuals Actions
      setVisual: (platform, visual) => set((state) => {
        const existing = state.visuals.find((v) => v.platform === platform);
        if (existing) {
          return {
            visuals: state.visuals.map((v) =>
              v.platform === platform ? { ...v, ...visual } : v
            ),
          };
        }
        return {
          visuals: [...state.visuals, { platform, status: 'pending', ...visual }],
        };
      }),

      // Review Actions
      setFinalContent: (content) => set({ finalContent: content }),

      setComplianceIssues: (issues) => set({ complianceIssues: issues }),

      // Publish Actions
      setPublishOption: (option) => set({ publishOption: option }),

      setScheduledTime: (time) => set({ scheduledTime: time }),

      // AI Panel Actions
      toggleAIPanel: () => set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),

      addAIMessage: (message) => set((state) => ({
        aiMessages: [...state.aiMessages, message],
      })),

      setAISuggestions: (suggestions) => set({ aiSuggestions: suggestions }),

      // Global Actions
      setLoading: (loading) => set({ isLoading: loading }),

      reset: () => set({
        ...initialState,
        platforms: [...DEFAULT_PLATFORMS],
        campaignConfig: { ...DEFAULT_CAMPAIGN_CONFIG },
      }),
    }),
    {
      name: 'content-refinery-wizard',
      partialize: (state) => ({
        sessionId: state.sessionId,
        currentStep: state.currentStep,
        mode: state.mode,
        sourceType: state.sourceType,
        sourceId: state.sourceId,
        sourceContent: state.sourceContent,
        sourceTitle: state.sourceTitle,
        sourceData: state.sourceData,
        campaignConfig: state.campaignConfig,
        interviewAnswers: state.interviewAnswers,
        interviewComplete: state.interviewComplete,
        contentStrategy: state.contentStrategy,
        landingPageConfig: state.landingPageConfig,
        emailSequence: state.emailSequence,
      }),
    }
  )
);
