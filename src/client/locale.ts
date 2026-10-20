/**
 * Locale dictionaries for dsh-freestyle-theme.
 *
 * Every user-visible string lives here; components never inline copy. The `en`
 * table is typed as `Record<DictKey, string>`, so adding a key to `zh` without
 * translating it is a compile error — that is the parity check.
 *
 * @module dsh-freestyle-theme/client/locale
 */

/** Namespace registered with the host locale service. */
export const NS = 'dsh-freestyle-theme'

/** Lookup function bound to the active locale. */
export type Translate = (key: string, vars?: Record<string, string | number>) => string

const zh = {
  // ── plugin / settings row ───────────────────────────────────────────────
  'plugin.title': '自由主题',
  'plugin.description': '用 OKLCH 色彩引擎，为 DeepSeek Harness 调一套只属于你的皮肤。',

  'row.hint': '品牌色 · 中性偏向 · 明度骨架 · 状态簇，四轴自由组合',
  'row.open': '打开 Studio',
  'row.shuffle': '随机一套',
  'row.none': '尚未应用主题，当前使用 DSH 默认外观',
  'row.applied': '已应用「{name}」',

  // ── studio header ──────────────────────────────────────────────────────
  'studio.name': '未命名主题',
  'studio.light': '浅色',
  'studio.dark': '深色',
  'studio.undo': '撤销',
  'studio.redo': '重做',
  'studio.share': '分享 / 导出',
  'studio.apply': '应用到 DSH',
  'studio.close': '关闭 Studio',
  'studio.hint': '⌘K 命令 · ⌘Z 撤销 · Esc 关闭',

  // ── left rail ──────────────────────────────────────────────────────────
  'rail.templates': '预设',
  'rail.library': '主题库',
  'rail.search': '搜索主题…',
  'rail.save': '保存当前',
  'rail.delete': '删除',
  'rail.empty': '主题库还是空的',
  'rail.emptyHint': '调出满意的一套后点「保存当前」，它会留在本机。',
  'rail.mine': '我的主题',
  'rail.import': '导入',

  // ── canvas ─────────────────────────────────────────────────────────────
  'canvas.chat': '对话',
  'canvas.list': '列表',
  'canvas.form': '设置',
  'canvas.zoom': '缩放',
  'canvas.compare': '对比',
  'canvas.off': '关',
  'canvas.inspect': '检查',
  'canvas.inspectHint': '悬停画布里的元素，查看它用到的令牌',
  'canvas.blind': '色觉模拟',
  'canvas.blind.none': '正常',
  'canvas.blind.deuteranopia': '绿色弱',
  'canvas.blind.protanopia': '红色弱',
  'canvas.blind.tritanopia': '蓝色弱',
  'canvas.blind.achromatopsia': '全色盲',

  // ── inspector ──────────────────────────────────────────────────────────
  'inspector.color': '颜色',
  'inspector.type': '排版',
  'inspector.shape': '形状',
  'inspector.a11y': '对比度',

  'axis.hue': '色相',
  'axis.chroma': '彩度',
  'axis.light': '明度',

  'color.primary': '主色',
  'color.secondary': '副色',
  'color.surface': '面板',
  'color.neutral': '中性偏向',
  'color.contrast': '明度跨度',
  'color.state': '状态强度',
  'color.text': '文字明度',
  'color.sidebar': '侧栏明度',
  'color.neutralHint': '灰阶继承品牌色相的比例，越高越有氛围',
  'color.stateHint': '成功 / 警告 / 错误的彩度倍数',

  'type.pair': '字体配对',
  'type.sans': '无衬线',
  'type.serif': '衬线',
  'type.rounded': '圆体',
  'type.scale': '字号缩放',
  'type.note': '仅影响预览与导出；宿主界面字体由 DSH 控制',

  'shape.radius': '圆角',
  'shape.shadow': '阴影',
  'tier.0': '紧致',
  'tier.1': '标准',
  'tier.2': '松弛',

  'a11y.pass': '{pass} / {total} 项达标',
  'a11y.fix': '一键修复对比度',
  'a11y.fixing': '正在修复…',
  'a11y.fixed': '已调整 {n} 步，全部达标',
  'a11y.best': '已尽力：色相与彩度已保留，仍有两项无法同时满足',
  'a11y.fine': '全部达标，可以放心应用',
  'a11y.locked': '自动修复只挪动明度，你的色相和彩度不会变',
  'a11y.wcag': 'WCAG',
  'a11y.apca': 'APCA',
  'a11y.element': '当前元素',

  'audit.body.base': '正文 / 基础面',
  'audit.body.layer1': '正文 / 卡片',
  'audit.body.overlay': '正文 / 浮层',
  'audit.body.bubble': '正文 / 气泡',
  'audit.body.card': '正文 / 设置卡',
  'audit.secondary.base': '次要文字',
  'audit.secondary.layer2': '次要文字 / 层级 2',
  'audit.tertiary.base': '三级文字',
  'audit.caption.base': '说明文字',
  'audit.link.base': '链接',
  'audit.button.primary': '主按钮文字',
  'audit.button.contrast': '高对比按钮文字',
  'audit.toast': '轻提示',
  'audit.tooltip': '工具气泡',
  'audit.menu': '菜单文字',
  'audit.state.success': '成功色',
  'audit.state.warn': '警告色',
  'audit.state.error': '错误色',
  'audit.diff.added': '新增标记',
  'audit.icon.menu': '菜单图标',

  // ── generation ─────────────────────────────────────────────────────────
  'generate.title': '生成一套',
  'generate.image': '从图片取色',
  'generate.imageHint': '拖入或点击选择图片，自动提取一组协调配色',
  'generate.prompt': '一句话描述',
  'generate.promptHint': '例如：冷静的深海蓝，安静、精密',
  'generate.run': '生成',
  'generate.running': '生成中…',
  'generate.local': '本地色彩引擎',
  'generate.ai': 'AI 生成',
  'generate.pick': '挑一套',
  'generate.noImage': '请先选一张图片',
  'generate.empty': '先写一句你想要的氛围',
  'generate.failed': 'AI 生成失败，已回退到本地引擎',
  'generate.done': '生成了 {n} 套',

  // ── share ──────────────────────────────────────────────────────────────
  'share.title': '分享与导出',
  'share.link': '复制分享链接',
  'share.css': '复制 CSS 变量',
  'share.json': '复制 JSON',
  'share.import': '粘贴链接或 JSON 导入',
  'share.importHint': '支持 dsh-freestyle-theme:// 链接、#theme= 片段或完整 JSON',
  'share.imported': '已导入',
  'share.invalid': '不是有效的主题链接或 JSON',
  'share.copied': '已复制',

  // ── motion ─────────────────────────────────────────────────────────────
  'motion.title': '动效',
  'motion.base': '节奏',
  'motion.reduced': '系统开启了「减少动效」，过渡已自动关闭',
  'motion.note': '动效跟随系统设置，不影响宿主',

  // ── harmonies ──────────────────────────────────────────────────────────
  'harmony.analogous': '近似',
  'harmony.complementary': '互补',
  'harmony.split': '分裂互补',
  'harmony.triadic': '三角',
  'harmony.random': '随机',

  // ── hue names (18 stops) ───────────────────────────────────────────────
  'hue.0': '绯红',
  'hue.15': '朱砂',
  'hue.30': '琥珀',
  'hue.45': '蜜金',
  'hue.60': '柠檬',
  'hue.90': '嫩芽',
  'hue.120': '苔绿',
  'hue.150': '翡翠',
  'hue.170': '绿松',
  'hue.190': '青碧',
  'hue.210': '天青',
  'hue.230': '湖蓝',
  'hue.250': '靛蓝',
  'hue.270': '群青',
  'hue.290': '紫罗兰',
  'hue.310': '品红',
  'hue.330': '玫红',
  'hue.345': '樱花',

  // ── presets ────────────────────────────────────────────────────────────
  'preset.mist': '雾青',
  'preset.ink': '墨',
  'preset.tundra': '苔原',
  'preset.lava': '熔岩',
  'preset.deepsea': '深海',
  'preset.film': '胶片',
  'preset.sakura': '樱',
  'preset.twilight': '暮色',
  'preset.sand': '沙丘',
  'preset.cobalt': '钴蓝',
  'preset.graphite': '石墨',
  'preset.moss': '苔痕',

  // ── variants ───────────────────────────────────────────────────────────
  'variant.soft': '柔化',
  'variant.vivid': '提艳',
  'variant.bright': '提亮',
  'variant.deep': '压深',
  'variant.swap': '交换主副',

  'channel.th': '主色',
  'channel.th2': '副色',
  'channel.ths': '面板',

  // ── messages ───────────────────────────────────────────────────────────
  'msg.applied': '已应用到 DSH',
  'msg.reset': '已恢复默认外观',
  'msg.saved': '已保存到主题库',
  'msg.deleted': '已删除',
  'msg.imported': '已导入',
  'msg.error': '操作失败，请重试',
  'msg.unsaved': '有未应用的改动，确定关闭？',

  'err.noTheme': '主题服务不可用，当前仅能预览',
  'err.noHost': '宿主未提供持久化接口，主题只保存在本机',
  'err.noLlm': '宿主未提供模型服务，已使用本地引擎',
  'err.noModel': '没有可用的默认模型，已使用本地引擎',
} as const

