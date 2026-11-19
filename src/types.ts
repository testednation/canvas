export type ElementType =
  | 'text'
  | 'shape'
  | 'sticker'
  | 'image'
  | 'path'
  | 'chart'
  | 'table'
  | 'qr'
  | 'grid'
  | 'connector';

export type ShapeKind =
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'star'
  | 'hexagon'
  | 'diamond'
  | 'pill'
  | 'arrow'
  | 'line';

export type StickerKind =
  | 'burst'
  | 'seal'
  | 'rings'
  | 'arch'
  | 'wave'
  | 'grid_dots'
  | 'quote'
  | 'frame_card';

export type TextEffectKind =
  | 'none'
  | 'shadow'
  | 'lift'
  | 'hollow'
  | 'splice'
  | 'neon'
  | 'echo';

export type FrameShapeKind =
  | 'none'
  | 'circle'
  | 'arch'
  | 'star'
  | 'hexagon'
  | 'diamond'
  | 'pill'
  | 'rounded';

export type AnimationKind =
  | 'none'
  | 'rise'
  | 'pan'
  | 'fade'
  | 'pop'
  | 'tumble'
  | 'breathe'
  | 'wipe'
  | 'drift'
  | 'neon-flicker';

export type ChartKind = 'bar' | 'line' | 'donut' | 'progress';

export type GridLayoutKind = 'split-v' | 'split-h' | 'bento-3' | 'quad-4';

export type FilterPresetKind =
  | 'none'
  | 'nordic'
  | 'vintage'
  | 'noir'
  | 'cyber'
  | 'warm'
  | 'duotone-cyber'
  | 'duotone-sunset'
  | 'duotone-emerald';

export type BlendModeKind =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'difference';

export type PageTransitionKind = 'none' | 'fade' | 'slide' | 'scale' | 'wipe';

export type TextDirectionKind = 'ltr' | 'rtl' | 'auto';

export type StudioLocaleKind = 'en' | 'ar' | 'he' | 'fa' | 'ur';

export type ConnectorStyleKind = 'straight' | 'elbow' | 'curved';

export type TextTransformKind = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export type TextListStyleKind = 'none' | 'bullet' | 'number';

export type PageAnimationPresetKind = 'corporate' | 'playful' | 'cinematic' | 'energetic' | 'clear';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface CanvasComment {
  id: string;
  x: number;
  y: number;
  author: string;
  text: string;
  createdAt: number;
  resolved?: boolean;
}

export interface ProjectCheckpoint {
  id: string;
  name: string;
  createdAt: number;
  projectSnapshot: string;
}

export interface DesignElement {
  id: string;
  name: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  hidden?: boolean;
  groupId?: string;
  animation?: AnimationKind;
  animationDuration?: number; // seconds, default 0.6
  animationDelay?: number;    // seconds, default 0
  blendMode?: BlendModeKind;

  // Fill & Stroke (Shapes, Stickers, Text Highlight)
  fill?: string;
  fillGradient?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;

  // Shape / Sticker specific
  shapeKind?: ShapeKind;
  stickerKind?: StickerKind;

  // Text & Rich Typography Pro specific
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right';
  textDirection?: TextDirectionKind;
  langCode?: string;
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textBgColor?: string;
  textBgPadding?: number;
  textBgRadius?: number;
  textTransform?: TextTransformKind;
  textListStyle?: TextListStyleKind;
  listStyle?: TextListStyleKind;
  textEffect?: TextEffectKind;
  textEffectColor?: string;
  textCurve?: number; // -100 to +100

  // Shadow (for Shapes, Photos, Frames, Text, QR, Tables)
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;

  // Image, Photo Studio Pro & Canva Frame specific
  src?: string;
  objectFit?: 'cover' | 'contain';
  frameShape?: FrameShapeKind;
  filterPreset?: FilterPresetKind;
  brightness?: number; // 50 to 150, default 100
  contrast?: number;   // 50 to 150, default 100
  saturate?: number;   // 0 to 200, default 100
  blur?: number;       // 0 to 20, default 0
  hueRotate?: number;  // -180 to 180, default 0
  sepia?: number;      // 0 to 100, default 0
  cropZoom?: number;   // 1 to 2.5, default 1
  cropPanX?: number;   // -50 to 50, default 0
  cropPanY?: number;   // -50 to 50, default 0
  cropAspect?: 'free' | '1:1' | '16:9' | '4:5' | '9:16';
  bgEraseTolerance?: number;

  // Multi-Frame Collage Grid specific
  gridKind?: GridLayoutKind;
  gridLayout?: GridLayoutKind;
  gridGap?: number;
  gridCells?: string[];

  // Chart specific
  chartKind?: ChartKind;
  chartData?: ChartDataPoint[];
  chartShowValues?: boolean;

  // Table specific
  tableData?: string[][];
  tableHeaderBg?: string;
  tableStriped?: boolean;
  tableCellPadding?: number;
  tableBorderColor?: string;

  // Smart Connector & Flowchart specific
  connectorStyle?: ConnectorStyleKind;
  fromElementId?: string;
  toElementId?: string;
  connectorLabel?: string;
  connectorArrowEnd?: boolean;
  connectorArrowStart?: boolean;
  connectorDashed?: boolean;

  // QR Code Generator specific
  qrText?: string;
  qrBgColor?: string;

  // Freehand Path specific
  pathPoints?: Array<{ x: number; y: number }>;

  // Flip transforms
  flipX?: boolean;
  flipY?: boolean;
}

export interface DesignPage {
  id: string;
  title: string;
  background: string;
  backgroundGradient?: string;
  backgroundPattern?: 'none' | 'dots' | 'grid' | 'diagonal';
  transition?: PageTransitionKind;
  pageAnimationPreset?: PageAnimationPresetKind;
  speakerNotes?: string;
  comments?: CanvasComment[];
  elements: DesignElement[];
}

export interface DesignProject {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  updatedAt: number;
  pages: DesignPage[];
  checkpoints?: ProjectCheckpoint[];
}

export interface TemplatePreset {
  id: string;
  name: string;
  category: 'Social' | 'Presentation' | 'Poster' | 'Marketing';
  dimensionsLabel: string;
  width: number;
  height: number;
  background: string;
  backgroundGradient?: string;
  backgroundPattern?: 'none' | 'dots' | 'grid' | 'diagonal';
  elements: DesignElement[];
}

export interface UploadedAsset {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  createdAt: number;
}

export interface BrandKit {
  brandName: string;
  primaryFont: string;
  secondaryFont: string;
  colors: string[];
}
