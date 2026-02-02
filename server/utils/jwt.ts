import { SignJWT, jwtVerify } from 'jose'
import type { StudentSession } from '~/types'

const getSecret = () => {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production'
  return new TextEncoder().encode(secret)
}

export const createStudentToken = async (session: Omit<StudentSession, 'exp'>): Promise<string> => {
  const token = await new SignJWT({
    student_id: session.student_id,
    classroom_id: session.classroom_id,
    name: session.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())

  return token
}

export const verifyStudentToken = async (token: string): Promise<StudentSession | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret())

    return {
      student_id: payload.student_id as string,
      classroom_id: payload.classroom_id as string,
      name: payload.name as string,
      exp: payload.exp as number,
    }
  } catch (e) {
    console.error('JWT verification failed:', e)
    return null
  }
}
