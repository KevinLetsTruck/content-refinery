import { create } from 'zustand';

// Types
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SourceType = 'idea' | 'guide' | 'episode' | 'product' | 'testimonial' | 'trucktales';
export type Platform = 'instagram_feed' | 'instagram_story' | 'facebook' | 'linkedin' | 'twitter' | 'tiktok';
export type ContentType = 'stat' | 'quote' | 'hook' | 'tip' | 'testimonial' | 'teaser' | 'educational';
export type PublishOption = 'now' | 'schedule' | 'queue' | 'draft';

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

export interface WizardState {
  // Navigation
  currentStep: WizardStep;
  canProceed: boolean;
  isLoading: boolean;
  
  // Step 1: Source
  sourceType: SourceType | null;
  sourceId: string | null;
  sourceContent: string;
  sourceTitle: string;
  
  // Step 2: Interview
  interviewMessages: AIMessage[];
  interviewComplete: boolean;
  interviewData: {
    primaryMessage: string;
    targetEmotion: string;
    supportingEvidence: string;
    callToAction: string;
    targetAudience: string;
    tone: string;
  };
  
  // Step 3: Content
  contentOptions: ContentOption[];
  selectedContentId: string | null;
  editedContent: string | null;
  
  // Step 4: Platforms
  platforms: PlatformConfig[];
  
  // Step 5: Visuals
  visuals: GammaVisual[];
  
  // Step 6: Review
  finalContent: {
    text: string;
    hashtags: string[];
    platforms: Platform[];
  } | null;
  complianceIssues: ComplianceIssue[];
  
  // Step 7: Publish
  publishOption: PublishOption;
  scheduledTime: Date | null;
  
  // AI Assistant
  aiPanelOpen: boolean;
  aiMessages: AIMessage[];
  aiSuggestions: { id: string; message: string; priority: 'high' | 'medium' | 'low' }[];
  
  // Actions
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  setSource: (type: SourceType, content: string, title?: string, id?: string) => void;
  
  addInterviewMessage: (message: AIMessage) => void;
  setInterviewData: (data: Partial<WizardState['interviewData']>) => void;
  completeInterview: () => void;
  
  setContentOptions: (options: ContentOption[]) => void;
  selectContent: (id: string) => void;
  editContent: (text: string) => void;
  
  togglePlatform: (platform: Platform) => void;
  setPlatformConfig: (platform: Platform, config: Partial<PlatformConfig>) => void;
  
  setVisual: (platform: Platform, visual: Partial<GammaVisual>) => void;
  
  setFinalContent: (content: WizardState['finalContent']) => void;
  setComplianceIssues: (issues: ComplianceIssue[]) => void;
  
  setPublishOption: (option: PublishOption) => void;
  setScheduledTime: (time: Date | null) => void;
  
  toggleAIPanel: () => void;
  addAIMessage: (message: AIMessage) => void;
  setAISuggestions: (suggestions: WizardState['aiSuggestions']) => void;
  
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const defaultPlatforms: PlatformConfig[] = [
  { platform: 'instagram_feed', enabled: true, format: '4:5', characterLimit: 2200, hashtagLimit: 30 },
  { platform: 'instagram_story', enabled: false, format: '9:16', characterLimit: 500, hashtagLimit: 10 },
  { platform: 'facebook', enabled: false, format: '1.91:1', characterLimit: 63206, hashtagLimit: 5 },
  { platform: 'linkedin', enabled: false, format: '1.91:1', characterLimit: 3000, hashtagLimit: 5 },
  { platform: 'twitter', enabled: false, format: '16:9', characterLimit: 280, hashtagLimit: 3 },
  { platform: 'tiktok', enabled: false, format: '9:16', characterLimit: 2200, hashtagLimit: 5 },
];

const initialState = {
  currentStep: 1 as WizardStep,
  canProceed: false,
  isLoading: false,
  
  sourceType: null,
  sourceId: null,
  sourceContent: '',
  sourceTitle: '',
  
  interviewMessages: [],
  interviewComplete: false,
  interviewData: {
    primaryMessage: '',
    targetEmotion: '',
    supportingEvidence: '',
    callToAction: '',
    targetAudience: '',
    tone: '',
  },
  
  contentOptions: [],
  selectedContentId: null,
  editedContent: null,
  
  platforms: defaultPlatforms,
  
  visuals: [],
  
  finalContent: null,
  complianceIssues: [],
  
  publishOption: 'schedule' as PublishOption,
  scheduledTime: null,
  
  aiPanelOpen: false,
  aiMessages: [],
  aiSuggestions: [],
};

export const useWizardStore = create<WizardState>((set, get) => ({
  ...initialState,
  
  setStep: (step) => set({ currentStep: step }),
  
  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < 7) {
      set({ currentStep: (currentStep + 1) as WizardStep });
    }
  },
  
  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: (currentStep - 1) as WizardStep });
    }
  },
  
  setSource: (type, content, title = '', id = undefined) => set({
    sourceType: type,
    sourceContent: content,
    sourceTitle: title,
    sourceId: id,
    canProceed: content.length > 0,
  }),
  
  addInterviewMessage: (message) => set((state) => ({
    interviewMessages: [...state.interviewMessages, message],
  })),
  
  setInterviewData: (data) => set((state) => ({
    interviewData: { ...state.interviewData, ...data },
  })),
  
  completeInterview: () => set({ interviewComplete: true, canProceed: true }),
  
  setContentOptions: (options) => set({ contentOptions: options }),
  
  selectContent: (id) => set({ selectedContentId: id, canProceed: true }),
  
  editContent: (text) => set({ editedContent: text }),
  
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
  
  setFinalContent: (content) => set({ finalContent: content }),
  
  setComplianceIssues: (issues) => set({ complianceIssues: issues }),
  
  setPublishOption: (option) => set({ publishOption: option }),
  
  setScheduledTime: (time) => set({ scheduledTime: time }),
  
  toggleAIPanel: () => set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),
  
  addAIMessage: (message) => set((state) => ({
    aiMessages: [...state.aiMessages, message],
  })),
  
  setAISuggestions: (suggestions) => set({ aiSuggestions: suggestions }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  reset: () => set(initialState),
}));
