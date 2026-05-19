// ============================================
// SUPABASE EDGE FUNCTION - Chatbot IA
// Desplegar con: supabase functions deploy chatbot
//
// Variables de entorno requeridas:
//   OPENAI_API_KEY=<tu-api-key>
// ============================================

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface RequestBody {
  message: string
  sessionId?: string
  unit?: number | null
  week?: number | null
}

serve(async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const { message, sessionId, unit, week }: RequestBody = await req.json()

    if (!message) {
      return new Response(JSON.stringify({ error: 'Mensaje requerido' }), { status: 400, headers })
    }

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Obtener contexto de archivos
    let fileContext = ''
    try {
      let query = supabase.from('course_files').select('name, description, unit, week, tags')
      if (unit) query = query.eq('unit', unit)
      if (week) query = query.eq('week', week)
      const { data: files } = await query.limit(20)

      if (files && files.length > 0) {
        fileContext = 'Archivos disponibles:\n' + files.map(f =>
          `- ${f.name} (Unidad ${f.unit}, Semana ${f.week}): ${f.description || 'Sin descripción'}`
        ).join('\n')
      } else {
        fileContext = 'No hay archivos disponibles en este momento.'
      }
    } catch {
      fileContext = 'No se pudieron cargar los archivos.'
    }

    // Guardar mensaje del usuario
    try {
      await supabase.from('chatbot_conversations').insert({
        session_id: sessionId || 'unknown',
        role: 'user',
        message,
      })
    } catch {
      // No crítico
    }

    // Consultar a OpenAI
    let reply: string
    if (openaiKey) {
      reply = await queryOpenAI(message, fileContext, openaiKey)
    } else {
      reply = generateFallbackResponse(message, fileContext)
    }

    // Guardar respuesta
    try {
      await supabase.from('chatbot_conversations').insert({
        session_id: sessionId || 'unknown',
        role: 'assistant',
        message: reply,
      })
    } catch {
      // No crítico
    }

    return new Response(JSON.stringify({ reply }), { status: 200, headers })
  } catch (err) {
    console.error('Chatbot error:', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500, headers })
  }
})

async function queryOpenAI(message: string, context: string, apiKey: string): Promise<string> {
  const systemPrompt = `Eres un asistente virtual del portafolio digital del curso "Arquitectura de Software" de Jhon Taipe Chavez.

Contexto actual del portafolio:
- Curso: Arquitectura de Software
- Estudiante: Jhon Taipe Chavez
- 4 unidades, 16 semanas en total
- Unidad 1: Fundamentos de Arquitectura
- Unidad 2: Patrones de Diseño
- Unidad 3: Arquitectura Avanzada
- Unidad 4: Proyecto Final

${context ? 'Información de archivos disponible:\n' + context : ''}

Responde de manera clara, concisa y útil. Si no tienes información suficiente, indícalo amablemente.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('OpenAI error:', await response.text())
      return generateFallbackResponse(message, context)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'No se pudo generar una respuesta.'
  } catch (err) {
    console.error('OpenAI request error:', err)
    return generateFallbackResponse(message, context)
  }
}

function generateFallbackResponse(message: string, context: string): string {
  const q = message.toLowerCase()

  if (q.includes('archivo') || q.includes('material')) {
    if (context && !context.includes('No hay archivos')) {
      return `Estos son los archivos disponibles:\n\n${context}`
    }
    return 'Actualmente no hay archivos disponibles en esta sección.'
  }

  if (q.includes('unidad') && q.includes('1')) return 'La Unidad 1 cubre los Fundamentos de Arquitectura de Software.'
  if (q.includes('unidad') && q.includes('2')) return 'La Unidad 2 trata sobre Patrones de Diseño.'
  if (q.includes('unidad') && q.includes('3')) return 'La Unidad 3 aborda temas avanzados de arquitectura.'
  if (q.includes('unidad') && q.includes('4')) return 'La Unidad 4 es el Proyecto Final del curso.'
  if (q.includes('unidad')) return 'El curso tiene 4 unidades: Fundamentos, Patrones, Avanzado y Proyecto Final.'

  if (q.includes('jhon') || q.includes('taipe') || q.includes('autor')) {
    return 'Este portafolio pertenece a **Jhon Taipe Chavez**, estudiante del curso de Arquitectura de Software.'
  }

  if (q.includes('hola') || q.includes('buenas') || q.includes('saludo')) {
    return '¡Hola! Soy el asistente virtual del portafolio de Arquitectura de Software. ¿En qué puedo ayudarte?'
  }

  return 'Puedo brindarte información sobre las unidades del curso, las semanas y los archivos disponibles. Si conectas OpenAI, podré responder con más detalle.'
}
