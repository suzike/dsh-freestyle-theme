import io

CANVAS = '#0b0f14'
PANEL = '#11161d'
PANEL2 = '#171d25'
SUNK = '#0d1218'
INK = '#e8eaed'
MUTED = '#8b93a1'
FAINT = '#5a6472'
HAIR = '#232b35'
ACCENT = '#3ddc97'
MONO = "ui-monospace,'SF Mono',Menlo,monospace"
SANS = "-apple-system,'Segoe UI',sans-serif"

p = []
add = p.append

add(f'''<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="624" viewBox="0 0 1120 624" role="img" aria-label="FreeStyle theme studio layout">
  <defs>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{ACCENT}" stop-opacity=".09"/>
      <stop offset=".55" stop-color="{ACCENT}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="hueFull" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e79a9a"/><stop offset=".2" stop-color="#e3c98a"/>
      <stop offset=".42" stop-color="#9fd6a8"/><stop offset=".62" stop-color="#8fb2e8"/>
      <stop offset=".82" stop-color="#b79ae0"/><stop offset="1" stop-color="#e79a9a"/>
    </linearGradient>
    <linearGradient id="hueMuted" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9aa2ad"/><stop offset=".5" stop-color="#cdd3db"/>
      <stop offset="1" stop-color="#9aa2ad"/>
    </linearGradient>
    <clipPath id="miniClip"><rect x="0" y="0" width="52" height="44" rx="7"/></clipPath>
  </defs>
  <rect width="1120" height="624" fill="{CANVAS}"/>
  <rect width="1120" height="624" fill="url(#glow)"/>
''')

# ---------- window shell ----------
add(f'  <rect x="24" y="16" width="1072" height="580" rx="15" fill="{PANEL}" stroke="{HAIR}"/>')

# header (52)
add(f'  <path d="M24 31a15 15 0 0 1 15-15h1042a15 15 0 0 1 15 15v37H24Z" fill="{PANEL2}" stroke="{HAIR}"/>')
add(f'  <text x="46" y="41" font-family="{SANS}" font-size="13" font-weight="600" fill="{INK}">FreeStyle 主题</text>')
add(f'  <text x="46" y="55" font-family="{SANS}" font-size="9.5" fill="{MUTED}">浅色 · 168° · 21/21</text>')
add(f'  <rect x="446" y="32" width="118" height="24" rx="7" fill="{SUNK}" stroke="{HAIR}"/>')
add(f'  <rect x="449" y="35" width="56" height="18" rx="5" fill="#212b36"/>')
add(f'  <text x="477" y="47.5" font-family="{SANS}" font-size="9" fill="{INK}" text-anchor="middle">☀ 浅色</text>')
add(f'  <text x="533" y="47.5" font-family="{SANS}" font-size="9" fill="{MUTED}" text-anchor="middle">☾ 深色</text>')
for i, g in enumerate(['↺', '↻', '↗']):
    add(f'  <text x="{862 + i * 28}" y="48" font-family="{SANS}" font-size="12.5" fill="{MUTED}" text-anchor="middle">{g}</text>')
add(f'  <rect x="950" y="30" width="122" height="26" rx="8" fill="{ACCENT}" fill-opacity=".14" stroke="{ACCENT}" stroke-opacity=".4"/>')
add(f'  <text x="1011" y="47" font-family="{SANS}" font-size="9.5" font-weight="600" fill="{ACCENT}" text-anchor="middle">✓ 应用到 DSH</text>')

# ---------- rail (60) ----------
add(f'  <path d="M84 68H24v497h60Z" fill="{PANEL2}"/>')
add(f'  <line x1="84.5" y1="68" x2="84.5" y2="565" stroke="{HAIR}"/>')
add(f'  <rect x="33" y="80" width="42" height="40" rx="11" fill="#212b36"/>')
add(f'  <rect x="31" y="92" width="2.5" height="16" rx="1.5" fill="{ACCENT}"/>')
add(f'  <g font-family="{SANS}" font-size="14" fill="{MUTED}" text-anchor="middle">')
for i, g in enumerate(['▦', '▤', '⤢', '☰', '◐']):
    add(f'    <text x="54" y="{140 + i * 46}">{g}</text>')
add(f'    <text x="54" y="552">▣</text>')
add('  </g>')

