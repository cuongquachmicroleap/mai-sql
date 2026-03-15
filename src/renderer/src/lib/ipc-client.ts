// Type-safe IPC wrapper for the renderer — delegates to window.api (exposed via contextBridge)
import type { IPCChannels } from '@shared/types/ipc'

type ChannelKey = keyof IPCChannels

export function invoke<K extends ChannelKey>(
  channel: K,
  ...args: Parameters<IPCChannels[K]>
): ReturnType<IPCChannels[K]> {
  return (window.api as any)[channel](...args)
}
