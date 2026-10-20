/**
 * Browser-side message catalogue for Dsh-freestyle-theme.
 *
 * Registered into the shell's locale service under {@link NS}; the UI only ever
 * renders `t(key)` results, so a new language is a new dictionary, never a code
 * change. English is the fallback the service uses for unmatched languages.
 *
 * @module dsh-freestyle-theme/client/locale
 */

/** Locale namespace owned by this plugin. */
export const NS = 'dsh-freestyle-theme'

/** Translation function shape returned by `locale.bind(NS)`. */
export type Translate = (key: string) => string

const zh = {
  'plugin.title': '自由主题',
  'plugin.rowDesc': '主题提案与设计器 · OKLCH 配色',

  'tabs.suggest': '主题提案',
  'tabs.design': '主题设计器',

  'suggest.sub': 'OKLCH 色相 + 配色关系自动生成；每套提案同时覆盖明/暗两套完整令牌',
  'suggest.modeLight': '浅色预览',
  'suggest.modeDark': '深色预览',
  'suggest.shuffle': '换一批',
  'suggest.reset': '恢复默认',
  'suggest.harmony': '配色关系',
  'suggest.presets': '风格预设',
  'suggest.batch': '智能提案 · 点击卡片即应用',
  'suggest.applied': '已应用',

  'harmony.analogous': '邻近',
  'harmony.complementary': '互补',
  'harmony.split': '分裂互补',
  'harmony.triadic': '三角色',
  'harmony.random': '随机',

  'hue.0': '朱砂红',
  'hue.1': '珊瑚橙',
  'hue.2': '琥珀橙',
  'hue.3': '暖金沙',
  'hue.4': '柠檬黄',
  'hue.5': '青柠绿',
  'hue.6': '森林绿',
  'hue.7': '翡翠青',
  'hue.8': '冰蓝青',
  'hue.9': '冰川蓝',
  'hue.10': '深海蓝',
  'hue.11': '雾靛蓝',
  'hue.12': '石墨蓝',
  'hue.13': '暮光紫',
  'hue.14': '罗兰紫',
  'hue.15': '梅子紫',
  'hue.16': '樱粉',
  'hue.17': '玫瑰粉',

  'preset.aurora': '极光青',
  'preset.warmSand': '暖金沙',
  'preset.twilight': '暮光紫',
  'preset.sakura': '樱粉',
  'preset.deepSea': '深海蓝',
  'preset.lava': '熔岩橙',

  'design.title': '主题设计器',
  'design.sub': 'OKLCH 独立色彩通道 · 通道锁定 · 配色关系与快速变体 · AI 命名 · JSON 导入导出',
  'design.livePreview': '实时预览',
  'design.apply': '应用主题',
  'design.reset': '恢复默认',
  'design.preview': '实时预览',
  'design.modeDark': '深色',
  'design.modeLight': '浅色',
  'design.start': '风格起点',
  'design.smartRandom': '智能随机',
  'design.variant': '变体',
  'design.identity': '主题身份',
  'design.namePlaceholder': '主题名称',
  'design.aiName': 'AI 命名',
  'design.naming': '命名中…',
  'design.tagsPlaceholder': '特征标签，逗号分隔',
  'design.descPlaceholder': '主题特征介绍',
  'design.json': 'JSON 导入 / 导出',
  'design.jsonPlaceholder': '粘贴主题 JSON，或点「导出 JSON」生成',
  'design.exportJson': '导出 JSON',
  'design.importApply': '导入并应用',
  'design.channels': '独立色彩通道',
  'design.channelSuffix': '通道',
  'design.hue': '色相',
  'design.chroma': '彩度',
  'design.lightness': '明度',
  'design.textLightness': '文字明度',
  'design.sidebarLightness': '侧边栏明度',
  'design.locked': '已锁定',
  'design.unlocked': '未锁定',
  'design.hint': '主色 → 品牌强调；副色 → 侧边栏选中态；面板 → 各级背景；侧边栏明度 → 左侧栏底色（默认与主区一致，一体色）。',

  'channel.th': '主色',
  'channel.th2': '副色',
  'channel.ths': '面板',

  'variant.soft': '柔和',
  'variant.vivid': '鲜明',
  'variant.bright': '提亮',
  'variant.deep': '压暗',
  'variant.swap': '主副互换',

  'msg.applied': '已应用',
  'msg.resetDefault': '已恢复默认',
  'msg.aiFailed': 'AI 命名失败',
  'msg.aiInvalid': 'AI 返回格式无效',
  'msg.aiError': 'AI 命名出错：',
  'msg.copied': '已复制到剪贴板',
  'msg.imported': '已导入',
  'msg.importInvalid': '不是有效的主题 JSON',
  'msg.aiNamed': '主题名称已生成',

  'err.noTheme': '主题服务不可用，无法应用配色',
  'err.noLlm': '当前运行环境没有可用的 LLM 服务',
  'err.noModel': '尚未配置默认模型',
  'err.llm': '模型调用失败',

  'panel.customize': '自定义…',
  'panel.collapse': '收起',
  'panel.widen': '加宽设置面板',
  'panel.widenHint': '让设置弹框更宽，主题设计器显示更完整',
} as const