# ---------- list (264) ----------
add(f'  <rect x="85" y="68" width="263" height="497" fill="{PANEL}"/>')
add(f'  <line x1="348.5" y1="68" x2="348.5" y2="565" stroke="{HAIR}"/>')
add(f'  <text x="100" y="94" font-family="{SANS}" font-size="10" font-weight="600" fill="{INK}">预设</text>')
add(f'  <text x="129" y="94" font-family="{MONO}" font-size="8.5" fill="{FAINT}">12</text>')
add(f'  <rect x="98" y="104" width="236" height="26" rx="7" fill="{SUNK}" stroke="{HAIR}"/>')
add(f'  <text x="110" y="121" font-family="{SANS}" font-size="9" fill="{FAINT}">⌕ 搜索主题…</text>')

cards = [('雾青', '168° · c .07', True), ('墨', '250° · c .05', False),
         ('苔原', '150° · c .07', False), ('熔岩', '35° · c .15', False)]
for i, (name, meta, sel) in enumerate(cards):
    y = 142 + i * 92
    add(f'  <rect x="98" y="{y}" width="236" height="82" rx="12" fill="{PANEL2}" stroke="{ACCENT if sel else HAIR}" stroke-width="{1.3 if sel else 1}"/>')
    add(f'  <g transform="translate(104 {y + 6})">')
    add(f'    <g clip-path="url(#miniClip)"><rect width="52" height="44" fill="#1c2530"/><rect x="52" width="124" height="44" fill="{SUNK}"/></g>')
    add('    <circle cx="8" cy="9" r="2.6" fill="#3ddc97" opacity=".85"/>')
    add('    <rect x="14" y="7.6" width="16" height="2.6" rx="1.3" fill="#e8eaed" opacity=".38"/>')
    add(f'    <rect x="61" y="13" width="56" height="2.5" rx="1.25" fill="{INK}" opacity=".42"/>')
    add(f'    <rect x="61" y="20" width="30" height="2.5" rx="1.25" fill="{ACCENT}" opacity=".9"/>')
    add(f'    <rect x="61" y="27" width="44" height="2.5" rx="1.25" fill="{INK}" opacity=".18"/>')
    add('  </g>')
    add(f'  <text x="104" y="{y + 64}" font-family="{SANS}" font-size="10.5" font-weight="600" fill="{INK}">{name}</text>')
    add(f'  <text x="104" y="{y + 76}" font-family="{MONO}" font-size="8" fill="{FAINT}">{meta}</text>')

# ---------- canvas ----------
add(f'  <rect x="349" y="68" width="483" height="497" fill="#0a0e13"/>')
add(f'  <rect x="349" y="68" width="483" height="46" fill="{CANVAS}"/>')
add(f'  <rect x="365" y="80" width="126" height="22" rx="6" fill="#151b23" stroke="{HAIR}"/>')
for i, lab in enumerate(['对话', '列表', '设置']):
    add(f'  <text x="{386 + i * 37}" y="94.5" font-family="{SANS}" font-size="8.5" fill="{INK if i == 0 else MUTED}" text-anchor="middle">{lab}</text>')
add(f'  <text x="644" y="94.5" font-family="{SANS}" font-size="8.5" fill="{MUTED}">◐ 对比</text>')
add(f'  <text x="694" y="94.5" font-family="{SANS}" font-size="8.5" fill="{MUTED}">⤢ 检查</text>')
add(f'  <rect x="742" y="80" width="72" height="22" rx="11" fill="#151b23" stroke="{HAIR}"/>')
add(f'  <text x="778" y="94.5" font-family="{MONO}" font-size="8" fill="{MUTED}" text-anchor="middle">− 100% +</text>')

# mini window 372x340 at (404,150)
add(f'  <rect x="404" y="150" width="372" height="340" rx="12" fill="{PANEL}" stroke="{HAIR}"/>')
add(f'  <path d="M404 162a12 12 0 0 1 12-12h84v340h-84a12 12 0 0 1-12-12Z" fill="{PANEL2}"/>')
add(f'  <line x1="500.5" y1="150" x2="500.5" y2="490" stroke="{HAIR}"/>')
add(f'  <rect x="414" y="162" width="12" height="12" rx="4" fill="{ACCENT}"/>')
add(f'  <text x="432" y="172" font-family="{SANS}" font-size="9" font-weight="600" fill="{INK}">DSH</text>')
add(f'  <rect x="410" y="188" width="82" height="20" rx="6" fill="#212b36"/>')
for i, lab in enumerate(['对话', '列表', '设置']):
    add(f'  <circle cx="417" cy="{195 + i * 22}" r="2.6" fill="{MUTED}" fill-opacity="{1 if i == 0 else .5}"/>')
    add(f'  <text x="425" y="{198.5 + i * 22}" font-family="{SANS}" font-size="8.5" fill="{INK if i == 0 else MUTED}">{lab}</text>')
