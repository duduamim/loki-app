// Fills in the download button and the release notes from the latest GitHub release.
// Without JavaScript (or if the API is unreachable) the links still go to the releases page.
const REPO = 'duduamim/loki-app'

async function loadReleases() {
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=5`)
  if (!response.ok) throw new Error(`GitHub API ${response.status}`)
  return (await response.json()).filter((release) => !release.draft && !release.prerelease)
}

function formatSize(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

/** Release notes are short Markdown lists; render paragraphs and "- " items, nothing else. */
function renderNotes(markdown) {
  const html = []
  let list = false
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('**')) {
      if (list) html.push('</ul>')
      list = false
      continue
    }
    if (line.startsWith('- ')) {
      if (!list) html.push('<ul>')
      list = true
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`)
    } else {
      if (list) html.push('</ul>')
      list = false
      html.push(`<p>${escapeHtml(line)}</p>`)
    }
  }
  if (list) html.push('</ul>')
  return html.join('')
}

async function init() {
  let releases
  try {
    releases = await loadReleases()
  } catch {
    return
  }
  const latest = releases[0]
  if (!latest) return

  const installer = latest.assets.find((asset) => /-Setup-.*\.exe$/.test(asset.name))
  if (installer) {
    for (const link of document.querySelectorAll('[data-download]')) link.href = installer.browser_download_url
    document.getElementById('download-meta').textContent =
      `Versão ${latest.tag_name.replace(/^v/, '')} · ${formatSize(installer.size)} · Windows 10 e 11 (64 bits)`
  }

  const container = document.getElementById('releases')
  container.innerHTML = releases
    .map((release) => {
      const date = new Date(release.published_at).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      return `<article>
        <h3>${escapeHtml(release.name || release.tag_name)} <time datetime="${release.published_at}">${date}</time></h3>
        ${renderNotes(release.body || '')}
      </article>`
    })
    .join('')
}

document.getElementById('copy-pix').addEventListener('click', async (event) => {
  const button = event.currentTarget
  const label = button.querySelector('span')
  try {
    await navigator.clipboard.writeText(button.dataset.key)
    label.textContent = 'Copiada!'
  } catch {
    // Clipboard blocked (old browser, insecure context): select the key so it can be copied by hand.
    const range = document.createRange()
    range.selectNodeContents(document.getElementById('pix-key'))
    getSelection().removeAllRanges()
    getSelection().addRange(range)
    label.textContent = 'Selecionada: Ctrl+C'
  }
  setTimeout(() => {
    label.textContent = 'Copiar'
  }, 2500)
})

init()