/** Every message key this plugin owns. */
export type DictKey = keyof typeof zh

const en: Record<DictKey, string> = {
  'plugin.title': 'Freeform theme',
  'plugin.rowDesc': 'Proposals and designer · OKLCH palettes',

  'tabs.suggest': 'Proposals',
  'tabs.design': 'Designer',

  'suggest.sub':
    'Generated from an OKLCH hue and a colour relationship; every proposal ships complete light and dark token sets',
  'suggest.modeLight': 'Light preview',
  'suggest.modeDark': 'Dark preview',
  'suggest.shuffle': 'Shuffle',
  'suggest.reset': 'Reset',
  'suggest.harmony': 'Colour relationship',
  'suggest.presets': 'Curated presets',
  'suggest.batch': 'Suggestions · click a card to apply',
  'suggest.applied': 'applied',

  'harmony.analogous': 'Analogous',
  'harmony.complementary': 'Complementary',
  'harmony.split': 'Split',
  'harmony.triadic': 'Triadic',
  'harmony.random': 'Random',

  'hue.0': 'Vermilion',
  'hue.1': 'Coral',
  'hue.2': 'Amber',
  'hue.3': 'Warm sand',
  'hue.4': 'Lemon',
  'hue.5': 'Lime',
  'hue.6': 'Forest',
  'hue.7': 'Jade',
  'hue.8': 'Ice teal',
  'hue.9': 'Glacier',
  'hue.10': 'Deep sea',
  'hue.11': 'Mist indigo',
  'hue.12': 'Graphite',
  'hue.13': 'Twilight violet',
  'hue.14': 'Violet',
  'hue.15': 'Plum',
  'hue.16': 'Cherry blossom',
  'hue.17': 'Rose',

  'preset.aurora': 'Aurora teal',
  'preset.warmSand': 'Warm sand',
  'preset.twilight': 'Twilight violet',
  'preset.sakura': 'Cherry blossom',
  'preset.deepSea': 'Deep sea',
  'preset.lava': 'Lava orange',

  'design.title': 'Theme designer',
  'design.sub':
    'Independent OKLCH channels · channel locks · colour relationships and quick variants · AI naming · JSON import and export',
  'design.livePreview': 'Live preview',
  'design.apply': 'Apply theme',
  'design.reset': 'Reset',
  'design.preview': 'Live preview',
  'design.modeDark': 'Dark',
  'design.modeLight': 'Light',
  'design.start': 'Starting point',
  'design.smartRandom': 'Smart random',
  'design.variant': 'Variants',
  'design.identity': 'Theme identity',
  'design.namePlaceholder': 'Theme name',
  'design.aiName': 'Name with AI',
  'design.naming': 'Naming…',
  'design.tagsPlaceholder': 'Feature tags, comma separated',
  'design.descPlaceholder': 'What this theme feels like',
  'design.json': 'JSON import / export',
  'design.jsonPlaceholder': 'Paste a theme JSON, or use “Export JSON”',
  'design.exportJson': 'Export JSON',
  'design.importApply': 'Import and apply',
  'design.channels': 'Independent channels',
  'design.channelSuffix': 'channel',
  'design.hue': 'Hue',
  'design.chroma': 'Chroma',
  'design.lightness': 'Lightness',
  'design.textLightness': 'Text lightness',
  'design.sidebarLightness': 'Sidebar lightness',
  'design.locked': 'Locked',
  'design.unlocked': 'Unlocked',
  'design.hint':
    'Primary → brand accents; secondary → the sidebar’s selected row; surface → every background layer; sidebar lightness → the left rail (defaults to the main surface, one seamless colour).',

  'channel.th': 'Primary',
  'channel.th2': 'Secondary',
  'channel.ths': 'Surface',

  'variant.soft': 'Soft',
  'variant.vivid': 'Vivid',
  'variant.bright': 'Brighter',
  'variant.deep': 'Deeper',
  'variant.swap': 'Swap',

  'msg.applied': 'Applied',
  'msg.resetDefault': 'Reset to default',
  'msg.aiFailed': 'Naming failed',
  'msg.aiInvalid': 'The model returned an unusable answer',
  'msg.aiError': 'Naming failed: ',
  'msg.copied': 'Copied to clipboard',
  'msg.imported': 'Imported',
  'msg.importInvalid': 'Not a valid theme JSON',
  'msg.aiNamed': 'Theme name generated',

  'err.noTheme': 'The theme service is unavailable, so no palette can be applied',
  'err.noLlm': 'No LLM service is available in this runtime',
  'err.noModel': 'No default model is configured',
  'err.llm': 'The model call failed',

  'panel.customize': 'Customize…',
  'panel.collapse': 'Collapse',
  'panel.widen': 'Widen settings panel',
  'panel.widenHint': 'Give the designer more room inside the settings dialog',
}

/** Dictionaries keyed by the shell's built-in locale ids. */
export const DICTIONARIES = { zh, en } as const