/** Every valid dictionary key. */
export type DictKey = keyof typeof zh

/** English mirror; the explicit type enforces key parity at compile time. */
export const en: Record<DictKey, string> = {
  'plugin.title': 'Freeform theme',
  'plugin.description':
    'Dial in a DeepSeek Harness skin of your own with an OKLCH colour engine.',

  'row.hint': 'Brand hue, neutral tint, elevation ladder and state cluster — four free axes',
  'row.open': 'Open studio',
  'row.shuffle': 'Shuffle',
  'row.none': 'No theme applied — the DSH default look is in use',
  'row.applied': '“{name}” is applied',

  'studio.name': 'Untitled theme',
  'studio.light': 'Light',
  'studio.dark': 'Dark',
  'studio.undo': 'Undo',
  'studio.redo': 'Redo',
  'studio.share': 'Share / export',
  'studio.apply': 'Apply to DSH',
  'studio.close': 'Close studio',
  'studio.hint': '⌘K commands · ⌘Z undo · Esc to close',

  'rail.templates': 'Presets',
  'rail.library': 'Library',
  'rail.search': 'Search themes…',
  'rail.save': 'Save current',
  'rail.delete': 'Delete',
  'rail.empty': 'Your library is empty',
  'rail.emptyHint': 'Once a theme feels right, hit Save — it stays on this machine.',
  'rail.mine': 'My themes',
  'rail.import': 'Import',

  'canvas.chat': 'Chat',
  'canvas.list': 'List',
  'canvas.form': 'Settings',
  'canvas.zoom': 'Zoom',
  'canvas.compare': 'Compare',
  'canvas.off': 'Off',
  'canvas.inspect': 'Inspect',
  'canvas.inspectHint': 'Hover anything on the canvas to see the tokens behind it',
  'canvas.blind': 'Vision simulation',
  'canvas.blind.none': 'Normal',
  'canvas.blind.deuteranopia': 'Deuteranopia',
  'canvas.blind.protanopia': 'Protanopia',
  'canvas.blind.tritanopia': 'Tritanopia',
  'canvas.blind.achromatopsia': 'Achromatopsia',

  'inspector.color': 'Colour',
  'inspector.type': 'Type',
  'inspector.shape': 'Shape',
  'inspector.a11y': 'Contrast',

  'axis.hue': 'Hue',
  'axis.chroma': 'Chroma',
  'axis.light': 'Lightness',

  'color.primary': 'Brand',
  'color.secondary': 'Secondary',
  'color.surface': 'Surface',
  'color.neutral': 'Neutral tint',
  'color.contrast': 'Elevation spread',
  'color.state': 'State strength',
  'color.text': 'Text lightness',
  'color.sidebar': 'Sidebar lightness',
  'color.neutralHint': 'How much brand hue the greys inherit — higher feels warmer',
  'color.stateHint': 'Chroma multiplier for success, warning and error',

  'type.pair': 'Font pair',
  'type.sans': 'Sans',
  'type.serif': 'Serif',
  'type.rounded': 'Rounded',
  'type.scale': 'Type scale',
  'type.note': 'Preview and export only — the host UI keeps its own fonts',

  'shape.radius': 'Radius',
  'shape.shadow': 'Shadow',
  'tier.0': 'Tight',
  'tier.1': 'Standard',
  'tier.2': 'Relaxed',

  'a11y.pass': '{pass} / {total} passing',
  'a11y.fix': 'Fix contrast',
  'a11y.fixing': 'Fixing…',
  'a11y.fixed': 'Adjusted in {n} steps — all clear',
  'a11y.best': 'Best effort: hue and chroma preserved, two pairs still conflict',
  'a11y.fine': 'All clear — safe to apply',
  'a11y.locked': 'Auto-fix only moves lightness; your hue and chroma stay put',
  'a11y.wcag': 'WCAG',
  'a11y.apca': 'APCA',
  'a11y.element': 'Selected element',

  'audit.body.base': 'Body / base',
  'audit.body.layer1': 'Body / card',
  'audit.body.overlay': 'Body / overlay',
  'audit.body.bubble': 'Body / bubble',
  'audit.body.card': 'Body / settings card',
  'audit.secondary.base': 'Secondary text',
  'audit.secondary.layer2': 'Secondary / layer 2',
  'audit.tertiary.base': 'Tertiary text',
  'audit.caption.base': 'Caption',
  'audit.link.base': 'Link',
  'audit.button.primary': 'Primary button label',
  'audit.button.contrast': 'Contrast button label',
  'audit.toast': 'Toast',
  'audit.tooltip': 'Tooltip',
  'audit.menu': 'Menu text',
  'audit.state.success': 'Success',
  'audit.state.warn': 'Warning',
  'audit.state.error': 'Error',
  'audit.diff.added': 'Added marker',
  'audit.icon.menu': 'Menu icon',

  'generate.title': 'Generate',
  'generate.image': 'From an image',
  'generate.imageHint': 'Drop or pick an image and pull a coordinated palette out of it',
  'generate.prompt': 'Describe it',
  'generate.promptHint': 'e.g. calm deep-sea blue, quiet and precise',
  'generate.run': 'Generate',
  'generate.running': 'Generating…',
  'generate.local': 'Local colour engine',
  'generate.ai': 'AI',
  'generate.pick': 'Pick one',
  'generate.noImage': 'Pick an image first',
  'generate.empty': 'Describe the mood first',
  'generate.failed': 'AI generation failed — fell back to the local engine',
  'generate.done': 'Made {n} proposals',

  'share.title': 'Share and export',
  'share.link': 'Copy share link',
  'share.css': 'Copy CSS variables',
  'share.json': 'Copy JSON',
  'share.import': 'Paste a link or JSON',
  'share.importHint': 'Accepts dsh-freestyle-theme:// links, #theme= fragments or raw JSON',
  'share.imported': 'Imported',
  'share.invalid': 'That is not a theme link or JSON',
  'share.copied': 'Copied',

  'motion.title': 'Motion',
  'motion.base': 'Rhythm',
  'motion.reduced': 'Reduce motion is on — transitions are disabled',
  'motion.note': 'Motion follows the system setting and never touches the host',

  'harmony.analogous': 'Analogous',
  'harmony.complementary': 'Complementary',
  'harmony.split': 'Split',
  'harmony.triadic': 'Triadic',
  'harmony.random': 'Random',

  'hue.0': 'Crimson',
  'hue.15': 'Vermilion',
  'hue.30': 'Amber',
  'hue.45': 'Honey',
  'hue.60': 'Lemon',
  'hue.90': 'Sprout',
  'hue.120': 'Moss',
  'hue.150': 'Emerald',
  'hue.170': 'Turquoise',
  'hue.190': 'Cyan',
  'hue.210': 'Sky',
  'hue.230': 'Lagoon',
  'hue.250': 'Indigo',
  'hue.270': 'Ultramarine',
  'hue.290': 'Violet',
  'hue.310': 'Magenta',
  'hue.330': 'Rose',
  'hue.345': 'Blossom',

  'preset.mist': 'Mist',
  'preset.ink': 'Ink',
  'preset.tundra': 'Tundra',
  'preset.lava': 'Lava',
  'preset.deepsea': 'Deep sea',
  'preset.film': 'Film',
  'preset.sakura': 'Sakura',
  'preset.twilight': 'Twilight',
  'preset.sand': 'Dune',
  'preset.cobalt': 'Cobalt',
  'preset.graphite': 'Graphite',
  'preset.moss': 'Moss',

  'variant.soft': 'Soften',
  'variant.vivid': 'Saturate',
  'variant.bright': 'Lift',
  'variant.deep': 'Deepen',
  'variant.swap': 'Swap pair',

  'channel.th': 'Brand',
  'channel.th2': 'Secondary',
  'channel.ths': 'Surface',

  'msg.applied': 'Applied to DSH',
  'msg.reset': 'Restored the default look',
  'msg.saved': 'Saved to your library',
  'msg.deleted': 'Deleted',
  'msg.imported': 'Imported',
  'msg.error': 'Something went wrong — try again',
  'msg.unsaved': 'Unsaved changes — close anyway?',

  'err.noTheme': 'The theme service is unavailable — preview only',
  'err.noHost': 'The host exposes no persistence, so themes stay on this machine',
  'err.noLlm': 'No model service on the host — using the local engine',
  'err.noModel': 'No default model selected — using the local engine',
}

/** All shipped dictionaries, keyed by locale id. */
export const DICTIONARIES: Record<'zh' | 'en', Record<string, string>> = { zh, en }

/** `{name}` interpolation. */
export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}
