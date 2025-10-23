export const env = {
  ETH_RPC_URL: Bun.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com',
  IPFS_GATEWAY_URL: Bun.env.IPFS_GATEWAY_URL || 'https://ipfs.io',
}

console.log(env)