add(f'  <circle cx="417" cy="452" r="5" fill="{ACCENT}" fill-opacity=".55"/>')
add(f'  <rect x="426" y="446" width="66" height="12" rx="6" fill="#1c2530"/>')

add(f'  <text x="512" y="172" font-family="{SANS}" font-size="9" fill="{INK}">useChat 竞态修复</text>')
add(f'  <rect x="686" y="161" width="74" height="15" rx="7.5" fill="#1b222b"/>')
add(f'  <text x="723" y="171.5" font-family="{MONO}" font-size="7" fill="{MUTED}" text-anchor="middle">DeepSeek-V3</text>')
add(f'  <line x1="501" y1="184" x2="776" y2="184" stroke="{HAIR}"/>')

add(f'  <rect x="586" y="196" width="174" height="24" rx="9" fill="#1d2733" stroke="{HAIR}"/>')
add(f'  <text x="596" y="211.5" font-family="{SANS}" font-size="7.5" fill="{INK}" fill-opacity=".85">把 useEffect 里的竞态处理掉</text>')
add(f'  <text x="512" y="240" font-family="{SANS}" font-size="8.5" fill="{INK}">用 AbortController 就够了。</text>')

add(f'  <rect x="512" y="250" width="248" height="74" rx="7" fill="{SUNK}" stroke="{HAIR}"/>')
add(f'  <text x="521" y="263" font-family="{MONO}" font-size="7" fill="{FAINT}">useChat.ts</text>')
add(f'  <text x="748" y="263" font-family="{MONO}" font-size="7" fill="{FAINT}" text-anchor="end">TS</text>')
add(f'  <line x1="512" y1="269" x2="760" y2="269" stroke="{HAIR}"/>')
for i, line in enumerate(['const ctrl = new AbortController()', 'void stream(url, { signal: ctrl.signal })', 'return () =&gt; ctrl.abort()']):
    add(f'  <text x="521" y="{283 + i * 13}" font-family="{MONO}" font-size="7" fill="{MUTED}">{line}</text>')

add(f'  <rect x="512" y="330" width="248" height="15" rx="4" fill="#15291f"/>')
add(f'  <text x="518" y="341" font-family="{MONO}" font-size="7" fill="{ACCENT}">+ useEffect(() =&gt; {{ const c = …; return () =&gt; c.abort() }})</text>')
add(f'  <rect x="512" y="348" width="248" height="15" rx="4" fill="#2a1618"/>')
add(f'  <text x="518" y="359" font-family="{MONO}" font-size="7" fill="#ef8d8d">− useEffect(() =&gt; {{ stream(url) }})</text>')

add(f'  <rect x="512" y="372" width="104" height="18" rx="9" fill="#101519" stroke="{HAIR}"/>')
add(f'  <circle cx="523" cy="381" r="2.4" fill="{ACCENT}"/>')
add(f'  <text x="530" y="384" font-family="{SANS}" font-size="7" fill="{MUTED}">已应用到 DSH</text>')
add(f'  <rect x="620" y="372" width="112" height="18" rx="9" fill="#1b222b"/>')
add(f'  <text x="676" y="384" font-family="{SANS}" font-size="7" fill="{MUTED}" text-anchor="middle">⋯ 快捷菜单</text>')

add(f'  <rect x="512" y="436" width="248" height="30" rx="10" fill="{SUNK}" stroke="{HAIR}"/>')
add(f'  <text x="524" y="455" font-family="{SANS}" font-size="7.5" fill="{FAINT}">给 DSH 发消息…</text>')
add(f'  <circle cx="744" cy="451" r="8.5" fill="{ACCENT}" fill-opacity=".2" stroke="{ACCENT}" stroke-opacity=".45"/>')

