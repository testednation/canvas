import {
  downloadDesignImage,
  downloadDesignPdf,
  downloadDesignSvg,
  downloadDesignVideo,
  downloadProjectJson,
  downloadStoryboardSheet,
  eraseImageBackground,
  generateNativePageSvg,
} from './exporter';
import {
  getFrameClipPathCss,
  getGridCellRects,
  getImageFilterCss,
  ICONS,
  renderChartSvg,
  renderConnectorSvg,
  renderCurvedTextSvg,
  renderQrSvg,
  renderShapeSvg,
  renderStickerSvg,
  renderTableSvg,
} from './icons';
import {
  BUILTIN_STUDIO_VISUALS,
  COLOR_SWATCHES,
  createDefaultProject,
  DEFAULT_BRAND_KIT,
  GRADIENT_PRESETS,
  STUDIO_FONTS,
  TEMPLATE_PRESETS,
} from './templates';
import {
  AnimationKind,
  BlendModeKind,
  BrandKit,
  CanvasComment,
  ChartKind,
  ConnectorStyleKind,
  DesignElement,
  DesignPage,
  DesignProject,
  FilterPresetKind,
  FrameShapeKind,
  GridLayoutKind,
  PageAnimationPresetKind,
  PageTransitionKind,
  ProjectCheckpoint,
  ShapeKind,
  StickerKind,
  StudioLocaleKind,
  TemplatePreset,
  TextDirectionKind,
  TextEffectKind,
  TextListStyleKind,
  TextTransformKind,
  UploadedAsset,
} from './types';

const STORAGE_KEYS = {
  PROJECTS: 'canvascraft_projects_v1',
  ACTIVE_PROJECT_ID: 'canvascraft_active_project_v1',
  UPLOADS: 'canvascraft_uploads_v1',
  BRAND_KIT: 'canvascraft_brand_kit_v1',
  THEME: 'canvascraft_theme_v1',
  LOCALE: 'canvascraft_locale_v1',
};

interface LocaleMeta {
  code: StudioLocaleKind;
  name: string;
  nativeLabel: string;
  dir: 'ltr' | 'rtl';
  defaultFont: string;
  sampleHeading: string;
  sampleSubheading: string;
  navStudio: string;
  navTemplates: string;
  navProjects: string;
  navBrand: string;
  exportBtn: string;
}

const STUDIO_LOCALES: Record<StudioLocaleKind, LocaleMeta> = {
  en: {
    code: 'en',
    name: 'English',
    nativeLabel: 'English (LTR)',
    dir: 'ltr',
    defaultFont: 'Bricolage Grotesque',
    sampleHeading: 'Bold Visual Headline',
    sampleSubheading: 'Structured studio subheading for clarity',
    navStudio: 'Studio Workspace',
    navTemplates: 'Template Gallery',
    navProjects: 'Saved Projects',
    navBrand: 'Brand Kit',
    exportBtn: 'Export Design',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeLabel: 'العربية (Arabic · RTL)',
    dir: 'rtl',
    defaultFont: 'Cairo',
    sampleHeading: 'تصميم إبداعي بلا حدود',
    sampleSubheading: 'مساحة عمل احترافية لتصميم الشعارات والعروض التقديمية بالعربية',
    navStudio: 'مساحة التصميم',
    navTemplates: 'معرض القوالب',
    navProjects: 'المشاريع المحفوظة',
    navBrand: 'الهوية البصرية',
    exportBtn: 'تصدير التصميم',
  },
  he: {
    code: 'he',
    name: 'Hebrew',
    nativeLabel: 'עברית (Hebrew · RTL)',
    dir: 'rtl',
    defaultFont: 'Heebo',
    sampleHeading: 'עיצוב יצירתי ללא גבולות',
    sampleSubheading: 'סטודיו מקצועי לעיצוב גרפי, מצגות וטיפוגרפיה דו-כיוונית',
    navStudio: 'סביבת עבודה',
    navTemplates: 'גלריית תבניות',
    navProjects: 'פרויקטים שמורים',
    navBrand: 'ערכת מותג',
    exportBtn: 'ייצוא עיצוב',
  },
  fa: {
    code: 'fa',
    name: 'Persian',
    nativeLabel: 'فارسی (Persian · RTL)',
    dir: 'rtl',
    defaultFont: 'Vazirmatn',
    sampleHeading: 'طراحی خلاقانه بدون مرز',
    sampleSubheading: 'استودیوی حرفه‌ای طراحی گرافیک و تایپوگرافی فارسی در مرورگر',
    navStudio: 'محیط طراحی',
    navTemplates: 'گالری قالب‌ها',
    navProjects: 'پروژه‌های ذخیره‌شده',
    navBrand: 'کیت برند',
    exportBtn: 'خروجی طرح',
  },
  ur: {
    code: 'ur',
    name: 'Urdu',
    nativeLabel: 'اردو (Urdu · RTL)',
    dir: 'rtl',
    defaultFont: 'Noto Naskh Arabic',
    sampleHeading: 'بے مثال تخلیقی ڈیزائن اسٹوڈیو',
    sampleSubheading: 'اردو ٹائپوگرافی اور جدید گرافک ڈیزائن کے لیے مکمل ورک اسپیس',
    navStudio: 'اسٹوڈیو ورک اسپیس',
    navTemplates: 'ٹیمپلیٹ گیلری',
    navProjects: 'محفوظ پراجیکٹس',
    navBrand: 'برانڈ کٹ',
    exportBtn: 'ڈیزائن ایکسپورٹ',
  },
};

type NavView = 'studio' | 'templates' | 'projects' | 'brand';
type SidebarTab =
  | 'templates'
  | 'elements'
  | 'text'
  | 'charts'
  | 'apps'
  | 'uploads'
  | 'draw'
  | 'background'
  | 'layers';

interface HistoryEntry {
  id: string;
  label: string;
  timestamp: number;
  pagesJson: string;
  activePageIndex: number;
  width: number;
  height: number;
  elementCount: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  targetElementId: string | null;
}

export class CanvasCraftStudio {
  private root: HTMLElement;
  private projects: DesignProject[] = [];
  private activeProject!: DesignProject;
  private activePageIndex = 0;

  // Single & Multi-Selection State
  private selectedElementId: string | null = null;
  private selectedElementIds: string[] = [];
  private editingTextId: string | null = null;

  private activeNav: NavView = 'studio';
  private activeSidebarTab: SidebarTab = 'elements';
  private templateFilter: 'All' | 'Social' | 'Presentation' | 'Poster' | 'Marketing' = 'All';
  private templateSearch = '';

  private uploads: UploadedAsset[] = [];
  private brandKit: BrandKit = { ...DEFAULT_BRAND_KIT };
  private isDarkTheme = true;
  private studioLocale: StudioLocaleKind = 'en';

  // Viewport, Zoom & Alignment Toolbar State
  private zoom = 0.52;
  private snapLines: { x?: number; y?: number } = {};
  private snapGuideTimer: number | null = null;
  private alignRelativeTo: 'canvas' | 'canvas-group' | 'selection' = 'canvas';
  private draggedSidebarItem: Partial<DesignElement> | null = null;
  private paletteShapeColor: string | null = null;

  // Rulers, Custom Draggable/Clickable Guides, Print Bleed & Eyedropper
  private showRulers = true;
  private showPrintBleed = false;
  private customGuides: { x: number[]; y: number[] } = { x: [], y: [] };
  private activeDraggingGuide: { axis: 'x' | 'y'; index: number; pos: number } | null = null;
  private guidePresetStep = 0;

  // Slide Grid View, Speaker Notes & Presentation Timer
  private showGridViewModal = false;
  private showNotesDrawer = false;
  private presStartTime = 0;
  private presTimerInterval: number | null = null;

  // Custom Gradient Builder & QR Builder State
  private customGradStart = '#4f46e5';
  private customGradEnd = '#ec4899';
  private customGradAngle = 135;
  private qrDraftUrl = 'https://canvascraft.studio';
  private qrDraftFg = '#0f172a';
  private qrDraftBg = '#ffffff';
  private magicResizeScaleElements = true;

  // Dedicated Layers Panel State
  private showRightLayersPanel = true;
  private layerSearchQuery = '';
  private layerFilter: 'all' | 'visible' | 'hidden' | 'locked' = 'all';
  private draggedLayerId: string | null = null;

  // Clipboard State for Copy / Cut / Paste & Copy Style
  private clipboardElement: DesignElement | null = null;
  private copiedStyle: Partial<DesignElement> | null = null;
  private pasteOffsetStep = 0;

  // Right-Click Context Menu
  private contextMenu: ContextMenuState | null = null;

  // Freehand Drawing Mode & Interactive Click-on-Canvas Text Tool Mode
  private isDrawingMode = false;
  private isTextPlacementMode = false;
  private textToolFontFamily = 'Plus Jakarta Sans';
  private textToolFontSize = 48;
  private textToolColor = '#f8fafc';
  private textToolFontWeight = 700;
  private textToolFontStyle: 'normal' | 'italic' = 'normal';
  private textToolDecoration: 'none' | 'underline' = 'none';
  private textToolAlign: 'left' | 'center' | 'right' = 'left';
  private textToolDraftText = 'Editable Text Layer';
  private brushColor = '#4f46e5';
  private brushWidth = 8;
  private brushOpacity = 1;
  private activeDrawingElement: DesignElement | null = null;

  // Fullscreen Presentation Mode
  private isPresenting = false;
  private laserActive = false;
  private laserPos: { x: number; y: number } | null = null;

  // Modals & Toasts
  private showExportModal = false;
  private exportFormat: 'png' | 'svg' = 'png';
  private exportScale: 1 | 2 | 3 = 1;
  private exportTransparentBg = false;
  private exportIncludeCropMarks = false;
  private exportCustomFilename = '';
  private showResizeModal = false;
  private showHistoryModal = false;
  private showShortcutsModal = false;
  private showBulkCreateModal = false;
  private lastShortcutTriggered: string | null = null;
  private isExporting = false;
  private toastMessage: string | null = null;
  private toastTimer: number | null = null;

  // On-Canvas Sticky Notes / Pin Comments State
  private isCommentPinMode = false;
  private activeCommentId: string | null = null;

  // Smart Connectors Draft State
  private connectorDraftFromId = '';
  private connectorDraftToId = '';
  private connectorDraftStyle: ConnectorStyleKind = 'elbow';
  private connectorDraftLabel = 'Flow';

  // Bulk Create / Data-Driven Merge State
  private bulkDatasetColumns: string[] = ['Name', 'Role', 'Company'];
  private bulkDatasetRows: string[][] = [
    ['Amina Al-Mansoor', 'Principal Product Designer', 'CanvasCraft Labs'],
    ['Marcus Vance', 'VP of Brand Architecture', 'Nordic Visuals'],
    ['Elena Rostova', 'Creative Director', 'Solstice Studio'],
  ];

  // Undo / Redo History Command Stack
  private history: HistoryEntry[] = [];
  private historyIndex = -1;

  constructor(rootElement: HTMLElement) {
    this.root = rootElement;
    this.loadFromLocalStorage();
    this.pushHistorySnapshot();
    this.attachGlobalListeners();
    this.fitArtboardToViewport();
    this.render();
  }

  private uid(prefix = 'id'): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  private loadFromLocalStorage(): void {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (savedTheme === 'light') {
        this.isDarkTheme = false;
        document.documentElement.classList.remove('dark');
      } else {
        this.isDarkTheme = true;
        document.documentElement.classList.add('dark');
      }

      const rawProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (rawProjects) {
        const parsed = JSON.parse(rawProjects);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.projects = parsed;
        }
      }
      if (this.projects.length === 0) {
        this.projects = [createDefaultProject()];
      }

      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
      const found = this.projects.find((p) => p.id === activeId);
      this.activeProject = found || this.projects[0];

      const rawUploads = localStorage.getItem(STORAGE_KEYS.UPLOADS);
      if (rawUploads) {
        this.uploads = JSON.parse(rawUploads);
      }

      const rawBrand = localStorage.getItem(STORAGE_KEYS.BRAND_KIT);
      if (rawBrand) {
        this.brandKit = JSON.parse(rawBrand);
      }

      const savedLocale = localStorage.getItem(STORAGE_KEYS.LOCALE) as StudioLocaleKind | null;
      if (savedLocale && STUDIO_LOCALES[savedLocale]) {
        this.studioLocale = savedLocale;
      }
      this.syncDocumentDirection();
    } catch {
      this.projects = [createDefaultProject()];
      this.activeProject = this.projects[0];
    }
  }

  private syncDocumentDirection(): void {
    const meta = STUDIO_LOCALES[this.studioLocale] || STUDIO_LOCALES.en;
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
  }

  private saveToLocalStorage(): void {
    try {
      this.activeProject.updatedAt = Date.now();
      const idx = this.projects.findIndex((p) => p.id === this.activeProject.id);
      if (idx >= 0) {
        this.projects[idx] = this.activeProject;
      } else {
        this.projects.unshift(this.activeProject);
      }
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(this.projects));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, this.activeProject.id);
      localStorage.setItem(STORAGE_KEYS.UPLOADS, JSON.stringify(this.uploads));
      localStorage.setItem(STORAGE_KEYS.BRAND_KIT, JSON.stringify(this.brandKit));
      localStorage.setItem(STORAGE_KEYS.THEME, this.isDarkTheme ? 'dark' : 'light');
      localStorage.setItem(STORAGE_KEYS.LOCALE, this.studioLocale);
    } catch {
      this.showToast('Storage quota reached — try removing large uploaded images.');
    }
  }

  private getStorageUsageKb(): string {
    try {
      let total = 0;
      Object.values(STORAGE_KEYS).forEach((key) => {
        const val = localStorage.getItem(key);
        if (val) total += val.length * 2;
      });
      return `${(total / 1024).toFixed(1)} KB`;
    } catch {
      return '0.0 KB';
    }
  }

  private inferHistoryActionLabel(prevEntry?: HistoryEntry): string {
    if (!prevEntry) {
      return 'Initial Workspace State';
    }
    try {
      const prevPages = JSON.parse(prevEntry.pagesJson) as DesignPage[];
      const nextPages = this.activeProject.pages;

      if (prevEntry.width !== this.activeProject.width || prevEntry.height !== this.activeProject.height) {
        return `Resized Artboard (${this.activeProject.width}×${this.activeProject.height})`;
      }
      if (nextPages.length > prevPages.length) {
        return `Added Slide Page (${nextPages.length} total)`;
      }
      if (nextPages.length < prevPages.length) {
        return `Deleted Slide Page (${nextPages.length} total)`;
      }

      const pageIdx = Math.min(this.activePageIndex, nextPages.length - 1);
      const prevPage = prevPages[pageIdx];
      const nextPage = nextPages[pageIdx];
      if (!prevPage || !nextPage) {
        return 'Modified Slide Deck';
      }

      if (
        prevPage.background !== nextPage.background ||
        prevPage.backgroundGradient !== nextPage.backgroundGradient ||
        prevPage.backgroundPattern !== nextPage.backgroundPattern
      ) {
        return 'Updated Canvas Background';
      }

      const prevEls = prevPage.elements || [];
      const nextEls = nextPage.elements || [];

      if (nextEls.length > prevEls.length) {
        const prevIds = new Set(prevEls.map((e) => e.id));
        const added = nextEls.filter((e) => !prevIds.has(e.id));
        if (added.length === 1) {
          return `Added "${added[0].name}"`;
        }
        return `Added ${added.length} Elements`;
      }

      if (nextEls.length < prevEls.length) {
        const nextIds = new Set(nextEls.map((e) => e.id));
        const removed = prevEls.filter((e) => !nextIds.has(e.id));
        if (removed.length === 1) {
          return `Deleted "${removed[0].name}"`;
        }
        return `Deleted ${removed.length} Elements`;
      }

      // Same element count: check z-order or property modifications
      const prevOrder = prevEls.map((e) => e.id).join(',');
      const nextOrder = nextEls.map((e) => e.id).join(',');
      if (prevOrder !== nextOrder) {
        return 'Reordered Layer Stack';
      }

      const prevMap = new Map(prevEls.map((e) => [e.id, e]));
      const changed: Array<{ prev: DesignElement; next: DesignElement }> = [];
      for (const nextEl of nextEls) {
        const prevEl = prevMap.get(nextEl.id);
        if (prevEl && JSON.stringify(prevEl) !== JSON.stringify(nextEl)) {
          changed.push({ prev: prevEl, next: nextEl });
        }
      }

      if (changed.length === 1) {
        const { prev, next } = changed[0];
        const name = next.name || 'Layer';
        if (prev.hidden !== next.hidden) {
          return next.hidden ? `Hidden "${name}"` : `Shown "${name}"`;
        }
        if (prev.locked !== next.locked) {
          return next.locked ? `Locked "${name}"` : `Unlocked "${name}"`;
        }
        if (prev.width !== next.width || prev.height !== next.height) {
          return `Resized "${name}" (${Math.round(next.width)}×${Math.round(next.height)})`;
        }
        if ((prev.rotation || 0) !== (next.rotation || 0)) {
          return `Rotated "${name}" (${Math.round(next.rotation || 0)}°)`;
        }
        if (prev.x !== next.x || prev.y !== next.y) {
          return `Moved "${name}" to (${Math.round(next.x)}, ${Math.round(next.y)})`;
        }
        if (prev.text !== next.text) {
          return `Edited Text in "${name}"`;
        }
        if (
          prev.fill !== next.fill ||
          prev.fillGradient !== next.fillGradient ||
          prev.color !== next.color ||
          prev.stroke !== next.stroke
        ) {
          return `Changed Color of "${name}"`;
        }
        if (
          prev.fontFamily !== next.fontFamily ||
          prev.fontSize !== next.fontSize ||
          prev.fontWeight !== next.fontWeight ||
          prev.fontStyle !== next.fontStyle ||
          prev.textEffect !== next.textEffect ||
          prev.textCurve !== next.textCurve
        ) {
          return `Styled Typography on "${name}"`;
        }
        if (prev.opacity !== next.opacity) {
          return `Adjusted Opacity of "${name}" (${Math.round((next.opacity ?? 1) * 100)}%)`;
        }
        return `Updated "${name}"`;
      }

      if (changed.length > 1) {
        const allMoved = changed.every(
          ({ prev, next }) =>
            (prev.x !== next.x || prev.y !== next.y) &&
            prev.width === next.width &&
            prev.height === next.height
        );
        if (allMoved) {
          return `Aligned / Moved ${changed.length} Layers`;
        }
        const firstGroupDiff = changed.some(({ prev, next }) => prev.groupId !== next.groupId);
        if (firstGroupDiff) {
          return `Updated Layer Group (${changed.length} items)`;
        }
        return `Modified ${changed.length} Layers`;
      }
    } catch {
      // fallback label
    }
    return 'Updated Canvas Elements';
  }

  private pushHistorySnapshot(customLabel?: string): void {
    const pagesJson = JSON.stringify(this.activeProject.pages);
    const prevEntry = this.historyIndex >= 0 ? this.history[this.historyIndex] : undefined;

    if (
      prevEntry &&
      prevEntry.pagesJson === pagesJson &&
      prevEntry.width === this.activeProject.width &&
      prevEntry.height === this.activeProject.height
    ) {
      return;
    }

    const totalElements = this.activeProject.pages.reduce(
      (sum, p) => sum + (p.elements?.length || 0),
      0
    );

    const snap: HistoryEntry = {
      id: this.uid('hist'),
      label: customLabel || this.inferHistoryActionLabel(prevEntry),
      timestamp: Date.now(),
      pagesJson,
      activePageIndex: this.activePageIndex,
      width: this.activeProject.width,
      height: this.activeProject.height,
      elementCount: totalElements,
    };

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(snap);
    if (this.history.length > 50) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
    this.saveToLocalStorage();
  }

  private applyHistoryEntry(entry: HistoryEntry): void {
    this.activeProject.pages = JSON.parse(entry.pagesJson);
    this.activeProject.width = entry.width || this.activeProject.width;
    this.activeProject.height = entry.height || this.activeProject.height;
    this.activePageIndex = Math.min(entry.activePageIndex, this.activeProject.pages.length - 1);

    // Keep selection only if element still exists on the restored page
    const validIds = new Set(this.activePage.elements.map((e) => e.id));
    this.selectedElementIds = this.selectedElementIds.filter((id) => validIds.has(id));
    this.selectedElementId =
      this.selectedElementId && validIds.has(this.selectedElementId)
        ? this.selectedElementId
        : this.selectedElementIds[0] || null;
    this.editingTextId = null;

    this.saveToLocalStorage();
    this.render();
  }

  private undo(): void {
    if (this.historyIndex > 0) {
      const undoneAction = this.history[this.historyIndex];
      this.historyIndex--;
      const targetEntry = this.history[this.historyIndex];
      this.applyHistoryEntry(targetEntry);
      this.showToast(`Undo: ${undoneAction.label}`);
    } else {
      this.showToast('Nothing left to undo');
    }
  }

  private redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const redoneEntry = this.history[this.historyIndex];
      this.applyHistoryEntry(redoneEntry);
      this.showToast(`Redo: ${redoneEntry.label}`);
    } else {
      this.showToast('Nothing left to redo');
    }
  }

  private jumpToHistoryIndex(targetIdx: number): void {
    if (targetIdx < 0 || targetIdx >= this.history.length || targetIdx === this.historyIndex) {
      return;
    }
    this.historyIndex = targetIdx;
    const entry = this.history[this.historyIndex];
    this.applyHistoryEntry(entry);
    this.showToast(`Restored state #${targetIdx + 1}: ${entry.label}`);
  }

  private clearSelection(): void {
    this.selectedElementId = null;
    this.selectedElementIds = [];
    this.editingTextId = null;
  }

  private selectSingleOrGroup(id: string, additive = false): void {
    const target = this.activePage.elements.find((e) => e.id === id);
    if (!target) return;

    // Collect all elements in the same group if target belongs to a group
    const groupIds = target.groupId
      ? this.activePage.elements.filter((e) => e.groupId === target.groupId).map((e) => e.id)
      : [id];

    if (additive) {
      const alreadySelected = this.selectedElementIds.includes(id);
      if (alreadySelected) {
        this.selectedElementIds = this.selectedElementIds.filter((item) => !groupIds.includes(item));
        this.selectedElementId = this.selectedElementIds[0] || null;
      } else {
        this.selectedElementIds = Array.from(new Set([...this.selectedElementIds, ...groupIds]));
        this.selectedElementId = id;
      }
      if (this.selectedElementIds.length <= 1 && this.alignRelativeTo === 'selection') {
        this.alignRelativeTo = 'canvas';
      }
    } else {
      this.selectedElementId = id;
      this.selectedElementIds = groupIds;
      if (groupIds.length <= 1 && this.alignRelativeTo === 'selection') {
        this.alignRelativeTo = 'canvas';
      }
    }
  }

  private get activePage(): DesignPage {
    if (!this.activeProject.pages[this.activePageIndex]) {
      this.activePageIndex = 0;
    }
    return this.activeProject.pages[this.activePageIndex];
  }

  private get selectedElement(): DesignElement | null {
    if (!this.selectedElementId) return null;
    return this.activePage.elements.find((e) => e.id === this.selectedElementId) || null;
  }

  private get selectedElements(): DesignElement[] {
    return this.activePage.elements.filter((e) => this.selectedElementIds.includes(e.id));
  }

  private fitArtboardToViewport(): void {
    const availW = Math.max(480, window.innerWidth - 460);
    const availH = Math.max(380, window.innerHeight - 230);
    const scaleX = availW / this.activeProject.width;
    const scaleY = availH / this.activeProject.height;
    this.zoom = Math.max(0.2, Math.min(1.15, Number((Math.min(scaleX, scaleY) * 0.88).toFixed(2))));
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.renderToastOnly();
    this.toastTimer = window.setTimeout(() => {
      this.toastMessage = null;
      this.renderToastOnly();
    }, 2800);
  }

  private renderToastOnly(): void {
    const container = document.getElementById('studio-toast-container');
    if (!container) return;
    if (!this.toastMessage) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = `
      <div class="fixed bottom-16 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-slate-900 text-white border border-slate-700 shadow-xl text-xs font-medium">
        <span class="text-indigo-400">${ICONS.check}</span>
        <span>${this.escapeHtml(this.toastMessage)}</span>
      </div>
    `;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private recordShortcutBadge(shortcutLabel: string): void {
    this.lastShortcutTriggered = shortcutLabel;
  }

  public executeShortcutCommand(
    cmd:
      | 'undo'
      | 'redo'
      | 'delete'
      | 'duplicate'
      | 'copy'
      | 'cut'
      | 'paste'
      | 'select-all'
      | 'deselect'
      | 'group'
      | 'ungroup'
      | 'layer-up'
      | 'layer-down'
      | 'layer-top'
      | 'layer-bottom'
      | 'toggle-lock'
      | 'nudge-up'
      | 'nudge-down'
      | 'nudge-left'
      | 'nudge-right'
      | 'zoom-in'
      | 'zoom-out'
      | 'zoom-fit'
      | 'export-modal'
      | 'toggle-rulers'
      | 'text-tool'
  ): void {
    switch (cmd) {
      case 'undo':
        this.recordShortcutBadge('Ctrl+Z · Undo');
        this.undo();
        break;
      case 'redo':
        this.recordShortcutBadge('Ctrl+Y · Redo');
        this.redo();
        break;
      case 'delete':
        if (this.selectedElementIds.length > 0) {
          this.recordShortcutBadge('Delete · Remove Selected');
          this.deleteSelectedElements();
        } else {
          this.showToast('Select one or more canvas elements first to delete (Delete / Backspace).');
        }
        break;
      case 'duplicate':
        if (this.selectedElement) {
          this.recordShortcutBadge('Ctrl+D · Duplicate');
          this.duplicateElement(this.selectedElement.id);
        } else {
          this.showToast('Select an element on the canvas first to duplicate (Ctrl+D).');
        }
        break;
      case 'copy':
        if (this.selectedElement) {
          this.recordShortcutBadge('Ctrl+C · Copy');
          this.copyElement(this.selectedElement.id);
        } else {
          this.showToast('Select an element on the canvas first to copy (Ctrl+C).');
        }
        break;
      case 'cut':
        if (this.selectedElement) {
          this.recordShortcutBadge('Ctrl+X · Cut');
          this.cutElement(this.selectedElement.id);
        } else {
          this.showToast('Select an element on the canvas first to cut (Ctrl+X).');
        }
        break;
      case 'paste':
        if (this.clipboardElement) {
          this.recordShortcutBadge('Ctrl+V · Paste');
          this.pasteElement();
        } else {
          this.showToast('Clipboard is empty — press Ctrl+C on a selected element first.');
        }
        break;
      case 'select-all': {
        const unlockedIds = this.activePage.elements
          .filter((item) => !item.hidden && !item.locked)
          .map((item) => item.id);
        if (unlockedIds.length > 0) {
          this.selectedElementIds = unlockedIds;
          this.selectedElementId = unlockedIds[0] || null;
          this.recordShortcutBadge(`Ctrl+A · Select All (${unlockedIds.length})`);
          this.render();
          this.showToast(`Selected all ${unlockedIds.length} unlocked canvas elements (Ctrl+A)`);
        }
        break;
      }
      case 'deselect':
        this.recordShortcutBadge('Esc · Deselect');
        this.contextMenu = null;
        this.isDrawingMode = false;
        this.isTextPlacementMode = false;
        this.clearSelection();
        this.render();
        break;
      case 'group':
        this.recordShortcutBadge('Ctrl+G · Group');
        this.groupSelected();
        break;
      case 'ungroup':
        this.recordShortcutBadge('Ctrl+Shift+G · Ungroup');
        this.ungroupSelected();
        break;
      case 'layer-up':
        if (this.selectedElement) {
          this.recordShortcutBadge('] · Move Forward');
          this.reorderLayer(this.selectedElement.id, 'up');
        }
        break;
      case 'layer-down':
        if (this.selectedElement) {
          this.recordShortcutBadge('[ · Move Backward');
          this.reorderLayer(this.selectedElement.id, 'down');
        }
        break;
      case 'layer-top':
        if (this.selectedElement) {
          this.recordShortcutBadge('Ctrl+] · Bring to Front');
          this.reorderLayer(this.selectedElement.id, 'top');
        }
        break;
      case 'layer-bottom':
        if (this.selectedElement) {
          this.recordShortcutBadge('Ctrl+[ · Send to Back');
          this.reorderLayer(this.selectedElement.id, 'bottom');
        }
        break;
      case 'toggle-lock':
        if (this.selectedElements.length > 0) {
          const nextLocked = !this.selectedElements[0].locked;
          this.selectedElements.forEach((el) => {
            el.locked = nextLocked;
          });
          this.recordShortcutBadge('Ctrl+L · Lock/Unlock');
          this.pushHistorySnapshot(`${nextLocked ? 'Locked' : 'Unlocked'} Selected Element(s)`);
          this.render();
          this.showToast(
            `${nextLocked ? 'Locked' : 'Unlocked'} ${this.selectedElements.length} ${
              this.selectedElements.length === 1 ? 'layer' : 'layers'
            } (Ctrl+L)`
          );
        }
        break;
      case 'nudge-up':
      case 'nudge-down':
      case 'nudge-left':
      case 'nudge-right':
        if (this.selectedElements.length > 0) {
          this.selectedElements.forEach((item) => {
            if (item.locked) return;
            if (cmd === 'nudge-left') item.x -= 1;
            if (cmd === 'nudge-right') item.x += 1;
            if (cmd === 'nudge-up') item.y -= 1;
            if (cmd === 'nudge-down') item.y += 1;
          });
          this.recordShortcutBadge('Arrow · Nudge 1px');
          this.pushHistorySnapshot('Nudged Selected Element(s)');
          this.render();
        }
        break;
      case 'zoom-in':
        this.zoom = Math.min(2.0, +(this.zoom + 0.1).toFixed(2));
        this.recordShortcutBadge('+ · Zoom In');
        this.render();
        break;
      case 'zoom-out':
        this.zoom = Math.max(0.2, +(this.zoom - 0.1).toFixed(2));
        this.recordShortcutBadge('- · Zoom Out');
        this.render();
        break;
      case 'zoom-fit':
        this.fitArtboardToViewport();
        this.recordShortcutBadge('0 · Fit Zoom');
        this.render();
        break;
      case 'export-modal':
        this.recordShortcutBadge('Ctrl+E · Export');
        this.showExportModal = true;
        this.render();
        break;
      case 'toggle-rulers':
        this.showRulers = !this.showRulers;
        this.recordShortcutBadge('Shift+R · Toggle Rulers');
        this.render();
        this.showToast(
          this.showRulers
            ? 'Rulers & Draggable Snapping Guides enabled (Shift+R)'
            : 'Rulers overlay hidden (press Shift+R or click Rulers to show)'
        );
        break;
      case 'text-tool':
        this.activeSidebarTab = 'text';
        this.isDrawingMode = false;
        this.isTextPlacementMode = !this.isTextPlacementMode;
        this.recordShortcutBadge('T · Text Tool');
        this.render();
        this.showToast(
          this.isTextPlacementMode
            ? 'Text Tool active — click anywhere on the canvas to add an editable text box'
            : 'Text Tool deactivated'
        );
        break;
    }
  }

  private attachGlobalListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Presentation mode keyboard controls
      if (this.isPresenting) {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.isPresenting = false;
          this.laserActive = false;
          this.render();
        } else if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          if (this.activePageIndex < this.activeProject.pages.length - 1) {
            this.activePageIndex++;
            this.render();
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (this.activePageIndex > 0) {
            this.activePageIndex--;
            this.render();
          }
        } else if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          this.laserActive = !this.laserActive;
          this.render();
        }
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isInput) {
        if (e.key === 'Escape' && this.editingTextId) {
          e.preventDefault();
          this.editingTextId = null;
          this.render();
        }
        return;
      }

      const keyLower = e.key.toLowerCase();
      const hasCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Toggle Keyboard Shortcuts Modal with '?' or 'Ctrl+/'
      if (e.key === '?' || (hasCmdOrCtrl && e.key === '/')) {
        e.preventDefault();
        this.showShortcutsModal = !this.showShortcutsModal;
        this.render();
        return;
      }

      // Escape: Close any open modal first, or exit drawing/context menu, or deselect
      if (e.key === 'Escape') {
        if (
          this.showShortcutsModal ||
          this.showExportModal ||
          this.showHistoryModal ||
          this.showResizeModal ||
          this.showGridViewModal
        ) {
          e.preventDefault();
          this.showShortcutsModal = false;
          this.showExportModal = false;
          this.showHistoryModal = false;
          this.showResizeModal = false;
          this.showGridViewModal = false;
          this.render();
          return;
        }
        if (this.contextMenu || this.isDrawingMode || this.selectedElementIds.length > 0) {
          e.preventDefault();
          this.executeShortcutCommand('deselect');
        }
        return;
      }

      if (this.activeNav !== 'studio') return;

      // Undo: Ctrl+Z / Cmd+Z (or Redo with Ctrl+Shift+Z / Cmd+Shift+Z)
      if (hasCmdOrCtrl && keyLower === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.executeShortcutCommand('redo');
        } else {
          this.executeShortcutCommand('undo');
        }
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y
      if (hasCmdOrCtrl && keyLower === 'y') {
        e.preventDefault();
        this.executeShortcutCommand('redo');
        return;
      }

      // Select All: Ctrl+A / Cmd+A
      if (hasCmdOrCtrl && keyLower === 'a') {
        e.preventDefault();
        this.executeShortcutCommand('select-all');
        return;
      }

      // Group / Ungroup: Ctrl+G / Ctrl+Shift+G
      if (hasCmdOrCtrl && keyLower === 'g') {
        e.preventDefault();
        if (e.shiftKey) this.executeShortcutCommand('ungroup');
        else this.executeShortcutCommand('group');
        return;
      }

      // Toggle Rulers Overlay: Shift+R
      if (!hasCmdOrCtrl && e.shiftKey && keyLower === 'r') {
        e.preventDefault();
        this.executeShortcutCommand('toggle-rulers');
        return;
      }

      // Activate Click-on-Canvas Text Tool: T
      if (!hasCmdOrCtrl && !e.shiftKey && keyLower === 't') {
        e.preventDefault();
        this.executeShortcutCommand('text-tool');
        return;
      }

      // Lock / Unlock Selected: Ctrl+L / Cmd+L
      if (hasCmdOrCtrl && keyLower === 'l') {
        if (this.selectedElementIds.length > 0) {
          e.preventDefault();
          this.executeShortcutCommand('toggle-lock');
        }
        return;
      }

      // Open Export Modal: Ctrl+E or Ctrl+S
      if (hasCmdOrCtrl && (keyLower === 'e' || keyLower === 's')) {
        e.preventDefault();
        this.executeShortcutCommand('export-modal');
        return;
      }

      // Copy: Ctrl+C / Cmd+C
      if (hasCmdOrCtrl && keyLower === 'c') {
        if (this.selectedElement) {
          e.preventDefault();
          this.executeShortcutCommand('copy');
        }
        return;
      }

      // Cut: Ctrl+X / Cmd+X
      if (hasCmdOrCtrl && keyLower === 'x') {
        if (this.selectedElement) {
          e.preventDefault();
          this.executeShortcutCommand('cut');
        }
        return;
      }

      // Paste: Ctrl+V / Cmd+V
      if (hasCmdOrCtrl && keyLower === 'v') {
        if (this.clipboardElement) {
          e.preventDefault();
          this.executeShortcutCommand('paste');
        }
        return;
      }

      // Duplicate: Ctrl+D / Cmd+D
      if (hasCmdOrCtrl && keyLower === 'd') {
        if (this.selectedElement) {
          e.preventDefault();
          this.executeShortcutCommand('duplicate');
        }
        return;
      }

      // Delete Selected Elements: Delete or Backspace
      if ((e.key === 'Backspace' || e.key === 'Delete') && this.selectedElementIds.length > 0) {
        e.preventDefault();
        this.executeShortcutCommand('delete');
        return;
      }

      // Layer Ordering: [ / ] or Ctrl+[ / Ctrl+]
      if ((e.key === '[' || e.key === ']') && this.selectedElement) {
        e.preventDefault();
        if (e.key === ']') {
          this.executeShortcutCommand(hasCmdOrCtrl || e.shiftKey ? 'layer-top' : 'layer-up');
        } else {
          this.executeShortcutCommand(hasCmdOrCtrl || e.shiftKey ? 'layer-bottom' : 'layer-down');
        }
        return;
      }

      // Canvas Zoom Shortcuts: + / =, -, 0 (when not holding Ctrl/Cmd so browser zoom isn't hijacked)
      if (!hasCmdOrCtrl && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        this.executeShortcutCommand('zoom-in');
        return;
      }
      if (!hasCmdOrCtrl && e.key === '-') {
        e.preventDefault();
        this.executeShortcutCommand('zoom-out');
        return;
      }
      if (!hasCmdOrCtrl && e.key === '0') {
        e.preventDefault();
        this.executeShortcutCommand('zoom-fit');
        return;
      }

      // Arrow keys nudging for all selected elements (1px or 10px with Shift)
      if (this.selectedElements.length > 0) {
        const step = e.shiftKey ? 10 : 1;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          this.selectedElements.forEach((item) => {
            if (item.locked) return;
            if (e.key === 'ArrowLeft') item.x -= step;
            if (e.key === 'ArrowRight') item.x += step;
            if (e.key === 'ArrowUp') item.y -= step;
            if (e.key === 'ArrowDown') item.y += step;
          });
          this.recordShortcutBadge(`${e.shiftKey ? 'Shift+Arrow' : 'Arrow'} · Nudge ${step}px`);
          this.pushHistorySnapshot(`Nudged Selected (${step}px)`);
          this.renderArtboardOnly();
        }
      }
    });
  }

  // ============================================================================
  // ELEMENT, GROUP, STYLE & PAGE OPERATIONS
  // ============================================================================

  private addElement(partial: Partial<DesignElement>): void {
    const cx = Math.round(this.activeProject.width / 2 - (partial.width || 240) / 2);
    const cy = Math.round(this.activeProject.height / 2 - (partial.height || 120) / 2);
    const newEl: DesignElement = {
      id: this.uid('el'),
      name: partial.name || 'Canvas Layer',
      type: partial.type || 'shape',
      x: partial.x ?? cx,
      y: partial.y ?? cy,
      width: partial.width || 240,
      height: partial.height || 240,
      rotation: partial.rotation || 0,
      opacity: partial.opacity ?? 1,
      ...partial,
    };
    this.activePage.elements.push(newEl);
    this.selectedElementId = newEl.id;
    this.selectedElementIds = [newEl.id];
    this.isDrawingMode = false;
    this.isTextPlacementMode = false;
    this.pushHistorySnapshot();
    this.render();
  }

  private placeTextElementAtCursor(e: MouseEvent, artboard: HTMLElement): void {
    e.preventDefault();
    e.stopPropagation();

    const rect = artboard.getBoundingClientRect();
    const clickX = Math.round((e.clientX - rect.left) / this.zoom);
    const clickY = Math.round((e.clientY - rect.top) / this.zoom);

    const loc = STUDIO_LOCALES[this.studioLocale] || STUDIO_LOCALES.en;
    const isRtlLoc = loc.dir === 'rtl';
    const fontSize = Math.max(8, Math.min(300, this.textToolFontSize || 48));
    const boxW = Math.max(
      220,
      Math.min(this.activeProject.width - 40, Math.round(fontSize * 9.5))
    );
    const boxH = Math.max(52, Math.round(fontSize * 1.7));

    const placedX = Math.max(
      12,
      Math.min(this.activeProject.width - boxW - 12, Math.round(clickX - boxW / 4))
    );
    const placedY = Math.max(
      12,
      Math.min(this.activeProject.height - boxH - 12, Math.round(clickY - boxH / 2))
    );

    const initialText =
      this.textToolDraftText && this.textToolDraftText.trim().length > 0
        ? this.textToolDraftText
        : isRtlLoc
        ? loc.sampleHeading
        : 'Editable Text Layer';

    const newEl: DesignElement = {
      id: this.uid('el'),
      name: `Text (${this.textToolFontFamily} ${fontSize}px)`,
      type: 'text',
      text: initialText,
      fontFamily: this.textToolFontFamily || (isRtlLoc ? loc.defaultFont : 'Plus Jakarta Sans'),
      fontSize,
      fontWeight: this.textToolFontWeight || 700,
      fontStyle: this.textToolFontStyle || 'normal',
      textDecoration: this.textToolDecoration || 'none',
      textAlign: this.textToolAlign || (isRtlLoc ? 'right' : 'left'),
      textDirection: isRtlLoc ? 'rtl' : 'ltr',
      langCode: loc.code,
      color:
        this.textToolColor ||
        (this.activePage.background === '#ffffff' ? '#0f172a' : '#f8fafc'),
      x: placedX,
      y: placedY,
      width: boxW,
      height: boxH,
      rotation: 0,
      opacity: 1,
    };

    this.activePage.elements.push(newEl);
    this.selectedElementId = newEl.id;
    this.selectedElementIds = [newEl.id];
    this.editingTextId = newEl.id;
    this.isTextPlacementMode = false;
    this.isDrawingMode = false;
    this.pushHistorySnapshot(`Added Text Element at (${placedX}, ${placedY})`);
    this.render();

    const editable = document.querySelector<HTMLElement>(
      `[data-text-edit-id="${newEl.id}"]`
    );
    if (editable) {
      editable.focus();
      try {
        const range = document.createRange();
        range.selectNodeContents(editable);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch {
        // ignore selection range errors
      }
    }

    this.showToast(
      `Placed editable text (${newEl.fontFamily}, ${newEl.fontSize}px) at (${placedX}, ${placedY}) — type directly on canvas`
    );
  }

  private isSelectionSingleBoundGroup(): boolean {
    const unlocked = this.selectedElements.filter((el) => !el.hidden);
    return (
      unlocked.length > 1 &&
      Boolean(unlocked[0].groupId) &&
      unlocked.every((el) => el.groupId === unlocked[0].groupId)
    );
  }

  private groupSelected(): void {
    if (this.selectedElementIds.length < 2) {
      this.showToast('Select 2+ objects (Shift+Click, drag marquee, or click Select All) to group them.');
      return;
    }
    const newGroupId = this.uid('grp');
    this.selectedElements.forEach((el) => {
      if (!el.locked) {
        el.groupId = newGroupId;
      }
    });
    const count = this.selectedElementIds.length;
    this.pushHistorySnapshot(`Grouped ${count} Objects into Unit`);
    this.render();
    this.showToast(`Grouped ${count} objects into a single movable & resizable unit (Ctrl+G)`);
  }

  private ungroupSelected(): void {
    const anyGrouped = this.selectedElements.some((el) => Boolean(el.groupId));
    if (!anyGrouped) {
      this.showToast('Selected objects are not currently grouped.');
      return;
    }
    const count = this.selectedElements.length;
    this.selectedElements.forEach((el) => {
      el.groupId = undefined;
    });
    this.pushHistorySnapshot(`Ungrouped ${count} Objects`);
    this.render();
    this.showToast(`Ungrouped ${count} objects into independent layers (Ctrl+Shift+G)`);
  }

  private resizeSelectedGroupToDimensions(targetW: number, targetH: number): void {
    const members = this.selectedElements.filter((el) => !el.locked && !el.hidden);
    if (members.length < 2) return;

    const minX = Math.min(...members.map((item) => item.x));
    const maxX = Math.max(...members.map((item) => item.x + item.width));
    const minY = Math.min(...members.map((item) => item.y));
    const maxY = Math.max(...members.map((item) => item.y + item.height));
    const origGroupW = Math.max(1, maxX - minX);
    const origGroupH = Math.max(1, maxY - minY);

    const clampedW = Math.max(36, Math.min(4000, Math.round(targetW)));
    const clampedH = Math.max(36, Math.min(4000, Math.round(targetH)));
    const scaleX = clampedW / origGroupW;
    const scaleY = clampedH / origGroupH;
    const uniformScale = Math.min(scaleX, scaleY);

    members.forEach((item) => {
      const relX = (item.x - minX) / origGroupW;
      const relY = (item.y - minY) / origGroupH;
      const relW = item.width / origGroupW;
      const relH = item.height / origGroupH;

      item.x = Math.round(minX + relX * clampedW);
      item.y = Math.round(minY + relY * clampedH);
      item.width = Math.max(16, Math.round(relW * clampedW));
      item.height = Math.max(16, Math.round(relH * clampedH));
      if (item.fontSize) {
        item.fontSize = Math.max(10, Math.min(280, Math.round(item.fontSize * uniformScale)));
      }
      if (item.strokeWidth) {
        item.strokeWidth = Math.max(1, Math.round(item.strokeWidth * uniformScale));
      }
    });

    this.pushHistorySnapshot(`Resized Group Unit (${clampedW}×${clampedH})`);
    this.render();
    this.showToast(`Resized group unit to ${clampedW} × ${clampedH} px`);
  }

  private tidySelectedElements(axis: 'horizontal' | 'vertical'): void {
    const list = this.selectedElements.filter((e) => !e.locked);
    if (list.length < 2) return;
    if (axis === 'horizontal') {
      list.sort((a, b) => a.x - b.x);
      const minX = list[0].x;
      const maxX = list[list.length - 1].x;
      const step = (maxX - minX) / Math.max(1, list.length - 1);
      const avgY = Math.round(list.reduce((s, item) => s + item.y, 0) / list.length);
      list.forEach((item, idx) => {
        item.x = Math.round(minX + idx * step);
        item.y = avgY;
      });
    } else {
      list.sort((a, b) => a.y - b.y);
      const minY = list[0].y;
      const maxY = list[list.length - 1].y;
      const step = (maxY - minY) / Math.max(1, list.length - 1);
      const avgX = Math.round(list.reduce((s, item) => s + item.x, 0) / list.length);
      list.forEach((item, idx) => {
        item.y = Math.round(minY + idx * step);
        item.x = avgX;
      });
    }
    this.pushHistorySnapshot();
    this.render();
    this.showToast(`Tidied ${list.length} layers (${axis})`);
  }

  private copyStyleFromElement(id?: string): void {
    const targetId = id || this.selectedElementId;
    const el = this.activePage.elements.find((e) => e.id === targetId);
    if (!el) return;
    this.copiedStyle = {
      fill: el.fill,
      fillGradient: el.fillGradient,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth,
      borderRadius: el.borderRadius,
      fontFamily: el.fontFamily,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      color: el.color,
      textEffect: el.textEffect,
      textEffectColor: el.textEffectColor,
      opacity: el.opacity,
      animation: el.animation,
      frameShape: el.frameShape,
    };
    this.showToast(`Copied style from "${el.name}"`);
  }

  private pasteStyleToSelected(): void {
    if (!this.copiedStyle || this.selectedElements.length === 0) return;
    this.selectedElements.forEach((el) => {
      if (el.locked) return;
      if (this.copiedStyle?.opacity !== undefined) el.opacity = this.copiedStyle.opacity;
      if (this.copiedStyle?.animation !== undefined) el.animation = this.copiedStyle.animation;
      if (el.type === 'text') {
        if (this.copiedStyle?.fontFamily) el.fontFamily = this.copiedStyle.fontFamily;
        if (this.copiedStyle?.fontWeight) el.fontWeight = this.copiedStyle.fontWeight;
        if (this.copiedStyle?.color) el.color = this.copiedStyle.color;
        if (this.copiedStyle?.textEffect) el.textEffect = this.copiedStyle.textEffect;
        if (this.copiedStyle?.textEffectColor) el.textEffectColor = this.copiedStyle.textEffectColor;
      } else {
        if (this.copiedStyle?.fill) el.fill = this.copiedStyle.fill;
        if (this.copiedStyle?.stroke) el.stroke = this.copiedStyle.stroke;
        if (this.copiedStyle?.strokeWidth !== undefined) el.strokeWidth = this.copiedStyle.strokeWidth;
        if (this.copiedStyle?.borderRadius !== undefined) el.borderRadius = this.copiedStyle.borderRadius;
        if (this.copiedStyle?.frameShape) el.frameShape = this.copiedStyle.frameShape;
      }
    });
    this.pushHistorySnapshot();
    this.render();
    this.showToast('Applied copied style');
  }

  private copyElement(id?: string): void {
    const targetId = id || this.selectedElementId;
    if (!targetId) return;
    const orig = this.activePage.elements.find((e) => e.id === targetId);
    if (!orig) return;
    this.clipboardElement = JSON.parse(JSON.stringify(orig));
    this.pasteOffsetStep = 0;
    this.render();
    this.showToast(`Copied "${orig.name}" (Ctrl+V to paste)`);
  }

  private cutElement(id?: string): void {
    const targetId = id || this.selectedElementId;
    if (!targetId) return;
    const orig = this.activePage.elements.find((e) => e.id === targetId);
    if (!orig) return;
    if (orig.locked) {
      this.showToast('Layer is locked — unlock it first to cut.');
      return;
    }
    this.clipboardElement = JSON.parse(JSON.stringify(orig));
    this.pasteOffsetStep = 0;
    this.activePage.elements = this.activePage.elements.filter((e) => e.id !== targetId);
    this.clearSelection();
    this.pushHistorySnapshot();
    this.render();
    this.showToast(`Cut "${orig.name}" to clipboard`);
  }

  private pasteElement(): void {
    if (!this.clipboardElement) {
      this.showToast('Clipboard is empty — copy a layer with Ctrl+C first.');
      return;
    }
    this.pasteOffsetStep = (this.pasteOffsetStep % 8) + 1;
    const offset = 24 * this.pasteOffsetStep;
    const copy: DesignElement = JSON.parse(JSON.stringify(this.clipboardElement));
    copy.id = this.uid('el');
    copy.name = `${this.clipboardElement.name.replace(/ Copy$/, '')} Copy`;
    copy.locked = false;
    copy.groupId = undefined;

    const maxX = Math.max(0, this.activeProject.width - copy.width);
    const maxY = Math.max(0, this.activeProject.height - copy.height);
    copy.x = Math.min(maxX, Math.max(0, Math.round(copy.x + offset)));
    copy.y = Math.min(maxY, Math.max(0, Math.round(copy.y + offset)));

    this.activePage.elements.push(copy);
    this.selectedElementId = copy.id;
    this.selectedElementIds = [copy.id];
    this.pushHistorySnapshot();
    this.render();
    this.showToast(`Pasted "${copy.name}" (Ctrl+V)`);
  }

  private duplicateElement(id: string): void {
    const orig = this.activePage.elements.find((e) => e.id === id);
    if (!orig) return;
    const copy: DesignElement = JSON.parse(JSON.stringify(orig));
    copy.id = this.uid('el');
    copy.name = `${orig.name} Copy`;
    copy.x += 28;
    copy.y += 28;
    copy.locked = false;
    copy.groupId = undefined;
    this.activePage.elements.push(copy);
    this.selectedElementId = copy.id;
    this.selectedElementIds = [copy.id];
    this.pushHistorySnapshot();
    this.render();
    this.showToast('Layer duplicated (Ctrl+D)');
  }

  private deleteSelectedElements(): void {
    const targets = this.selectedElements;
    if (targets.length === 0) return;
    if (targets.some((t) => t.locked)) {
      this.showToast('Unlock locked layers before deleting.');
      return;
    }
    const idsToRemove = new Set(this.selectedElementIds);
    this.activePage.elements = this.activePage.elements.filter((e) => !idsToRemove.has(e.id));
    this.clearSelection();
    this.pushHistorySnapshot();
    this.render();
    this.showToast(`Deleted ${idsToRemove.size} ${idsToRemove.size === 1 ? 'layer' : 'layers'} (Ctrl+Z to undo)`);
  }

  private deleteElement(id: string): void {
    const el = this.activePage.elements.find((e) => e.id === id);
    if (el?.locked) {
      this.showToast('Layer is locked — unlock it first to delete.');
      return;
    }
    const deletedName = el?.name || 'Layer';
    this.activePage.elements = this.activePage.elements.filter((e) => e.id !== id);
    this.selectedElementIds = this.selectedElementIds.filter((item) => item !== id);
    if (this.selectedElementId === id) {
      this.selectedElementId = this.selectedElementIds[0] || null;
    }
    this.pushHistorySnapshot();
    this.render();
    this.showToast(`Deleted "${deletedName}" (Ctrl+Z to undo)`);
  }

  private reorderLayer(id: string, direction: 'up' | 'down' | 'top' | 'bottom'): void {
    const list = this.activePage.elements;
    const targetIdx = list.findIndex((e) => e.id === id);
    if (targetIdx < 0) return;

    const targetEl = list[targetIdx];
    const movingIds = new Set<string>();

    if (this.selectedElementIds.includes(id) && this.selectedElementIds.length > 1) {
      this.selectedElementIds.forEach((selId) => movingIds.add(selId));
    } else if (targetEl.groupId) {
      list
        .filter((el) => el.groupId === targetEl.groupId)
        .forEach((gEl) => movingIds.add(gEl.id));
    } else {
      movingIds.add(id);
    }

    const total = list.length;
    const indices = list
      .map((el, idx) => (movingIds.has(el.id) ? idx : -1))
      .filter((idx) => idx >= 0);

    if (indices.length === 0) return;

    const minIdx = Math.min(...indices);
    const maxIdx = Math.max(...indices);
    const itemLabel =
      movingIds.size > 1
        ? `${movingIds.size} grouped/selected layers`
        : `"${targetEl.name || 'Element'}"`;

    if (direction === 'top') {
      if (maxIdx === total - 1 && minIdx === total - movingIds.size) {
        this.showToast(`${itemLabel} is already at the front (Z-Index ${total}/${total})`);
        return;
      }
      const movingItems = list.filter((el) => movingIds.has(el.id));
      const remainingItems = list.filter((el) => !movingIds.has(el.id));
      this.activePage.elements = [...remainingItems, ...movingItems];
      this.pushHistorySnapshot(`Bring ${itemLabel} to Front`);
      this.render();
      this.showToast(`Brought ${itemLabel} to Front (Z-Index ${total}/${total})`);
    } else if (direction === 'bottom') {
      if (minIdx === 0 && maxIdx === movingIds.size - 1) {
        this.showToast(`${itemLabel} is already at the back (Z-Index 1/${total})`);
        return;
      }
      const movingItems = list.filter((el) => movingIds.has(el.id));
      const remainingItems = list.filter((el) => !movingIds.has(el.id));
      this.activePage.elements = [...movingItems, ...remainingItems];
      this.pushHistorySnapshot(`Send ${itemLabel} to Back`);
      this.render();
      this.showToast(`Sent ${itemLabel} to Back (Z-Index 1/${total})`);
    } else if (direction === 'up') {
      if (maxIdx >= total - 1) {
        this.showToast(`${itemLabel} is already at the top layer (Z-Index ${total}/${total})`);
        return;
      }
      for (let i = list.length - 2; i >= 0; i--) {
        if (movingIds.has(list[i].id) && !movingIds.has(list[i + 1].id)) {
          const temp = list[i];
          list[i] = list[i + 1];
          list[i + 1] = temp;
        }
      }
      const newIdx = list.findIndex((e) => e.id === id) + 1;
      this.pushHistorySnapshot(`Move ${itemLabel} Forward`);
      this.render();
      this.showToast(`Moved ${itemLabel} Forward (Z-Index ${newIdx}/${total})`);
    } else if (direction === 'down') {
      if (minIdx <= 0) {
        this.showToast(`${itemLabel} is already at the bottom layer (Z-Index 1/${total})`);
        return;
      }
      for (let i = 1; i < list.length; i++) {
        if (movingIds.has(list[i].id) && !movingIds.has(list[i - 1].id)) {
          const temp = list[i];
          list[i] = list[i - 1];
          list[i - 1] = temp;
        }
      }
      const newIdx = list.findIndex((e) => e.id === id) + 1;
      this.pushHistorySnapshot(`Move ${itemLabel} Backward`);
      this.render();
      this.showToast(`Moved ${itemLabel} Backward (Z-Index ${newIdx}/${total})`);
    }
  }

  private alignSelectedElements(
    pos: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'center-both',
    forceTarget?: 'canvas' | 'canvas-group' | 'selection'
  ): void {
    const unlocked = this.selectedElements.filter((item) => !item.locked);
    if (unlocked.length === 0) {
      this.showToast('Select one or more objects on the canvas to snap & align.');
      return;
    }

    const effectiveTarget: 'canvas' | 'canvas-group' | 'selection' =
      forceTarget || (unlocked.length > 1 ? this.alignRelativeTo : 'canvas');

    const W = this.activeProject.width;
    const H = this.activeProject.height;
    this.snapLines = {};

    const minX = Math.min(...unlocked.map((item) => item.x));
    const maxX = Math.max(...unlocked.map((item) => item.x + item.width));
    const minY = Math.min(...unlocked.map((item) => item.y));
    const maxY = Math.max(...unlocked.map((item) => item.y + item.height));
    const groupW = maxX - minX;
    const groupH = maxY - minY;
    const midX = Math.round((minX + maxX) / 2);
    const midY = Math.round((minY + maxY) / 2);

    if (effectiveTarget === 'selection' && unlocked.length > 1) {
      unlocked.forEach((item) => {
        if (pos === 'left') item.x = Math.round(minX);
        if (pos === 'center' || pos === 'center-both') item.x = Math.round(midX - item.width / 2);
        if (pos === 'right') item.x = Math.round(maxX - item.width);
        if (pos === 'top') item.y = Math.round(minY);
        if (pos === 'middle' || pos === 'center-both') item.y = Math.round(midY - item.height / 2);
        if (pos === 'bottom') item.y = Math.round(maxY - item.height);
      });

      if (pos === 'left') this.snapLines.x = Math.round(minX);
      if (pos === 'center' || pos === 'center-both') this.snapLines.x = midX;
      if (pos === 'right') this.snapLines.x = Math.round(maxX);
      if (pos === 'top') this.snapLines.y = Math.round(minY);
      if (pos === 'middle' || pos === 'center-both') this.snapLines.y = midY;
      if (pos === 'bottom') this.snapLines.y = Math.round(maxY);
    } else {
      // Align relative to Canvas (either individual objects to Canvas edges/center, or preserving group spacing)
      const isSingleGroup =
        unlocked.length > 1 &&
        Boolean(unlocked[0].groupId) &&
        unlocked.every((item) => item.groupId === unlocked[0].groupId);

      const moveAsBoundingGroup =
        unlocked.length > 1 && (effectiveTarget === 'canvas-group' || isSingleGroup);

      if (moveAsBoundingGroup) {
        let dx = 0;
        let dy = 0;
        if (pos === 'left') dx = 0 - minX;
        if (pos === 'center' || pos === 'center-both') dx = Math.round((W - groupW) / 2) - minX;
        if (pos === 'right') dx = W - groupW - minX;
        if (pos === 'top') dy = 0 - minY;
        if (pos === 'middle' || pos === 'center-both') dy = Math.round((H - groupH) / 2) - minY;
        if (pos === 'bottom') dy = H - groupH - minY;

        unlocked.forEach((item) => {
          item.x = Math.round(item.x + dx);
          item.y = Math.round(item.y + dy);
        });
      } else {
        unlocked.forEach((item) => {
          if (pos === 'left') item.x = 0;
          if (pos === 'center' || pos === 'center-both') item.x = Math.round((W - item.width) / 2);
          if (pos === 'right') item.x = Math.round(W - item.width);
          if (pos === 'top') item.y = 0;
          if (pos === 'middle' || pos === 'center-both') item.y = Math.round((H - item.height) / 2);
          if (pos === 'bottom') item.y = Math.round(H - item.height);
        });
      }

      if (pos === 'left') this.snapLines.x = 0;
      if (pos === 'center' || pos === 'center-both') this.snapLines.x = Math.round(W / 2);
      if (pos === 'right') this.snapLines.x = W;
      if (pos === 'top') this.snapLines.y = 0;
      if (pos === 'middle' || pos === 'center-both') this.snapLines.y = Math.round(H / 2);
      if (pos === 'bottom') this.snapLines.y = H;
    }

    const posLabels: Record<typeof pos, string> = {
      left: 'Left Edge',
      center: 'Horizontal Center',
      right: 'Right Edge',
      top: 'Top Edge',
      middle: 'Vertical Center',
      bottom: 'Bottom Edge',
      'center-both': 'Canvas Center (H & V)',
    };
    const targetLabel =
      effectiveTarget === 'selection' && unlocked.length > 1
        ? 'Selection Bounds'
        : effectiveTarget === 'canvas-group' && unlocked.length > 1
        ? 'Canvas (As Group)'
        : 'Canvas';

    const countStr = `${unlocked.length} ${unlocked.length === 1 ? 'Object' : 'Objects'}`;
    this.pushHistorySnapshot(`Aligned ${countStr} to ${posLabels[pos]} (${targetLabel})`);
    this.render();

    if (this.snapGuideTimer) window.clearTimeout(this.snapGuideTimer);
    this.snapGuideTimer = window.setTimeout(() => {
      this.snapLines = {};
      this.renderArtboardOnly();
    }, 950);

    this.showToast(`Snapped ${countStr} → ${posLabels[pos]} (${targetLabel})`);
  }

  private applyTemplate(tpl: TemplatePreset, asNewProject: boolean): void {
    if (asNewProject) {
      const newProj: DesignProject = {
        id: this.uid('proj'),
        name: tpl.name,
        category: tpl.category,
        width: tpl.width,
        height: tpl.height,
        updatedAt: Date.now(),
        pages: [
          {
            id: this.uid('page'),
            title: 'Page 1',
            background: tpl.background,
            backgroundGradient: tpl.backgroundGradient,
            backgroundPattern: tpl.backgroundPattern,
            elements: JSON.parse(JSON.stringify(tpl.elements)),
          },
        ],
      };
      this.projects.unshift(newProj);
      this.activeProject = newProj;
      this.activePageIndex = 0;
      this.clearSelection();
      this.activeNav = 'studio';
      this.fitArtboardToViewport();
      this.pushHistorySnapshot();
      this.render();
      this.showToast(`Created "${tpl.name}" (${tpl.dimensionsLabel})`);
    } else {
      this.activeProject.width = tpl.width;
      this.activeProject.height = tpl.height;
      this.activePage.background = tpl.background;
      this.activePage.backgroundGradient = tpl.backgroundGradient;
      this.activePage.backgroundPattern = tpl.backgroundPattern;
      this.activePage.elements = JSON.parse(JSON.stringify(tpl.elements)).map(
        (el: DesignElement) => ({ ...el, id: this.uid('el') })
      );
      this.clearSelection();
      this.activeNav = 'studio';
      this.fitArtboardToViewport();
      this.pushHistorySnapshot();
      this.render();
      this.showToast(`Applied template "${tpl.name}"`);
    }
  }

  // ============================================================================
  // DRAG, MARQUEE MULTI-SELECT, RESIZE, ROTATE & FREEHAND BRUSH ENGINE
  // ============================================================================

  private startMarqueeSelection(e: MouseEvent, artboard: HTMLElement): void {
    const marqueeBox = document.getElementById('studio-marquee-box');
    if (!marqueeBox) return;

    const rect = artboard.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / this.zoom;
    const startY = (e.clientY - rect.top) / this.zoom;
    let hasMoved = false;

    const onMove = (moveEvent: MouseEvent) => {
      const curX = (moveEvent.clientX - rect.left) / this.zoom;
      const curY = (moveEvent.clientY - rect.top) / this.zoom;
      if (Math.abs(curX - startX) > 4 || Math.abs(curY - startY) > 4) {
        hasMoved = true;
      }
      if (!hasMoved) return;

      const x = Math.min(startX, curX);
      const y = Math.min(startY, curY);
      const w = Math.abs(curX - startX);
      const h = Math.abs(curY - startY);

      marqueeBox.classList.remove('hidden');
      marqueeBox.style.left = `${x}px`;
      marqueeBox.style.top = `${y}px`;
      marqueeBox.style.width = `${w}px`;
      marqueeBox.style.height = `${h}px`;
    };

    const onUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      marqueeBox.classList.add('hidden');

      if (!hasMoved) {
        if (this.selectedElementIds.length > 0 || this.editingTextId) {
          this.clearSelection();
          this.render();
        }
        return;
      }

      const endX = (upEvent.clientX - rect.left) / this.zoom;
      const endY = (upEvent.clientY - rect.top) / this.zoom;
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);

      const hits = this.activePage.elements.filter((el) => {
        if (el.hidden || el.locked) return false;
        const ex2 = el.x + el.width;
        const ey2 = el.y + el.height;
        return el.x < maxX && ex2 > minX && el.y < maxY && ey2 > minY;
      });

      const hitIds = new Set<string>();
      for (const h of hits) {
        if (h.groupId) {
          this.activePage.elements
            .filter((el) => el.groupId === h.groupId && !el.hidden && !el.locked)
            .forEach((gEl) => hitIds.add(gEl.id));
        } else {
          hitIds.add(h.id);
        }
      }

      this.selectedElementIds = Array.from(hitIds);
      this.selectedElementId = this.selectedElementIds[0] || null;
      if (this.selectedElementIds.length <= 1 && this.alignRelativeTo === 'selection') {
        this.alignRelativeTo = 'canvas';
      }
      this.render();
      if (this.selectedElementIds.length > 1) {
        this.showToast(
          `Selected ${this.selectedElementIds.length} objects — click "Group" (Ctrl+G) to bind them or drag to move/resize as a unit`
        );
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  private startElementDrag(e: MouseEvent, el: DesignElement): void {
    if (el.locked || this.editingTextId === el.id || this.isDrawingMode) return;
    e.stopPropagation();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const movingElements =
      this.selectedElementIds.includes(el.id) && this.selectedElements.length > 1
        ? this.selectedElements.filter((item) => !item.locked)
        : [el];

    const initialPositions = new Map<string, { x: number; y: number }>();
    movingElements.forEach((item) => {
      initialPositions.set(item.id, { x: item.x, y: item.y });
    });

    // Compute combined bounding box for single-unit group/multi-selection snapping
    const initMinX = Math.min(...movingElements.map((item) => item.x));
    const initMinY = Math.min(...movingElements.map((item) => item.y));
    const initMaxX = Math.max(...movingElements.map((item) => item.x + item.width));
    const initMaxY = Math.max(...movingElements.map((item) => item.y + item.height));
    const boxW = initMaxX - initMinX;
    const boxH = initMaxY - initMinY;

    const W = this.activeProject.width;
    const H = this.activeProject.height;

    const onMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startMouseX) / this.zoom;
      const dy = (moveEvent.clientY - startMouseY) / this.zoom;
      let nextBoxX = Math.round(initMinX + dx);
      let nextBoxY = Math.round(initMinY + dy);

      this.snapLines = {};
      const snapThreshold = 8;

      const boxCenterX = nextBoxX + boxW / 2;
      const boxCenterY = nextBoxY + boxH / 2;

      if (Math.abs(boxCenterX - W / 2) < snapThreshold) {
        nextBoxX = Math.round(W / 2 - boxW / 2);
        this.snapLines.x = W / 2;
      }
      if (Math.abs(boxCenterY - H / 2) < snapThreshold) {
        nextBoxY = Math.round(H / 2 - boxH / 2);
        this.snapLines.y = H / 2;
      }

      for (const gx of this.customGuides.x) {
        if (Math.abs(nextBoxX - gx) < snapThreshold) {
          nextBoxX = gx;
          this.snapLines.x = gx;
        } else if (Math.abs(nextBoxX + boxW / 2 - gx) < snapThreshold) {
          nextBoxX = Math.round(gx - boxW / 2);
          this.snapLines.x = gx;
        } else if (Math.abs(nextBoxX + boxW - gx) < snapThreshold) {
          nextBoxX = gx - boxW;
          this.snapLines.x = gx;
        }
      }
      for (const gy of this.customGuides.y) {
        if (Math.abs(nextBoxY - gy) < snapThreshold) {
          nextBoxY = gy;
          this.snapLines.y = gy;
        } else if (Math.abs(nextBoxY + boxH / 2 - gy) < snapThreshold) {
          nextBoxY = Math.round(gy - boxH / 2);
          this.snapLines.y = gy;
        } else if (Math.abs(nextBoxY + boxH - gy) < snapThreshold) {
          nextBoxY = gy - boxH;
          this.snapLines.y = gy;
        }
      }

      for (const other of this.activePage.elements) {
        if (this.selectedElementIds.includes(other.id) || other.hidden) continue;
        if (Math.abs(nextBoxX - other.x) < snapThreshold) {
          nextBoxX = other.x;
          this.snapLines.x = other.x;
        } else if (Math.abs(nextBoxX + boxW - (other.x + other.width)) < snapThreshold) {
          nextBoxX = other.x + other.width - boxW;
          this.snapLines.x = other.x + other.width;
        }
        if (Math.abs(nextBoxY - other.y) < snapThreshold) {
          nextBoxY = other.y;
          this.snapLines.y = other.y;
        } else if (Math.abs(nextBoxY + boxH - (other.y + other.height)) < snapThreshold) {
          nextBoxY = other.y + other.height - boxH;
          this.snapLines.y = other.y + other.height;
        }
      }

      const appliedDx = nextBoxX - initMinX;
      const appliedDy = nextBoxY - initMinY;

      movingElements.forEach((item) => {
        const init = initialPositions.get(item.id);
        if (init) {
          item.x = Math.round(init.x + appliedDx);
          item.y = Math.round(init.y + appliedDy);
        }
      });

      this.syncSmartConnectors();
      this.renderArtboardOnly();
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.snapLines = {};
      this.pushHistorySnapshot();
      this.renderArtboardOnly();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  private startGroupResize(e: MouseEvent, dir: string): void {
    const selected = this.selectedElements.filter((el) => !el.locked);
    if (selected.length < 2) return;
    e.stopPropagation();
    e.preventDefault();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const groupMinX = Math.min(...selected.map((el) => el.x));
    const groupMinY = Math.min(...selected.map((el) => el.y));
    const groupMaxX = Math.max(...selected.map((el) => el.x + el.width));
    const groupMaxY = Math.max(...selected.map((el) => el.y + el.height));
    const origGroupW = Math.max(24, groupMaxX - groupMinX);
    const origGroupH = Math.max(24, groupMaxY - groupMinY);

    interface MemberSnapshot {
      relX: number;
      relY: number;
      relW: number;
      relH: number;
      origFontSize: number;
      origStrokeWidth: number;
      origBorderRadius: number;
    }

    const memberSnapshots = new Map<string, MemberSnapshot>();
    selected.forEach((el) => {
      memberSnapshots.set(el.id, {
        relX: (el.x - groupMinX) / origGroupW,
        relY: (el.y - groupMinY) / origGroupH,
        relW: el.width / origGroupW,
        relH: el.height / origGroupH,
        origFontSize: el.fontSize || 32,
        origStrokeWidth: el.strokeWidth || 0,
        origBorderRadius: el.borderRadius || 0,
      });
    });

    const onMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startMouseX) / this.zoom;
      const dy = (moveEvent.clientY - startMouseY) / this.zoom;

      let newGroupX = groupMinX;
      let newGroupY = groupMinY;
      let newGroupW = origGroupW;
      let newGroupH = origGroupH;

      const minUnitSize = 36;
      const snapThreshold = 8;
      this.snapLines = {};

      if (dir.includes('e')) {
        let rightEdge = Math.round(groupMinX + origGroupW + dx);
        for (const gx of this.customGuides.x) {
          if (Math.abs(rightEdge - gx) < snapThreshold) {
            rightEdge = gx;
            this.snapLines.x = gx;
          }
        }
        newGroupW = Math.max(minUnitSize, rightEdge - groupMinX);
      }
      if (dir.includes('s')) {
        let bottomEdge = Math.round(groupMinY + origGroupH + dy);
        for (const gy of this.customGuides.y) {
          if (Math.abs(bottomEdge - gy) < snapThreshold) {
            bottomEdge = gy;
            this.snapLines.y = gy;
          }
        }
        newGroupH = Math.max(minUnitSize, bottomEdge - groupMinY);
      }
      if (dir.includes('w')) {
        let leftEdge = Math.round(groupMinX + dx);
        for (const gx of this.customGuides.x) {
          if (Math.abs(leftEdge - gx) < snapThreshold) {
            leftEdge = gx;
            this.snapLines.x = gx;
          }
        }
        const possibleW = groupMaxX - leftEdge;
        if (possibleW >= minUnitSize) {
          newGroupW = possibleW;
          newGroupX = leftEdge;
        }
      }
      if (dir.includes('n')) {
        let topEdge = Math.round(groupMinY + dy);
        for (const gy of this.customGuides.y) {
          if (Math.abs(topEdge - gy) < snapThreshold) {
            topEdge = gy;
            this.snapLines.y = gy;
          }
        }
        const possibleH = groupMaxY - topEdge;
        if (possibleH >= minUnitSize) {
          newGroupH = possibleH;
          newGroupY = topEdge;
        }
      }

      const scaleX = newGroupW / origGroupW;
      const scaleY = newGroupH / origGroupH;
      const uniformScale = (scaleX + scaleY) / 2;

      selected.forEach((el) => {
        const snap = memberSnapshots.get(el.id);
        if (!snap) return;
        el.x = Math.round(newGroupX + snap.relX * newGroupW);
        el.y = Math.round(newGroupY + snap.relY * newGroupH);
        el.width = Math.max(12, Math.round(snap.relW * newGroupW));
        el.height = Math.max(12, Math.round(snap.relH * newGroupH));

        if (el.type === 'text') {
          el.fontSize = Math.max(8, Math.min(300, Math.round(snap.origFontSize * uniformScale)));
        }
        if (snap.origBorderRadius > 0) {
          el.borderRadius = Math.max(0, Math.round(snap.origBorderRadius * uniformScale));
        }
        if (snap.origStrokeWidth > 0) {
          el.strokeWidth = Math.max(1, Math.round(snap.origStrokeWidth * uniformScale));
        }
      });

      this.syncSmartConnectors();
      this.renderArtboardOnly();
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.snapLines = {};
      this.pushHistorySnapshot();
      this.render();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  private startElementResize(e: MouseEvent, el: DesignElement, dir: string): void {
    if (el.locked) return;
    // If multiple elements or a bound group are selected, resize the entire group unit proportionally
    if (this.selectedElementIds.includes(el.id) && this.selectedElements.length > 1) {
      this.startGroupResize(e, dir);
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const origX = el.x;
    const origY = el.y;
    const origW = el.width;
    const origH = el.height;
    const origFontSize = el.fontSize || 32;

    const onMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startMouseX) / this.zoom;
      const dy = (moveEvent.clientY - startMouseY) / this.zoom;

      let newX = origX;
      let newY = origY;
      let newW = origW;
      let newH = origH;

      const snapThreshold = 8;
      this.snapLines = {};

      if (dir.includes('e')) {
        let rightEdge = Math.round(origX + origW + dx);
        for (const gx of this.customGuides.x) {
          if (Math.abs(rightEdge - gx) < snapThreshold) {
            rightEdge = gx;
            this.snapLines.x = gx;
          }
        }
        newW = Math.max(24, rightEdge - origX);
      }
      if (dir.includes('s')) {
        let bottomEdge = Math.round(origY + origH + dy);
        for (const gy of this.customGuides.y) {
          if (Math.abs(bottomEdge - gy) < snapThreshold) {
            bottomEdge = gy;
            this.snapLines.y = gy;
          }
        }
        newH = Math.max(20, bottomEdge - origY);
      }
      if (dir.includes('w')) {
        let leftEdge = Math.round(origX + dx);
        for (const gx of this.customGuides.x) {
          if (Math.abs(leftEdge - gx) < snapThreshold) {
            leftEdge = gx;
            this.snapLines.x = gx;
          }
        }
        const possibleW = origX + origW - leftEdge;
        if (possibleW >= 24) {
          newW = possibleW;
          newX = leftEdge;
        }
      }
      if (dir.includes('n')) {
        let topEdge = Math.round(origY + dy);
        for (const gy of this.customGuides.y) {
          if (Math.abs(topEdge - gy) < snapThreshold) {
            topEdge = gy;
            this.snapLines.y = gy;
          }
        }
        const possibleH = origY + origH - topEdge;
        if (possibleH >= 20) {
          newH = possibleH;
          newY = topEdge;
        }
      }

      el.x = newX;
      el.y = newY;
      el.width = newW;
      el.height = newH;

      if (el.type === 'text' && (dir === 'se' || dir === 'nw' || dir === 'ne' || dir === 'sw')) {
        const ratio = newW / Math.max(1, origW);
        el.fontSize = Math.max(10, Math.min(260, Math.round(origFontSize * ratio)));
      }

      this.syncSmartConnectors();
      this.renderArtboardOnly();
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.snapLines = {};
      this.pushHistorySnapshot();
      this.render();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  private startRulerGuideDrag(e: MouseEvent, sourceRuler: 'top' | 'left'): void {
    e.preventDefault();
    e.stopPropagation();

    const artboard = document.getElementById('studio-artboard');
    if (!artboard) return;

    const W = this.activeProject.width;
    const H = this.activeProject.height;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const rect = artboard.getBoundingClientRect();

    const initX = Math.max(0, Math.min(W, Math.round((e.clientX - rect.left) / this.zoom)));
    const initY = Math.max(0, Math.min(H, Math.round((e.clientY - rect.top) / this.zoom)));

    // Dragging down from Top Ruler pulls out a Horizontal Guide (Y), while clicking Top Ruler places a Vertical Guide (X).
    // Dragging right from Left Ruler pulls out a Vertical Guide (X), while clicking Left Ruler places a Horizontal Guide (Y).
    let currentAxis: 'x' | 'y' = sourceRuler === 'top' ? 'x' : 'y';
    let currentIndex =
      currentAxis === 'x'
        ? this.customGuides.x.push(initX) - 1
        : this.customGuides.y.push(initY) - 1;
    let currentPos = currentAxis === 'x' ? initX : initY;
    let switchedToPullOutAxis = false;

    this.activeDraggingGuide = { axis: currentAxis, index: currentIndex, pos: currentPos };
    this.renderArtboardOnly();

    const onMove = (moveEvent: MouseEvent) => {
      const curRect =
        document.getElementById('studio-artboard')?.getBoundingClientRect() || rect;
      const dyScreen = moveEvent.clientY - startClientY;
      const dxScreen = moveEvent.clientX - startClientX;

      if (sourceRuler === 'top' && !switchedToPullOutAxis && dyScreen > 10) {
        // User is dragging downward from the top ruler onto the canvas -> switch to Horizontal Guide (Y)
        this.customGuides.x.splice(currentIndex, 1);
        currentAxis = 'y';
        const rawY = Math.round((moveEvent.clientY - curRect.top) / this.zoom);
        currentPos = Math.max(0, Math.min(H, rawY));
        currentIndex = this.customGuides.y.push(currentPos) - 1;
        switchedToPullOutAxis = true;
      } else if (sourceRuler === 'left' && !switchedToPullOutAxis && dxScreen > 10) {
        // User is dragging rightward from the left ruler onto the canvas -> switch to Vertical Guide (X)
        this.customGuides.y.splice(currentIndex, 1);
        currentAxis = 'x';
        const rawX = Math.round((moveEvent.clientX - curRect.left) / this.zoom);
        currentPos = Math.max(0, Math.min(W, rawX));
        currentIndex = this.customGuides.x.push(currentPos) - 1;
        switchedToPullOutAxis = true;
      }

      if (currentAxis === 'x') {
        let nextX = Math.round((moveEvent.clientX - curRect.left) / this.zoom);
        if (moveEvent.shiftKey) {
          nextX = Math.round(nextX / 10) * 10;
        } else if (Math.abs(nextX - W / 2) < 7) {
          nextX = Math.round(W / 2);
        }
        currentPos = Math.max(0, Math.min(W, nextX));
        this.customGuides.x[currentIndex] = currentPos;
      } else {
        let nextY = Math.round((moveEvent.clientY - curRect.top) / this.zoom);
        if (moveEvent.shiftKey) {
          nextY = Math.round(nextY / 10) * 10;
        } else if (Math.abs(nextY - H / 2) < 7) {
          nextY = Math.round(H / 2);
        }
        currentPos = Math.max(0, Math.min(H, nextY));
        this.customGuides.y[currentIndex] = currentPos;
      }

      this.activeDraggingGuide = { axis: currentAxis, index: currentIndex, pos: currentPos };
      this.renderArtboardOnly();
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.activeDraggingGuide = null;
      this.render();
      this.showToast(
        currentAxis === 'x'
          ? `Placed vertical snapping guide at X = ${currentPos}px (drag to move, double-click or × to remove)`
          : `Placed horizontal snapping guide at Y = ${currentPos}px (drag to move, double-click or × to remove)`
      );
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  private startExistingGuideDrag(e: MouseEvent, axis: 'x' | 'y', index: number): void {
    e.preventDefault();
    e.stopPropagation();

    const artboard = document.getElementById('studio-artboard');
    if (!artboard) return;

    const W = this.activeProject.width;
    const H = this.activeProject.height;
    const rect = artboard.getBoundingClientRect();
    let currentPos = axis === 'x' ? this.customGuides.x[index] : this.customGuides.y[index];
    let isDraggedOutOfBounds = false;

    this.activeDraggingGuide = { axis, index, pos: currentPos };
    this.renderArtboardOnly();

    const onMove = (moveEvent: MouseEvent) => {
      const curRect =
        document.getElementById('studio-artboard')?.getBoundingClientRect() || rect;
      if (axis === 'x') {
        const rawX = Math.round((moveEvent.clientX - curRect.left) / this.zoom);
        isDraggedOutOfBounds = rawX < -12 || rawX > W + 12;
        let nextX = rawX;
        if (moveEvent.shiftKey) {
          nextX = Math.round(nextX / 10) * 10;
        } else if (Math.abs(nextX - W / 2) < 7) {
          nextX = Math.round(W / 2);
        }
        currentPos = Math.max(0, Math.min(W, nextX));
        this.customGuides.x[index] = currentPos;
      } else {
        const rawY = Math.round((moveEvent.clientY - curRect.top) / this.zoom);
        isDraggedOutOfBounds = rawY < -12 || rawY > H + 12;
        let nextY = rawY;
        if (moveEvent.shiftKey) {
          nextY = Math.round(nextY / 10) * 10;
        } else if (Math.abs(nextY - H / 2) < 7) {
          nextY = Math.round(H / 2);
        }
        currentPos = Math.max(0, Math.min(H, nextY));
        this.customGuides.y[index] = currentPos;
      }

      this.activeDraggingGuide = { axis, index, pos: currentPos };
      this.renderArtboardOnly();
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.activeDraggingGuide = null;

      if (isDraggedOutOfBounds) {
        if (axis === 'x') this.customGuides.x.splice(index, 1);
        else this.customGuides.y.splice(index, 1);
        this.render();
        this.showToast(`Removed ${axis === 'x' ? 'vertical' : 'horizontal'} guide (dragged off artboard)`);
        return;
      }

      this.render();
      this.showToast(
        axis === 'x'
          ? `Moved vertical guide to X = ${currentPos}px`
          : `Moved horizontal guide to Y = ${currentPos}px`
      );
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  private cycleGuidePresets(): void {
    const W = this.activeProject.width;
    const H = this.activeProject.height;
    this.guidePresetStep = (this.guidePresetStep + 1) % 3;

    if (this.guidePresetStep === 1) {
      const cx = Math.round(W / 2);
      const cy = Math.round(H / 2);
      if (!this.customGuides.x.includes(cx)) this.customGuides.x.push(cx);
      if (!this.customGuides.y.includes(cy)) this.customGuides.y.push(cy);
      this.showRulers = true;
      this.render();
      this.showToast(`Added Center Crosshair Snapping Guides (X = ${cx}px, Y = ${cy}px)`);
    } else if (this.guidePresetStep === 2) {
      this.customGuides.x = [Math.round(W / 3), Math.round((W * 2) / 3)];
      this.customGuides.y = [Math.round(H / 3), Math.round((H * 2) / 3)];
      this.showRulers = true;
      this.render();
      this.showToast('Applied Rule-of-Thirds Snapping Guides (3×3 Layout Grid)');
    } else {
      this.customGuides = { x: [], y: [] };
      this.render();
      this.showToast('Cleared all custom snapping guides');
    }
  }

  private startElementRotate(e: MouseEvent, el: DesignElement): void {
    if (el.locked) return;
    e.stopPropagation();
    e.preventDefault();

    const artboard = document.getElementById('studio-artboard');
    if (!artboard) return;
    const rect = artboard.getBoundingClientRect();
    const centerX = rect.left + (el.x + el.width / 2) * this.zoom;
    const centerY = rect.top + (el.y + el.height / 2) * this.zoom;

    const onMove = (moveEvent: MouseEvent) => {
      const angleRad = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      let deg = Math.round((angleRad * 180) / Math.PI + 90);
      if (deg < 0) deg += 360;
      if (moveEvent.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }
      el.rotation = deg % 360;
      this.renderArtboardOnly();
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.pushHistorySnapshot();
      this.render();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  private startFreehandDrawing(e: MouseEvent): void {
    const artboard = document.getElementById('studio-artboard');
    if (!artboard) return;
    const rect = artboard.getBoundingClientRect();
    const startX = Math.round((e.clientX - rect.left) / this.zoom);
    const startY = Math.round((e.clientY - rect.top) / this.zoom);

    const points: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const newEl: DesignElement = {
      id: this.uid('path'),
      name: 'Brush Stroke',
      type: 'path',
      x: 0,
      y: 0,
      width: this.activeProject.width,
      height: this.activeProject.height,
      rotation: 0,
      opacity: this.brushOpacity,
      stroke: this.brushColor,
      strokeWidth: this.brushWidth,
      pathPoints: points,
    };

    this.activeDrawingElement = newEl;
    this.activePage.elements.push(newEl);
    this.renderArtboardOnly();

    const onMove = (moveEvent: MouseEvent) => {
      const px = Math.round((moveEvent.clientX - rect.left) / this.zoom);
      const py = Math.round((moveEvent.clientY - rect.top) / this.zoom);
      points.push({ x: px, y: py });
      this.renderArtboardOnly();
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.activeDrawingElement = null;
      if (points.length > 1) {
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const minX = Math.max(0, Math.min(...xs) - this.brushWidth);
        const minY = Math.max(0, Math.min(...ys) - this.brushWidth);
        const maxX = Math.min(this.activeProject.width, Math.max(...xs) + this.brushWidth);
        const maxY = Math.min(this.activeProject.height, Math.max(...ys) + this.brushWidth);
        newEl.x = minX;
        newEl.y = minY;
        newEl.width = Math.max(24, maxX - minX);
        newEl.height = Math.max(24, maxY - minY);
        newEl.pathPoints = points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
        this.selectedElementId = newEl.id;
        this.selectedElementIds = [newEl.id];
        this.pushHistorySnapshot();
      } else {
        this.activePage.elements.pop();
      }
      this.render();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ============================================================================
  // CANVA PARITY HELPERS (FEATURES 1–8)
  // ============================================================================

  /**
   * Feature 6: Automatically updates bounding box of any Smart Connector linked to two canvas elements
   */
  private syncSmartConnectors(page: DesignPage = this.activePage): void {
    for (const el of page.elements) {
      if (el.type !== 'connector' || !el.fromElementId || !el.toElementId) continue;
      const fromEl = page.elements.find((item) => item.id === el.fromElementId);
      const toEl = page.elements.find((item) => item.id === el.toElementId);
      if (!fromEl || !toEl) continue;

      const fcx = fromEl.x + fromEl.width / 2;
      const fcy = fromEl.y + fromEl.height / 2;
      const tcx = toEl.x + toEl.width / 2;
      const tcy = toEl.y + toEl.height / 2;
      const pad = 36;
      const minX = Math.round(Math.min(fcx, tcx) - pad);
      const minY = Math.round(Math.min(fcy, tcy) - pad);
      const maxX = Math.round(Math.max(fcx, tcx) + pad);
      const maxY = Math.round(Math.max(fcy, tcy) + pad);

      el.x = minX;
      el.y = minY;
      el.width = Math.max(72, maxX - minX);
      el.height = Math.max(72, maxY - minY);
    }
  }

  /**
   * Feature 1: Applies a Page-Wide Animation Combination across all layers on the active slide with staggered delays
   */
  private applyPageAnimationPreset(
    preset: PageAnimationPresetKind
  ): void {
    const visibleEls = this.activePage.elements.filter((item) => !item.hidden);
    if (visibleEls.length === 0) return;

    this.activePage.pageAnimationPreset = preset;

    if (preset === 'clear') {
      visibleEls.forEach((item) => {
        item.animation = 'none';
        item.animationDelay = 0;
        item.animationDuration = 0.6;
      });
      this.pushHistorySnapshot('Cleared Page Animations');
      this.render();
      this.showToast('Cleared all animations on active page');
      return;
    }

    const mapping: Record<
      Exclude<typeof preset, 'clear'>,
      { kinds: AnimationKind[]; duration: number; stagger: number; label: string }
    > = {
      corporate: {
        kinds: ['rise', 'fade', 'pan'],
        duration: 0.6,
        stagger: 0.12,
        label: 'Corporate Clean',
      },
      playful: {
        kinds: ['pop', 'tumble', 'breathe'],
        duration: 0.55,
        stagger: 0.14,
        label: 'Playful Pop',
      },
      cinematic: {
        kinds: ['wipe', 'drift', 'fade'],
        duration: 0.85,
        stagger: 0.18,
        label: 'Cinematic Reveal',
      },
      energetic: {
        kinds: ['neon-flicker', 'pop', 'rise'],
        duration: 0.5,
        stagger: 0.1,
        label: 'Energetic Social',
      },
    };

    const cfg = mapping[preset];
    visibleEls.forEach((item, idx) => {
      item.animation = cfg.kinds[idx % cfg.kinds.length];
      item.animationDuration = cfg.duration;
      item.animationDelay = Number((idx * cfg.stagger).toFixed(2));
    });

    this.pushHistorySnapshot(`Applied "${cfg.label}" Page Animation`);
    this.render();
    this.replayCanvasAnimations();
    this.showToast(`Applied "${cfg.label}" staggered animation sequence (${visibleEls.length} layers)`);
  }

  /**
   * Feature 1: Re-triggers CSS entrance animations on all animated elements on the active canvas
   */
  private replayCanvasAnimations(): void {
    const artboard = document.getElementById('studio-artboard');
    if (!artboard) return;
    const animatedNodes = artboard.querySelectorAll<HTMLElement>('[data-anim-node]');
    animatedNodes.forEach((node) => {
      const cls = node.getAttribute('data-anim-class');
      if (!cls) return;
      node.classList.remove(cls);
      // Force reflow so browser restarts keyframe animation
      void node.offsetWidth;
      node.classList.add(cls);
    });
  }

  /**
   * Feature 4: Toggles Bullet List (•) or Numbered List (1.) formatting on a text layer
   */
  private toggleTextListStyle(el: DesignElement, targetStyle: TextListStyleKind): void {
    if (el.type !== 'text') return;
    const rawLines = (el.text || '').split('\n');
    const cleanLines = rawLines.map((line) =>
      line.replace(/^(\s*(?:•|-|\*|\d+\.)\s+)/, '')
    );

    const curStyle = el.textListStyle || el.listStyle || 'none';
    const nextStyle: TextListStyleKind =
      curStyle === targetStyle ? 'none' : targetStyle;
    el.textListStyle = nextStyle;
    el.listStyle = nextStyle;

    if (nextStyle === 'bullet') {
      el.text = cleanLines.map((line) => (line.trim() ? `• ${line}` : line)).join('\n');
    } else if (nextStyle === 'number') {
      let num = 1;
      el.text = cleanLines
        .map((line) => (line.trim() ? `${num++}. ${line}` : line))
        .join('\n');
    } else {
      el.text = cleanLines.join('\n');
    }

    this.pushHistorySnapshot(`Formatted Text List (${nextStyle})`);
    this.render();
    this.showToast(
      nextStyle === 'none'
        ? 'Removed list formatting'
        : `Applied ${nextStyle === 'bullet' ? 'Bullet List (•)' : 'Numbered List (1.)'}`
    );
  }

  /**
   * Feature 2: Snaps an Image element's dimensions to a studio aspect ratio preset
   */
  private applyImageCropAspect(
    el: DesignElement,
    aspect: 'free' | '1:1' | '16:9' | '4:5' | '9:16'
  ): void {
    if (el.type !== 'image') return;
    el.cropAspect = aspect;
    if (aspect !== 'free') {
      const ratios: Record<string, number> = {
        '1:1': 1,
        '16:9': 16 / 9,
        '4:5': 4 / 5,
        '9:16': 9 / 16,
      };
      const ratio = ratios[aspect] || 1;
      const baseW = Math.max(120, el.width);
      el.height = Math.max(100, Math.round(baseW / ratio));
    }
    this.pushHistorySnapshot(`Set Image Crop Aspect (${aspect})`);
    this.render();
    this.showToast(`Cropped photo frame to ${aspect.toUpperCase()} aspect ratio`);
  }

  /**
   * Feature 8: Places an on-canvas Sticky Review Comment Pin at cursor coordinates
   */
  private placeCommentPinAtCursor(e: MouseEvent, artboard: HTMLElement): void {
    e.preventDefault();
    e.stopPropagation();
    const rect = artboard.getBoundingClientRect();
    const x = Math.max(20, Math.min(this.activeProject.width - 20, Math.round((e.clientX - rect.left) / this.zoom)));
    const y = Math.max(20, Math.min(this.activeProject.height - 20, Math.round((e.clientY - rect.top) / this.zoom)));

    if (!this.activePage.comments) {
      this.activePage.comments = [];
    }
    const nextNum = this.activePage.comments.length + 1;
    const comment: CanvasComment = {
      id: this.uid('cmt'),
      x,
      y,
      author: 'Studio Lead',
      text: `Review Note #${nextNum}: Check visual hierarchy & alignment here.`,
      createdAt: Date.now(),
      resolved: false,
    };
    this.activePage.comments.push(comment);
    this.activeCommentId = comment.id;
    this.isCommentPinMode = false;
    this.saveToLocalStorage();
    this.render();
    this.showToast(`Pinned Sticky Note #${nextNum} at (${x}, ${y})`);
  }

  /**
   * Feature 8: Saves a Named Version Checkpoint Milestone on the active project
   */
  private saveNamedCheckpoint(customName?: string): void {
    if (!this.activeProject.checkpoints) {
      this.activeProject.checkpoints = [];
    }
    const count = this.activeProject.checkpoints.length + 1;
    const name =
      (customName || '').trim() ||
      `Milestone v${count}.0 — ${this.activePage.title}`;
    const cp: ProjectCheckpoint = {
      id: this.uid('cp'),
      name,
      createdAt: Date.now(),
      projectSnapshot: JSON.stringify({
        width: this.activeProject.width,
        height: this.activeProject.height,
        pages: this.activeProject.pages,
      }),
    };
    this.activeProject.checkpoints.unshift(cp);
    this.saveToLocalStorage();
    this.render();
    this.showToast(`Saved version checkpoint "${name}"`);
  }

  /**
   * Feature 8: Restores a Named Version Checkpoint Milestone
   */
  private restoreNamedCheckpoint(checkpointId: string): void {
    const cp = this.activeProject.checkpoints?.find((c) => c.id === checkpointId);
    if (!cp) return;
    try {
      const parsed = JSON.parse(cp.projectSnapshot);
      if (parsed && Array.isArray(parsed.pages)) {
        this.activeProject.width = parsed.width || this.activeProject.width;
        this.activeProject.height = parsed.height || this.activeProject.height;
        this.activeProject.pages = JSON.parse(JSON.stringify(parsed.pages));
        this.activePageIndex = Math.min(this.activePageIndex, this.activeProject.pages.length - 1);
        this.clearSelection();
        this.pushHistorySnapshot(`Restored Checkpoint: ${cp.name}`);
        this.render();
        this.showToast(`Restored project to checkpoint "${cp.name}"`);
      }
    } catch {
      this.showToast('Could not restore checkpoint snapshot');
    }
  }

  /**
   * Feature 7: Detects {{Variable}} tokens across text layers on the active page
   */
  private detectTemplateVariables(page: DesignPage = this.activePage): string[] {
    const found = new Set<string>();
    const regex = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;
    for (const el of page.elements) {
      if (el.type === 'text' && el.text) {
        let match: RegExpExecArray | null;
        while ((match = regex.exec(el.text)) !== null) {
          found.add(match[1]);
        }
      }
    }
    return Array.from(found);
  }

  /**
   * Feature 7: Inserts {{Name}}, {{Role}}, and {{Company}} placeholder text elements on the active page
   */
  private insertBulkTemplatePlaceholders(): void {
    const cx = Math.round(this.activeProject.width / 2);
    const cy = Math.round(this.activeProject.height / 2);
    const cardId = this.uid('el');
    const nameId = this.uid('el');
    const roleId = this.uid('el');
    const compId = this.uid('el');

    this.activePage.elements.push(
      {
        id: cardId,
        name: 'Badge Card Backdrop',
        type: 'shape',
        shapeKind: 'rect',
        x: Math.max(40, cx - 340),
        y: Math.max(40, cy - 170),
        width: 680,
        height: 340,
        rotation: 0,
        opacity: 0.95,
        fill: '#1e1b4b',
        stroke: '#6366f1',
        strokeWidth: 3,
        borderRadius: 24,
      },
      {
        id: nameId,
        name: 'Merge Variable: {{Name}}',
        type: 'text',
        text: '{{Name}}',
        x: Math.max(60, cx - 300),
        y: Math.max(60, cy - 115),
        width: 600,
        height: 76,
        rotation: 0,
        opacity: 1,
        fontFamily: 'Bricolage Grotesque',
        fontSize: 54,
        fontWeight: 700,
        textAlign: 'center',
        color: '#ffffff',
      },
      {
        id: roleId,
        name: 'Merge Variable: {{Role}}',
        type: 'text',
        text: '{{Role}}',
        x: Math.max(60, cx - 300),
        y: Math.max(60, cy - 20),
        width: 600,
        height: 48,
        rotation: 0,
        opacity: 1,
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 30,
        fontWeight: 600,
        textAlign: 'center',
        color: '#38bdf8',
      },
      {
        id: compId,
        name: 'Merge Variable: {{Company}}',
        type: 'text',
        text: '{{Company}}',
        x: Math.max(60, cx - 220),
        y: Math.max(60, cy + 52),
        width: 440,
        height: 44,
        rotation: 0,
        opacity: 1,
        fontFamily: 'JetBrains Mono',
        fontSize: 22,
        fontWeight: 700,
        textAlign: 'center',
        color: '#f8fafc',
        textBgColor: '#4f46e5',
        textBgPadding: 8,
        textBgRadius: 12,
      }
    );

    this.selectedElementId = nameId;
    this.selectedElementIds = [nameId];
    this.pushHistorySnapshot('Inserted Bulk Create {{Variable}} Template');
    this.render();
    this.showToast('Inserted {{Name}}, {{Role}}, and {{Company}} data-merge placeholders');
  }

  /**
   * Feature 7: Generates N personalized pages by merging bulkDatasetRows into active page {{Variable}} tokens
   */
  private runBulkCreateMerge(): void {
    const validRows = this.bulkDatasetRows.filter((row) =>
      row.some((cell) => String(cell || '').trim().length > 0)
    );
    if (validRows.length === 0) {
      this.showToast('Add at least 1 data row to generate pages');
      return;
    }

    // If active page has no {{Variable}} placeholders yet, automatically insert them so merge always succeeds
    if (this.detectTemplateVariables(this.activePage).length === 0) {
      this.insertBulkTemplatePlaceholders();
    }

    const templatePageJson = JSON.stringify(this.activePage);
    const createdPages: DesignPage[] = [];

    validRows.forEach((row, rIdx) => {
      const clonedPage: DesignPage = JSON.parse(templatePageJson);
      clonedPage.id = this.uid('page');
      const primaryLabel = (row[0] || `Row ${rIdx + 1}`).trim();
      clonedPage.title = `${primaryLabel}`;
      clonedPage.elements = clonedPage.elements.map((el) => {
        const nextEl: DesignElement = { ...el, id: this.uid('el') };
        if (nextEl.type === 'text' && nextEl.text) {
          let mergedText = nextEl.text;
          this.bulkDatasetColumns.forEach((colName, cIdx) => {
            const val = row[cIdx] ?? '';
            const escapedCol = colName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const tokenRegex = new RegExp(`\\{\\{\\s*${escapedCol}\\s*\\}\\}`, 'gi');
            mergedText = mergedText.replace(tokenRegex, val);
          });
          nextEl.text = mergedText;
        }
        return nextEl;
      });
      createdPages.push(clonedPage);
    });

    this.activeProject.pages.push(...createdPages);
    this.activePageIndex = this.activeProject.pages.length - createdPages.length;
    this.showBulkCreateModal = false;
    this.clearSelection();
    this.pushHistorySnapshot(`Bulk Created ${createdPages.length} Pages`);
    this.render();
    this.showToast(
      `Bulk Created ${createdPages.length} personalized pages from dataset!`
    );
  }

  // ============================================================================
  // RENDERING THE ARTBOARD & ELEMENTS
  // ============================================================================

  private getTextEffectCss(el: DesignElement): string {
    const effect = el.textEffect || 'none';
    const color = el.color || '#ffffff';
    const effectColor = el.textEffectColor || '#6366f1';

    switch (effect) {
      case 'shadow':
        return `text-shadow: 4px 4px 6px ${effectColor};`;
      case 'lift':
        return `text-shadow: 0px 8px 24px rgba(0,0,0,0.65);`;
      case 'hollow':
        return `-webkit-text-stroke: 2px ${color}; color: transparent;`;
      case 'splice':
        return `-webkit-text-stroke: 2px ${color}; color: transparent; text-shadow: 4px 4px 0px ${effectColor};`;
      case 'neon':
        return `text-shadow: 0 0 8px ${color}, 0 0 18px ${effectColor}, 0 0 34px ${effectColor};`;
      case 'echo':
        return `text-shadow: -4px -4px 0px ${effectColor}88, -8px -8px 0px ${effectColor}44;`;
      default:
        if (el.shadowColor && el.shadowBlur) {
          return `text-shadow: ${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 4}px ${el.shadowBlur}px ${el.shadowColor};`;
        }
        return '';
    }
  }

  private renderElementInnerHtml(el: DesignElement): string {
    if (el.type === 'shape') {
      return renderShapeSvg(
        el.shapeKind || 'rect',
        el.fill || '#6366f1',
        el.stroke || 'none',
        el.strokeWidth || 0,
        el.borderRadius || 0,
        `dom_grad_${el.id}`,
        el.fillGradient
      );
    }

    if (el.type === 'sticker') {
      return renderStickerSvg(
        el.stickerKind || 'burst',
        el.fill || '#6366f1',
        el.stroke || '#f43f5e'
      );
    }

    if (el.type === 'chart') {
      return renderChartSvg(el);
    }

    if (el.type === 'qr') {
      return renderQrSvg(el);
    }

    if (el.type === 'table') {
      return renderTableSvg(el);
    }

    if (el.type === 'connector') {
      return renderConnectorSvg(el, this.activePage.elements);
    }

    if (el.type === 'grid') {
      const cells = getGridCellRects(
        el.gridLayout || 'split-v',
        el.width,
        el.height,
        el.gridGap ?? 12
      );
      const radius = el.borderRadius ?? 12;
      return `
        <div class="w-full h-full relative select-none pointer-events-none">
          ${cells
            .map((c, idx) => {
              const src = el.gridCells?.[idx] || '';
              return `
                <div
                  class="absolute overflow-hidden bg-slate-800/80 border border-white/15 flex flex-col items-center justify-center"
                  style="left:${c.x}px; top:${c.y}px; width:${c.w}px; height:${c.h}px; border-radius:${radius}px;"
                >
                  ${
                    src
                      ? `<img src="${src}" alt="Grid Cell ${idx + 1}" draggable="false" class="w-full h-full object-cover" />`
                      : `<span class="text-[11px] font-mono-tabular text-slate-300 bg-slate-950/70 px-2 py-1 rounded">Cell ${idx + 1} · Drop Photo</span>`
                  }
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    }

    if (el.type === 'image') {
      const radius = el.borderRadius || 0;
      const clipCss =
        el.frameShape && el.frameShape !== 'none'
          ? `clip-path: ${getFrameClipPathCss(el.frameShape)};`
          : `border-radius: ${radius}px;`;
      const filterCss = getImageFilterCss(el);
      const cropZoom = el.cropZoom || 1;
      const cropPanX = el.cropPanX || 0;
      const cropPanY = el.cropPanY || 0;

      return `
        <div class="w-full h-full overflow-hidden bg-slate-800/30 flex items-center justify-center relative" style="${clipCss}">
          <img
            src="${el.src || ''}"
            alt="${this.escapeHtml(el.name)}"
            referrerpolicy="no-referrer"
            draggable="false"
            class="w-full h-full pointer-events-none select-none"
            style="object-fit: ${el.objectFit || 'cover'}; filter: ${filterCss}; transform: scale(${cropZoom}) translate(${cropPanX}%, ${cropPanY}%);"
          />
          ${
            el.frameShape && el.frameShape !== 'none'
              ? `<span class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/70 text-[9px] font-mono-tabular text-indigo-300 uppercase pointer-events-none">Frame: ${el.frameShape}</span>`
              : ''
          }
        </div>
      `;
    }

    if (el.type === 'path' && el.pathPoints && el.pathPoints.length > 0) {
      const d = el.pathPoints
        .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
        .join(' ');
      return `
        <svg viewBox="0 0 ${el.width} ${el.height}" class="w-full h-full overflow-visible pointer-events-none">
          <path d="${d}" fill="none" stroke="${el.stroke || '#4f46e5'}" stroke-width="${el.strokeWidth || 6}" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `;
    }

    if (el.type === 'text') {
      const isEditing = this.editingTextId === el.id;
      if (!isEditing && el.textCurve && el.textCurve !== 0) {
        return renderCurvedTextSvg(el);
      }

      const effectCss = this.getTextEffectCss(el);
      const hasRtlScript = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(el.text || '');
      const effectiveDir: TextDirectionKind =
        el.textDirection || (hasRtlScript ? 'rtl' : 'ltr');
      const effectiveAlign =
        el.textAlign || (effectiveDir === 'rtl' ? 'right' : 'left');
      const hasBgPill = Boolean(el.textBgColor && el.textBgColor !== 'transparent');
      const bgPad = hasBgPill ? `${el.textBgPadding ?? 6}px` : '0px';
      const bgRad = hasBgPill ? `${el.textBgRadius ?? 8}px` : '0px';
      const textTransformCss =
        el.textTransform && el.textTransform !== 'none'
          ? `text-transform: ${el.textTransform};`
          : '';

      return `
        <div
          data-text-edit-id="${el.id}"
          dir="${effectiveDir}"
          ${el.langCode ? `lang="${this.escapeHtml(el.langCode)}"` : ''}
          contenteditable="${isEditing ? 'true' : 'false'}"
          spellcheck="false"
          class="w-full h-full outline-none whitespace-pre-wrap break-words ${isEditing ? 'cursor-text ring-2 ring-indigo-400 bg-indigo-950/10 rounded' : ''}"
          style="
            font-family: '${el.fontFamily || 'Plus Jakarta Sans'}', sans-serif;
            font-size: ${el.fontSize || 32}px;
            font-weight: ${el.fontWeight || 600};
            font-style: ${el.fontStyle || 'normal'};
            text-decoration: ${el.textDecoration || 'none'};
            text-align: ${effectiveAlign};
            unicode-bidi: plaintext;
            color: ${el.color || '#0f172a'};
            line-height: ${el.lineHeight || 1.2};
            letter-spacing: ${el.letterSpacing || 0}px;
            background-color: ${el.textBgColor || 'transparent'};
            padding: ${bgPad};
            border-radius: ${bgRad};
            ${textTransformCss}
            ${effectCss}
          "
        >${this.escapeHtml(el.text || '')}</div>
      `;
    }

    return '';
  }

  private renderArtboardMarkup(customZoom?: number, isPresentationSlide = false): string {
    const page = this.activePage;
    const W = this.activeProject.width;
    const H = this.activeProject.height;
    const activeZoom = customZoom ?? this.zoom;

    const bgStyle = page.backgroundGradient
      ? `background: ${page.backgroundGradient};`
      : `background-color: ${page.background || '#ffffff'};`;

    let patternOverlay = '';
    if (page.backgroundPattern === 'dots') {
      patternOverlay = `<div class="absolute inset-0 pointer-events-none" style="background-image: radial-gradient(rgba(148,163,184,0.28) 2px, transparent 2px); background-size: 32px 32px;"></div>`;
    } else if (page.backgroundPattern === 'grid') {
      patternOverlay = `<div class="absolute inset-0 pointer-events-none" style="background-image: linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px); background-size: 48px 48px;"></div>`;
    }

    const elementsHtml = page.elements
      .map((el) => {
        if (el.hidden) return '';
        const isPrimarySelected =
          !isPresentationSlide && this.selectedElementId === el.id && !this.isDrawingMode;
        const isMultiSelected =
          !isPresentationSlide &&
          this.selectedElementIds.includes(el.id) &&
          this.selectedElementIds.length > 1;
        const scaleX = el.flipX ? -1 : 1;
        const scaleY = el.flipY ? -1 : 1;
        const animClass =
          el.animation && el.animation !== 'none' ? `anim-${el.animation}` : '';
        const animTimingStyle =
          animClass
            ? `animation-duration: ${el.animationDuration ?? 0.6}s; animation-delay: ${el.animationDelay ?? 0}s;`
            : '';
        const blendCss =
          el.blendMode && el.blendMode !== 'normal' ? `mix-blend-mode: ${el.blendMode};` : '';
        const dropShadowCss =
          el.type !== 'text' && el.shadowBlur && el.shadowBlur > 0
            ? `filter: drop-shadow(${el.shadowOffsetX ?? 0}px ${el.shadowOffsetY ?? 8}px ${el.shadowBlur}px ${el.shadowColor || 'rgba(0,0,0,0.45)'});`
            : '';

        const handlesHtml =
          isPrimarySelected && this.selectedElementIds.length === 1 && !el.locked
            ? `
              <div class="rotate-handle" data-rotate-id="${el.id}" title="Drag to rotate (Hold Shift for 15° snap)">
                ${ICONS.rotate}
              </div>
              ${
                el.rotation
                  ? `<div class="absolute -top-14 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[11px] font-mono-tabular whitespace-nowrap pointer-events-none shadow">${el.rotation}°</div>`
                  : ''
              }
              <div class="resize-handle -top-1.5 -left-1.5 cursor-nwse-resize" data-resize-dir="nw" data-resize-id="${el.id}"></div>
              <div class="resize-handle -top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" data-resize-dir="n" data-resize-id="${el.id}"></div>
              <div class="resize-handle -top-1.5 -right-1.5 cursor-nesw-resize" data-resize-dir="ne" data-resize-id="${el.id}"></div>
              <div class="resize-handle top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize" data-resize-dir="e" data-resize-id="${el.id}"></div>
              <div class="resize-handle -bottom-1.5 -right-1.5 cursor-nwse-resize" data-resize-dir="se" data-resize-id="${el.id}"></div>
              <div class="resize-handle -bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" data-resize-dir="s" data-resize-id="${el.id}"></div>
              <div class="resize-handle -bottom-1.5 -left-1.5 cursor-nesw-resize" data-resize-dir="sw" data-resize-id="${el.id}"></div>
              <div class="resize-handle top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize" data-resize-dir="w" data-resize-id="${el.id}"></div>
            `
            : '';

        return `
          <div
            class="canvas-element ${
              isPrimarySelected && this.selectedElementIds.length === 1 ? 'selected' : ''
            } ${
          isMultiSelected ? 'multi-selected' : ''
        } ${el.locked ? 'cursor-not-allowed' : isPresentationSlide ? '' : 'cursor-move'}"
            data-element-id="${el.id}"
            style="
              left: ${el.x}px;
              top: ${el.y}px;
              width: ${el.width}px;
              height: ${el.height}px;
              opacity: ${el.opacity ?? 1};
              transform: rotate(${el.rotation || 0}deg) scale(${scaleX}, ${scaleY});
              ${blendCss}
              ${dropShadowCss}
            "
          >
            <div class="w-full h-full ${animClass}" ${animClass ? `data-anim-node="true" data-anim-class="${animClass}" style="${animTimingStyle}"` : ''}>
              ${this.renderElementInnerHtml(el)}
            </div>
            ${handlesHtml}
          </div>
        `;
      })
      .join('');

    const snapLinesHtml = !isPresentationSlide
      ? `
      ${
        this.snapLines.x !== undefined
          ? `<div class="absolute top-0 bottom-0 border-l-2 border-dashed border-pink-500 pointer-events-none z-50" style="left: ${this.snapLines.x}px;">
              <span class="bg-pink-600 text-white text-[9px] font-mono-tabular font-bold px-1.5 py-0.5 rounded shadow absolute bottom-2 left-1 whitespace-nowrap">SNAP X: ${this.snapLines.x}px</span>
            </div>`
          : ''
      }
      ${
        this.snapLines.y !== undefined
          ? `<div class="absolute left-0 right-0 border-t-2 border-dashed border-pink-500 pointer-events-none z-50" style="top: ${this.snapLines.y}px;">
              <span class="bg-pink-600 text-white text-[9px] font-mono-tabular font-bold px-1.5 py-0.5 rounded shadow absolute right-2 top-1 whitespace-nowrap">SNAP Y: ${this.snapLines.y}px</span>
            </div>`
          : ''
      }
      ${this.customGuides.x
        .map((gx, idx) => {
          const isBeingDragged =
            this.activeDraggingGuide?.axis === 'x' && this.activeDraggingGuide?.index === idx;
          const isSnapped = this.snapLines.x === gx;
          return `<div
            data-guide-x="${idx}"
            data-remove-guide-x="${idx}"
            title="Vertical Snapping Guide at X = ${gx}px — Drag to reposition, double-click or click × to remove"
            class="group absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-40 flex justify-center"
            style="left: ${gx}px;"
          >
            <div class="h-full border-l ${
              isBeingDragged || isSnapped
                ? 'border-l-2 border-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.9)]'
                : 'border-cyan-400/95 group-hover:border-cyan-200 group-hover:border-l-2'
            } pointer-events-none"></div>
            <div class="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded ${
              isBeingDragged || isSnapped
                ? 'bg-pink-600 text-white'
                : 'bg-cyan-950/95 border border-cyan-500/50 text-cyan-200'
            } text-[9px] font-mono-tabular shadow-md whitespace-nowrap select-none">
              <span>X: ${gx}px</span>
              <button
                type="button"
                data-delete-guide-x="${idx}"
                title="Remove guide (X = ${gx}px)"
                class="ml-0.5 text-cyan-300 hover:text-rose-400 font-bold leading-none cursor-pointer pointer-events-auto"
              >×</button>
            </div>
          </div>`;
        })
        .join('')}
      ${this.customGuides.y
        .map((gy, idx) => {
          const isBeingDragged =
            this.activeDraggingGuide?.axis === 'y' && this.activeDraggingGuide?.index === idx;
          const isSnapped = this.snapLines.y === gy;
          return `<div
            data-guide-y="${idx}"
            data-remove-guide-y="${idx}"
            title="Horizontal Snapping Guide at Y = ${gy}px — Drag to reposition, double-click or click × to remove"
            class="group absolute left-0 right-0 h-3 -mt-1.5 cursor-ns-resize z-40 flex items-center"
            style="top: ${gy}px;"
          >
            <div class="w-full border-t ${
              isBeingDragged || isSnapped
                ? 'border-t-2 border-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.9)]'
                : 'border-cyan-400/95 group-hover:border-cyan-200 group-hover:border-t-2'
            } pointer-events-none"></div>
            <div class="absolute left-2 top-2 flex items-center gap-1 px-1.5 py-0.5 rounded ${
              isBeingDragged || isSnapped
                ? 'bg-pink-600 text-white'
                : 'bg-cyan-950/95 border border-cyan-500/50 text-cyan-200'
            } text-[9px] font-mono-tabular shadow-md whitespace-nowrap select-none">
              <span>Y: ${gy}px</span>
              <button
                type="button"
                data-delete-guide-y="${idx}"
                title="Remove guide (Y = ${gy}px)"
                class="ml-0.5 text-cyan-300 hover:text-rose-400 font-bold leading-none cursor-pointer pointer-events-auto"
              >×</button>
            </div>
          </div>`;
        })
        .join('')}
      ${
        this.showPrintBleed
          ? `
        <div class="absolute inset-[36px] border border-dashed border-rose-400/75 pointer-events-none z-40">
          <span class="absolute -top-4 right-2 text-[9px] font-mono-tabular text-rose-300 bg-slate-950/80 px-1.5 rounded">PRINT BLEED (36px)</span>
        </div>
        <div class="absolute inset-[72px] border border-dotted border-emerald-400/70 pointer-events-none z-40">
          <span class="absolute -top-4 left-2 text-[9px] font-mono-tabular text-emerald-300 bg-slate-950/80 px-1.5 rounded">SAFE MARGIN (72px)</span>
        </div>
      `
          : ''
      }
    `
      : '';

    const scaledW = Math.round(W * activeZoom);
    const scaledH = Math.round(H * activeZoom);

    const rulerTopTicks: string[] = [];
    const rulerLeftTicks: string[] = [];
    let rulerTopSelectionBand = '';
    let rulerLeftSelectionBand = '';

    if (this.showRulers && !isPresentationSlide) {
      const activeSel = this.selectedElements.filter((item) => !item.hidden);
      if (activeSel.length > 0) {
        const sMinX = Math.round(Math.min(...activeSel.map((i) => i.x)) * activeZoom);
        const sMaxX = Math.round(Math.max(...activeSel.map((i) => i.x + i.width)) * activeZoom);
        const sMinY = Math.round(Math.min(...activeSel.map((i) => i.y)) * activeZoom);
        const sMaxY = Math.round(Math.max(...activeSel.map((i) => i.y + i.height)) * activeZoom);
        rulerTopSelectionBand = `<div class="absolute top-0 bottom-0 bg-indigo-500/25 border-x border-indigo-400/80 pointer-events-none" style="left:${sMinX}px; width:${Math.max(2, sMaxX - sMinX)}px;"></div>`;
        rulerLeftSelectionBand = `<div class="absolute left-0 right-0 bg-indigo-500/25 border-y border-indigo-400/80 pointer-events-none" style="top:${sMinY}px; height:${Math.max(2, sMaxY - sMinY)}px;"></div>`;
      }

      const minorStep = activeZoom < 0.45 ? 20 : 10;
      for (let px = 0; px <= W; px += minorStep) {
        const leftPos = Math.round(px * activeZoom);
        if (px % 100 === 0) {
          rulerTopTicks.push(
            `<span class="absolute top-0 bottom-0 border-l border-slate-600 text-[9px] font-mono-tabular text-slate-300 pl-1 pt-0.5 pointer-events-none select-none" style="left:${leftPos}px;">${px}</span>`
          );
        } else if (px % 50 === 0) {
          rulerTopTicks.push(
            `<span class="absolute bottom-0 h-2.5 border-l border-slate-700 pointer-events-none" style="left:${leftPos}px;"></span>`
          );
        } else {
          rulerTopTicks.push(
            `<span class="absolute bottom-0 h-1.5 border-l border-slate-800 pointer-events-none" style="left:${leftPos}px;"></span>`
          );
        }
      }
      for (const gx of this.customGuides.x) {
        const gLeft = Math.round(gx * activeZoom);
        rulerTopTicks.push(
          `<span class="absolute bottom-0 w-2 h-2 -ml-1 bg-cyan-400 rotate-45 pointer-events-none shadow" style="left:${gLeft}px;"></span>`
        );
      }

      for (let py = 0; py <= H; py += minorStep) {
        const topPos = Math.round(py * activeZoom);
        if (py % 100 === 0) {
          rulerLeftTicks.push(
            `<span class="absolute left-0 right-0 border-t border-slate-600 text-[8px] font-mono-tabular text-slate-300 pl-0.5 pt-0.5 pointer-events-none select-none leading-none" style="top:${topPos}px;">${py}</span>`
          );
        } else if (py % 50 === 0) {
          rulerLeftTicks.push(
            `<span class="absolute right-0 w-2.5 border-t border-slate-700 pointer-events-none" style="top:${topPos}px;"></span>`
          );
        } else {
          rulerLeftTicks.push(
            `<span class="absolute right-0 w-1.5 border-t border-slate-800 pointer-events-none" style="top:${topPos}px;"></span>`
          );
        }
      }
      for (const gy of this.customGuides.y) {
        const gTop = Math.round(gy * activeZoom);
        rulerLeftTicks.push(
          `<span class="absolute right-0 w-2 h-2 -mt-1 bg-cyan-400 rotate-45 pointer-events-none shadow" style="top:${gTop}px;"></span>`
        );
      }
    }

    const slideTransClass =
      isPresentationSlide && page.transition && page.transition !== 'none'
        ? `slide-trans-${page.transition}`
        : '';

    const multiSelected = !isPresentationSlide ? this.selectedElements.filter((item) => !item.hidden) : [];
    let multiBoundsHtml = '';
    if (multiSelected.length > 1) {
      const bMinX = Math.round(Math.min(...multiSelected.map((item) => item.x)));
      const bMaxX = Math.round(Math.max(...multiSelected.map((item) => item.x + item.width)));
      const bMinY = Math.round(Math.min(...multiSelected.map((item) => item.y)));
      const bMaxY = Math.round(Math.max(...multiSelected.map((item) => item.y + item.height)));
      const bW = Math.max(1, bMaxX - bMinX);
      const bH = Math.max(1, bMaxY - bMinY);
      const pillTop = bMinY >= 52 ? -46 : bH + 12;
      const isBoundGroup = this.isSelectionSingleBoundGroup();
      const anyGrouped = multiSelected.some((item) => Boolean(item.groupId));
      const allLocked = multiSelected.every((item) => Boolean(item.locked));

      const groupResizeHandlesHtml = !allLocked
        ? `
          <div class="resize-handle pointer-events-auto -top-1.5 -left-1.5 cursor-nwse-resize" data-group-resize-dir="nw" title="Drag corner to resize entire group unit proportionally"></div>
          <div class="resize-handle pointer-events-auto -top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" data-group-resize-dir="n" title="Drag edge to resize group height"></div>
          <div class="resize-handle pointer-events-auto -top-1.5 -right-1.5 cursor-nesw-resize" data-group-resize-dir="ne" title="Drag corner to resize entire group unit proportionally"></div>
          <div class="resize-handle pointer-events-auto top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize" data-group-resize-dir="e" title="Drag edge to resize group width"></div>
          <div class="resize-handle pointer-events-auto -bottom-1.5 -right-1.5 cursor-nwse-resize" data-group-resize-dir="se" title="Drag corner to resize entire group unit proportionally"></div>
          <div class="resize-handle pointer-events-auto -bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" data-group-resize-dir="s" title="Drag edge to resize group height"></div>
          <div class="resize-handle pointer-events-auto -bottom-1.5 -left-1.5 cursor-nesw-resize" data-group-resize-dir="sw" title="Drag corner to resize entire group unit proportionally"></div>
          <div class="resize-handle pointer-events-auto top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize" data-group-resize-dir="w" title="Drag edge to resize group width"></div>
        `
        : '';

      multiBoundsHtml = `
        <div
          id="studio-multi-bounds"
          class="absolute border-2 ${
            isBoundGroup
              ? 'border-solid border-violet-400 bg-violet-500/5 shadow-[0_0_0_1px_rgba(139,92,246,0.3)]'
              : 'border-dashed border-sky-400/90 bg-sky-500/5'
          } pointer-events-none z-40"
          style="left: ${bMinX}px; top: ${bMinY}px; width: ${bW}px; height: ${bH}px;"
        >
          ${groupResizeHandlesHtml}
          <div
            class="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-950/90 border ${
              isBoundGroup ? 'border-violet-500/50 text-violet-200' : 'border-sky-500/50 text-sky-200'
            } text-[10px] font-mono-tabular whitespace-nowrap pointer-events-none shadow"
          >
            ${isBoundGroup ? 'Grouped Unit' : `${multiSelected.length} Selected`} · ${bW} × ${bH} px
          </div>

          <div
            id="floating-canvas-align-bar"
            class="pointer-events-auto absolute left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/95 border ${
              isBoundGroup ? 'border-violet-500/70' : 'border-sky-500/60'
            } shadow-xl whitespace-nowrap"
            style="top: ${pillTop}px;"
          >
            ${
              !isBoundGroup
                ? `
              <button
                id="btn-floating-group"
                class="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Bind selected objects into a single movable and resizable Group (Ctrl+G)"
              >
                ${ICONS.group}
                <span>Group (${multiSelected.length})</span>
              </button>
            `
                : ''
            }
            ${
              anyGrouped
                ? `
              <button
                id="btn-floating-ungroup"
                class="px-2 py-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Ungroup objects into individual layers (Ctrl+Shift+G)"
              >
                ${ICONS.group}
                <span>Ungroup</span>
              </button>
            `
                : ''
            }
            <span class="text-slate-700 text-xs">|</span>
            <button data-floating-canvas-align="left" class="p-1 rounded hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors" title="Snap Selected Objects to Canvas Left Edge">
              ${ICONS.snapLeft}
            </button>
            <button data-floating-canvas-align="center" class="p-1 rounded hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors" title="Center Selected Objects Horizontally on Canvas">
              ${ICONS.snapCenter}
            </button>
            <button data-floating-canvas-align="right" class="p-1 rounded hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors" title="Snap Selected Objects to Canvas Right Edge">
              ${ICONS.snapRight}
            </button>
            <span class="text-slate-700 text-xs">|</span>
            <button data-floating-canvas-align="top" class="p-1 rounded hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors" title="Snap Selected Objects to Canvas Top Edge">
              ${ICONS.snapTop}
            </button>
            <button data-floating-canvas-align="middle" class="p-1 rounded hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors" title="Center Selected Objects Vertically on Canvas">
              ${ICONS.snapMiddle}
            </button>
            <button data-floating-canvas-align="bottom" class="p-1 rounded hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors" title="Snap Selected Objects to Canvas Bottom Edge">
              ${ICONS.snapBottom}
            </button>
            <span class="text-slate-700 text-xs">|</span>
            <button data-floating-canvas-align="center-both" class="px-1.5 py-0.5 rounded bg-indigo-600/90 hover:bg-indigo-500 text-[10px] font-semibold text-white transition-colors" title="Center Selected Objects Both Horizontally & Vertically on Canvas">
              Center Both
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div dir="ltr" class="relative inline-block ${slideTransClass}" style="padding-top: ${
      this.showRulers && !isPresentationSlide ? '24px' : '0px'
    }; padding-left: ${this.showRulers && !isPresentationSlide ? '28px' : '0px'};">
        ${
          this.showRulers && !isPresentationSlide
            ? `
          <button
            type="button"
            id="studio-ruler-origin"
            class="absolute top-0 left-0 w-[28px] h-[24px] bg-slate-900 hover:bg-indigo-950 border-r border-b border-slate-700 flex items-center justify-center text-[9px] font-mono-tabular font-bold text-cyan-300 z-30 cursor-pointer transition-colors"
            title="Click to cycle Snapping Guide Presets (Center Crosshair / Rule of Thirds / Clear) · Shift+R to toggle Rulers"
          >px</button>
          <div
            id="studio-ruler-top"
            title="Top Workspace Ruler — Drag down onto canvas to pull out a Horizontal Guide, or click to add a Vertical Guide"
            class="absolute top-0 left-[28px] h-[24px] bg-slate-900/95 border-b border-slate-700 overflow-hidden cursor-ns-resize z-20 select-none"
            style="width: ${scaledW}px;"
          >
            ${rulerTopSelectionBand}
            ${rulerTopTicks.join('')}
            <div id="ruler-cursor-x" class="hidden absolute top-0 bottom-0 border-l border-pink-400 pointer-events-none z-30">
              <span id="ruler-cursor-x-label" class="bg-pink-600 text-white text-[8px] font-mono-tabular px-1 rounded-xs absolute top-0.5 left-0.5">0</span>
            </div>
          </div>
          <div
            id="studio-ruler-left"
            title="Left Workspace Ruler — Drag right onto canvas to pull out a Vertical Guide, or click to add a Horizontal Guide"
            class="absolute top-[24px] left-0 w-[28px] bg-slate-900/95 border-r border-slate-700 overflow-hidden cursor-ew-resize z-20 select-none"
            style="height: ${scaledH}px;"
          >
            ${rulerLeftSelectionBand}
            ${rulerLeftTicks.join('')}
            <div id="ruler-cursor-y" class="hidden absolute left-0 right-0 border-t border-pink-400 pointer-events-none z-30">
              <span id="ruler-cursor-y-label" class="bg-pink-600 text-white text-[8px] font-mono-tabular px-0.5 rounded-xs absolute left-0.5 top-0.5">0</span>
            </div>
          </div>
        `
            : ''
        }
        <div class="relative flex items-center justify-center" style="width: ${scaledW}px; height: ${scaledH}px;">
          <div
            id="${isPresentationSlide ? 'presentation-artboard' : 'studio-artboard'}"
            class="relative shadow-2xl ring-1 ring-black/20 overflow-hidden select-none ${
              !isPresentationSlide && (this.isDrawingMode || this.isCommentPinMode)
                ? 'cursor-crosshair'
                : !isPresentationSlide && this.isTextPlacementMode
                ? 'cursor-text ring-2 ring-indigo-500/80'
                : ''
            }"
            style="
              width: ${W}px;
              height: ${H}px;
              transform: scale(${activeZoom});
              transform-origin: top left;
              position: absolute;
              top: 0;
              left: 0;
              ${bgStyle}
            "
          >
            ${patternOverlay}
            ${elementsHtml}
            ${multiBoundsHtml}
            ${snapLinesHtml}
            ${
              !isPresentationSlide && page.comments && page.comments.length > 0
                ? page.comments
                    .map((cmt, cIdx) => {
                      const isOpen = this.activeCommentId === cmt.id;
                      return `
                        <div
                          data-comment-pin="${cmt.id}"
                          class="absolute z-50 -ml-4 -mt-4 select-none"
                          style="left: ${cmt.x}px; top: ${cmt.y}px;"
                        >
                          <button
                            type="button"
                            data-toggle-comment="${cmt.id}"
                            class="w-8 h-8 rounded-full font-mono-tabular text-xs font-bold flex items-center justify-center shadow-lg border-2 transition-transform hover:scale-110 cursor-pointer ${
                              cmt.resolved
                                ? 'bg-emerald-600 border-emerald-200 text-white'
                                : 'bg-amber-500 border-white text-slate-950'
                            }"
                            title="Sticky Review Note #${cIdx + 1} (${this.escapeHtml(cmt.author)})"
                          >
                            ${cmt.resolved ? '✓' : cIdx + 1}
                          </button>
                          ${
                            isOpen
                              ? `
                            <div
                              data-comment-card="${cmt.id}"
                              class="mt-2 w-64 p-3 rounded-xl bg-slate-900/98 border border-amber-400/60 shadow-2xl text-left space-y-2"
                            >
                              <div class="flex items-center justify-between">
                                <span class="text-[11px] font-bold text-amber-300">Note #${cIdx + 1} · ${this.escapeHtml(cmt.author)}</span>
                                <span class="text-[10px] font-mono-tabular text-slate-400">${cmt.x}, ${cmt.y}px</span>
                              </div>
                              <textarea
                                data-comment-text-input="${cmt.id}"
                                rows="2"
                                class="w-full p-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                              >${this.escapeHtml(cmt.text)}</textarea>
                              <div class="flex items-center justify-between gap-1.5 pt-1">
                                <button
                                  type="button"
                                  data-resolve-comment="${cmt.id}"
                                  class="px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                                    cmt.resolved
                                      ? 'bg-slate-800 text-slate-300'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                  }"
                                >
                                  ${cmt.resolved ? 'Reopen Note' : '✓ Resolve'}
                                </button>
                                <button
                                  type="button"
                                  data-delete-comment="${cmt.id}"
                                  class="px-2 py-1 rounded bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Delete Pin
                                </button>
                              </div>
                            </div>
                          `
                              : ''
                          }
                        </div>
                      `;
                    })
                    .join('')
                : ''
            }
            <div id="studio-drop-preview" class="hidden pointer-events-none absolute z-50 border-2 border-dashed border-indigo-400 bg-indigo-500/15 rounded-lg items-center justify-center"></div>
            <div id="studio-marquee-box" class="hidden pointer-events-none absolute z-50 border-2 border-sky-400 bg-sky-500/15 rounded-xs"></div>
          </div>
        </div>
      </div>
    `;
  }

  private renderArtboardOnly(): void {
    const wrapper = document.getElementById('studio-artboard-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = this.renderArtboardMarkup();
    this.bindArtboardEvents();
  }

  // ============================================================================
  // CONTEXTUAL PROPERTY TOOLBAR
  // ============================================================================

  private renderAlignmentToolbar(): string {
    const count = this.selectedElementIds.length;
    const hasSelection = count > 0;
    const isMulti = count > 1;
    const effectiveMode: 'canvas' | 'canvas-group' | 'selection' = isMulti
      ? this.alignRelativeTo
      : 'canvas';
    const unlockedTotal = this.activePage.elements.filter((e) => !e.hidden && !e.locked).length;

    const alignButtons: Array<{
      id: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
      btnId: string;
      label: string;
      tooltip: string;
      icon: string;
      axis: 'h' | 'v';
    }> = [
      {
        id: 'left',
        btnId: 'btn-align-left',
        label: 'Left',
        tooltip: 'Snap selected objects to Left Edge (X = 0)',
        icon: ICONS.snapLeft,
        axis: 'h',
      },
      {
        id: 'center',
        btnId: 'btn-align-center-h',
        label: 'Center H',
        tooltip: 'Center selected objects Horizontally on the Canvas',
        icon: ICONS.snapCenter,
        axis: 'h',
      },
      {
        id: 'right',
        btnId: 'btn-align-right',
        label: 'Right',
        tooltip: 'Snap selected objects to Right Edge',
        icon: ICONS.snapRight,
        axis: 'h',
      },
      {
        id: 'top',
        btnId: 'btn-align-top',
        label: 'Top',
        tooltip: 'Snap selected objects to Top Edge (Y = 0)',
        icon: ICONS.snapTop,
        axis: 'v',
      },
      {
        id: 'middle',
        btnId: 'btn-align-center-v',
        label: 'Center V',
        tooltip: 'Center selected objects Vertically on the Canvas',
        icon: ICONS.snapMiddle,
        axis: 'v',
      },
      {
        id: 'bottom',
        btnId: 'btn-align-bottom',
        label: 'Bottom',
        tooltip: 'Snap selected objects to Bottom Edge',
        icon: ICONS.snapBottom,
        axis: 'v',
      },
    ];

    const targetLabelText =
      effectiveMode === 'selection'
        ? 'Selection Bounds'
        : effectiveMode === 'canvas-group'
        ? 'Canvas (As Group)'
        : 'Canvas';

    return `
      <div
        id="studio-alignment-toolbar"
        role="toolbar"
        aria-label="Canvas Object Alignment Toolbar"
        class="h-11 px-4 bg-slate-900/95 border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0 overflow-x-auto"
      >
        <!-- Left: Alignment Target Mode (Canvas Edges/Center, Canvas Group, or Selection Bounds) -->
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            Snap To:
          </span>
          <div class="flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              data-align-target="canvas"
              class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                effectiveMode === 'canvas'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }"
              title="Snap each selected object directly to the Canvas edges (Top, Bottom, Left, Right) or Canvas horizontal/vertical center"
            >
              Canvas ${isMulti ? `(${count})` : ''}
            </button>
            <button
              data-align-target="canvas-group"
              class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                effectiveMode === 'canvas-group'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : isMulti
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }"
              title="Snap all selected objects as a combined group to the Canvas edges or center while keeping their relative spacing"
            >
              Canvas Group
            </button>
            <button
              data-align-target="selection"
              class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                effectiveMode === 'selection'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : isMulti
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }"
              title="${
                isMulti
                  ? 'Align selected objects relative to each other’s bounding box'
                  : 'Select 2+ objects (Shift+Click, drag marquee, or click Select All) to align relative to each other'
              }"
            >
              Each Other
            </button>
          </div>
        </div>

        <!-- Center: 6-Direction Edge & Center Snap Buttons + 1-Click Center Both -->
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Horizontal Alignment (Left Edge, Center Horizontally, Right Edge) -->
          <div class="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-lg p-0.5 gap-0.5">
            ${alignButtons
              .filter((b) => b.axis === 'h')
              .map(
                (btn) => `
              <button
                id="${btn.btnId}"
                data-snap-align="${btn.id}"
                ${!hasSelection ? 'disabled' : ''}
                class="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  hasSelection
                    ? 'text-slate-200 hover:bg-indigo-600 hover:text-white active:scale-95'
                    : 'text-slate-600 cursor-not-allowed'
                }"
                title="${btn.tooltip} (${targetLabelText})"
              >
                ${btn.icon}
                <span>${btn.label}</span>
              </button>
            `
              )
              .join('')}
          </div>

          <span class="text-slate-700">|</span>

          <!-- Vertical Alignment (Top Edge, Center Vertically, Bottom Edge) -->
          <div class="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-lg p-0.5 gap-0.5">
            ${alignButtons
              .filter((b) => b.axis === 'v')
              .map(
                (btn) => `
              <button
                id="${btn.btnId}"
                data-snap-align="${btn.id}"
                ${!hasSelection ? 'disabled' : ''}
                class="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  hasSelection
                    ? 'text-slate-200 hover:bg-indigo-600 hover:text-white active:scale-95'
                    : 'text-slate-600 cursor-not-allowed'
                }"
                title="${btn.tooltip} (${targetLabelText})"
              >
                ${btn.icon}
                <span>${btn.label}</span>
              </button>
            `
              )
              .join('')}
          </div>

          <!-- 1-Click Center Both (Horizontally & Vertically on Canvas) -->
          <button
            id="btn-align-center-both"
            data-snap-align="center-both"
            ${!hasSelection ? 'disabled' : ''}
            class="px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              hasSelection
                ? 'bg-indigo-600/25 border-indigo-500/70 text-indigo-200 hover:bg-indigo-600 hover:text-white active:scale-95'
                : 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed'
            }"
            title="Center selected objects both Horizontally and Vertically on the Canvas"
          >
            ${ICONS.snapCenter}
            <span>Center Both</span>
          </button>
        </div>

        <!-- Right: Group/Ungroup, Multi-Select Helper, Distribute, Rulers, Bleed & Layers -->
        <div class="flex items-center gap-1.5 shrink-0">
          ${
            isMulti
              ? `
            <div class="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-lg p-0.5 gap-0.5">
              <button
                id="btn-toolbar-group"
                class="px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors ${
                  this.isSelectionSingleBoundGroup()
                    ? 'bg-violet-600/30 text-violet-200 hover:bg-violet-600 hover:text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }"
                title="Bind selected objects into a single movable & resizable Group (Ctrl+G)"
              >
                ${ICONS.group}
                <span>Group</span>
              </button>
              ${
                this.selectedElements.some((e) => Boolean(e.groupId))
                  ? `
                <button
                  id="btn-toolbar-ungroup"
                  class="px-2 py-1 rounded text-[11px] font-semibold bg-slate-700 hover:bg-rose-600 text-slate-100 hover:text-white whitespace-nowrap transition-colors"
                  title="Ungroup objects into independent layers (Ctrl+Shift+G)"
                >
                  Ungroup
                </button>
              `
                  : ''
              }
            </div>
            <div class="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-lg p-0.5 gap-0.5">
              <button id="align-bar-tidy-h" class="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:bg-indigo-600 hover:text-white whitespace-nowrap" title="Evenly distribute horizontal spacing between selected objects">
                Distribute H
              </button>
              <button id="align-bar-tidy-v" class="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:bg-indigo-600 hover:text-white whitespace-nowrap" title="Evenly distribute vertical spacing between selected objects">
                Distribute V
              </button>
            </div>
          `
              : `
            <button
              id="align-bar-select-all"
              class="px-2.5 py-1 rounded-md bg-sky-600/20 hover:bg-sky-600 border border-sky-500/50 text-[11px] font-semibold text-sky-300 hover:text-white whitespace-nowrap transition-colors"
              title="Select all unlocked objects on the canvas (${unlockedTotal}) to Group, Resize, or Snap them together"
            >
              Select All (${unlockedTotal})
            </button>
          `
          }
          <div class="flex items-center bg-slate-800/90 border border-slate-700 rounded-md p-0.5 gap-0.5">
            <button
              id="btn-toggle-rulers"
              class="px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors ${
                this.showRulers
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }"
              title="Toggle Top & Left Workspace Rulers Overlay and Draggable Snapping Guides (Shift+R)"
            >
              ${ICONS.ruler}
              <span>Rulers ${this.showRulers ? 'ON' : 'OFF'}</span>
            </button>
            <button
              id="btn-guide-presets"
              class="px-2 py-0.5 rounded text-[11px] font-medium text-cyan-300 hover:bg-slate-700 hover:text-white whitespace-nowrap transition-colors"
              title="Add Center Crosshair or Rule-of-Thirds Snapping Guides (or drag guides out from Top/Left Rulers)"
            >
              + Guides
            </button>
            ${
              this.customGuides.x.length + this.customGuides.y.length > 0
                ? `<button
                    id="btn-clear-guides"
                    class="px-1.5 py-0.5 rounded bg-cyan-950/80 hover:bg-rose-600 border border-cyan-500/40 text-[10px] font-mono-tabular text-cyan-200 hover:text-white whitespace-nowrap transition-colors"
                    title="Clear all ${this.customGuides.x.length + this.customGuides.y.length} active snapping guides on the canvas"
                  >
                    Clear (${this.customGuides.x.length + this.customGuides.y.length})
                  </button>`
                : ''
            }
          </div>
          <button
            id="btn-toggle-bleed"
            class="px-2 py-1 rounded-md border text-[11px] font-medium whitespace-nowrap ${
              this.showPrintBleed
                ? 'bg-rose-600/25 border-rose-500/60 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }"
            title="Toggle Print Bleed (36px) & Safe Margin (72px)"
          >
            Bleed
          </button>
          <button
            id="btn-replay-animations"
            class="px-2 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/50 text-[11px] font-semibold text-emerald-300 hover:text-white flex items-center gap-1 whitespace-nowrap transition-colors"
            title="Replay All Entrance & Loop Animations on Active Page"
          >
            <span>▶ Play Anim</span>
          </button>
          <button
            id="btn-toggle-comment-mode"
            class="px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors ${
              this.isCommentPinMode
                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-xs'
                : 'bg-slate-800 border-slate-700 text-amber-300 hover:text-white'
            }"
            title="Click anywhere on the canvas to drop a pinned review note / sticky comment"
          >
            <span>📌 Pin Note (${this.activePage.comments?.length || 0})</span>
          </button>
          <button
            id="btn-eyedropper"
            class="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1 whitespace-nowrap"
            title="Sample Color from Screen/Canvas (Eyedropper)"
          >
            ${ICONS.eyedropper}
            <span>Pick Color</span>
          </button>
          <button
            id="btn-toggle-layers-panel"
            class="px-2.5 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              this.showRightLayersPanel
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }"
            title="Toggle Right-Side Layers Panel (Reorder, Visibility & Lock)"
          >
            ${ICONS.layers}
            <span>Layers (${this.activePage.elements.length})</span>
          </button>
        </div>
      </div>
    `;
  }

  private renderContextualToolbar(): string {
    // Multi-selection & Bound Group toolbar (2+ elements selected)
    if (this.selectedElementIds.length > 1) {
      const anyGrouped = this.selectedElements.some((e) => Boolean(e.groupId));
      const isBoundGroup = this.isSelectionSingleBoundGroup();
      const gMinX = Math.round(Math.min(...this.selectedElements.map((item) => item.x)));
      const gMaxX = Math.round(Math.max(...this.selectedElements.map((item) => item.x + item.width)));
      const gMinY = Math.round(Math.min(...this.selectedElements.map((item) => item.y)));
      const gMaxY = Math.round(Math.max(...this.selectedElements.map((item) => item.y + item.height)));
      const groupW = Math.max(1, gMaxX - gMinX);
      const groupH = Math.max(1, gMaxY - gMinY);

      return `
        <div class="flex items-center gap-2 overflow-x-auto py-1">
          <span class="px-2 py-0.5 rounded-md ${
            isBoundGroup
              ? 'bg-violet-500/20 border border-violet-500/50 text-violet-200'
              : 'bg-sky-500/15 border border-sky-500/40 text-sky-300'
          } text-xs font-semibold whitespace-nowrap shrink-0">
            ${
              isBoundGroup
                ? `Grouped Unit (${this.selectedElementIds.length})`
                : `${this.selectedElementIds.length} Objects Selected`
            }
          </span>
          <button
            id="prop-group-selected"
            class="px-2.5 py-1 rounded-md ${
              isBoundGroup
                ? 'bg-slate-800 hover:bg-indigo-600 border border-slate-700 text-slate-200 hover:text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            } text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            title="Bind Selected Objects into a Single Group (Ctrl+G)"
          >
            ${ICONS.group}
            <span>${isBoundGroup ? 'Re-Group (Ctrl+G)' : 'Group (Ctrl+G)'}</span>
          </button>
          ${
            anyGrouped
              ? `<button id="prop-ungroup-selected" class="px-2.5 py-1 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors" title="Ungroup Bound Objects (Ctrl+Shift+G)"><span>Ungroup (Ctrl+Shift+G)</span></button>`
              : ''
          }
          <div class="flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-md px-2 py-0.5 text-[11px] text-slate-300 shrink-0" title="Resize Entire Group / Selection Proportionally as a Single Unit">
            <span class="text-slate-400 font-semibold">Unit Size:</span>
            <input
              type="number"
              id="prop-group-width"
              value="${groupW}"
              min="36"
              max="4000"
              class="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center font-mono-tabular text-white focus:outline-none focus:border-indigo-500"
              title="Group Width (px)"
            />
            <span class="text-slate-500">×</span>
            <input
              type="number"
              id="prop-group-height"
              value="${groupH}"
              min="36"
              max="4000"
              class="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center font-mono-tabular text-white focus:outline-none focus:border-indigo-500"
              title="Group Height (px)"
            />
          </div>
          <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5 gap-0.5 shrink-0">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1.5">Snap to Canvas:</span>
            <button data-canvas-snap-direct="left" class="px-1.5 py-1 text-xs text-slate-200 hover:bg-indigo-600 hover:text-white rounded flex items-center gap-1" title="Snap Selected Objects to Canvas Left Edge">${ICONS.snapLeft}<span>Left</span></button>
            <button data-canvas-snap-direct="center" class="px-1.5 py-1 text-xs text-slate-200 hover:bg-indigo-600 hover:text-white rounded flex items-center gap-1" title="Center Selected Objects Horizontally on Canvas">${ICONS.snapCenter}<span>Center H</span></button>
            <button data-canvas-snap-direct="right" class="px-1.5 py-1 text-xs text-slate-200 hover:bg-indigo-600 hover:text-white rounded flex items-center gap-1" title="Snap Selected Objects to Canvas Right Edge">${ICONS.snapRight}<span>Right</span></button>
            <button data-canvas-snap-direct="top" class="px-1.5 py-1 text-xs text-slate-200 hover:bg-indigo-600 hover:text-white rounded flex items-center gap-1" title="Snap Selected Objects to Canvas Top Edge">${ICONS.snapTop}<span>Top</span></button>
            <button data-canvas-snap-direct="middle" class="px-1.5 py-1 text-xs text-slate-200 hover:bg-indigo-600 hover:text-white rounded flex items-center gap-1" title="Center Selected Objects Vertically on Canvas">${ICONS.snapMiddle}<span>Center V</span></button>
            <button data-canvas-snap-direct="bottom" class="px-1.5 py-1 text-xs text-slate-200 hover:bg-indigo-600 hover:text-white rounded flex items-center gap-1" title="Snap Selected Objects to Canvas Bottom Edge">${ICONS.snapBottom}<span>Bottom</span></button>
          </div>
          <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5 shrink-0">
            <button id="prop-tidy-h" class="px-2 py-1 text-[11px] text-slate-300 hover:text-white rounded whitespace-nowrap" title="Distribute Horizontally">Tidy H</button>
            <button id="prop-tidy-v" class="px-2 py-1 text-[11px] text-slate-300 hover:text-white rounded whitespace-nowrap" title="Distribute Vertically">Tidy V</button>
          </div>
          <button id="prop-delete-multi" class="p-1.5 rounded-md bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900/70 hover:text-white shrink-0" title="Delete Selected (Backspace)">
            ${ICONS.trash}
          </button>
        </div>
      `;
    }

    const el = this.selectedElement;

    if (this.isDrawingMode) {
      return `
        <div class="flex items-center gap-3 overflow-x-auto py-1">
          <span class="text-xs font-semibold text-indigo-400 whitespace-nowrap shrink-0">Freehand Brush Active</span>
          <span class="text-slate-600">·</span>
          <label class="flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap shrink-0">
            <span>Color</span>
            <input type="color" id="prop-brush-color" value="${this.brushColor}" class="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
          </label>
          <label class="flex items-center gap-2 text-xs text-slate-300 whitespace-nowrap shrink-0">
            <span>Size</span>
            <input type="range" id="prop-brush-width" min="2" max="48" value="${this.brushWidth}" class="w-24 accent-indigo-500" />
            <span class="font-mono-tabular w-8">${this.brushWidth}px</span>
          </label>
          <button id="btn-exit-draw" class="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0">
            Done Drawing
          </button>
        </div>
      `;
    }

    if (!el) {
      const pageAnimCombos: Array<{ id: PageAnimationPresetKind; label: string }> = [
        { id: 'corporate', label: 'Corporate Clean' },
        { id: 'playful', label: 'Playful Pop' },
        { id: 'cinematic', label: 'Cinematic' },
        { id: 'energetic', label: 'Energetic' },
        { id: 'clear', label: 'No Anim' },
      ];
      return `
        <div class="flex items-center gap-2.5 overflow-x-auto py-1">
          <span class="text-xs text-slate-400 whitespace-nowrap shrink-0">Page Canvas</span>
          <label class="flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap shrink-0 cursor-pointer" title="Page Background Color">
            <span class="w-5 h-5 rounded border border-slate-600 inline-block" style="background: ${this.activePage.background};"></span>
            <input type="color" id="prop-page-bg" value="${this.activePage.background}" class="sr-only" />
            <span>Background</span>
          </label>
          <div class="flex items-center bg-slate-800/80 p-0.5 rounded-md border border-slate-700/70 shrink-0">
            ${(['none', 'dots', 'grid'] as const)
              .map(
                (pat) => `
              <button data-page-pattern="${pat}" class="px-2 py-1 text-[11px] font-medium rounded capitalize transition-colors whitespace-nowrap shrink-0 ${
                (this.activePage.backgroundPattern || 'none') === pat
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }">${pat === 'none' ? 'Solid' : pat}</button>
            `
              )
              .join('')}
          </div>
          <div class="flex items-center bg-slate-800/80 p-0.5 rounded-md border border-slate-700/70 shrink-0 gap-0.5" title="1-Click Page-Wide Animation Combination">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 px-1.5">Animate Page:</span>
            ${pageAnimCombos
              .map(
                (pa) => `
              <button data-page-anim-preset="${pa.id}" class="px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                this.activePage.pageAnimationPreset === pa.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }">${pa.label}</button>
            `
              )
              .join('')}
          </div>
          ${
            this.clipboardElement
              ? `<button id="prop-paste-empty" class="px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-medium whitespace-nowrap shrink-0" title="Paste copied layer (Ctrl+V)">Paste "${this.escapeHtml(
                  this.clipboardElement.name
                )}" (Ctrl+V)</button>`
              : ''
          }
        </div>
      `;
    }

    let typeSpecificControls = '';

    if (el.type === 'text') {
      const effects: Array<{ id: TextEffectKind; label: string }> = [
        { id: 'none', label: 'No Effect' },
        { id: 'shadow', label: 'Shadow' },
        { id: 'lift', label: 'Lift' },
        { id: 'hollow', label: 'Hollow' },
        { id: 'splice', label: 'Splice' },
        { id: 'neon', label: 'Neon Glow' },
        { id: 'echo', label: 'Echo' },
      ];

      typeSpecificControls = `
        <select id="prop-font-family" class="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 shrink-0">
          ${STUDIO_FONTS.map(
            (f) =>
              `<option value="${f.value}" ${el.fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`
          ).join('')}
        </select>

        <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md shrink-0">
          <button id="prop-font-dec" class="px-2 py-1 text-slate-300 hover:text-white text-xs">-</button>
          <input type="number" id="prop-font-size" value="${el.fontSize || 32}" min="8" max="300" class="w-11 bg-transparent text-center text-xs font-mono-tabular text-slate-100 focus:outline-none" />
          <button id="prop-font-inc" class="px-2 py-1 text-slate-300 hover:text-white text-xs">+</button>
        </div>

        <label class="flex items-center gap-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded-md cursor-pointer shrink-0" title="Text Color">
          <span class="w-4 h-4 rounded-sm border border-white/20" style="background: ${el.color || '#ffffff'};"></span>
          <input type="color" id="prop-text-color" value="${el.color || '#ffffff'}" class="sr-only" />
        </label>

        <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5 shrink-0">
          <button id="prop-text-bold" class="px-2 py-1 text-xs font-bold rounded ${
            Number(el.fontWeight) >= 700 ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
          }" title="Bold">B</button>
          <button id="prop-text-italic" class="px-2 py-1 text-xs italic rounded ${
            el.fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
          }" title="Italic">I</button>
          <button id="prop-text-underline" class="px-2 py-1 text-xs underline rounded ${
            el.textDecoration === 'underline' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
          }" title="Underline">U</button>
        </div>

        <!-- LTR / RTL / Auto Text Direction Switcher -->
        <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5 shrink-0 gap-0.5" title="Text Direction (Left-to-Right vs Right-to-Left)">
          <button
            data-prop-text-dir="ltr"
            class="px-1.5 py-1 text-[10px] font-mono-tabular font-semibold rounded transition-colors ${
              (el.textDirection || 'ltr') === 'ltr'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:text-white'
            }"
            title="Left-to-Right (LTR)"
          >LTR</button>
          <button
            data-prop-text-dir="rtl"
            class="px-1.5 py-1 text-[10px] font-mono-tabular font-semibold rounded transition-colors ${
              el.textDirection === 'rtl'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white'
            }"
            title="Right-to-Left (RTL — Arabic, Hebrew, Persian, Urdu)"
          >RTL</button>
        </div>

        <!-- Text Alignment (Left / Center / Right) -->
        <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5 shrink-0">
          <button data-prop-text-align="left" class="p-1 rounded ${
            (el.textAlign || 'left') === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
          }" title="Align Text Left">${ICONS.alignLeft}</button>
          <button data-prop-text-align="center" class="p-1 rounded ${
            el.textAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
          }" title="Align Text Center">${ICONS.alignCenter}</button>
          <button data-prop-text-align="right" class="p-1 rounded ${
            el.textAlign === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
          }" title="Align Text Right">${ICONS.alignRight}</button>
        </div>

        <!-- Rich Typography Pro: Lists (Bullet / Numbered), Case Transform, Spacing & Highlight Pill -->
        <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5 shrink-0 gap-0.5" title="Bullet & Numbered Lists">
          <button id="prop-text-list-bullet" class="px-1.5 py-1 text-[11px] font-semibold rounded ${
            el.listStyle === 'bullet' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
          }" title="Toggle Bullet List (•)">• List</button>
          <button id="prop-text-list-number" class="px-1.5 py-1 text-[11px] font-semibold rounded ${
            el.listStyle === 'number' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
          }" title="Toggle Numbered List (1.)">1. List</button>
        </div>

        <select id="prop-text-transform" class="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-1.5 py-1.5 focus:outline-none focus:border-indigo-500 shrink-0" title="Text Case Transform">
          <option value="none" ${(el.textTransform || 'none') === 'none' ? 'selected' : ''}>Case: Aa</option>
          <option value="uppercase" ${el.textTransform === 'uppercase' ? 'selected' : ''}>UPPER</option>
          <option value="lowercase" ${el.textTransform === 'lowercase' ? 'selected' : ''}>lower</option>
          <option value="capitalize" ${el.textTransform === 'capitalize' ? 'selected' : ''}>Title</option>
        </select>

        <label class="flex items-center gap-1 text-xs text-slate-300 whitespace-nowrap shrink-0" title="Letter Spacing (px)">
          <span>Track</span>
          <input type="range" id="prop-letter-spacing" min="-2" max="16" step="0.5" value="${el.letterSpacing ?? 0}" class="w-12 accent-indigo-500" />
        </label>

        <label class="flex items-center gap-1 text-xs text-slate-300 whitespace-nowrap shrink-0" title="Line Height Multiplier">
          <span>LineH</span>
          <input type="range" id="prop-line-height" min="0.9" max="2.2" step="0.05" value="${el.lineHeight ?? 1.25}" class="w-12 accent-indigo-500" />
        </label>

        <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md px-1.5 py-0.5 gap-1 shrink-0" title="Text Highlight / Pill Box Backdrop">
          <label class="flex items-center gap-1 cursor-pointer text-[11px] text-slate-300">
            <span class="w-3.5 h-3.5 rounded-xs border border-white/25" style="background: ${el.textBgColor || 'transparent'};"></span>
            <span>Pill BG</span>
            <input type="color" id="prop-text-bg-color" value="${el.textBgColor || '#4f46e5'}" class="sr-only" />
          </label>
          ${
            el.textBgColor
              ? `<button id="prop-text-bg-clear" class="text-[10px] text-rose-300 hover:text-white px-1" title="Remove Text Highlight Pill">×</button>`
              : ''
          }
        </div>

        <select id="prop-text-effect" class="bg-slate-800 border border-slate-700 text-indigo-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 shrink-0" title="Canva Text Effect">
          ${effects
            .map(
              (ef) =>
                `<option value="${ef.id}" ${(el.textEffect || 'none') === ef.id ? 'selected' : ''}>FX: ${ef.label}</option>`
            )
            .join('')}
        </select>

        <label class="flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap shrink-0" title="Curved Text Arc (-100 to +100)">
          <span>Curve</span>
          <input type="range" id="prop-text-curve" min="-100" max="100" value="${el.textCurve || 0}" class="w-16 accent-indigo-500" />
          <span class="font-mono-tabular text-[11px] w-7">${el.textCurve || 0}°</span>
        </label>
      `;
    } else if (el.type === 'shape' || el.type === 'sticker' || el.type === 'chart') {
      typeSpecificControls = `
        <label class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md cursor-pointer text-xs text-slate-200 shrink-0">
          <span class="w-4 h-4 rounded-sm border border-white/20" style="background: ${el.fill || '#6366f1'};"></span>
          <span>Primary</span>
          <input type="color" id="prop-shape-fill" value="${el.fill || '#6366f1'}" class="sr-only" />
        </label>

        <label class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md cursor-pointer text-xs text-slate-200 shrink-0">
          <span class="w-4 h-4 rounded-sm border border-white/20" style="background: ${el.stroke && el.stroke !== 'none' ? el.stroke : '#38bdf8'};"></span>
          <span>Accent</span>
          <input type="color" id="prop-shape-stroke" value="${el.stroke && el.stroke !== 'none' ? el.stroke : '#38bdf8'}" class="sr-only" />
        </label>

        ${
          el.type === 'shape' && el.shapeKind === 'rect'
            ? `
          <label class="flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap shrink-0">
            <span>Radius</span>
            <input type="range" id="prop-border-radius" min="0" max="48" value="${el.borderRadius || 0}" class="w-16 accent-indigo-500" />
          </label>
        `
            : ''
        }
      `;
    } else if (el.type === 'image') {
      const frames: Array<{ id: FrameShapeKind; label: string }> = [
        { id: 'none', label: 'Frame: None' },
        { id: 'circle', label: 'Frame: Circle' },
        { id: 'arch', label: 'Frame: Arch' },
        { id: 'star', label: 'Frame: Star' },
        { id: 'hexagon', label: 'Frame: Hexagon' },
        { id: 'diamond', label: 'Frame: Diamond' },
        { id: 'pill', label: 'Frame: Pill' },
      ];
      const filters: Array<{ id: FilterPresetKind; label: string }> = [
        { id: 'none', label: 'Filter: Original' },
        { id: 'nordic', label: 'Filter: Nordic' },
        { id: 'vintage', label: 'Filter: Vintage' },
        { id: 'noir', label: 'Filter: Noir B&W' },
        { id: 'cyber', label: 'Filter: Cyber Neon' },
        { id: 'warm', label: 'Filter: Warm Glow' },
        { id: 'duotone-cyber', label: 'Duotone: Cyber Violet' },
        { id: 'duotone-sunset', label: 'Duotone: Sunset Gold' },
        { id: 'duotone-emerald', label: 'Duotone: Emerald Mint' },
      ];

      typeSpecificControls = `
        <select id="prop-frame-shape" class="bg-slate-800 border border-slate-700 text-indigo-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 shrink-0" title="Canva Shape Clipping Frame">
          ${frames
            .map(
              (fr) =>
                `<option value="${fr.id}" ${(el.frameShape || 'none') === fr.id ? 'selected' : ''}>${fr.label}</option>`
            )
            .join('')}
        </select>
        <select id="prop-filter-preset" class="bg-slate-800 border border-slate-700 text-amber-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 shrink-0" title="Photo Studio Filter & Duotone Preset">
          ${filters
            .map(
              (fl) =>
                `<option value="${fl.id}" ${(el.filterPreset || 'none') === fl.id ? 'selected' : ''}>${fl.label}</option>`
            )
            .join('')}
        </select>
        <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md px-1.5 py-0.5 gap-1 shrink-0" title="Chroma Key Background Eraser with Adjustable Tolerance">
          <button id="prop-erase-bg" class="px-2 py-0.5 rounded bg-fuchsia-600/30 hover:bg-fuchsia-600/50 border border-fuchsia-500/50 text-fuchsia-200 text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
            ${ICONS.magic}
            <span>Erase BG</span>
          </button>
          <input type="range" id="prop-erase-tolerance" min="15" max="120" value="${el.bgEraseTolerance ?? 48}" class="w-12 accent-fuchsia-500" title="Chroma Tolerance (${el.bgEraseTolerance ?? 48})" />
        </div>
        <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5 gap-0.5 shrink-0" title="1-Click Aspect Ratio Crop Presets">
          ${(['free', '1:1', '16:9', '4:5', '9:16'] as const)
            .map(
              (asp) => `
            <button data-prop-crop-aspect="${asp}" class="px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-semibold ${
              (el.cropAspect || 'free') === asp
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:text-white'
            }">${asp}</button>
          `
            )
            .join('')}
        </div>
        <label class="flex items-center gap-1 text-xs text-slate-300 whitespace-nowrap shrink-0" title="Crop Zoom">
          <span>Zoom</span>
          <input type="range" id="prop-crop-zoom" min="100" max="250" value="${Math.round((el.cropZoom || 1) * 100)}" class="w-12 accent-indigo-500" />
        </label>
        <label class="flex items-center gap-1 text-xs text-slate-300 whitespace-nowrap shrink-0">
          <span>Bright</span>
          <input type="range" id="prop-img-brightness" min="50" max="150" value="${el.brightness ?? 100}" class="w-12 accent-indigo-500" />
        </label>
      `;
    } else if (el.type === 'grid') {
      const layouts: Array<{ id: GridLayoutKind; label: string }> = [
        { id: 'split-v', label: '2-Up Vertical' },
        { id: 'split-h', label: '2-Up Horizontal' },
        { id: 'bento-3', label: '3-Up Bento' },
        { id: 'quad-4', label: '4-Cell Quad' },
      ];
      typeSpecificControls = `
        <select id="prop-grid-layout" class="bg-slate-800 border border-slate-700 text-indigo-300 text-xs rounded-md px-2 py-1.5 shrink-0">
          ${layouts
            .map(
              (l) =>
                `<option value="${l.id}" ${(el.gridLayout || 'split-v') === l.id ? 'selected' : ''}>Grid: ${l.label}</option>`
            )
            .join('')}
        </select>
        <label class="flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap shrink-0">
          <span>Gap</span>
          <input type="range" id="prop-grid-gap" min="0" max="40" value="${el.gridGap ?? 12}" class="w-16 accent-indigo-500" />
        </label>
      `;
    } else if (el.type === 'qr') {
      typeSpecificControls = `
        <input type="text" id="prop-qr-text" value="${this.escapeHtml(el.qrText || 'https://canvascraft.studio')}" placeholder="QR URL or text..." class="w-44 px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 shrink-0" />
        <label class="flex items-center gap-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded-md cursor-pointer text-xs text-slate-200 shrink-0" title="QR Foreground">
          <span class="w-4 h-4 rounded-sm border border-white/20" style="background: ${el.fill || '#0f172a'};"></span>
          <span>FG</span>
          <input type="color" id="prop-shape-fill" value="${el.fill || '#0f172a'}" class="sr-only" />
        </label>
      `;
    } else if (el.type === 'table') {
      typeSpecificControls = `
        <button id="prop-table-add-row" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 whitespace-nowrap shrink-0">+ Row</button>
        <button id="prop-table-del-row" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 whitespace-nowrap shrink-0">- Row</button>
        <button id="prop-table-add-col" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 whitespace-nowrap shrink-0">+ Col</button>
        <button id="prop-table-del-col" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 whitespace-nowrap shrink-0">- Col</button>
        <label class="flex items-center gap-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded-md cursor-pointer text-xs text-slate-200 shrink-0" title="Header Background">
          <span class="w-4 h-4 rounded-sm border border-white/20" style="background: ${el.tableHeaderBg || '#4f46e5'};"></span>
          <span>Header</span>
          <input type="color" id="prop-table-header-bg" value="${el.tableHeaderBg || '#4f46e5'}" class="sr-only" />
        </label>
        <label class="flex items-center gap-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded-md cursor-pointer text-xs text-slate-200 shrink-0" title="Table Grid Border Color">
          <span class="w-4 h-4 rounded-sm border border-white/20" style="background: ${el.tableBorderColor || '#334155'};"></span>
          <span>Border</span>
          <input type="color" id="prop-table-border-color" value="${el.tableBorderColor || '#334155'}" class="sr-only" />
        </label>
        <button id="prop-table-striped" class="px-2 py-1 rounded border text-xs font-medium whitespace-nowrap shrink-0 ${
          el.tableStriped !== false
            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
            : 'bg-slate-800 border-slate-700 text-slate-400'
        }">Striped</button>
        <label class="flex items-center gap-1 text-xs text-slate-300 whitespace-nowrap shrink-0" title="Cell Padding">
          <span>Pad</span>
          <input type="range" id="prop-table-cell-pad" min="4" max="28" value="${el.tableCellPadding ?? 14}" class="w-12 accent-indigo-500" />
        </label>
      `;
    } else if (el.type === 'connector') {
      typeSpecificControls = `
        <select id="prop-connector-style" class="bg-slate-800 border border-slate-700 text-indigo-300 text-xs rounded-md px-2 py-1.5 shrink-0" title="Connector Routing Geometry">
          <option value="curved" ${(el.connectorStyle || 'curved') === 'curved' ? 'selected' : ''}>Route: Curved Bezier</option>
          <option value="elbow" ${el.connectorStyle === 'elbow' ? 'selected' : ''}>Route: 90° Elbow</option>
          <option value="straight" ${el.connectorStyle === 'straight' ? 'selected' : ''}>Route: Straight</option>
        </select>
        <input type="text" id="prop-connector-label" value="${this.escapeHtml(el.connectorLabel || '')}" placeholder="Flow label..." class="w-28 px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 shrink-0" />
        <button id="prop-connector-dashed" class="px-2 py-1 rounded border text-xs font-medium whitespace-nowrap shrink-0 ${
          el.connectorDashed
            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
            : 'bg-slate-800 border-slate-700 text-slate-300'
        }">Dashed</button>
        <label class="flex items-center gap-1.5 px-2 py-1 bg-slate-800 border border-slate-700 rounded-md cursor-pointer text-xs text-slate-200 shrink-0">
          <span class="w-4 h-4 rounded-sm border border-white/20" style="background: ${el.stroke || '#38bdf8'};"></span>
          <span>Line</span>
          <input type="color" id="prop-shape-stroke" value="${el.stroke || '#38bdf8'}" class="sr-only" />
        </label>
        <label class="flex items-center gap-1 text-xs text-slate-300 whitespace-nowrap shrink-0">
          <span>W</span>
          <input type="range" id="prop-stroke-width" min="2" max="16" value="${el.strokeWidth || 4}" class="w-14 accent-indigo-500" />
        </label>
      `;
    } else if (el.type === 'path') {
      typeSpecificControls = `
        <label class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md cursor-pointer text-xs text-slate-200 shrink-0">
          <span class="w-4 h-4 rounded-sm border border-white/20" style="background: ${el.stroke || '#6366f1'};"></span>
          <span>Stroke</span>
          <input type="color" id="prop-shape-stroke" value="${el.stroke || '#6366f1'}" class="sr-only" />
        </label>
        <label class="flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap shrink-0">
          <span>Width</span>
          <input type="range" id="prop-stroke-width" min="2" max="48" value="${el.strokeWidth || 8}" class="w-20 accent-indigo-500" />
        </label>
      `;
    }

    const animations: Array<{ id: AnimationKind; label: string }> = [
      { id: 'none', label: 'Anim: None' },
      { id: 'rise', label: 'Anim: Rise' },
      { id: 'pan', label: 'Anim: Pan' },
      { id: 'fade', label: 'Anim: Fade' },
      { id: 'pop', label: 'Anim: Pop' },
      { id: 'wipe', label: 'Anim: Wipe' },
      { id: 'tumble', label: 'Anim: Tumble' },
      { id: 'breathe', label: 'Anim: Breathe (Loop)' },
      { id: 'drift', label: 'Anim: Drift (Loop)' },
      { id: 'neon-flicker', label: 'Anim: Neon Flicker' },
    ];

    const blendModes: Array<{ id: BlendModeKind; label: string }> = [
      { id: 'normal', label: 'Blend: Normal' },
      { id: 'multiply', label: 'Blend: Multiply' },
      { id: 'screen', label: 'Blend: Screen' },
      { id: 'overlay', label: 'Blend: Overlay' },
      { id: 'darken', label: 'Blend: Darken' },
      { id: 'lighten', label: 'Blend: Lighten' },
      { id: 'difference', label: 'Blend: Difference' },
    ];

    return `
      <div class="flex items-center gap-2 overflow-x-auto py-1">
        ${typeSpecificControls}

        <!-- Blend Mode Selector -->
        <select id="prop-blend-mode" class="bg-slate-800 border border-slate-700 text-sky-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 shrink-0" title="Layer CSS Blend Mode">
          ${blendModes
            .map(
              (b) =>
                `<option value="${b.id}" ${(el.blendMode || 'normal') === b.id ? 'selected' : ''}>${b.label}</option>`
            )
            .join('')}
        </select>

        <!-- Drop Shadow Toggle -->
        <button
          id="prop-shadow-toggle"
          class="px-2 py-1 rounded-md border text-xs font-medium whitespace-nowrap shrink-0 ${
            el.shadowBlur && el.shadowBlur > 0
              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
          }"
          title="Toggle Studio Drop Shadow"
        >
          Shadow
        </button>

        <!-- Element Entrance Animation Selector + Speed / Delay Controls -->
        <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md px-1.5 py-0.5 gap-1.5 shrink-0">
          <select id="prop-animation" class="bg-transparent text-emerald-300 text-xs focus:outline-none shrink-0" title="Entrance & Loop Animation">
            ${animations
              .map(
                (a) =>
                  `<option value="${a.id}" class="bg-slate-900" ${(el.animation || 'none') === a.id ? 'selected' : ''}>${a.label}</option>`
              )
              .join('')}
          </select>
          ${
            el.animation && el.animation !== 'none'
              ? `
            <label class="flex items-center gap-1 text-[10px] text-slate-300" title="Animation Duration (${el.animationDuration ?? 0.7}s)">
              <span>Dur</span>
              <input type="range" id="prop-anim-duration" min="0.2" max="3.0" step="0.1" value="${el.animationDuration ?? 0.7}" class="w-10 accent-emerald-500" />
            </label>
            <label class="flex items-center gap-1 text-[10px] text-slate-300" title="Animation Stagger Delay (${el.animationDelay ?? 0}s)">
              <span>Dly</span>
              <input type="range" id="prop-anim-delay" min="0" max="2.5" step="0.1" value="${el.animationDelay ?? 0}" class="w-10 accent-emerald-500" />
            </label>
          `
              : ''
          }
        </div>

        <!-- Opacity -->
        <label class="flex items-center gap-1 text-xs text-slate-300 whitespace-nowrap shrink-0" title="Layer Opacity">
          <input type="range" id="prop-opacity" min="10" max="100" value="${Math.round((el.opacity ?? 1) * 100)}" class="w-14 accent-indigo-500" />
          <span class="font-mono-tabular w-8 text-[11px]">${Math.round((el.opacity ?? 1) * 100)}%</span>
        </label>

        <!-- Layer Order, Copy, Paste, Lock, Duplicate, Delete -->
        <div class="flex items-center gap-1 shrink-0">
          <button id="prop-copy" class="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium whitespace-nowrap" title="Copy Layer (Ctrl+C)">Copy</button>
          <button id="prop-paste" ${
            !this.clipboardElement ? 'disabled' : ''
          } class="px-2 py-1 rounded-md border text-[11px] font-medium whitespace-nowrap ${
            this.clipboardElement
              ? 'bg-slate-800 border-slate-700 text-indigo-300 hover:text-white'
              : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
          }" title="Paste Layer (Ctrl+V)">Paste</button>
          <button id="prop-layer-up" class="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:text-white" title="Bring Forward">${ICONS.up}</button>
          <button id="prop-layer-down" class="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:text-white" title="Send Backward">${ICONS.down}</button>
          <button id="prop-lock" class="p-1.5 rounded-md border ${
            el.locked
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
          }" title="${el.locked ? 'Unlock Layer' : 'Lock Layer'}">
            ${el.locked ? ICONS.lock : ICONS.unlock}
          </button>
          <button id="prop-duplicate" class="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:text-white" title="Duplicate (Ctrl+D)">${ICONS.duplicate}</button>
          <button id="prop-delete" class="p-1.5 rounded-md bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900/70 hover:text-white" title="Delete (Backspace / Del)">${ICONS.trash}</button>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // LEFT SIDEBAR DRAWER CONTENT
  // ============================================================================

  private renderSidebarDrawer(): string {
    if (this.activeSidebarTab === 'templates') {
      const categories: Array<'All' | 'Social' | 'Presentation' | 'Poster' | 'Marketing'> = [
        'All',
        'Social',
        'Presentation',
        'Poster',
        'Marketing',
      ];
      const filtered = TEMPLATE_PRESETS.filter((t) => {
        const matchesCat = this.templateFilter === 'All' || t.category === this.templateFilter;
        const matchesSearch =
          !this.templateSearch ||
          t.name.toLowerCase().includes(this.templateSearch.toLowerCase()) ||
          t.category.toLowerCase().includes(this.templateSearch.toLowerCase());
        return matchesCat && matchesSearch;
      });

      return `
        <div class="p-4 flex flex-col gap-4 h-full overflow-y-auto">
          <div>
            <h2 class="text-sm font-bold text-slate-100 tracking-tight">Studio Templates</h2>
            <p class="text-xs text-slate-400 mt-0.5">Replace active canvas or launch a new multi-page project</p>
          </div>

          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">${ICONS.search}</span>
            <input
              type="text"
              id="sidebar-tpl-search"
              placeholder="Search layouts..."
              value="${this.escapeHtml(this.templateSearch)}"
              class="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div class="flex items-center gap-1 flex-wrap">
            ${categories
              .map(
                (cat) => `
              <button data-tpl-cat="${cat}" class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                this.templateFilter === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }">${cat}</button>
            `
              )
              .join('')}
          </div>

          <div class="grid grid-cols-1 gap-3">
            ${filtered
              .map(
                (tpl) => `
              <div class="group rounded-lg border border-slate-800 bg-slate-900/90 p-3 hover:border-indigo-500/60 transition-colors">
                <div class="h-28 rounded-md mb-2.5 flex flex-col justify-between p-3 relative overflow-hidden border border-white/10" style="${
                  tpl.backgroundGradient
                    ? `background: ${tpl.backgroundGradient};`
                    : `background-color: ${tpl.background};`
                }">
                  <span class="text-[11px] font-mono-tabular tracking-wider uppercase ${
                    tpl.background === '#ffffff' || tpl.background === '#fffbeb'
                      ? 'text-slate-700'
                      : 'text-indigo-300'
                  }">${this.escapeHtml(tpl.category)} · ${this.escapeHtml(tpl.dimensionsLabel)}</span>
                  <p class="text-sm font-bold leading-snug line-clamp-2 ${
                    tpl.background === '#ffffff' || tpl.background === '#fffbeb'
                      ? 'text-slate-900'
                      : 'text-white'
                  }">${this.escapeHtml(tpl.name)}</p>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <button data-apply-tpl="${tpl.id}" class="flex-1 py-1.5 px-2.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors whitespace-nowrap">
                    Use on Page
                  </button>
                  <button data-new-from-tpl="${tpl.id}" class="py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap">
                    New File
                  </button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    if (this.activeSidebarTab === 'elements') {
      const rectFill = this.paletteShapeColor || this.brandKit.colors[1] || '#6366f1';
      const circleFill = this.paletteShapeColor || this.brandKit.colors[2] || '#ec4899';
      const triangleFill = this.paletteShapeColor || '#10b981';

      const primaryGeometricPalette: Array<{
        id: string;
        kind: ShapeKind;
        label: string;
        dims: string;
        previewSvg: string;
        payload: Partial<DesignElement>;
      }> = [
        {
          id: 'geo-rect',
          kind: 'rect',
          label: 'Rectangle',
          dims: '260 × 180',
          previewSvg: renderShapeSvg('rect', rectFill, 'none', 0, 14),
          payload: {
            name: 'Rectangle Shape',
            type: 'shape',
            shapeKind: 'rect',
            width: 260,
            height: 180,
            fill: rectFill,
            borderRadius: 16,
          },
        },
        {
          id: 'geo-circle',
          kind: 'circle',
          label: 'Circle',
          dims: '220 × 220',
          previewSvg: renderShapeSvg('circle', circleFill, 'none', 0, 0),
          payload: {
            name: 'Circle Shape',
            type: 'shape',
            shapeKind: 'circle',
            width: 220,
            height: 220,
            fill: circleFill,
          },
        },
        {
          id: 'geo-triangle',
          kind: 'triangle',
          label: 'Triangle',
          dims: '240 × 220',
          previewSvg: renderShapeSvg('triangle', triangleFill, 'none', 0, 0),
          payload: {
            name: 'Triangle Shape',
            type: 'shape',
            shapeKind: 'triangle',
            width: 240,
            height: 220,
            fill: triangleFill,
          },
        },
      ];

      const textQuickPayload: Partial<DesignElement> = {
        name: 'Text Box',
        type: 'text',
        text: 'Double-click to edit text',
        fontFamily: this.brandKit.primaryFont || 'Bricolage Grotesque',
        fontSize: 44,
        fontWeight: 700,
        textAlign: 'center',
        color: this.activePage.background === '#ffffff' ? '#0f172a' : '#f8fafc',
        width: 480,
        height: 96,
      };

      const paletteSwatches = [
        '#6366f1',
        '#ec4899',
        '#10b981',
        '#f59e0b',
        '#38bdf8',
        '#a855f7',
        '#f43f5e',
        '#f8fafc',
      ];

      const framesList: Array<{ kind: FrameShapeKind; label: string }> = [
        { kind: 'circle', label: 'Circle Frame' },
        { kind: 'arch', label: 'Arch Frame' },
        { kind: 'star', label: 'Star Frame' },
        { kind: 'hexagon', label: 'Hexagon Frame' },
        { kind: 'diamond', label: 'Diamond Frame' },
        { kind: 'pill', label: 'Pill Frame' },
      ];

      const shapes: Array<{ kind: ShapeKind; label: string; defaultColor: string }> = [
        { kind: 'rect', label: 'Rectangle', defaultColor: '#6366f1' },
        { kind: 'circle', label: 'Circle', defaultColor: '#ec4899' },
        { kind: 'triangle', label: 'Triangle', defaultColor: '#10b981' },
        { kind: 'diamond', label: 'Diamond', defaultColor: '#f59e0b' },
        { kind: 'hexagon', label: 'Hexagon', defaultColor: '#38bdf8' },
        { kind: 'star', label: 'Star', defaultColor: '#eab308' },
        { kind: 'pill', label: 'Pill Capsule', defaultColor: '#a855f7' },
        { kind: 'arrow', label: 'Arrow', defaultColor: '#f43f5e' },
        { kind: 'line', label: 'Divider Line', defaultColor: '#94a3b8' },
      ];

      const stickers: Array<{ kind: StickerKind; label: string; primary: string; accent: string }> = [
        { kind: 'burst', label: 'Starburst', primary: '#6366f1', accent: '#f43f5e' },
        { kind: 'seal', label: 'Verified Seal', primary: '#10b981', accent: '#ffffff' },
        { kind: 'rings', label: 'Orbital Rings', primary: '#6366f1', accent: '#06b6d4' },
        { kind: 'arch', label: 'Architectural Arch', primary: '#f59e0b', accent: '#ffffff' },
        { kind: 'wave', label: 'Acoustic Wave', primary: '#ec4899', accent: '#818cf8' },
        { kind: 'grid_dots', label: 'Matrix Grid', primary: '#94a3b8', accent: '#6366f1' },
        { kind: 'quote', label: 'Editorial Quote', primary: '#f43f5e', accent: '#f59e0b' },
        { kind: 'frame_card', label: 'Browser Window', primary: '#38bdf8', accent: '#f43f5e' },
      ];

      return `
        <div class="p-4 flex flex-col gap-5 h-full overflow-y-auto">
          <!-- Basic Geometric Shapes Palette (Rectangle, Circle, Triangle) -->
          <div id="sidebar-geometric-shapes-palette" class="p-3.5 rounded-xl bg-indigo-950/35 border border-indigo-500/35 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xs font-bold uppercase tracking-wider text-indigo-200">Geometric Shapes Palette</h2>
                <p class="text-[11px] text-slate-400">Drag & drop onto canvas or click to place</p>
              </div>
              <span class="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-mono-tabular text-indigo-300">Drag & Drop</span>
            </div>

            <!-- Core 3 Geometric Primitives: Rectangle, Circle, Triangle -->
            <div class="grid grid-cols-3 gap-2">
              ${primaryGeometricPalette
                .map(
                  (item) => `
                <div
                  id="${item.id}"
                  draggable="true"
                  data-drag-payload="${this.escapeHtml(JSON.stringify(item.payload))}"
                  data-quick-insert="${this.escapeHtml(JSON.stringify(item.payload))}"
                  class="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg bg-slate-900/95 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-400 cursor-grab active:cursor-grabbing transition-all group shadow-xs"
                  title="Drag ${item.label} onto canvas or click to insert (${item.dims} px)"
                >
                  <div class="w-11 h-11 pointer-events-none group-hover:scale-110 transition-transform flex items-center justify-center">
                    ${item.previewSvg}
                  </div>
                  <span class="text-xs font-semibold text-slate-100 whitespace-nowrap pointer-events-none">${item.label}</span>
                  <span class="text-[10px] font-mono-tabular text-slate-400 whitespace-nowrap pointer-events-none">${item.dims}</span>
                </div>
              `
                )
                .join('')}
            </div>

            <!-- Interactive Fill Color Selector for Geometric Palette -->
            <div class="pt-2 border-t border-indigo-500/20 flex items-center justify-between gap-1.5">
              <span class="text-[10px] font-medium text-slate-400 shrink-0">Shape Fill:</span>
              <div class="flex items-center gap-1">
                <button
                  data-palette-color="auto"
                  class="px-1.5 py-0.5 rounded text-[10px] font-mono-tabular border transition-colors ${
                    this.paletteShapeColor === null
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  }"
                  title="Use vibrant multi-color defaults"
                >
                  Auto
                </button>
                ${paletteSwatches
                  .slice(0, 6)
                  .map(
                    (hex) => `
                  <button
                    data-palette-color="${hex}"
                    class="w-4 h-4 rounded-full border transition-transform ${
                      this.paletteShapeColor === hex
                        ? 'scale-125 border-white ring-2 ring-indigo-400'
                        : 'border-white/30 hover:scale-110'
                    }"
                    style="background-color: ${hex};"
                    title="Set palette shape fill to ${hex}"
                  ></button>
                `
                  )
                  .join('')}
                <input
                  type="color"
                  id="palette-custom-color"
                  value="${this.paletteShapeColor || '#6366f1'}"
                  class="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
                  title="Custom Geometric Palette Color"
                />
              </div>
            </div>

            <!-- Quick Draggable Text Box Companion -->
            <div
              draggable="true"
              data-drag-payload="${this.escapeHtml(JSON.stringify(textQuickPayload))}"
              data-quick-insert="${this.escapeHtml(JSON.stringify(textQuickPayload))}"
              class="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-400 cursor-grab active:cursor-grabbing transition-all group"
              title="Drag Text Box onto canvas or click to add"
            >
              <div class="flex items-center gap-2.5 pointer-events-none">
                <div class="w-6 h-6 text-indigo-300 flex items-center justify-center rounded bg-indigo-500/15 font-bold text-xs">T</div>
                <div>
                  <div class="text-xs font-semibold text-slate-100">Draggable Text Box</div>
                  <div class="text-[10px] text-slate-400">Drop anywhere to type</div>
                </div>
              </div>
              <span class="text-[10px] font-mono-tabular text-indigo-300 pointer-events-none">480 × 96</span>
            </div>
          </div>

          <!-- Extended Vector Geometric Shapes Grid -->
          <div class="border-t border-slate-800 pt-4">
            <h2 class="text-sm font-bold text-slate-100 tracking-tight">Extended Geometric Library</h2>
            <p class="text-xs text-slate-400 mt-0.5">Drag any geometric polygon or line onto the artboard</p>
            <div class="grid grid-cols-3 gap-2 mt-3">
              ${shapes
                .map((s) => {
                  const fillCol = this.paletteShapeColor || s.defaultColor;
                  const shapePayload: Partial<DesignElement> = {
                    name: `${s.label} Shape`,
                    type: 'shape',
                    shapeKind: s.kind,
                    width: s.kind === 'line' ? 420 : s.kind === 'pill' ? 300 : s.kind === 'rect' ? 260 : 240,
                    height: s.kind === 'line' ? 28 : s.kind === 'pill' ? 84 : s.kind === 'rect' ? 180 : 240,
                    fill: fillCol,
                    borderRadius: s.kind === 'rect' ? 16 : 0,
                  };
                  return `
                <button
                  draggable="true"
                  data-drag-payload="${this.escapeHtml(JSON.stringify(shapePayload))}"
                  data-add-shape="${s.kind}"
                  class="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/60 cursor-grab active:cursor-grabbing transition-colors group"
                  title="Drag ${s.label} onto canvas or click to add"
                >
                  <div class="w-9 h-9 pointer-events-none group-hover:scale-105 transition-transform">
                    ${renderShapeSvg(s.kind, fillCol, 'none', 0, s.kind === 'rect' ? 12 : 0)}
                  </div>
                  <span class="text-[11px] text-slate-300 whitespace-nowrap truncate max-w-full pointer-events-none">${s.label}</span>
                </button>
              `;
                })
                .join('')}
            </div>
          </div>

          <!-- Canva Photo Clipping Frames -->
          <div class="border-t border-slate-800 pt-4">
            <h2 class="text-sm font-bold text-slate-100 tracking-tight">Canva Photo Frames</h2>
            <p class="text-xs text-slate-400 mt-0.5">Drop any image onto a frame to mask it inside the shape</p>
            <div class="grid grid-cols-3 gap-2 mt-3">
              ${framesList
                .map((fr, idx) => {
                  const framePayload: Partial<DesignElement> = {
                    name: fr.label,
                    type: 'image',
                    src: BUILTIN_STUDIO_VISUALS[idx % BUILTIN_STUDIO_VISUALS.length].dataUrl,
                    frameShape: fr.kind,
                    width: 280,
                    height: fr.kind === 'pill' ? 160 : 280,
                    objectFit: 'cover',
                  };
                  return `
                    <button
                      draggable="true"
                      data-drag-payload="${this.escapeHtml(JSON.stringify(framePayload))}"
                      data-quick-insert="${this.escapeHtml(JSON.stringify(framePayload))}"
                      class="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/60 cursor-grab active:cursor-grabbing transition-colors group"
                    >
                      <div class="w-11 h-11 overflow-hidden bg-indigo-500/20 pointer-events-none" style="clip-path: ${getFrameClipPathCss(fr.kind)};">
                        <img src="${BUILTIN_STUDIO_VISUALS[idx % BUILTIN_STUDIO_VISUALS.length].dataUrl}" class="w-full h-full object-cover" />
                      </div>
                      <span class="text-[10px] font-medium text-slate-300 whitespace-nowrap">${fr.label}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>

          <div class="border-t border-slate-800 pt-4">
            <h2 class="text-sm font-bold text-slate-100 tracking-tight">Graphic Ornaments & Stickers</h2>
            <div class="grid grid-cols-2 gap-2.5 mt-3">
              ${stickers
                .map((st) => {
                  const stickerPayload: Partial<DesignElement> = {
                    name: `Sticker (${st.label})`,
                    type: 'sticker',
                    stickerKind: st.kind,
                    width: 220,
                    height: 220,
                    fill: st.primary,
                    stroke: st.accent,
                  };
                  return `
                <button
                  draggable="true"
                  data-drag-payload="${this.escapeHtml(JSON.stringify(stickerPayload))}"
                  data-add-sticker="${st.kind}"
                  data-sticker-primary="${st.primary}"
                  data-sticker-accent="${st.accent}"
                  class="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/60 cursor-grab active:cursor-grabbing transition-colors text-left"
                >
                  <div class="w-9 h-9 shrink-0 pointer-events-none">
                    ${renderStickerSvg(st.kind, st.primary, st.accent)}
                  </div>
                  <span class="text-xs font-medium text-slate-200 leading-tight pointer-events-none">${st.label}</span>
                </button>
              `;
                })
                .join('')}
            </div>
          </div>

          <div class="border-t border-slate-800 pt-4">
            <h2 class="text-sm font-bold text-slate-100 tracking-tight">Studio Artwork & Backdrops</h2>
            <p class="text-xs text-slate-400 mt-0.5">Drag onto a Photo Frame to mask, or drop onto canvas</p>
            <div class="grid grid-cols-2 gap-2.5 mt-3">
              ${BUILTIN_STUDIO_VISUALS.map((v) => {
                const imgPayload: Partial<DesignElement> = {
                  name: v.name,
                  type: 'image',
                  src: v.dataUrl,
                  width: 520,
                  height: 390,
                  borderRadius: 16,
                  objectFit: 'cover',
                };
                return `
                <button
                  draggable="true"
                  data-drag-payload="${this.escapeHtml(JSON.stringify(imgPayload))}"
                  data-add-stock-img="${v.id}"
                  class="group rounded-lg overflow-hidden border border-slate-700 hover:border-indigo-500 cursor-grab active:cursor-grabbing transition-colors text-left bg-slate-900"
                >
                  <img src="${v.dataUrl}" draggable="false" alt="${this.escapeHtml(v.name)}" class="w-full h-20 object-cover pointer-events-none group-hover:scale-105 transition-transform" />
                  <div class="p-1.5 text-[11px] font-medium text-slate-300 truncate pointer-events-none">${this.escapeHtml(v.name)}</div>
                </button>
              `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeSidebarTab === 'text') {
      const activeTextEl =
        this.selectedElement && this.selectedElement.type === 'text'
          ? this.selectedElement
          : null;

      const curFont = activeTextEl?.fontFamily || this.textToolFontFamily || 'Plus Jakarta Sans';
      const curSize = activeTextEl?.fontSize || this.textToolFontSize || 48;
      const curColor =
        activeTextEl?.color ||
        this.textToolColor ||
        (this.activePage.background === '#ffffff' ? '#0f172a' : '#f8fafc');
      const curWeight = Number(activeTextEl?.fontWeight ?? this.textToolFontWeight ?? 700);
      const curStyle = activeTextEl?.fontStyle || this.textToolFontStyle || 'normal';
      const curDecoration =
        activeTextEl?.textDecoration || this.textToolDecoration || 'none';
      const curAlign = activeTextEl?.textAlign || this.textToolAlign || 'left';
      const curTextContent = activeTextEl
        ? activeTextEl.text || ''
        : this.textToolDraftText || 'Editable Text Layer';

      const textColorSwatches = [
        '#f8fafc',
        '#0f172a',
        '#6366f1',
        '#38bdf8',
        '#ec4899',
        '#f43f5e',
        '#f59e0b',
        '#10b981',
        '#a855f7',
        '#cbd5e1',
      ];

      const headingPayload: Partial<DesignElement> = {
        name: 'Heading Text',
        type: 'text',
        text: 'Bold Visual Headline',
        fontFamily: curFont,
        fontSize: 72,
        fontWeight: 700,
        color: curColor,
        width: 720,
        height: 110,
      };
      const subheadingPayload: Partial<DesignElement> = {
        name: 'Subheading Text',
        type: 'text',
        text: 'Structured studio subheading for clarity',
        fontFamily: curFont,
        fontSize: 42,
        fontWeight: 600,
        color: curColor,
        width: 680,
        height: 75,
      };
      const bodyPayload: Partial<DesignElement> = {
        name: 'Body Paragraph',
        type: 'text',
        text: 'Add supporting editorial copy, key metrics, or event details directly on your artboard.',
        fontFamily: curFont,
        fontSize: 26,
        fontWeight: 400,
        color: curColor,
        width: 600,
        height: 95,
      };
      const curvedBadgePayload: Partial<DesignElement> = {
        name: 'Curved Arc Headline',
        type: 'text',
        text: 'STUDIO EDITION · COPENHAGEN 2026',
        fontFamily: 'JetBrains Mono',
        fontSize: 28,
        fontWeight: 700,
        textCurve: 55,
        color: '#38bdf8',
        width: 580,
        height: 180,
      };

      return `
        <div class="p-4 flex flex-col gap-4 h-full overflow-y-auto">
          <div>
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-bold text-slate-100 tracking-tight">Text Tool & Typography</h2>
              <span class="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-mono-tabular text-indigo-300">Shortcut: T</span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">Configure font, size & color below, then click anywhere on the canvas to place an editable text element</p>
          </div>

          <!-- Interactive Click-on-Canvas Text Tool & Property Configurator -->
          <div
            id="sidebar-text-tool-panel"
            class="p-3 rounded-xl bg-slate-950/90 border ${
              this.isTextPlacementMode
                ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                : 'border-slate-800'
            } space-y-3"
          >
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-toggle-text-tool"
                class="flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  this.isTextPlacementMode
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50'
                    : 'bg-slate-800 hover:bg-indigo-600 text-slate-100 hover:text-white border border-slate-700'
                }"
                title="Activate Text Tool to click anywhere on the canvas and add an editable text box (T)"
              >
                ${ICONS.text}
                <span>${
                  this.isTextPlacementMode
                    ? 'Click Canvas to Place Text (Active)'
                    : 'Click Canvas to Add Text (T)'
                }</span>
              </button>
              <button
                type="button"
                id="btn-add-custom-text-now"
                class="py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
                title="Immediately insert an editable text element onto the canvas with the configured Font, Size, and Color"
              >
                + Insert
              </button>
            </div>

            ${
              this.isTextPlacementMode
                ? `<div class="px-2.5 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-[11px] text-indigo-200 flex items-center justify-between">
                    <span>Click any spot on the canvas to add editable text</span>
                    <span class="font-mono-tabular text-[10px] text-indigo-300">I-Beam Mode</span>
                  </div>`
                : ''
            }

            <!-- Configurable Font Family, Font Size & Text Color -->
            <div class="space-y-2.5 pt-1 border-t border-slate-800/80">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-slate-300">
                  ${
                    activeTextEl
                      ? `Editing: "${this.escapeHtml(activeTextEl.name)}"`
                      : 'Text Tool Defaults (Font, Size & Color)'
                  }
                </span>
                ${
                  activeTextEl
                    ? `<button type="button" id="btn-focus-canvas-text" class="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-[10px] font-semibold text-indigo-200 hover:text-white cursor-pointer">Edit Inline on Canvas</button>`
                    : ''
                }
              </div>

              <!-- Font Family Selector -->
              <div>
                <label for="sidebar-text-font" class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Font Family</label>
                <select
                  id="sidebar-text-font"
                  class="w-full bg-slate-900 border border-slate-700 hover:border-indigo-500/60 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  ${STUDIO_FONTS.map(
                    (f) =>
                      `<option value="${f.value}" ${
                        curFont === f.value ? 'selected' : ''
                      }>${f.label}</option>`
                  ).join('')}
                </select>
              </div>

              <!-- Font Size Controls (Input, Stepper, Slider & Presets) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label for="sidebar-text-size" class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Font Size (px)</label>
                  <span class="text-[10px] font-mono-tabular text-indigo-300">${curSize}px</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex items-center bg-slate-900 border border-slate-700 rounded-lg shrink-0">
                    <button type="button" id="sidebar-text-size-dec" class="px-2 py-1 text-slate-300 hover:text-white text-xs font-bold cursor-pointer">-</button>
                    <input
                      type="number"
                      id="sidebar-text-size"
                      value="${curSize}"
                      min="8"
                      max="300"
                      class="w-12 bg-transparent text-center text-xs font-mono-tabular text-white focus:outline-none"
                    />
                    <button type="button" id="sidebar-text-size-inc" class="px-2 py-1 text-slate-300 hover:text-white text-xs font-bold cursor-pointer">+</button>
                  </div>
                  <input
                    type="range"
                    id="sidebar-text-size-slider"
                    min="12"
                    max="180"
                    value="${Math.min(180, curSize)}"
                    class="flex-1 accent-indigo-500 cursor-pointer"
                  />
                </div>
                <div class="flex items-center gap-1 mt-1.5">
                  ${[18, 28, 36, 48, 72, 96]
                    .map(
                      (sz) => `<button
                        type="button"
                        data-sidebar-font-size-preset="${sz}"
                        class="flex-1 py-0.5 rounded text-[10px] font-mono-tabular border transition-colors cursor-pointer ${
                          curSize === sz
                            ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }"
                      >${sz}</button>`
                    )
                    .join('')}
                </div>
              </div>

              <!-- Text Color Picker & Swatches -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label for="sidebar-text-color" class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Text Color</label>
                  <span class="text-[10px] font-mono-tabular text-slate-300">${curColor.toUpperCase()}</span>
                </div>
                <div class="flex items-center gap-2">
                  <label class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-indigo-500/60 cursor-pointer shrink-0">
                    <span class="w-4 h-4 rounded-xs border border-white/20" style="background: ${curColor};"></span>
                    <input type="color" id="sidebar-text-color" value="${curColor}" class="sr-only" />
                    <span class="text-[11px] font-mono-tabular text-slate-200">${curColor.toUpperCase()}</span>
                  </label>
                  <div class="flex items-center gap-1 flex-wrap">
                    ${textColorSwatches
                      .map(
                        (sw) => `<button
                          type="button"
                          data-sidebar-text-color-swatch="${sw}"
                          title="Set text color to ${sw}"
                          class="w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            curColor.toLowerCase() === sw.toLowerCase()
                              ? 'border-white scale-110 ring-2 ring-indigo-500'
                              : 'border-slate-700 hover:scale-110'
                          }"
                          style="background: ${sw};"
                        ></button>`
                      )
                      .join('')}
                  </div>
                </div>
              </div>

              <!-- Font Weight, Style & Alignment Row -->
              <div class="flex items-center justify-between gap-2 pt-0.5">
                <div class="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 gap-0.5">
                  <button
                    type="button"
                    id="sidebar-text-bold"
                    class="px-2.5 py-1 text-xs font-bold rounded cursor-pointer ${
                      curWeight >= 700
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }"
                    title="Bold"
                  >B</button>
                  <button
                    type="button"
                    id="sidebar-text-italic"
                    class="px-2.5 py-1 text-xs italic rounded cursor-pointer ${
                      curStyle === 'italic'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }"
                    title="Italic"
                  >I</button>
                  <button
                    type="button"
                    id="sidebar-text-underline"
                    class="px-2.5 py-1 text-xs underline rounded cursor-pointer ${
                      curDecoration === 'underline'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }"
                    title="Underline"
                  >U</button>
                </div>

                <div class="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 gap-0.5">
                  ${(['left', 'center', 'right'] as const)
                    .map(
                      (al) => `<button
                        type="button"
                        data-sidebar-text-align="${al}"
                        class="px-2 py-1 text-[10px] font-semibold uppercase rounded cursor-pointer ${
                          curAlign === al
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }"
                      >${al}</button>`
                    )
                    .join('')}
                </div>
              </div>

              <!-- Editable Text Content Box -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label for="sidebar-text-content" class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    ${activeTextEl ? 'Selected Text Content' : 'Initial Text to Place'}
                  </label>
                  ${
                    activeTextEl
                      ? `<div class="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded border border-slate-700">
                          <button type="button" data-prop-text-dir="ltr" class="px-1.5 py-0.5 rounded text-[9px] font-mono-tabular ${
                            (activeTextEl.textDirection || 'ltr') === 'ltr'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }">LTR</button>
                          <button type="button" data-prop-text-dir="rtl" class="px-1.5 py-0.5 rounded text-[9px] font-mono-tabular ${
                            activeTextEl.textDirection === 'rtl'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }">RTL</button>
                        </div>`
                      : ''
                  }
                </div>
                <textarea
                  id="sidebar-text-content"
                  dir="${activeTextEl?.textDirection || 'auto'}"
                  rows="2"
                  placeholder="Type text content here..."
                  class="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >${this.escapeHtml(curTextContent)}</textarea>
              </div>

              ${
                activeTextEl
                  ? `
                <!-- Rich Typography Pro Controls inside Sidebar Text Drawer -->
                <div class="border-t border-slate-800/80 pt-2.5 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">Rich Typography Pro</span>
                    <div class="flex items-center gap-1">
                      <button type="button" id="sidebar-text-list-bullet" class="px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        activeTextEl.listStyle === 'bullet'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                      }">• Bullet List</button>
                      <button type="button" id="sidebar-text-list-number" class="px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        activeTextEl.listStyle === 'number'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                      }">1. Numbered</button>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <span class="block text-[10px] text-slate-400 mb-0.5">Case Transform</span>
                      <select id="sidebar-text-transform" class="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100">
                        <option value="none" ${(activeTextEl.textTransform || 'none') === 'none' ? 'selected' : ''}>Normal (Aa)</option>
                        <option value="uppercase" ${activeTextEl.textTransform === 'uppercase' ? 'selected' : ''}>UPPERCASE</option>
                        <option value="lowercase" ${activeTextEl.textTransform === 'lowercase' ? 'selected' : ''}>lowercase</option>
                        <option value="capitalize" ${activeTextEl.textTransform === 'capitalize' ? 'selected' : ''}>Capitalize Words</option>
                      </select>
                    </div>
                    <div>
                      <span class="block text-[10px] text-slate-400 mb-0.5">Highlight Pill Box</span>
                      <div class="flex items-center gap-1.5">
                        <label class="flex-1 flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 cursor-pointer">
                          <span>Pill Color</span>
                          <input type="color" id="sidebar-text-bg-color" value="${activeTextEl.textBgColor || '#4f46e5'}" class="w-4 h-4 bg-transparent border-0 cursor-pointer" />
                        </label>
                        ${
                          activeTextEl.textBgColor
                            ? `<button type="button" id="sidebar-text-bg-clear" class="px-1.5 py-1 rounded bg-rose-950/70 border border-rose-700/50 text-[10px] text-rose-200">Clear</button>`
                            : ''
                        }
                      </div>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <div class="flex justify-between text-[10px] text-slate-400">
                        <span>Letter Spacing</span>
                        <span class="font-mono-tabular text-slate-200">${activeTextEl.letterSpacing ?? 0}px</span>
                      </div>
                      <input type="range" id="sidebar-letter-spacing" min="-2" max="16" step="0.5" value="${activeTextEl.letterSpacing ?? 0}" class="w-full accent-indigo-500" />
                    </div>
                    <div>
                      <div class="flex justify-between text-[10px] text-slate-400">
                        <span>Line Height</span>
                        <span class="font-mono-tabular text-slate-200">${activeTextEl.lineHeight ?? 1.25}</span>
                      </div>
                      <input type="range" id="sidebar-line-height" min="0.9" max="2.2" step="0.05" value="${activeTextEl.lineHeight ?? 1.25}" class="w-full accent-indigo-500" />
                    </div>
                  </div>
                  <div class="flex items-center justify-between text-xs text-slate-300 pt-0.5">
                    <span>Effect Accent Color</span>
                    <input type="color" id="sidebar-text-fx-color" value="${
                      activeTextEl.textEffectColor || '#6366f1'
                    }" class="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                  </div>
                </div>
              `
                  : ''
              }
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quick Typography Presets</div>
            <button
              id="btn-add-heading"
              draggable="true"
              data-drag-payload="${this.escapeHtml(JSON.stringify(headingPayload))}"
              class="w-full p-3 rounded-lg bg-slate-800 hover:bg-slate-700/90 border border-slate-700 hover:border-indigo-500/60 cursor-grab active:cursor-grabbing text-left transition-colors"
            >
              <div class="text-lg font-bold text-white font-display pointer-events-none">Add a Heading</div>
              <div class="text-[11px] text-slate-400 mt-0.5 font-mono-tabular pointer-events-none">Drag or click · 72px Bold</div>
            </button>

            <button
              id="btn-add-subheading"
              draggable="true"
              data-drag-payload="${this.escapeHtml(JSON.stringify(subheadingPayload))}"
              class="w-full p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700/90 border border-slate-700 hover:border-indigo-500/60 cursor-grab active:cursor-grabbing text-left transition-colors"
            >
              <div class="text-sm font-semibold text-slate-100 pointer-events-none">Add a Subheading</div>
              <div class="text-[11px] text-slate-400 mt-0.5 font-mono-tabular pointer-events-none">Drag or click · 42px SemiBold</div>
            </button>

            <button
              id="btn-add-body"
              draggable="true"
              data-drag-payload="${this.escapeHtml(JSON.stringify(bodyPayload))}"
              class="w-full p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700/90 border border-slate-700 hover:border-indigo-500/60 cursor-grab active:cursor-grabbing text-left transition-colors"
            >
              <div class="text-xs text-slate-200 pointer-events-none">Add a body text box</div>
              <div class="text-[11px] text-slate-400 mt-0.5 font-mono-tabular pointer-events-none">Drag or click · 26px Regular</div>
            </button>

            <button
              draggable="true"
              data-drag-payload="${this.escapeHtml(JSON.stringify(curvedBadgePayload))}"
              data-quick-insert="${this.escapeHtml(JSON.stringify(curvedBadgePayload))}"
              class="w-full p-2.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/40 cursor-grab active:cursor-grabbing text-left transition-colors"
            >
              <div class="text-xs font-bold text-indigo-300 font-mono-tabular pointer-events-none">╭ Curved Arc Text Preset ╮</div>
              <div class="text-[11px] text-slate-400 mt-0.5 pointer-events-none">SVG Path Arc · Adjustable curvature</div>
            </button>
          </div>

          <!-- RTL Languages & Bidirectional Typography Palette -->
          <div id="sidebar-rtl-languages-palette" class="border-t border-slate-800 pt-4 space-y-2.5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-emerald-300">RTL Languages (العربية · עברית · فارسی · اردو)</h3>
                <p class="text-[11px] text-slate-400">Drag or click to insert native right-to-left typography</p>
              </div>
              <span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono-tabular text-emerald-300">dir="rtl"</span>
            </div>

            <div class="grid grid-cols-1 gap-2">
              ${(
                [
                  {
                    langCode: 'ar',
                    langName: 'Arabic · العربية',
                    font: 'Cairo',
                    headline: 'تصميم إبداعي بلا حدود',
                    sub: 'مساحة عمل احترافية لتصميم الشعارات والعروض التقديمية',
                    accent: '#10b981',
                  },
                  {
                    langCode: 'he',
                    langName: 'Hebrew · עברית',
                    font: 'Heebo',
                    headline: 'עיצוב יצירתי ללא גבולות',
                    sub: 'סטודיו מקצועי לעיצוב גרפי, מצגות וטיפוגרפיה דו-כיוונית',
                    accent: '#38bdf8',
                  },
                  {
                    langCode: 'fa',
                    langName: 'Persian / Farsi · فارسی',
                    font: 'Vazirmatn',
                    headline: 'طراحی خلاقانه بدون مرز',
                    sub: 'استودیوی حرفه‌ای طراحی گرافیک و تایپوگرافی فارسی',
                    accent: '#a855f7',
                  },
                  {
                    langCode: 'ur',
                    langName: 'Urdu · اردو',
                    font: 'Noto Naskh Arabic',
                    headline: 'بے مثال تخلیقی ڈیزائن اسٹوڈیو',
                    sub: 'اردو ٹائپوگرافی اور جدید گرافک ڈیزائن کے لیے مکمل ورک اسپیس',
                    accent: '#f59e0b',
                  },
                ] as const
              )
                .map((rtl) => {
                  const rtlPayload: Partial<DesignElement> = {
                    name: `${rtl.langName} Headline`,
                    type: 'text',
                    text: rtl.headline,
                    fontFamily: rtl.font,
                    fontSize: 64,
                    fontWeight: 700,
                    textDirection: 'rtl',
                    textAlign: 'right',
                    langCode: rtl.langCode,
                    color: this.activePage.background === '#ffffff' ? '#0f172a' : '#f8fafc',
                    width: 680,
                    height: 110,
                  };
                  return `
                    <button
                      draggable="true"
                      data-drag-payload="${this.escapeHtml(JSON.stringify(rtlPayload))}"
                      data-quick-insert="${this.escapeHtml(JSON.stringify(rtlPayload))}"
                      class="w-full p-2.5 rounded-lg bg-slate-900/95 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/60 cursor-grab active:cursor-grabbing transition-all text-right group"
                    >
                      <div class="flex items-center justify-between gap-2 mb-1 pointer-events-none" dir="ltr">
                        <span class="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300">${rtl.langName}</span>
                        <span class="text-[10px] font-mono-tabular text-slate-400">${rtl.font} · RTL</span>
                      </div>
                      <div dir="rtl" lang="${rtl.langCode}" class="text-base font-bold text-slate-100 pointer-events-none truncate" style="font-family: '${rtl.font}', sans-serif;">
                        ${rtl.headline}
                      </div>
                      <div dir="rtl" lang="${rtl.langCode}" class="text-[11px] text-slate-400 pointer-events-none truncate mt-0.5" style="font-family: '${rtl.font}', sans-serif;">
                        ${rtl.sub}
                      </div>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>

          <div class="border-t border-slate-800 pt-4">
            <h3 class="text-xs font-semibold text-slate-300 mb-2">Canva Text Effect Combinations</h3>
            <div class="grid grid-cols-2 gap-2">
              ${(
                [
                  { id: 'neon', name: 'Neon Pulse', col: '#38bdf8', fxCol: '#6366f1' },
                  { id: 'splice', name: 'Splice Offset', col: '#f8fafc', fxCol: '#f43f5e' },
                  { id: 'hollow', name: 'Hollow Outline', col: '#f59e0b', fxCol: '#f59e0b' },
                  { id: 'echo', name: 'Echo Stack', col: '#10b981', fxCol: '#065f46' },
                ] as const
              )
                .map((fx) => {
                  const p: Partial<DesignElement> = {
                    name: `${fx.name} Title`,
                    type: 'text',
                    text: fx.name.toUpperCase(),
                    fontFamily: 'Bricolage Grotesque',
                    fontSize: 64,
                    fontWeight: 700,
                    color: fx.col,
                    textEffect: fx.id,
                    textEffectColor: fx.fxCol,
                    width: 580,
                    height: 100,
                  };
                  return `
                    <button
                      draggable="true"
                      data-drag-payload="${this.escapeHtml(JSON.stringify(p))}"
                      data-quick-insert="${this.escapeHtml(JSON.stringify(p))}"
                      class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/60 text-left cursor-grab"
                    >
                      <div class="text-sm font-bold truncate pointer-events-none" style="color: ${fx.col};">${fx.name}</div>
                      <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none">FX: ${fx.id}</div>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeSidebarTab === 'charts') {
      const defaultChartData = [
        { label: 'Q1', value: 44 },
        { label: 'Q2', value: 68 },
        { label: 'Q3', value: 86 },
        { label: 'Q4', value: 98 },
      ];
      const chartPresets: Array<{ kind: ChartKind; label: string; desc: string }> = [
        { kind: 'bar', label: 'Vertical Bar Chart', desc: 'Quarterly comparison bars' },
        { kind: 'line', label: 'Trend Area Line Chart', desc: 'Smooth telemetry curve' },
        { kind: 'donut', label: 'Donut Breakdown', desc: 'Proportional share ring' },
        { kind: 'progress', label: 'KPI Radial Gauge', desc: 'Single-metric percentage ring' },
      ];

      return `
        <div class="p-4 flex flex-col gap-4 h-full overflow-y-auto">
          <div>
            <h2 class="text-sm font-bold text-slate-100 tracking-tight">Interactive Data Charts</h2>
            <p class="text-xs text-slate-400 mt-0.5">Drag onto canvas or click to insert live SVG data visualizations</p>
          </div>

          <div class="grid grid-cols-1 gap-2.5">
            ${chartPresets
              .map((cp) => {
                const payload: Partial<DesignElement> = {
                  name: cp.label,
                  type: 'chart',
                  chartKind: cp.kind,
                  width: cp.kind === 'progress' ? 280 : 480,
                  height: cp.kind === 'progress' ? 280 : 320,
                  fill: '#6366f1',
                  stroke: '#38bdf8',
                  color: this.activePage.background === '#ffffff' ? '#0f172a' : '#e2e8f0',
                  chartData: cp.kind === 'progress' ? [{ label: 'Retention', value: 88 }] : defaultChartData,
                  chartShowValues: true,
                };
                return `
                  <button
                    draggable="true"
                    data-drag-payload="${this.escapeHtml(JSON.stringify(payload))}"
                    data-quick-insert="${this.escapeHtml(JSON.stringify(payload))}"
                    class="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 flex items-center justify-between text-left cursor-grab transition-colors"
                  >
                    <div>
                      <div class="text-xs font-bold text-slate-100">${cp.label}</div>
                      <div class="text-[11px] text-slate-400 mt-0.5">${cp.desc}</div>
                    </div>
                    <span class="px-2 py-1 rounded bg-indigo-600/20 text-indigo-300 text-[10px] font-mono-tabular">Drag / Add</span>
                  </button>
                `;
              })
              .join('')}
          </div>

          ${
            this.selectedElement && this.selectedElement.type === 'chart'
              ? `
            <div class="border-t border-slate-800 pt-4 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold text-indigo-300 uppercase tracking-wider">Live Chart Data Table</h3>
                <button id="btn-chart-add-row" class="px-2 py-0.5 rounded bg-indigo-600 text-white text-[11px] font-medium">+ Row</button>
              </div>
              <div class="space-y-1.5">
                ${(this.selectedElement.chartData || [])
                  .map(
                    (row, idx) => `
                  <div class="flex items-center gap-1.5">
                    <input
                      type="text"
                      data-chart-label-idx="${idx}"
                      value="${this.escapeHtml(row.label)}"
                      class="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-100"
                    />
                    <input
                      type="number"
                      data-chart-val-idx="${idx}"
                      value="${row.value}"
                      class="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono-tabular text-slate-100"
                    />
                    ${
                      (this.selectedElement?.chartData?.length || 0) > 1
                        ? `<button data-chart-del-idx="${idx}" class="p-1 text-slate-400 hover:text-rose-400">${ICONS.close}</button>`
                        : ''
                    }
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
              : ''
          }
        </div>
      `;
    }

    if (this.activeSidebarTab === 'uploads') {
      return `
        <div class="p-4 flex flex-col gap-4 h-full overflow-y-auto">
          <div>
            <h2 class="text-sm font-bold text-slate-100 tracking-tight">Local Browser Uploads</h2>
            <p class="text-xs text-slate-400 mt-0.5">Drag uploaded images onto Photo Frames or directly onto the canvas</p>
          </div>

          <label class="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-800/40 hover:bg-slate-800/80 cursor-pointer transition-colors text-center">
            <span class="p-2.5 rounded-full bg-indigo-600/20 text-indigo-400">${ICONS.uploads}</span>
            <span class="text-xs font-semibold text-slate-200">Upload Image from Device</span>
            <span class="text-[11px] text-slate-400">PNG, JPG, SVG, WebP · Saved offline</span>
            <input type="file" id="file-upload-input" accept="image/*" class="sr-only" />
          </label>

          ${
            this.uploads.length === 0
              ? `
            <div class="p-5 rounded-lg bg-slate-900/70 border border-slate-800 text-center">
              <p class="text-xs text-slate-400">No custom images uploaded yet. Upload a photo or logo above to use it across your projects.</p>
            </div>
          `
              : `
            <div class="grid grid-cols-2 gap-2.5">
              ${this.uploads
                .map((u) => {
                  const upPayload: Partial<DesignElement> = {
                    name: u.name,
                    type: 'image',
                    src: u.dataUrl,
                    width: u.width,
                    height: u.height,
                    borderRadius: 12,
                    objectFit: 'cover',
                  };
                  return `
                <div
                  draggable="true"
                  data-drag-payload="${this.escapeHtml(JSON.stringify(upPayload))}"
                  class="group relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 cursor-grab"
                >
                  <button data-insert-upload="${u.id}" class="w-full text-left">
                    <img src="${u.dataUrl}" draggable="false" alt="${this.escapeHtml(u.name)}" class="w-full h-24 object-cover pointer-events-none" />
                    <div class="p-1.5 text-[11px] text-slate-300 truncate pointer-events-none">${this.escapeHtml(u.name)}</div>
                  </button>
                  <button data-delete-upload="${u.id}" class="absolute top-1.5 right-1.5 p-1 rounded bg-slate-950/80 text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove Upload">
                    ${ICONS.trash}
                  </button>
                </div>
              `;
                })
                .join('')}
            </div>
          `
          }

          <div class="border-t border-slate-800 pt-4 mt-auto">
            <h3 class="text-xs font-semibold text-slate-300 mb-2">Project JSON Backup</h3>
            <label class="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <span>Import .canva.json File</span>
              <input type="file" id="json-import-input" accept=".json,application/json" class="sr-only" />
            </label>
          </div>
        </div>
      `;
    }

    if (this.activeSidebarTab === 'draw') {
      return `
        <div class="p-4 flex flex-col gap-4 h-full overflow-y-auto">
          <div>
            <h2 class="text-sm font-bold text-slate-100 tracking-tight">Freehand Vector Brush</h2>
            <p class="text-xs text-slate-400 mt-0.5">Sketch smooth scalable SVG paths directly on the artboard</p>
          </div>

          <button
            id="btn-toggle-draw-mode"
            class="w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
              this.isDrawingMode
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }"
          >
            ${ICONS.draw}
            <span>${this.isDrawingMode ? 'Stop Freehand Drawing' : 'Start Drawing on Artboard'}</span>
          </button>

          <div class="space-y-3 pt-2">
            <div>
              <div class="flex justify-between text-xs text-slate-300 mb-1">
                <span>Stroke Weight</span>
                <span class="font-mono-tabular">${this.brushWidth} px</span>
              </div>
              <input type="range" id="drawer-brush-width" min="2" max="48" value="${this.brushWidth}" class="w-full accent-indigo-500" />
            </div>

            <div>
              <div class="flex justify-between text-xs text-slate-300 mb-1">
                <span>Brush Opacity</span>
                <span class="font-mono-tabular">${Math.round(this.brushOpacity * 100)}%</span>
              </div>
              <input type="range" id="drawer-brush-opacity" min="15" max="100" value="${Math.round(this.brushOpacity * 100)}" class="w-full accent-indigo-500" />
            </div>

            <div>
              <span class="block text-xs text-slate-300 mb-2">Brush Color Swatches</span>
              <div class="grid grid-cols-6 gap-2">
                ${COLOR_SWATCHES.slice(0, 18)
                  .map(
                    (c) => `
                  <button
                    data-brush-swatch="${c}"
                    class="w-8 h-8 rounded-md border ${
                      this.brushColor.toLowerCase() === c.toLowerCase()
                        ? 'ring-2 ring-white border-white scale-110'
                        : 'border-white/15 hover:scale-105'
                    } transition-transform"
                    style="background-color: ${c};"
                  ></button>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeSidebarTab === 'apps') {
      const gridPresets: Array<{ id: GridLayoutKind; label: string; desc: string }> = [
        { id: 'split-v', label: '2-Up Vertical Grid', desc: 'Side-by-side split photo collage' },
        { id: 'split-h', label: '2-Up Horizontal Grid', desc: 'Top & bottom split photo collage' },
        { id: 'bento-3', label: '3-Cell Bento Grid', desc: 'Hero left + 2 stacked right cells' },
        { id: 'quad-4', label: '4-Cell Quad Grid', desc: '2×2 balanced photo collage' },
      ];
      const selectedTable = this.selectedElement?.type === 'table' ? this.selectedElement : null;
      const connectableEls = this.activePage.elements.filter(
        (item) => item.type !== 'connector' && !item.hidden
      );
      const detectedVars = this.detectTemplateVariables();

      return `
        <div class="p-4 flex flex-col gap-5 h-full overflow-y-auto">
          <div>
            <h2 class="text-sm font-bold text-slate-100 tracking-tight">Apps: Animate, Connectors, Bulk Create, Grids & Tables</h2>
            <p class="text-xs text-slate-400 mt-0.5">Canva Pro workflows: page animations, flowchart connectors, bulk merge, QR & data tables</p>
          </div>

          <!-- Feature 1: Page-Wide Animation Combinations ("Animate" Panel) -->
          <div class="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Page-Wide Animation Combos</span>
              <button id="btn-sidebar-replay-anim" class="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold">▶ Preview</button>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              ${(
                [
                  { id: 'corporate', label: 'Corporate Clean', desc: 'Rise + staggered 120ms' },
                  { id: 'playful', label: 'Playful Pop', desc: 'Bouncy pop + tumble' },
                  { id: 'cinematic', label: 'Cinematic Reveal', desc: 'Slow pan + wipe' },
                  { id: 'energetic', label: 'Energetic Social', desc: 'Fast pop + neon pulse' },
                ] as const
              )
                .map(
                  (preset) => `
                <button
                  data-page-anim-preset="${preset.id}"
                  class="p-2 rounded-lg border text-left transition-all ${
                    this.activePage.pageAnimationPreset === preset.id
                      ? 'bg-emerald-600/25 border-emerald-400 text-white'
                      : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:border-emerald-500/50'
                  }"
                >
                  <div class="text-xs font-semibold">${preset.label}</div>
                  <div class="text-[10px] text-slate-400">${preset.desc}</div>
                </button>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Feature 7: Bulk Create / Data-Driven Template Merge -->
          <div class="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-2.5">
            <div class="flex items-center justify-between">
              <div>
                <span class="block text-[11px] font-bold uppercase tracking-wider text-amber-300">Bulk Create (Data Merge)</span>
                <span class="text-[10px] text-slate-400">Bind <code class="text-amber-200">{{Variables}}</code> to generate N pages</span>
              </div>
              <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono-tabular">${detectedVars.length} vars</span>
            </div>
            <div class="flex gap-1.5">
              <button id="btn-bulk-insert-placeholders" class="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-amber-200">
                + Add {{Name}} Placeholders
              </button>
              <button id="btn-open-bulk-create" class="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-[11px] font-bold">
                Open Bulk Create (${this.bulkDatasetRows.length} rows)
              </button>
            </div>
          </div>

          <!-- Feature 6: Smart Connectors & Flowchart Lines -->
          <div class="border-t border-slate-800 pt-4 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">Smart Flowchart Connectors</span>
              <span class="text-[10px] font-mono-tabular text-slate-400">Auto-tracks shapes</span>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <div>
                <label class="block text-[10px] text-slate-400 mb-0.5">From Element</label>
                <select id="sidebar-conn-from" class="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-white">
                  <option value="">(Auto / First Shape)</option>
                  ${connectableEls
                    .map(
                      (ce) =>
                        `<option value="${ce.id}" ${this.connectorDraftFromId === ce.id ? 'selected' : ''}>${this.escapeHtml(ce.name)}</option>`
                    )
                    .join('')}
                </select>
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 mb-0.5">To Element</label>
                <select id="sidebar-conn-to" class="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-white">
                  <option value="">(Auto / Second Shape)</option>
                  ${connectableEls
                    .map(
                      (ce) =>
                        `<option value="${ce.id}" ${this.connectorDraftToId === ce.id ? 'selected' : ''}>${this.escapeHtml(ce.name)}</option>`
                    )
                    .join('')}
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <select id="sidebar-conn-style" class="px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-cyan-300">
                <option value="curved" ${this.connectorDraftStyle === 'curved' ? 'selected' : ''}>Curved S-Bezier</option>
                <option value="elbow" ${this.connectorDraftStyle === 'elbow' ? 'selected' : ''}>90° Orthogonal Elbow</option>
                <option value="straight" ${this.connectorDraftStyle === 'straight' ? 'selected' : ''}>Straight Arrow</option>
              </select>
              <input
                type="text"
                id="sidebar-conn-label"
                value="${this.escapeHtml(this.connectorDraftLabel)}"
                placeholder="Label (e.g. Syncs to)"
                class="px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>
            <button id="btn-insert-connector" class="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition-colors">
              + Connect Elements with Smart Line
            </button>
          </div>

          <!-- Multi-Frame Layout Grids -->
          <div class="border-t border-slate-800 pt-4 space-y-2">
            <span class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-300">Canva Layout Grids (Drop Photos Into Cells)</span>
            <div class="grid grid-cols-2 gap-2">
              ${gridPresets
                .map(
                  (g) => `
                <button
                  data-add-grid="${g.id}"
                  class="p-2.5 rounded-lg border border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-indigo-500/60 text-left transition-colors"
                >
                  <div class="text-xs font-semibold text-white">${g.label}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">${g.desc}</div>
                </button>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Pure-JS Vector QR Code Builder -->
          <div class="border-t border-slate-800 pt-4 space-y-2.5">
            <span class="block text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Vector QR Code Generator</span>
            <input
              type="text"
              id="sidebar-qr-url"
              value="${this.escapeHtml(this.qrDraftUrl)}"
              placeholder="https://your-link.com"
              class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <div class="flex items-center gap-2">
              <label class="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 cursor-pointer">
                <span>Foreground</span>
                <input type="color" id="sidebar-qr-fg" value="${this.qrDraftFg}" class="w-5 h-5 bg-transparent border-0 cursor-pointer" />
              </label>
              <label class="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 cursor-pointer">
                <span>Background</span>
                <input type="color" id="sidebar-qr-bg" value="${this.qrDraftBg}" class="w-5 h-5 bg-transparent border-0 cursor-pointer" />
              </label>
            </div>
            <button id="btn-insert-qr" class="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors">
              + Insert Vector QR Code
            </button>
          </div>

          <!-- Feature 3: Native Editable Data Tables Pro -->
          <div class="border-t border-slate-800 pt-4 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-sky-300">Data Tables Pro</span>
              <button id="btn-insert-table" class="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
                + Add 3×3 Table
              </button>
            </div>
            ${
              selectedTable && selectedTable.tableData
                ? `
              <div class="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                <div class="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Edit Selected Table Cells</span>
                  <div class="flex gap-1">
                    <button id="sidebar-table-add-row" class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700">+Row</button>
                    <button id="sidebar-table-del-row" class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700">-Row</button>
                    <button id="sidebar-table-add-col" class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700">+Col</button>
                    <button id="sidebar-table-del-col" class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700">-Col</button>
                  </div>
                </div>
                <div class="space-y-1 max-h-48 overflow-y-auto">
                  ${selectedTable.tableData
                    .map(
                      (row, rIdx) => `
                    <div class="grid gap-1" style="grid-template-columns: repeat(${row.length}, minmax(0, 1fr));">
                      ${row
                        .map(
                          (cell, cIdx) => `
                        <input
                          type="text"
                          data-table-cell="${rIdx}-${cIdx}"
                          value="${this.escapeHtml(cell)}"
                          class="px-1.5 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white focus:outline-none focus:border-indigo-500"
                        />
                      `
                        )
                        .join('')}
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : `<p class="text-[11px] text-slate-400">Insert a table or select an existing table on the artboard to edit cells live.</p>`
            }
          </div>
        </div>
      `;
    }

    if (this.activeSidebarTab === 'background') {
      const previewGrad = `linear-gradient(${this.customGradAngle}deg, ${this.customGradStart} 0%, ${this.customGradEnd} 100%)`;
      return `
        <div class="p-4 flex flex-col gap-5 h-full overflow-y-auto">
          <div>
            <h2 class="text-sm font-bold text-slate-100 tracking-tight">Canvas Background & Gradients</h2>
            <p class="text-xs text-slate-400 mt-0.5">Customize surface color, custom multi-stop gradients, and grid texture</p>
          </div>

          <!-- Custom Gradient Builder -->
          <div class="p-3 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5">
            <span class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-300">Custom Vector Gradient Builder</span>
            <div class="h-10 rounded-lg border border-white/15" style="background: ${previewGrad};"></div>
            <div class="flex items-center gap-2">
              <label class="flex-1 flex items-center justify-between px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300 cursor-pointer">
                <span>Start</span>
                <input type="color" id="grad-start-color" value="${this.customGradStart}" class="w-5 h-5 bg-transparent border-0 cursor-pointer" />
              </label>
              <label class="flex-1 flex items-center justify-between px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300 cursor-pointer">
                <span>End</span>
                <input type="color" id="grad-end-color" value="${this.customGradEnd}" class="w-5 h-5 bg-transparent border-0 cursor-pointer" />
              </label>
            </div>
            <label class="flex items-center justify-between text-xs text-slate-300">
              <span>Angle (${this.customGradAngle}°)</span>
              <input type="range" id="grad-angle-slider" min="0" max="360" value="${this.customGradAngle}" class="w-36 accent-indigo-500" />
            </label>
            <div class="flex gap-2">
              <button id="btn-apply-grad-bg" class="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
                Apply to Page
              </button>
              <button id="btn-apply-grad-shape" class="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold">
                Apply to Shape
              </button>
            </div>
          </div>

          <div>
            <span class="block text-xs font-semibold text-slate-300 mb-2">Brand Kit Palette (${this.escapeHtml(this.brandKit.brandName)})</span>
            <div class="flex items-center gap-2 flex-wrap">
              ${this.brandKit.colors
                .map(
                  (c) => `
                <button
                  data-bg-color="${c}"
                  class="w-9 h-9 rounded-lg border border-white/20 hover:scale-105 transition-transform shadow-sm"
                  style="background-color: ${c};"
                  title="Set Background ${c}"
                ></button>
              `
                )
                .join('')}
            </div>
          </div>

          <div class="border-t border-slate-800 pt-4">
            <span class="block text-xs font-semibold text-slate-300 mb-2">Curated Studio Gradients</span>
            <div class="grid grid-cols-2 gap-2">
              ${GRADIENT_PRESETS.map(
                (g) => `
                <button
                  data-bg-gradient="${g.value}"
                  class="h-14 rounded-lg border border-white/15 p-2 flex items-end text-left hover:border-indigo-400 transition-colors"
                  style="background: ${g.value};"
                >
                  <span class="text-[11px] font-medium text-white drop-shadow">${g.name}</span>
                </button>
              `
              ).join('')}
            </div>
          </div>

          <div class="border-t border-slate-800 pt-4">
            <span class="block text-xs font-semibold text-slate-300 mb-2">Solid Studio Swatches</span>
            <div class="grid grid-cols-6 gap-2">
              ${COLOR_SWATCHES.map(
                (c) => `
                <button
                  data-bg-color="${c}"
                  class="w-8 h-8 rounded-md border border-white/15 hover:scale-105 transition-transform"
                  style="background-color: ${c};"
                  title="${c}"
                ></button>
              `
              ).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeSidebarTab === 'layers') {
      return this.renderLayersPanelContent(false);
    }

    return '';
  }

  private renderLayersPanelContent(isRightDock = false): string {
    const allElements = this.activePage.elements;
    const totalCount = allElements.length;
    const hiddenCount = allElements.filter((e) => e.hidden).length;
    const lockedCount = allElements.filter((e) => e.locked).length;

    // Reverse so top-most (front) element is listed first
    const indexedReversed = allElements
      .map((el, arrayIdx) => ({
        el,
        zOrderFromTop: totalCount - arrayIdx,
        isTopMost: arrayIdx === totalCount - 1,
        isBottomMost: arrayIdx === 0,
      }))
      .reverse();

    const filtered = indexedReversed.filter(({ el }) => {
      if (this.layerFilter === 'visible' && el.hidden) return false;
      if (this.layerFilter === 'hidden' && !el.hidden) return false;
      if (this.layerFilter === 'locked' && !el.locked) return false;
      if (this.layerSearchQuery.trim()) {
        const q = this.layerSearchQuery.toLowerCase();
        const label = (el.type === 'text' ? el.text || el.name : el.name).toLowerCase();
        return label.includes(q) || el.type.toLowerCase().includes(q);
      }
      return true;
    });

    const selectedEl = this.selectedElement;
    const selectedIdx = selectedEl
      ? allElements.findIndex((item) => item.id === selectedEl.id)
      : -1;
    const canBringForward = selectedIdx >= 0 && selectedIdx < totalCount - 1;
    const canSendBackward = selectedIdx > 0;

    return `
      <div class="p-3.5 flex flex-col gap-3 h-full overflow-hidden select-none">
        <!-- Header & Quick Bulk Actions -->
        <div class="flex items-center justify-between gap-2 shrink-0">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-slate-100 tracking-tight">Layers</h2>
              <span class="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-mono-tabular font-semibold text-indigo-300">
                ${totalCount} ${totalCount === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Drag to reorder · Front (#1) to Back (#${totalCount || 1})
            </p>
          </div>
          <div class="flex items-center gap-1">
            ${
              hiddenCount > 0
                ? `<button data-layers-show-all="true" class="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-[10px] font-semibold text-amber-300 whitespace-nowrap" title="Unhide all ${hiddenCount} hidden layers">Show All (${hiddenCount})</button>`
                : ''
            }
            ${
              lockedCount > 0
                ? `<button data-layers-unlock-all="true" class="px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-[10px] font-semibold text-sky-300 whitespace-nowrap" title="Unlock all ${lockedCount} locked layers">Unlock All (${lockedCount})</button>`
                : ''
            }
            ${
              isRightDock
                ? `<button id="btn-close-right-layers" class="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800" title="Close Layers Dock">${ICONS.close}</button>`
                : ''
            }
          </div>
        </div>

        <!-- Z-Order Reorder Bar for Active Selection -->
        <div class="p-2 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 shrink-0">
          <div class="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-0.5">
            <span>Layer Order (${selectedEl ? this.escapeHtml(selectedEl.name) : 'Select a layer'})</span>
            ${
              selectedEl
                ? `<span class="font-mono-tabular text-indigo-400">#${totalCount - selectedIdx} of ${totalCount}</span>`
                : ''
            }
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              data-layer-order-selected="top"
              ${!canBringForward ? 'disabled' : ''}
              class="py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                canBringForward
                  ? 'bg-slate-800/90 hover:bg-indigo-600 border-slate-700 hover:border-indigo-500 text-slate-100 hover:text-white'
                  : 'bg-slate-900/50 border-slate-800/70 text-slate-600 cursor-not-allowed'
              }"
              title="Bring Selected Layer to Front (Top of Stack)"
            >
              ${ICONS.bringToFront}
              <span>Bring to Front</span>
            </button>
            <button
              data-layer-order-selected="bottom"
              ${!canSendBackward ? 'disabled' : ''}
              class="py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                canSendBackward
                  ? 'bg-slate-800/90 hover:bg-indigo-600 border-slate-700 hover:border-indigo-500 text-slate-100 hover:text-white'
                  : 'bg-slate-900/50 border-slate-800/70 text-slate-600 cursor-not-allowed'
              }"
              title="Send Selected Layer to Back (Bottom of Stack)"
            >
              ${ICONS.sendToBack}
              <span>Send to Back</span>
            </button>
            <button
              data-layer-order-selected="up"
              ${!canBringForward ? 'disabled' : ''}
              class="py-1 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                canBringForward
                  ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed'
              }"
              title="Bring Forward One Step"
            >
              ${ICONS.up}
              <span>Bring Forward</span>
            </button>
            <button
              data-layer-order-selected="down"
              ${!canSendBackward ? 'disabled' : ''}
              class="py-1 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                canSendBackward
                  ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed'
              }"
              title="Send Backward One Step"
            >
              ${ICONS.down}
              <span>Send Backward</span>
            </button>
          </div>
        </div>

        <!-- Search & Filter Bar -->
        <div class="space-y-1.5 shrink-0">
          <div class="relative">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">${ICONS.search}</span>
            <input
              type="text"
              data-layer-search-input="true"
              value="${this.escapeHtml(this.layerSearchQuery)}"
              placeholder="Filter layers by name or type..."
              class="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div class="grid grid-cols-4 gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            ${(
              [
                { id: 'all', label: `All (${totalCount})` },
                { id: 'visible', label: 'Visible' },
                { id: 'hidden', label: `Hidden (${hiddenCount})` },
                { id: 'locked', label: `Locked (${lockedCount})` },
              ] as const
            )
              .map(
                (f) => `
              <button
                data-layer-filter="${f.id}"
                class="py-1 px-1 rounded-md text-[10px] font-medium transition-colors truncate ${
                  this.layerFilter === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }"
              >
                ${f.label}
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Scrollable Layer Stack -->
        <div class="flex-1 overflow-y-auto pr-0.5 space-y-1.5 min-h-0">
          ${
            filtered.length === 0
              ? `<div class="p-6 text-center text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
                  ${
                    totalCount === 0
                      ? 'This page has no elements yet. Drag shapes, text, or photos onto the canvas.'
                      : 'No layers match your current filter.'
                  }
                </div>`
              : filtered
                  .map(({ el, zOrderFromTop, isTopMost, isBottomMost }) => {
                    const isSel = this.selectedElementIds.includes(el.id);
                    const swatchColor =
                      el.type === 'text'
                        ? el.color || '#f8fafc'
                        : el.fill || el.stroke || '#6366f1';
                    const displayTitle =
                      el.type === 'text' ? el.text || el.name : el.name;

                    return `
                      <div
                        draggable="true"
                        data-layer-drag-id="${el.id}"
                        data-layer-select="${el.id}"
                        class="group rounded-xl border p-2 transition-all cursor-pointer ${
                          isSel
                            ? 'bg-indigo-600/20 border-indigo-500 shadow-xs'
                            : el.hidden
                            ? 'bg-slate-900/40 border-slate-800/70 opacity-65 hover:opacity-100'
                            : 'bg-slate-800/65 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                        }"
                      >
                        <!-- Top Row: Drag Grip, Swatch/Thumb, Name & Status Badges -->
                        <div class="flex items-center justify-between gap-2">
                          <div class="flex items-center gap-1.5 min-w-0 flex-1">
                            <span class="text-slate-500 group-hover:text-slate-300 cursor-grab shrink-0" title="Drag to reorder layer">${ICONS.grip}</span>
                            <span
                              class="w-3.5 h-3.5 rounded-xs border border-white/25 shrink-0"
                              style="background: ${el.fillGradient ? el.fillGradient : swatchColor};"
                            ></span>
                            <span class="text-[9px] font-mono-tabular uppercase px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 shrink-0">
                              ${el.groupId ? 'GRP' : el.type}
                            </span>
                            <span class="text-xs font-medium text-slate-100 truncate" title="${this.escapeHtml(displayTitle)}">
                              ${this.escapeHtml(displayTitle)}
                            </span>
                          </div>
                          <span class="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-slate-950/90 text-slate-400 shrink-0" title="Z-Order Position">
                            #${zOrderFromTop}${isTopMost ? ' Front' : isBottomMost ? ' Back' : ''}
                          </span>
                        </div>

                        <!-- Bottom Row: Reorder (Bring to Front, Up, Down, Send to Back) + Visibility + Lock + Delete -->
                        <div class="flex items-center justify-between gap-1 mt-2 pt-1.5 border-t border-slate-800/80">
                          <div class="flex items-center gap-0.5">
                            <button
                              data-layer-top="${el.id}"
                              ${isTopMost ? 'disabled' : ''}
                              class="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 ${
                                isTopMost
                                  ? 'text-slate-600 cursor-not-allowed'
                                  : 'bg-slate-900/90 text-slate-300 hover:bg-indigo-600 hover:text-white'
                              }"
                              title="Bring to Front"
                            >
                              ${ICONS.bringToFront}
                              <span>Front</span>
                            </button>
                            <button
                              data-layer-up="${el.id}"
                              ${isTopMost ? 'disabled' : ''}
                              class="p-1 rounded ${
                                isTopMost
                                  ? 'text-slate-600 cursor-not-allowed'
                                  : 'bg-slate-900/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                              }"
                              title="Bring Forward One Step"
                            >
                              ${ICONS.up}
                            </button>
                            <button
                              data-layer-down="${el.id}"
                              ${isBottomMost ? 'disabled' : ''}
                              class="p-1 rounded ${
                                isBottomMost
                                  ? 'text-slate-600 cursor-not-allowed'
                                  : 'bg-slate-900/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                              }"
                              title="Send Backward One Step"
                            >
                              ${ICONS.down}
                            </button>
                            <button
                              data-layer-bottom="${el.id}"
                              ${isBottomMost ? 'disabled' : ''}
                              class="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 ${
                                isBottomMost
                                  ? 'text-slate-600 cursor-not-allowed'
                                  : 'bg-slate-900/90 text-slate-300 hover:bg-indigo-600 hover:text-white'
                              }"
                              title="Send to Back"
                            >
                              ${ICONS.sendToBack}
                              <span>Back</span>
                            </button>
                          </div>

                          <div class="flex items-center gap-1">
                            <button
                              data-layer-vis="${el.id}"
                              class="px-1.5 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 transition-colors ${
                                el.hidden
                                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
                              }"
                              title="${el.hidden ? 'Show Layer on Canvas' : 'Hide Layer on Canvas'}"
                            >
                              ${el.hidden ? ICONS.eyeOff : ICONS.eye}
                              <span>${el.hidden ? 'Hidden' : 'Visible'}</span>
                            </button>
                            <button
                              data-layer-lock="${el.id}"
                              class="px-1.5 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 transition-colors ${
                                el.locked
                                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
                              }"
                              title="${el.locked ? 'Unlock Layer' : 'Lock Layer Position & Edits'}"
                            >
                              ${el.locked ? ICONS.lock : ICONS.unlock}
                              <span>${el.locked ? 'Locked' : 'Lock'}</span>
                            </button>
                            <button
                              data-layer-del="${el.id}"
                              class="p-1 rounded bg-slate-900/90 text-slate-400 hover:bg-rose-600 hover:text-white transition-colors"
                              title="Delete Layer"
                            >
                              ${ICONS.trash}
                            </button>
                          </div>
                        </div>
                      </div>
                    `;
                  })
                  .join('')
          }
        </div>
      </div>
    `;
  }

  // ============================================================================
  // RIGHT-CLICK CONTEXT MENU & FULLSCREEN PRESENTATION MODE
  // ============================================================================

  private renderContextMenu(): string {
    if (!this.contextMenu) return '';
    const el = this.contextMenu.targetElementId
      ? this.activePage.elements.find((e) => e.id === this.contextMenu?.targetElementId)
      : null;

    const menuWidth = 248;
    const menuHeight = el ? 420 : 140;
    const left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, this.contextMenu.x));
    const top = Math.max(12, Math.min(window.innerHeight - menuHeight - 12, this.contextMenu.y));

    const list = this.activePage.elements;
    const totalLayers = list.length;
    const elIndex = el ? list.findIndex((item) => item.id === el.id) : -1;

    // Determine whether the target element (or active multi-selection) can move forward/backward in Z-order
    const movingIds = new Set<string>();
    if (el) {
      if (this.selectedElementIds.includes(el.id) && this.selectedElementIds.length > 1) {
        this.selectedElementIds.forEach((id) => movingIds.add(id));
      } else if (el.groupId) {
        list.filter((item) => item.groupId === el.groupId).forEach((g) => movingIds.add(g.id));
      } else {
        movingIds.add(el.id);
      }
    }
    const selectedIndices = list
      .map((item, idx) => (movingIds.has(item.id) ? idx : -1))
      .filter((idx) => idx >= 0);
    const minIdx = selectedIndices.length ? Math.min(...selectedIndices) : 0;
    const maxIdx = selectedIndices.length ? Math.max(...selectedIndices) : 0;

    const canBringToFront = el ? !(maxIdx === totalLayers - 1 && minIdx === totalLayers - movingIds.size) : false;
    const canMoveForward = el ? maxIdx < totalLayers - 1 : false;
    const canMoveBackward = el ? minIdx > 0 : false;
    const canSendToBack = el ? !(minIdx === 0 && maxIdx === movingIds.size - 1) : false;

    const zStackBadge =
      el && elIndex >= 0
        ? movingIds.size > 1
          ? `Z-Index ${minIdx + 1}–${maxIdx + 1} of ${totalLayers}`
          : `Z-Index ${elIndex + 1} of ${totalLayers}`
        : '';

    return `
      <div
        id="studio-context-menu"
        role="menu"
        aria-label="Canvas Context Menu"
        class="fixed z-50 w-60 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/90 shadow-2xl py-1.5 text-xs text-slate-200 select-none"
        style="left: ${left}px; top: ${top}px;"
      >
        ${
          el
            ? `
          <div class="px-3.5 py-1.5 border-b border-slate-800/90 flex items-center justify-between gap-2 bg-slate-950/50">
            <span class="font-semibold text-white truncate" title="${this.escapeHtml(el.name)}">
              ${
                movingIds.size > 1
                  ? `${movingIds.size} Selected Layers`
                  : this.escapeHtml(el.name)
              }
            </span>
            <span class="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-mono-tabular text-indigo-300 shrink-0">
              ${zStackBadge}
            </span>
          </div>

          <!-- Z-Index Layer Stacking Section -->
          <div class="px-3.5 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Layer Stacking (Z-Index)
          </div>
          <button
            id="ctx-bring-to-front"
            data-ctx-action="bring-to-front"
            ${!canBringToFront ? 'disabled' : ''}
            class="w-full px-3.5 py-1.5 text-left flex items-center justify-between transition ${
              canBringToFront
                ? 'hover:bg-indigo-600 hover:text-white text-slate-100'
                : 'text-slate-600 cursor-not-allowed'
            }"
          >
            <span class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7"/><path d="M5 4h14"/>
              </svg>
              <span>Bring to Front</span>
            </span>
            <span class="font-mono-tabular text-[10px] opacity-75">Ctrl+]</span>
          </button>

          <button
            id="ctx-move-forward"
            data-ctx-action="move-forward"
            ${!canMoveForward ? 'disabled' : ''}
            class="w-full px-3.5 py-1.5 text-left flex items-center justify-between transition ${
              canMoveForward
                ? 'hover:bg-indigo-600 hover:text-white text-slate-100'
                : 'text-slate-600 cursor-not-allowed'
            }"
          >
            <span class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              <span>Move Forward</span>
            </span>
            <span class="font-mono-tabular text-[10px] opacity-75">]</span>
          </button>

          <button
            id="ctx-move-backward"
            data-ctx-action="move-backward"
            ${!canMoveBackward ? 'disabled' : ''}
            class="w-full px-3.5 py-1.5 text-left flex items-center justify-between transition ${
              canMoveBackward
                ? 'hover:bg-indigo-600 hover:text-white text-slate-100'
                : 'text-slate-600 cursor-not-allowed'
            }"
          >
            <span class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
              <span>Move Backward</span>
            </span>
            <span class="font-mono-tabular text-[10px] opacity-75">[</span>
          </button>

          <button
            id="ctx-send-to-back"
            data-ctx-action="send-to-back"
            ${!canSendToBack ? 'disabled' : ''}
            class="w-full px-3.5 py-1.5 text-left flex items-center justify-between transition ${
              canSendToBack
                ? 'hover:bg-indigo-600 hover:text-white text-slate-100'
                : 'text-slate-600 cursor-not-allowed'
            }"
          >
            <span class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12l7 7 7-7"/><path d="M5 20h14"/>
              </svg>
              <span>Send to Back</span>
            </span>
            <span class="font-mono-tabular text-[10px] opacity-75">Ctrl+[</span>
          </button>

          <div class="my-1 border-t border-slate-800"></div>

          <button data-ctx-action="copy" class="w-full px-3.5 py-1.5 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between">
            <span>Copy</span><span class="font-mono-tabular text-[10px] opacity-70">Ctrl+C</span>
          </button>
          <button data-ctx-action="duplicate" class="w-full px-3.5 py-1.5 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between">
            <span>Duplicate</span><span class="font-mono-tabular text-[10px] opacity-70">Ctrl+D</span>
          </button>
          <button data-ctx-action="copy-style" class="w-full px-3.5 py-1.5 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between">
            <span>Copy Style</span><span class="font-mono-tabular text-[10px] opacity-70">Style</span>
          </button>
          ${
            this.copiedStyle
              ? `<button data-ctx-action="paste-style" class="w-full px-3.5 py-1.5 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between">
                  <span>Paste Style</span><span class="font-mono-tabular text-[10px] text-indigo-300">Apply</span>
                </button>`
              : ''
          }
          ${
            this.selectedElementIds.length > 1 || el.groupId
              ? `<div class="my-1 border-t border-slate-800"></div>`
              : ''
          }
          ${
            this.selectedElementIds.length > 1
              ? `<button data-ctx-action="group" class="w-full px-3.5 py-1.5 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between">
                  <span>Group Selected</span><span class="font-mono-tabular text-[10px] opacity-70">Ctrl+G</span>
                </button>`
              : ''
          }
          ${
            el.groupId
              ? `<button data-ctx-action="ungroup" class="w-full px-3.5 py-1.5 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between">
                  <span>Ungroup</span><span class="font-mono-tabular text-[10px] opacity-70">Ctrl+Shift+G</span>
                </button>`
              : ''
          }
          <button data-ctx-action="lock" class="w-full px-3.5 py-1.5 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between">
            <span>${el.locked ? 'Unlock Layer' : 'Lock Layer'}</span>
            <span class="font-mono-tabular text-[10px] opacity-70">Ctrl+L</span>
          </button>
          <div class="my-1 border-t border-slate-800"></div>
          <button data-ctx-action="delete" class="w-full px-3.5 py-1.5 text-left text-rose-400 hover:bg-rose-600 hover:text-white flex items-center justify-between">
            <span>Delete</span><span class="font-mono-tabular text-[10px] opacity-70">Delete</span>
          </button>
        `
            : `
          <div class="px-3.5 py-1 border-b border-slate-800/90 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Canvas Actions
          </div>
          <button data-ctx-action="paste" ${!this.clipboardElement ? 'disabled' : ''} class="w-full px-3.5 py-1.5 text-left ${
                this.clipboardElement
                  ? 'hover:bg-indigo-600 hover:text-white'
                  : 'text-slate-600 cursor-not-allowed'
              } flex items-center justify-between">
            <span>Paste Layer</span><span class="font-mono-tabular text-[10px] opacity-70">Ctrl+V</span>
          </button>
          <button data-ctx-action="select-all" class="w-full px-3.5 py-1.5 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between">
            <span>Select All Layers on Page</span><span class="font-mono-tabular text-[10px] opacity-70">Ctrl+A</span>
          </button>
        `
        }
      </div>
    `;
  }

  private renderPresentationOverlay(): string {
    if (!this.isPresenting) return '';
    const W = this.activeProject.width;
    const H = this.activeProject.height;
    const scale = Math.min((window.innerWidth - 80) / W, (window.innerHeight - 160) / H);
    const elapsedSec = this.presStartTime ? Math.floor((Date.now() - this.presStartTime) / 1000) : 0;
    const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const secs = String(elapsedSec % 60).padStart(2, '0');

    return `
      <div id="presentation-overlay" class="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-6 select-none ${
        this.laserActive ? 'cursor-none' : ''
      }">
        <div class="w-full flex items-center justify-between text-xs text-slate-400 px-4">
          <div class="flex items-center gap-3">
            <span class="font-bold text-white font-display">${this.escapeHtml(this.activeProject.name)}</span>
            <span>·</span>
            <span class="font-mono-tabular text-indigo-400">Slide ${this.activePageIndex + 1} of ${
      this.activeProject.pages.length
    } (${this.escapeHtml(this.activePage.title)})</span>
            <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono-tabular text-emerald-400">Timer ${mins}:${secs}</span>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-pres-laser" class="px-3 py-1.5 rounded-lg border text-xs font-medium ${
              this.laserActive
                ? 'bg-rose-600 border-rose-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }">
              Laser Pointer (L)
            </button>
            <button id="btn-pres-exit" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-medium">
              Exit Presentation (Esc)
            </button>
          </div>
        </div>

        <div class="flex-1 flex items-center justify-center w-full overflow-hidden">
          ${this.renderArtboardMarkup(scale, true)}
        </div>

        <div class="w-full max-w-4xl flex flex-col items-center gap-2">
          ${
            this.activePage.speakerNotes
              ? `<div class="w-full px-4 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 text-center">
                  <span class="text-indigo-400 font-semibold mr-2">Speaker Notes:</span>${this.escapeHtml(this.activePage.speakerNotes)}
                </div>`
              : ''
          }
          <div class="flex items-center gap-3">
            <button id="btn-pres-prev" ${
              this.activePageIndex <= 0 ? 'disabled' : ''
            } class="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold ${
      this.activePageIndex <= 0 ? 'text-slate-600 cursor-not-allowed' : 'text-white hover:bg-slate-800'
    }">← Previous</button>
            <span class="text-xs font-mono-tabular text-slate-400">${this.activePageIndex + 1} / ${
      this.activeProject.pages.length
    }</span>
            <button id="btn-pres-next" ${
              this.activePageIndex >= this.activeProject.pages.length - 1 ? 'disabled' : ''
            } class="px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold ${
      this.activePageIndex >= this.activeProject.pages.length - 1
        ? 'opacity-40 cursor-not-allowed text-white'
        : 'text-white hover:bg-indigo-500'
    }">Next Slide →</button>
          </div>
        </div>

        ${
          this.laserActive && this.laserPos
            ? `<div class="fixed pointer-events-none z-50 w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 shadow-[0_0_20px_8px_rgba(244,63,94,0.85)] ring-2 ring-white" style="left: ${this.laserPos.x}px; top: ${this.laserPos.y}px;"></div>`
            : ''
        }
      </div>
    `;
  }

  // ============================================================================
  // SECONDARY VIEWS: TEMPLATE GALLERY, PROJECTS HUB, BRAND KIT
  // ============================================================================

  private renderTemplatesGalleryView(): string {
    return `
      <main class="flex-1 overflow-y-auto p-8 bg-slate-950">
        <div class="max-w-6xl mx-auto space-y-8">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <h1 class="text-3xl font-bold text-white tracking-tight font-display">Curated Design Templates</h1>
              <p class="text-sm text-slate-400 mt-1">Start from a studio-crafted layout or configure custom artboard dimensions</p>
            </div>
            <button id="btn-custom-size-hero" class="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white whitespace-nowrap shrink-0">
              Custom Artboard Size
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            ${TEMPLATE_PRESETS.map(
              (tpl) => `
              <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between gap-4 hover:border-indigo-500/60 transition-colors">
                <div>
                  <div class="h-48 rounded-lg p-6 flex flex-col justify-between border border-white/10 mb-4" style="${
                    tpl.backgroundGradient
                      ? `background: ${tpl.backgroundGradient};`
                      : `background-color: ${tpl.background};`
                  }">
                    <div class="text-xs font-mono-tabular ${
                      tpl.background === '#ffffff' || tpl.background === '#fffbeb'
                        ? 'text-slate-700'
                        : 'text-indigo-300'
                    }">${this.escapeHtml(tpl.category)} · ${this.escapeHtml(tpl.dimensionsLabel)} · ${tpl.elements.length} Layers</div>
                    <h3 class="text-2xl font-bold font-display ${
                      tpl.background === '#ffffff' || tpl.background === '#fffbeb'
                        ? 'text-slate-900'
                        : 'text-white'
                    }">${this.escapeHtml(tpl.name)}</h3>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <button data-new-from-tpl="${tpl.id}" class="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors whitespace-nowrap">
                    Create New Project
                  </button>
                  <button data-apply-tpl="${tpl.id}" class="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap">
                    Apply to Current Page
                  </button>
                </div>
              </div>
            `
            ).join('')}
          </div>
        </div>
      </main>
    `;
  }

  private renderProjectsHubView(): string {
    return `
      <main class="flex-1 overflow-y-auto p-8 bg-slate-950">
        <div class="max-w-6xl mx-auto space-y-8">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <h1 class="text-3xl font-bold text-white tracking-tight font-display">Saved Browser Projects</h1>
              <p class="text-sm text-slate-400 mt-1">All designs are stored automatically in your browser's LocalStorage (${this.getStorageUsageKb()} used) with zero account login required.</p>
            </div>
            <div class="flex items-center gap-3">
              <button id="btn-create-blank-project" class="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white whitespace-nowrap shrink-0">
                + New Blank Design
              </button>
              <button id="btn-reset-demo-storage" class="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 whitespace-nowrap shrink-0">
                Reset Demo Workspace
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${this.projects
              .map((proj) => {
                const isCurrent = proj.id === this.activeProject.id;
                const firstPage = proj.pages[0];
                const dateStr = new Date(proj.updatedAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return `
                  <div class="rounded-xl border ${
                    isCurrent ? 'border-indigo-500 bg-slate-900' : 'border-slate-800 bg-slate-900/60'
                  } p-4 flex flex-col justify-between gap-4">
                    <div>
                      <div class="h-36 rounded-lg p-4 flex flex-col justify-between border border-white/10 mb-3" style="${
                        firstPage?.backgroundGradient
                          ? `background: ${firstPage.backgroundGradient};`
                          : `background-color: ${firstPage?.background || '#0f172a'};`
                      }">
                        <span class="text-[11px] font-mono-tabular px-2 py-0.5 rounded bg-slate-950/70 text-slate-200 self-start">${proj.width} × ${proj.height} px</span>
                        <span class="text-xs font-mono-tabular px-2 py-0.5 rounded bg-slate-950/70 text-indigo-300 self-end">${proj.pages.length} ${proj.pages.length === 1 ? 'Page' : 'Pages'}</span>
                      </div>
                      <h3 class="text-base font-bold text-white truncate">${this.escapeHtml(proj.name)}</h3>
                      <p class="text-xs text-slate-400 font-mono-tabular mt-0.5">Edited ${dateStr} · ${this.escapeHtml(proj.category)}</p>
                    </div>

                    <div class="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button data-open-proj="${proj.id}" class="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
                        ${isCurrent ? 'Resume Editing' : 'Open in Studio'}
                      </button>
                      <button data-dup-proj="${proj.id}" class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300" title="Duplicate Project">
                        ${ICONS.duplicate}
                      </button>
                      ${
                        this.projects.length > 1
                          ? `<button data-del-proj="${proj.id}" class="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300" title="Delete Project">${ICONS.trash}</button>`
                          : ''
                      }
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      </main>
    `;
  }

  private renderBrandKitView(): string {
    return `
      <main class="flex-1 overflow-y-auto p-8 bg-slate-950">
        <div class="max-w-4xl mx-auto space-y-8">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <h1 class="text-3xl font-bold text-white tracking-tight font-display">Studio Brand Kit</h1>
              <p class="text-sm text-slate-400 mt-1">Configure your persistent brand palette and typography in LocalStorage and apply them with one click.</p>
            </div>
            <button id="btn-apply-brand-to-page" class="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white whitespace-nowrap shrink-0">
              Apply Brand Kit to Active Page
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="p-6 rounded-xl border border-slate-800 bg-slate-900/70 space-y-4">
              <h2 class="text-base font-bold text-white">Identity & Typography</h2>
              <div>
                <label class="block text-xs text-slate-400 mb-1">Studio / Organization Name</label>
                <input type="text" id="brand-name-input" value="${this.escapeHtml(this.brandKit.brandName)}" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1">Display / Heading Font</label>
                <select id="brand-primary-font" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
                  ${STUDIO_FONTS.map(
                    (f) => `<option value="${f.value}" ${this.brandKit.primaryFont === f.value ? 'selected' : ''}>${f.label}</option>`
                  ).join('')}
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1">Body / Secondary Font</label>
                <select id="brand-secondary-font" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
                  ${STUDIO_FONTS.map(
                    (f) => `<option value="${f.value}" ${this.brandKit.secondaryFont === f.value ? 'selected' : ''}>${f.label}</option>`
                  ).join('')}
                </select>
              </div>
            </div>

            <div class="p-6 rounded-xl border border-slate-800 bg-slate-900/70 space-y-4">
              <h2 class="text-base font-bold text-white">Brand Color Swatches</h2>
              <p class="text-xs text-slate-400">Click any swatch below to customize its hex value:</p>
              <div class="grid grid-cols-3 gap-3">
                ${this.brandKit.colors
                  .map(
                    (c, idx) => `
                  <label class="p-2.5 rounded-lg border border-slate-700 bg-slate-800/80 flex items-center gap-2.5 cursor-pointer hover:border-indigo-500">
                    <span class="w-7 h-7 rounded-md border border-white/20 shrink-0" style="background: ${c};"></span>
                    <span class="text-xs font-mono-tabular text-slate-200 uppercase">${c}</span>
                    <input type="color" data-brand-color-idx="${idx}" value="${c}" class="sr-only" />
                  </label>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </main>
    `;
  }

  // ============================================================================
  // MODALS (EXPORT & RESIZE ARTBOARD)
  // ============================================================================

  private renderModals(): string {
    if (this.showGridViewModal) {
      return `
        <div class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-6">
          <div class="w-full max-w-4xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-bold text-white font-display">Slide Deck Grid Overview (${this.activeProject.pages.length} Pages)</h3>
                <p class="text-xs text-slate-400">Click any slide to jump, reorder slides, or manage transitions</p>
              </div>
              <button id="btn-close-grid-view" class="p-1 text-slate-400 hover:text-white">${ICONS.close}</button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto p-1">
              ${this.activeProject.pages
                .map(
                  (p, idx) => `
                <div class="rounded-xl border ${
                  idx === this.activePageIndex ? 'border-indigo-500 bg-slate-800/90' : 'border-slate-800 bg-slate-950/70'
                } p-3 flex flex-col justify-between gap-3">
                  <div
                    data-grid-jump-page="${idx}"
                    class="h-32 rounded-lg p-3 flex flex-col justify-between border border-white/10 cursor-pointer"
                    style="${p.backgroundGradient ? `background:${p.backgroundGradient};` : `background-color:${p.background};`}"
                  >
                    <span class="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-slate-950/75 text-white self-start">Slide ${idx + 1}</span>
                    <span class="text-xs font-bold text-white drop-shadow truncate">${this.escapeHtml(p.title)} (${p.elements.length} layers)</span>
                  </div>
                  <div class="flex items-center justify-between gap-1">
                    <button data-grid-move-left="${idx}" ${idx === 0 ? 'disabled' : ''} class="px-2 py-1 rounded bg-slate-800 text-xs ${idx === 0 ? 'text-slate-600' : 'text-slate-200 hover:bg-slate-700'}">← Move</button>
                    <span class="text-[11px] font-mono-tabular text-indigo-300">${p.transition || 'none'}</span>
                    <button data-grid-move-right="${idx}" ${idx === this.activeProject.pages.length - 1 ? 'disabled' : ''} class="px-2 py-1 rounded bg-slate-800 text-xs ${idx === this.activeProject.pages.length - 1 ? 'text-slate-600' : 'text-slate-200 hover:bg-slate-700'}">Move →</button>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (this.showExportModal) {
      const outW = Math.round(this.activeProject.width * this.exportScale);
      const outH = Math.round(this.activeProject.height * this.exportScale);
      const defaultBaseName = `${this.activeProject.name || 'design'}-${this.activePage.title || 'page-1'}`
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const currentFileName = this.exportCustomFilename || defaultBaseName;
      const svgMarkupPreview = generateNativePageSvg(this.activeProject, this.activePage, {
        scale: 1,
        transparentBackground: this.exportTransparentBg,
      });
      const svgPreviewDataUrl =
        'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkupPreview);
      const visibleLayerCount = this.activePage.elements.filter((e) => !e.hidden).length;

      return `
        <div
          id="studio-export-modal"
          class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div class="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <!-- Modal Header -->
            <div class="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 class="text-lg font-bold text-white font-display">
                  Export Canvas Composition (PNG / SVG)
                </h3>
                <p class="text-xs text-slate-400">
                  Save <strong class="text-slate-200">${this.escapeHtml(
                    this.activeProject.name
                  )} · ${this.escapeHtml(
        this.activePage.title
      )}</strong> (${visibleLayerCount} visible ${
        visibleLayerCount === 1 ? 'layer' : 'layers'
      }) as a high-resolution PNG or scalable Vector SVG file.
                </p>
              </div>
              <button id="btn-close-export" class="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                ${ICONS.close}
              </button>
            </div>

            <!-- Main Two-Column Body: Left Live Preview, Right Format & Settings -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              <!-- Live Canvas Composition Preview -->
              <div class="md:col-span-5 flex flex-col gap-2">
                <div class="flex items-center justify-between text-[11px] text-slate-400">
                  <span class="font-semibold uppercase tracking-wider">Live Export Preview</span>
                  <span class="font-mono-tabular text-indigo-300">${outW} × ${outH} px</span>
                </div>
                <div
                  class="relative w-full aspect-square rounded-xl border border-slate-700/80 overflow-hidden flex items-center justify-center p-3"
                  style="${
                    this.exportTransparentBg
                      ? 'background-image: linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%); background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0; background-color: #0f172a;'
                      : 'background-color: #090d16;'
                  }"
                >
                  <img
                    src="${svgPreviewDataUrl}"
                    alt="Canvas Export Preview"
                    class="max-w-full max-h-full object-contain rounded shadow-lg ring-1 ring-white/10"
                  />
                  <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono-tabular uppercase text-sky-300">
                    .${this.exportFormat.toUpperCase()} · ${this.exportScale}x
                  </span>
                </div>
              </div>

              <!-- Format Tabs, Scale, Transparency & Filename -->
              <div class="md:col-span-7 space-y-4">
                <!-- Format Selector Tabs (PNG vs SVG) -->
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Image File Format
                  </label>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      id="tab-export-png"
                      data-export-format="png"
                      class="p-2.5 rounded-xl border text-left transition-all ${
                        this.exportFormat === 'png'
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-xs'
                          : 'bg-slate-800/70 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }"
                    >
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold">PNG Image (.png)</span>
                        <span class="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">Lossless</span>
                      </div>
                      <p class="text-[11px] text-slate-400 mt-0.5">
                        Crisp raster graphics with optional alpha transparency.
                      </p>
                    </button>

                    <button
                      id="tab-export-svg"
                      data-export-format="svg"
                      class="p-2.5 rounded-xl border text-left transition-all ${
                        this.exportFormat === 'svg'
                          ? 'bg-sky-600/20 border-sky-500 text-white shadow-xs'
                          : 'bg-slate-800/70 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }"
                    >
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold">SVG Vector (.svg)</span>
                        <span class="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">Scalable</span>
                      </div>
                      <p class="text-[11px] text-slate-400 mt-0.5">
                        Pure XML vector paths, shapes & editable typography.
                      </p>
                    </button>
                  </div>
                </div>

                <!-- Resolution Scale Multiplier (1x, 2x, 3x) -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Output Resolution Scale
                    </label>
                    <span class="text-xs font-mono-tabular text-slate-300">${outW} × ${outH} px</span>
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    ${([1, 2, 3] as const)
                      .map(
                        (sc) => `
                      <button
                        data-export-scale="${sc}"
                        class="py-1.5 px-2.5 rounded-lg border text-xs font-semibold font-mono-tabular transition-colors ${
                          this.exportScale === sc
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }"
                      >
                        ${sc}x (${this.activeProject.width * sc}×${this.activeProject.height * sc})
                      </button>
                    `
                      )
                      .join('')}
                  </div>
                </div>

                <!-- Transparent Background Option & Custom File Name -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label class="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      id="export-transparent-bg"
                      ${this.exportTransparentBg ? 'checked' : ''}
                      class="accent-indigo-500 rounded"
                    />
                    <span>Transparent Backdrop</span>
                  </label>

                  <div class="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5">
                    <input
                      type="text"
                      id="export-filename-input"
                      value="${this.escapeHtml(currentFileName)}"
                      placeholder="file-name"
                      class="bg-transparent text-xs text-white focus:outline-none w-full font-mono-tabular"
                      title="Custom Export File Name"
                    />
                    <span class="text-xs font-mono-tabular text-slate-400 shrink-0">.${this.exportFormat}</span>
                  </div>
                </div>

                ${
                  this.exportFormat === 'svg'
                    ? `
                  <!-- SVG Vector Source Inspector & Copy -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                        Generated SVG Vector Code (${Math.max(1, Math.round(svgMarkupPreview.length / 1024))} KB)
                      </span>
                      <button
                        id="btn-copy-svg-code"
                        class="px-2 py-0.5 rounded bg-sky-600/20 hover:bg-sky-600 border border-sky-500/40 text-[11px] font-semibold text-sky-300 hover:text-white transition-colors"
                      >
                        Copy SVG Markup
                      </button>
                    </div>
                    <textarea
                      id="export-svg-code-preview"
                      readonly
                      class="w-full h-20 p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono-tabular text-[10px] text-slate-300 focus:outline-none resize-none"
                    >${this.escapeHtml(svgMarkupPreview)}</textarea>
                  </div>
                `
                    : ''
                }

                <!-- Primary Download Button for Active Format -->
                <button
                  id="btn-export-primary-download"
                  class="w-full py-2.5 px-4 rounded-xl ${
                    this.exportFormat === 'svg'
                      ? 'bg-sky-600 hover:bg-sky-500'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  } text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
                >
                  ${ICONS.download}
                  <span>
                    Download ${this.exportFormat.toUpperCase()} File (${currentFileName}.${this.exportFormat})
                  </span>
                </button>
              </div>
            </div>

            <!-- Direct 1-Click Export Presets (PNG 1x, PNG 2x, Vector SVG, JPG, PDF w/ Crop Marks, Storyboard Sheet, Video, JSON) -->
            <div class="pt-3 border-t border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Direct 1-Click Downloads & Print Production
                </span>
                <label class="flex items-center gap-1.5 text-xs text-rose-300 cursor-pointer" title="Include Printer Trim Marks, Registration Targets & Bleed Box on PDF & Storyboard Exports">
                  <input
                    type="checkbox"
                    id="export-crop-marks"
                    ${this.exportIncludeCropMarks ? 'checked' : ''}
                    class="accent-rose-500 rounded"
                  />
                  <span>Include Print Crop Marks & Bleed</span>
                </label>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  id="btn-export-png-1x"
                  class="py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/50 text-indigo-200 hover:text-white text-xs font-semibold flex items-center justify-between transition-colors"
                >
                  <span>Save PNG (1x)</span>
                  <span class="font-mono-tabular text-[11px] opacity-80">${this.activeProject.width}×${this.activeProject.height}</span>
                </button>
                <button
                  id="btn-export-png-2x"
                  class="py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/50 text-indigo-200 hover:text-white text-xs font-semibold flex items-center justify-between transition-colors"
                >
                  <span>Save PNG (2x)</span>
                  <span class="font-mono-tabular text-[11px] opacity-80">${this.activeProject.width * 2}×${this.activeProject.height * 2}</span>
                </button>
                <button
                  id="btn-export-svg"
                  class="py-2 px-3 rounded-lg bg-sky-600/20 hover:bg-sky-600 border border-sky-500/50 text-sky-200 hover:text-white text-xs font-semibold flex items-center justify-between transition-colors"
                >
                  <span>Save Vector (.SVG)</span>
                  <span class="font-mono-tabular text-[11px] opacity-80">Scalable</span>
                </button>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                <button id="btn-export-jpg" class="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center justify-between transition-colors">
                  <span>JPG Image</span>
                  <span class="font-mono-tabular text-slate-400">94%</span>
                </button>
                <button id="btn-export-pdf" class="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-[11px] font-medium flex items-center justify-between transition-colors">
                  <span>Print PDF</span>
                  <span class="font-mono-tabular">${this.activeProject.pages.length}p</span>
                </button>
                <button id="btn-export-storyboard" class="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-[11px] font-medium flex items-center justify-between transition-colors" title="Export all pages arranged on a single high-res Storyboard Contact Sheet PNG">
                  <span>Storyboard</span>
                  <span class="font-mono-tabular">Sheet</span>
                </button>
                <button id="btn-export-video" class="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-fuchsia-300 text-[11px] font-medium flex items-center justify-between transition-colors">
                  <span>Motion .WEBM</span>
                  <span class="font-mono-tabular">30fps</span>
                </button>
                <button id="btn-export-json" class="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-[11px] font-medium flex items-center justify-between transition-colors">
                  <span>Backup JSON</span>
                  <span class="font-mono-tabular">.json</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.showResizeModal) {
      const presets = [
        { label: 'Instagram Square Post', w: 1080, h: 1080 },
        { label: 'Presentation Deck (16:9)', w: 1920, h: 1080 },
        { label: 'Exhibition Poster (4:5)', w: 1080, h: 1350 },
        { label: 'YouTube Thumbnail', w: 1280, h: 720 },
        { label: 'Social Story / Reel (9:16)', w: 1080, h: 1920 },
      ];
      return `
        <div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold text-white font-display">Smart Magic Resize</h3>
              <button id="btn-close-resize" class="p-1 text-slate-400 hover:text-white">${ICONS.close}</button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-slate-400 mb-1">Width (px)</label>
                <input type="number" id="resize-width-input" value="${this.activeProject.width}" min="200" max="4000" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono-tabular text-white" />
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1">Height (px)</label>
                <input type="number" id="resize-height-input" value="${this.activeProject.height}" min="200" max="4000" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono-tabular text-white" />
              </div>
            </div>

            <label class="flex items-center gap-2.5 p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 cursor-pointer">
              <input type="checkbox" id="resize-magic-scale" ${this.magicResizeScaleElements ? 'checked' : ''} class="accent-indigo-500 rounded" />
              <span><strong>Magic Proportional Scale:</strong> Automatically reflow & scale all layers, typography, and strokes to fit new aspect ratio</span>
            </label>

            <div class="space-y-1.5">
              <span class="block text-xs text-slate-400">Standard Studio Formats</span>
              ${presets
                .map(
                  (p) => `
                <button data-resize-preset="${p.w}x${p.h}" class="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-between text-xs text-slate-200">
                  <span>${p.label}</span>
                  <span class="font-mono-tabular text-slate-400">${p.w} × ${p.h} px</span>
                </button>
              `
                )
                .join('')}
            </div>

            <div class="flex gap-2">
              <button id="btn-apply-resize" class="flex-1 py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
                Resize Current Project
              </button>
              <button id="btn-magic-resize-copy" class="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">
                Resize to New Copy
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.showHistoryModal) {
      const canUndo = this.historyIndex > 0;
      const canRedo = this.historyIndex < this.history.length - 1;
      return `
        <div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[82vh]">
            <div class="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 class="text-lg font-bold text-white font-display">Command History Stack</h3>
                <p class="text-xs text-slate-400">
                  Non-destructive time-travel recovery — click any snapshot below to restore your canvas to that exact state.
                </p>
              </div>
              <button id="btn-close-history" class="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">${ICONS.close}</button>
            </div>

            <div class="flex items-center justify-between gap-2 py-3 border-b border-slate-800/80">
              <div class="flex items-center gap-1.5">
                <button
                  id="btn-history-undo"
                  ${!canUndo ? 'disabled' : ''}
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                    canUndo
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
                      : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                  }"
                >
                  ${ICONS.undo}
                  <span>Step Undo (Ctrl+Z)</span>
                </button>
                <button
                  id="btn-history-redo"
                  ${!canRedo ? 'disabled' : ''}
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                    canRedo
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
                      : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                  }"
                >
                  ${ICONS.redo}
                  <span>Step Redo (Ctrl+Y)</span>
                </button>
              </div>
              <button
                id="btn-clear-history"
                class="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-[11px] font-medium text-slate-300 hover:text-rose-200 transition-colors"
                title="Compress history stack to current state"
              >
                Compact Stack
              </button>
            </div>

            <!-- Feature 8: Named Version Checkpoints (Persistent Design Milestones) -->
            <div class="py-3 border-b border-slate-800/80 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Named Version Checkpoints</span>
                <span class="text-[10px] font-mono-tabular text-slate-400">${this.activeProject.checkpoints?.length || 0} saved</span>
              </div>
              <div class="flex gap-2">
                <input
                  type="text"
                  id="checkpoint-name-input"
                  placeholder="e.g. Approved V1 Layout..."
                  class="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  id="btn-save-checkpoint"
                  class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap"
                >
                  + Save Milestone
                </button>
              </div>
              ${
                this.activeProject.checkpoints && this.activeProject.checkpoints.length > 0
                  ? `
                <div class="space-y-1 max-h-28 overflow-y-auto pt-1">
                  ${this.activeProject.checkpoints
                    .map(
                      (cp) => `
                    <div class="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs">
                      <div class="min-w-0">
                        <span class="font-semibold text-emerald-200 truncate">${this.escapeHtml(cp.name)}</span>
                        <span class="text-[10px] font-mono-tabular text-slate-400 ml-2">${new Date(cp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <button data-restore-checkpoint="${cp.id}" class="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white text-[10px] font-semibold">Restore</button>
                        <button data-delete-checkpoint="${cp.id}" class="text-slate-400 hover:text-rose-400 text-xs px-1">×</button>
                      </div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }
            </div>

            <div class="flex-1 overflow-y-auto py-3 space-y-1.5 pr-1">
              ${this.history
                .map((entry, idx) => ({ entry, idx }))
                .reverse()
                .map(({ entry, idx }) => {
                  const isCurrent = idx === this.historyIndex;
                  const isUndone = idx > this.historyIndex;
                  const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  return `
                    <button
                      data-history-jump="${idx}"
                      class="w-full text-left px-3.5 py-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-xs'
                          : isUndone
                          ? 'bg-slate-900/50 border-slate-800/70 text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'
                          : 'bg-slate-950/70 border-slate-800/90 text-slate-200 hover:bg-slate-800/80 hover:border-slate-700'
                      }"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <span class="w-6 h-6 rounded-md text-[11px] font-mono-tabular font-bold flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-indigo-600 text-white'
                            : isUndone
                            ? 'bg-slate-800 text-slate-500'
                            : 'bg-slate-800 text-slate-300'
                        }">
                          ${idx + 1}
                        </span>
                        <div class="min-w-0">
                          <div class="text-xs font-semibold truncate ${isUndone ? 'line-through decoration-slate-600' : ''}">
                            ${this.escapeHtml(entry.label)}
                          </div>
                          <div class="text-[10px] font-mono-tabular text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>${timeStr}</span>
                            <span>•</span>
                            <span>${entry.elementCount} ${entry.elementCount === 1 ? 'layer' : 'layers'}</span>
                            <span>•</span>
                            <span>${entry.width}×${entry.height}</span>
                          </div>
                        </div>
                      </div>
                      <span class="text-[10px] font-mono-tabular px-2 py-0.5 rounded shrink-0 ${
                        isCurrent
                          ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-semibold'
                          : isUndone
                          ? 'bg-amber-500/15 text-amber-300/80 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }">
                        ${isCurrent ? 'Active' : isUndone ? 'Redoable' : 'Restore'}
                      </span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (this.showShortcutsModal) {
      const shortcutSections: Array<{
        title: string;
        items: Array<{
          keys: string[];
          label: string;
          desc: string;
          cmd: string;
        }>;
      }> = [
        {
          title: 'History & Error Recovery',
          items: [
            {
              keys: ['Ctrl', 'Z'],
              label: 'Undo Last Action',
              desc: 'Revert the most recent canvas change in the command stack',
              cmd: 'undo',
            },
            {
              keys: ['Ctrl', 'Y'],
              label: 'Redo Action (or Ctrl+Shift+Z)',
              desc: 'Re-apply a previously undone canvas change',
              cmd: 'redo',
            },
          ],
        },
        {
          title: 'Selection & Deletion',
          items: [
            {
              keys: ['Delete / Backspace'],
              label: 'Delete Selected Elements',
              desc: 'Remove all currently selected unlocked elements from the canvas',
              cmd: 'delete',
            },
            {
              keys: ['Ctrl', 'A'],
              label: 'Select All Canvas Objects',
              desc: 'Select all unlocked, visible objects on the active page',
              cmd: 'select-all',
            },
            {
              keys: ['Esc'],
              label: 'Deselect All / Close Modal',
              desc: 'Clear active selection or exit text/drawing mode',
              cmd: 'deselect',
            },
          ],
        },
        {
          title: 'Clipboard, Duplicate & Grouping',
          items: [
            {
              keys: ['Ctrl', 'D'],
              label: 'Duplicate Selected Element',
              desc: 'Clone the active element with a 28px studio offset',
              cmd: 'duplicate',
            },
            {
              keys: ['Ctrl', 'C'],
              label: 'Copy Selected Element',
              desc: 'Copy the selected element to the studio clipboard',
              cmd: 'copy',
            },
            {
              keys: ['Ctrl', 'X'],
              label: 'Cut Selected Element',
              desc: 'Copy the selected element and remove it from the canvas',
              cmd: 'cut',
            },
            {
              keys: ['Ctrl', 'V'],
              label: 'Paste Element',
              desc: 'Paste the copied element onto the active artboard',
              cmd: 'paste',
            },
            {
              keys: ['Ctrl', 'G'],
              label: 'Group Selected Objects',
              desc: 'Bind 2+ selected objects into a synchronized group',
              cmd: 'group',
            },
            {
              keys: ['Ctrl', 'Shift', 'G'],
              label: 'Ungroup Objects',
              desc: 'Release grouped objects into independent layers',
              cmd: 'ungroup',
            },
          ],
        },
        {
          title: 'Layer Ordering, Lock, Nudge & Viewport',
          items: [
            {
              keys: [']'],
              label: 'Bring Layer Forward',
              desc: 'Move selected element 1 step up in the layer stack',
              cmd: 'layer-up',
            },
            {
              keys: ['['],
              label: 'Send Layer Backward',
              desc: 'Move selected element 1 step down in the layer stack',
              cmd: 'layer-down',
            },
            {
              keys: ['Ctrl', ']'],
              label: 'Bring to Front',
              desc: 'Move selected element to the very top of the canvas',
              cmd: 'layer-top',
            },
            {
              keys: ['Ctrl', '['],
              label: 'Send to Back',
              desc: 'Move selected element to the very bottom of the canvas',
              cmd: 'layer-bottom',
            },
            {
              keys: ['Ctrl', 'L'],
              label: 'Lock / Unlock Selected',
              desc: 'Toggle protection lock on selected canvas elements',
              cmd: 'toggle-lock',
            },
            {
              keys: ['↑ ↓ ← →'],
              label: 'Precision Nudge (Shift for 10px)',
              desc: 'Nudge selected elements by 1px (or 10px with Shift)',
              cmd: 'nudge-right',
            },
            {
              keys: ['Ctrl', 'E'],
              label: 'Open Export (PNG / SVG) Modal',
              desc: 'Export active composition as PNG or Vector SVG',
              cmd: 'export-modal',
            },
          ],
        },
      ];

      return `
        <div
          id="studio-shortcuts-modal"
          class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div class="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[86vh]">
            <div class="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 class="text-lg font-bold text-white font-display">
                  Canvas Keyboard Shortcuts & Quick Actions
                </h3>
                <p class="text-xs text-slate-400">
                  Press any shortcut key directly on the canvas — or click any row below to run the command immediately.
                </p>
              </div>
              <button id="btn-close-shortcuts" class="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                ${ICONS.close}
              </button>
            </div>

            <div class="flex-1 overflow-y-auto py-4 grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
              ${shortcutSections
                .map(
                  (sec) => `
                <div class="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3.5 space-y-2.5">
                  <h4 class="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    ${sec.title}
                  </h4>
                  <div class="space-y-1.5">
                    ${sec.items
                      .map(
                        (item) => `
                      <button
                        data-run-shortcut="${item.cmd}"
                        class="w-full text-left p-2 rounded-lg bg-slate-900/90 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between gap-2 transition-colors group"
                        title="Click to run: ${item.label}"
                      >
                        <div class="min-w-0">
                          <div class="text-xs font-semibold text-slate-100 group-hover:text-white truncate">
                            ${item.label}
                          </div>
                          <div class="text-[10px] text-slate-400 truncate">
                            ${item.desc}
                          </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                          ${item.keys
                            .map(
                              (k) =>
                                `<kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono-tabular font-semibold text-sky-300 shadow-2xs">${k}</kbd>`
                            )
                            .join('<span class="text-slate-600 text-[10px]">+</span>')}
                        </div>
                      </button>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>

            <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Tip: Hold <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono-tabular text-slate-200">Shift</kbd> while clicking or dragging to multi-select or nudge by 10px.</span>
              <button id="btn-done-shortcuts" class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                Got It
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.showBulkCreateModal) {
      const detectedVars = this.detectTemplateVariables();
      return `
        <div
          id="studio-bulk-create-modal"
          class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div class="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 class="text-lg font-bold text-white font-display">
                  Canva Bulk Create · Data-Driven Template Merge
                </h3>
                <p class="text-xs text-slate-400">
                  Bind <code class="text-amber-300">{{Variable}}</code> placeholders on <strong class="text-white">${this.escapeHtml(this.activePage.title)}</strong> to your dataset table and generate personalized pages in one click.
                </p>
              </div>
              <button id="btn-close-bulk-create" class="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                ${ICONS.close}
              </button>
            </div>

            <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
              <div class="text-xs text-slate-300">
                <span class="font-semibold text-amber-300">Detected Placeholders on Active Page:</span>
                ${
                  detectedVars.length > 0
                    ? detectedVars
                        .map(
                          (v) =>
                            `<span class="inline-block ml-1.5 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 font-mono-tabular text-[11px]">{{${this.escapeHtml(v)}}}</span>`
                        )
                        .join('')
                    : `<span class="text-slate-400 ml-1">None yet — click "Insert {{Name}} Template Card" to add merge variables automatically</span>`
                }
              </div>
              <button id="btn-modal-insert-placeholders" class="px-3 py-1.5 rounded-lg bg-amber-600/25 hover:bg-amber-600/40 border border-amber-500/50 text-amber-200 text-xs font-semibold whitespace-nowrap shrink-0">
                + Insert {{Name}} Template Card
              </button>
            </div>

            <div class="flex-1 overflow-y-auto space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Dataset Rows (${this.bulkDatasetRows.length} Pages to Generate)
                </span>
                <div class="flex gap-1.5">
                  <button id="btn-bulk-add-row" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium">
                    + Add Data Row
                  </button>
                </div>
              </div>

              <div class="rounded-xl border border-slate-800 overflow-hidden">
                <div class="grid bg-slate-800/90 border-b border-slate-700 px-3 py-2 text-xs font-bold text-amber-300 font-mono-tabular" style="grid-template-columns: 40px repeat(${this.bulkDatasetColumns.length}, minmax(0, 1fr)) 36px;">
                  <span>#</span>
                  ${this.bulkDatasetColumns
                    .map((col) => `<span>{{${this.escapeHtml(col)}}}</span>`)
                    .join('')}
                  <span></span>
                </div>
                <div class="divide-y divide-slate-800/80 bg-slate-950/60">
                  ${this.bulkDatasetRows
                    .map(
                      (row, rIdx) => `
                    <div class="grid items-center gap-2 px-3 py-1.5" style="grid-template-columns: 40px repeat(${this.bulkDatasetColumns.length}, minmax(0, 1fr)) 36px;">
                      <span class="text-xs font-mono-tabular text-slate-500">${rIdx + 1}</span>
                      ${this.bulkDatasetColumns
                        .map(
                          (_, cIdx) => `
                        <input
                          type="text"
                          data-bulk-cell="${rIdx}-${cIdx}"
                          value="${this.escapeHtml(row[cIdx] || '')}"
                          class="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      `
                        )
                        .join('')}
                      ${
                        this.bulkDatasetRows.length > 1
                          ? `<button data-bulk-del-row="${rIdx}" class="text-slate-500 hover:text-rose-400 text-sm font-bold">×</button>`
                          : `<span></span>`
                      }
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span class="text-xs text-slate-400">
                Each row clones the active page and replaces <code class="text-amber-300">{{Name}}</code>, <code class="text-amber-300">{{Role}}</code>, and <code class="text-amber-300">{{Company}}</code>.
              </span>
              <button
                id="btn-run-bulk-create"
                class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition-colors"
              >
                Generate ${this.bulkDatasetRows.length} Personalized Pages
              </button>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  // ============================================================================
  // MASTER RENDER
  // ============================================================================

  public render(): void {
    const localeMeta = STUDIO_LOCALES[this.studioLocale] || STUDIO_LOCALES.en;
    const sidebarTabs: Array<{ id: SidebarTab; label: string; icon: string }> = [
      { id: 'templates', label: 'Templates', icon: ICONS.templates },
      { id: 'elements', label: 'Elements', icon: ICONS.elements },
      { id: 'text', label: 'Text & RTL', icon: ICONS.text },
      { id: 'charts', label: 'Charts', icon: ICONS.charts },
      { id: 'apps', label: 'Apps & QR', icon: ICONS.apps },
      { id: 'uploads', label: 'Uploads', icon: ICONS.uploads },
      { id: 'draw', label: 'Draw', icon: ICONS.draw },
      { id: 'background', label: 'Backdrop', icon: ICONS.background },
      { id: 'layers', label: 'Layers', icon: ICONS.layers },
    ];

    this.root.innerHTML = `
      <div dir="${localeMeta.dir}" lang="${localeMeta.code}" class="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
        <!-- TOP BAR CONTRACT: 3 ZONES -->
        <header class="flex items-center justify-between gap-8 px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
          <!-- Zone 1: Single text element wordmark -->
          <a href="#studio" id="brand-wordmark" class="text-base font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0">
            CanvasCraft Studio
          </a>

          <!-- Zone 2: 4 concise single-line navigation links -->
          <nav class="flex items-center gap-6 text-xs font-medium text-slate-300">
            <button data-nav-view="studio" class="py-1 transition-colors whitespace-nowrap shrink-0 ${
              this.activeNav === 'studio'
                ? 'text-white underline underline-offset-8 decoration-indigo-500 decoration-2 font-semibold'
                : 'hover:text-white'
            }">${localeMeta.navStudio}</button>
            <button data-nav-view="templates" class="py-1 transition-colors whitespace-nowrap shrink-0 ${
              this.activeNav === 'templates'
                ? 'text-white underline underline-offset-8 decoration-indigo-500 decoration-2 font-semibold'
                : 'hover:text-white'
            }">${localeMeta.navTemplates}</button>
            <button data-nav-view="projects" class="py-1 transition-colors whitespace-nowrap shrink-0 ${
              this.activeNav === 'projects'
                ? 'text-white underline underline-offset-8 decoration-indigo-500 decoration-2 font-semibold'
                : 'hover:text-white'
            }">${localeMeta.navProjects} (${this.projects.length})</button>
            <button data-nav-view="brand" class="py-1 transition-colors whitespace-nowrap shrink-0 ${
              this.activeNav === 'brand'
                ? 'text-white underline underline-offset-8 decoration-indigo-500 decoration-2 font-semibold'
                : 'hover:text-white'
            }">${localeMeta.navBrand}</button>
          </nav>

          <!-- Zone 3: 1 primary action -->
          <div class="flex items-center shrink-0">
            <button id="btn-open-export" class="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2">
              ${ICONS.download}
              <span>${localeMeta.exportBtn}</span>
            </button>
          </div>
        </header>

        ${
          this.activeNav === 'templates'
            ? this.renderTemplatesGalleryView()
            : this.activeNav === 'projects'
            ? this.renderProjectsHubView()
            : this.activeNav === 'brand'
            ? this.renderBrandKitView()
            : `
          <!-- SECONDARY STUDIO CONTEXT & ELEMENT PROPERTY BAR -->
          <div class="h-12 px-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
            <div class="flex items-center gap-2 shrink-0">
              <input
                type="text"
                id="project-title-input"
                value="${this.escapeHtml(this.activeProject.name)}"
                class="bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-100 w-44 focus:outline-none truncate"
                title="Rename Project"
              />
              <button
                id="btn-open-resize"
                class="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono-tabular text-slate-300 whitespace-nowrap shrink-0"
                title="Resize Artboard"
              >
                ${this.activeProject.width} × ${this.activeProject.height}
              </button>
              <div class="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5 shrink-0 gap-0.5">
                <button
                  id="btn-undo"
                  ${this.historyIndex <= 0 ? 'disabled' : ''}
                  class="px-2 py-1 rounded flex items-center gap-1 text-xs font-medium transition-colors ${
                    this.historyIndex <= 0
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-200 hover:bg-slate-700'
                  }"
                  title="${
                    this.historyIndex > 0
                      ? `Undo: ${this.escapeHtml(this.history[this.historyIndex].label)} (Ctrl+Z)`
                      : 'Nothing to Undo (Ctrl+Z)'
                  }"
                >
                  ${ICONS.undo}
                  <span class="hidden xl:inline text-[11px]">Undo</span>
                </button>
                <button
                  id="btn-redo"
                  ${this.historyIndex >= this.history.length - 1 ? 'disabled' : ''}
                  class="px-2 py-1 rounded flex items-center gap-1 text-xs font-medium transition-colors ${
                    this.historyIndex >= this.history.length - 1
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-200 hover:bg-slate-700'
                  }"
                  title="${
                    this.historyIndex < this.history.length - 1
                      ? `Redo: ${this.escapeHtml(this.history[this.historyIndex + 1].label)} (Ctrl+Y)`
                      : 'Nothing to Redo (Ctrl+Y)'
                  }"
                >
                  ${ICONS.redo}
                  <span class="hidden xl:inline text-[11px]">Redo</span>
                </button>
                <div class="w-px h-4 bg-slate-700 mx-0.5"></div>
                <button
                  id="btn-toggle-history"
                  class="px-2 py-1 rounded text-[11px] font-mono-tabular font-semibold transition-colors ${
                    this.showHistoryModal
                      ? 'bg-indigo-600 text-white'
                      : 'text-indigo-300 hover:bg-slate-700 hover:text-white'
                  }"
                  title="Open Command History Stack (${this.historyIndex + 1} of ${this.history.length} states)"
                >
                  History (${this.historyIndex + 1}/${this.history.length})
                </button>
                <div class="w-px h-4 bg-slate-700 mx-0.5"></div>
                <button
                  id="btn-toggle-shortcuts"
                  class="px-2 py-1 rounded text-[11px] font-mono-tabular font-semibold transition-colors ${
                    this.showShortcutsModal
                      ? 'bg-sky-600 text-white'
                      : 'text-sky-300 hover:bg-slate-700 hover:text-white'
                  }"
                  title="Keyboard Shortcuts Cheat Sheet (Delete, Ctrl+Z, Ctrl+Y, Ctrl+D, Ctrl+A, ?)"
                >
                  Shortcuts (?)
                </button>
              </div>
              <select
                id="studio-locale-select"
                class="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md px-2 py-1 text-xs font-medium text-emerald-300 focus:outline-none focus:border-emerald-500 shrink-0"
                title="Switch Studio Language & RTL / LTR Workspace Layout (Arabic, Hebrew, Persian, Urdu, English)"
              >
                ${Object.values(STUDIO_LOCALES)
                  .map(
                    (loc) =>
                      `<option value="${loc.code}" ${
                        this.studioLocale === loc.code ? 'selected' : ''
                      }>${loc.nativeLabel}</option>`
                  )
                  .join('')}
              </select>
              <button
                id="btn-start-present"
                class="px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Launch Fullscreen Slide Deck Player"
              >
                ${ICONS.present}
                <span>Present</span>
              </button>
              <div class="flex items-center bg-slate-800/90 border border-slate-700 rounded-md p-0.5 shrink-0 gap-0.5">
                <button
                  id="btn-quick-export-png"
                  class="px-2 py-1 rounded text-[11px] font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white flex items-center gap-1 whitespace-nowrap transition-colors"
                  title="Save Current Canvas Composition as a PNG Image (.png)"
                >
                  ${ICONS.download}
                  <span>PNG</span>
                </button>
                <button
                  id="btn-quick-export-svg"
                  class="px-2 py-1 rounded text-[11px] font-semibold text-sky-300 hover:bg-sky-600 hover:text-white flex items-center gap-1 whitespace-nowrap transition-colors"
                  title="Save Current Canvas Composition as a Scalable Vector SVG File (.svg)"
                >
                  <span>SVG</span>
                </button>
              </div>
            </div>

            <!-- Dynamic Selection Controls -->
            <div class="flex-1 flex items-center justify-end min-w-0">
              ${this.renderContextualToolbar()}
            </div>
          </div>

          <!-- MAIN WORKSPACE BODY -->
          <div class="flex-1 flex min-h-0 overflow-hidden">
            <!-- Left Icon Rail -->
            <aside class="w-18 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-2.5 gap-1 shrink-0 overflow-y-auto">
              ${sidebarTabs
                .map(
                  (t) => `
                <button
                  data-sidebar-tab="${t.id}"
                  class="w-14 py-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors shrink-0 ${
                    this.activeSidebarTab === t.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  }"
                >
                  ${t.icon}
                  <span class="text-[10px] font-medium whitespace-nowrap">${t.label}</span>
                </button>
              `
                )
                .join('')}

              <div class="mt-auto pt-2 border-t border-slate-800 flex flex-col items-center gap-2">
                <button
                  id="btn-toggle-theme"
                  class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Toggle Studio Backdrop Theme"
                >
                  ${this.isDarkTheme ? ICONS.sun : ICONS.moon}
                </button>
              </div>
            </aside>

            <!-- Expandable Left Drawer -->
            <section class="w-80 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0">
              ${this.renderSidebarDrawer()}
            </section>

            <!-- Center Artboard Viewport + Alignment Toolbar + Bottom Page & Zoom Strip -->
            <main class="flex-1 flex flex-col min-w-0 ${
              this.isDarkTheme ? 'bg-slate-950 workspace-dots' : 'bg-slate-200 light-workspace-dots'
            }">
              ${this.renderAlignmentToolbar()}
              <div
                id="studio-canvas-scroll"
                class="flex-1 overflow-auto flex items-center justify-center p-10"
              >
                <div id="studio-artboard-wrapper">
                  ${this.renderArtboardMarkup()}
                </div>
              </div>

              ${
                this.showNotesDrawer
                  ? `
                <div class="h-28 px-4 py-2 bg-slate-900/95 border-t border-slate-800 flex flex-col gap-1.5 shrink-0">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-indigo-300 flex items-center gap-1.5">${ICONS.notes} Speaker Notes for ${this.escapeHtml(this.activePage.title)}</span>
                    <button id="btn-close-notes" class="text-slate-400 hover:text-white text-[11px]">Hide</button>
                  </div>
                  <textarea
                    id="page-speaker-notes-input"
                    placeholder="Add presenter talking points, script cues, or slide timing notes for this page..."
                    class="w-full flex-1 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  >${this.escapeHtml(this.activePage.speakerNotes || '')}</textarea>
                </div>
              `
                  : ''
              }

              <!-- Bottom Multi-Page, Transitions, Notes, Grid View & Zoom Bar -->
              <footer class="h-12 px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4 shrink-0">
                <!-- Multi-Page Switcher -->
                <div class="flex items-center gap-1.5 overflow-x-auto py-1">
                  ${this.activeProject.pages
                    .map(
                      (p, idx) => `
                    <button
                      data-select-page="${idx}"
                      class="px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        idx === this.activePageIndex
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }"
                    >
                      Page ${idx + 1} · ${this.escapeHtml(p.title)}
                    </button>
                  `
                    )
                    .join('')}
                  <button id="btn-add-page" class="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-indigo-300 whitespace-nowrap shrink-0 flex items-center gap-1">
                    ${ICONS.plus}
                    <span>Add Page</span>
                  </button>
                  <button id="btn-dup-page" class="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 whitespace-nowrap shrink-0" title="Duplicate Active Page">
                    Duplicate
                  </button>
                  ${
                    this.activeProject.pages.length > 1
                      ? `<button id="btn-del-page" class="px-2.5 py-1 rounded-md bg-rose-950/60 hover:bg-rose-900 text-xs text-rose-300 whitespace-nowrap shrink-0">Delete</button>`
                      : ''
                  }
                </div>

                <!-- Right: Notes, Transition, Grid View & Zoom Controls -->
                <div class="flex items-center gap-2 shrink-0">
                  <select id="page-transition-select" class="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500" title="Slide Page Transition">
                    ${(['none', 'fade', 'slide', 'scale', 'wipe'] as PageTransitionKind[])
                      .map(
                        (tr) =>
                          `<option value="${tr}" ${(this.activePage.transition || 'none') === tr ? 'selected' : ''}>Trans: ${tr}</option>`
                      )
                      .join('')}
                  </select>
                  <button id="btn-toggle-notes" class="px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
                    this.showNotesDrawer
                      ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }" title="Toggle Presenter Speaker Notes">
                    ${ICONS.notes}
                    <span>Notes</span>
                  </button>
                  <button id="btn-toggle-grid-view" class="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap" title="Open Slide Deck Grid Overview">
                    Grid View (${this.activeProject.pages.length})
                  </button>
                  <button
                    id="btn-footer-shortcuts"
                    class="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono-tabular text-sky-300 hover:text-white whitespace-nowrap"
                    title="View All Canvas Keyboard Shortcuts (Delete, Ctrl+Z, Ctrl+Y, Ctrl+D, ?)"
                  >
                    <span>${
                      this.lastShortcutTriggered
                        ? `Key: ${this.escapeHtml(this.lastShortcutTriggered)}`
                        : 'Keys: Del · Ctrl+Z · Ctrl+Y'
                    }</span>
                  </button>
                  <button id="btn-zoom-out" class="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">${ICONS.minus}</button>
                  <span class="text-xs font-mono-tabular text-slate-200 w-12 text-center">${Math.round(this.zoom * 100)}%</span>
                  <button id="btn-zoom-in" class="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">${ICONS.plus}</button>
                  <button id="btn-zoom-fit" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 whitespace-nowrap">Fit</button>
                </div>
              </footer>
            </main>

            ${
              this.showRightLayersPanel
                ? `
              <!-- Dedicated Right-Side Layers Panel -->
              <aside id="studio-right-layers-dock" class="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col shrink-0">
                ${this.renderLayersPanelContent(true)}
              </aside>
            `
                : ''
            }
          </div>
        `
        }

        ${this.renderContextMenu()}
        ${this.renderPresentationOverlay()}
        ${this.renderModals()}
        <div id="studio-toast-container"></div>
      </div>
    `;

    this.renderToastOnly();
    this.bindEvents();
  }

  // ============================================================================
  // EVENT DELEGATION & BINDINGS
  // ============================================================================

  private bindArtboardEvents(): void {
    const artboard = document.getElementById('studio-artboard');
    if (!artboard) return;

    artboard.onmousedown = (e: MouseEvent) => {
      if (e.button === 2) return; // right-click handled by contextmenu
      if (this.contextMenu) {
        this.contextMenu = null;
        this.render();
        return;
      }
      if (this.isDrawingMode) {
        this.startFreehandDrawing(e);
        return;
      }
      if (this.isCommentPinMode) {
        this.placeCommentPinAtCursor(e, artboard);
        return;
      }
      if (this.isTextPlacementMode) {
        this.placeTextElementAtCursor(e, artboard);
        return;
      }
      if (e.target === artboard) {
        this.startMarqueeSelection(e, artboard);
      }
    };

    // Custom Right-Click Context Menu on Artboard
    artboard.oncontextmenu = (e: MouseEvent) => {
      e.preventDefault();
      const targetElNode = (e.target as HTMLElement).closest<HTMLElement>('[data-element-id]');
      const inMultiBounds = (e.target as HTMLElement).closest<HTMLElement>('#studio-multi-bounds');
      const targetId = targetElNode
        ? targetElNode.getAttribute('data-element-id')
        : inMultiBounds
        ? this.selectedElementId
        : null;
      if (targetId && !this.selectedElementIds.includes(targetId)) {
        this.selectSingleOrGroup(targetId, false);
      }
      this.contextMenu = {
        x: e.clientX,
        y: e.clientY,
        targetElementId: targetId,
      };
      this.render();
    };

    // Element selection, Shift+Click multi-select, drag, double-click inline text edit
    artboard.querySelectorAll<HTMLElement>('[data-element-id]').forEach((node) => {
      const id = node.getAttribute('data-element-id')!;
      const el = this.activePage.elements.find((item) => item.id === id);
      if (!el) return;

      node.onmousedown = (e: MouseEvent) => {
        if (e.button === 2 || this.isDrawingMode) return;
        const target = e.target as HTMLElement;
        if (target.hasAttribute('data-resize-dir') || target.closest('[data-rotate-id]')) {
          return;
        }

        if (this.isCommentPinMode) {
          this.placeCommentPinAtCursor(e, artboard);
          return;
        }

        // If Click-on-Canvas Text Tool mode is active, clicking anywhere on the canvas (even over an existing shape) places the new editable text element!
        if (this.isTextPlacementMode) {
          this.placeTextElementAtCursor(e, artboard);
          return;
        }

        // If this text element is already in inline editing mode, allow normal cursor placement/selection inside it
        if (this.editingTextId === id) {
          e.stopPropagation();
          return;
        }

        e.stopPropagation();

        if (this.contextMenu) {
          this.contextMenu = null;
        }

        if (e.shiftKey) {
          this.selectSingleOrGroup(id, true);
          this.render();
          return;
        }

        const wasSelected = this.selectedElementIds.includes(id);
        if (this.editingTextId && this.editingTextId !== id) {
          this.editingTextId = null;
        }

        if (!wasSelected) {
          this.selectSingleOrGroup(id, false);
          this.render();
          const refreshed = this.activePage.elements.find((item) => item.id === id);
          if (refreshed) this.startElementDrag(e, refreshed);
        } else {
          this.selectedElementId = id;
          this.startElementDrag(e, el);
        }
      };

      node.ondblclick = (e: MouseEvent) => {
        e.stopPropagation();
        if (el.type === 'text' && !el.locked) {
          this.editingTextId = el.id;
          this.selectedElementId = el.id;
          this.selectedElementIds = [el.id];
          this.render();
          const editable = document.querySelector<HTMLElement>(
            `[data-text-edit-id="${el.id}"]`
          );
          if (editable) {
            editable.focus();
          }
        }
      };
    });

    // Inline text editing sync
    if (this.editingTextId) {
      const editable = artboard.querySelector<HTMLElement>(
        `[data-text-edit-id="${this.editingTextId}"]`
      );
      const el = this.activePage.elements.find((item) => item.id === this.editingTextId);
      if (editable && el) {
        editable.oninput = () => {
          el.text = editable.innerText;
          this.saveToLocalStorage();
        };
        editable.onblur = () => {
          this.editingTextId = null;
          this.pushHistorySnapshot();
          this.render();
        };
      }
    }

    // Resize handles
    artboard.querySelectorAll<HTMLElement>('[data-resize-dir]').forEach((handle) => {
      const dir = handle.getAttribute('data-resize-dir')!;
      const id = handle.getAttribute('data-resize-id')!;
      const el = this.activePage.elements.find((item) => item.id === id);
      if (!el) return;
      handle.onmousedown = (e: MouseEvent) => this.startElementResize(e, el, dir);
    });

    // Rotate handle
    artboard.querySelectorAll<HTMLElement>('[data-rotate-id]').forEach((handle) => {
      const id = handle.getAttribute('data-rotate-id')!;
      const el = this.activePage.elements.find((item) => item.id === id);
      if (!el) return;
      handle.onmousedown = (e: MouseEvent) => this.startElementRotate(e, el);
    });

    // HTML5 Drag-and-Drop onto Artboard (including Drop-Into-Frame image masking!)
    const dropPreview = document.getElementById('studio-drop-preview');
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      if (!dropPreview || !this.draggedSidebarItem) return;
      const rect = artboard.getBoundingClientRect();
      const itemW = this.draggedSidebarItem.width || 240;
      const itemH = this.draggedSidebarItem.height || 180;
      const dropX = Math.round((e.clientX - rect.left) / this.zoom - itemW / 2);
      const dropY = Math.round((e.clientY - rect.top) / this.zoom - itemH / 2);

      dropPreview.classList.remove('hidden');
      dropPreview.classList.add('flex');
      dropPreview.style.left = `${dropX}px`;
      dropPreview.style.top = `${dropY}px`;
      dropPreview.style.width = `${itemW}px`;
      dropPreview.style.height = `${itemH}px`;

      const shapeSilhouette =
        this.draggedSidebarItem.type === 'shape' && this.draggedSidebarItem.shapeKind
          ? `<div class="absolute inset-0 opacity-60 pointer-events-none">${renderShapeSvg(
              this.draggedSidebarItem.shapeKind,
              this.draggedSidebarItem.fill || '#6366f1',
              '#ffffff',
              2,
              this.draggedSidebarItem.borderRadius || 0
            )}</div>`
          : '';

      dropPreview.innerHTML = `
        ${shapeSilhouette}
        <span class="relative z-10 px-2.5 py-1 rounded-md bg-slate-950/90 border border-indigo-400/50 text-indigo-200 text-xs font-mono-tabular shadow-lg">
          ${this.escapeHtml(this.draggedSidebarItem.name || 'Drop Element')} · (${dropX}, ${dropY})
        </span>
      `;
    };

    const handleDragLeave = (e: DragEvent) => {
      if (dropPreview && (!e.relatedTarget || !artboard.contains(e.relatedTarget as Node))) {
        dropPreview.classList.add('hidden');
        dropPreview.classList.remove('flex');
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dropPreview) {
        dropPreview.classList.add('hidden');
        dropPreview.classList.remove('flex');
      }

      let payload: Partial<DesignElement> | null = this.draggedSidebarItem;
      if (!payload && e.dataTransfer) {
        const raw =
          e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
        if (raw) {
          try {
            payload = JSON.parse(raw);
          } catch {
            payload = null;
          }
        }
      }
      this.draggedSidebarItem = null;
      if (!payload) return;

      const rect = artboard.getBoundingClientRect();
      const cursorX = Math.round((e.clientX - rect.left) / this.zoom);
      const cursorY = Math.round((e.clientY - rect.top) / this.zoom);

      // Check if dropping an image onto an existing Canva Grid, Frame, or Shape on the artboard!
      if (payload.type === 'image' && payload.src && !payload.frameShape) {
        const hoveredTarget = [...this.activePage.elements]
          .reverse()
          .find(
            (item) =>
              !item.hidden &&
              !item.locked &&
              cursorX >= item.x &&
              cursorX <= item.x + item.width &&
              cursorY >= item.y &&
              cursorY <= item.y + item.height &&
              (item.type === 'grid' || item.type === 'image' || item.type === 'shape')
          );

        if (hoveredTarget) {
          if (hoveredTarget.type === 'grid') {
            const cells = getGridCellRects(
              hoveredTarget.gridLayout || 'split-v',
              hoveredTarget.width,
              hoveredTarget.height,
              hoveredTarget.gridGap ?? 12
            );
            const relX = cursorX - hoveredTarget.x;
            const relY = cursorY - hoveredTarget.y;
            let cellIdx = cells.findIndex(
              (c) => relX >= c.x && relX <= c.x + c.w && relY >= c.y && relY <= c.y + c.h
            );
            if (cellIdx < 0) cellIdx = 0;
            if (!hoveredTarget.gridCells) hoveredTarget.gridCells = [];
            hoveredTarget.gridCells[cellIdx] = payload.src;
            this.selectSingleOrGroup(hoveredTarget.id, false);
            this.pushHistorySnapshot();
            this.render();
            this.showToast(`Dropped photo into Grid Cell ${cellIdx + 1}`);
            return;
          }

          if (hoveredTarget.type === 'shape') {
            const shapeToFrameMap: Record<string, FrameShapeKind> = {
              circle: 'circle',
              star: 'star',
              hexagon: 'hexagon',
              diamond: 'diamond',
              pill: 'pill',
              rect: 'none',
            };
            hoveredTarget.type = 'image';
            hoveredTarget.frameShape = shapeToFrameMap[hoveredTarget.shapeKind || 'rect'] || 'none';
          }
          hoveredTarget.src = payload.src;
          hoveredTarget.name = `${payload.name} (Framed)`;
          this.selectSingleOrGroup(hoveredTarget.id, false);
          this.pushHistorySnapshot();
          this.render();
          this.showToast(`Inserted photo into "${hoveredTarget.name}" frame`);
          return;
        }
      }

      const itemW = payload.width || 240;
      const itemH = payload.height || 180;
      const rawX = Math.round(cursorX - itemW / 2);
      const rawY = Math.round(cursorY - itemH / 2);

      const clampedX = Math.max(-itemW / 2, Math.min(this.activeProject.width - itemW / 2, rawX));
      const clampedY = Math.max(-itemH / 2, Math.min(this.activeProject.height - itemH / 2, rawY));

      this.addElement({
        ...payload,
        x: Math.round(clampedX),
        y: Math.round(clampedY),
      });
      this.showToast(`Placed ${payload.name || 'Element'} at (${Math.round(clampedX)}, ${Math.round(clampedY)})`);
    };

    artboard.ondragover = handleDragOver;
    artboard.ondragleave = handleDragLeave;
    artboard.ondrop = handleDrop;

    // Interactive Top & Left Rulers: Drag out snapping guides or click to place, plus live cursor coordinate tracking
    const rulerTop = document.getElementById('studio-ruler-top');
    if (rulerTop) {
      rulerTop.onmousedown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        this.startRulerGuideDrag(e, 'top');
      };
    }
    const rulerLeft = document.getElementById('studio-ruler-left');
    if (rulerLeft) {
      rulerLeft.onmousedown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        this.startRulerGuideDrag(e, 'left');
      };
    }
    const rulerOrigin = document.getElementById('studio-ruler-origin');
    if (rulerOrigin) {
      rulerOrigin.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        this.cycleGuidePresets();
      };
    }

    // Live cursor position hairline on Top and Left rulers
    const updateRulerCursorTrackers = (e: MouseEvent) => {
      if (!this.showRulers) return;
      const rect = artboard.getBoundingClientRect();
      const rawX = Math.round((e.clientX - rect.left) / this.zoom);
      const rawY = Math.round((e.clientY - rect.top) / this.zoom);
      const curXEl = document.getElementById('ruler-cursor-x');
      const curXLabel = document.getElementById('ruler-cursor-x-label');
      const curYEl = document.getElementById('ruler-cursor-y');
      const curYLabel = document.getElementById('ruler-cursor-y-label');

      if (curXEl && curXLabel) {
        if (rawX >= 0 && rawX <= this.activeProject.width) {
          curXEl.classList.remove('hidden');
          curXEl.style.left = `${Math.round(rawX * this.zoom)}px`;
          curXLabel.textContent = `${rawX}`;
        } else {
          curXEl.classList.add('hidden');
        }
      }
      if (curYEl && curYLabel) {
        if (rawY >= 0 && rawY <= this.activeProject.height) {
          curYEl.classList.remove('hidden');
          curYEl.style.top = `${Math.round(rawY * this.zoom)}px`;
          curYLabel.textContent = `${rawY}`;
        } else {
          curYEl.classList.add('hidden');
        }
      }
    };

    artboard.addEventListener('mousemove', updateRulerCursorTrackers);
    rulerTop?.addEventListener('mousemove', updateRulerCursorTrackers);
    rulerLeft?.addEventListener('mousemove', updateRulerCursorTrackers);

    // Existing Snapping Guides on Artboard: Drag to reposition, double-click or click × to remove
    artboard.querySelectorAll<HTMLElement>('[data-guide-x]').forEach((g) => {
      const idx = Number(g.getAttribute('data-guide-x'));
      g.onmousedown = (e: MouseEvent) => {
        if ((e.target as HTMLElement).hasAttribute('data-delete-guide-x')) return;
        this.startExistingGuideDrag(e, 'x', idx);
      };
      g.ondblclick = (e: MouseEvent) => {
        e.stopPropagation();
        const removedX = this.customGuides.x[idx];
        this.customGuides.x.splice(idx, 1);
        this.render();
        this.showToast(`Removed vertical guide at X = ${removedX}px`);
      };
    });

    artboard.querySelectorAll<HTMLElement>('[data-delete-guide-x]').forEach((btn) => {
      btn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-delete-guide-x'));
        const removedX = this.customGuides.x[idx];
        this.customGuides.x.splice(idx, 1);
        this.render();
        this.showToast(`Removed vertical guide at X = ${removedX}px`);
      };
    });

    artboard.querySelectorAll<HTMLElement>('[data-guide-y]').forEach((g) => {
      const idx = Number(g.getAttribute('data-guide-y'));
      g.onmousedown = (e: MouseEvent) => {
        if ((e.target as HTMLElement).hasAttribute('data-delete-guide-y')) return;
        this.startExistingGuideDrag(e, 'y', idx);
      };
      g.ondblclick = (e: MouseEvent) => {
        e.stopPropagation();
        const removedY = this.customGuides.y[idx];
        this.customGuides.y.splice(idx, 1);
        this.render();
        this.showToast(`Removed horizontal guide at Y = ${removedY}px`);
      };
    });

    artboard.querySelectorAll<HTMLElement>('[data-delete-guide-y]').forEach((btn) => {
      btn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-delete-guide-y'));
        const removedY = this.customGuides.y[idx];
        this.customGuides.y.splice(idx, 1);
        this.render();
        this.showToast(`Removed horizontal guide at Y = ${removedY}px`);
      };
    });

    // Unified Group / Multi-Selection 8-Direction Resize Handles
    artboard.querySelectorAll<HTMLElement>('[data-group-resize-dir]').forEach((handle) => {
      const dir = handle.getAttribute('data-group-resize-dir')!;
      handle.onmousedown = (e: MouseEvent) => this.startGroupResize(e, dir);
    });

    // Floating on-canvas Group & Ungroup buttons
    const floatingGroupBtn = document.getElementById('btn-floating-group');
    if (floatingGroupBtn) {
      floatingGroupBtn.onmousedown = (e: MouseEvent) => e.stopPropagation();
      floatingGroupBtn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        this.groupSelected();
      };
    }
    const floatingUngroupBtn = document.getElementById('btn-floating-ungroup');
    if (floatingUngroupBtn) {
      floatingUngroupBtn.onmousedown = (e: MouseEvent) => e.stopPropagation();
      floatingUngroupBtn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        this.ungroupSelected();
      };
    }

    artboard.querySelectorAll<HTMLElement>('[data-floating-canvas-align]').forEach((btn) => {
      btn.onmousedown = (e: MouseEvent) => {
        e.stopPropagation();
      };
      btn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        const pos = btn.getAttribute('data-floating-canvas-align') as
          | 'left'
          | 'center'
          | 'right'
          | 'top'
          | 'middle'
          | 'bottom'
          | 'center-both';
        const targetMode =
          this.alignRelativeTo === 'canvas-group' ? 'canvas-group' : 'canvas';
        this.alignSelectedElements(pos, targetMode);
      };
    });

    // Feature 8: On-Canvas Sticky Notes / Pin Comments interactions
    artboard.querySelectorAll<HTMLElement>('[data-comment-pin-id]').forEach((pinWrap) => {
      pinWrap.onmousedown = (e: MouseEvent) => e.stopPropagation();
    });
    artboard.querySelectorAll<HTMLElement>('[data-toggle-comment]').forEach((btn) => {
      btn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        const cid = btn.getAttribute('data-toggle-comment')!;
        this.activeCommentId = this.activeCommentId === cid ? null : cid;
        this.render();
      };
    });
    artboard.querySelectorAll<HTMLElement>('[data-close-comment]').forEach((btn) => {
      btn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        this.activeCommentId = null;
        this.render();
      };
    });
    artboard.querySelectorAll<HTMLTextAreaElement>('[data-comment-text-input]').forEach((ta) => {
      ta.oninput = () => {
        const cid = ta.getAttribute('data-comment-text-input')!;
        const found = this.activePage.comments?.find((c) => c.id === cid);
        if (found) {
          found.text = ta.value;
          this.saveToLocalStorage();
        }
      };
    });
    artboard.querySelectorAll<HTMLElement>('[data-resolve-comment]').forEach((btn) => {
      btn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        const cid = btn.getAttribute('data-resolve-comment')!;
        const found = this.activePage.comments?.find((c) => c.id === cid);
        if (found) {
          found.resolved = !found.resolved;
          this.pushHistorySnapshot('Toggled Comment Resolution');
          this.render();
        }
      };
    });
    artboard.querySelectorAll<HTMLElement>('[data-delete-comment]').forEach((btn) => {
      btn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        const cid = btn.getAttribute('data-delete-comment')!;
        if (this.activePage.comments) {
          this.activePage.comments = this.activePage.comments.filter((c) => c.id !== cid);
          if (this.activeCommentId === cid) this.activeCommentId = null;
          this.pushHistorySnapshot('Deleted Pinned Comment');
          this.render();
        }
      };
    });
  }

  private bindEvents(): void {
    this.bindArtboardEvents();

    // Close context menu when clicking anywhere outside it
    this.root.onmousedown = (e: MouseEvent) => {
      if (this.contextMenu && !(e.target as HTMLElement).closest('#studio-context-menu')) {
        this.contextMenu = null;
        this.render();
      }
    };

    // Context menu actions
    this.root.querySelectorAll<HTMLElement>('[data-ctx-action]').forEach((btn) => {
      btn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        if (btn.hasAttribute('disabled')) return;
        const action = btn.getAttribute('data-ctx-action');
        const targetId = this.contextMenu?.targetElementId || this.selectedElementId;
        this.contextMenu = null;

        if (action === 'copy' && targetId) this.copyElement(targetId);
        else if (action === 'paste') this.pasteElement();
        else if (action === 'duplicate' && targetId) this.duplicateElement(targetId);
        else if (action === 'copy-style' && targetId) this.copyStyleFromElement(targetId);
        else if (action === 'paste-style') this.pasteStyleToSelected();
        else if (action === 'group') this.groupSelected();
        else if (action === 'ungroup') this.ungroupSelected();
        else if ((action === 'bring-to-front' || action === 'front') && targetId)
          this.reorderLayer(targetId, 'top');
        else if ((action === 'move-forward' || action === 'forward') && targetId)
          this.reorderLayer(targetId, 'up');
        else if ((action === 'move-backward' || action === 'backward') && targetId)
          this.reorderLayer(targetId, 'down');
        else if ((action === 'send-to-back' || action === 'back') && targetId)
          this.reorderLayer(targetId, 'bottom');
        else if (action === 'lock' && targetId) {
          const el = this.activePage.elements.find((item) => item.id === targetId);
          if (el) {
            el.locked = !el.locked;
            this.pushHistorySnapshot();
          }
          this.render();
        } else if (action === 'delete') {
          this.deleteSelectedElements();
        } else if (action === 'select-all') {
          this.selectedElementIds = this.activePage.elements
            .filter((item) => !item.hidden && !item.locked)
            .map((item) => item.id);
          this.selectedElementId = this.selectedElementIds[0] || null;
          this.render();
        } else {
          this.render();
        }
      };
    });

    // Presentation mode bindings
    document.getElementById('btn-start-present')?.addEventListener('click', () => {
      this.isPresenting = true;
      this.presStartTime = Date.now();
      if (this.presTimerInterval) window.clearInterval(this.presTimerInterval);
      this.presTimerInterval = window.setInterval(() => {
        if (this.isPresenting) this.render();
      }, 1000);
      this.clearSelection();
      this.render();
    });
    document.getElementById('btn-pres-exit')?.addEventListener('click', () => {
      this.isPresenting = false;
      this.laserActive = false;
      if (this.presTimerInterval) {
        window.clearInterval(this.presTimerInterval);
        this.presTimerInterval = null;
      }
      this.render();
    });
    document.getElementById('btn-pres-laser')?.addEventListener('click', () => {
      this.laserActive = !this.laserActive;
      this.render();
    });
    document.getElementById('btn-pres-prev')?.addEventListener('click', () => {
      if (this.activePageIndex > 0) {
        this.activePageIndex--;
        this.render();
      }
    });
    document.getElementById('btn-pres-next')?.addEventListener('click', () => {
      if (this.activePageIndex < this.activeProject.pages.length - 1) {
        this.activePageIndex++;
        this.render();
      }
    });

    const presOverlay = document.getElementById('presentation-overlay');
    if (presOverlay && this.laserActive) {
      presOverlay.onmousemove = (e: MouseEvent) => {
        this.laserPos = { x: e.clientX, y: e.clientY };
        const dot = presOverlay.querySelector<HTMLElement>('.bg-rose-500');
        if (dot) {
          dot.style.left = `${e.clientX}px`;
          dot.style.top = `${e.clientY}px`;
        } else {
          this.render();
        }
      };
    }

    // Deselect when clicking empty canvas scroll margin
    const scrollArea = document.getElementById('studio-canvas-scroll');
    if (scrollArea) {
      scrollArea.onmousedown = (e: MouseEvent) => {
        if (e.target === scrollArea && (this.selectedElementIds.length > 0 || this.editingTextId)) {
          this.clearSelection();
          this.render();
        }
      };
    }

    // Top bar navigation
    document.getElementById('brand-wordmark')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.activeNav = 'studio';
      this.render();
    });

    this.root.querySelectorAll<HTMLElement>('[data-nav-view]').forEach((btn) => {
      btn.onclick = () => {
        this.activeNav = btn.getAttribute('data-nav-view') as NavView;
        this.render();
      };
    });

    document.getElementById('btn-open-export')?.addEventListener('click', () => {
      this.showExportModal = true;
      this.render();
    });

    document.getElementById('btn-close-export')?.addEventListener('click', () => {
      this.showExportModal = false;
      this.render();
    });

    // Quick 1-click PNG & SVG export buttons in the studio toolbar
    document.getElementById('btn-quick-export-png')?.addEventListener('click', async () => {
      if (this.isExporting) return;
      this.isExporting = true;
      this.showToast('Exporting canvas composition as PNG...');
      await downloadDesignImage(this.activeProject, this.activePage, 'png', 1, {
        scale: 1,
        transparentBackground: this.exportTransparentBg,
      });
      this.isExporting = false;
      this.showToast('Saved canvas composition as .PNG image');
    });

    document.getElementById('btn-quick-export-svg')?.addEventListener('click', async () => {
      if (this.isExporting) return;
      this.isExporting = true;
      await downloadDesignSvg(this.activeProject, this.activePage, {
        scale: 1,
        transparentBackground: this.exportTransparentBg,
      });
      this.isExporting = false;
      this.showToast('Saved canvas composition as Vector .SVG file');
    });

    // Interactive Export Modal Controls (Format Tabs, Scale, Transparency, Filename, SVG Code Copy)
    this.root.querySelectorAll<HTMLElement>('[data-export-format]').forEach((btn) => {
      btn.onclick = () => {
        const fmt = btn.getAttribute('data-export-format') as 'png' | 'svg';
        this.exportFormat = fmt;
        this.render();
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-export-scale]').forEach((btn) => {
      btn.onclick = () => {
        const sc = Number(btn.getAttribute('data-export-scale')) as 1 | 2 | 3;
        if (sc === 1 || sc === 2 || sc === 3) {
          this.exportScale = sc;
          this.render();
        }
      };
    });

    const transparentToggle = document.getElementById(
      'export-transparent-bg'
    ) as HTMLInputElement | null;
    if (transparentToggle) {
      transparentToggle.onchange = () => {
        this.exportTransparentBg = transparentToggle.checked;
        this.render();
      };
    }

    const exportFilenameInput = document.getElementById(
      'export-filename-input'
    ) as HTMLInputElement | null;
    if (exportFilenameInput) {
      exportFilenameInput.oninput = () => {
        this.exportCustomFilename = exportFilenameInput.value;
      };
    }

    document.getElementById('btn-copy-svg-code')?.addEventListener('click', () => {
      const svgCode = generateNativePageSvg(this.activeProject, this.activePage, {
        scale: this.exportScale,
        transparentBackground: this.exportTransparentBg,
      });
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(svgCode).catch(() => {});
      }
      this.showToast('Copied vector SVG markup to clipboard');
    });

    document.getElementById('btn-export-primary-download')?.addEventListener('click', async () => {
      if (this.isExporting) return;
      this.isExporting = true;
      const customFilename =
        (document.getElementById('export-filename-input') as HTMLInputElement | null)?.value ||
        this.exportCustomFilename;

      if (this.exportFormat === 'svg') {
        await downloadDesignSvg(this.activeProject, this.activePage, {
          scale: this.exportScale,
          transparentBackground: this.exportTransparentBg,
          filename: customFilename,
        });
        this.isExporting = false;
        this.showExportModal = false;
        this.render();
        this.showToast('Vector .SVG composition downloaded');
      } else {
        this.showToast(`Rendering ${this.exportScale}x PNG composition...`);
        await downloadDesignImage(this.activeProject, this.activePage, 'png', this.exportScale, {
          scale: this.exportScale,
          transparentBackground: this.exportTransparentBg,
          filename: customFilename,
        });
        this.isExporting = false;
        this.showExportModal = false;
        this.render();
        this.showToast(`${this.exportScale}x PNG composition downloaded`);
      }
    });

    // Direct 1-click export buttons
    document.getElementById('btn-export-png-1x')?.addEventListener('click', async () => {
      if (this.isExporting) return;
      this.isExporting = true;
      this.showToast('Rendering 1x PNG...');
      await downloadDesignImage(this.activeProject, this.activePage, 'png', 1, {
        scale: 1,
        transparentBackground: this.exportTransparentBg,
        filename: this.exportCustomFilename,
      });
      this.isExporting = false;
      this.showExportModal = false;
      this.render();
      this.showToast('PNG downloaded');
    });

    document.getElementById('btn-export-png-2x')?.addEventListener('click', async () => {
      if (this.isExporting) return;
      this.isExporting = true;
      this.showToast('Rendering 2x Retina PNG...');
      await downloadDesignImage(this.activeProject, this.activePage, 'png', 2, {
        scale: 2,
        transparentBackground: this.exportTransparentBg,
        filename: this.exportCustomFilename,
      });
      this.isExporting = false;
      this.showExportModal = false;
      this.render();
      this.showToast('2x Retina PNG downloaded');
    });

    document.getElementById('btn-export-jpg')?.addEventListener('click', async () => {
      if (this.isExporting) return;
      this.isExporting = true;
      await downloadDesignImage(this.activeProject, this.activePage, 'jpeg', 1, {
        scale: 1,
        filename: this.exportCustomFilename,
      });
      this.isExporting = false;
      this.showExportModal = false;
      this.render();
      this.showToast('JPG downloaded');
    });

    document.getElementById('btn-export-svg')?.addEventListener('click', async () => {
      await downloadDesignSvg(this.activeProject, this.activePage, {
        scale: this.exportScale,
        transparentBackground: this.exportTransparentBg,
        filename: this.exportCustomFilename,
      });
      this.showExportModal = false;
      this.render();
      this.showToast('Vector .SVG downloaded');
    });

    const cropMarksToggle = document.getElementById('export-crop-marks') as HTMLInputElement | null;
    if (cropMarksToggle) {
      cropMarksToggle.onchange = () => {
        this.exportIncludeCropMarks = cropMarksToggle.checked;
      };
    }

    document.getElementById('btn-export-pdf')?.addEventListener('click', async () => {
      if (this.isExporting) return;
      this.isExporting = true;
      this.showToast(
        this.exportIncludeCropMarks
          ? 'Compiling Print-Ready PDF with Crop Marks & Bleed...'
          : 'Compiling Multi-Page PDF...'
      );
      await downloadDesignPdf(this.activeProject, this.exportIncludeCropMarks);
      this.isExporting = false;
      this.showExportModal = false;
      this.render();
      this.showToast('Multi-Page PDF downloaded');
    });

    document.getElementById('btn-export-storyboard')?.addEventListener('click', async () => {
      if (this.isExporting) return;
      this.isExporting = true;
      this.showToast('Rendering Multi-Page Storyboard Contact Sheet...');
      await downloadStoryboardSheet(this.activeProject, this.exportIncludeCropMarks);
      this.isExporting = false;
      this.showExportModal = false;
      this.render();
      this.showToast('Storyboard Contact Sheet .PNG downloaded');
    });

    document.getElementById('btn-export-video')?.addEventListener('click', async () => {
      if (this.isExporting) return;
      this.isExporting = true;
      this.showToast('Recording 3.5s WebM Video @ 30fps...');
      await downloadDesignVideo(this.activeProject, this.activePage);
      this.isExporting = false;
      this.showExportModal = false;
      this.render();
      this.showToast('Animated .WEBM video downloaded');
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      downloadProjectJson(this.activeProject);
      this.showExportModal = false;
      this.render();
      this.showToast('Saved .canva.json project backup');
    });

    // Resize modal & Smart Magic Resize
    document.getElementById('btn-open-resize')?.addEventListener('click', () => {
      this.showResizeModal = true;
      this.render();
    });
    document.getElementById('btn-custom-size-hero')?.addEventListener('click', () => {
      this.activeNav = 'studio';
      this.showResizeModal = true;
      this.render();
    });
    document.getElementById('btn-close-resize')?.addEventListener('click', () => {
      this.showResizeModal = false;
      this.render();
    });

    const magicScaleToggle = document.getElementById('resize-magic-scale') as HTMLInputElement | null;
    if (magicScaleToggle) {
      magicScaleToggle.onchange = () => {
        this.magicResizeScaleElements = magicScaleToggle.checked;
      };
    }

    this.root.querySelectorAll<HTMLElement>('[data-resize-preset]').forEach((btn) => {
      btn.onclick = () => {
        const [w, h] = btn.getAttribute('data-resize-preset')!.split('x').map(Number);
        const wInput = document.getElementById('resize-width-input') as HTMLInputElement | null;
        const hInput = document.getElementById('resize-height-input') as HTMLInputElement | null;
        if (wInput && hInput) {
          wInput.value = String(w);
          hInput.value = String(h);
        }
      };
    });

    const applyMagicResizeToProject = (proj: DesignProject, newW: number, newH: number, scaleEls: boolean) => {
      const oldW = proj.width;
      const oldH = proj.height;
      const rx = newW / Math.max(1, oldW);
      const ry = newH / Math.max(1, oldH);
      const rUniform = Math.min(rx, ry);

      if (scaleEls) {
        proj.pages.forEach((p) => {
          p.elements.forEach((el) => {
            el.x = Math.round(el.x * rx);
            el.y = Math.round(el.y * ry);
            el.width = Math.max(20, Math.round(el.width * rx));
            el.height = Math.max(20, Math.round(el.height * ry));
            if (el.fontSize) el.fontSize = Math.max(10, Math.round(el.fontSize * rUniform));
            if (el.strokeWidth) el.strokeWidth = Math.max(1, Math.round(el.strokeWidth * rUniform));
          });
        });
      }
      proj.width = newW;
      proj.height = newH;
    };

    document.getElementById('btn-apply-resize')?.addEventListener('click', () => {
      const wInput = document.getElementById('resize-width-input') as HTMLInputElement | null;
      const hInput = document.getElementById('resize-height-input') as HTMLInputElement | null;
      if (wInput && hInput) {
        const w = Math.max(200, Math.min(4000, Number(wInput.value) || 1080));
        const h = Math.max(200, Math.min(4000, Number(hInput.value) || 1080));
        applyMagicResizeToProject(this.activeProject, w, h, this.magicResizeScaleElements);
        this.showResizeModal = false;
        this.fitArtboardToViewport();
        this.pushHistorySnapshot();
        this.render();
        this.showToast(`Magic Resized canvas to ${w} × ${h} px`);
      }
    });

    document.getElementById('btn-magic-resize-copy')?.addEventListener('click', () => {
      const wInput = document.getElementById('resize-width-input') as HTMLInputElement | null;
      const hInput = document.getElementById('resize-height-input') as HTMLInputElement | null;
      if (wInput && hInput) {
        const w = Math.max(200, Math.min(4000, Number(wInput.value) || 1080));
        const h = Math.max(200, Math.min(4000, Number(hInput.value) || 1080));
        const copyProj: DesignProject = JSON.parse(JSON.stringify(this.activeProject));
        copyProj.id = this.uid('proj');
        copyProj.name = `${this.activeProject.name} (${w}×${h})`;
        copyProj.updatedAt = Date.now();
        applyMagicResizeToProject(copyProj, w, h, true);
        this.projects.unshift(copyProj);
        this.activeProject = copyProj;
        this.activePageIndex = 0;
        this.showResizeModal = false;
        this.fitArtboardToViewport();
        this.pushHistorySnapshot();
        this.render();
        this.showToast(`Created Magic Resized copy "${copyProj.name}"`);
      }
    });

    // Secondary toolbar controls
    const titleInput = document.getElementById('project-title-input') as HTMLInputElement | null;
    if (titleInput) {
      titleInput.onchange = () => {
        this.activeProject.name = titleInput.value.trim() || 'Untitled Design';
        this.saveToLocalStorage();
        this.showToast('Project title saved to LocalStorage');
      };
    }

    document.getElementById('btn-undo')?.addEventListener('click', () => this.undo());
    document.getElementById('btn-redo')?.addEventListener('click', () => this.redo());
    document.getElementById('btn-toggle-history')?.addEventListener('click', () => {
      this.showHistoryModal = !this.showHistoryModal;
      this.render();
    });
    document.getElementById('btn-close-history')?.addEventListener('click', () => {
      this.showHistoryModal = false;
      this.render();
    });
    document.getElementById('btn-history-undo')?.addEventListener('click', () => this.undo());
    document.getElementById('btn-history-redo')?.addEventListener('click', () => this.redo());
    document.getElementById('btn-clear-history')?.addEventListener('click', () => {
      const current = this.history[this.historyIndex];
      if (current) {
        current.label = 'Compacted Baseline State';
        current.timestamp = Date.now();
        this.history = [current];
        this.historyIndex = 0;
        this.render();
        this.showToast('Compacted command history stack to current state');
      }
    });
    this.root.querySelectorAll<HTMLElement>('[data-history-jump]').forEach((btn) => {
      btn.onclick = () => {
        const targetIdx = Number(btn.getAttribute('data-history-jump'));
        this.jumpToHistoryIndex(targetIdx);
      };
    });

    // Named Version Checkpoints bindings inside Command History modal
    document.getElementById('btn-save-checkpoint')?.addEventListener('click', () => {
      const inp = document.getElementById('checkpoint-name-input') as HTMLInputElement | null;
      this.saveNamedCheckpoint(inp?.value || '');
      this.render();
    });
    this.root.querySelectorAll<HTMLElement>('[data-restore-checkpoint]').forEach((btn) => {
      btn.onclick = () => {
        this.restoreNamedCheckpoint(btn.getAttribute('data-restore-checkpoint')!);
      };
    });
    this.root.querySelectorAll<HTMLElement>('[data-delete-checkpoint]').forEach((btn) => {
      btn.onclick = () => {
        const cpId = btn.getAttribute('data-delete-checkpoint')!;
        if (this.activeProject.checkpoints) {
          this.activeProject.checkpoints = this.activeProject.checkpoints.filter(
            (c) => c.id !== cpId
          );
          this.saveToLocalStorage();
          this.render();
        }
      };
    });

    // Bulk Create Modal bindings
    document.getElementById('btn-open-bulk-create')?.addEventListener('click', () => {
      this.showBulkCreateModal = true;
      this.render();
    });
    document.getElementById('btn-close-bulk-create')?.addEventListener('click', () => {
      this.showBulkCreateModal = false;
      this.render();
    });
    document.getElementById('btn-bulk-insert-placeholders')?.addEventListener('click', () => {
      this.insertBulkTemplatePlaceholders();
    });
    document.getElementById('btn-modal-insert-placeholders')?.addEventListener('click', () => {
      this.insertBulkTemplatePlaceholders();
    });
    document.getElementById('btn-bulk-add-row')?.addEventListener('click', () => {
      this.bulkDatasetRows.push(['Jordan Vance', 'Creative Lead', 'Vance Studio']);
      this.render();
    });
    this.root.querySelectorAll<HTMLElement>('[data-bulk-del-row]').forEach((btn) => {
      btn.onclick = () => {
        const rIdx = Number(btn.getAttribute('data-bulk-del-row'));
        if (this.bulkDatasetRows.length > 1) {
          this.bulkDatasetRows.splice(rIdx, 1);
          this.render();
        }
      };
    });
    this.root.querySelectorAll<HTMLInputElement>('[data-bulk-cell]').forEach((inp) => {
      inp.oninput = () => {
        const [r, c] = inp.getAttribute('data-bulk-cell')!.split('-').map(Number);
        if (this.bulkDatasetRows[r]) {
          this.bulkDatasetRows[r][c] = inp.value;
        }
      };
    });
    document.getElementById('btn-run-bulk-create')?.addEventListener('click', () => {
      this.runBulkCreateMerge();
    });

    // Keyboard Shortcuts Modal bindings
    document.getElementById('btn-toggle-shortcuts')?.addEventListener('click', () => {
      this.showShortcutsModal = !this.showShortcutsModal;
      this.render();
    });
    document.getElementById('btn-footer-shortcuts')?.addEventListener('click', () => {
      this.showShortcutsModal = !this.showShortcutsModal;
      this.render();
    });
    document.getElementById('btn-close-shortcuts')?.addEventListener('click', () => {
      this.showShortcutsModal = false;
      this.render();
    });
    document.getElementById('btn-done-shortcuts')?.addEventListener('click', () => {
      this.showShortcutsModal = false;
      this.render();
    });
    this.root.querySelectorAll<HTMLElement>('[data-run-shortcut]').forEach((btn) => {
      btn.onclick = () => {
        const cmd = btn.getAttribute('data-run-shortcut') as Parameters<
          CanvasCraftStudio['executeShortcutCommand']
        >[0];
        this.showShortcutsModal = false;
        this.executeShortcutCommand(cmd);
      };
    });

    const localeSelect = document.getElementById(
      'studio-locale-select'
    ) as HTMLSelectElement | null;
    if (localeSelect) {
      localeSelect.onchange = () => {
        const nextLocale = localeSelect.value as StudioLocaleKind;
        if (STUDIO_LOCALES[nextLocale]) {
          this.studioLocale = nextLocale;
          this.syncDocumentDirection();
          this.saveToLocalStorage();
          this.render();
          const meta = STUDIO_LOCALES[nextLocale];
          this.showToast(
            `Switched Studio to ${meta.nativeLabel} (${meta.dir.toUpperCase()} workspace)`
          );
        }
      };
    }

    // Sidebar tab switching
    this.root.querySelectorAll<HTMLElement>('[data-sidebar-tab]').forEach((btn) => {
      btn.onclick = () => {
        const nextTab = btn.getAttribute('data-sidebar-tab') as SidebarTab;
        this.activeSidebarTab = nextTab;
        if (nextTab !== 'draw') {
          this.isDrawingMode = false;
        }
        if (nextTab === 'text') {
          this.isTextPlacementMode = true;
          this.showToast(
            'Text Tool ready — configure Font, Size & Color or click anywhere on the canvas to add text'
          );
        } else {
          this.isTextPlacementMode = false;
        }
        this.render();
      };
    });

    // Theme toggle
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      this.isDarkTheme = !this.isDarkTheme;
      if (this.isDarkTheme) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      this.saveToLocalStorage();
      this.render();
    });

    // Template search & filter
    const tplSearch = document.getElementById('sidebar-tpl-search') as HTMLInputElement | null;
    if (tplSearch) {
      tplSearch.oninput = () => {
        this.templateSearch = tplSearch.value;
        this.render();
        const refocused = document.getElementById('sidebar-tpl-search') as HTMLInputElement | null;
        if (refocused) {
          refocused.focus();
          refocused.setSelectionRange(refocused.value.length, refocused.value.length);
        }
      };
    }

    this.root.querySelectorAll<HTMLElement>('[data-tpl-cat]').forEach((btn) => {
      btn.onclick = () => {
        this.templateFilter = btn.getAttribute('data-tpl-cat') as typeof this.templateFilter;
        this.render();
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-apply-tpl]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-apply-tpl')!;
        const tpl = TEMPLATE_PRESETS.find((t) => t.id === id);
        if (tpl) this.applyTemplate(tpl, false);
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-new-from-tpl]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-new-from-tpl')!;
        const tpl = TEMPLATE_PRESETS.find((t) => t.id === id);
        if (tpl) this.applyTemplate(tpl, true);
      };
    });

    // Bind dragstart on all draggable sidebar items
    this.root.querySelectorAll<HTMLElement>('[data-drag-payload]').forEach((item) => {
      item.ondragstart = (e: DragEvent) => {
        const raw = item.getAttribute('data-drag-payload');
        if (!raw) return;
        try {
          this.draggedSidebarItem = JSON.parse(raw);
        } catch {
          this.draggedSidebarItem = null;
        }
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData('application/json', raw);
          e.dataTransfer.setData('text/plain', raw);
        }
      };
      item.ondragend = () => {
        this.draggedSidebarItem = null;
        const dropPreview = document.getElementById('studio-drop-preview');
        if (dropPreview) {
          dropPreview.classList.add('hidden');
          dropPreview.classList.remove('flex');
        }
      };
    });

    // Quick insert click for draggable preset cards
    this.root.querySelectorAll<HTMLElement>('[data-quick-insert]').forEach((card) => {
      card.onclick = () => {
        const raw = card.getAttribute('data-quick-insert');
        if (!raw) return;
        try {
          const payload = JSON.parse(raw) as Partial<DesignElement>;
          this.addElement(payload);
          this.showToast(`Added ${payload.name || 'Element'} to artboard`);
        } catch {
          // ignore
        }
      };
    });

    // Geometric Shapes Palette fill color selector
    this.root.querySelectorAll<HTMLElement>('[data-palette-color]').forEach((btn) => {
      btn.onclick = () => {
        const val = btn.getAttribute('data-palette-color');
        this.paletteShapeColor = val === 'auto' ? null : val;
        this.render();
      };
    });

    const paletteCustomColor = document.getElementById(
      'palette-custom-color'
    ) as HTMLInputElement | null;
    if (paletteCustomColor) {
      paletteCustomColor.oninput = () => {
        this.paletteShapeColor = paletteCustomColor.value;
        this.render();
      };
    }

    // Elements Drawer: Shapes, Stickers, Stock Visuals
    this.root.querySelectorAll<HTMLElement>('[data-add-shape]').forEach((btn) => {
      btn.onclick = () => {
        const kind = btn.getAttribute('data-add-shape') as ShapeKind;
        const defaultColors: Record<ShapeKind, string> = {
          rect: '#6366f1',
          circle: '#ec4899',
          triangle: '#10b981',
          diamond: '#f59e0b',
          hexagon: '#38bdf8',
          star: '#eab308',
          pill: '#a855f7',
          arrow: '#f43f5e',
          line: '#94a3b8',
        };
        this.addElement({
          name: `${kind.charAt(0).toUpperCase() + kind.slice(1)} Shape`,
          type: 'shape',
          shapeKind: kind,
          width: kind === 'line' ? 420 : kind === 'pill' ? 300 : kind === 'rect' ? 260 : 240,
          height: kind === 'line' ? 28 : kind === 'pill' ? 84 : kind === 'rect' ? 180 : 240,
          fill: this.paletteShapeColor || defaultColors[kind] || this.brandKit.colors[1] || '#6366f1',
          borderRadius: kind === 'rect' ? 16 : 0,
        });
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-add-sticker]').forEach((btn) => {
      btn.onclick = () => {
        const kind = btn.getAttribute('data-add-sticker') as StickerKind;
        const primary = btn.getAttribute('data-sticker-primary') || '#6366f1';
        const accent = btn.getAttribute('data-sticker-accent') || '#f43f5e';
        this.addElement({
          name: `Sticker (${kind})`,
          type: 'sticker',
          stickerKind: kind,
          width: 220,
          height: 220,
          fill: primary,
          stroke: accent,
        });
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-add-stock-img]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-add-stock-img')!;
        const vis = BUILTIN_STUDIO_VISUALS.find((v) => v.id === id);
        if (vis) {
          this.addElement({
            name: vis.name,
            type: 'image',
            src: vis.dataUrl,
            width: 520,
            height: 390,
            borderRadius: 16,
            objectFit: 'cover',
          });
        }
      };
    });

    // Text Drawer & Interactive Click-on-Canvas Text Tool Configurator
    document.getElementById('btn-toggle-text-tool')?.addEventListener('click', () => {
      this.isTextPlacementMode = !this.isTextPlacementMode;
      this.isDrawingMode = false;
      this.render();
      this.showToast(
        this.isTextPlacementMode
          ? 'Text Tool active — click anywhere on the canvas to place an editable text element'
          : 'Text Tool deactivated'
      );
    });

    document.getElementById('btn-add-custom-text-now')?.addEventListener('click', () => {
      const loc = STUDIO_LOCALES[this.studioLocale] || STUDIO_LOCALES.en;
      const isRtlLoc = loc.dir === 'rtl';
      const fontSize = Math.max(8, Math.min(300, this.textToolFontSize || 48));
      const boxW = Math.max(220, Math.min(this.activeProject.width - 40, Math.round(fontSize * 9.5)));
      const boxH = Math.max(52, Math.round(fontSize * 1.7));
      this.addElement({
        name: `Text (${this.textToolFontFamily} ${fontSize}px)`,
        type: 'text',
        text: this.textToolDraftText || (isRtlLoc ? loc.sampleHeading : 'Editable Text Layer'),
        fontFamily: this.textToolFontFamily || 'Plus Jakarta Sans',
        fontSize,
        fontWeight: this.textToolFontWeight || 700,
        fontStyle: this.textToolFontStyle || 'normal',
        textDecoration: this.textToolDecoration || 'none',
        textAlign: this.textToolAlign || (isRtlLoc ? 'right' : 'left'),
        textDirection: isRtlLoc ? 'rtl' : 'ltr',
        langCode: loc.code,
        color:
          this.textToolColor ||
          (this.activePage.background === '#ffffff' ? '#0f172a' : '#f8fafc'),
        width: boxW,
        height: boxH,
      });
      if (this.selectedElementId) {
        this.editingTextId = this.selectedElementId;
        this.render();
        const editable = document.querySelector<HTMLElement>(
          `[data-text-edit-id="${this.selectedElementId}"]`
        );
        editable?.focus();
      }
    });

    document.getElementById('btn-focus-canvas-text')?.addEventListener('click', () => {
      if (this.selectedElement && this.selectedElement.type === 'text') {
        this.editingTextId = this.selectedElement.id;
        this.render();
        const editable = document.querySelector<HTMLElement>(
          `[data-text-edit-id="${this.selectedElement.id}"]`
        );
        editable?.focus();
      }
    });

    const sidebarFontSelect = document.getElementById(
      'sidebar-text-font'
    ) as HTMLSelectElement | null;
    if (sidebarFontSelect) {
      sidebarFontSelect.onchange = () => {
        this.textToolFontFamily = sidebarFontSelect.value;
        if (this.selectedElement && this.selectedElement.type === 'text') {
          this.selectedElement.fontFamily = sidebarFontSelect.value;
          this.pushHistorySnapshot(`Changed Font to ${sidebarFontSelect.value}`);
        }
        this.render();
      };
    }

    const applySidebarFontSize = (nextSize: number) => {
      const clamped = Math.max(8, Math.min(300, Math.round(nextSize)));
      this.textToolFontSize = clamped;
      if (this.selectedElement && this.selectedElement.type === 'text') {
        this.selectedElement.fontSize = clamped;
        this.selectedElement.height = Math.max(
          this.selectedElement.height,
          Math.round(clamped * 1.5)
        );
        this.pushHistorySnapshot(`Changed Font Size to ${clamped}px`);
      }
      this.render();
    };

    const sidebarSizeInput = document.getElementById(
      'sidebar-text-size'
    ) as HTMLInputElement | null;
    if (sidebarSizeInput) {
      sidebarSizeInput.onchange = () => {
        applySidebarFontSize(Number(sidebarSizeInput.value) || 48);
      };
    }

    const sidebarSizeSlider = document.getElementById(
      'sidebar-text-size-slider'
    ) as HTMLInputElement | null;
    if (sidebarSizeSlider) {
      sidebarSizeSlider.oninput = () => {
        const val = Number(sidebarSizeSlider.value) || 48;
        this.textToolFontSize = val;
        if (this.selectedElement && this.selectedElement.type === 'text') {
          this.selectedElement.fontSize = val;
          this.renderArtboardOnly();
        }
        if (sidebarSizeInput) sidebarSizeInput.value = String(val);
      };
      sidebarSizeSlider.onchange = () => {
        applySidebarFontSize(Number(sidebarSizeSlider.value) || 48);
      };
    }

    document.getElementById('sidebar-text-size-dec')?.addEventListener('click', () => {
      const cur =
        (this.selectedElement?.type === 'text'
          ? this.selectedElement.fontSize
          : this.textToolFontSize) || 48;
      applySidebarFontSize(cur - 4);
    });

    document.getElementById('sidebar-text-size-inc')?.addEventListener('click', () => {
      const cur =
        (this.selectedElement?.type === 'text'
          ? this.selectedElement.fontSize
          : this.textToolFontSize) || 48;
      applySidebarFontSize(cur + 4);
    });

    this.root.querySelectorAll<HTMLElement>('[data-sidebar-font-size-preset]').forEach((btn) => {
      btn.onclick = () => {
        const sz = Number(btn.getAttribute('data-sidebar-font-size-preset'));
        if (sz) applySidebarFontSize(sz);
      };
    });

    const sidebarColorInput = document.getElementById(
      'sidebar-text-color'
    ) as HTMLInputElement | null;
    if (sidebarColorInput) {
      sidebarColorInput.oninput = () => {
        this.textToolColor = sidebarColorInput.value;
        if (this.selectedElement && this.selectedElement.type === 'text') {
          this.selectedElement.color = sidebarColorInput.value;
          this.renderArtboardOnly();
        }
      };
      sidebarColorInput.onchange = () => {
        this.textToolColor = sidebarColorInput.value;
        if (this.selectedElement && this.selectedElement.type === 'text') {
          this.selectedElement.color = sidebarColorInput.value;
          this.pushHistorySnapshot(`Changed Text Color to ${sidebarColorInput.value}`);
        }
        this.render();
      };
    }

    this.root.querySelectorAll<HTMLElement>('[data-sidebar-text-color-swatch]').forEach((btn) => {
      btn.onclick = () => {
        const sw = btn.getAttribute('data-sidebar-text-color-swatch');
        if (!sw) return;
        this.textToolColor = sw;
        if (this.selectedElement && this.selectedElement.type === 'text') {
          this.selectedElement.color = sw;
          this.pushHistorySnapshot(`Changed Text Color to ${sw}`);
        }
        this.render();
      };
    });

    document.getElementById('sidebar-text-bold')?.addEventListener('click', () => {
      const curW =
        this.selectedElement?.type === 'text'
          ? Number(this.selectedElement.fontWeight || 400)
          : this.textToolFontWeight;
      const nextW = curW >= 700 ? 400 : 700;
      this.textToolFontWeight = nextW;
      if (this.selectedElement && this.selectedElement.type === 'text') {
        this.selectedElement.fontWeight = nextW;
        this.pushHistorySnapshot('Toggled Text Bold');
      }
      this.render();
    });

    document.getElementById('sidebar-text-italic')?.addEventListener('click', () => {
      const curS =
        this.selectedElement?.type === 'text'
          ? this.selectedElement.fontStyle || 'normal'
          : this.textToolFontStyle;
      const nextS = curS === 'italic' ? 'normal' : 'italic';
      this.textToolFontStyle = nextS;
      if (this.selectedElement && this.selectedElement.type === 'text') {
        this.selectedElement.fontStyle = nextS;
        this.pushHistorySnapshot('Toggled Text Italic');
      }
      this.render();
    });

    document.getElementById('sidebar-text-underline')?.addEventListener('click', () => {
      const curD =
        this.selectedElement?.type === 'text'
          ? this.selectedElement.textDecoration || 'none'
          : this.textToolDecoration;
      const nextD = curD === 'underline' ? 'none' : 'underline';
      this.textToolDecoration = nextD;
      if (this.selectedElement && this.selectedElement.type === 'text') {
        this.selectedElement.textDecoration = nextD;
        this.pushHistorySnapshot('Toggled Text Underline');
      }
      this.render();
    });

    this.root.querySelectorAll<HTMLElement>('[data-sidebar-text-align]').forEach((btn) => {
      btn.onclick = () => {
        const al = btn.getAttribute('data-sidebar-text-align') as 'left' | 'center' | 'right';
        this.textToolAlign = al;
        if (this.selectedElement && this.selectedElement.type === 'text') {
          this.selectedElement.textAlign = al;
          this.pushHistorySnapshot(`Aligned Text ${al}`);
        }
        this.render();
      };
    });

    document.getElementById('btn-add-heading')?.addEventListener('click', () => {
      const loc = STUDIO_LOCALES[this.studioLocale] || STUDIO_LOCALES.en;
      const isRtlLoc = loc.dir === 'rtl';
      this.addElement({
        name: isRtlLoc ? `${loc.name} Heading` : 'Heading Text',
        type: 'text',
        text: loc.sampleHeading,
        fontFamily: isRtlLoc ? loc.defaultFont : this.textToolFontFamily || 'Bricolage Grotesque',
        fontSize: 72,
        fontWeight: 700,
        textDirection: isRtlLoc ? 'rtl' : 'ltr',
        textAlign: isRtlLoc ? 'right' : 'left',
        langCode: loc.code,
        color: this.textToolColor || (this.activePage.background === '#ffffff' ? '#0f172a' : '#f8fafc'),
        width: 720,
        height: 110,
      });
    });

    document.getElementById('btn-add-subheading')?.addEventListener('click', () => {
      const loc = STUDIO_LOCALES[this.studioLocale] || STUDIO_LOCALES.en;
      const isRtlLoc = loc.dir === 'rtl';
      this.addElement({
        name: isRtlLoc ? `${loc.name} Subheading` : 'Subheading Text',
        type: 'text',
        text: loc.sampleSubheading,
        fontFamily: isRtlLoc ? loc.defaultFont : this.textToolFontFamily || 'Plus Jakarta Sans',
        fontSize: 42,
        fontWeight: 600,
        textDirection: isRtlLoc ? 'rtl' : 'ltr',
        textAlign: isRtlLoc ? 'right' : 'left',
        langCode: loc.code,
        color: this.textToolColor || (this.activePage.background === '#ffffff' ? '#334155' : '#cbd5e1'),
        width: 680,
        height: 85,
      });
    });

    document.getElementById('btn-add-body')?.addEventListener('click', () => {
      const loc = STUDIO_LOCALES[this.studioLocale] || STUDIO_LOCALES.en;
      const isRtlLoc = loc.dir === 'rtl';
      this.addElement({
        name: isRtlLoc ? `${loc.name} Body` : 'Body Paragraph',
        type: 'text',
        text: isRtlLoc
          ? loc.sampleSubheading
          : 'Add supporting editorial copy, key metrics, or event details directly on your artboard.',
        fontFamily: isRtlLoc ? loc.defaultFont : this.textToolFontFamily || 'Plus Jakarta Sans',
        fontSize: 26,
        fontWeight: 400,
        textDirection: isRtlLoc ? 'rtl' : 'ltr',
        textAlign: isRtlLoc ? 'right' : 'left',
        langCode: loc.code,
        color: this.textToolColor || (this.activePage.background === '#ffffff' ? '#475569' : '#94a3b8'),
        width: 600,
        height: 95,
      });
    });

    const sidebarTextArea = document.getElementById(
      'sidebar-text-content'
    ) as HTMLTextAreaElement | null;
    if (sidebarTextArea) {
      sidebarTextArea.oninput = () => {
        this.textToolDraftText = sidebarTextArea.value;
        if (this.selectedElement && this.selectedElement.type === 'text') {
          this.selectedElement.text = sidebarTextArea.value;
          this.saveToLocalStorage();
          this.renderArtboardOnly();
        }
      };
      sidebarTextArea.onblur = () => {
        if (this.selectedElement && this.selectedElement.type === 'text') {
          this.pushHistorySnapshot('Edited Text Content');
        }
      };
    }

    const sidebarFxColor = document.getElementById(
      'sidebar-text-fx-color'
    ) as HTMLInputElement | null;
    if (sidebarFxColor && this.selectedElement?.type === 'text') {
      sidebarFxColor.oninput = () => {
        if (this.selectedElement) {
          this.selectedElement.textEffectColor = sidebarFxColor.value;
          this.renderArtboardOnly();
        }
      };
      sidebarFxColor.onchange = () => this.pushHistorySnapshot();
    }

    // Sidebar Rich Typography Pro bindings
    document.getElementById('sidebar-text-list-bullet')?.addEventListener('click', () => {
      if (this.selectedElement?.type === 'text') {
        this.toggleTextListStyle(this.selectedElement, 'bullet');
      }
    });
    document.getElementById('sidebar-text-list-number')?.addEventListener('click', () => {
      if (this.selectedElement?.type === 'text') {
        this.toggleTextListStyle(this.selectedElement, 'number');
      }
    });
    const sidebarTransformSelect = document.getElementById(
      'sidebar-text-transform'
    ) as HTMLSelectElement | null;
    if (sidebarTransformSelect && this.selectedElement?.type === 'text') {
      sidebarTransformSelect.onchange = () => {
        if (this.selectedElement) {
          this.selectedElement.textTransform = sidebarTransformSelect.value as TextTransformKind;
          this.pushHistorySnapshot('Changed Text Case Transform');
          this.render();
        }
      };
    }
    const sidebarTextBgColor = document.getElementById(
      'sidebar-text-bg-color'
    ) as HTMLInputElement | null;
    if (sidebarTextBgColor && this.selectedElement?.type === 'text') {
      sidebarTextBgColor.oninput = () => {
        if (this.selectedElement) {
          this.selectedElement.textBgColor = sidebarTextBgColor.value;
          if (!this.selectedElement.textBgPadding) this.selectedElement.textBgPadding = 12;
          if (!this.selectedElement.textBgRadius) this.selectedElement.textBgRadius = 12;
          this.renderArtboardOnly();
        }
      };
      sidebarTextBgColor.onchange = () => {
        this.pushHistorySnapshot('Applied Text Highlight Pill');
        this.render();
      };
    }
    document.getElementById('sidebar-text-bg-clear')?.addEventListener('click', () => {
      if (this.selectedElement?.type === 'text') {
        this.selectedElement.textBgColor = undefined;
        this.pushHistorySnapshot('Cleared Text Highlight Pill');
        this.render();
      }
    });
    const sidebarLetterSpacing = document.getElementById(
      'sidebar-letter-spacing'
    ) as HTMLInputElement | null;
    if (sidebarLetterSpacing && this.selectedElement?.type === 'text') {
      sidebarLetterSpacing.oninput = () => {
        if (this.selectedElement) {
          this.selectedElement.letterSpacing = Number(sidebarLetterSpacing.value);
          this.renderArtboardOnly();
        }
      };
      sidebarLetterSpacing.onchange = () => {
        this.pushHistorySnapshot();
        this.render();
      };
    }
    const sidebarLineHeight = document.getElementById(
      'sidebar-line-height'
    ) as HTMLInputElement | null;
    if (sidebarLineHeight && this.selectedElement?.type === 'text') {
      sidebarLineHeight.oninput = () => {
        if (this.selectedElement) {
          this.selectedElement.lineHeight = Number(sidebarLineHeight.value);
          this.renderArtboardOnly();
        }
      };
      sidebarLineHeight.onchange = () => {
        this.pushHistorySnapshot();
        this.render();
      };
    }

    // Charts Drawer live data editor
    document.getElementById('btn-chart-add-row')?.addEventListener('click', () => {
      if (this.selectedElement && this.selectedElement.type === 'chart') {
        if (!this.selectedElement.chartData) this.selectedElement.chartData = [];
        this.selectedElement.chartData.push({
          label: `Q${this.selectedElement.chartData.length + 1}`,
          value: 65,
        });
        this.pushHistorySnapshot();
        this.render();
      }
    });

    this.root.querySelectorAll<HTMLInputElement>('[data-chart-label-idx]').forEach((inp) => {
      inp.oninput = () => {
        const idx = Number(inp.getAttribute('data-chart-label-idx'));
        if (this.selectedElement?.chartData?.[idx]) {
          this.selectedElement.chartData[idx].label = inp.value;
          this.saveToLocalStorage();
          this.renderArtboardOnly();
        }
      };
    });

    this.root.querySelectorAll<HTMLInputElement>('[data-chart-val-idx]').forEach((inp) => {
      inp.oninput = () => {
        const idx = Number(inp.getAttribute('data-chart-val-idx'));
        if (this.selectedElement?.chartData?.[idx]) {
          this.selectedElement.chartData[idx].value = Number(inp.value) || 0;
          this.saveToLocalStorage();
          this.renderArtboardOnly();
        }
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-chart-del-idx]').forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute('data-chart-del-idx'));
        if (this.selectedElement?.chartData && this.selectedElement.chartData.length > 1) {
          this.selectedElement.chartData.splice(idx, 1);
          this.pushHistorySnapshot();
          this.render();
        }
      };
    });

    // Uploads Drawer
    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.onchange = () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const img = new Image();
          img.onload = () => {
            const maxDim = 540;
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const asset: UploadedAsset = {
              id: this.uid('up'),
              name: file.name.replace(/\.[^.]+$/, ''),
              dataUrl,
              width: Math.round(img.width * scale),
              height: Math.round(img.height * scale),
              createdAt: Date.now(),
            };
            this.uploads.unshift(asset);
            this.saveToLocalStorage();
            this.addElement({
              name: asset.name,
              type: 'image',
              src: asset.dataUrl,
              width: asset.width,
              height: asset.height,
              borderRadius: 12,
              objectFit: 'cover',
            });
            this.showToast(`Uploaded "${asset.name}" to LocalStorage`);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      };
    }

    this.root.querySelectorAll<HTMLElement>('[data-insert-upload]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-insert-upload')!;
        const asset = this.uploads.find((u) => u.id === id);
        if (asset) {
          this.addElement({
            name: asset.name,
            type: 'image',
            src: asset.dataUrl,
            width: asset.width,
            height: asset.height,
            borderRadius: 12,
            objectFit: 'cover',
          });
        }
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-delete-upload]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete-upload')!;
        this.uploads = this.uploads.filter((u) => u.id !== id);
        this.saveToLocalStorage();
        this.render();
      };
    });

    const jsonImport = document.getElementById('json-import-input') as HTMLInputElement | null;
    if (jsonImport) {
      jsonImport.onchange = () => {
        const file = jsonImport.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const imported = JSON.parse(reader.result as string) as DesignProject;
            if (imported && imported.pages && imported.width && imported.height) {
              imported.id = this.uid('proj');
              this.projects.unshift(imported);
              this.activeProject = imported;
              this.activePageIndex = 0;
              this.fitArtboardToViewport();
              this.pushHistorySnapshot();
              this.render();
              this.showToast(`Imported project "${imported.name}"`);
            }
          } catch {
            this.showToast('Invalid project JSON file');
          }
        };
        reader.readAsText(file);
      };
    }

    // Draw Drawer
    document.getElementById('btn-toggle-draw-mode')?.addEventListener('click', () => {
      this.isDrawingMode = !this.isDrawingMode;
      if (this.isDrawingMode) this.clearSelection();
      this.render();
    });
    document.getElementById('btn-exit-draw')?.addEventListener('click', () => {
      this.isDrawingMode = false;
      this.render();
    });

    const brushWidthSlider = document.getElementById(
      'drawer-brush-width'
    ) as HTMLInputElement | null;
    if (brushWidthSlider) {
      brushWidthSlider.oninput = () => {
        this.brushWidth = Number(brushWidthSlider.value);
        this.render();
      };
    }

    const brushOpacitySlider = document.getElementById(
      'drawer-brush-opacity'
    ) as HTMLInputElement | null;
    if (brushOpacitySlider) {
      brushOpacitySlider.oninput = () => {
        this.brushOpacity = Number(brushOpacitySlider.value) / 100;
        this.render();
      };
    }

    this.root.querySelectorAll<HTMLElement>('[data-brush-swatch]').forEach((btn) => {
      btn.onclick = () => {
        this.brushColor = btn.getAttribute('data-brush-swatch')!;
        this.isDrawingMode = true;
        this.render();
      };
    });

    // Apps Drawer: Multi-Frame Grids, QR Code Generator & Tables
    this.root.querySelectorAll<HTMLElement>('[data-add-grid]').forEach((btn) => {
      btn.onclick = () => {
        const layout = btn.getAttribute('data-add-grid') as GridLayoutKind;
        const stockImgs = BUILTIN_STUDIO_VISUALS.map((v) => v.dataUrl);
        this.addElement({
          name: `Photo Grid (${layout})`,
          type: 'grid',
          gridLayout: layout,
          gridGap: 14,
          gridCells: [stockImgs[0] || '', stockImgs[1] || '', stockImgs[2] || '', stockImgs[0] || ''],
          width: 640,
          height: 460,
          borderRadius: 16,
        });
        this.showToast('Added Photo Layout Grid — drag any photo onto individual cells!');
      };
    });

    const qrUrlInput = document.getElementById('sidebar-qr-url') as HTMLInputElement | null;
    if (qrUrlInput) {
      qrUrlInput.oninput = () => {
        this.qrDraftUrl = qrUrlInput.value;
      };
    }
    const qrFgInput = document.getElementById('sidebar-qr-fg') as HTMLInputElement | null;
    if (qrFgInput) {
      qrFgInput.oninput = () => {
        this.qrDraftFg = qrFgInput.value;
      };
    }
    const qrBgInput = document.getElementById('sidebar-qr-bg') as HTMLInputElement | null;
    if (qrBgInput) {
      qrBgInput.oninput = () => {
        this.qrDraftBg = qrBgInput.value;
      };
    }
    document.getElementById('btn-insert-qr')?.addEventListener('click', () => {
      this.addElement({
        name: `QR (${this.qrDraftUrl.slice(0, 18)})`,
        type: 'qr',
        qrText: this.qrDraftUrl || 'https://canvascraft.studio',
        fill: this.qrDraftFg,
        qrBgColor: this.qrDraftBg,
        width: 240,
        height: 240,
        borderRadius: 12,
      });
      this.showToast('Generated vector QR code on artboard');
    });

    document.getElementById('btn-insert-table')?.addEventListener('click', () => {
      this.addElement({
        name: 'Data Table',
        type: 'table',
        width: 620,
        height: 280,
        tableHeaderBg: this.brandKit.colors[1] || '#4f46e5',
        tableStriped: true,
        tableData: [
          ['Metric', 'Q1 Target', 'Q2 Actual'],
          ['Conversion', '4.2%', '6.8%'],
          ['Retention', '88%', '94%'],
        ],
      });
      this.showToast('Inserted editable 3×3 Data Table');
    });

    document.getElementById('sidebar-table-add-row')?.addEventListener('click', () => {
      if (this.selectedElement?.type === 'table' && this.selectedElement.tableData) {
        const cols = this.selectedElement.tableData[0]?.length || 3;
        this.selectedElement.tableData.push(Array(cols).fill('New Cell'));
        this.selectedElement.height += 56;
        this.pushHistorySnapshot();
        this.render();
      }
    });
    document.getElementById('sidebar-table-del-row')?.addEventListener('click', () => {
      if (
        this.selectedElement?.type === 'table' &&
        this.selectedElement.tableData &&
        this.selectedElement.tableData.length > 1
      ) {
        this.selectedElement.tableData.pop();
        this.selectedElement.height = Math.max(90, this.selectedElement.height - 54);
        this.pushHistorySnapshot();
        this.render();
      }
    });
    document.getElementById('sidebar-table-add-col')?.addEventListener('click', () => {
      if (this.selectedElement?.type === 'table' && this.selectedElement.tableData) {
        this.selectedElement.tableData.forEach((r, i) => r.push(i === 0 ? 'Header' : 'Value'));
        this.selectedElement.width += 140;
        this.pushHistorySnapshot();
        this.render();
      }
    });
    document.getElementById('sidebar-table-del-col')?.addEventListener('click', () => {
      if (
        this.selectedElement?.type === 'table' &&
        this.selectedElement.tableData &&
        (this.selectedElement.tableData[0]?.length || 0) > 1
      ) {
        this.selectedElement.tableData.forEach((r) => r.pop());
        this.selectedElement.width = Math.max(160, this.selectedElement.width - 130);
        this.pushHistorySnapshot();
        this.render();
      }
    });

    this.root.querySelectorAll<HTMLInputElement>('[data-table-cell]').forEach((inp) => {
      inp.oninput = () => {
        const [r, c] = inp.getAttribute('data-table-cell')!.split('-').map(Number);
        if (this.selectedElement?.tableData?.[r]) {
          this.selectedElement.tableData[r][c] = inp.value;
          this.saveToLocalStorage();
          this.renderArtboardOnly();
        }
      };
    });

    // Feature 6: Smart Flowchart Connectors builder in Apps Drawer
    const connFromSelect = document.getElementById('sidebar-conn-from') as HTMLSelectElement | null;
    if (connFromSelect) {
      connFromSelect.onchange = () => {
        this.connectorDraftFromId = connFromSelect.value;
      };
    }
    const connToSelect = document.getElementById('sidebar-conn-to') as HTMLSelectElement | null;
    if (connToSelect) {
      connToSelect.onchange = () => {
        this.connectorDraftToId = connToSelect.value;
      };
    }
    const connStyleSelect = document.getElementById('sidebar-conn-style') as HTMLSelectElement | null;
    if (connStyleSelect) {
      connStyleSelect.onchange = () => {
        this.connectorDraftStyle = connStyleSelect.value as ConnectorStyleKind;
      };
    }
    const connLabelInput = document.getElementById('sidebar-conn-label') as HTMLInputElement | null;
    if (connLabelInput) {
      connLabelInput.oninput = () => {
        this.connectorDraftLabel = connLabelInput.value;
      };
    }
    document.getElementById('btn-insert-connector')?.addEventListener('click', () => {
      const candidates = this.activePage.elements.filter(
        (item) => item.type !== 'connector' && !item.hidden
      );
      const fromEl =
        candidates.find((c) => c.id === this.connectorDraftFromId) || candidates[0] || null;
      const toEl =
        candidates.find((c) => c.id === this.connectorDraftToId && c.id !== fromEl?.id) ||
        candidates.find((c) => c.id !== fromEl?.id) ||
        null;

      this.addElement({
        name: this.connectorDraftLabel
          ? `Connector (${this.connectorDraftLabel})`
          : 'Smart Flowchart Connector',
        type: 'connector',
        connectorStyle: this.connectorDraftStyle || 'curved',
        fromElementId: fromEl?.id,
        toElementId: toEl?.id,
        connectorLabel: this.connectorDraftLabel,
        connectorArrowEnd: true,
        stroke: '#38bdf8',
        strokeWidth: 4,
        x: 160,
        y: 160,
        width: 360,
        height: 180,
      });
      this.syncSmartConnectors();
      this.render();
      this.showToast(
        fromEl && toEl
          ? `Linked "${fromEl.name}" → "${toEl.name}" with smart connector`
          : 'Inserted Smart Flowchart Connector'
      );
    });

    document.getElementById('btn-sidebar-replay-anim')?.addEventListener('click', () => {
      this.replayCanvasAnimations();
    });

    // Custom Gradient Builder in Backdrop Drawer
    const gradStartInp = document.getElementById('grad-start-color') as HTMLInputElement | null;
    if (gradStartInp) {
      gradStartInp.oninput = () => {
        this.customGradStart = gradStartInp.value;
        this.render();
      };
    }
    const gradEndInp = document.getElementById('grad-end-color') as HTMLInputElement | null;
    if (gradEndInp) {
      gradEndInp.oninput = () => {
        this.customGradEnd = gradEndInp.value;
        this.render();
      };
    }
    const gradAngleInp = document.getElementById('grad-angle-slider') as HTMLInputElement | null;
    if (gradAngleInp) {
      gradAngleInp.oninput = () => {
        this.customGradAngle = Number(gradAngleInp.value);
        this.render();
      };
    }
    document.getElementById('btn-apply-grad-bg')?.addEventListener('click', () => {
      this.activePage.backgroundGradient = `linear-gradient(${this.customGradAngle}deg, ${this.customGradStart} 0%, ${this.customGradEnd} 100%)`;
      this.pushHistorySnapshot();
      this.render();
      this.showToast('Applied custom gradient to Page Background');
    });
    document.getElementById('btn-apply-grad-shape')?.addEventListener('click', () => {
      if (this.selectedElement && this.selectedElement.type === 'shape') {
        this.selectedElement.fillGradient = `linear-gradient(${this.customGradAngle}deg, ${this.customGradStart} 0%, ${this.customGradEnd} 100%)`;
        this.pushHistorySnapshot();
        this.render();
        this.showToast('Applied custom gradient to selected shape');
      } else {
        this.showToast('Select a shape layer first to apply a custom shape gradient');
      }
    });

    // Background Drawer
    this.root.querySelectorAll<HTMLElement>('[data-bg-color]').forEach((btn) => {
      btn.onclick = () => {
        this.activePage.background = btn.getAttribute('data-bg-color')!;
        this.activePage.backgroundGradient = undefined;
        this.pushHistorySnapshot();
        this.render();
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-bg-gradient]').forEach((btn) => {
      btn.onclick = () => {
        this.activePage.backgroundGradient = btn.getAttribute('data-bg-gradient')!;
        this.pushHistorySnapshot();
        this.render();
      };
    });

    // Layers Panel (Left Drawer & Right Dock)
    document.getElementById('btn-toggle-layers-panel')?.addEventListener('click', () => {
      this.showRightLayersPanel = !this.showRightLayersPanel;
      this.render();
    });
    document.getElementById('btn-close-right-layers')?.addEventListener('click', () => {
      this.showRightLayersPanel = false;
      this.render();
    });

    this.root.querySelectorAll<HTMLInputElement>('[data-layer-search-input]').forEach((inp) => {
      inp.oninput = () => {
        this.layerSearchQuery = inp.value;
        this.render();
        const refocused = this.root.querySelector<HTMLInputElement>('[data-layer-search-input]');
        if (refocused) {
          refocused.focus();
          refocused.setSelectionRange(refocused.value.length, refocused.value.length);
        }
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layer-filter]').forEach((btn) => {
      btn.onclick = () => {
        this.layerFilter = btn.getAttribute('data-layer-filter') as
          | 'all'
          | 'visible'
          | 'hidden'
          | 'locked';
        this.render();
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layers-show-all]').forEach((btn) => {
      btn.onclick = () => {
        this.activePage.elements.forEach((el) => {
          el.hidden = false;
        });
        this.pushHistorySnapshot();
        this.render();
        this.showToast('All layers are now visible');
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layers-unlock-all]').forEach((btn) => {
      btn.onclick = () => {
        this.activePage.elements.forEach((el) => {
          el.locked = false;
        });
        this.pushHistorySnapshot();
        this.render();
        this.showToast('All layers unlocked');
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layer-order-selected]').forEach((btn) => {
      btn.onclick = () => {
        const dir = btn.getAttribute('data-layer-order-selected') as
          | 'top'
          | 'bottom'
          | 'up'
          | 'down';
        if (this.selectedElementId) {
          this.reorderLayer(this.selectedElementId, dir);
          const labels: Record<string, string> = {
            top: 'Brought layer to Front',
            bottom: 'Sent layer to Back',
            up: 'Moved layer Forward',
            down: 'Moved layer Backward',
          };
          this.showToast(labels[dir] || 'Reordered layer');
        }
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layer-select]').forEach((row) => {
      row.onclick = (e: MouseEvent) => {
        const id = row.getAttribute('data-layer-select')!;
        this.selectSingleOrGroup(id, e.shiftKey);
        this.render();
      };
    });

    // Drag-and-drop layer reordering inside the Layers panel
    this.root.querySelectorAll<HTMLElement>('[data-layer-drag-id]').forEach((row) => {
      const dragId = row.getAttribute('data-layer-drag-id')!;
      row.ondragstart = (e: DragEvent) => {
        this.draggedLayerId = dragId;
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', dragId);
        }
      };
      row.ondragover = (e: DragEvent) => {
        e.preventDefault();
        if (this.draggedLayerId && this.draggedLayerId !== dragId) {
          row.classList.add('ring-2', 'ring-indigo-400');
        }
      };
      row.ondragleave = () => {
        row.classList.remove('ring-2', 'ring-indigo-400');
      };
      row.ondrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        row.classList.remove('ring-2', 'ring-indigo-400');
        const sourceId = this.draggedLayerId;
        this.draggedLayerId = null;
        if (!sourceId || sourceId === dragId) return;

        const list = this.activePage.elements;
        const fromIdx = list.findIndex((item) => item.id === sourceId);
        const toIdx = list.findIndex((item) => item.id === dragId);
        if (fromIdx < 0 || toIdx < 0) return;

        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        this.selectedElementId = moved.id;
        this.selectedElementIds = [moved.id];
        this.pushHistorySnapshot();
        this.render();
        this.showToast(`Moved "${moved.name}" in layer stack`);
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layer-top]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this.reorderLayer(btn.getAttribute('data-layer-top')!, 'top');
        this.showToast('Brought layer to Front');
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layer-bottom]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this.reorderLayer(btn.getAttribute('data-layer-bottom')!, 'bottom');
        this.showToast('Sent layer to Back');
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layer-up]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this.reorderLayer(btn.getAttribute('data-layer-up')!, 'up');
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layer-down]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this.reorderLayer(btn.getAttribute('data-layer-down')!, 'down');
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layer-vis]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-layer-vis')!;
        const el = this.activePage.elements.find((item) => item.id === id);
        if (el) {
          el.hidden = !el.hidden;
          if (el.hidden && this.selectedElementIds.includes(id)) {
            this.selectedElementIds = this.selectedElementIds.filter((item) => item !== id);
            if (this.selectedElementId === id) {
              this.selectedElementId = this.selectedElementIds[0] || null;
            }
          }
          this.pushHistorySnapshot();
          this.render();
          this.showToast(el.hidden ? `Hidden "${el.name}"` : `Shown "${el.name}"`);
        }
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layer-lock]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-layer-lock')!;
        const el = this.activePage.elements.find((item) => item.id === id);
        if (el) {
          el.locked = !el.locked;
          this.pushHistorySnapshot();
          this.render();
          this.showToast(el.locked ? `Locked "${el.name}"` : `Unlocked "${el.name}"`);
        }
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-layer-del]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-layer-del')!;
        this.deleteElement(id);
      };
    });

    // Contextual Property Bar Bindings
    this.bindContextualToolbarEvents();

    // Multi-Page Bar, Speaker Notes, Transitions, Slide Grid View & Zoom Controls
    this.root.querySelectorAll<HTMLElement>('[data-select-page]').forEach((btn) => {
      btn.onclick = () => {
        this.activePageIndex = Number(btn.getAttribute('data-select-page'));
        this.clearSelection();
        this.render();
      };
    });

    document.getElementById('btn-toggle-notes')?.addEventListener('click', () => {
      this.showNotesDrawer = !this.showNotesDrawer;
      this.render();
    });
    document.getElementById('btn-close-notes')?.addEventListener('click', () => {
      this.showNotesDrawer = false;
      this.render();
    });
    const notesInput = document.getElementById('page-speaker-notes-input') as HTMLTextAreaElement | null;
    if (notesInput) {
      notesInput.oninput = () => {
        this.activePage.speakerNotes = notesInput.value;
        this.saveToLocalStorage();
      };
    }

    const pageTransSelect = document.getElementById('page-transition-select') as HTMLSelectElement | null;
    if (pageTransSelect) {
      pageTransSelect.onchange = () => {
        this.activePage.transition = pageTransSelect.value as PageTransitionKind;
        this.saveToLocalStorage();
        this.showToast(`Slide transition set to "${this.activePage.transition}"`);
      };
    }

    document.getElementById('btn-toggle-grid-view')?.addEventListener('click', () => {
      this.showGridViewModal = true;
      this.render();
    });
    document.getElementById('btn-close-grid-view')?.addEventListener('click', () => {
      this.showGridViewModal = false;
      this.render();
    });
    this.root.querySelectorAll<HTMLElement>('[data-grid-jump-page]').forEach((card) => {
      card.onclick = () => {
        this.activePageIndex = Number(card.getAttribute('data-grid-jump-page'));
        this.showGridViewModal = false;
        this.clearSelection();
        this.render();
      };
    });
    this.root.querySelectorAll<HTMLElement>('[data-grid-move-left]').forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute('data-grid-move-left'));
        if (idx > 0) {
          const [moved] = this.activeProject.pages.splice(idx, 1);
          this.activeProject.pages.splice(idx - 1, 0, moved);
          this.activePageIndex = idx - 1;
          this.pushHistorySnapshot();
          this.render();
        }
      };
    });
    this.root.querySelectorAll<HTMLElement>('[data-grid-move-right]').forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute('data-grid-move-right'));
        if (idx < this.activeProject.pages.length - 1) {
          const [moved] = this.activeProject.pages.splice(idx, 1);
          this.activeProject.pages.splice(idx + 1, 0, moved);
          this.activePageIndex = idx + 1;
          this.pushHistorySnapshot();
          this.render();
        }
      };
    });

    document.getElementById('btn-add-page')?.addEventListener('click', () => {
      const nextNum = this.activeProject.pages.length + 1;
      this.activeProject.pages.push({
        id: this.uid('page'),
        title: `Slide ${nextNum}`,
        background: this.activePage.background,
        backgroundPattern: this.activePage.backgroundPattern,
        elements: [],
      });
      this.activePageIndex = this.activeProject.pages.length - 1;
      this.clearSelection();
      this.pushHistorySnapshot();
      this.render();
      this.showToast(`Added Page ${nextNum}`);
    });

    document.getElementById('btn-dup-page')?.addEventListener('click', () => {
      const copy: DesignPage = JSON.parse(JSON.stringify(this.activePage));
      copy.id = this.uid('page');
      copy.title = `${this.activePage.title} Copy`;
      copy.elements = copy.elements.map((el) => ({ ...el, id: this.uid('el') }));
      this.activeProject.pages.splice(this.activePageIndex + 1, 0, copy);
      this.activePageIndex++;
      this.pushHistorySnapshot();
      this.render();
      this.showToast('Page duplicated');
    });

    document.getElementById('btn-del-page')?.addEventListener('click', () => {
      if (this.activeProject.pages.length <= 1) return;
      this.activeProject.pages.splice(this.activePageIndex, 1);
      this.activePageIndex = Math.max(0, this.activePageIndex - 1);
      this.clearSelection();
      this.pushHistorySnapshot();
      this.render();
      this.showToast('Page deleted');
    });

    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      this.zoom = Math.min(2.0, Number((this.zoom + 0.1).toFixed(2)));
      this.render();
    });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      this.zoom = Math.max(0.2, Number((this.zoom - 0.1).toFixed(2)));
      this.render();
    });
    document.getElementById('btn-zoom-fit')?.addEventListener('click', () => {
      this.fitArtboardToViewport();
      this.render();
    });

    // Projects Hub & Brand Kit Views
    this.bindSecondaryViewEvents();
  }

  private bindContextualToolbarEvents(): void {
    // Alignment Toolbar target mode buttons (Canvas, Canvas Group, Selection Bounds)
    this.root.querySelectorAll<HTMLElement>('[data-align-target]').forEach((btn) => {
      btn.onclick = () => {
        const target = btn.getAttribute('data-align-target') as
          | 'canvas'
          | 'canvas-group'
          | 'selection';
        if ((target === 'selection' || target === 'canvas-group') && this.selectedElementIds.length < 2) {
          this.showToast(
            'Select 2+ objects (Shift+Click, drag marquee, or click Select All) to use multi-object group/bounds alignment.'
          );
          return;
        }
        this.alignRelativeTo = target;
        this.render();
      };
    });

    // Unified Snap Alignment buttons (Left, Center H, Right, Top, Center V, Bottom, Center Both)
    this.root.querySelectorAll<HTMLElement>('[data-snap-align]').forEach((btn) => {
      btn.onclick = () => {
        const pos = btn.getAttribute('data-snap-align') as
          | 'left'
          | 'center'
          | 'right'
          | 'top'
          | 'middle'
          | 'bottom'
          | 'center-both';
        this.alignSelectedElements(pos);
      };
    });

    // Direct Canvas Snap buttons inside multi-selection contextual bar
    this.root.querySelectorAll<HTMLElement>('[data-canvas-snap-direct]').forEach((btn) => {
      btn.onclick = () => {
        const pos = btn.getAttribute('data-canvas-snap-direct') as
          | 'left'
          | 'center'
          | 'right'
          | 'top'
          | 'middle'
          | 'bottom';
        const targetMode =
          this.alignRelativeTo === 'canvas-group' ? 'canvas-group' : 'canvas';
        this.alignSelectedElements(pos, targetMode);
      };
    });

    document.getElementById('align-bar-tidy-h')?.addEventListener('click', () => {
      this.tidySelectedElements('horizontal');
    });
    document.getElementById('align-bar-tidy-v')?.addEventListener('click', () => {
      this.tidySelectedElements('vertical');
    });
    document.getElementById('align-bar-select-all')?.addEventListener('click', () => {
      const unlockedIds = this.activePage.elements
        .filter((item) => !item.hidden && !item.locked)
        .map((item) => item.id);
      if (unlockedIds.length === 0) return;
      this.selectedElementIds = unlockedIds;
      this.selectedElementId = unlockedIds[0] || null;
      this.alignRelativeTo = 'canvas';
      this.render();
      this.showToast(
        `Selected ${unlockedIds.length} objects — click Left, Center H, Right, Top, Center V, or Bottom to snap to Canvas`
      );
    });

    // Top Alignment Toolbar & Multi-select Contextual Toolbar Group / Ungroup / Resize bindings
    document.getElementById('btn-toolbar-group')?.addEventListener('click', () => {
      this.groupSelected();
    });
    document.getElementById('btn-toolbar-ungroup')?.addEventListener('click', () => {
      this.ungroupSelected();
    });
    document.getElementById('prop-group-selected')?.addEventListener('click', () => {
      this.groupSelected();
    });
    document.getElementById('prop-ungroup-selected')?.addEventListener('click', () => {
      this.ungroupSelected();
    });
    const groupWInput = document.getElementById('prop-group-width') as HTMLInputElement | null;
    const groupHInput = document.getElementById('prop-group-height') as HTMLInputElement | null;
    if (groupWInput && groupHInput) {
      const applyGroupSize = () => {
        const w = Number(groupWInput.value) || 200;
        const h = Number(groupHInput.value) || 200;
        this.resizeSelectedGroupToDimensions(w, h);
      };
      groupWInput.onchange = applyGroupSize;
      groupHInput.onchange = applyGroupSize;
    }
    document.getElementById('prop-tidy-h')?.addEventListener('click', () => {
      this.tidySelectedElements('horizontal');
    });
    document.getElementById('prop-tidy-v')?.addEventListener('click', () => {
      this.tidySelectedElements('vertical');
    });
    document.getElementById('prop-delete-multi')?.addEventListener('click', () => {
      this.deleteSelectedElements();
    });

    const pageBgInput = document.getElementById('prop-page-bg') as HTMLInputElement | null;
    if (pageBgInput) {
      pageBgInput.oninput = () => {
        this.activePage.background = pageBgInput.value;
        this.activePage.backgroundGradient = undefined;
        this.renderArtboardOnly();
      };
      pageBgInput.onchange = () => {
        this.pushHistorySnapshot();
        this.render();
      };
    }

    this.root.querySelectorAll<HTMLElement>('[data-page-pattern]').forEach((btn) => {
      btn.onclick = () => {
        this.activePage.backgroundPattern = btn.getAttribute('data-page-pattern') as
          | 'none'
          | 'dots'
          | 'grid';
        this.pushHistorySnapshot();
        this.render();
      };
    });

    const brushColorInput = document.getElementById('prop-brush-color') as HTMLInputElement | null;
    if (brushColorInput) {
      brushColorInput.oninput = () => {
        this.brushColor = brushColorInput.value;
      };
    }
    const brushWidthInput = document.getElementById('prop-brush-width') as HTMLInputElement | null;
    if (brushWidthInput) {
      brushWidthInput.oninput = () => {
        this.brushWidth = Number(brushWidthInput.value);
        this.render();
      };
    }

    document.getElementById('prop-paste-empty')?.addEventListener('click', () => {
      this.pasteElement();
    });

    document.getElementById('btn-toggle-rulers')?.addEventListener('click', () => {
      this.executeShortcutCommand('toggle-rulers');
    });
    document.getElementById('btn-guide-presets')?.addEventListener('click', () => {
      this.cycleGuidePresets();
    });
    document.getElementById('btn-clear-guides')?.addEventListener('click', () => {
      this.customGuides = { x: [], y: [] };
      this.guidePresetStep = 0;
      this.render();
      this.showToast('Cleared all custom snapping guides');
    });
    document.getElementById('btn-toggle-bleed')?.addEventListener('click', () => {
      this.showPrintBleed = !this.showPrintBleed;
      this.render();
    });
    document.getElementById('btn-replay-animations')?.addEventListener('click', () => {
      this.replayCanvasAnimations();
    });
    document.getElementById('btn-toggle-comment-mode')?.addEventListener('click', () => {
      this.isCommentPinMode = !this.isCommentPinMode;
      if (this.isCommentPinMode) {
        this.isDrawingMode = false;
        this.isTextPlacementMode = false;
      }
      this.render();
      this.showToast(
        this.isCommentPinMode
          ? 'Pin Note Mode ON — click anywhere on the artboard to drop a sticky comment'
          : 'Pin Note Mode OFF'
      );
    });
    this.root.querySelectorAll<HTMLElement>('[data-page-anim-preset]').forEach((btn) => {
      btn.onclick = () => {
        const preset = btn.getAttribute('data-page-anim-preset') as PageAnimationPresetKind;
        this.applyPageAnimationPreset(preset);
      };
    });
    document.getElementById('btn-eyedropper')?.addEventListener('click', async () => {
      const anyWin = window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } };
      if (anyWin.EyeDropper) {
        try {
          const dropper = new anyWin.EyeDropper();
          const res = await dropper.open();
          if (res?.sRGBHex) {
            if (this.selectedElement) {
              if (this.selectedElement.type === 'text') this.selectedElement.color = res.sRGBHex;
              else this.selectedElement.fill = res.sRGBHex;
              this.pushHistorySnapshot();
              this.render();
              this.showToast(`Applied picked color ${res.sRGBHex} to layer`);
            } else {
              this.activePage.background = res.sRGBHex;
              this.activePage.backgroundGradient = undefined;
              this.pushHistorySnapshot();
              this.render();
              this.showToast(`Applied picked color ${res.sRGBHex} to canvas`);
            }
          }
        } catch {
          // user canceled eyedropper
        }
      } else {
        this.showToast('Native EyeDropper API sampled Brand Primary color');
      }
    });

    const el = this.selectedElement;
    if (!el) return;

    const fontFamilySelect = document.getElementById(
      'prop-font-family'
    ) as HTMLSelectElement | null;
    if (fontFamilySelect) {
      fontFamilySelect.onchange = () => {
        el.fontFamily = fontFamilySelect.value;
        this.pushHistorySnapshot();
        this.render();
      };
    }

    const fontSizeInput = document.getElementById('prop-font-size') as HTMLInputElement | null;
    if (fontSizeInput) {
      fontSizeInput.onchange = () => {
        el.fontSize = Math.max(8, Math.min(300, Number(fontSizeInput.value) || 32));
        this.pushHistorySnapshot();
        this.render();
      };
    }
    document.getElementById('prop-font-dec')?.addEventListener('click', () => {
      el.fontSize = Math.max(8, (el.fontSize || 32) - 4);
      this.pushHistorySnapshot();
      this.render();
    });
    document.getElementById('prop-font-inc')?.addEventListener('click', () => {
      el.fontSize = Math.min(300, (el.fontSize || 32) + 4);
      this.pushHistorySnapshot();
      this.render();
    });

    const textColorInput = document.getElementById('prop-text-color') as HTMLInputElement | null;
    if (textColorInput) {
      textColorInput.oninput = () => {
        el.color = textColorInput.value;
        this.renderArtboardOnly();
      };
      textColorInput.onchange = () => {
        this.pushHistorySnapshot();
        this.render();
      };
    }

    document.getElementById('prop-text-bold')?.addEventListener('click', () => {
      el.fontWeight = Number(el.fontWeight) >= 700 ? 400 : 700;
      this.pushHistorySnapshot();
      this.render();
    });
    document.getElementById('prop-text-italic')?.addEventListener('click', () => {
      el.fontStyle = el.fontStyle === 'italic' ? 'normal' : 'italic';
      this.pushHistorySnapshot();
      this.render();
    });
    document.getElementById('prop-text-underline')?.addEventListener('click', () => {
      el.textDecoration = el.textDecoration === 'underline' ? 'none' : 'underline';
      this.pushHistorySnapshot();
      this.render();
    });

    this.root.querySelectorAll<HTMLElement>('[data-prop-text-dir]').forEach((btn) => {
      btn.onclick = () => {
        const dir = btn.getAttribute('data-prop-text-dir') as TextDirectionKind;
        el.textDirection = dir;
        if (dir === 'rtl') el.textAlign = 'right';
        else if (dir === 'ltr') el.textAlign = 'left';
        this.pushHistorySnapshot(`Set Text Direction (${dir.toUpperCase()}) on "${el.name}"`);
        this.render();
        this.showToast(`Text direction set to ${dir.toUpperCase()}`);
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-prop-text-align]').forEach((btn) => {
      btn.onclick = () => {
        const align = btn.getAttribute('data-prop-text-align') as 'left' | 'center' | 'right';
        el.textAlign = align;
        this.pushHistorySnapshot(`Aligned Text (${align}) on "${el.name}"`);
        this.render();
      };
    });

    // Rich Typography Pro Contextual Bar bindings
    document.getElementById('prop-text-list-bullet')?.addEventListener('click', () => {
      this.toggleTextListStyle(el, 'bullet');
    });
    document.getElementById('prop-text-list-number')?.addEventListener('click', () => {
      this.toggleTextListStyle(el, 'number');
    });
    const textTransformSelect = document.getElementById(
      'prop-text-transform'
    ) as HTMLSelectElement | null;
    if (textTransformSelect) {
      textTransformSelect.onchange = () => {
        el.textTransform = textTransformSelect.value as TextTransformKind;
        this.pushHistorySnapshot(`Set Text Case (${el.textTransform})`);
        this.render();
      };
    }
    const letterSpacingInput = document.getElementById(
      'prop-letter-spacing'
    ) as HTMLInputElement | null;
    if (letterSpacingInput) {
      letterSpacingInput.oninput = () => {
        el.letterSpacing = Number(letterSpacingInput.value);
        this.renderArtboardOnly();
      };
      letterSpacingInput.onchange = () => this.pushHistorySnapshot();
    }
    const lineHeightInput = document.getElementById(
      'prop-line-height'
    ) as HTMLInputElement | null;
    if (lineHeightInput) {
      lineHeightInput.oninput = () => {
        el.lineHeight = Number(lineHeightInput.value);
        this.renderArtboardOnly();
      };
      lineHeightInput.onchange = () => this.pushHistorySnapshot();
    }
    const textBgColorInput = document.getElementById(
      'prop-text-bg-color'
    ) as HTMLInputElement | null;
    if (textBgColorInput) {
      textBgColorInput.oninput = () => {
        el.textBgColor = textBgColorInput.value;
        if (!el.textBgPadding) el.textBgPadding = 12;
        if (!el.textBgRadius) el.textBgRadius = 12;
        this.renderArtboardOnly();
      };
      textBgColorInput.onchange = () => {
        this.pushHistorySnapshot('Set Text Highlight Pill Color');
        this.render();
      };
    }
    document.getElementById('prop-text-bg-clear')?.addEventListener('click', () => {
      el.textBgColor = undefined;
      this.pushHistorySnapshot('Cleared Text Highlight Pill');
      this.render();
    });

    const textEffectSelect = document.getElementById(
      'prop-text-effect'
    ) as HTMLSelectElement | null;
    if (textEffectSelect) {
      textEffectSelect.onchange = () => {
        el.textEffect = textEffectSelect.value as TextEffectKind;
        this.pushHistorySnapshot();
        this.render();
      };
    }

    const textCurveInput = document.getElementById('prop-text-curve') as HTMLInputElement | null;
    if (textCurveInput) {
      textCurveInput.oninput = () => {
        el.textCurve = Number(textCurveInput.value);
        if (Math.abs(el.textCurve) > 10 && el.height < 140) {
          el.height = 160;
        }
        this.renderArtboardOnly();
      };
      textCurveInput.onchange = () => {
        this.pushHistorySnapshot();
        this.render();
      };
    }

    const frameShapeSelect = document.getElementById(
      'prop-frame-shape'
    ) as HTMLSelectElement | null;
    if (frameShapeSelect) {
      frameShapeSelect.onchange = () => {
        el.frameShape = frameShapeSelect.value as FrameShapeKind;
        this.pushHistorySnapshot();
        this.render();
      };
    }

    const animSelect = document.getElementById('prop-animation') as HTMLSelectElement | null;
    if (animSelect) {
      animSelect.onchange = () => {
        el.animation = animSelect.value as AnimationKind;
        this.pushHistorySnapshot();
        this.render();
      };
    }
    const animDurInput = document.getElementById('prop-anim-duration') as HTMLInputElement | null;
    if (animDurInput) {
      animDurInput.oninput = () => {
        el.animationDuration = Number(animDurInput.value);
        this.renderArtboardOnly();
      };
      animDurInput.onchange = () => {
        this.pushHistorySnapshot();
        this.render();
      };
    }
    const animDelayInput = document.getElementById('prop-anim-delay') as HTMLInputElement | null;
    if (animDelayInput) {
      animDelayInput.oninput = () => {
        el.animationDelay = Number(animDelayInput.value);
        this.renderArtboardOnly();
      };
      animDelayInput.onchange = () => {
        this.pushHistorySnapshot();
        this.render();
      };
    }

    const shapeFill = document.getElementById('prop-shape-fill') as HTMLInputElement | null;
    if (shapeFill) {
      shapeFill.oninput = () => {
        el.fill = shapeFill.value;
        el.fillGradient = undefined;
        this.renderArtboardOnly();
      };
      shapeFill.onchange = () => {
        this.pushHistorySnapshot();
        this.render();
      };
    }

    const shapeStroke = document.getElementById('prop-shape-stroke') as HTMLInputElement | null;
    if (shapeStroke) {
      shapeStroke.oninput = () => {
        el.stroke = shapeStroke.value;
        if (!el.strokeWidth && el.type === 'shape') el.strokeWidth = 4;
        this.renderArtboardOnly();
      };
      shapeStroke.onchange = () => {
        this.pushHistorySnapshot();
        this.render();
      };
    }

    const borderRadiusInput = document.getElementById(
      'prop-border-radius'
    ) as HTMLInputElement | null;
    if (borderRadiusInput) {
      borderRadiusInput.oninput = () => {
        el.borderRadius = Number(borderRadiusInput.value);
        this.renderArtboardOnly();
      };
      borderRadiusInput.onchange = () => this.pushHistorySnapshot();
    }

    const brightnessInput = document.getElementById(
      'prop-img-brightness'
    ) as HTMLInputElement | null;
    if (brightnessInput) {
      brightnessInput.oninput = () => {
        el.brightness = Number(brightnessInput.value);
        this.renderArtboardOnly();
      };
      brightnessInput.onchange = () => this.pushHistorySnapshot();
    }

    const filterPresetSelect = document.getElementById('prop-filter-preset') as HTMLSelectElement | null;
    if (filterPresetSelect && this.selectedElement) {
      filterPresetSelect.onchange = () => {
        if (!this.selectedElement) return;
        this.selectedElement.filterPreset = filterPresetSelect.value as FilterPresetKind;
        this.pushHistorySnapshot();
        this.render();
      };
    }

    const eraseTolSlider = document.getElementById('prop-erase-tolerance') as HTMLInputElement | null;
    if (eraseTolSlider) {
      eraseTolSlider.oninput = () => {
        el.bgEraseTolerance = Number(eraseTolSlider.value);
      };
    }

    document.getElementById('prop-erase-bg')?.addEventListener('click', async () => {
      if (this.selectedElement && this.selectedElement.type === 'image' && this.selectedElement.src) {
        const tol = this.selectedElement.bgEraseTolerance ?? 48;
        this.showToast(`Removing background via Canvas 2D chroma key (tolerance ${tol})...`);
        const newUrl = await eraseImageBackground(this.selectedElement.src, tol);
        this.selectedElement.src = newUrl;
        this.pushHistorySnapshot('Erased Image Background');
        this.render();
        this.showToast('Background erased cleanly!');
      }
    });

    this.root.querySelectorAll<HTMLElement>('[data-prop-crop-aspect]').forEach((btn) => {
      btn.onclick = () => {
        const asp = btn.getAttribute('data-prop-crop-aspect') as
          | 'free'
          | '1:1'
          | '16:9'
          | '4:5'
          | '9:16';
        this.applyImageCropAspect(el, asp);
      };
    });

    const cropZoomSlider = document.getElementById('prop-crop-zoom') as HTMLInputElement | null;
    if (cropZoomSlider && this.selectedElement) {
      cropZoomSlider.oninput = () => {
        if (!this.selectedElement) return;
        this.selectedElement.cropZoom = Number(cropZoomSlider.value) / 100;
        this.renderArtboardOnly();
      };
      cropZoomSlider.onchange = () => this.pushHistorySnapshot();
    }

    const gridLayoutSelect = document.getElementById('prop-grid-layout') as HTMLSelectElement | null;
    if (gridLayoutSelect && this.selectedElement) {
      gridLayoutSelect.onchange = () => {
        if (!this.selectedElement) return;
        this.selectedElement.gridLayout = gridLayoutSelect.value as GridLayoutKind;
        this.pushHistorySnapshot();
        this.render();
      };
    }

    const gridGapSlider = document.getElementById('prop-grid-gap') as HTMLInputElement | null;
    if (gridGapSlider && this.selectedElement) {
      gridGapSlider.oninput = () => {
        if (!this.selectedElement) return;
        this.selectedElement.gridGap = Number(gridGapSlider.value);
        this.renderArtboardOnly();
      };
      gridGapSlider.onchange = () => this.pushHistorySnapshot();
    }

    const qrTextInput = document.getElementById('prop-qr-text') as HTMLInputElement | null;
    if (qrTextInput && this.selectedElement) {
      qrTextInput.oninput = () => {
        if (!this.selectedElement) return;
        this.selectedElement.qrText = qrTextInput.value;
        this.renderArtboardOnly();
      };
      qrTextInput.onchange = () => this.pushHistorySnapshot();
    }

    document.getElementById('prop-table-add-row')?.addEventListener('click', () => {
      if (this.selectedElement?.type === 'table' && this.selectedElement.tableData) {
        const cols = this.selectedElement.tableData[0]?.length || 3;
        this.selectedElement.tableData.push(Array(cols).fill('Cell'));
        this.selectedElement.height += 54;
        this.pushHistorySnapshot();
        this.render();
      }
    });
    document.getElementById('prop-table-del-row')?.addEventListener('click', () => {
      if (
        this.selectedElement?.type === 'table' &&
        this.selectedElement.tableData &&
        this.selectedElement.tableData.length > 1
      ) {
        this.selectedElement.tableData.pop();
        this.selectedElement.height = Math.max(90, this.selectedElement.height - 54);
        this.pushHistorySnapshot();
        this.render();
      }
    });
    document.getElementById('prop-table-add-col')?.addEventListener('click', () => {
      if (this.selectedElement?.type === 'table' && this.selectedElement.tableData) {
        this.selectedElement.tableData.forEach((r, idx) => r.push(idx === 0 ? 'Header' : 'Cell'));
        this.selectedElement.width += 130;
        this.pushHistorySnapshot();
        this.render();
      }
    });
    document.getElementById('prop-table-del-col')?.addEventListener('click', () => {
      if (
        this.selectedElement?.type === 'table' &&
        this.selectedElement.tableData &&
        (this.selectedElement.tableData[0]?.length || 0) > 1
      ) {
        this.selectedElement.tableData.forEach((r) => r.pop());
        this.selectedElement.width = Math.max(160, this.selectedElement.width - 130);
        this.pushHistorySnapshot();
        this.render();
      }
    });
    const tableHeaderBgInput = document.getElementById('prop-table-header-bg') as HTMLInputElement | null;
    if (tableHeaderBgInput && this.selectedElement) {
      tableHeaderBgInput.oninput = () => {
        if (!this.selectedElement) return;
        this.selectedElement.tableHeaderBg = tableHeaderBgInput.value;
        this.renderArtboardOnly();
      };
      tableHeaderBgInput.onchange = () => this.pushHistorySnapshot();
    }
    const tableBorderColorInput = document.getElementById(
      'prop-table-border-color'
    ) as HTMLInputElement | null;
    if (tableBorderColorInput && this.selectedElement) {
      tableBorderColorInput.oninput = () => {
        if (!this.selectedElement) return;
        this.selectedElement.tableBorderColor = tableBorderColorInput.value;
        this.renderArtboardOnly();
      };
      tableBorderColorInput.onchange = () => this.pushHistorySnapshot();
    }
    document.getElementById('prop-table-striped')?.addEventListener('click', () => {
      if (this.selectedElement?.type === 'table') {
        this.selectedElement.tableStriped = this.selectedElement.tableStriped === false;
        this.pushHistorySnapshot();
        this.render();
      }
    });
    const tablePadSlider = document.getElementById('prop-table-cell-pad') as HTMLInputElement | null;
    if (tablePadSlider && this.selectedElement) {
      tablePadSlider.oninput = () => {
        if (!this.selectedElement) return;
        this.selectedElement.tableCellPadding = Number(tablePadSlider.value);
        this.renderArtboardOnly();
      };
      tablePadSlider.onchange = () => this.pushHistorySnapshot();
    }

    // Smart Flowchart Connector contextual controls
    const connStyleProp = document.getElementById(
      'prop-connector-style'
    ) as HTMLSelectElement | null;
    if (connStyleProp) {
      connStyleProp.onchange = () => {
        el.connectorStyle = connStyleProp.value as ConnectorStyleKind;
        this.pushHistorySnapshot();
        this.render();
      };
    }
    const connLabelProp = document.getElementById(
      'prop-connector-label'
    ) as HTMLInputElement | null;
    if (connLabelProp) {
      connLabelProp.oninput = () => {
        el.connectorLabel = connLabelProp.value;
        this.renderArtboardOnly();
      };
      connLabelProp.onchange = () => this.pushHistorySnapshot();
    }
    document.getElementById('prop-connector-dashed')?.addEventListener('click', () => {
      el.connectorDashed = !el.connectorDashed;
      this.pushHistorySnapshot();
      this.render();
    });

    const blendSelect = document.getElementById('prop-blend-mode') as HTMLSelectElement | null;
    if (blendSelect && this.selectedElement) {
      blendSelect.onchange = () => {
        if (!this.selectedElement) return;
        this.selectedElement.blendMode = blendSelect.value as BlendModeKind;
        this.pushHistorySnapshot();
        this.render();
      };
    }

    document.getElementById('prop-shadow-toggle')?.addEventListener('click', () => {
      if (!this.selectedElement) return;
      if (this.selectedElement.shadowBlur && this.selectedElement.shadowBlur > 0) {
        this.selectedElement.shadowBlur = 0;
      } else {
        this.selectedElement.shadowBlur = 18;
        this.selectedElement.shadowColor = 'rgba(0,0,0,0.55)';
        this.selectedElement.shadowOffsetX = 0;
        this.selectedElement.shadowOffsetY = 8;
      }
      this.pushHistorySnapshot();
      this.render();
    });

    const strokeWidthInput = document.getElementById(
      'prop-stroke-width'
    ) as HTMLInputElement | null;
    if (strokeWidthInput) {
      strokeWidthInput.oninput = () => {
        el.strokeWidth = Number(strokeWidthInput.value);
        this.renderArtboardOnly();
      };
      strokeWidthInput.onchange = () => this.pushHistorySnapshot();
    }

    const opacitySlider = document.getElementById('prop-opacity') as HTMLInputElement | null;
    if (opacitySlider) {
      opacitySlider.oninput = () => {
        el.opacity = Number(opacitySlider.value) / 100;
        this.renderArtboardOnly();
      };
      opacitySlider.onchange = () => {
        this.pushHistorySnapshot();
        this.render();
      };
    }

    document.getElementById('prop-copy')?.addEventListener('click', () =>
      this.copyElement(el.id)
    );
    document.getElementById('prop-paste')?.addEventListener('click', () =>
      this.pasteElement()
    );
    document.getElementById('prop-layer-up')?.addEventListener('click', () =>
      this.reorderLayer(el.id, 'up')
    );
    document.getElementById('prop-layer-down')?.addEventListener('click', () =>
      this.reorderLayer(el.id, 'down')
    );
    document.getElementById('prop-lock')?.addEventListener('click', () => {
      el.locked = !el.locked;
      this.pushHistorySnapshot();
      this.render();
    });
    document.getElementById('prop-duplicate')?.addEventListener('click', () =>
      this.duplicateElement(el.id)
    );
    document.getElementById('prop-delete')?.addEventListener('click', () =>
      this.deleteElement(el.id)
    );
  }

  private bindSecondaryViewEvents(): void {
    // Projects Hub
    document.getElementById('btn-create-blank-project')?.addEventListener('click', () => {
      const blank: DesignProject = {
        id: this.uid('proj'),
        name: `Untitled Studio Canvas ${this.projects.length + 1}`,
        category: 'Social',
        width: 1080,
        height: 1080,
        updatedAt: Date.now(),
        pages: [
          {
            id: this.uid('page'),
            title: 'Page 1',
            background: '#0f172a',
            backgroundPattern: 'dots',
            elements: [],
          },
        ],
      };
      this.projects.unshift(blank);
      this.activeProject = blank;
      this.activePageIndex = 0;
      this.clearSelection();
      this.activeNav = 'studio';
      this.fitArtboardToViewport();
      this.pushHistorySnapshot();
      this.render();
      this.showToast('Created blank 1080 × 1080 px project');
    });

    document.getElementById('btn-reset-demo-storage')?.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEYS.PROJECTS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
      this.projects = [createDefaultProject()];
      this.activeProject = this.projects[0];
      this.activePageIndex = 0;
      this.clearSelection();
      this.saveToLocalStorage();
      this.render();
      this.showToast('Demo workspace restored');
    });

    this.root.querySelectorAll<HTMLElement>('[data-open-proj]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-open-proj')!;
        const found = this.projects.find((p) => p.id === id);
        if (found) {
          this.activeProject = found;
          this.activePageIndex = 0;
          this.clearSelection();
          this.activeNav = 'studio';
          this.fitArtboardToViewport();
          this.pushHistorySnapshot();
          this.render();
        }
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-dup-proj]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-dup-proj')!;
        const orig = this.projects.find((p) => p.id === id);
        if (orig) {
          const copy: DesignProject = JSON.parse(JSON.stringify(orig));
          copy.id = this.uid('proj');
          copy.name = `${orig.name} (Copy)`;
          copy.updatedAt = Date.now();
          this.projects.unshift(copy);
          this.saveToLocalStorage();
          this.render();
          this.showToast('Project duplicated in LocalStorage');
        }
      };
    });

    this.root.querySelectorAll<HTMLElement>('[data-del-proj]').forEach((btn) => {
      btn.onclick = () => {
        if (this.projects.length <= 1) return;
        const id = btn.getAttribute('data-del-proj')!;
        this.projects = this.projects.filter((p) => p.id !== id);
        if (this.activeProject.id === id) {
          this.activeProject = this.projects[0];
          this.activePageIndex = 0;
        }
        this.saveToLocalStorage();
        this.render();
        this.showToast('Project removed from LocalStorage');
      };
    });

    // Brand Kit View
    const brandNameInput = document.getElementById('brand-name-input') as HTMLInputElement | null;
    if (brandNameInput) {
      brandNameInput.onchange = () => {
        this.brandKit.brandName = brandNameInput.value.trim() || 'Studio Brand';
        this.saveToLocalStorage();
        this.showToast('Brand name saved');
      };
    }

    const primaryFontSelect = document.getElementById(
      'brand-primary-font'
    ) as HTMLSelectElement | null;
    if (primaryFontSelect) {
      primaryFontSelect.onchange = () => {
        this.brandKit.primaryFont = primaryFontSelect.value;
        this.saveToLocalStorage();
        this.showToast('Brand heading font updated');
      };
    }

    const secondaryFontSelect = document.getElementById(
      'brand-secondary-font'
    ) as HTMLSelectElement | null;
    if (secondaryFontSelect) {
      secondaryFontSelect.onchange = () => {
        this.brandKit.secondaryFont = secondaryFontSelect.value;
        this.saveToLocalStorage();
        this.showToast('Brand body font updated');
      };
    }

    this.root.querySelectorAll<HTMLInputElement>('[data-brand-color-idx]').forEach((input) => {
      input.onchange = () => {
        const idx = Number(input.getAttribute('data-brand-color-idx'));
        this.brandKit.colors[idx] = input.value;
        this.saveToLocalStorage();
        this.render();
        this.showToast('Brand color updated in LocalStorage');
      };
    });

    document.getElementById('btn-apply-brand-to-page')?.addEventListener('click', () => {
      const [bg, primary, accent, secondary, highlight, textLight] = this.brandKit.colors;
      this.activePage.background = bg || '#0f172a';
      this.activePage.backgroundGradient = undefined;
      this.activePage.elements.forEach((el, idx) => {
        if (el.type === 'text') {
          el.fontFamily =
            (el.fontSize || 32) >= 48
              ? this.brandKit.primaryFont
              : this.brandKit.secondaryFont;
          el.color = idx % 2 === 0 ? textLight || '#f8fafc' : highlight || '#f59e0b';
        } else if (el.type === 'shape' || el.type === 'sticker' || el.type === 'chart') {
          el.fill = idx % 2 === 0 ? primary || '#4f46e5' : accent || '#f43f5e';
          if (el.stroke && el.stroke !== 'none') {
            el.stroke = secondary || '#10b981';
          }
        }
      });
      this.activeNav = 'studio';
      this.pushHistorySnapshot();
      this.render();
      this.showToast(`Applied "${this.brandKit.brandName}" Brand Kit to active page`);
    });
  }
}
