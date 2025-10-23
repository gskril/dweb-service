# Dweb-service

Run this alongside a local ETH and IPFS node for raw access to the decentralized web.

## Usage

### Docker

```yml
services:
  dweb-service:
    image: ghcr.io/gskril/dweb-service:latest
    container_name: dweb-service
    ports:
      - '3000:3000'
    restart: unless-stopped
    environment:
      - ETH_RPC_URL=https://ethereum-rpc.publicnode.com
      - IPFS_GATEWAY_URL=https://ipfs.io
```

### Development

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```
