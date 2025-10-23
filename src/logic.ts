import { addEnsContracts, ensPublicActions } from '@ensdomains/ensjs'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { env } from './env'

const client = createPublicClient({
  chain: addEnsContracts(mainnet),
  transport: http(env.ETH_RPC_URL),
}).extend(ensPublicActions)

export async function handleRequest(req: Request) {
  const path = new URL(req.url).pathname
  const [, name, ...rest] = path.split('/')
  const restPath = rest.join('/')

  if (!name) {
    return new Response('Name not found', { status: 404 })
  }

  // Handle raw /ipfs/[cid] requests
  let basePath = name
  let ipfsPath = restPath
  if (name === 'ipfs' && rest.length > 0) {
    // For /ipfs/[cid]/path/to/file, we need:
    // - basePath = 'ipfs/[cid]'
    // - ipfsPath = 'path/to/file'
    const [cid, ...remainingPath] = rest
    basePath = `ipfs/${cid}`
    ipfsPath = remainingPath.join('/')
  }

  const ipfsUrl = await buildIpfsUrl(name, restPath)

  if (!ipfsUrl) {
    return new Response('Contenthash record is not set for this name', {
      status: 500,
    })
  }

  const res = await fetch(ipfsUrl)

  if (!res.ok) {
    return new Response(
      'Contenthash record is set but failed to fetch content',
      { status: 500 }
    )
  }

  const contentType =
    res.headers.get('Content-Type') || 'application/octet-stream'

  // Rewrite relative URLs in HTML
  if (contentType.includes('text/html')) {
    const html = formatHtml(await res.text(), basePath, ipfsPath)

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    })
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
    },
  })
}

export async function buildIpfsUrl(
  name: string,
  restPath: string
): Promise<string | null> {
  if (name === 'ipfs') {
    return `${env.IPFS_GATEWAY_URL}/ipfs/${restPath}`
  }

  const contenthash = await client
    .getContentHashRecord({ name })
    .catch(() => null)

  if (!contenthash) {
    return null
  }

  const gatewayBase = env.IPFS_GATEWAY_URL
  const gateway = `${gatewayBase}/ipfs/${contenthash.decoded}`
  return `${gateway}/${restPath}`
}

export function formatHtml(
  html: string,
  basePath: string,
  currentPath: string
): string {
  // Rewrite href and src attributes
  return html.replace(
    /((?:href|src)\s*=\s*["'])([^"']+)(["'])/gi,
    (match, prefix, url, suffix) => {
      // Inline resolveUrl logic here
      // Skip absolute URLs
      if (
        url.match(/^https?:\/\//) ||
        url.match(/^\/\//) ||
        url.match(/^data:/) ||
        url.match(/^mailto:/) ||
        url.startsWith('#')
      ) {
        return `${prefix}${url}${suffix}`
      }

      // If it starts with /, it's root-relative (relative to IPFS root)
      if (url.startsWith('/')) {
        return `${prefix}/${basePath}${url}${suffix}`
      }

      // Otherwise it's a relative path - resolve it relative to current page's directory
      const currentDir = currentPath.includes('/')
        ? currentPath.substring(0, currentPath.lastIndexOf('/') + 1)
        : ''

      const resolved = new URL(url, `http://dummy/${currentDir}`).pathname

      // Add the base path prefix (either ENS name or ipfs/[cid])
      return `${prefix}/${basePath}${resolved}${suffix}`
    }
  )
}
