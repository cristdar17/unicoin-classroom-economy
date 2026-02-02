// ============================================
// Economy utilities for client-side
// ============================================

// Predefined market item templates
export const MARKET_ITEM_TEMPLATES = [
  // Academic benefits
  {
    category: 'academic',
    name: '+0.1 en parcial',
    description: 'Suma 0.1 a tu nota del próximo parcial',
    basePrice: 150,
    icon: '📝',
    suggestedStock: 20,
  },
  {
    category: 'academic',
    name: '+0.2 en parcial',
    description: 'Suma 0.2 a tu nota del próximo parcial',
    basePrice: 280,
    icon: '📝',
    suggestedStock: 15,
  },
  {
    category: 'academic',
    name: '+0.3 en parcial',
    description: 'Suma 0.3 a tu nota del próximo parcial',
    basePrice: 400,
    icon: '📝',
    suggestedStock: 10,
  },
  {
    category: 'academic',
    name: '+0.5 en parcial',
    description: 'Suma 0.5 a tu nota del próximo parcial (máximo beneficio)',
    basePrice: 600,
    icon: '🏆',
    suggestedStock: 5,
  },
  {
    category: 'academic',
    name: '+0.1 en taller',
    description: 'Suma 0.1 a tu nota del próximo taller',
    basePrice: 80,
    icon: '📋',
    suggestedStock: 30,
  },
  {
    category: 'academic',
    name: '+0.2 en taller',
    description: 'Suma 0.2 a tu nota del próximo taller',
    basePrice: 150,
    icon: '📋',
    suggestedStock: 20,
  },

  // Time extensions
  {
    category: 'time',
    name: 'Extensión 24h',
    description: 'Extiende el plazo de entrega de un taller por 24 horas',
    basePrice: 120,
    icon: '⏰',
    suggestedStock: 15,
  },
  {
    category: 'time',
    name: 'Extensión 48h',
    description: 'Extiende el plazo de entrega de un taller por 48 horas',
    basePrice: 200,
    icon: '⏰',
    suggestedStock: 10,
  },
  {
    category: 'time',
    name: 'Habilitación de entrega',
    description: 'Permite subir un taller después de cerrada la fecha',
    basePrice: 350,
    icon: '🔓',
    suggestedStock: 8,
  },

  // Class privileges
  {
    category: 'privilege',
    name: 'Salida 10 min antes',
    description: 'Sal 10 minutos antes de que termine la clase',
    basePrice: 100,
    icon: '🚪',
    suggestedStock: null,
  },
  {
    category: 'privilege',
    name: 'Salida 30 min antes (Colectivo)',
    description: 'Toda la clase sale 30 minutos antes. Requiere contribución grupal.',
    basePrice: 800,
    icon: '🎉',
    suggestedStock: 3,
    type: 'COLLECTIVE' as const,
  },
  {
    category: 'privilege',
    name: 'Clase libre (Colectivo)',
    description: 'Cancela una clase. Requiere contribución de toda la clase.',
    basePrice: 2000,
    icon: '🏖️',
    suggestedStock: 1,
    type: 'COLLECTIVE' as const,
  },
  {
    category: 'privilege',
    name: 'Elegir puesto',
    description: 'Elige tu puesto en el salón por una semana',
    basePrice: 50,
    icon: '💺',
    suggestedStock: null,
  },

  // Exam help
  {
    category: 'exam',
    name: 'Pista en quiz',
    description: 'El profesor te da una pista sobre una pregunta del quiz',
    basePrice: 80,
    icon: '💡',
    suggestedStock: 10,
  },
  {
    category: 'exam',
    name: 'Pregunta eliminada',
    description: 'Elimina la pregunta con peor nota de un quiz',
    basePrice: 200,
    icon: '❌',
    suggestedStock: 5,
  },
  {
    category: 'exam',
    name: 'Repetir quiz',
    description: 'Repite un quiz para mejorar tu nota',
    basePrice: 500,
    icon: '🔄',
    suggestedStock: 3,
  },

  // Fun items
  {
    category: 'fun',
    name: 'Snack en clase',
    description: 'Permiso para comer un snack durante la clase',
    basePrice: 30,
    icon: '🍪',
    suggestedStock: null,
  },
  {
    category: 'fun',
    name: 'Música en trabajo',
    description: 'Escucha música con audífonos durante trabajo en clase',
    basePrice: 40,
    icon: '🎵',
    suggestedStock: null,
  },
  {
    category: 'fun',
    name: 'Día sin llamado a lista',
    description: 'No te llaman a lista por un día (solo si asistes)',
    basePrice: 60,
    icon: '👻',
    suggestedStock: 10,
  },
]

export const ITEM_CATEGORIES = [
  { id: 'academic', name: 'Académico', icon: '📚', color: 'emerald' },
  { id: 'time', name: 'Tiempo', icon: '⏰', color: 'blue' },
  { id: 'privilege', name: 'Privilegios', icon: '⭐', color: 'amber' },
  { id: 'exam', name: 'Exámenes', icon: '📝', color: 'purple' },
  { id: 'fun', name: 'Diversión', icon: '🎉', color: 'pink' },
]