# ---------- inspector (320) ----------
add(f'  <rect x="832" y="68" width="264" height="497" fill="{PANEL}"/>')
add(f'  <line x1="831.5" y1="68" x2="831.5" y2="565" stroke="{HAIR}"/>')
add(f'  <text x="847" y="93" font-family="{SANS}" font-size="10" font-weight="600" fill="{INK}">⌄ 颜色</text>')
add(f'  <line x1="832" y1="104" x2="1096" y2="104" stroke="{HAIR}"/>')

chans = [('主色', '#7fb89a', '168°', 'hueFull', 168), ('副色', '#8aa0c8', '200°', 'hueFull', 200),
         ('面板', '#8b93a1', '146°', 'hueMuted', 146)]
for i, (name, sw, hue, grad, frac) in enumerate(chans):
    y = 114 + i * 128
    add(f'  <rect x="846" y="{y}" width="236" height="118" rx="11" fill="{PANEL2}" stroke="{HAIR}"/>')
    add(f'  <rect x="858" y="{y + 10}" width="17" height="17" rx="5.5" fill="{sw}"/>')
    add(f'  <text x="882" y="{y + 23}" font-family="{SANS}" font-size="9.5" font-weight="600" fill="{INK}">{name}</text>')
    add(f'  <text x="1068" y="{y + 23}" font-family="{MONO}" font-size="8" fill="{FAINT}" text-anchor="end">{hue}</text>')
    add(f'  <rect x="858" y="{y + 34}" width="212" height="14" rx="4" fill="url(#{grad})"/>')
    cx = 858 + (212 - 20) * (frac / 360)
    add(f'  <rect x="{cx:.1f}" y="{y + 32}" width="20" height="18" rx="4" fill="none" stroke="{CANVAS}" stroke-width="2"/>')
    add(f'  <rect x="{cx:.1f}" y="{y + 32}" width="20" height="18" rx="4" fill="none" stroke="{INK}" stroke-width="1" stroke-opacity=".9"/>')
    for j, (lab, val, pos) in enumerate([('色相', hue, .55), ('彩度', '.075', .22), ('明度', '.52', .66)]):
        ly = y + 66 + j * 16
        add(f'  <text x="858" y="{ly}" font-family="{SANS}" font-size="7.5" fill="{MUTED}">{lab}</text>')
        add(f'  <text x="1068" y="{ly}" font-family="{MONO}" font-size="7.5" fill="{MUTED}" text-anchor="end">{val}</text>')
        add(f'  <rect x="884" y="{ly - 5.5}" width="142" height="2" rx="1" fill="#2b3542"/>')
        add(f'  <circle cx="{884 + 142 * pos:.1f}" cy="{ly - 5}" r="4" fill="{PANEL}" stroke="{INK}" stroke-opacity=".5"/>')

add(f'  <text x="847" y="516" font-family="{SANS}" font-size="10" font-weight="600" fill="{INK}">⌄ 无障碍</text>')
add(f'  <text x="1068" y="516" font-family="{MONO}" font-size="8" fill="{ACCENT}" text-anchor="end">21/21</text>')
for i, (lab, val) in enumerate([('正文 / 底色', '9.4'), ('次级 / 卡片', '6.1'), ('链接 / 底色', '5.2'), ('按钮 / 主色', '4.8')]):
    y = 532 + i * 13
    add(f'  <circle cx="851" cy="{y - 3}" r="2.3" fill="{ACCENT}"/>')
    add(f'  <text x="861" y="{y}" font-family="{SANS}" font-size="7.5" fill="{MUTED}">{lab}</text>')
    add(f'  <text x="1068" y="{y}" font-family="{MONO}" font-size="7" fill="{FAINT}" text-anchor="end">{val}</text>')

# ---------- caption ----------
add(f'  <text x="24" y="616" font-family="{MONO}" font-size="9" fill="{FAINT}">header 52 · rail 60 · list 264 · canvas fluid · inspector 320</text>')
add(f'  <text x="1096" y="616" font-family="{MONO}" font-size="9" fill="{FAINT}" text-anchor="end">tokens 119 · 21 contrast pairs · 4px grid</text>')
add('</svg>')

out = '\n'.join(p)
io.open('docs/images/studio-layout.svg', 'w', encoding='utf-8', newline='\n').write(out)
print('wrote', len(out), 'bytes')
