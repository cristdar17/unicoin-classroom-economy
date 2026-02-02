import { createServerSupabaseClient } from '~/server/utils/supabase'
import { verifyStudentToken } from '~/server/utils/jwt'

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const token = authHeader.substring(7)
  const session = await verifyStudentToken(token)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  // Parse multipart form data
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No se recibió ningún archivo' })
  }

  const file = formData.find(f => f.name === 'photo')

  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'Archivo de foto requerido' })
  }

  // Validate file type
  const contentType = file.type || 'application/octet-stream'
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw createError({
      statusCode: 400,
      message: 'Tipo de archivo no permitido. Usa JPG, PNG o WebP.'
    })
  }

  // Validate file size
  if (file.data.length > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      message: 'El archivo excede el límite de 4MB'
    })
  }

  const client = createServerSupabaseClient(event)

  // Generate unique filename
  const ext = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1]
  const filename = `${session.classroom_id}/${session.student_id}.${ext}`

  // Delete old photo if exists
  await client.storage
    .from('student-photos')
    .remove([filename])

  // Upload new photo
  const { data: uploadData, error: uploadError } = await client.storage
    .from('student-photos')
    .upload(filename, file.data, {
      contentType,
      upsert: true,
    })

  if (uploadError) {
    console.error('Error uploading photo:', uploadError)
    throw createError({ statusCode: 500, message: 'Error al subir la foto' })
  }

  // Get public URL
  const { data: urlData } = client.storage
    .from('student-photos')
    .getPublicUrl(filename)

  const photoUrl = urlData?.publicUrl

  // Update student record
  const { error: updateError } = await client
    .from('students')
    .update({ photo_url: photoUrl })
    .eq('id', session.student_id)

  if (updateError) {
    console.error('Error updating student photo:', updateError)
    throw createError({ statusCode: 500, message: 'Error al actualizar la foto' })
  }

  return {
    data: {
      photo_url: photoUrl,
      message: 'Foto actualizada correctamente'
    }
  }
})
