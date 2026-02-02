// Simple hash function for PINs (in production, use bcrypt or argon2)
export const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + (process.env.JWT_SECRET || 'salt'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const verifyPin = async (pin: string, hash: string): Promise<boolean> => {
  const pinHash = await hashPin(pin)
  return pinHash === hash
}

// Generate a random 6-character classroom code
export const generateClassroomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars (0, O, I, 1)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
